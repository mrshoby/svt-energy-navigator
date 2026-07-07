/* v34 analysis engine — fixed tariff grid-consumption question 1 */
(function(root){
  function num(v){ return Number(v) || 0; }
  function round(n,d=2){ const p=Math.pow(10,d); return Math.round(num(n)*p)/p; }
  function mergeProduction(consumptionDataset, productionDataset){
    if (!productionDataset || !productionDataset.rows || !productionDataset.rows.length) return consumptionDataset;

    function exactKey(d){
      return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")+" "+String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0");
    }
    function mdhKey(d){
      return String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")+" "+String(d.getHours()).padStart(2,"0");
    }

    const prodExact = new Map();
    const prodByMonthDayHour = new Map();

    for (const r of productionDataset.rows){
      const d = new Date(r.timestamp);
      if (isNaN(d)) continue;
      const value = num(r.pvKwh) || num(r.electricKwh);
      if (!Number.isFinite(value)) continue;

      const eKey = exactKey(d);
      const hKey = mdhKey(d);

      prodExact.set(eKey, (prodExact.get(eKey)||0) + value);
      prodByMonthDayHour.set(hKey, (prodByMonthDayHour.get(hKey)||0) + value);
    }

    const consumptionRows = consumptionDataset.rows || [];
    let exactHits = 0;
    for (const r of consumptionRows){
      const d = new Date(r.timestamp);
      if (!isNaN(d) && prodExact.has(exactKey(d))) exactHits++;
    }

    const requiredExactHits = Math.max(3, Math.ceil(consumptionRows.length * 0.02));
    const useExact = exactHits >= requiredExactHits;

    const consumptionCountByHour = new Map();
    if (!useExact) {
      for (const r of consumptionRows){
        const d = new Date(r.timestamp);
        if (isNaN(d)) continue;
        const hKey = mdhKey(d);
        consumptionCountByHour.set(hKey, (consumptionCountByHour.get(hKey)||0) + 1);
      }
    }

    let alignedHits = 0;
    const rows = consumptionRows.map(r => {
      const d = new Date(r.timestamp);
      if (isNaN(d)) return {...r, pvKwh:r.pvKwh || 0};

      let pv = 0;
      if (useExact) {
        pv = prodExact.get(exactKey(d)) || r.pvKwh || 0;
      } else {
        const hKey = mdhKey(d);
        const hourlyProduction = prodByMonthDayHour.get(hKey) || 0;
        const countInHour = Math.max(1, consumptionCountByHour.get(hKey) || 1);
        // If consumption is sub-hourly and PVGIS/inverter is hourly, split hourly production across the sub-intervals.
        pv = hourlyProduction / countInHour;
      }

      if (pv > 0) alignedHits++;
      return {...r, pvKwh:pv || r.pvKwh || 0};
    });

    const alignment = useExact ? "exact_timestamp" : "month_day_hour_projection";
    return {
      ...consumptionDataset,
      rows,
      meta:{
        ...consumptionDataset.meta,
        productionFileName:productionDataset.meta?.fileName || "",
        productionFileNames:productionDataset.meta?.fileNames || (productionDataset.meta?.fileName ? [productionDataset.meta.fileName] : []),
        productionAlignment:alignment,
        productionExactHits:exactHits,
        productionAlignedHits:alignedHits,
        productionAlignmentNote:useExact
          ? "Producția a fost potrivită pe timestamp exact."
          : "Fișierul cu energia produsă a fost potrivit peste consum după lună, zi și oră, deoarece perioadele nu se suprapuneau perfect."
      }
    };
  }

  function analyzeQuestion1(consumptionDataset, options={}){
    const tariff = num(options.fixedTariffRonKwh) || 0.75;
    const rows = (consumptionDataset.rows || []).map(r => {
      const consumption = Math.max(0, num(r.electricKwh || r.thermalKwh || r.consumptionKwh));
      const production = Math.max(0, num(r.pvKwh));
      const grid = Math.max(consumption - production, 0);
      const surplus = Math.max(production - consumption, 0);
      return {
        ...r,
        consumptionKwh: consumption,
        productionKwh: production,
        gridKwh: grid,
        surplusKwh: surplus,
        fixedTariffRonKwh: tariff,
        gridCostRon: grid * tariff
      };
    });
    const totalConsumption = rows.reduce((a,r)=>a+r.consumptionKwh,0);
    const totalProduction = rows.reduce((a,r)=>a+r.productionKwh,0);
    const totalGrid = rows.reduce((a,r)=>a+r.gridKwh,0);
    const totalSurplus = rows.reduce((a,r)=>a+r.surplusKwh,0);
    const totalCost = rows.reduce((a,r)=>a+r.gridCostRon,0);
    const expensiveIntervals = rows.slice()
      .filter(r=>r.gridKwh > 0)
      .sort((a,b)=>b.gridCostRon-a.gridCostRon)
      .slice(0,12)
      .map((r,i)=>({
        rank:i+1,
        timestamp:r.timestamp,
        localLabel:r.localLabel,
        hour:r.hour,
        consumptionKwh:round(r.consumptionKwh),
        productionKwh:round(r.productionKwh),
        gridKwh:round(r.gridKwh),
        gridCostRon:round(r.gridCostRon),
        tariffRonKwh:round(tariff,3)
      }));
    const maxCost = expensiveIntervals[0]?.gridCostRon || 0;
    const threshold = maxCost ? maxCost * 0.72 : 0;
    const chartRows = rows.map(r => ({
      label:r.localLabel || r.timestamp,
      timestamp:r.timestamp,
      hour:r.hour,
      consumptionKwh:round(r.consumptionKwh),
      productionKwh:round(r.productionKwh),
      gridKwh:round(r.gridKwh),
      surplusKwh:round(r.surplusKwh),
      gridCostRon:round(r.gridCostRon),
      isExpensive:r.gridCostRon >= threshold && r.gridKwh > 0
    }));
    return {
      question:"Când consum din rețea energie scumpă?",
      meta:{
        ...(consumptionDataset.meta||{}),
        parserVersion:"v34",
        fixedTariffRonKwh:tariff,
        hasProduction: rows.some(r=>r.productionKwh > 0)
      },
      totals:{
        consumptionKwh:round(totalConsumption),
        productionKwh:round(totalProduction),
        gridKwh:round(totalGrid),
        surplusKwh:round(totalSurplus),
        gridCostRon:round(totalCost),
        fixedTariffRonKwh:round(tariff,3)
      },
      expensiveIntervals,
      chartRows
    };
  }

  function analyze(dataset){
    return analyzeQuestion1(dataset, {fixedTariffRonKwh:dataset?.meta?.fixedPriceRonKwh || 0.75});
  }

  const api={analyze, analyzeQuestion1, mergeProduction};
  root.SVTAnalysisEngine=api;
  if(typeof module!=="undefined"&&module.exports) module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
