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
  const LEARNED_MODELS_KEY = "svtEnergyImportModels";
  const LEARNED_MODELS_VERSION = 2;
  const LEARNED_MODELS_LIMIT = 50;
  const SERVIO_LEARNING_KEYS = [
    "servio.dataLearning.v442","servio.dataLearning.v441","servio.dataLearning.v440","servio.dataLearning.v439",
    "servio.dataLearning.v438","servio.dataLearning.v437","servio.dataLearning.v436","servio.dataLearning.v435",
    "servio.dataLearning.v434","servio.dataLearning.v433","servio.dataLearning.v432","servio.dataLearning.v431",
    "servio.dataLearning.v430"
  ];

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
      const first = +m[1], second = +m[2];
      const dmy = first > 12 && second <= 12;
      const d = dmy
        ? new Date(+m[3], second-1, first, hh, +(m[5]||0), +(m[6]||0))
        : new Date(+m[3], first-1, second, hh, +(m[5]||0), +(m[6]||0));
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
    if (/(gcal|gigacal)/.test(text)) return {unit:"Gcal", multiplier:1163};
    if (/(gigajoule|\bgj\b)/.test(text)) return {unit:"GJ", multiplier:277.7777778};
    if (/(megajoule|\bmj\b)/.test(text)) return {unit:"MJ", multiplier:0.2777778};
    if (/(m3|m³|\bmc\b|metri cubi|\bgaz\b)/.test(text) && /(termic|thermal|\bgaz\b|caldura|căldură|pcs)/.test(text)) return {unit:"m3 gaz", multiplier:10.55};
    if (/\bmwh\b/.test(text)) return {unit:"MWh", multiplier:1000};
    if (/\bwh\b/.test(text) && !/\bkwh\b/.test(text)) return {unit:"Wh", multiplier:1/1000};
    return {unit:"kWh", multiplier:1};
  }

  function clamp(value, min=0, max=1){
    return Math.max(min, Math.min(max, Number(value) || 0));
  }

  function dayKeyFromDate(date){
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d)) return "";
    return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
  }

  function sameRoleScore(header, samples, patterns, sampleTest){
    const h = norm(header);
    let score = 0;
    for (const [re, points] of patterns) if (re.test(h)) score += points;
    if (sampleTest) {
      const useful = (samples || []).filter(v => String(v ?? "").trim() !== "");
      if (useful.length) {
        const hits = useful.filter(sampleTest).length;
        score += Math.min(12, (hits / useful.length) * 12);
      }
    }
    return score;
  }

  const FLEX_ROLE_PATTERNS = {
    timestamp:[
      [/(data.?ora|ora.?data|timestamp|datetime|date.?time|data\/ora|interval|perioada|time stamp)/, 30],
      [/^(time|date_time|datetime)$/i, 18]
    ],
    date:[
      [/^(data|date|zi|day|referinta|data referinta|data citire|reading date)$/, 25],
      [/\b(data|date|zi|day)\b/, 12]
    ],
    time:[
      [/^(ora|hour|time|interval|de la|pana la|până la|start|end)$/, 22],
      [/\b(ora|hour|time|interval|de la|pana|start|end)\b/, 10]
    ],
    consumption:[
      [/(consum|consumption|energie consumata|energie activa consumata|active energy|ea\+|sarcina|load|cs mas|absorbt|absorbit|preluat|preluata|delivered|wh_delivered|energie preluata)/, 34],
      [/(import|grid import|from grid|retea|rețea)/, 24],
      [/\bkwh\b/, 8]
    ],
    production:[
      [/(productie|producție|production|produced|generated|generation|pv|solar|fotovoltaic|invertor|inverter|energie produsa|energia produsa|yield|pac|p_ac|\beac\b)/, 34],
      [/^(p|power|putere)\b/, 14]
    ],
    importEnergy:[
      [/(import|grid import|energie importata|energie preluata|absorbt|absorbit|ea\+|delivered|wh_delivered|din retea|din rețea|purchase|purchased|grid purchase|cumparata|cumpărată|achizitionata|achiziționată)/, 32]
    ],
    exportEnergy:[
      [/(export|grid export|injectie|injecție|injected|injectata|injectată|ea\-|received|wh_received|energie livrata|energie livrată|in retea|în rețea|feed.?in|feedin|grid feed)/, 32]
    ],
    cost:[
      [/(cost|valoare|lei|ron|total|suma|sumă|facturat|facturata|facturată|value|amount)/, 26]
    ],
    tariff:[
      [/(tarif|pret|preț|price|lei\/kwh|ron\/kwh|tariff|unit price|pret unitar|preț unitar)/, 30]
    ],
    unit:[
      [/^(unitate|unit|um|u\.m\.|umf|uom)$/, 26],
      [/\b(kwh|mwh|wh|gcal|gj|mj|m3|m³|mc|kw|w)\b/, 10]
    ]
  };

  function looksLikeFooterRow(row){
    const text = norm((row || []).join(" "));
    if (!text) return true;
    if (/^(total|subtotal|sumar|medie|average|nota|note|observatii|observații|legendă|legenda)\b/.test(text)) return true;
    if (/\b(total general|subtotal|pagina|page|cod loc consum|pod|client|furnizor|distribuitor)\b/.test(text) && !/\b(data|ora|kwh|mwh|consum|productie|import|export)\b/.test(text)) return true;
    return false;
  }

  function isNumberish(value){
    if (value === null || value === undefined || value === "") return false;
    if (typeof value === "number") return Number.isFinite(value);
    const s = String(value).trim();
    if (!s) return false;
    const cleaned = s.replace(/\s/g,"").replace(/[^\d,.\-+Ee]/g,"");
    return /[-+]?\d/.test(cleaned) && Number.isFinite(toNumber(s));
  }

  function looksLikeDateSample(value){
    if (value instanceof Date && !isNaN(value)) return true;
    if (typeof value === "number") return value > 20000 && value < 90000;
    const s = String(value ?? "").trim();
    if (!s) return false;
    if (/^\d{4}\d{2}\d{2}\s*[:_\-]?\s*\d{2}\d{2}/.test(s)) return true;
    if (/^\d{1,2}[.\-\/]\d{1,2}[.\-\/]\d{2,4}/.test(s)) return true;
    if (/^\d{4}[.\-\/]\d{1,2}[.\-\/]\d{1,2}/.test(s)) return true;
    if (/[T@]\d{1,2}[:.]\d{2}/.test(s)) return true;
    return false;
  }

  function sampleColumn(aoa, headerRow, col, limit=45){
    const samples = [];
    for (let r=headerRow+1; r<aoa.length && samples.length<limit; r++){
      const v = aoa[r]?.[col];
      if (String(v ?? "").trim() !== "") samples.push(v);
    }
    return samples;
  }

  function classifyFlexibleColumn(header, samples, ctx){
    const roles = {};
    for (const [role, patterns] of Object.entries(FLEX_ROLE_PATTERNS)){
      const sampleTest = role === "timestamp" || role === "date"
        ? v => looksLikeDateSample(v) && !!parseDate(v)
        : role === "time"
          ? v => /(\d{1,2})[:.](\d{2})/.test(String(v ?? "")) || (Number(v) >= 0 && Number(v) < 1)
          : role === "cost" || role === "tariff" || role === "consumption" || role === "production" || role === "importEnergy" || role === "exportEnergy"
            ? v => isNumberish(v)
            : null;
      roles[role] = sameRoleScore(header, samples, patterns, sampleTest);
    }

    const h = norm(header);
    const numericRatio = samples.length ? samples.filter(isNumberish).length / samples.length : 0;
    if (numericRatio > 0.65) {
      roles.consumption += 5;
      roles.production += 3;
      roles.cost += 3;
      roles.tariff += 2;
    }
    if (/(reactiv|reactive|kvar|tensiune|voltage|curent|current|soc|temperatura|temperature|wind|ghi|dni|dhi|g\(i\)|h_sun|t2m|ws10m|irradiance|radiatie|radiație)/.test(h)) {
      roles.consumption = Math.min(roles.consumption - 25, -50);
      roles.production = Math.min(roles.production - 25, -50);
      roles.importEnergy = Math.min(roles.importEnergy - 25, -50);
      roles.exportEnergy = Math.min(roles.exportEnergy - 25, -50);
    }
    if (ctx.mode === "production") {
      roles.production += 10;
      roles.consumption -= 8;
      roles.importEnergy -= 8;
    }
    if (ctx.mode === "thermal" || /(termic|thermal|\bgaz\b|caldura|căldură|abur|gcal|m3|m³|\bmc\b)/.test(h)) {
      roles.consumption += 12;
      if (/(energy|energie|cantitate|quantity|heat|caldura|thermal|termic|gcal|\bgj\b|\bmj\b|\bmwh\b|\bkwh\b)/.test(h)) roles.consumption += 14;
      roles.production -= 12;
    }

    const entries = Object.entries(roles).sort((a,b)=>b[1]-a[1]);
    return {role:entries[0]?.[0] || null, score:entries[0]?.[1] || 0, roles};
  }

  function scoreFlexibleHeaderRow(aoa, rowIndex, ctx){
    const row = aoa[rowIndex] || [];
    const nonEmpty = row.filter(c => String(c ?? "").trim() !== "").length;
    if (nonEmpty < 2) return {score:0};
    let score = 0;
    const roleBest = {};
    for (let c=0; c<row.length; c++){
      const header = String(row[c] || `Coloana ${c+1}`).trim() || `Coloana ${c+1}`;
      const samples = sampleColumn(aoa, rowIndex, c);
      const cls = classifyFlexibleColumn(header, samples, ctx);
      if (!roleBest[cls.role] || cls.score > roleBest[cls.role]) roleBest[cls.role] = cls.score;
      if (cls.score > 16) score += Math.min(20, cls.score / 2);
    }
    if ((roleBest.timestamp || roleBest.date) && (roleBest.consumption || roleBest.production || roleBest.importEnergy || roleBest.exportEnergy)) score += 35;
    if (roleBest.date && roleBest.time) score += 18;
    if (roleBest.cost || roleBest.tariff) score += 6;
    const dataRows = Math.min(35, Math.max(0, aoa.length - rowIndex - 1));
    let usefulRows = 0;
    for (let r=rowIndex+1; r<aoa.length && r<rowIndex+1+dataRows; r++){
      const line = aoa[r] || [];
      if (line.some(v => looksLikeDateSample(v) && parseDate(v)) && line.some(isNumberish)) usefulRows++;
    }
    score += usefulRows * 1.5;
    return {score, roleBest};
  }

  function findFlexibleHeaderRow(aoa, ctx){
    let best = {idx:-1, score:0};
    for (let r=0; r<Math.min(100, aoa.length); r++){
      const s = scoreFlexibleHeaderRow(aoa, r, ctx).score;
      if (s > best.score) best = {idx:r, score:s};
    }
    if (best.score >= 45) return best;

    // Headerless exports: first column is a timestamp/date, another column is numeric.
    const probeRows = aoa.slice(0, Math.min(40, aoa.length));
    const maxCols = Math.max(0, ...probeRows.map(r => (r || []).length));
    for (let c=0; c<maxCols; c++){
      const dateHits = probeRows.filter(r => looksLikeDateSample(r?.[c]) && parseDate(r?.[c])).length;
      if (dateHits >= 3) {
        for (let n=0; n<maxCols; n++){
          if (n === c) continue;
          const numericHits = probeRows.filter(r => isNumberish(r?.[n])).length;
          if (numericHits >= 3) return {idx:-1, score:42, headerless:{timestamp:c, value:n}};
        }
      }
    }
    return {idx:-1, score:0};
  }

  function unitInfoFromText(text, ctx){
    const h = norm(text);
    if (/(gcal|gigacal)/.test(h)) return {unit:"Gcal", factor:1163, power:false};
    if (/(gigajoule|\bgj\b)/.test(h)) return {unit:"GJ", factor:277.7777778, power:false};
    if (/(megajoule|\bmj\b)/.test(h)) return {unit:"MJ", factor:0.2777778, power:false};
    if (/(m3|m³|\bmc\b|metri cubi|\bgaz\b)/.test(h)) return {unit:"m3 gaz", factor:ctx.gasFactor || 10.55, power:false};
    if (/\bmwh\b/.test(h)) return {unit:"MWh", factor:1000, power:false};
    if (/\bkwh\b/.test(h)) return {unit:"kWh", factor:1, power:false};
    if (/\bwh\b/.test(h)) return {unit:"Wh", factor:1/1000, power:false};
    if (/\bkw\b/.test(h) && !/\bkwh\b/.test(h)) return {unit:"kW", factor:1, power:true};
    if (/(^|\W)w($|\W)/.test(h) && !/\bwh\b/.test(h)) return {unit:"W", factor:1/1000, power:true};
    if ((ctx.mode === "production" || /(pvgis|invertor|inverter|solar|pv)/.test(h)) && (/^(p|pac|p_ac|power|putere)$/.test(h) || /^p\s*(\[|\(|$)/.test(h))) return {unit:"W", factor:1/1000, power:true};
    return {unit:"kWh", factor:1, power:false};
  }

  function unitInfoForColumn(header, rowUnitValue, ctx){
    const explicit = unitInfoFromText(String(rowUnitValue || ""), ctx);
    if (rowUnitValue && explicit.unit !== "kWh") return explicit;
    if (ctx.manualUnit) return unitInfoFromText(ctx.manualUnit, ctx);
    return unitInfoFromText(header, ctx);
  }

  function detectSourceModel(fileName, aoa, headers=[]){
    const text = norm((fileName||"") + " " + headers.join(" ") + " " + extractText(aoa, 40));
    if (/pvgis/.test(text)) return {source:"pvgis", model:"PVGIS"};
    if (/(huawei|solis|fronius|sma|sungrow|growatt|solaredge|victron|invertor|inverter)/.test(text)) return {source:"inverter", model:"invertor"};
    if (/(deer|retele electrice|rețele electrice|delgaz|oltenia|distributie|distribuție|distribuitor)/.test(text)) return {source:"distributor", model:"distribuitor"};
    if (/(furnizor|factura|facturare|pod|cod loc consum|client|valoare facturata|valoare facturată)/.test(text)) return {source:"supplier", model:"furnizor"};
    if (/(ibd|curba de sarcina|curbă de sarcină|cs mas)/.test(text)) return {source:"ibd", model:"IBD"};
    return {source:"unknown", model:"generic_energy_table"};
  }

  function sourceFileType(fileName){
    const ext = String(fileName || "").toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] || "unknown";
    if (/^xls/.test(ext)) return "excel";
    if (ext === "csv" || ext === "txt") return "csv";
    if (ext === "html" || ext === "htm") return "html";
    return ext;
  }

  function fileSignatureForAoa(aoa, ctx, headers=[]){
    const keywords = headers.map(norm).filter(Boolean).slice(0, 40);
    return {
      extension: sourceFileType(ctx.fileName),
      sheetNames: ctx.sheetName ? [ctx.sheetName] : [],
      headerKeywords: keywords,
      columnCount: headers.length,
      dateFormat:null
    };
  }

  function roleCoverage(mapping){
    const m = mapping || {};
    const has = v => v !== null && v !== undefined && v !== "" && v !== -1;
    return {
      hasTime: has(m.timestamp) || has(m.date),
      hasEnergy: has(m.consumption) || has(m.production) || has(m.importEnergy) || has(m.exportEnergy),
      hasTariff: has(m.tariff),
      hasCost: has(m.cost),
      hasUnit: has(m.unit)
    };
  }

  function normalizeLearnedModel(model){
    if (!model || !model.modelId || !model.columnMapping) return null;
    return {
      schemaVersion:Number(model.schemaVersion || 1),
      modelId:String(model.modelId),
      modelName:String(model.modelName || "model import"),
      source:String(model.source || "manual"),
      fileSignature:model.fileSignature || {},
      columnMapping:model.columnMapping || {},
      unitConversion:model.unitConversion || {from:"kWh", to:"kWh", factor:1},
      confidence:clamp(Number(model.confidence || 0.82)),
      createdAt:model.createdAt || new Date().toISOString(),
      lastUsedAt:model.lastUsedAt || model.createdAt || new Date().toISOString(),
      lastTrainedAt:model.lastTrainedAt || model.createdAt || new Date().toISOString(),
      usageCount:Number(model.usageCount || 0),
      sampleCount:Number(model.sampleCount || 0),
      parserVersion:model.parserVersion || "v75-flexible-import",
      roleCoverage:model.roleCoverage || roleCoverage(model.columnMapping)
    };
  }

  function servioRoleToSvtRole(role){
    return ({
      timestamp:"timestamp",
      date:"date",
      time:"time",
      consumption:"consumption",
      consumptionKwh:"consumption",
      loadKwh:"consumption",
      production:"production",
      productionKwh:"production",
      generationKwh:"production",
      import:"importEnergy",
      importKwh:"importEnergy",
      importEnergy:"importEnergy",
      export:"exportEnergy",
      exportKwh:"exportEnergy",
      exportEnergy:"exportEnergy",
      cost:"cost",
      costRon:"cost",
      tariff:"tariff",
      tariffRonKwh:"tariff",
      unit:"unit"
    })[role] || role;
  }

  function normalizeServioColumnMap(columnMap){
    const out = {};
    Object.entries(columnMap || {}).forEach(([role, value]) => {
      if (value === null || value === undefined || value === "") return;
      const svtRole = servioRoleToSvtRole(role);
      if (!["timestamp","date","time","consumption","production","importEnergy","exportEnergy","cost","tariff","unit"].includes(svtRole)) return;
      out[svtRole] = value;
    });
    return out;
  }

  function normalizeServioLearningFile(entry, key, index){
    const template = entry?.importTemplate || entry?.template || entry || {};
    const columnMap = normalizeServioColumnMap(template.columnMap || entry?.columnMap || entry?.mappingDraft?.columnMap || {});
    if (!roleCoverage(columnMap).hasTime || !roleCoverage(columnMap).hasEnergy) return null;
    const confidenceRaw = Number(template.averageConfidence || entry?.confidence || entry?.mappingConfidence || 82);
    const confidence = confidenceRaw > 1 ? confidenceRaw / 100 : confidenceRaw;
    const headerSignature = template.fingerprint?.headerSignature || (entry?.previewRows || []).slice(0,3).join(" | ");
    const headerKeywords = String(headerSignature || "")
      .split(/[^A-Za-z0-9ăâîșşțţĂÂÎȘŞȚŢ]+/)
      .map(x => x.trim())
      .filter(x => x.length >= 2)
      .slice(0, 24);
    return normalizeLearnedModel({
      modelId:`servio:${template.id || entry?.id || key + ":" + index}`,
      modelName:template.name || entry?.templateName || entry?.fileName || "Servio Data Learning",
      source:"servio-data-learning",
      fileSignature:{
        extension:template.fileType || entry?.fileType || "",
        columnCount:null,
        headerKeywords
      },
      columnMapping:columnMap,
      unitConversion:{
        from:template.parsingRules?.unit || entry?.unitProfile?.unit || "kWh",
        to:"kWh",
        factor:1
      },
      confidence:clamp(confidence || 0.82),
      createdAt:template.createdAt || entry?.createdAt || new Date().toISOString(),
      lastUsedAt:template.lastUsedAt || entry?.lastUsedAt || template.updatedAt || new Date().toISOString(),
      lastTrainedAt:template.updatedAt || entry?.updatedAt || template.createdAt || new Date().toISOString(),
      usageCount:Number(template.usageCount || entry?.usageCount || 0),
      sampleCount:Number(template.consumptionRules?.sampleCount || template.productionRules?.sampleCount || entry?.consumptionProfile?.sampleCount || entry?.productionProfile?.sampleCount || 0),
      parserVersion:"servio-v442-data-learning-bridge"
    });
  }

  function readServioLearningModelsPayload(){
    try {
      if (typeof localStorage === "undefined") return [];
      const all = [];
      SERVIO_LEARNING_KEYS.forEach(key => {
        let parsed = [];
        try { parsed = JSON.parse(localStorage.getItem(key) || "[]"); } catch(e) { parsed = []; }
        if (!Array.isArray(parsed)) return;
        parsed.forEach((entry, index) => {
          const model = normalizeServioLearningFile(entry, key, index);
          if (model) all.push(model);
        });
      });
      const byId = new Map();
      all.forEach(model => {
        if (!byId.has(model.modelId)) byId.set(model.modelId, model);
      });
      return [...byId.values()];
    } catch(e) {
      return [];
    }
  }

  function mergeLearnedModels(ownModels, externalModels){
    const byId = new Map();
    [...(ownModels || []), ...(externalModels || [])].forEach(model => {
      if (!model?.modelId) return;
      if (!byId.has(model.modelId)) byId.set(model.modelId, model);
    });
    return [...byId.values()].slice(0, LEARNED_MODELS_LIMIT);
  }

  function readLearnedModelsPayload(){
    try {
      if (typeof localStorage === "undefined") return [];
      const parsed = JSON.parse(localStorage.getItem(LEARNED_MODELS_KEY) || "[]");
      const list = Array.isArray(parsed) ? parsed : (Array.isArray(parsed?.models) ? parsed.models : []);
      return mergeLearnedModels(list.map(normalizeLearnedModel).filter(Boolean), readServioLearningModelsPayload());
    } catch(e) { return []; }
  }

  function writeLearnedModelsPayload(models){
    try {
      if (typeof localStorage === "undefined") return;
      const clean = (models || []).map(normalizeLearnedModel).filter(Boolean).slice(0, LEARNED_MODELS_LIMIT);
      localStorage.setItem(LEARNED_MODELS_KEY, JSON.stringify({
        version:LEARNED_MODELS_VERSION,
        updatedAt:new Date().toISOString(),
        models:clean
      }));
    } catch(e) {}
  }

  function getLearnedModels(){
    return readLearnedModelsPayload();
  }

  function saveLearnedModel(model){
    try {
      if (typeof localStorage === "undefined" || !model) return;
      const now = new Date().toISOString();
      const incoming = normalizeLearnedModel({
        ...model,
        schemaVersion:LEARNED_MODELS_VERSION,
        lastTrainedAt:now,
        lastUsedAt:now
      });
      if (!incoming) return;
      const existingModels = getLearnedModels();
      const existing = existingModels.find(m => m.modelId === incoming.modelId);
      const merged = {
        ...existing,
        ...incoming,
        createdAt:existing?.createdAt || incoming.createdAt || now,
        usageCount:Number(existing?.usageCount || 0),
        sampleCount:Math.max(Number(existing?.sampleCount || 0), Number(incoming.sampleCount || 0))
      };
      const models = existingModels.filter(m => m.modelId !== incoming.modelId);
      models.unshift(merged);
      writeLearnedModelsPayload(models);
    } catch(e) {}
  }

  function touchLearnedModel(model, details={}){
    try {
      if (typeof localStorage === "undefined" || !model?.modelId) return;
      const models = getLearnedModels();
      const idx = models.findIndex(m => m.modelId === model.modelId);
      if (idx < 0) return;
      models[idx] = {
        ...models[idx],
        usageCount:Number(models[idx].usageCount || 0) + 1,
        lastUsedAt:new Date().toISOString(),
        lastMatchScore:Number(details.matchScore || model.matchScore || models[idx].lastMatchScore || 0),
        lastFileName:details.fileName || models[idx].lastFileName || ""
      };
      writeLearnedModelsPayload(models);
    } catch(e) {}
  }

  function forgetLearnedModel(modelId){
    const models = getLearnedModels().filter(m => m.modelId !== modelId);
    writeLearnedModelsPayload(models);
    return models;
  }

  function clearLearnedModels(){
    writeLearnedModelsPayload([]);
    return [];
  }

  function importLearnedModels(payload){
    const incoming = Array.isArray(payload) ? payload : (Array.isArray(payload?.models) ? payload.models : []);
    const byId = new Map(getLearnedModels().map(m => [m.modelId, m]));
    incoming.map(normalizeLearnedModel).filter(Boolean).forEach(model => {
      const existing = byId.get(model.modelId);
      byId.set(model.modelId, {
        ...existing,
        ...model,
        createdAt:existing?.createdAt || model.createdAt,
        usageCount:Math.max(Number(existing?.usageCount || 0), Number(model.usageCount || 0))
      });
    });
    const models = [...byId.values()]
      .sort((a,b)=>String(b.lastUsedAt || b.lastTrainedAt || "").localeCompare(String(a.lastUsedAt || a.lastTrainedAt || "")))
      .slice(0, LEARNED_MODELS_LIMIT);
    writeLearnedModelsPayload(models);
    return models;
  }

  function exportLearnedModels(){
    return {version:LEARNED_MODELS_VERSION, exportedAt:new Date().toISOString(), models:getLearnedModels()};
  }

  function learnedModelSimilarity(signature, model){
    const sigWords = new Set((signature.headerKeywords || []).map(norm));
    const modelWords = new Set(((model.fileSignature || {}).headerKeywords || []).map(norm));
    const overlap = [...sigWords].filter(w => modelWords.has(w)).length;
    const colScore = signature.columnCount && model.fileSignature?.columnCount === signature.columnCount ? 0.25 : 0;
    const extScore = signature.extension && model.fileSignature?.extension === signature.extension ? 0.25 : 0;
    const keywordScore = Math.min(0.5, overlap / Math.max(1, Math.min(sigWords.size, modelWords.size)) * 0.5);
    return extScore + colScore + keywordScore;
  }

  function applyLearnedModelIfUseful(signature){
    const candidate = getLearnedModels()
      .map(model => ({model, score:learnedModelSimilarity(signature, model)}))
      .sort((a,b)=>b.score-a.score)[0];
    return candidate && candidate.score >= 0.75 ? {...candidate.model, matchScore:candidate.score} : null;
  }

  function mappingToIndexMap(headers, mapping){
    const n = headers.map(norm);
    const idx = {};
    for (const [role, name] of Object.entries(mapping || {})){
      if (name === null || name === undefined || name === "") { idx[role] = -1; continue; }
      if (typeof name === "number") { idx[role] = name; continue; }
      idx[role] = n.findIndex(h => h === norm(name));
    }
    return idx;
  }

  function learnedMappingIsUsable(mapping){
    const hasTime = mapping.timestamp >= 0 || mapping.date >= 0;
    const hasEnergy = mapping.consumption >= 0 || mapping.production >= 0 || mapping.importEnergy >= 0 || mapping.exportEnergy >= 0;
    return hasTime && hasEnergy;
  }

  function detectFlexibleMapping(aoa, ctx){
    if (ctx.manualMapping) {
      const manual = ctx.manualMapping || {};
      const guessed = findFlexibleHeaderRow(aoa, ctx);
      const manualHeaderRow = Number.isFinite(Number(manual.headerRow)) ? Number(manual.headerRow) : (guessed.idx >= 0 ? guessed.idx : 0);
      const headerRow = Math.max(0, Math.min(aoa.length - 1, manualHeaderRow));
      const headers = (aoa[headerRow] || []).map((h,i)=>String(h || `Coloana ${i+1}`).trim() || `Coloana ${i+1}`);
      const mapping = mappingToIndexMap(headers, manual.columnMapping || manual.mapping || manual);
      ["timestamp","date","time","consumption","production","importEnergy","exportEnergy","cost","tariff","unit"].forEach(role => {
        if (!Number.isFinite(mapping[role])) mapping[role] = -1;
      });
      if (manual.unit) ctx.manualUnit = manual.unit;
      return {
        headerRow,
        headers,
        mapping,
        confidence:0.82,
        source:"manual",
        signature:fileSignatureForAoa(aoa, ctx, headers)
      };
    }

    const headerInfo = findFlexibleHeaderRow(aoa, ctx);
    if (headerInfo.headerless) {
      return {
        headerRow:-1,
        headers:aoa[0].map((_,i)=>`Coloana ${i+1}`),
        mapping:{timestamp:headerInfo.headerless.timestamp, consumption:ctx.mode === "production" ? -1 : headerInfo.headerless.value, production:ctx.mode === "production" ? headerInfo.headerless.value : -1},
        confidence:0.56,
        source:"manual_or_headerless",
        signature:fileSignatureForAoa(aoa, ctx, aoa[0] || [])
      };
    }
    if (headerInfo.idx < 0) return null;
    const headerRow = headerInfo.idx;
    const headers = (aoa[headerRow] || []).map((h,i)=>String(h || `Coloana ${i+1}`).trim() || `Coloana ${i+1}`);
    const signature = fileSignatureForAoa(aoa, ctx, headers);
    const learned = applyLearnedModelIfUseful(signature);
    if (learned?.columnMapping) {
      const learnedMapping = mappingToIndexMap(headers, learned.columnMapping);
      if (!learnedMappingIsUsable(learnedMapping)) {
        learned.rejectedReason = "column_mapping_not_found";
      } else {
        touchLearnedModel(learned, {matchScore:learned.matchScore, fileName:ctx.fileName});
        return {
          headerRow,
          headers,
          mapping:learnedMapping,
          confidence:Math.max(0.82, Number(learned.confidence || 0.82)),
          source:"learned",
          learnedSource:learned.source || "manual",
          learnedModel:learned,
          signature
        };
      }
    }

    const candidates = {};
    headers.forEach((header, i) => {
      const cls = classifyFlexibleColumn(header, sampleColumn(aoa, headerRow, i), ctx);
      for (const [role, score] of Object.entries(cls.roles)) {
        if (score > 12 && (!candidates[role] || score > candidates[role].score)) candidates[role] = {idx:i, score, header};
      }
    });

    const mapping = {
      timestamp:candidates.timestamp?.idx ?? -1,
      date:candidates.date?.idx ?? -1,
      time:candidates.time?.idx ?? -1,
      consumption:candidates.consumption?.idx ?? -1,
      production:candidates.production?.idx ?? -1,
      importEnergy:candidates.importEnergy?.idx ?? -1,
      exportEnergy:candidates.exportEnergy?.idx ?? -1,
      cost:candidates.cost?.idx ?? -1,
      tariff:candidates.tariff?.idx ?? -1,
      unit:candidates.unit?.idx ?? -1
    };

    const timeColumns = new Set([mapping.timestamp, mapping.date, mapping.time].filter(idx => idx >= 0));
    ["consumption","production","importEnergy","exportEnergy","cost","tariff","unit"].forEach(role => {
      if (timeColumns.has(mapping[role])) mapping[role] = -1;
    });
    const energyColumns = new Set(["consumption","production","importEnergy","exportEnergy"].map(role => mapping[role]).filter(idx => idx >= 0));
    ["cost","tariff","unit"].forEach(role => {
      if (energyColumns.has(mapping[role])) mapping[role] = -1;
    });
    if (mapping.cost >= 0 && mapping.tariff === mapping.cost) {
      const h = norm(headers[mapping.cost]);
      if (/(tarif|pret|preț|price|lei\/kwh|ron\/kwh)/.test(h)) mapping.cost = -1;
      else mapping.tariff = -1;
    }
    if (mapping.cost < 0) {
      mapping.cost = headers.findIndex((h, i) =>
        !timeColumns.has(i) &&
        !energyColumns.has(i) &&
        /(cost|valoare|lei|ron|total|suma|sumă|facturat|facturata|facturată|value|amount)/.test(norm(h)) &&
        sampleColumn(aoa, headerRow, i, 12).some(isNumberish)
      );
    }
    if (mapping.tariff < 0) {
      mapping.tariff = headers.findIndex((h, i) =>
        !timeColumns.has(i) &&
        !energyColumns.has(i) &&
        i !== mapping.cost &&
        /(tarif|pret|preț|price|lei\/kwh|ron\/kwh|tariff|unit price|pret unitar|preț unitar)/.test(norm(h)) &&
        sampleColumn(aoa, headerRow, i, 12).some(isNumberish)
      );
    }

    if (mapping.timestamp < 0 && mapping.date < 0) return null;
    const energyRoles = ["consumption","production","importEnergy","exportEnergy"].filter(role => mapping[role] >= 0);
    if (!energyRoles.length) return null;
    if (ctx.mode === "production" && mapping.production < 0 && mapping.consumption >= 0) {
      mapping.production = mapping.consumption;
      mapping.consumption = -1;
    }
    const dateConfidence = mapping.timestamp >= 0 ? 0.28 : ((mapping.date >= 0 && mapping.time >= 0) ? 0.24 : 0.16);
    const energyConfidence = Math.min(0.42, energyRoles.reduce((sum, role)=>sum + Math.min(0.16, (candidates[role]?.score || 0) / 220), 0.18));
    const extrasConfidence = (mapping.cost >= 0 || mapping.tariff >= 0 ? 0.06 : 0) + (mapping.unit >= 0 ? 0.04 : 0);
    const confidence = clamp(0.2 + dateConfidence + energyConfidence + extrasConfidence + Math.min(0.1, headerInfo.score/700));
    return {headerRow, headers, mapping, confidence, source:"auto", signature};
  }

  function parseFlexibleDate(line, mapping, lastDate){
    let d = null;
    if (mapping.timestamp >= 0) d = parseDate(line[mapping.timestamp]);
    if ((!d || isNaN(d)) && mapping.date >= 0) {
      d = parseDate(line[mapping.date], mapping.time >= 0 ? line[mapping.time] : undefined);
    }
    if ((!d || isNaN(d)) && lastDate && mapping.time >= 0) {
      d = parseDate(lastDate, line[mapping.time]);
    }
    if ((!d || isNaN(d))) {
      for (const cell of line) {
        if (!looksLikeDateSample(cell)) continue;
        d = parseDate(cell);
        if (d && !isNaN(d)) break;
      }
    }
    return d && !isNaN(d) ? d : null;
  }

  function convertFlexibleKwh(rawValue, header, rowUnit, ctx, intervalHours, warnings, role){
    if (rawValue === null || rawValue === undefined || rawValue === "") return null;
    let value = toNumber(rawValue);
    if (!Number.isFinite(value) || value === 0) return null;
    const unit = unitInfoForColumn(header, rowUnit, ctx);
    let kwh = unit.power ? value * unit.factor * intervalHours : value * unit.factor;
    if (!Number.isFinite(kwh) || kwh === 0) return null;
    let negative = false;
    if (kwh < 0) {
      warnings.negativeValues = true;
      negative = true;
      kwh = Math.abs(kwh);
    }
    return {kwh, unit, negative, role};
  }

  function addFlexibleValue(target, role, rawValue, header, rowUnit, ctx, intervalHours, warnings){
    const converted = convertFlexibleKwh(rawValue, header, rowUnit, ctx, intervalHours, warnings, role);
    if (!converted) return;
    let {kwh, unit} = converted;
    if (converted.negative) {
      if (role === "consumption" || role === "importEnergy") {
        role = "exportEnergy";
      }
    }
    const sourceType = ctx.mode === "thermal" || /(termic|thermal|\bgaz\b|caldura|căldură|abur|gcal|m3|m³|\bmc\b)/.test(norm(header + " " + (rowUnit || ""))) ? "thermal" : "electric";
    target.originalUnit = target.originalUnit || unit.unit;
    target.originalColumn = target.originalColumn || header;
    if (role === "production") target.pvKwh += Math.max(0, kwh);
    else if (role === "exportEnergy") target.electricExportKwh += Math.max(0, kwh);
    else if (sourceType === "thermal") target.thermalKwh += Math.max(0, kwh);
    else target.electricKwh += Math.max(0, kwh);
    if (role === "importEnergy") target.flowType = "grid_import";
    else if (role === "exportEnergy") target.flowType = "grid_export";
    else if (role === "production") target.flowType = "production";
    else if (sourceType === "thermal") target.flowType = "consumption";
  }

  function parseFlexibleTable(aoa, ctx){
    const detection = detectFlexibleMapping(aoa, ctx);
    if (!detection) return null;
    const {headerRow, headers, mapping} = detection;
    const startRow = headerRow >= 0 ? headerRow + 1 : 0;
    const rawRows = [];
    let lastDateValue = null;
    const warnings = {};
    const sourceModel = detectSourceModel(ctx.fileName, aoa, headers);
    const sourceTypeDefault = ctx.mode === "thermal" ? "thermal" : "electric";

    for (let r=startRow; r<aoa.length; r++){
      const line = aoa[r] || [];
      if (looksLikeFooterRow(line)) continue;
      const d = parseFlexibleDate(line, mapping, lastDateValue);
      if (!d) continue;
      if (mapping.date >= 0 && String(line[mapping.date] ?? "").trim()) lastDateValue = line[mapping.date];
      rawRows.push({line, d, sourceRow:r+1});
    }
    if (rawRows.length < 2) return null;

    const diffs = [];
    for (let i=1; i<Math.min(rawRows.length, 240); i++){
      const minutes = Math.round((rawRows[i].d - rawRows[i-1].d)/60000);
      if (minutes > 0 && minutes <= 1440) diffs.push(minutes);
    }
    const shortDiffs = diffs.filter(d => d <= 180);
    const pool = shortDiffs.length ? shortDiffs : diffs;
    const counts = new Map();
    pool.forEach(d => counts.set(d, (counts.get(d) || 0) + 1));
    const intervalMinutes = [...counts.entries()].sort((a,b)=>b[1]-a[1] || a[0]-b[0])[0]?.[0] || 60;
    const intervalHours = Math.max(1/60, intervalMinutes / 60);
    const rows = [];

    for (const item of rawRows){
      const line = item.line;
      const rec = {
        timestamp:item.d.toISOString(),
        localLabel:item.d.toLocaleString("ro-RO",{dateStyle:"short", timeStyle:"short"}),
        hour:item.d.getHours(),
        minute:item.d.getMinutes(),
        electricKwh:0,
        gridImportKwh:0,
        electricExportKwh:0,
        reactiveInductiveKvarh:0,
        reactiveCapacitiveKvarh:0,
        thermalKwh:0,
        pvKwh:0,
        priceRonKwh:0,
        costRon:null,
        tariffRonKwh:null,
        sourceRow:item.sourceRow,
        originalUnit:null,
        originalColumn:null,
        flowType:ctx.mode === "production" ? "production" : "consumption",
        sourceType:sourceTypeDefault
      };
      const rowUnit = mapping.unit >= 0 ? line[mapping.unit] : "";
      if (mapping.importEnergy >= 0) {
        if (mapping.consumption >= 0 && mapping.consumption !== mapping.importEnergy) {
          const convertedImport = convertFlexibleKwh(line[mapping.importEnergy], headers[mapping.importEnergy], rowUnit, ctx, intervalHours, warnings, "importEnergy");
          if (convertedImport) {
            rec.gridImportKwh += Math.max(0, convertedImport.kwh);
            rec.originalUnit = rec.originalUnit || convertedImport.unit.unit;
          }
        } else {
          addFlexibleValue(rec, "importEnergy", line[mapping.importEnergy], headers[mapping.importEnergy], rowUnit, ctx, intervalHours, warnings);
        }
      }
      if (mapping.consumption >= 0 && mapping.consumption !== mapping.importEnergy) addFlexibleValue(rec, "consumption", line[mapping.consumption], headers[mapping.consumption], rowUnit, ctx, intervalHours, warnings);
      if (mapping.production >= 0) addFlexibleValue(rec, "production", line[mapping.production], headers[mapping.production], rowUnit, ctx, intervalHours, warnings);
      if (mapping.exportEnergy >= 0 && mapping.exportEnergy !== mapping.production) addFlexibleValue(rec, "exportEnergy", line[mapping.exportEnergy], headers[mapping.exportEnergy], rowUnit, ctx, intervalHours, warnings);
      if (mapping.tariff >= 0) {
        const t = toNumber(line[mapping.tariff]);
        if (t > 0 && t < 20) {
          rec.priceRonKwh = t;
          rec.tariffRonKwh = t;
        }
      }
      if (mapping.cost >= 0) {
        const cost = toNumber(line[mapping.cost]);
        if (cost > 0) rec.costRon = cost;
      }
      const energy = rec.electricKwh || rec.thermalKwh || rec.pvKwh || rec.electricExportKwh;
      if (!rec.priceRonKwh && rec.costRon > 0 && energy > 0) rec.priceRonKwh = rec.costRon / energy;
      if (rec.thermalKwh > 0) rec.sourceType = "thermal";
      if (energy > 0) rows.push(rec);
    }

    if (rows.length < 2) return null;
    const confidence = Math.max(detection.confidence || 0.55, rows.length >= 24 ? 0.68 : 0.56);
    let learnedModelSaved = false;
    if (confidence >= 0.72 && (detection.source === "auto" || detection.source === "manual")) {
      const columnMapping = {};
      for (const [role, idx] of Object.entries(mapping)) columnMapping[role] = idx >= 0 ? headers[idx] : null;
      saveLearnedModel({
        modelId:`svt-${sourceModel.source}-${sourceFileType(ctx.fileName)}-${headers.length}-${norm(headers.join("|")).slice(0,60)}`,
        modelName:`${sourceModel.model} - ${ctx.fileName || "model import"}`,
        source:detection.source === "manual" || sourceModel.source === "unknown" ? "manual" : sourceModel.source,
        fileSignature:detection.signature,
        columnMapping,
        unitConversion:{from:rows[0]?.originalUnit || "kWh", to:"kWh", factor:unitInfoFromText(rows[0]?.originalUnit || "kWh", ctx).factor || 1},
        confidence,
        sampleCount:rows.length,
        roleCoverage:roleCoverage(columnMapping),
        parserVersion:"v75-flexible-import",
        createdAt:new Date().toISOString(),
        lastUsedAt:new Date().toISOString()
      });
      learnedModelSaved = true;
    }

    const friendlyWarnings = [];
    if (warnings.negativeValues) friendlyWarnings.push("Am găsit valori negative și le-am tratat ca energie livrată în rețea acolo unde avea sens.");
    if (intervalMinutes === 15) friendlyWarnings.push("sub_hourly_15_minute_data");
    return finishDataset(rows, {
      ...ctx,
      profile:detection.learnedModel ? "learned_energy_table" : "flexible_energy_table",
      unit:rows[0]?.originalUnit || detectUnit(ctx.fileName, aoa, headers).unit,
      headerRow:headerRow >= 0 ? headerRow+1 : null,
      confidence,
      sourceFileType:sourceFileType(ctx.fileName),
      sourceModel:sourceModel.model,
      sourceCategory:sourceModel.source,
      columnMapping:mapping,
      detectedHeaders:headers,
      detectionSource:detection.source,
      learnedSource:detection.learnedSource || null,
      learningApplied:!!detection.learnedModel,
      learningStatus:detection.learnedModel ? "applied" : (learnedModelSaved ? "trained" : "auto_detected"),
      learnedModelId:detection.learnedModel?.modelId || null,
      learnedModelName:detection.learnedModel?.modelName || null,
      learnedModelMatchScore:detection.learnedModel?.matchScore || null,
      learnedModelUsageCount:detection.learnedModel?.usageCount || null,
      roleCoverage:roleCoverage(Object.fromEntries(Object.entries(mapping).map(([role, idx]) => [role, idx >= 0 ? headers[idx] : null]))),
      warnings:friendlyWarnings
    });
  }

  function inferIntervalMinutes(rows){
    const dates = rows.map(r => new Date(r.timestamp)).filter(d => !isNaN(d)).sort((a,b)=>a-b).slice(0,200);
    const diffs = [];
    for (let i=1;i<dates.length;i++){
      const d = Math.round((dates[i]-dates[i-1])/60000);
      if (d > 0 && d < 1440) diffs.push(d);
    }
    if (!diffs.length) return 60;
    const shortDiffs = diffs.filter(d => d <= 180);
    const pool = shortDiffs.length ? shortDiffs : diffs;
    const counts = new Map();
    pool.forEach(d => counts.set(d, (counts.get(d) || 0) + 1));
    const mode = [...counts.entries()].sort((a,b)=>b[1]-a[1] || a[0]-b[0])[0]?.[0];
    if (mode) return mode;
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
    let electric = -1, gridImportIdx=-1, exportIdx=-1, reactiveInd=-1, reactiveCap=-1, thermal=-1, pv=-1, price=-1;
    for (let i=0; i<nheaders.length; i++){
      const h = nheaders[i];
      if (i === timestamp) continue;
      if (/(termic|thermal|\bgaz\b|caldura|abur|m3|gcal|\bgj\b|\bmj\b)/.test(h)) { if (thermal<0) thermal=i; continue; }
      if (/(pv|solar|fotovoltaic|productie)/.test(h)) { if (pv<0) pv=i; continue; }
      if (/(pret|price|ron|tarif|pzu)/.test(h)) { if (price<0) price=i; continue; }
      if (/(er\+|reactiva consumata|kvarh del|kvarh import|kvarh consum)/.test(h)) { if (reactiveInd<0) reactiveInd=i; continue; }
      if (/(er\-|supracompensata|kvarh rec|kvarh export)/.test(h)) { if (reactiveCap<0) reactiveCap=i; continue; }
      if (/(ea\-|energie activa export|export|injectie|injecție|injectata|injectată|kwh rec)/.test(h)) { if (exportIdx<0) exportIdx=i; continue; }
      if (/(grid import|import|purchase|purchased|cumparata|cumpărată|achizitionata|achiziționată|energie activa import)/.test(h)) { if (gridImportIdx<0) gridImportIdx=i; }
      if (/(ea\+|energie activa import|energie activa consumata|kwh del|wh_delivered|delivered|consum|kwh|sarcina|putere)/.test(h) && !/(index|indec|reactiv|kvar|export|rec)/.test(h)) {
        if (electric < 0) electric = i;
      }
    }
    return {timestamp, electric, gridImportIdx, exportIdx, reactiveInd, reactiveCap, thermal, pv, price};
  }

  function parseLongTimestamp(aoa, ctx){
    const headerRow = findLongHeaderRow(aoa);
    if (headerRow < 0) return null;
    const headers = aoa[headerRow].map((h,i)=>String(h || `Coloana ${i+1}`).trim());
    const cols = pickLongColumns(headers);
    if (cols.timestamp < 0 || (cols.electric < 0 && cols.thermal < 0)) return null;
    const unit = detectUnit(ctx.fileName, aoa, headers);
    const thermalUnit = cols.thermal >= 0 ? unitInfoFromText(headers[cols.thermal], ctx) : null;
    const rows = [];
    for (let r=headerRow+1; r<aoa.length; r++){
      const line = aoa[r] || [];
      const d = parseDate(line[cols.timestamp]);
      if (!d || isNaN(d)) continue;
      const electric = cols.electric >= 0 ? toNumber(line[cols.electric]) * unit.multiplier : 0;
      const rec = {
        timestamp:d.toISOString(),
        localLabel:d.toLocaleString("ro-RO", {dateStyle:"short", timeStyle:"short"}),
        hour:d.getHours(),
        minute:d.getMinutes(),
        electricKwh:Math.max(0,electric),
        gridImportKwh:cols.gridImportIdx>=0 && cols.gridImportIdx !== cols.electric ? Math.max(0,toNumber(line[cols.gridImportIdx])*unit.multiplier) : 0,
        electricExportKwh:cols.exportIdx>=0 ? Math.max(0,toNumber(line[cols.exportIdx])*unit.multiplier) : 0,
        reactiveInductiveKvarh:cols.reactiveInd>=0 ? Math.max(0,toNumber(line[cols.reactiveInd])) : 0,
        reactiveCapacitiveKvarh:cols.reactiveCap>=0 ? Math.max(0,toNumber(line[cols.reactiveCap])) : 0,
        thermalKwh:cols.thermal>=0 ? Math.max(0,toNumber(line[cols.thermal]) * (thermalUnit?.factor || unit.multiplier || 1)) : 0,
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
    const shortDiffs = diffs.filter(d => d <= 180);
    const pool = shortDiffs.length ? shortDiffs : diffs;
    const counts = new Map();
    pool.forEach(d => counts.set(d, (counts.get(d) || 0) + 1));
    const intervalMinutes = [...counts.entries()].sort((a,b)=>b[1]-a[1] || a[0]-b[0])[0]?.[0] || 60;
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
    const fallbackPrice = Number(fixedPrice);
    rows.forEach(r => {
      if (!r.priceRonKwh) r.priceRonKwh = fallbackPrice > 0 ? fallbackPrice : priceForHour(r.hour);
    });
  }

  function priceForHour(hour){
    return [0.31,0.30,0.29,0.28,0.29,0.34,0.42,0.88,0.92,0.85,0.72,0.55,0.48,0.50,0.52,0.60,0.72,0.89,0.91,0.82,0.70,0.58,0.45,0.36][Math.max(0,Math.min(23,Number(hour)||0))] || 0.75;
  }

  function rowMainEnergy(r){
    const electric = Number(r.electricKwh || 0);
    if (electric > 0) return electric;
    const thermal = Number(r.thermalKwh || 0);
    if (thermal > 0) return thermal;
    const pv = Number(r.pvKwh || 0);
    if (pv > 0) return pv;
    return Number(r.electricExportKwh || 0) || 0;
  }

  function buildDailyCurves(rows){
    const byDate = new Map();
    for (const r of rows){
      const d = new Date(r.timestamp);
      if (isNaN(d)) continue;
      const key = dayKeyFromDate(d);
      if (!byDate.has(key)) byDate.set(key, []);
      byDate.get(key).push(r);
    }
    const days = [...byDate.entries()].map(([date, list]) => ({
      date, rows:list.sort((a,b)=>new Date(a.timestamp)-new Date(b.timestamp)),
      energy:list.reduce((a,x)=>a+rowMainEnergy(x),0),
      electricEnergy:list.reduce((a,x)=>a+Number(x.electricKwh || 0),0),
      thermalEnergy:list.reduce((a,x)=>a+Number(x.thermalKwh || 0),0),
      productionEnergy:list.reduce((a,x)=>a+Number(x.pvKwh || 0),0),
      exportEnergy:list.reduce((a,x)=>a+Number(x.electricExportKwh || 0),0),
      cost:list.reduce((a,x)=>a+(Number(x.costRon || 0) || rowMainEnergy(x)*Number(x.priceRonKwh || 0)),0),
      peak:Math.max(...list.map(rowMainEnergy))
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
    const monthlyMap = new Map();
    const yearlyMap = new Map();
    for (const d of days){
      const monthKey = d.date.slice(0,7);
      const yearKey = d.date.slice(0,4);
      const month = monthlyMap.get(monthKey) || {month:monthKey, energyKwh:0, electricKwh:0, thermalKwh:0, productionKwh:0, exportKwh:0, costRon:0, days:0, peakKwhPerInterval:0};
      const year = yearlyMap.get(yearKey) || {year:yearKey, energyKwh:0, electricKwh:0, thermalKwh:0, productionKwh:0, exportKwh:0, costRon:0, days:0, peakKwhPerInterval:0};
      for (const bucket of [month, year]){
        bucket.energyKwh += d.energy;
        bucket.electricKwh += d.electricEnergy;
        bucket.thermalKwh += d.thermalEnergy;
        bucket.productionKwh += d.productionEnergy;
        bucket.exportKwh += d.exportEnergy;
        bucket.costRon += d.cost;
        bucket.days += 1;
        bucket.peakKwhPerInterval = Math.max(bucket.peakKwhPerInterval, d.peak);
      }
      monthlyMap.set(monthKey, month);
      yearlyMap.set(yearKey, year);
    }
    return {
      days:days.map(d=>({date:d.date, energyKwh:d.energy, electricKwh:d.electricEnergy, thermalKwh:d.thermalEnergy, productionKwh:d.productionEnergy, exportKwh:d.exportEnergy, costRon:d.cost, peakKwhPerInterval:d.peak, intervals:d.rows.length})),
      averageDay,
      maxEnergyDay,
      maxCostDay,
      maxPeakDay,
      monthlySummary:[...monthlyMap.values()],
      yearlySummary:[...yearlyMap.values()]
    };
  }

  function resolutionLabel(interval, rows){
    if (!rows || !rows.length) return "necunoscută";
    if (interval <= 16) return "15 minute";
    if (interval <= 35) return "30 minute";
    if (interval <= 75) return "orară";
    if (interval >= 1300) return "zilnică";
    return `${interval} minute`;
  }

  function periodKind(start, end){
    if (!start || !end) return "necunoscută";
    const days = Math.max(1, Math.round((new Date(end) - new Date(start)) / 86400000) + 1);
    if (days <= 1) return "o zi";
    if (days <= 45) return "mai multe zile / lună";
    if (days <= 370) return "perioadă lungă / an";
    return "mai mult de un an";
  }

  function chooseDefaultDay(daily){
    if (!daily?.days?.length) return {key:null, reason:""};
    if (daily.maxCostDay && Number(daily.maxCostDay.cost || 0) > 0) return {key:daily.maxCostDay.date, reason:"ziua cu costul cel mai mare"};
    if (daily.maxEnergyDay) return {key:daily.maxEnergyDay.date, reason:"ziua cu consumul cel mai mare"};
    if (daily.maxPeakDay) return {key:daily.maxPeakDay.date, reason:"ziua cu vârful cel mai mare"};
    return {key:daily.days[0].date, reason:"prima zi din fișier"};
  }

  function makeHourlyDay(rows, dayKey){
    const hours = Array.from({length:24}, (_,hour)=>({hour, electricKwh:0, thermalKwh:0, pvKwh:0, gridExportKwh:0, costRon:0, intervals:0}));
    for (const r of rows){
      if (r.dayKey !== dayKey) continue;
      const h = Math.max(0, Math.min(23, Number(r.hour) || 0));
      hours[h].electricKwh += Number(r.electricKwh || 0);
      hours[h].thermalKwh += Number(r.thermalKwh || 0);
      hours[h].pvKwh += Number(r.pvKwh || 0);
      hours[h].gridExportKwh += Number(r.electricExportKwh || 0);
      hours[h].costRon += Number(r.costRon || 0) || Number(r.electricKwh || r.thermalKwh || 0) * Number(r.priceRonKwh || 0);
      hours[h].intervals += 1;
    }
    return hours;
  }

  function makeNormalizedRows(rows, ctx, interval){
    const normalized = [];
    const confidence = clamp(ctx.confidence ?? 0.74);
    const sourceFileTypeValue = ctx.sourceFileType || sourceFileType(ctx.fileName);
    const sourceModelValue = ctx.sourceModel || ctx.profile || "generic_energy_table";
    for (const r of rows){
      const d = new Date(r.timestamp);
      if (isNaN(d)) continue;
      const base = {
        timestamp:r.timestamp,
        costRon:r.costRon ?? null,
        tariffRonKwh:r.tariffRonKwh ?? r.priceRonKwh ?? null,
        dayKey:r.dayKey || dayKeyFromDate(d),
        hour:d.getHours(),
        originalUnit:r.originalUnit || ctx.unit || null,
        originalColumn:r.originalColumn || null,
        confidence,
        sourceFileType:sourceFileTypeValue,
        sourceModel:sourceModelValue,
        intervalMinutes:interval
      };
      if (Number(r.electricKwh || 0) > 0) normalized.push({...base, energyKwh:Number(r.electricKwh || 0), sourceType:"electric", flowType:r.flowType === "grid_import" ? "grid_import" : "consumption"});
      if (Number(r.gridImportKwh || 0) > 0) normalized.push({...base, energyKwh:Number(r.gridImportKwh || 0), sourceType:"electric", flowType:"grid_import"});
      if (Number(r.thermalKwh || 0) > 0) normalized.push({...base, energyKwh:Number(r.thermalKwh || 0), sourceType:"thermal", flowType:"consumption"});
      if (Number(r.pvKwh || 0) > 0) normalized.push({...base, energyKwh:Number(r.pvKwh || 0), sourceType:"electric", flowType:"production"});
      if (Number(r.electricExportKwh || 0) > 0) normalized.push({...base, energyKwh:Number(r.electricExportKwh || 0), sourceType:"electric", flowType:"grid_export"});
    }
    return normalized;
  }

  function finishDataset(rows, ctx){
    rows.sort((a,b)=>new Date(a.timestamp)-new Date(b.timestamp));
    const interval = inferIntervalMinutes(rows);
    addPrices(rows, ctx.fixedPriceRonKwh || 0.75);
    rows.forEach(r => {
      const d = new Date(r.timestamp);
      if (!isNaN(d)) {
        r.dayKey = dayKeyFromDate(d);
        r.hour = d.getHours();
        r.minute = d.getMinutes();
      }
      if (r.costRon == null && Number(r.electricKwh || r.thermalKwh || 0) > 0 && Number(r.priceRonKwh || 0) > 0) {
        r.costRon = Number(r.electricKwh || r.thermalKwh || 0) * Number(r.priceRonKwh || 0);
      }
      if (r.tariffRonKwh == null && Number(r.priceRonKwh || 0) > 0) r.tariffRonKwh = Number(r.priceRonKwh || 0);
    });
    const daily = buildDailyCurves(rows);
    const start = rows[0] ? rows[0].timestamp : null;
    const end = rows[rows.length-1] ? rows[rows.length-1].timestamp : null;
    const defaultDay = chooseDefaultDay(daily);
    const normalizedRows = makeNormalizedRows(rows, ctx, interval);
    const sourceModelValue = ctx.sourceModel || ctx.profile || "generic_energy_table";
    const confidence = clamp(ctx.confidence ?? (ctx.estimated ? 0.45 : 0.82));
    daily.defaultDayKey = defaultDay.key;
    daily.defaultDayReason = defaultDay.reason;
    daily.defaultHourlyDay = defaultDay.key ? makeHourlyDay(rows, defaultDay.key) : [];
    return {
      meta:{
        fileName:ctx.fileName || "fișier încărcat",
        sheetName:ctx.sheetName || "",
        sourceProfile:ctx.profile,
        sourceModel:sourceModelValue,
        sourceCategory:ctx.sourceCategory || detectSourceModel(ctx.fileName, [], []).source,
        sourceFileType:ctx.sourceFileType || sourceFileType(ctx.fileName),
        unit:ctx.unit || "kWh",
        intervalMinutes:interval,
        resolutionLabel:resolutionLabel(interval, rows),
        fixedPriceRonKwh:ctx.fixedPriceRonKwh || 0.75,
        contractPowerKw:ctx.contractPowerKw || 100,
        rowsCount:rows.length,
        start,
        end,
        periodKind:periodKind(start, end),
        dayCount:daily.days.length,
        defaultDayKey:defaultDay.key,
        defaultDayReason:defaultDay.reason,
        confidence,
        confidencePercent:Math.round(confidence * 100),
        columnMapping:ctx.columnMapping || null,
        detectedHeaders:ctx.detectedHeaders || null,
        detectionSource:ctx.detectionSource || null,
        learnedSource:ctx.learnedSource || null,
        learningApplied:!!ctx.learningApplied,
        learningStatus:ctx.learningStatus || (ctx.manualMapping ? "trained" : "auto_detected"),
        learnedModelId:ctx.learnedModelId || null,
        learnedModelName:ctx.learnedModelName || null,
        learnedModelMatchScore:ctx.learnedModelMatchScore || null,
        learnedModelUsageCount:ctx.learnedModelUsageCount || null,
        roleCoverage:ctx.roleCoverage || null,
        warnings:ctx.warnings || [],
        normalizedRowsCount:normalizedRows.length,
        normalizedSchema:"svt-energy-series-v1",
        headerRow:ctx.headerRow || null,
        estimated:!!ctx.estimated,
        parserVersion:"v76-data-learning-complete"
      },
      rows,
      normalizedRows,
      daily
    };
  }

  function datasetChoiceScore(ds){
    if (!ds || !ds.rows) return -Infinity;
    const normalizedCount = ds.normalizedRows?.length || 0;
    const totalEnergy = ds.rows.reduce((sum, r) => sum + rowMainEnergy(r) + Number(r.gridImportKwh || 0) + Number(r.pvKwh || 0) + Number(r.electricExportKwh || 0), 0);
    const profile = ds.meta?.sourceProfile || "";
    const dedicatedProfileBonus = /monthly_matrix|day_hour|long_timestamp|split_data_ora/.test(profile) ? 250 : 0;
    const learnedBonus = profile === "learned_energy_table" ? 450 : 0;
    const confidence = Number(ds.meta?.confidence || 0.6);
    return normalizedCount * 8 + Math.min(300, totalEnergy > 0 ? Math.log10(totalEnergy + 1) * 40 : 0) + dedicatedProfileBonus + learnedBonus + confidence * 100;
  }

  function parseAoa(aoa, options={}){
    const cleaned = cleanAoa(aoa);
    const ctx = { fileName:options.fileName||"", sheetName:options.sheetName||"", mode:options.mode||"electric", gasFactor:options.gasFactor||10.55, fixedPriceRonKwh:options.fixedPriceRonKwh||0.75, contractPowerKw:options.contractPowerKw||100, manualMapping:options.manualMapping||null, manualUnit:options.manualUnit||options.unit||null };
    const parsers = ctx.manualMapping
      ? [parseFlexibleTable]
      : ctx.mode === "production"
        ? [parseProductionProfile, parseFlexibleTable, parseLongTimestamp, parseSplitDateOra, parseMonthlyMatrix, parseDayHourCs]
        : ctx.mode === "thermal"
          ? [parseFlexibleTable, parseLongTimestamp, parseSplitDateOra, parseMonthlyMatrix, parseDayHourCs, parseInvoiceFallback]
        : [parseLongTimestamp, parseSplitDateOra, parseMonthlyMatrix, parseDayHourCs, parseFlexibleTable, parseProductionProfile, parseInvoiceFallback];
    const results = parsers.map(fn => {
      try { return fn(cleaned, ctx); } catch(e) { return null; }
    }).filter(ds => ds && (ds.normalizedRows?.length || ds.rows?.some(rowMainEnergy)));
    if (!results.length) {
      const err = new Error(ctx.mode === "production" ? "Nu am putut interpreta automat fișierul cu energia produsă. Încarcă un fișier cu dată, oră și energie produsă sau confirmă coloanele dacă apar întrebări de mapare." : "Nu am putut interpreta automat fișierul. Caută coloane precum dată, oră, consum, producție, cost sau kWh; dacă fișierul are altă structură, confirmă manual coloanele.");
      err.needsMapping = true;
      throw err;
    }
    results.sort((a,b)=>datasetChoiceScore(b)-datasetChoiceScore(a));
    return markEmbeddedProduction(results[0]);
  }

  function parseWorkbookLike(input, options={}){
    const sheets = input.sheets || [];
    const results = [];
    const errors = [];
    for (const sheet of sheets){
      try {
        results.push(parseAoa(sheet.aoa || sheet.data || [], {...options, fileName:input.fileName||options.fileName, sheetName:sheet.name||""}));
      } catch(e) { errors.push({sheet:sheet.name || "", message:e.message || String(e)}); }
    }
    if (!results.length) {
      const err = new Error("Nu am putut interpreta automat foile din fișier. Poți încărca fișierul așa cum este; aplicația va încerca maparea simplă a coloanelor: data, ora, consumul/producția și unitatea.");
      err.needsMapping = true;
      err.sheetErrors = errors;
      throw err;
    }
    results.sort((a,b)=>datasetChoiceScore(b)-datasetChoiceScore(a));
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

  async function fileToSheets(file){
    const name = file.name || "fisier";
    const lower = name.toLowerCase();
    if ((lower.endsWith(".xlsx") || lower.endsWith(".xls") || lower.endsWith(".xlsm")) && root.XLSX) {
      const buffer = await file.arrayBuffer();
      const wb = root.XLSX.read(buffer, {type:"array", cellDates:true, raw:false});
      return wb.SheetNames.map(sn => ({name:sn, aoa:root.XLSX.utils.sheet_to_json(wb.Sheets[sn], {header:1, defval:"", raw:false})}));
    }
    const text = await file.text();
    if (lower.endsWith(".htm") || lower.endsWith(".html")) {
      const tables = parseHtmlTables(text);
      if (tables && tables.length) return tables;
    }
    return [{name:"Fișier", aoa:parseCsvText(text)}];
  }

  function inspectAoa(aoa, options={}){
    const cleaned = cleanAoa(aoa);
    const ctx = { fileName:options.fileName||"", sheetName:options.sheetName||"", mode:options.mode||"electric", gasFactor:options.gasFactor||10.55, fixedPriceRonKwh:options.fixedPriceRonKwh||0.75, contractPowerKw:options.contractPowerKw||100 };
    const detection = detectFlexibleMapping(cleaned, ctx);
    const fallback = detection || (() => {
      const info = findFlexibleHeaderRow(cleaned, ctx);
      const headerRow = info.idx >= 0 ? info.idx : 0;
      const headers = (cleaned[headerRow] || []).map((h,i)=>String(h || `Coloana ${i+1}`).trim() || `Coloana ${i+1}`);
      return {headerRow, headers, mapping:{}, confidence:0.25, source:"manual_needed"};
    })();
    const columns = (fallback.headers || []).map((label, index) => ({index, label}));
    const previewRows = cleaned.slice(Math.max(0, (fallback.headerRow || 0) + 1), Math.max(0, (fallback.headerRow || 0) + 6));
    return {
      fileName:options.fileName || "",
      sheetName:options.sheetName || "",
      headerRow:fallback.headerRow >= 0 ? fallback.headerRow : 0,
      columns,
      detectedMapping:fallback.mapping || {},
      confidence:clamp(fallback.confidence || 0),
      source:fallback.source || "manual_needed",
      previewRows
    };
  }

  async function inspectFile(file, options={}){
    const name = file.name || "fisier";
    const sheets = await fileToSheets(file);
    return {
      fileName:name,
      sourceFileType:sourceFileType(name),
      sheets:sheets.map(sheet => inspectAoa(sheet.aoa || [], {...options, fileName:name, sheetName:sheet.name || ""}))
    };
  }

  async function parseFile(file, options={}){
    const name = file.name || "fisier";
    const sheets = await fileToSheets(file);
    if (sheets.length > 1 || (sheets[0] && sheets[0].name !== "Fișier")) return parseWorkbookLike({fileName:name, sheets}, options);
    return parseAoa(sheets[0]?.aoa || [], {...options, fileName:name, sheetName:sheets[0]?.name || ""});
  }

  async function parseFileWithMapping(file, mapping, options={}){
    const name = file.name || "fisier";
    const sheets = await fileToSheets(file);
    const sheetName = mapping?.sheetName || mapping?.sheet || "";
    const selected = sheets.find(s => s.name === sheetName) || sheets[0];
    return parseAoa(selected?.aoa || [], {...options, fileName:name, sheetName:selected?.name || "", manualMapping:mapping, manualUnit:mapping?.unit || options.unit || null});
  }

  const api = {
    parseFile,
    parseFileWithMapping,
    inspectFile,
    inspectAoa,
    parseAoa,
    parseCsvText,
    parseWorkbookLike,
    toNumber,
    parseDate,
    inferPeriod,
    detectUnit,
    sourceFileType,
    getLearnedModels,
    exportLearnedModels,
    importLearnedModels,
    forgetLearnedModel,
    clearLearnedModels
  };
  root.SVTLoadCurveProfiles = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
