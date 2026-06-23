/* v32 Real Load Curve Parser Profiles
   Browser + Node compatible IIFE. Parses real Romanian load curve formats into one internal dataset.
*/
(function(root){
  const MONTHS = {
    "ian":1,"ianuarie":1,"january":1,
    "feb":2,"februarie":2,"february":2,
    "mar":3,"martie":3,"march":3,
    "apr":4,"aprilie":4,"april":4,
    "mai":5,"may":5,
    "iun":6,"iunie":6,"june":6,
    "iul":7,"iulie":7,"july":7,
    "aug":8,"august":8,
    "sep":9,"sept":9,"septembrie":9,"september":9,
    "oct":10,"octombrie":10,"october":10,
    "noi":11,"nov":11,"noiembrie":11,"november":11,
    "dec":12,"decembrie":12,"december":12
  };

  function norm(s){
    return String(s ?? "")
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
      .replace(/[ăâîșşțţ]/g, ch => ({ă:"a",â:"a",î:"i",ș:"s",ş:"s",ț:"t",ţ:"t"}[ch]||ch))
      .replace(/\s+/g," ")
      .trim();
  }

  function cleanCell(v){
    if (v === null || v === undefined) return "";
    if (v instanceof Date) return v;
    return String(v).replace(/\u00a0/g," ").trim();
  }

  function cleanAoa(aoa){
    return (aoa || []).map(r => (r || []).map(cleanCell));
  }

  function toNumber(value){
    if (value === null || value === undefined || value === "") return 0;
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    let s = String(value).trim();
    if (!s) return 0;
    s = s.replace(/\s/g,"").replace(/[^\d,.\-+Ee]/g,"");
    if (!s) return 0;
    if (s.includes(",") && s.includes(".")) {
      if (s.lastIndexOf(",") > s.lastIndexOf(".")) s = s.replace(/\./g,"").replace(",",".");
      else s = s.replace(/,/g,"");
    } else if (s.includes(",")) {
      s = s.replace(",",".");
    }
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  }

  function excelSerialToDate(serial){
    const n = Number(serial);
    if (!Number.isFinite(n) || n < 1) return null;
    const utcDays = Math.floor(n - 25569);
    const utcValue = utcDays * 86400;
    const date = new Date(utcValue * 1000);
    const frac = n - Math.floor(n);
    let totalSeconds = Math.round(frac * 86400);
    const h = Math.floor(totalSeconds/3600);
    totalSeconds -= h*3600;
    const m = Math.floor(totalSeconds/60);
    const s = totalSeconds - m*60;
    return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), h, m, s);
  }

  function parseTimePart(value){
    if (value === null || value === undefined || value === "") return {h:0,m:0,s:0};
    if (typeof value === "number" || /^[-+]?\d+(\.\d+)?(e[-+]?\d+)?$/i.test(String(value).trim())) {
      const n = Number(value);
      if (n >= 0 && n < 1) {
        const minutes = Math.round(n * 1440);
        return {h:Math.floor(minutes/60)%24, m:minutes%60, s:0};
      }
      if (n >= 0 && n <= 24) return {h:Math.floor(n), m:Math.round((n-Math.floor(n))*60), s:0};
    }
    const s = String(value).trim();
    let m = s.match(/(\d{1,2})[:.](\d{2})(?::(\d{2}))?/);
    if (m) return {h:+m[1], m:+m[2], s:+(m[3]||0)};
    if (/^\d{1,2}$/.test(s)) return {h:+s, m:0, s:0};
    return {h:0,m:0,s:0};
  }

  function parseDate(value, timeValue, options={}){
    if (value instanceof Date && !isNaN(value)) {
      const d = new Date(value);
      if (timeValue !== undefined && timeValue !== "") {
        const t = parseTimePart(timeValue);
        d.setHours(t.h,t.m,t.s,0);
      }
      return d;
    }

    if (typeof value === "number" || /^[-+]?\d+(\.\d+)?$/.test(String(value).trim())) {
      const n = Number(value);
      if (n > 20000 && n < 90000) {
        const d = excelSerialToDate(n);
        if (d && timeValue !== undefined && timeValue !== "") {
          const t = parseTimePart(timeValue);
          d.setHours(t.h,t.m,t.s,0);
        }
        return d;
      }
    }

    let s = String(value ?? "").trim();
    if (!s) return null;
    s = s.replace("@"," ").replace("T"," ").replace(/\s+/g," ");

    // dd.mm.yyyy hh:mm:ss / dd-mm-yyyy
    let m = s.match(/^(\d{1,2})[.\-](\d{1,2})[.\-](\d{4})(?:[,\s]+(\d{1,2})[:.](\d{2})(?::(\d{2}))?)?/);
    if (m) {
      const d = new Date(+m[3], +m[2]-1, +m[1], +(m[4]||0), +(m[5]||0), +(m[6]||0));
      if (timeValue !== undefined && timeValue !== "") {
        const t = parseTimePart(timeValue);
        d.setHours(t.h,t.m,t.s,0);
      }
      return d;
    }

    // yyyy-mm-dd hh:mm
    m = s.match(/^(\d{4})[.\-\/](\d{1,2})[.\-\/](\d{1,2})(?:[,\s]+(\d{1,2})[:.](\d{2})(?::(\d{2}))?)?/);
    if (m) {
      const d = new Date(+m[1], +m[2]-1, +m[3], +(m[4]||0), +(m[5]||0), +(m[6]||0));
      if (timeValue !== undefined && timeValue !== "") {
        const t = parseTimePart(timeValue);
        d.setHours(t.h,t.m,t.s,0);
      }
      return d;
    }

    // mm/dd/yyyy hh:mm AM (US-style portal exports)
    m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[,\s]+(\d{1,2})[:.](\d{2})(?::(\d{2})(?:\.\d+)?)?\s*(AM|PM)?)?/i);
    if (m) {
      let hh = +(m[4]||0);
      const ap = (m[7]||"").toUpperCase();
      if (ap === "PM" && hh < 12) hh += 12;
      if (ap === "AM" && hh === 12) hh = 0;
      // slash exports in samples are US month/day/year
      const d = new Date(+m[3], +m[1]-1, +m[2], hh, +(m[5]||0), +(m[6]||0));
      return d;
    }


    // PVGIS compact timestamp: YYYYMMDD:HHMM or YYYYMMDD:HHMMSS
    m = s.match(/^(\d{4})(\d{2})(\d{2})\s*[:_\-]?\s*(\d{2})(\d{2})(?:\d{2})?$/);
    if (m) {
      return new Date(+m[1], +m[2]-1, +m[3], +m[4], +m[5], 0);
    }

    const d = new Date(s);
    return isNaN(d) ? null : d;
  }

  function detectDelimiter(text){
    const lines = String(text || "").split(/\r?\n/).slice(0,80).filter(l => l.trim());
    const candidates = [",",";","\t","|"];
    const scores = candidates.map(d => {
      let score = 0, useful = 0;
      for (const line of lines){
        const trimmed = line.trim();
        if (!trimmed || /^#/.test(trimmed)) continue;
        const count = (trimmed.match(new RegExp("\\"+d,"g")) || []).length;
        if (count > 0) {
          useful++;
          score += count;
          if (/time|data|ora|p\b|p\s*\[|power|putere|product|produc|pv|solar|pac|yield/i.test(trimmed)) score += count * 2;
        }
      }
      return {d, score, useful};
    }).sort((a,b) => (b.score - a.score) || (b.useful - a.useful));
    return scores[0]?.score > 0 ? scores[0].d : ",";
  }

  function parseCsvText(text){
    const delim = detectDelimiter(text);
    const rows = [];
    let row = [], cell = "", inQuotes = false;
    for (let i=0; i<text.length; i++){
      const ch = text[i], next = text[i+1];
      if (ch === '"' && inQuotes && next === '"') { cell += '"'; i++; continue; }
      if (ch === '"') { inQuotes = !inQuotes; continue; }
      if (ch === delim && !inQuotes) { row.push(cell); cell = ""; continue; }
      if ((ch === "\n" || ch === "\r") && !inQuotes) {
        if (ch === "\r" && next === "\n") i++;
        row.push(cell); cell = "";
        if (row.some(v => String(v).trim() !== "")) rows.push(row);
        row = [];
        continue;
      }
      cell += ch;
    }
    if (cell || row.length) {
      row.push(cell);
      if (row.some(v => String(v).trim() !== "")) rows.push(row);
    }
    let cleaned = cleanAoa(rows);
    const wideRows = cleaned.filter(r => r.length > 1).length;
    if (wideRows === 0) {
      const rawLines = String(text || "").split(/\r?\n/).filter(l => l.trim());
      const altDelims = [";", "\t", ",", "|"];
      for (const d of altDelims) {
        const split = rawLines.map(l => l.split(d).map(x => x.trim())).filter(r => r.some(v => v !== ""));
        if (split.some(r => r.length >= 2 && r.some(c => /time|data|ora/i.test(c)) && r.some(c => /^p(\s|\[|$)|power|putere|product|produc|pv|solar|pac|yield/i.test(c)))) {
          cleaned = cleanAoa(split);
          break;
        }
      }
    }
    return cleaned;
  }

  function aoaToObjects(aoa, headerRow){
    const headers = aoa[headerRow].map((h,i) => String(h || `Coloana ${i+1}`).trim() || `Coloana ${i+1}`);
    const rows = [];
    for (let r=headerRow+1; r<aoa.length; r++){
      const obj = {};
      headers.forEach((h,i)=>obj[h]=aoa[r][i] ?? "");
      if (Object.values(obj).some(v=>String(v).trim() !== "")) rows.push(obj);
    }
    return {headers, rows};
  }

  function extractText(aoa, limit=80){
    return aoa.slice(0,limit).flat().map(x => String(x ?? "")).join(" ");
  }

  function inferPeriod(fileName, aoa){
    const text = norm((fileName||"") + " " + extractText(aoa, 80));
    let m = text.match(/perioada\s+(\d{1,2})[.\-\/](\d{1,2})[.\-\/](\d{4})\s*[-–]\s*(\d{1,2})[.\-\/](\d{1,2})[.\-\/](\d{4})/);
    if (m) return {month:+m[2], year:+m[3], startDay:+m[1], endDay:+m[4]};
    m = text.match(/(?:^|[^\d])(\d{1,2})[.\-_ ](\d{4})(?:[^\d]|$)/);
    if (m && +m[1] >= 1 && +m[1] <= 12) return {month:+m[1], year:+m[2], startDay:1};
    for (const [name, month] of Object.entries(MONTHS)) {
      const re = new RegExp("\\b"+name+"\\b[^0-9]*(20\\d{2}|19\\d{2})");
      const hit = text.match(re);
      if (hit) return {month, year:+hit[1], startDay:1};
    }
    m = text.match(/\b(20\d{2}|19\d{2})\b/);
    return {month:null, year:m ? +m[1] : new Date().getFullYear(), startDay:1};
  }

  function detectUnit(fileName, aoa, headers=[]){
    const text = norm((fileName||"") + " " + extractText(aoa, 80) + " " + headers.join(" "));
    if (/\bmwh\b/.test(text)) return {unit:"MWh", multiplier:1000};
    if (/\bwh\b/.test(text) && !/\bkwh\b/.test(text)) return {unit:"Wh", multiplier:1/1000};
    return {unit:"kWh", multiplier:1};
  }

  function inferIntervalMinutes(rows){
    const dates = rows.map(r => new Date(r.timestamp)).filter(d => !isNaN(d)).sort((a,b)=>a-b).slice(0,200);
    const diffs = [];
    for (let i=1;i<dates.length;i++){
      const d = Math.round((dates[i]-dates[i-1])/60000);
      if (d > 0 && d < 1440) diffs.push(d);
    }
    if (!diffs.length) return 60;
    diffs.sort((a,b)=>a-b);
    return diffs[Math.floor(diffs.length/2)] || 60;
  }

  function headerScore(row){
    const text = norm(row.join(" "));
    let score = 0;
    if (/(data|timestamp|ora|referinta|data-ora)/.test(text)) score += 3;
    if (/(ea\+|energie activa|import|consum|kwh|wh_delivered|delivered|sarcina|putere)/.test(text)) score += 4;
    if (/(reactiv|kvar|er\+|er\-)/.test(text)) score += 1;
    return score;
  }

  function findLongHeaderRow(aoa){
    let best = {idx:-1, score:0};
    for (let r=0; r<Math.min(60, aoa.length); r++){
      const s = headerScore(aoa[r] || []);
      if (s > best.score) best = {idx:r, score:s};
    }
    return best.score >= 5 ? best.idx : -1;
  }

  function pickLongColumns(headers){
    const nheaders = headers.map(norm);
    let timestamp = nheaders.findIndex(h => /(data.?ora|timestamp|data de referinta|data\/ora|datetime)/.test(h));
    if (timestamp < 0) timestamp = nheaders.findIndex(h => h === "data" || h === "ora" || /data/.test(h));
    let electric = -1, exportIdx=-1, reactiveInd=-1, reactiveCap=-1, thermal=-1, pv=-1, price=-1;
    for (let i=0; i<nheaders.length; i++){
      const h = nheaders[i];
      if (i === timestamp) continue;
      if (/(termic|thermal|gaz|caldura|abur|m3)/.test(h)) { if (thermal<0) thermal=i; continue; }
      if (/(pv|solar|fotovoltaic|productie)/.test(h)) { if (pv<0) pv=i; continue; }
      if (/(pret|price|ron|tarif|pzu)/.test(h)) { if (price<0) price=i; continue; }
      if (/(er\+|reactiva consumata|kvarh del|kvarh import|kvarh consum)/.test(h)) { if (reactiveInd<0) reactiveInd=i; continue; }
      if (/(er\-|supracompensata|kvarh rec|kvarh export)/.test(h)) { if (reactiveCap<0) reactiveCap=i; continue; }
      if (/(ea\-|energie activa export|export|kwh rec)/.test(h)) { if (exportIdx<0) exportIdx=i; continue; }
      if (/(ea\+|energie activa import|energie activa consumata|kwh del|wh_delivered|delivered|consum|kwh|sarcina|putere)/.test(h) && !/(index|indec|reactiv|kvar|export|rec)/.test(h)) {
        if (electric < 0) electric = i;
      }
    }
    return {timestamp, electric, exportIdx, reactiveInd, reactiveCap, thermal, pv, price};
  }

  function parseLongTimestamp(aoa, ctx){
    const headerRow = findLongHeaderRow(aoa);
    if (headerRow < 0) return null;
    const headers = aoa[headerRow].map((h,i)=>String(h || `Coloana ${i+1}`).trim());
    const cols = pickLongColumns(headers);
    if (cols.timestamp < 0 || cols.electric < 0) return null;
    const unit = detectUnit(ctx.fileName, aoa, headers);
    const rows = [];
    for (let r=headerRow+1; r<aoa.length; r++){
      const line = aoa[r] || [];
      const d = parseDate(line[cols.timestamp]);
      if (!d || isNaN(d)) continue;
      const electric = toNumber(line[cols.electric]) * unit.multiplier;
      const rec = {
        timestamp:d.toISOString(),
        localLabel:d.toLocaleString("ro-RO", {dateStyle:"short", timeStyle:"short"}),
        hour:d.getHours(),
        minute:d.getMinutes(),
        electricKwh:Math.max(0,electric),
        electricExportKwh:cols.exportIdx>=0 ? Math.max(0,toNumber(line[cols.exportIdx])*unit.multiplier) : 0,
        reactiveInductiveKvarh:cols.reactiveInd>=0 ? Math.max(0,toNumber(line[cols.reactiveInd])) : 0,
        reactiveCapacitiveKvarh:cols.reactiveCap>=0 ? Math.max(0,toNumber(line[cols.reactiveCap])) : 0,
        thermalKwh:cols.thermal>=0 ? Math.max(0,toNumber(line[cols.thermal]) * (ctx.mode==="thermal" && /m3/.test(norm(headers[cols.thermal])) ? (ctx.gasFactor || 10.55) : 1)) : 0,
        pvKwh:cols.pv>=0 ? Math.max(0,toNumber(line[cols.pv])*unit.multiplier) : 0,
        priceRonKwh:cols.price>=0 ? Math.max(0,toNumber(line[cols.price])) : 0,
        sourceRow:r+1
      };
      if (rec.electricKwh || rec.electricExportKwh || rec.thermalKwh || rec.reactiveInductiveKvarh || rec.reactiveCapacitiveKvarh) rows.push(rec);
    }
    if (rows.length < 2) return null;
    return finishDataset(rows, {...ctx, profile:"long_timestamp", unit:unit.unit, headerRow:headerRow+1});
  }

  function parseSplitDateOra(aoa, ctx){
    let headerRow = -1, cols = {};
    for (let r=0; r<Math.min(60,aoa.length); r++){
      const n = (aoa[r]||[]).map(norm);
      const data = n.findIndex(h => h === "data" || /^data\b/.test(h));
      const ora = n.findIndex(h => h === "ora" || /^ora\b/.test(h));
      const ea = n.findIndex(h => /(ea\+|energie activa import|consum|kwh del|delim|import)/.test(h) && !/(ea\-|export|reactiv|kvar)/.test(h));
      if (data >= 0 && ora >= 0 && ea >= 0) {
        headerRow = r; cols = {data,ora,electric:ea,
          exportIdx:n.findIndex(h=>/(ea\-|export)/.test(h)),
          reactiveInd:n.findIndex(h=>/(er\+|reactiv|kvarh del)/.test(h)),
          reactiveCap:n.findIndex(h=>/(er\-|supracompensata|kvarh rec)/.test(h))
        };
        break;
      }
    }
    if (headerRow < 0) return null;
    const headers = aoa[headerRow].map(String);
    const unit = detectUnit(ctx.fileName, aoa, headers);
    const rows = [];
    for (let r=headerRow+1; r<aoa.length; r++){
      const line = aoa[r] || [];
      const d = parseDate(line[cols.data], line[cols.ora]);
      if (!d || isNaN(d)) continue;
      const rec = {
        timestamp:d.toISOString(), localLabel:d.toLocaleString("ro-RO", {dateStyle:"short", timeStyle:"short"}),
        hour:d.getHours(), minute:d.getMinutes(),
        electricKwh:Math.max(0,toNumber(line[cols.electric])*unit.multiplier),
        electricExportKwh:cols.exportIdx>=0 ? Math.max(0,toNumber(line[cols.exportIdx])*unit.multiplier) : 0,
        reactiveInductiveKvarh:cols.reactiveInd>=0 ? Math.max(0,toNumber(line[cols.reactiveInd])) : 0,
        reactiveCapacitiveKvarh:cols.reactiveCap>=0 ? Math.max(0,toNumber(line[cols.reactiveCap])) : 0,
        thermalKwh:0,pvKwh:0,priceRonKwh:0,sourceRow:r+1
      };
      if (rec.electricKwh || rec.electricExportKwh || rec.reactiveInductiveKvarh || rec.reactiveCapacitiveKvarh) rows.push(rec);
    }
    if (rows.length < 2) return null;
    return finishDataset(rows, {...ctx, profile:"split_data_ora_ea_delim", unit:unit.unit, headerRow:headerRow+1});
  }

  function parseHourFromLabel(label, fallbackIndex){
    const s = String(label ?? "").trim();
    let m = s.match(/(\d{1,2})\s*[-:]\s*(\d{1,2})/);
    if (m) return Math.max(0, Math.min(23, +m[1]));
    m = s.match(/^(\d{1,2})(?:\.0+)?$/);
    if (m) {
      const n = +m[1];
      if (n >= 0 && n <= 23) return n;
      if (n >= 1 && n <= 24) return n-1;
    }
    return Math.max(0, Math.min(23, fallbackIndex));
  }

  function parseMonthlyMatrix(aoa, ctx){
    let headerRow=-1, dayCols=[], hourCol=-1;
    for (let r=0; r<Math.min(80,aoa.length); r++){
      const row = aoa[r] || [];
      const days = [];
      for (let c=0;c<row.length;c++){
        const s = String(row[c] ?? "").trim();
        if (/^\d{1,2}$/.test(s) && +s>=1 && +s<=31) days.push({c,day:+s});
      }
      if (days.length >= 10) {
        const nrow = row.map(norm);
        const ibd = nrow.findIndex(h => /^(ibd|ora|ora\/ziua|ziua|interval)$/.test(h) || /(ibd|ora)/.test(h));
        hourCol = ibd >= 0 ? ibd : Math.max(0, days[0].c-1);
        headerRow = r; dayCols = days; break;
      }
    }
    if (headerRow < 0) return null;
    const period = inferPeriod(ctx.fileName, aoa);
    if (!period.month || !period.year) return null;
    const unit = detectUnit(ctx.fileName, aoa, aoa[headerRow].map(String));
    const rows = [];
    for (let r=headerRow+1; r<aoa.length; r++){
      const line = aoa[r] || [];
      const firstText = norm(line.join(" "));
      if (!firstText || /^total\b/.test(firstText)) continue;
      const hour = parseHourFromLabel(line[hourCol], r-headerRow-1);
      if (hour < 0 || hour > 23) continue;
      for (const dc of dayCols){
        const val = toNumber(line[dc.c]);
        if (!val) continue;
        const d = new Date(period.year, period.month-1, dc.day, hour, 0, 0);
        if (d.getMonth() !== period.month-1 || d.getDate() !== dc.day) continue;
        rows.push({
          timestamp:d.toISOString(), localLabel:d.toLocaleString("ro-RO",{dateStyle:"short", timeStyle:"short"}),
          hour, minute:0, electricKwh:Math.max(0,val*unit.multiplier),
          electricExportKwh:0, reactiveInductiveKvarh:0, reactiveCapacitiveKvarh:0, thermalKwh:0, pvKwh:0, priceRonKwh:0,
          sourceRow:r+1, sourceDay:dc.day
        });
      }
    }
    if (rows.length < 2) return null;
    return finishDataset(rows, {...ctx, profile:"monthly_matrix_ibd_days", unit:unit.unit, headerRow:headerRow+1, period});
  }

  function parseDayHourCs(aoa, ctx){
    let headerRow=-1, colZi=-1, colOra=-1, colVal=-1;
    for (let r=0; r<Math.min(80,aoa.length); r++){
      const n = (aoa[r]||[]).map(norm);
      const zi = n.findIndex(h => /^(zi|ziua|day)$/.test(h));
      const ora = n.findIndex(h => /^(ora|hour)$/.test(h));
      const val = n.findIndex(h => /(cs mas|consum|kwh|sarcina|putere)/.test(h));
      if (zi>=0 && ora>=0 && val>=0) { headerRow=r; colZi=zi; colOra=ora; colVal=val; break; }
    }
    if (headerRow<0) return null;
    const period = inferPeriod(ctx.fileName, aoa);
    if (!period.month || !period.year) return null;
    const unit = detectUnit(ctx.fileName, aoa, aoa[headerRow].map(String));
    const rows=[];
    for (let r=headerRow+1;r<aoa.length;r++){
      const line=aoa[r]||[];
      const day=Math.round(toNumber(line[colZi]));
      if (day<1||day>31) continue;
      const t=parseTimePart(line[colOra]);
      const val=toNumber(line[colVal]);
      if (!val) continue;
      const d=new Date(period.year, period.month-1, day, t.h, t.m, 0);
      if (d.getMonth() !== period.month-1) continue;
      rows.push({timestamp:d.toISOString(), localLabel:d.toLocaleString("ro-RO",{dateStyle:"short",timeStyle:"short"}), hour:d.getHours(), minute:d.getMinutes(), electricKwh:Math.max(0,val*unit.multiplier), electricExportKwh:0, reactiveInductiveKvarh:0, reactiveCapacitiveKvarh:0, thermalKwh:0, pvKwh:0, priceRonKwh:0, sourceRow:r+1});
    }
    if (rows.length<2) return null;
    return finishDataset(rows, {...ctx, profile:"day_hour_cs_mas", unit:unit.unit, headerRow:headerRow+1, period});
  }


  function looksLikeProductionHeader(row){
    const n = (row || []).map(norm);
    const joined = n.join(" ");
    const hasTime = n.some(h =>
      /^(time|data|ora|timestamp|datetime|data ora|data\/ora)$/.test(h) ||
      /(data.?ora|timestamp|datetime)/.test(h) ||
      /^time\b/.test(h) ||
      /time\s*\(/.test(h)
    );
    const hasPv = n.some(h =>
      /^(p|p_ac|pac|power|putere)$/.test(h) ||
      /^p\s*(\[|\(|$)/.test(h) ||
      /(pvgis|pv|solar|fotovoltaic|productie|producție|produc|generation|generated|yield|energie produsa|energia produsa|eac|pac|p_ac|active power|ac power|inverter power|putere activa|putere produsa|energie activa produsa|produsa)/.test(h)
    );
    const pvgisCompact = /\btime\b/.test(joined) && (/\bp\b/.test(joined) || /\bp\s*\[/.test(joined)) && /(g\(i\)|h_sun|t2m|ws10m|int)/.test(joined);
    return (hasTime && hasPv) || pvgisCompact;
  }

  function findProductionHeaderRow(aoa){
    for (let r=0; r<Math.min(80, aoa.length); r++){
      if (looksLikeProductionHeader(aoa[r] || [])) return r;
    }
    return -1;
  }

  function pickProductionColumns(headers){
    const n = headers.map(norm);
    let timestamp = n.findIndex(h =>
      /^(time|timestamp|datetime)$/.test(h) ||
      /^time\b/.test(h) ||
      /time\s*\(/.test(h) ||
      /(data.?ora|data\/ora|datetime|timestamp)/.test(h)
    );
    let date = n.findIndex(h => h === "data" || /^data\b/.test(h));
    let hour = n.findIndex(h => h === "ora" || /^ora\b/.test(h) || h === "hour");
    if (timestamp < 0 && date >= 0) timestamp = date;

    let pv = -1, unit = "kWh", multiplier = 1;
    const candidates = [];

    for (let i=0; i<n.length; i++){
      const h = n[i];
      if (i === timestamp || i === date || i === hour) continue;

      let score = 0;
      if (/^(p|p_ac|pac)$/.test(h)) score += 20;
      if (/^p\s*(\[|\(|$)/.test(h)) score += 20;
      if (/(pvgis|pv|solar|fotovoltaic)/.test(h)) score += 10;
      if (/(productie|producție|produc|generation|generated|energie produsa|energia produsa|yield|produsa|energie activa produsa)/.test(h)) score += 10;
      if (/(active power|ac power|inverter power|putere activa|putere produsa|putere)/.test(h)) score += 7;
      if (/(pac|p_ac|eac)/.test(h)) score += 8;
      if (/(kwh|mwh|wh|kw|w)/.test(h)) score += 2;

      if (/(g\(i\)|gb\(i\)|gd\(i\)|gr\(i\)|ghi|dni|dhi|h_sun|t2m|ws10m|temp|temperatura|wind|int|int\.|intensity|radia|irradiance)/.test(h)) score -= 12;
      if (/(consum|import|ea\+|reactiv|kvar|tensiune|voltage|curent|current)/.test(h)) score -= 9;

      if (score > 0) candidates.push({i, score, h});
    }

    candidates.sort((a,b)=>b.score-a.score);
    if (candidates.length) pv = candidates[0].i;

    const headerText = n[pv] || "";
    if (/\bmwh\b/.test(headerText)) { unit = "MWh"; multiplier = 1000; }
    else if (/\bwh\b/.test(headerText) && !/\bkwh\b/.test(headerText)) { unit = "Wh"; multiplier = 1/1000; }
    else if (/\bkw\b/.test(headerText) && !/\bkwh\b/.test(headerText)) { unit = "kW"; multiplier = null; }
    else if ((/^p\s*(\[|\(|$)/.test(headerText) || /^(p|p_ac|pac)$/.test(headerText) || /\bw\b/.test(headerText)) && !/\bkwh\b/.test(headerText)) { unit = "W"; multiplier = null; }

    return {timestamp, date, hour, pv, unit, multiplier};
  }

  function parseProductionProfile(aoa, ctx){
    const headerRow = findProductionHeaderRow(aoa);
    if (headerRow < 0) return null;

    const headers = aoa[headerRow].map((h,i)=>String(h || `Coloana ${i+1}`).trim());
    const cols = pickProductionColumns(headers);
    if (cols.timestamp < 0 || cols.pv < 0) return null;

    const raw = [];
    for (let r=headerRow+1; r<aoa.length; r++){
      const line = aoa[r] || [];
      const d = parseDate(line[cols.timestamp], cols.hour >= 0 ? line[cols.hour] : undefined);
      if (!d || isNaN(d)) continue;
      const val = toNumber(line[cols.pv]);
      if (!Number.isFinite(val)) continue;
      raw.push({d, val, sourceRow:r+1});
    }
    if (raw.length < 2) return null;

    const diffs = [];
    for (let i=1; i<Math.min(raw.length, 200); i++){
      const minutes = Math.round((raw[i].d - raw[i-1].d)/60000);
      if (minutes > 0 && minutes <= 1440) diffs.push(minutes);
    }
    diffs.sort((a,b)=>a-b);
    const intervalMinutes = diffs[Math.floor(diffs.length/2)] || 60;
    const hours = intervalMinutes / 60;

    const rows = raw.map(x => {
      let kwh;
      if (cols.multiplier === null) {
        // PVGIS P and most inverter PAC exports are average power; convert to energy for interval.
        // If values are very high, treat as W; if small, treat as kW.
        const isProbablyW = Math.abs(x.val) > 1000 || cols.unit === "W";
        kwh = isProbablyW ? (x.val / 1000) * hours : x.val * hours;
      } else {
        kwh = x.val * cols.multiplier;
      }

      kwh = Math.max(0, kwh || 0);
      return {
        timestamp:x.d.toISOString(),
        localLabel:x.d.toLocaleString("ro-RO",{dateStyle:"short", timeStyle:"short"}),
        hour:x.d.getHours(),
        minute:x.d.getMinutes(),
        electricKwh:0,
        electricExportKwh:0,
        reactiveInductiveKvarh:0,
        reactiveCapacitiveKvarh:0,
        thermalKwh:0,
        pvKwh:kwh,
        priceRonKwh:0,
        sourceRow:x.sourceRow,
        productionOnly:true
      };
    });

    if (rows.length < 2 || !rows.some(r => r.pvKwh > 0)) return null;
    return finishDataset(rows, {...ctx, profile: /^timeseries/i.test(ctx.fileName||"") || /pvgis/.test(norm(ctx.fileName||"")) ? "pvgis_timeseries_production" : "production_timeseries_generic", unit:cols.unit, headerRow:headerRow+1});
  }

  function markEmbeddedProduction(dataset){
    if (!dataset || !dataset.rows) return dataset;
    const hasPv = dataset.rows.some(r => Number(r.pvKwh || 0) > 0);
    const hasExport = dataset.rows.some(r => Number(r.electricExportKwh || 0) > 0);
    dataset.meta = dataset.meta || {};
    dataset.meta.hasEmbeddedProduction = !!hasPv;
    dataset.meta.hasExport = !!hasExport;
    dataset.meta.productionDetectedInMainFile = !!(hasPv || hasExport);
    return dataset;
  }


  function parseInvoiceFallback(aoa, ctx){
    const text = norm(extractText(aoa,120));
    if (!/(cantfact|tipfact|pod|denclient|umf|sf\.per|inc\.per)/.test(text)) return null;
    let total=0, unit="kWh";
    for (const row of aoa){
      for (let i=0;i<row.length;i++){
        const n = toNumber(row[i]);
        if (n>0 && n<1e9) total = Math.max(total,n);
        const c = norm(row[i]);
        if (c==="mwh") unit="MWh";
      }
    }
    if (!total) return null;
    const period = inferPeriod(ctx.fileName, aoa);
    const month = period.month || 1, year = period.year || new Date().getFullYear();
    const multiplier = unit==="MWh" ? 1000 : 1;
    const daily = total*multiplier/30;
    const shape = [0.035,0.032,0.03,0.03,0.032,0.04,0.052,0.07,0.075,0.07,0.065,0.06,0.058,0.058,0.06,0.065,0.072,0.068,0.058,0.048,0.043,0.04,0.038,0.036];
    const sumShape = shape.reduce((a,b)=>a+b,0);
    const rows = shape.map((s,h)=>{
      const d = new Date(year, month-1, 1, h, 0, 0);
      return {timestamp:d.toISOString(), localLabel:d.toLocaleString("ro-RO",{dateStyle:"short",timeStyle:"short"}), hour:h, minute:0, electricKwh:daily*s/sumShape, electricExportKwh:0, reactiveInductiveKvarh:0, reactiveCapacitiveKvarh:0, thermalKwh:0, pvKwh:0, priceRonKwh:0, estimated:true};
    });
    return finishDataset(rows, {...ctx, profile:"invoice_monthly_fallback_estimated", unit, estimated:true});
  }

  function addPrices(rows, fixedPrice){
    rows.forEach(r => {
      if (!r.priceRonKwh) r.priceRonKwh = priceForHour(r.hour);
    });
  }

  function priceForHour(hour){
    return [0.31,0.30,0.29,0.28,0.29,0.34,0.42,0.88,0.92,0.85,0.72,0.55,0.48,0.50,0.52,0.60,0.72,0.89,0.91,0.82,0.70,0.58,0.45,0.36][Math.max(0,Math.min(23,Number(hour)||0))] || 0.75;
  }

  function buildDailyCurves(rows){
    const byDate = new Map();
    for (const r of rows){
      const d = new Date(r.timestamp);
      if (isNaN(d)) continue;
      const key = d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
      if (!byDate.has(key)) byDate.set(key, []);
      byDate.get(key).push(r);
    }
    const days = [...byDate.entries()].map(([date, list]) => ({
      date, rows:list.sort((a,b)=>new Date(a.timestamp)-new Date(b.timestamp)),
      energy:list.reduce((a,x)=>a+x.electricKwh,0),
      cost:list.reduce((a,x)=>a+x.electricKwh*x.priceRonKwh,0),
      peak:Math.max(...list.map(x=>x.electricKwh))
    })).sort((a,b)=>a.date.localeCompare(b.date));

    const slotMap = new Map();
    for (const r of rows){
      const slot = String(r.hour).padStart(2,"0")+":"+String(r.minute||0).padStart(2,"0");
      if (!slotMap.has(slot)) slotMap.set(slot, []);
      slotMap.get(slot).push(r);
    }
    const averageDay = [...slotMap.entries()].sort().map(([slot,list]) => {
      const [h,m]=slot.split(":").map(Number);
      const avg = f => list.reduce((a,x)=>a+(x[f]||0),0)/list.length;
      return {slot, hour:h, minute:m, electricKwh:avg("electricKwh"), thermalKwh:avg("thermalKwh"), pvKwh:avg("pvKwh"), priceRonKwh:avg("priceRonKwh"), costRon:avg("electricKwh")*avg("priceRonKwh")};
    });
    const maxEnergyDay = days.slice().sort((a,b)=>b.energy-a.energy)[0] || null;
    const maxCostDay = days.slice().sort((a,b)=>b.cost-a.cost)[0] || null;
    const maxPeakDay = days.slice().sort((a,b)=>b.peak-a.peak)[0] || null;
    return {days:days.map(d=>({date:d.date, energyKwh:d.energy, costRon:d.cost, peakKwhPerInterval:d.peak, intervals:d.rows.length})), averageDay, maxEnergyDay, maxCostDay, maxPeakDay};
  }

  function finishDataset(rows, ctx){
    rows.sort((a,b)=>new Date(a.timestamp)-new Date(b.timestamp));
    const interval = inferIntervalMinutes(rows);
    addPrices(rows, ctx.fixedPriceRonKwh || 0.75);
    const daily = buildDailyCurves(rows);
    const start = rows[0] ? rows[0].timestamp : null;
    const end = rows[rows.length-1] ? rows[rows.length-1].timestamp : null;
    return {
      meta:{
        fileName:ctx.fileName || "fișier încărcat",
        sheetName:ctx.sheetName || "",
        sourceProfile:ctx.profile,
        unit:ctx.unit || "kWh",
        intervalMinutes:interval,
        fixedPriceRonKwh:ctx.fixedPriceRonKwh || 0.75,
        contractPowerKw:ctx.contractPowerKw || 100,
        rowsCount:rows.length,
        start,
        end,
        headerRow:ctx.headerRow || null,
        estimated:!!ctx.estimated,
        parserVersion:"v32"
      },
      rows,
      daily
    };
  }

  function parseAoa(aoa, options={}){
    const cleaned = cleanAoa(aoa);
    const ctx = { fileName:options.fileName||"", sheetName:options.sheetName||"", mode:options.mode||"electric", gasFactor:options.gasFactor||10.55, fixedPriceRonKwh:options.fixedPriceRonKwh||0.75, contractPowerKw:options.contractPowerKw||100 };
    const parsers = ctx.mode === "production" ? [parseProductionProfile, parseLongTimestamp, parseSplitDateOra, parseMonthlyMatrix, parseDayHourCs] : [parseLongTimestamp, parseSplitDateOra, parseProductionProfile, parseMonthlyMatrix, parseDayHourCs, parseInvoiceFallback];
    const results = parsers.map(fn => {
      try { return fn(cleaned, ctx); } catch(e) { return null; }
    }).filter(Boolean);
    if (!results.length) throw new Error(ctx.mode === "production" ? "Nu am putut recunoaște formatul producției. Încarcă PVGIS Timeseries CSV, export inverter cu dată/oră și putere/producție, sau CSV/XLSX cu producție locală." : "Nu am putut recunoaște formatul curbei de sarcină. Încarcă CSV/XLSX cu dată/oră și consum, matrice IBD sau fișier cu consum + producție.");
    results.sort((a,b)=>b.rows.length-a.rows.length);
    return markEmbeddedProduction(results[0]);
  }

  function parseWorkbookLike(input, options={}){
    const sheets = input.sheets || [];
    const results = [];
    for (const sheet of sheets){
      try {
        results.push(parseAoa(sheet.aoa || sheet.data || [], {...options, fileName:input.fileName||options.fileName, sheetName:sheet.name||""}));
      } catch(e) {}
    }
    if (!results.length) throw new Error("Nu am putut citi nicio foaie cu date valide.");
    results.sort((a,b)=>b.rows.length-a.rows.length);
    return markEmbeddedProduction(results[0]);
  }

  function parseHtmlTables(text){
    if (typeof DOMParser === "undefined") return null;
    const doc = new DOMParser().parseFromString(text, "text/html");
    const tables = [...doc.querySelectorAll("table")];
    return tables.map((table, idx) => ({
      name:`Tabel ${idx+1}`,
      aoa:[...table.querySelectorAll("tr")].map(tr => [...tr.children].map(td => td.textContent.trim()))
    }));
  }

  async function parseFile(file, options={}){
    const name = file.name || "fisier";
    const lower = name.toLowerCase();
    if ((lower.endsWith(".xlsx") || lower.endsWith(".xls") || lower.endsWith(".xlsm")) && root.XLSX) {
      const buffer = await file.arrayBuffer();
      const wb = root.XLSX.read(buffer, {type:"array", cellDates:true, raw:false});
      const sheets = wb.SheetNames.map(sn => ({name:sn, aoa:root.XLSX.utils.sheet_to_json(wb.Sheets[sn], {header:1, defval:"", raw:false})}));
      return parseWorkbookLike({fileName:name, sheets}, options);
    }
    const text = await file.text();
    if (lower.endsWith(".htm") || lower.endsWith(".html")) {
      const tables = parseHtmlTables(text);
      if (tables && tables.length) return parseWorkbookLike({fileName:name, sheets:tables}, options);
    }
    return parseAoa(parseCsvText(text), {...options, fileName:name});
  }

  const api = { parseFile, parseAoa, parseCsvText, parseWorkbookLike, toNumber, parseDate, inferPeriod, detectUnit };
  root.SVTLoadCurveProfiles = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);