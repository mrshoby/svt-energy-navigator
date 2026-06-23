/* SVT Energy Navigator v102 — load curve parser profiles
   Parses common Romanian CSV/XLSX/HTML-table exports into SVT internal rows. Browser + Node compatible. */
(function attachSVTLoadCurveProfiles(root) {
  "use strict";

  const DATE_KEYS = ["data", "date", "zi", "timestamp", "datetime", "data ora", "data_oră", "data si ora", "interval"];
  const TIME_KEYS = ["ora", "time", "interval", "hour", "start", "inceput", "început"];
  const KWH_KEYS = ["kwh", "consum", "energie", "active energy", "energie activa", "energie activă", "valoare", "cantitate"];
  const PV_KEYS = ["pv", "pvgis", "productie", "producție", "production", "solar"];

  function clean(value) {
    return String(value ?? "").replace(/\uFEFF/g, "").trim();
  }

  function norm(value) {
    return clean(value).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
  }

  function num(value) {
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    let s = clean(value).replace(/\s+/g, "");
    if (!s) return 0;
    if (/^-?\d{1,3}(\.\d{3})+,\d+$/.test(s)) s = s.replace(/\./g, "").replace(",", ".");
    else if (/^-?\d{1,3}(,\d{3})+\.\d+$/.test(s)) s = s.replace(/,/g, "");
    else s = s.replace(",", ".");
    const n = Number(s.replace(/[^0-9.-]/g, ""));
    return Number.isFinite(n) ? n : 0;
  }

  function excelDateToJS(value) {
    if (typeof value !== "number" || !Number.isFinite(value)) return null;
    const utcDays = Math.floor(value - 25569);
    const utcValue = utcDays * 86400;
    const fractionalDay = value - Math.floor(value);
    const totalSeconds = Math.round(fractionalDay * 86400);
    return new Date((utcValue + totalSeconds) * 1000);
  }

  function parseRomanianDate(datePart, timePart) {
    if (datePart instanceof Date && !Number.isNaN(datePart.getTime())) return datePart;
    if (typeof datePart === "number") {
      const d = excelDateToJS(datePart);
      if (d) return d;
    }
    let s = clean(datePart);
    const t = clean(timePart);
    if (t && !s.includes(t)) s = `${s} ${t}`;
    s = s.replace(/[–—]/g, "-").replace(/\s+/g, " ");

    let m = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})(?:\s+(\d{1,2})(?::(\d{1,2}))?)?/);
    if (m) {
      const year = Number(m[3].length === 2 ? `20${m[3]}` : m[3]);
      return new Date(year, Number(m[2]) - 1, Number(m[1]), Number(m[4] || 0), Number(m[5] || 0));
    }
    m = s.match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})(?:[T\s]+(\d{1,2})(?::(\d{1,2}))?)?/);
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4] || 0), Number(m[5] || 0));

    const parsed = new Date(s);
    if (!Number.isNaN(parsed.getTime())) return parsed;
    return null;
  }

  function splitDelimited(text) {
    const sample = text.slice(0, 1200);
    const candidates = [";", ",", "\t", "|"];
    const delimiter = candidates
      .map((d) => ({ d, count: (sample.match(new RegExp(`\\${d}`, "g")) || []).length }))
      .sort((a, b) => b.count - a.count)[0]?.d || ";";

    return text.split(/\r?\n/).map((line) => parseCsvLine(line, delimiter)).filter((row) => row.some((cell) => clean(cell)));
  }

  function parseCsvLine(line, delimiter) {
    const out = [];
    let current = "";
    let quote = false;
    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      if (char === '"' && line[i + 1] === '"') { current += '"'; i += 1; continue; }
      if (char === '"') { quote = !quote; continue; }
      if (char === delimiter && !quote) { out.push(current); current = ""; continue; }
      current += char;
    }
    out.push(current);
    return out;
  }

  function scoreHeader(cell, keys) {
    const h = norm(cell);
    return keys.some((key) => h.includes(norm(key)));
  }

  function findHeader(rows) {
    const limit = Math.min(rows.length, 30);
    for (let i = 0; i < limit; i += 1) {
      const row = rows[i] || [];
      const hasDate = row.some((cell) => scoreHeader(cell, DATE_KEYS));
      const hasKwh = row.some((cell) => scoreHeader(cell, KWH_KEYS));
      if (hasDate && hasKwh) return i;
    }
    return 0;
  }

  function firstIndex(headers, keys) {
    return headers.findIndex((cell) => scoreHeader(cell, keys));
  }

  function rowsToDataset(rows, meta = {}) {
    if (!rows || rows.length < 2) throw new Error("Fișierul nu conține suficiente rânduri pentru o curbă de sarcină.");
    const headerIndex = findHeader(rows);
    const headers = rows[headerIndex].map(clean);
    const dataRows = rows.slice(headerIndex + 1);
    const dateIndex = firstIndex(headers, DATE_KEYS);
    const timeIndex = firstIndex(headers, TIME_KEYS);
    const kwhIndex = firstIndex(headers, KWH_KEYS);
    const pvIndex = firstIndex(headers, PV_KEYS);

    if (dateIndex < 0 || kwhIndex < 0) {
      throw new Error("Nu am găsit coloanele minime: dată/oră și consum kWh.");
    }

    const parsedRows = [];
    dataRows.forEach((row) => {
      const d = parseRomanianDate(row[dateIndex], timeIndex >= 0 && timeIndex !== dateIndex ? row[timeIndex] : "");
      const electricKwh = num(row[kwhIndex]);
      if (!d || !Number.isFinite(electricKwh)) return;
      parsedRows.push({
        timestamp: d.toISOString(),
        localLabel: d.toLocaleString("ro-RO", { dateStyle: "short", timeStyle: "short" }),
        hour: d.getHours(),
        electricKwh: Math.max(0, electricKwh),
        pvKwh: pvIndex >= 0 ? Math.max(0, num(row[pvIndex])) : 0
      });
    });

    if (!parsedRows.length) throw new Error("Nu am putut interpreta niciun rând valid cu dată/oră și kWh.");
    return {
      rows: parsedRows,
      meta: {
        parserVersion: "v102",
        fileName: meta.fileName || "",
        source: meta.source || "uploaded_file",
        rowsParsed: parsedRows.length,
        detectedColumns: { date: headers[dateIndex], time: timeIndex >= 0 ? headers[timeIndex] : "", kwh: headers[kwhIndex], pv: pvIndex >= 0 ? headers[pvIndex] : "" }
      }
    };
  }

  function htmlTablesToRows(html) {
    const table = clean(html).replace(/<tr/gi, "\n<tr");
    return table.split(/<tr[^>]*>/i).slice(1).map((tr) => {
      return tr.split(/<t[dh][^>]*>/i).slice(1).map((cell) => clean(cell.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ")));
    }).filter((row) => row.length);
  }

  async function parseFile(file) {
    const name = file?.name || "";
    const lower = name.toLowerCase();
    if (/\.xlsx?$/.test(lower)) {
      if (!root.XLSX) throw new Error("Pentru Excel este necesară librăria XLSX încărcată în pagină.");
      const buffer = await file.arrayBuffer();
      const workbook = root.XLSX.read(buffer, { type: "array", cellDates: true });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = root.XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: "" });
      return rowsToDataset(rows, { fileName: name, source: "excel" });
    }
    const text = await file.text();
    if (/\.html?$/.test(lower) || /<table/i.test(text)) {
      return rowsToDataset(htmlTablesToRows(text), { fileName: name, source: "html_table" });
    }
    return rowsToDataset(splitDelimited(text), { fileName: name, source: "csv" });
  }

  function monthlyInvoiceToDataset(options) {
    const totalKwh = Math.max(0, num(options.totalKwh));
    const days = Math.max(1, Math.round(num(options.days, 30)) || 30);
    const schedule = clean(options.schedule || "L-V, 8-18");
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - days + 1);

    const activeHours = [];
    for (let h = 0; h < 24; h += 1) {
      if (schedule === "24/7") activeHours.push(h);
      else if (schedule.includes("6-22") && h >= 6 && h < 22) activeHours.push(h);
      else if (schedule.includes("8-18") && h >= 8 && h < 18) activeHours.push(h);
      else if (schedule.includes("S-D") && h >= 8 && h < 20) activeHours.push(h);
      else if (schedule.includes("Alt") && h >= 8 && h < 18) activeHours.push(h);
    }
    if (!activeHours.length) activeHours.push(...Array.from({ length: 24 }, (_, i) => i));

    const rows = [];
    for (let d = 0; d < days; d += 1) {
      const current = new Date(start);
      current.setDate(start.getDate() + d);
      const weekday = current.getDay();
      const isWeekend = weekday === 0 || weekday === 6;
      const includesSaturday = schedule.includes("L-S") && weekday === 6;
      const includesWeekend = schedule.includes("S-D") || schedule === "24/7";
      const isWorkingDay = !isWeekend || includesSaturday || includesWeekend;
      const hoursForDay = isWorkingDay ? activeHours : (schedule === "24/7" ? activeHours : [10, 11, 12]);
      hoursForDay.forEach((hour) => {
        const dt = new Date(current);
        dt.setHours(hour, 0, 0, 0);
        rows.push({ timestamp: dt.toISOString(), localLabel: dt.toLocaleString("ro-RO", { dateStyle: "short", timeStyle: "short" }), hour, electricKwh: 0, pvKwh: 0 });
      });
    }
    const perRow = rows.length ? totalKwh / rows.length : 0;
    rows.forEach((row) => { row.electricKwh = perRow; });
    return { rows, meta: { parserVersion: "v102", source: "monthly_invoice_estimate", totalKwh, days, schedule, rowsParsed: rows.length } };
  }

  const api = { parseFile, rowsToDataset, splitDelimited, monthlyInvoiceToDataset };
  root.SVTLoadCurveProfiles = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
