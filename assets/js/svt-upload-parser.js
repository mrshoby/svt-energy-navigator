window.SVTUploadParser = (() => {
  function toNumber(value) {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    let s = String(value).trim();
    if (!s) return 0;
    s = s.replace(/\s/g, '');
    if (s.includes(',') && s.includes('.')) {
      if (s.lastIndexOf(',') > s.lastIndexOf('.')) s = s.replace(/\./g, '').replace(',', '.');
      else s = s.replace(/,/g, '');
    } else if (s.includes(',')) s = s.replace(',', '.');
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  }

  function excelDateToJSDate(serial) {
    const utcDays = Math.floor(serial - 25569);
    const utcValue = utcDays * 86400;
    const dateInfo = new Date(utcValue * 1000);
    const fractionalDay = serial - Math.floor(serial) + 0.0000001;
    let totalSeconds = Math.floor(86400 * fractionalDay);
    const seconds = totalSeconds % 60;
    totalSeconds -= seconds;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor(totalSeconds / 60) % 60;
    return new Date(dateInfo.getFullYear(), dateInfo.getMonth(), dateInfo.getDate(), hours, minutes, seconds);
  }

  function parseDate(value) {
    if (value instanceof Date && !isNaN(value)) return value;
    if (typeof value === 'number' && value > 20000 && value < 70000) return excelDateToJSDate(value);
    let s = String(value || '').trim();
    if (!s) return null;
    if (/^\d+(\.\d+)?$/.test(s)) {
      const n = Number(s);
      if (n > 20000 && n < 70000) return excelDateToJSDate(n);
    }
    s = s.replace('T', ' ').replace(/\//g, '-');
    let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})[,\s]+(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (m) return new Date(+m[1], +m[2]-1, +m[3], +m[4], +m[5], +(m[6]||0));
    m = s.match(/^(\d{1,2})[.\-](\d{1,2})[.\-](\d{4})[,\s]+(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (m) return new Date(+m[3], +m[2]-1, +m[1], +m[4], +m[5], +(m[6]||0));
    const d = new Date(s);
    return isNaN(d) ? null : d;
  }

  function detectDelimiter(text) {
    const first = text.split(/\r?\n/).find(l => l.trim()) || '';
    const candidates = [',',';','\t','|'];
    return candidates.map(d => ({d, n:(first.match(new RegExp('\\'+d,'g'))||[]).length})).sort((a,b)=>b.n-a.n)[0].d;
  }

  function parseCSV(text) {
    const delim = detectDelimiter(text);
    const rows = [];
    let row = [], cell = '', inQuotes = false;
    for (let i=0;i<text.length;i++) {
      const ch = text[i], next = text[i+1];
      if (ch === '"' && inQuotes && next === '"') { cell += '"'; i++; continue; }
      if (ch === '"') { inQuotes = !inQuotes; continue; }
      if (ch === delim && !inQuotes) { row.push(cell); cell=''; continue; }
      if ((ch === '\n' || ch === '\r') && !inQuotes) {
        if (ch === '\r' && next === '\n') i++;
        row.push(cell); cell='';
        if (row.some(v => String(v).trim() !== '')) rows.push(row);
        row=[]; continue;
      }
      cell += ch;
    }
    if (cell || row.length) { row.push(cell); if (row.some(v => String(v).trim() !== '')) rows.push(row); }
    if (!rows.length) throw new Error('Fișierul CSV pare gol.');
    const headers = rows[0].map((h,i)=>String(h||`Coloana ${i+1}`).trim() || `Coloana ${i+1}`);
    const data = rows.slice(1).map(r => Object.fromEntries(headers.map((h,i)=>[h, r[i] ?? ''])));
    return { columns: headers, rows: data };
  }

  async function parseFile(file) {
    const name = file.name.toLowerCase();
    let parsed;
    if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
      if (!window.XLSX) throw new Error('Parserul XLSX nu este disponibil. Verifică conexiunea la internet sau folosește CSV.');
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type:'array', cellDates:true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(ws, { defval:'', raw:false });
      if (!json.length) throw new Error('Fișierul XLSX nu conține rânduri de date.');
      parsed = { columns:Object.keys(json[0]), rows:json };
    } else {
      parsed = parseCSV(await file.text());
    }
    parsed.fileName = file.name;
    parsed.detected = detectColumns(parsed);
    return parsed;
  }

  function detectColumns(parsed) {
    const cols = parsed.columns;
    const norm = c => String(c).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    const find = words => cols.find(c => words.some(w => norm(c).includes(w)));
    const timestamp = find(['timestamp','data_ora','data ora','datetime','date time','timp','ora','data']);
    const electric = find(['consum electric','electric','energie activa','kwh','consum_kwh','load','sarcina','putere']);
    const thermal = find(['termic','thermal','gaz','caldura','abur']);
    const pv = find(['pv','solar','productie','producție','fotovoltaic']);
    const price = find(['pret','preț','price','ron','tarif','pzu']);
    const interval = detectInterval(parsed.rows, timestamp);
    return { timestamp, electric, thermal, pv, price, intervalMinutes: interval.minutes, intervalLabel: interval.label };
  }

  function detectInterval(rows, timestampCol) {
    if (!timestampCol || rows.length < 2) return { minutes:null, label:'necunoscut' };
    const dates = rows.slice(0, 24).map(r=>parseDate(r[timestampCol])).filter(Boolean).sort((a,b)=>a-b);
    if (dates.length < 2) return { minutes:null, label:'necunoscut' };
    const diffs = [];
    for (let i=1;i<dates.length;i++) {
      const d = Math.round((dates[i]-dates[i-1])/60000);
      if (d > 0 && d < 1440) diffs.push(d);
    }
    if (!diffs.length) return { minutes:null, label:'necunoscut' };
    const minutes = diffs.sort((a,b)=>a-b)[Math.floor(diffs.length/2)];
    return { minutes, label: minutes === 60 ? 'orar' : `${minutes} minute` };
  }

  function normalize(raw, mapping) {
    if (!raw || !raw.rows?.length) throw new Error('Nu există date încărcate.');
    if (!mapping.timestamp) throw new Error('Alege coloana de dată/oră.');
    if (!mapping.electric) throw new Error('Alege coloana de consum electric.');

    const interval = raw.detected?.intervalMinutes || detectInterval(raw.rows, mapping.timestamp).minutes || 60;
    const rows = raw.rows.map((r, idx) => {
      const date = parseDate(r[mapping.timestamp]);
      if (!date) return null;
      let electric = toNumber(r[mapping.electric]);
      if (mapping.unitElectric === 'kw') electric = electric * (interval / 60);
      return {
        timestamp: date.toISOString(),
        localLabel: date.toLocaleString('ro-RO', { dateStyle:'short', timeStyle:'short' }),
        hour: date.getHours(),
        electricKwh: Math.max(0, electric),
        thermalKwh: mapping.thermal ? Math.max(0, toNumber(r[mapping.thermal])) : 0,
        pvKwh: mapping.pv ? Math.max(0, toNumber(r[mapping.pv])) : 0,
        priceRonKwh: mapping.price ? Math.max(0, toNumber(r[mapping.price])) : 0
      };
    }).filter(Boolean).sort((a,b)=>new Date(a.timestamp)-new Date(b.timestamp));

    if (rows.length < 2) throw new Error('Nu s-au putut citi suficiente rânduri valide cu dată/oră.');
    const fixedPrice = Number(mapping.fixedPrice || 0.75);
    rows.forEach(x => { if (!x.priceRonKwh) x.priceRonKwh = fixedPrice > 0 ? fixedPrice : SVTPriceProfiles.priceForHour(x.hour); });

    return {
      meta: {
        fileName: raw.fileName || 'date_client',
        intervalMinutes: interval,
        fixedPriceRonKwh: Number(mapping.fixedPrice || 0.75),
        contractPowerKw: Number(mapping.contractPower || 250),
        generatedAt: new Date().toISOString()
      },
      rows
    };
  }

  return { parseFile, parseCSV, normalize, toNumber, parseDate };
})();
