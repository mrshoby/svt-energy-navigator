/* SVT Energy Navigator v102 — analysis engine
   Browser + Node compatible. Safe fixed-tariff analysis for load curves and optional PV production. */
(function attachSVTAnalysisEngine(root) {
  "use strict";

  function num(value, fallback = 0) {
    const n = Number(String(value ?? "").replace(",", "."));
    return Number.isFinite(n) ? n : fallback;
  }

  function round(value, decimals = 2) {
    const p = Math.pow(10, decimals);
    return Math.round(num(value) * p) / p;
  }

  function asDate(value) {
    if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  function exactKey(date) {
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0"),
      String(date.getHours()).padStart(2, "0"),
      String(date.getMinutes()).padStart(2, "0")
    ].join("-");
  }

  function monthDayHourKey(date) {
    return [
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0"),
      String(date.getHours()).padStart(2, "0")
    ].join("-");
  }

  function normalizeRows(dataset) {
    const rows = Array.isArray(dataset?.rows) ? dataset.rows : [];
    return rows
      .map((row, index) => {
        const d = asDate(row.timestamp || row.date || row.datetime || row.time);
        if (!d) return null;
        const electricKwh = Math.max(0, num(row.electricKwh ?? row.consumptionKwh ?? row.kwh ?? row.consum_kwh));
        return {
          ...row,
          timestamp: d.toISOString(),
          localLabel: row.localLabel || d.toLocaleString("ro-RO", { dateStyle: "short", timeStyle: "short" }),
          hour: d.getHours(),
          index,
          electricKwh,
          pvKwh: Math.max(0, num(row.pvKwh ?? row.productionKwh ?? row.productieKwh))
        };
      })
      .filter(Boolean);
  }

  function mergeProduction(consumptionDataset, productionDataset) {
    if (!productionDataset || !Array.isArray(productionDataset.rows) || !productionDataset.rows.length) {
      return consumptionDataset;
    }
    const consumptionRows = normalizeRows(consumptionDataset);
    const productionRows = normalizeRows(productionDataset);
    const prodExact = new Map();
    const prodByMonthDayHour = new Map();

    productionRows.forEach((row) => {
      const d = asDate(row.timestamp);
      if (!d) return;
      const value = Math.max(0, num(row.pvKwh || row.electricKwh || row.productionKwh || row.kwh));
      prodExact.set(exactKey(d), (prodExact.get(exactKey(d)) || 0) + value);
      prodByMonthDayHour.set(monthDayHourKey(d), (prodByMonthDayHour.get(monthDayHourKey(d)) || 0) + value);
    });

    let exactHits = 0;
    consumptionRows.forEach((row) => {
      const d = asDate(row.timestamp);
      if (d && prodExact.has(exactKey(d))) exactHits += 1;
    });

    const requiredExactHits = Math.max(3, Math.ceil(consumptionRows.length * 0.02));
    const useExact = exactHits >= requiredExactHits;
    const consumptionCountByHour = new Map();
    if (!useExact) {
      consumptionRows.forEach((row) => {
        const d = asDate(row.timestamp);
        if (!d) return;
        const key = monthDayHourKey(d);
        consumptionCountByHour.set(key, (consumptionCountByHour.get(key) || 0) + 1);
      });
    }

    let alignedHits = 0;
    const rows = consumptionRows.map((row) => {
      const d = asDate(row.timestamp);
      if (!d) return row;
      let pvKwh = row.pvKwh || 0;
      if (useExact) {
        pvKwh = prodExact.get(exactKey(d)) || pvKwh;
      } else {
        const key = monthDayHourKey(d);
        const hourly = prodByMonthDayHour.get(key) || 0;
        const split = Math.max(1, consumptionCountByHour.get(key) || 1);
        pvKwh = hourly / split || pvKwh;
      }
      if (pvKwh > 0) alignedHits += 1;
      return { ...row, pvKwh };
    });

    return {
      ...consumptionDataset,
      rows,
      meta: {
        ...(consumptionDataset?.meta || {}),
        productionFileName: productionDataset?.meta?.fileName || "",
        productionAlignment: useExact ? "exact_timestamp" : "month_day_hour_projection",
        productionExactHits: exactHits,
        productionAlignedHits: alignedHits,
        productionAlignmentNote: useExact
          ? "Producția a fost potrivită pe timestamp exact."
          : "Producția a fost proiectată peste consum după lună, zi și oră, când anul/minutul nu au coincis."
      }
    };
  }

  function analyzeQuestion1(dataset, options = {}) {
    const fixedTariffRonKwh = num(options.fixedTariffRonKwh ?? dataset?.meta?.fixedPriceRonKwh, 0.75);
    const rows = normalizeRows(dataset).map((row) => {
      const consumptionKwh = Math.max(0, num(row.electricKwh));
      const productionKwh = Math.max(0, num(row.pvKwh));
      const gridKwh = Math.max(consumptionKwh - productionKwh, 0);
      const surplusKwh = Math.max(productionKwh - consumptionKwh, 0);
      const gridCostRon = gridKwh * fixedTariffRonKwh;
      return { ...row, consumptionKwh, productionKwh, gridKwh, surplusKwh, gridCostRon, fixedTariffRonKwh };
    });

    const totals = rows.reduce((acc, row) => {
      acc.consumptionKwh += row.consumptionKwh;
      acc.productionKwh += row.productionKwh;
      acc.gridKwh += row.gridKwh;
      acc.surplusKwh += row.surplusKwh;
      acc.gridCostRon += row.gridCostRon;
      return acc;
    }, { consumptionKwh: 0, productionKwh: 0, gridKwh: 0, surplusKwh: 0, gridCostRon: 0 });

    const expensiveIntervals = rows
      .filter((row) => row.gridKwh > 0)
      .sort((a, b) => b.gridCostRon - a.gridCostRon)
      .slice(0, 12)
      .map((row, index) => ({
        rank: index + 1,
        timestamp: row.timestamp,
        localLabel: row.localLabel,
        hour: row.hour,
        consumptionKwh: round(row.consumptionKwh),
        productionKwh: round(row.productionKwh),
        gridKwh: round(row.gridKwh),
        gridCostRon: round(row.gridCostRon),
        tariffRonKwh: round(fixedTariffRonKwh, 3)
      }));

    const peak = expensiveIntervals[0]?.gridCostRon || 0;
    const threshold = peak ? peak * 0.72 : 0;
    const chartRows = rows.map((row) => ({
      label: row.localLabel || row.timestamp,
      timestamp: row.timestamp,
      hour: row.hour,
      consumptionKwh: round(row.consumptionKwh),
      productionKwh: round(row.productionKwh),
      gridKwh: round(row.gridKwh),
      surplusKwh: round(row.surplusKwh),
      gridCostRon: round(row.gridCostRon),
      isExpensive: row.gridCostRon >= threshold && row.gridKwh > 0
    }));

    return {
      question: "Când consum din rețea energie scumpă?",
      meta: {
        ...(dataset?.meta || {}),
        parserVersion: "v102",
        fixedTariffRonKwh,
        hasProduction: rows.some((row) => row.productionKwh > 0)
      },
      totals: {
        consumptionKwh: round(totals.consumptionKwh),
        productionKwh: round(totals.productionKwh),
        gridKwh: round(totals.gridKwh),
        surplusKwh: round(totals.surplusKwh),
        gridCostRon: round(totals.gridCostRon),
        fixedTariffRonKwh: round(fixedTariffRonKwh, 3)
      },
      expensiveIntervals,
      chartRows
    };
  }

  function analyze(dataset, options = {}) {
    return analyzeQuestion1(dataset, options);
  }

  const api = { analyze, analyzeQuestion1, mergeProduction, normalizeRows };
  root.SVTAnalysisEngine = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
