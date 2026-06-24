
    const allQuestions = [
      {id:1, icon:'📈', title:'Când consum din rețea energie scumpă?', groups:['electric'], active:true},
      {id:2, icon:'☀️', title:'Când nu valorific optim energia produsă local?', groups:['electric','pv']},
      {id:3, icon:'🌤️', title:'Cât va produce estimativ sistemul meu în următoarele 24 ore?', groups:['electric','pv','forecast']},
      {id:4, icon:'➕', title:'Câtă energie ar mai putea fi produsă local?', groups:['electric','pv','site']},
      {id:5, icon:'🔁', title:'Cât din energia suplimentar produsă ar fi utilizabilă util?', groups:['electric','pv']},
      {id:6, icon:'⏱️', title:'Ce consumuri aș putea muta în timp pentru că procesul tehnologic permite?', groups:['electric','thermal','flex']},
      {id:7, icon:'🔋', title:'Ce economie aș obține cu BESS, pompă de căldură, boiler, puffer sau cogenerare?', groups:['electric','thermal','investment']},
      {id:8, icon:'📊', title:'Ce economie aș obține astăzi pe consumurile reale dacă aș avea tarif dinamic PZU?', groups:['electric','pzu']},
      {id:9, icon:'🏗️', title:'Cât m-ar costa o investiție integrată care reduce costurile electrice și termice?', groups:['electric','thermal','investment']},
      {id:10, icon:'🎯', title:'Ce ar trebui să fac mâine pentru a reduce costul?', groups:['electric','thermal','forecast']}
    ];
    let activeCharts = {};

    function getContext(){
      try { return JSON.parse(sessionStorage.getItem('svtNavigatorContext') || localStorage.getItem('svtNavigatorContext') || '{}'); }
      catch(e){ return {}; }
    }
    function getAnalysis(){
      try { return JSON.parse(sessionStorage.getItem('svtAnalysis') || '{}'); }
      catch(e){ return {}; }
    }

    function getDataset(){
      try { return JSON.parse(sessionStorage.getItem('svtDataset') || '{}'); }
      catch(e){ return {}; }
    }
    function getActiveDataFingerprint(){
      const ctx = getContext();
      const analysis = getAnalysis();
      const dataset = getDataset();
      return ctx.dataFingerprint || analysis?.meta?.dataFingerprint || dataset?.meta?.dataFingerprint || '';
    }
    function resetDerivedResultsIfDataChanged(){
      const fp = getActiveDataFingerprint();
      if(!fp) return;
      const prev = sessionStorage.getItem('svtActiveDataFingerprint');
      if(prev && prev !== fp){
        ['svtForecastQ3','svtPotentialQ4','svtUsefulEnergyQ5','svtFlexibleLoadsQ6'].forEach(k => {
          try{ sessionStorage.removeItem(k); }catch(e){}
        });
      }
      sessionStorage.setItem('svtActiveDataFingerprint', fp);
    }
    function getConsumptionDataSource(){
      const ctx = getContext();
      const analysis = getAnalysis();
      const dataset = getDataset();
      return ctx.consumptionDataSource || analysis?.meta?.consumptionDataSource || dataset?.meta?.consumptionDataSource || 'total';
    }
    function sourceWarningHtml(question){
      const source = getConsumptionDataSource();
      if(source === 'total') return '';
      const text = source === 'grid'
        ? 'Fișierul încărcat pare să fie consum din rețea/import, nu consum total. Rezultatele sunt estimative dacă există deja producție locală, deoarece autoconsumul existent nu apare complet în import.'
        : 'Tipul curbei de consum nu este sigur. Rezultatele sunt tratate ca estimare și trebuie validate cu date din contor/invertor.';
      return `<div class="svt-source-warning"><strong>Notă de interpretare ${question ? '· ' + esc(question) : ''}:</strong> ${esc(text)}</div>`;
    }


    function relevantQuestions(ctx){
      const mode = ctx.selectedMode || 'electric';
      if(mode === 'termic') return allQuestions.filter(q => q.groups.includes('thermal'));
      return allQuestions.filter(q => q.groups.includes('electric'));
    }
    function displayNumber(i){ return String(i + 1).padStart(2,'0'); }
    function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));}
    function fmt(v,d=2){return (Number(v)||0).toLocaleString('ro-RO',{maximumFractionDigits:d,minimumFractionDigits:d});}

    function render(){
      const ctx = getContext();
      const mode = ctx.selectedMode || 'electric';
      const analysis = getAnalysis();
      const questions = relevantQuestions(ctx);
      const grid = document.getElementById('questions');

      const modeLabel = mode === 'termic' ? 'Termic' : 'Electric';
      const dataLabel = mode === 'termic'
        ? (ctx.thermal?.annualValue ? `Consum termic: ${ctx.thermal.annualValue} ${ctx.thermal.unit || ''}` : 'Date termice de bază')
        : (ctx.hasHourlyFile ? 'Curba orară încărcată' : ctx.hasInvoiceOnly ? 'Factură lunară / estimare' : 'Date electrice');
      const prodLabel = ctx.hasProduction ? 'Producție locală inclusă' : 'Fără producție locală';

      grid.innerHTML = questions.map((q, idx) => {
        const hasPvData = !!(ctx.hasProduction || analysis?.meta?.hasProduction || (analysis?.chartRows || []).some(r => Number(r.productionKwh || 0) > 0));
        const q3Stored = !!sessionStorage.getItem('svtForecastQ3');
        const q4Stored = !!sessionStorage.getItem('svtPotentialQ4');
        const q5Stored = !!sessionStorage.getItem('svtUsefulEnergyQ5');
        const q6Stored = !!sessionStorage.getItem('svtFlexibleLoadsQ6');
        const isAvailable = mode === 'electric' && analysis?.chartRows?.length && (q.id === 1 || q.id === 2 || q.id === 3 || q.id === 4 || q.id === 5 || q.id === 6);
        const needsData = mode === 'electric' && analysis?.chartRows?.length && ((q.id === 2 && !hasPvData) || (q.id === 3 && !q3Stored) || (q.id === 4 && !q4Stored) || (q.id === 5 && !q5Stored) || (q.id === 6 && !q6Stored));
        const isActive = isAvailable;
        return `
          <div class="q-item" data-q-item="${q.id}">
            <button class="q-card ${q.title.length > 92 ? 'is-xlong' : q.title.length > 64 ? 'is-long' : ''} ${needsData ? 'needs-data' : isActive ? 'available' : 'soon'}" type="button" data-q="${q.id}" ${isActive ? '' : 'disabled'}>
              <span class="q-no">${displayNumber(idx)}</span>
              <span class="q-title">${esc(q.title)}</span>
              ${needsData ? `<span class="badge incomplete">${q.id === 5 ? 'Date incomplete · estimează producția suplimentară' : q.id === 6 ? 'Date incomplete · completează consumuri mutabile' : 'Date incomplete · completează datele necesare'}</span>` : isActive ? '<span class="answer-slot" title="Aici apare bifa după răspuns">✓</span>' : '<span class="badge">În curând</span>'}
            </button>
            ${isActive ? `<div class="details" id="details-q${q.id}"></div>` : ''}
          </div>
        `;
      }).join('');

      document.querySelectorAll('.q-card.available, .q-card.needs-data').forEach(card => {
        card.addEventListener('click', () => {
          const q = Number(card.getAttribute('data-q'));
          if(q === 1) handleQuestion1(card);
          if(q === 2) handleQuestion2(card);
          if(q === 3) handleQuestion3(card);
          if(q === 4) handleQuestion4(card);
          if(q === 5) handleQuestion5(card);
          if(q === 6) handleQuestion6(card);
        });
      });
    }

    function handleQuestion1(cardArg){
      const card = cardArg || document.querySelector('.q-card.available[data-q="1"]');
      const box = document.getElementById('details-q1');
      const analysis = getAnalysis();
      if(!box || !analysis?.chartRows?.length) return;

      card.classList.add('loading');
      card.classList.remove('done');
      box.classList.add('open');
      box.innerHTML = `
        <div class="loading-panel">
          <div class="spinner"></div>
          <div>Se analizează datele încărcate și se calculează consumul scump din rețea...</div>
        </div>
      `;

      window.setTimeout(() => {
        renderQuestion1Result(box, analysis);
        card.classList.remove('loading');
        card.classList.add('done');
      }, 850);
    }

    function renderQuestion1Result(box, data){
      const ctx = getContext();
      const rows = data.chartRows || [];
      const step = Math.max(1, Math.ceil(rows.length / 280));
      const sampled = rows.filter((_, i) => i % step === 0);
      const hasProd = sampled.some(r => Number(r.productionKwh || 0) > 0);
      const expensive = sampled.map(r => r.isExpensive ? r.gridKwh : null);
      const isInvoice = data.meta?.loadMethod === 'invoice' || ctx.hasInvoiceOnly;

      box.innerHTML = `
        <div class="answer-summary" id="answerSummary"></div>
        <div class="chart-wrap"><canvas id="question1Chart"></canvas></div>
        <div class="top-list" id="topIntervals"></div>
      `;

      const topInterval = (data.expensiveIntervals || [])[0] || {};
      const totals = data.totals || {};
      const summary = document.getElementById('answerSummary');
      if(summary){
        const pvText = hasProd ? `Producție locală: ${fmt(totals.productionKwh || 0)} kWh` : 'Fără producție locală inclusă';
        summary.innerHTML = `
          <div class="summary-card"><strong>${esc(topInterval.localLabel || '-')}</strong><span>intervalul cu cel mai mare cost</span></div>
          <div class="summary-card"><strong>${fmt(topInterval.gridCostRon || 0)} lei</strong><span>cost în acel interval</span></div>
          <div class="summary-card"><strong>${fmt(totals.gridKwh || 0)} kWh</strong><span>consum total din rețea · ${pvText}</span></div>
        `;
      }

      const datasets = [
        {label:'Consum total',data:sampled.map(r=>r.consumptionKwh),borderColor:'#94a3b8',backgroundColor:'rgba(148,163,184,.08)',fill:false,tension:.28,pointRadius:0,borderWidth:1.8},
        {label:'Consum din rețea',data:sampled.map(r=>r.gridKwh),borderColor:'#07943f',backgroundColor:'rgba(7,148,63,.13)',fill:true,tension:.28,pointRadius:0,borderWidth:2.4},
        {label:'Puncte cost ridicat',data:expensive,borderColor:'#dc2626',backgroundColor:'#dc2626',showLine:false,pointRadius:4,pointHoverRadius:6}
      ];
      if(hasProd) datasets.splice(1,0,{label:'Producție locală',data:sampled.map(r=>r.productionKwh),borderColor:'#2563eb',backgroundColor:'rgba(37,99,235,.08)',fill:false,tension:.28,pointRadius:0,borderWidth:2});

      if(activeCharts.q1) activeCharts.q1.destroy();
      activeCharts.q1 = new Chart(document.getElementById('question1Chart'), {
        type:'line',
        data:{labels:sampled.map(r=>r.label), datasets},
        options:{
          responsive:true, maintainAspectRatio:false, interaction:{mode:'index',intersect:false},
          plugins:{legend:{position:'bottom'}, tooltip:{callbacks:{label:ctx=>`${ctx.dataset.label}: ${Number(ctx.parsed.y||0).toLocaleString('ro-RO',{maximumFractionDigits:2})} kWh`}}},
          scales:{x:{ticks:{maxTicksLimit:9}}, y:{beginAtZero:true,title:{display:true,text:'kWh / interval'}}}
        }
      });

      const top = (data.expensiveIntervals || []).slice(0,60);
      document.getElementById('topIntervals').innerHTML = top.map(x => `
        <div class="top-row">
          <div class="rank">${x.rank}</div>
          <div><strong>${esc(x.localLabel)}</strong><small>Consum rețea: ${fmt(x.gridKwh)} kWh · tarif fix: ${fmt(x.tariffRonKwh,3)} lei/kWh</small></div>
          <div class="cost">${fmt(x.gridCostRon)} lei</div>
        </div>
      `).join('');

      const hasPv = !!(data?.meta?.hasProduction || rows.some(r => Number(r.productionKwh || 0) > 0));
      const firstTop = top[0] || {};
      const interpretation = hasPv
        ? `Punctele roșii arată intervalele în care costul rămâne ridicat după scăderea producției locale. Cu tarif fix, problema nu este prețul orar, ci cantitatea de energie cumpărată din rețea. Dacă vârfurile apar seara sau noaptea, producția PV nu acoperă acele ore.`
        : `Punctele roșii arată intervalele cu cel mai mare cost. Pentru că tariful este fix, costul crește direct cu consumul din rețea. Graficul indică orele în care consumul este cel mai mare și unde merită analizate pornirile simultane de echipamente.`;

      const recommendationItems = hasPv
        ? [
            'Mută, unde procesul permite, consumurile flexibile în intervalele cu producție PV locală.',
            'Analizează BESS dacă vârfurile costisitoare apar după apus sau înainte de producția solară.',
            'Verifică echipamentele care pornesc simultan în intervalul cel mai scump: ' + (firstTop.localLabel || 'intervalul marcat cu roșu') + '.'
          ]
        : [
            'Identifică procesele care generează vârfurile roșii și verifică dacă pot fi eșalonate.',
            'Analizează potențial PV local pentru acoperirea consumului diurn.',
            'Dacă vârfurile apar constant în același interval, stabilește reguli operaționale de pornire pe rând a consumatorilor mari.'
          ];

      const parent = document.getElementById('topIntervals');
      if(parent && !document.getElementById('q1InsightGrid')){
        parent.insertAdjacentHTML('afterend', `
          <div class="insight-grid" id="q1InsightGrid">
            <div class="insight-card">
              <h3>Interpretare grafic</h3>
              <p>${esc(interpretation)}</p>
            </div>
            <div class="insight-card">
              <h3>Recomandări</h3>
              <ul>${recommendationItems.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
            </div>
          </div>
        `);
      }
    }

    function handleQuestion2(cardArg){
      const card = cardArg || document.querySelector('.q-card[data-q="2"]');
      const box = document.getElementById('details-q2');
      const analysis = getAnalysis();
      if(!box || !analysis?.chartRows?.length) return;

      const hasPvData = !!(getContext().hasProduction || analysis?.meta?.hasProduction || (analysis?.chartRows || []).some(r => Number(r.productionKwh || 0) > 0));

      card.classList.add('loading');
      card.classList.remove('done');
      box.classList.add('open');

      if(!hasPvData){
        window.setTimeout(() => {
          card.classList.remove('loading');
          renderQuestion2Upload(box, card);
        }, 450);
        return;
      }

      box.innerHTML = `
        <div class="loading-panel">
          <div class="spinner"></div>
          <div>Se analizează producția locală, autoconsumul și surplusul neutilizat...</div>
        </div>
      `;

      window.setTimeout(() => {
        renderQuestion2Result(box, analysis);
        card.classList.remove('loading');
        card.classList.add('done');
      }, 850);
    }

    function renderQuestion2Upload(box, card){
      box.innerHTML = `
        <div class="q2-upload-box">
          <div>
            <h2 class="q2-upload-title">Date incomplete pentru această întrebare</h2>
            <p class="q2-upload-text">Pentru „Când nu valorific optim energia produsă local?” este necesar un fișier de producție locală/PV. Încarcă PVGIS Timeseries, export inverter sau CSV/XLSX cu producție pe interval.</p>
          </div>
          <div class="q2-drop" id="q2Drop" role="button" tabindex="0">
            <input id="q2ProductionInput" type="file" multiple hidden accept=".csv,.txt,.xlsx,.xls,.xlsm,.html,.htm">
            <span>
              <strong>Încarcă fișier / fișiere producție locală</strong>
              <span>PVGIS Timeseries, export inverter, CSV/XLSX/HTML</span>
            </span>
          </div>
          <div class="q2-file-name" id="q2FileName"></div>
        </div>
      `;

      const drop = document.getElementById('q2Drop');
      const input = document.getElementById('q2ProductionInput');
      const fileName = document.getElementById('q2FileName');
      ['dragenter','dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('drag'); }));
      ['dragleave','drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('drag'); }));
      const openQ2Picker = (e) => {
        e.preventDefault();
        e.stopPropagation();
        input.value = '';
        input.click();
      };
      input.addEventListener('click', e => e.stopPropagation());
      drop.addEventListener('click', openQ2Picker);
      drop.addEventListener('keydown', e => {
        if(e.key === 'Enter' || e.key === ' '){
          openQ2Picker(e);
        }
      });
      drop.addEventListener('drop', async e => {
        e.preventDefault();
        const files = Array.from(e.dataTransfer.files || []);
        if(files.length) await processInlineProduction(files, fileName, box, card);
      });
      input.addEventListener('change', async e => {
        const files = Array.from(e.target.files || []);
        if(files.length) await processInlineProduction(files, fileName, box, card);
      });
    }

    async function processInlineProduction(files, fileNameEl, box, card){
      try{
        fileNameEl.textContent = files.length === 1 ? `Fișier selectat: ${files[0].name}` : `Fișiere selectate (${files.length}): ${files.map(f=>f.name).join(', ')}`;
        box.innerHTML = `
          <div class="loading-panel">
            <div class="spinner"></div>
            <div>Se citește producția locală și se aliniază peste curba de consum...</div>
          </div>
        `;

        const currentDataset = JSON.parse(sessionStorage.getItem('svtDataset') || '{}');
        if(!currentDataset?.rows?.length) throw new Error('Nu există curba de consum salvată. Revino la pagina de încărcare și încarcă întâi consumul electric.');

        const tariff = Number(currentDataset.meta?.fixedPriceRonKwh || getContext().fixedTariffRonKwh || 0.75);
        const datasets = [];
        for(const file of files){
          const ds = await SVTLoadCurveProfiles.parseFile(file, {mode:'production', fixedPriceRonKwh:tariff});
          datasets.push(ds);
        }

        const productionDataset = mergeInlineProductionDatasets(datasets, tariff);
        const merged = SVTAnalysisEngine.mergeProduction(currentDataset, productionDataset);
        merged.meta.fixedPriceRonKwh = tariff;
        merged.meta.productionFileNames = productionDataset.meta.fileNames || files.map(f=>f.name);

        const updatedAnalysis = SVTAnalysisEngine.analyzeQuestion1(merged, {fixedTariffRonKwh:tariff});
        updatedAnalysis.meta.loadMethod = currentDataset.meta?.sourceProfile || getContext().loadMethod || 'file';
        updatedAnalysis.meta.hasProduction = true;
        updatedAnalysis.meta.productionFileNames = merged.meta.productionFileNames;

        const ctx = getContext();
        ctx.hasProduction = true;
        ctx.productionFileCount = files.length;
        ctx.createdAt = new Date().toISOString();

        sessionStorage.setItem('svtDataset', JSON.stringify(merged));
        sessionStorage.setItem('svtAnalysis', JSON.stringify(updatedAnalysis));
        sessionStorage.setItem('svtNavigatorContext', JSON.stringify(ctx));
        localStorage.setItem('svtNavigatorContext', JSON.stringify(ctx));

        renderQuestion2Result(box, updatedAnalysis);
        card.classList.remove('loading','needs-data');
        card.classList.add('available','done');
        const badge = card.querySelector('.badge.incomplete');
        if(badge) badge.outerHTML = '<span class="answer-slot" title="Răspuns calculat">✓</span>';
      } catch(err){
        console.error(err);
        box.innerHTML = `
          <div class="q2-upload-box">
            <h2 class="q2-upload-title">Nu am putut procesa producția</h2>
            <p class="q2-upload-text">${esc(err.message || 'Fișierul de producție nu a putut fi citit.')}</p>
            <button class="btn back" type="button" onclick="renderQuestion2Upload(document.getElementById('details-q2'), document.querySelector('.q-card[data-q=&quot;2&quot;]'))">Încearcă alt fișier</button>
          </div>
        `;
        card.classList.remove('loading');
      }
    }

    function mergeInlineProductionDatasets(datasets, tariff){
      const map = new Map();
      const fileNames = [];
      for(const ds of datasets){
        if(ds.meta?.fileName) fileNames.push(ds.meta.fileName);
        for(const r of ds.rows || []){
          const t = new Date(r.timestamp).getTime();
          if(!Number.isFinite(t)) continue;
          const key = String(t);
          const d = new Date(t);
          const existing = map.get(key) || {
            timestamp:d.toISOString(),
            localLabel:d.toLocaleString('ro-RO',{dateStyle:'short',timeStyle:'short'}),
            hour:d.getHours(),
            minute:d.getMinutes(),
            electricKwh:0,
            electricExportKwh:0,
            thermalKwh:0,
            pvKwh:0,
            priceRonKwh:tariff
          };
          existing.pvKwh += Number(r.pvKwh || r.electricKwh || 0);
          map.set(key, existing);
        }
      }
      const rows = Array.from(map.values()).sort((a,b)=>new Date(a.timestamp)-new Date(b.timestamp));
      return {rows, meta:{fileName:fileNames.length > 1 ? `${fileNames.length} fișiere producție` : (fileNames[0] || 'producție locală'), fileNames, fixedPriceRonKwh:tariff, sourceProfile:'inline_production_upload'}};
    }

    function renderQuestion2Result(box, data){
      const rows = data.chartRows || [];
      const step = Math.max(1, Math.ceil(rows.length / 280));
      const sampled = rows.filter((_, i) => i % step === 0).map(r => {
        const production = Number(r.productionKwh || 0);
        const consumption = Number(r.consumptionKwh || 0);
        const self = Math.min(production, consumption);
        const surplus = Math.max(production - consumption, Number(r.surplusKwh || 0), 0);
        return {...r, productionKwh:production, selfConsumedKwh:self, surplusKwh:surplus};
      });

      const totals = rows.reduce((acc, r) => {
        const production = Number(r.productionKwh || 0);
        const consumption = Number(r.consumptionKwh || 0);
        const self = Math.min(production, consumption);
        const surplus = Math.max(production - consumption, Number(r.surplusKwh || 0), 0);
        acc.production += production;
        acc.self += self;
        acc.surplus += surplus;
        return acc;
      }, {production:0, self:0, surplus:0});

      const selfRate = totals.production > 0 ? totals.self / totals.production * 100 : 0;
      const topSurplus = rows.slice().map(r => {
        const production = Number(r.productionKwh || 0);
        const consumption = Number(r.consumptionKwh || 0);
        const surplus = Math.max(production - consumption, Number(r.surplusKwh || 0), 0);
        return {...r, surplusKwh:surplus};
      }).filter(r => r.surplusKwh > 0).sort((a,b)=>new Date(a.timestamp)-new Date(b.timestamp));

      box.innerHTML = `
        ${sourceWarningHtml('Q2')}
        <div class="answer-summary" id="answerSummaryQ2">
          <div class="summary-card"><strong>${fmt(totals.production)} kWh</strong><span>producție locală totală</span></div>
          <div class="summary-card"><strong>${fmt(totals.self)} kWh</strong><span>energie consumată local</span></div>
          <div class="summary-card"><strong>${fmt(totals.surplus)} kWh</strong><span>surplus / export estimat · autoconsum ${fmt(selfRate,1)}%</span></div>
        </div>
        <div class="chart-wrap"><canvas id="question2Chart"></canvas></div>
        <div class="top-list" id="topSurplusIntervals"></div>
        <div class="insight-grid">
          <div class="insight-card"><h3>Interpretare</h3><p>Surplusul apare în intervalele în care producția locală este mai mare decât consumul disponibil. Cu cât surplusul este mai mare, cu atât este mai importantă mutarea consumurilor, stocarea sau exportul controlat.</p></div>
          <div class="insight-card"><h3>Recomandare</h3><ul><li>Mută consumuri flexibile în orele cu surplus.</li><li>Analizează BESS dacă surplusul apare zilnic și consumul crește seara.</li><li>Verifică dacă datele sunt consum total sau doar import din rețea.</li></ul></div>
        </div>
      `;

      if(activeCharts.q2) activeCharts.q2.destroy();
      activeCharts.q2 = new Chart(document.getElementById('question2Chart'), {
        type:'line',
        data:{
          labels:sampled.map(r=>r.label),
          datasets:[
            {label:'Producție locală',data:sampled.map(r=>r.productionKwh),borderColor:'#2563eb',backgroundColor:'rgba(37,99,235,.08)',fill:false,tension:.28,pointRadius:0,borderWidth:2},
            {label:'Autoconsum',data:sampled.map(r=>r.selfConsumedKwh),borderColor:'#07943f',backgroundColor:'rgba(7,148,63,.12)',fill:true,tension:.28,pointRadius:0,borderWidth:2.2},
            {label:'Surplus / export',data:sampled.map(r=>r.surplusKwh),borderColor:'#f59e0b',backgroundColor:'rgba(245,158,11,.12)',fill:true,tension:.28,pointRadius:0,borderWidth:2}
          ]
        },
        options:{
          responsive:true, maintainAspectRatio:false, interaction:{mode:'index',intersect:false},
          plugins:{legend:{position:'bottom'}, tooltip:{callbacks:{label:ctx=>`${ctx.dataset.label}: ${Number(ctx.parsed.y||0).toLocaleString('ro-RO',{maximumFractionDigits:2})} kWh`}}},
          scales:{x:{ticks:{maxTicksLimit:9}}, y:{beginAtZero:true,title:{display:true,text:'kWh / interval'}}}
        }
      });

      const target = document.getElementById('topSurplusIntervals');
      target.innerHTML = renderQ2SurplusBoard(topSurplus);
    }

    function renderQ2SurplusBoard(rows){
      if(!rows || !rows.length){
        return `
          <div class="q2-empty-board">
            Nu am detectat surplus local relevant. Producția este consumată local în intervalele analizate.
          </div>
        `;
      }

      const groups = new Map();
      for(const r of rows){
        const d = new Date(r.timestamp);
        const dayKey = isNaN(d) ? String(r.localLabel || '').slice(0,10) : d.toLocaleDateString('ro-RO', {day:'2-digit', month:'2-digit', year:'numeric'});
        const hourLabel = isNaN(d) ? String(r.localLabel || '') : d.toLocaleTimeString('ro-RO', {hour:'2-digit', minute:'2-digit'});
        if(!groups.has(dayKey)) groups.set(dayKey, []);
        groups.get(dayKey).push({...r, dayKey, hourLabel});
      }

      const dayCards = Array.from(groups.entries()).map(([day, list]) => {
        const totalSurplus = list.reduce((a,x)=>a + Number(x.surplusKwh || 0),0);
        const totalProduction = list.reduce((a,x)=>a + Number(x.productionKwh || 0),0);
        const rowsHtml = list.map(x => `
          <div class="q2-hour-row">
            <div>${esc(x.hourLabel)}</div>
            <div class="q2-prod-val">${fmt(x.productionKwh)} kWh</div>
            <div class="q2-surplus-val">${fmt(x.surplusKwh)} kWh</div>
          </div>
        `).join('');

        return `
          <section class="q2-day-card">
            <div class="q2-day-head">
              <strong>${esc(day)}</strong>
              <span>${list.length} intervale · surplus total ${fmt(totalSurplus)} kWh · producție ${fmt(totalProduction)} kWh</span>
            </div>
            <div class="q2-hour-table">
              <div class="q2-hour-row header">
                <div>Ora</div>
                <div>Producție</div>
                <div>Surplus</div>
              </div>
              ${rowsHtml}
            </div>
          </section>
        `;
      }).join('');

      return `
        <div class="q2-surplus-board" aria-label="Tabel orizontal cu surplusul pe zile și ore">
          <div class="q2-day-grid">
            ${dayCards}
          </div>
        </div>
      `;
    }


    function handleQuestion3(cardArg){
      const card = cardArg || document.querySelector('.q-card[data-q="3"]');
      const box = document.getElementById('details-q3');
      if(!box) return;

      const stored = sessionStorage.getItem('svtForecastQ3');
      card.classList.add('loading');
      card.classList.remove('done');
      box.classList.add('open');

      window.setTimeout(() => {
        card.classList.remove('loading');
        if(stored){
          try{
            const parsed = JSON.parse(stored);
            // v54: nu mai afișăm rezultate vechi calculate în modul rolling 24h.
            // Acceptăm doar prognoze v54, generate pentru zi completă 00:00–23:00.
            if(parsed?.version === 'v54-calendar-day' && parsed?.forecastWindow?.startHour === '00:00'){
              renderQuestion3Result(box, parsed);
              card.classList.add('done');
              return;
            }
          }catch(e){}
        }
        sessionStorage.removeItem('svtForecastQ3');
        renderQuestion3Form(box, card);
      }, 450);
    }

    function getDefaultPvInputs(){
      const ds = (() => { try{return JSON.parse(sessionStorage.getItem('svtDataset') || '{}')}catch(e){return {}} })();
      const names = [
        ...(ds?.meta?.productionFileNames || []),
        ...(ds?.meta?.fileNames || [])
      ].join(' ');
      const m = names.match(/Timeseries_(-?\d+(?:\.\d+)?)_(-?\d+(?:\.\d+)?).*?_(\d+(?:\.\d+)?)kWp.*?_(\d+(?:\.\d+)?)deg_(-?\d+(?:\.\d+)?)deg/i);
      if(m){
        return {lat:m[1], lon:m[2], kwp:m[3], tilt:m[4], azimuth:m[5]};
      }
      return {lat:'46.455', lon:'23.464', kwp:'150', tilt:'15', azimuth:'0'};
    }

    function renderQuestion3Form(box, card){
      const d = getDefaultPvInputs();
      box.innerHTML = `
        <div class="q3-form">
          <div>
            <h2>Estimare producție PV următoarele 24 ore</h2>
            <p>Pentru această întrebare sunt necesare datele sistemului fotovoltaic și o prognoză meteo reală. Folosim radiația solară orară din Open-Meteo și calculăm o estimare operațională pe 24h.</p>
          </div>
          <div class="q3-grid">
            <div class="q3-field">
              <label for="q3Kwp">Putere sistem</label>
              <input id="q3Kwp" type="number" min="0" step="0.1" value="${esc(d.kwp)}" placeholder="kWp">
            </div>
            <div class="q3-field">
              <label for="q3Lat">Latitudine</label>
              <input id="q3Lat" type="number" step="0.000001" value="${esc(d.lat)}" placeholder="46.455">
            </div>
            <div class="q3-field">
              <label for="q3Lon">Longitudine</label>
              <input id="q3Lon" type="number" step="0.000001" value="${esc(d.lon)}" placeholder="23.464">
            </div>
            <div class="q3-field">
              <label for="q3Tilt">Înclinare</label>
              <input id="q3Tilt" type="number" min="0" max="90" step="1" value="${esc(d.tilt)}" placeholder="15">
            </div>
            <div class="q3-field">
              <label for="q3Azimuth">Azimut</label>
              <input id="q3Azimuth" type="number" min="-180" max="180" step="1" value="${esc(d.azimuth)}" placeholder="0">
            </div>
            <div class="q3-field">
              <label for="q3Losses">Pierderi sistem</label>
              <input id="q3Losses" type="number" min="0" max="40" step="0.5" value="14" placeholder="%">
            </div>
            <div class="q3-field">
              <label for="q3Weather">Sursă meteo</label>
              <select id="q3Weather">
                <option value="openmeteo">Open-Meteo Forecast API</option>
              </select>
            </div>
            <div class="q3-field">
              <label for="q3Model">Model calcul</label>
              <select id="q3Model">
                <option value="operational">Estimare operațională rapidă</option>
              </select>
            </div>
            <div class="q3-field">
              <label for="q3Horizon">Orizont</label>
              <select id="q3Horizon">
                <option value="24">Următoarele 24 ore</option>
              </select>
            </div>
          </div>
          <div class="q3-actions">
            <span class="q3-api-note">Azimut: 0° = sud, -90° = est, 90° = vest. Pentru rezultat bancabil ar trebui model transpoziție pe plan înclinat; aici este estimare operațională cu API meteo real.</span>
            <button class="btn next" type="button" id="q3RunBtn">Calculează ›</button>
          </div>
        </div>
      `;
      document.getElementById('q3RunBtn')?.addEventListener('click', () => calculateQ3Forecast(box, card));
    }

    function clamp(v,min,max){ return Math.min(max, Math.max(min, v)); }

    async function calculateQ3Forecast(box, card){
      try{
        const kwp = Number(document.getElementById('q3Kwp')?.value || 0);
        const lat = Number(document.getElementById('q3Lat')?.value || 0);
        const lon = Number(document.getElementById('q3Lon')?.value || 0);
        const tilt = Number(document.getElementById('q3Tilt')?.value || 0);
        const azimuth = Number(document.getElementById('q3Azimuth')?.value || 0);
        const losses = Number(document.getElementById('q3Losses')?.value || 14);

        if(!(kwp > 0)) throw new Error('Introdu puterea sistemului în kWp.');
        if(!(lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180)) throw new Error('Coordonatele nu sunt valide.');

        box.innerHTML = `
          <div class="loading-panel">
            <div class="spinner"></div>
            <div>Se preia prognoza meteo reală și se calculează producția PV pe 24h...</div>
          </div>
        `;

        const nowLocalForRequest = new Date();
        const forecastStart = new Date(nowLocalForRequest.getFullYear(), nowLocalForRequest.getMonth(), nowLocalForRequest.getDate() + 1, 0, 0, 0, 0);
        const forecastEnd = new Date(forecastStart.getTime() + 24 * 3600000);
        const apiDate = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

        const url = new URL('https://api.open-meteo.com/v1/forecast');
        url.searchParams.set('latitude', String(lat));
        url.searchParams.set('longitude', String(lon));
        url.searchParams.set('hourly', 'shortwave_radiation,temperature_2m,cloud_cover');
        url.searchParams.set('start_date', apiDate(forecastStart));
        url.searchParams.set('end_date', apiDate(forecastStart));
        url.searchParams.set('timezone', 'auto');

        const res = await fetch(url.toString());
        if(!res.ok) throw new Error('API-ul meteo nu a răspuns corect.');
        const meteo = await res.json();
        const hourly = meteo.hourly || {};
        const times = hourly.time || [];
        const ghi = hourly.shortwave_radiation || [];
        const temp = hourly.temperature_2m || [];
        const cloud = hourly.cloud_cover || [];

        let allRows = times.map((t,i) => ({
          time:t,
          date:new Date(t),
          ghi:Number(ghi[i] || 0),
          temp:Number(temp[i] || 0),
          cloud:Number(cloud[i] || 0)
        })).filter(r => !isNaN(r.date));

        // v54: API-ul este cerut direct pentru data completă dorită.
        // Totuși filtrăm strict încă o dată ca graficul să fie 00:00–23:00.
        let rows = allRows.filter(r => r.date >= forecastStart && r.date < forecastEnd).slice(0,24);

        if(rows.length < 20){
          const targetDate = apiDate(forecastStart);
          rows = allRows.filter(r => String(r.time || '').slice(0,10) === targetDate).slice(0,24);
        }

        if(rows.length < 6) throw new Error('Nu am primit o zi completă de prognoză orară din API.');
        rows = rows.slice(0,24);

        const orientationFactor = clamp(1 - Math.abs(azimuth) / 180 * 0.28, 0.62, 1.02);
        const tiltFactor = clamp(1 - Math.abs(tilt - 30) / 120, 0.72, 1.03);
        const lossFactor = clamp(1 - losses / 100, 0.50, 1.00);

        let total = 0, irradiation = 0, peak = {kwh:0,label:'-'};
        const forecastRows = rows.map(r => {
          const moduleTemp = r.temp + (r.ghi / 800) * 20;
          const tempDerate = clamp(1 - 0.004 * (moduleTemp - 25), 0.78, 1.06);
          const kwh = Math.max(0, kwp * (r.ghi / 1000) * orientationFactor * tiltFactor * lossFactor * tempDerate);
          const label = r.date.toLocaleString('ro-RO', {hour:'2-digit', minute:'2-digit'});
          total += kwh;
          irradiation += Math.max(0, r.ghi) / 1000;
          if(kwh > peak.kwh) peak = {kwh,label};
          return {label, time:r.time, productionKwh:kwh, irradiationKwhM2:r.ghi/1000, temperature:r.temp, cloud:r.cloud};
        });

        const payload = {
          version:'v54-calendar-day',
          source:'Open-Meteo Forecast API',
          url:url.toString(),
          forecastWindow:{
            start: forecastStart ? forecastStart.toISOString() : null,
            end: forecastEnd ? forecastEnd.toISOString() : null,
            startHour:'00:00',
            endHour:'23:00',
            label: forecastStart ? forecastStart.toLocaleDateString('ro-RO', {day:'2-digit', month:'2-digit', year:'numeric'}) : 'zi disponibilă'
          },
          inputs:{kwp,lat,lon,tilt,azimuth,losses,orientationFactor,tiltFactor,lossFactor},
          totals:{productionKwh:total, irradiationKwhM2:irradiation, peakKwh:peak.kwh, peakLabel:peak.label},
          rows:forecastRows,
          createdAt:new Date().toISOString()
        };
        sessionStorage.setItem('svtForecastQ3', JSON.stringify(payload));
        renderQuestion3Result(box, payload);
        card.classList.remove('loading','needs-data');
        card.classList.add('available','done');
        const badge = card.querySelector('.badge.incomplete');
        if(badge) badge.outerHTML = '<span class="answer-slot" title="Răspuns calculat">✓</span>';
      }catch(err){
        console.error(err);
        box.innerHTML = `
          <div class="q3-form">
            <h2>Nu am putut calcula prognoza</h2>
            <p>${esc(err.message || 'Verifică datele introduse și conexiunea la internet.')}</p>
            <button class="btn back" type="button" onclick="renderQuestion3Form(document.getElementById('details-q3'), document.querySelector('.q-card[data-q=&quot;3&quot;]'))">Încearcă din nou</button>
          </div>
        `;
        card.classList.remove('loading');
      }
    }

    function renderQuestion3Result(box, data){
      const total = data.totals?.productionKwh || 0;
      const peak = data.totals?.peakKwh || 0;
      const peakLabel = data.totals?.peakLabel || '-';
      const irradiation = data.totals?.irradiationKwhM2 || 0;
      box.innerHTML = `
        <div class="q3-result-meta">
              <span class="q3-chip">${fmt(data.inputs?.kwp || 0,1)} kWp</span>
              <span class="q3-chip">${fmt(data.inputs?.tilt || 0,0)}° înclinare</span>
              <span class="q3-chip">${fmt(data.inputs?.azimuth || 0,0)}° azimut</span>
              <span class="q3-chip">${fmt(data.inputs?.losses || 0,1)}% pierderi</span>
              <span class="q3-chip">Interval: ${esc(data.forecastWindow?.label || 'ziua următoare')} · 00:00–23:00</span>
            </div>
        <div class="answer-summary">
          <div class="summary-card"><strong>${fmt(total)} kWh</strong><span>producție estimată următoarele 24h</span></div>
          <div class="summary-card"><strong>${fmt(peak)} kWh</strong><span>vârf orar estimat · ${esc(peakLabel)}</span></div>
          <div class="summary-card"><strong>${fmt(irradiation,2)} kWh/m²</strong><span>radiație solară orară cumulată</span></div>
        </div>
        <div class="client-short-answer">Răspuns pe scurt: acesta este potențialul estimat de producție PV pentru ziua următoare, pe baza prognozei meteo reale. Este o estimare operațională rapidă, nu o simulare finală bancabilă.</div>
        <div class="chart-wrap"><canvas id="question3Chart"></canvas></div>
        <div class="top-list" id="q3HourlyList"></div>
      `;

      if(activeCharts.q3) activeCharts.q3.destroy();
      activeCharts.q3 = new Chart(document.getElementById('question3Chart'), {
        type:'line',
        data:{
          labels:data.rows.map(r=>r.label),
          datasets:[
            {label:'Producție PV estimată',data:data.rows.map(r=>r.productionKwh),borderColor:'#07943f',backgroundColor:'rgba(7,148,63,.14)',fill:true,tension:.28,pointRadius:2,borderWidth:2.4},
            {label:'Radiație solară',data:data.rows.map(r=>r.irradiationKwhM2),borderColor:'#f59e0b',backgroundColor:'rgba(245,158,11,.10)',fill:false,tension:.28,pointRadius:0,borderWidth:1.8}
          ]
        },
        options:{
          responsive:true, maintainAspectRatio:false, interaction:{mode:'index',intersect:false},
          plugins:{legend:{position:'bottom'}, tooltip:{callbacks:{label:ctx=>`${ctx.dataset.label}: ${Number(ctx.parsed.y||0).toLocaleString('ro-RO',{maximumFractionDigits:2})}${ctx.dataset.label.includes('Radia') ? ' kWh/m²' : ' kWh'}`}}},
          scales:{x:{ticks:{maxTicksLimit:9}}, y:{beginAtZero:true,title:{display:true,text:'kWh / oră'}}}
        }
      });

      const top = data.rows.slice().sort((a,b)=>b.productionKwh-a.productionKwh).slice(0,5);
      document.getElementById('q3HourlyList').innerHTML = top.map((x,i)=>`
        <div class="top-row">
          <div class="rank">${i+1}</div>
          <div><strong>${esc(x.label)}</strong><small>Temperatură: ${fmt(x.temperature,1)} °C · nebulozitate: ${fmt(x.cloud,0)}%</small></div>
          <div class="cost" style="color:#067436">${fmt(x.productionKwh)} kWh</div>
        </div>
      `).join('');
    }



    function getQ4Defaults(){
      const ds = (() => { try{return JSON.parse(sessionStorage.getItem('svtDataset') || '{}')}catch(e){return {}} })();
      const q3 = (() => { try{return JSON.parse(sessionStorage.getItem('svtForecastQ3') || '{}')}catch(e){return {}} })();
      const ctx = getContext();

      const fileNames = [
        ...(ds?.meta?.productionFileNames || []),
        ...(ds?.meta?.fileNames || [])
      ].join(' ');

      const fromFile = fileNames.match(/Timeseries_(-?\d+(?:\.\d+)?)_(-?\d+(?:\.\d+)?).*?_(\d+(?:\.\d+)?)kWp.*?_(\d+(?:\.\d+)?)deg_(-?\d+(?:\.\d+)?)deg/i);
      const q3Inputs = q3.inputs || {};

      let lat = q3Inputs.lat ?? (fromFile ? fromFile[1] : '46.455');
      let lon = q3Inputs.lon ?? (fromFile ? fromFile[2] : '23.464');
      let existingKwp = q3Inputs.kwp ?? (fromFile ? fromFile[3] : '');
      let tilt = q3Inputs.tilt ?? (fromFile ? fromFile[4] : '15');
      let azimuth = q3Inputs.azimuth ?? (fromFile ? fromFile[5] : '0');
      let losses = q3Inputs.losses ?? 14;

      const rows = ds.rows || [];
      const productionTotal = rows.reduce((a,r)=>a + Number(r.pvKwh || 0),0);
      const knownKwp = Number(existingKwp || 0);
      const spanDays = rows.length > 1 ? Math.max(1, (new Date(rows[rows.length-1].timestamp) - new Date(rows[0].timestamp))/86400000) : 0;
      let specificYieldGross = 1350;

      if(knownKwp > 0 && productionTotal > 0 && spanDays > 250){
        const netYield = productionTotal / knownKwp;
        const lossFactor = Math.max(.5, 1 - Number(losses || 14)/100);
        specificYieldGross = netYield / lossFactor;
      }

      return {
        lat:String(lat ?? ''),
        lon:String(lon ?? ''),
        existingKwp:String(existingKwp ?? ''),
        tilt:String(tilt ?? '15'),
        azimuth:String(azimuth ?? '0'),
        losses:String(losses ?? 14),
        surfaceM2:'',
        usablePercent:'70',
        density:'5.5',
        mounting:'roof_flat',
        specificYieldGross:String(Math.round(specificYieldGross)),
        exportLimitKw:'',
        zeroExport:'unknown',
        sourceHint: q3.inputs ? 'date preluate din întrebarea 3' : (fromFile ? 'date preluate din fișierul PVGIS' : 'valori implicite')
      };
    }

    function handleQuestion4(cardArg){
      const card = cardArg || document.querySelector('.q-card[data-q="4"]');
      const box = document.getElementById('details-q4');
      if(!box) return;

      const stored = sessionStorage.getItem('svtPotentialQ4');
      card.classList.add('loading');
      card.classList.remove('done');
      box.classList.add('open');

      window.setTimeout(() => {
        card.classList.remove('loading');
        if(stored){
          try{
            renderQuestion4Result(box, JSON.parse(stored));
            card.classList.add('done');
            return;
          }catch(e){}
        }
        renderQuestion4Form(box, card);
      }, 450);
    }


    function addQ4SurfaceRow(values){
      const list = document.getElementById('q4SurfaceList');
      if(!list) return;
      const idx = list.querySelectorAll('.q4-surface-card').length + 2;
      const v = Object.assign({name:`Suprafață ${idx}`, surfaceM2:'', usablePercent:'70', mounting:'roof_flat', density:'5.5', tilt:'15', azimuth:'0'}, values || {});
      const node = document.createElement('section');
      node.className = 'q4-surface-card';
      node.innerHTML = `
        <div class="q4-surface-title">
          <strong>${esc(v.name)}</strong>
          <button class="btn back" type="button" data-q4-remove>Șterge</button>
        </div>
        <div class="q4-grid">
          <div class="q4-field"><label>Suprafață [m²]</label><input data-q4-surface="surfaceM2" type="number" min="0" step="1" value="${esc(v.surfaceM2)}"></div>
          <div class="q4-field"><label>Utilizabil [%]</label><input data-q4-surface="usablePercent" type="number" min="1" max="100" step="1" value="${esc(v.usablePercent)}"></div>
          <div class="q4-field"><label>Tip montaj</label><select data-q4-surface="mounting"><option value="roof_flat">Acoperiș plat</option><option value="roof_tilted">Acoperiș înclinat</option><option value="ground">Teren</option><option value="carport">Carport</option><option value="facade">Fațadă</option><option value="other">Altceva</option></select></div>
          <div class="q4-field"><label>Densitate [m²/kWp]</label><input data-q4-surface="density" type="number" min="3" max="12" step="0.1" value="${esc(v.density)}"></div>
          <div class="q4-field"><label>Înclinare [°]</label><input data-q4-surface="tilt" type="number" min="0" max="90" step="1" value="${esc(v.tilt)}"></div>
          <div class="q4-field"><label>Azimut [°]</label><input data-q4-surface="azimuth" type="number" min="-180" max="180" step="1" value="${esc(v.azimuth)}"></div>
        </div>
      `;
      list.appendChild(node);
      const mounting = node.querySelector('[data-q4-surface="mounting"]');
      if(mounting) mounting.value = v.mounting || 'roof_flat';
      node.querySelector('[data-q4-remove]')?.addEventListener('click', () => node.remove());
    }

    function collectQ4Surfaces(baseInputs){
      const surfaces = [{
        name:'Suprafață principală',
        surfaceM2:baseInputs.surfaceM2,
        usablePercent:baseInputs.usablePercent,
        mounting:baseInputs.mounting,
        density:baseInputs.density,
        tilt:baseInputs.tilt,
        azimuth:baseInputs.azimuth
      }];
      document.querySelectorAll('.q4-surface-card').forEach((card, i) => {
        const val = k => card.querySelector(`[data-q4-surface="${k}"]`)?.value || '';
        const surfaceM2 = Number(val('surfaceM2') || 0);
        if(surfaceM2 > 0){
          surfaces.push({
            name:`Suprafață ${i+2}`,
            surfaceM2,
            usablePercent:Number(val('usablePercent') || 70),
            mounting:val('mounting') || 'roof_flat',
            density:Number(val('density') || 5.5),
            tilt:Number(val('tilt') || baseInputs.tilt || 15),
            azimuth:Number(val('azimuth') || baseInputs.azimuth || 0)
          });
        }
      });
      return surfaces.filter(s => Number(s.surfaceM2 || 0) > 0);
    }


    function renderQuestion4Form(box, card){
      const d = getQ4Defaults();
      box.innerHTML = `
        <div class="q4-form">
          <div>
            <h2>Câtă energie ar mai putea fi produsă local?</h2>
            <p>Completăm automat ce există deja în întrebările anterioare: coordonate, putere PV, înclinare, azimut și pierderi. Mai trebuie introdusă suprafața disponibilă suplimentar și eventual limitările de racordare.</p>
          </div>

          <div class="q4-result-meta">
            <span class="q4-chip">Prefill: ${esc(d.sourceHint)}</span>
            <span class="q4-chip">${esc(d.lat)}, ${esc(d.lon)}</span>
            ${d.existingKwp ? `<span class="q4-chip">PV existent: ${esc(d.existingKwp)} kWp</span>` : ''}
          </div>

          <div class="q4-grid">
            <div class="q4-field">
              <label for="q4Lat">Latitudine</label>
              <input id="q4Lat" type="number" step="0.000001" value="${esc(d.lat)}">
            </div>
            <div class="q4-field">
              <label for="q4Lon">Longitudine</label>
              <input id="q4Lon" type="number" step="0.000001" value="${esc(d.lon)}">
            </div>
            <div class="q4-field">
              <label for="q4Surface">Suprafață disponibilă suplimentar [m²]</label>
              <input id="q4Surface" type="number" min="0" step="1" value="${esc(d.surfaceM2)}" placeholder="ex. 3000">
            </div>
            <div class="q4-field">
              <label for="q4Usable">Procent utilizabil [%]</label>
              <input id="q4Usable" type="number" min="1" max="100" step="1" value="${esc(d.usablePercent)}">
            </div>
            <div class="q4-field">
              <label for="q4Mounting">Tip suprafață / montaj</label>
              <select id="q4Mounting">
                <option value="roof_flat">Acoperiș plat / hală</option>
                <option value="roof_tilted">Acoperiș înclinat existent</option>
                <option value="ground">Teren liber</option>
                <option value="carport">Parcare / carport</option>
                <option value="facade">Fațadă</option>
                <option value="other">Altă suprafață</option>
              </select>
            </div>
            <div class="q4-field">
              <label for="q4Density">Densitate [m²/kWp]</label>
              <input id="q4Density" type="number" min="3" max="12" step="0.1" value="${esc(d.density)}">
            </div>
            <div class="q4-field">
              <label for="q4Tilt">Înclinare [°]</label>
              <input id="q4Tilt" type="number" min="0" max="90" step="1" value="${esc(d.tilt)}">
            </div>
            <div class="q4-field">
              <label for="q4Azimuth">Azimut [°]</label>
              <input id="q4Azimuth" type="number" min="-180" max="180" step="1" value="${esc(d.azimuth)}">
            </div>
            <div class="q4-field">
              <label for="q4Losses">Pierderi sistem [%]</label>
              <input id="q4Losses" type="number" min="0" max="40" step="0.5" value="${esc(d.losses)}">
            </div>
            <div class="q4-field">
              <label for="q4YieldGross">Producție specifică brută [kWh/kWp/an]</label>
              <input id="q4YieldGross" type="number" min="800" max="1800" step="10" value="${esc(d.specificYieldGross)}">
            </div>
            <div class="q4-field">
              <label for="q4Existing">Putere PV existentă [kWp]</label>
              <input id="q4Existing" type="number" min="0" step="0.1" value="${esc(d.existingKwp)}" placeholder="opțional">
            </div>
            <div class="q4-field">
              <label for="q4ExportLimit">Limitare injecție [kW]</label>
              <input id="q4ExportLimit" type="number" min="0" step="1" value="${esc(d.exportLimitKw)}" placeholder="opțional">
            </div>
            <div class="q4-field">
              <label for="q4ZeroExport">Zero-export</label>
              <select id="q4ZeroExport">
                <option value="unknown">Nu știu / nu este specificat</option>
                <option value="no">Nu</option>
                <option value="yes">Da</option>
              </select>
            </div>
          </div>

          <div class="q4-actions">
            <span class="q4-note">Suprafața introdusă trebuie să fie suprafața care mai poate fi folosită pentru PV suplimentar. Dacă introduci suprafața totală a amplasamentului, rezultatul va reprezenta potențial total, nu doar potențial suplimentar.</span>
            <button class="btn next" type="button" id="q4RunBtn">Calculează potențialul ›</button>
          </div>
        </div>
      `;

      const mounting = document.getElementById('q4Mounting');
      mounting.value = d.mounting;
      document.getElementById('q4ZeroExport').value = d.zeroExport;
      mounting.addEventListener('change', () => {
        const densityMap = {roof_flat:5.5, roof_tilted:5.2, ground:6.5, carport:5.5, facade:7.0, other:6.0};
        document.getElementById('q4Density').value = densityMap[mounting.value] || 6.0;
      });
      document.getElementById('q4RunBtn')?.addEventListener('click', () => calculateQ4Potential(box, card));
    }

    function getAnnualizedDayConsumption(){
      const ds = (() => { try{return JSON.parse(sessionStorage.getItem('svtDataset') || '{}')}catch(e){return {}} })();
      const rows = ds.rows || [];
      if(rows.length < 2) return {annualDayKwh:0, annualTotalKwh:0, days:0};
      const start = new Date(rows[0].timestamp);
      const end = new Date(rows[rows.length-1].timestamp);
      const days = Math.max(1, (end - start) / 86400000);
      let day = 0, total = 0;
      for(const r of rows){
        const h = Number(r.hour ?? new Date(r.timestamp).getHours());
        const k = Number(r.electricKwh || r.gridKwh || r.consumptionKwh || 0);
        total += k;
        if(h >= 7 && h <= 19) day += k;
      }
      const factor = 365 / days;
      return {annualDayKwh:day*factor, annualTotalKwh:total*factor, days};
    }

    function calculateQ4Potential(box, card){
      try{
        const lat = Number(document.getElementById('q4Lat')?.value || 0);
        const lon = Number(document.getElementById('q4Lon')?.value || 0);
        const surfaceM2 = Number(document.getElementById('q4Surface')?.value || 0);
        const usablePercent = Number(document.getElementById('q4Usable')?.value || 0);
        const density = Number(document.getElementById('q4Density')?.value || 0);
        const tilt = Number(document.getElementById('q4Tilt')?.value || 0);
        const azimuth = Number(document.getElementById('q4Azimuth')?.value || 0);
        const losses = Number(document.getElementById('q4Losses')?.value || 0);
        const specificYieldGross = Number(document.getElementById('q4YieldGross')?.value || 0);
        const existingKwp = Number(document.getElementById('q4Existing')?.value || 0);
        const exportLimitKw = Number(document.getElementById('q4ExportLimit')?.value || 0);
        const zeroExport = document.getElementById('q4ZeroExport')?.value || 'unknown';
        const mounting = document.getElementById('q4Mounting')?.value || 'roof_flat';

        if(!(lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180)) throw new Error('Coordonatele nu sunt valide.');
        if(!(surfaceM2 > 0)) throw new Error('Introdu suprafața disponibilă suplimentar în m².');
        if(!(usablePercent > 0 && usablePercent <= 100)) throw new Error('Procentul utilizabil trebuie să fie între 1% și 100%.');
        if(!(density > 0)) throw new Error('Densitatea m²/kWp trebuie să fie pozitivă.');
        if(!(specificYieldGross > 0)) throw new Error('Producția specifică trebuie să fie pozitivă.');

        const baseSurface = {surfaceM2, usablePercent, mounting, density, tilt, azimuth};
        const surfaces = collectQ4Surfaces(baseSurface);
        if(!surfaces.length) throw new Error('Introdu cel puțin o suprafață disponibilă pentru PV.');
        const netSpecificYield = specificYieldGross * Math.max(0.45, 1 - losses/100);
        let usableArea = 0, additionalKwp = 0, annualKwh = 0;
        surfaces.forEach(s => {
          const ua = Number(s.surfaceM2 || 0) * Number(s.usablePercent || 0) / 100;
          const kwp = ua / Math.max(0.1, Number(s.density || density || 5.5));
          usableArea += ua;
          additionalKwp += kwp;
          annualKwh += kwp * netSpecificYield;
        });

        const monthShare = [
          ['Ian',4.0],['Feb',5.5],['Mar',8.5],['Apr',10.5],['Mai',12.0],['Iun',12.5],
          ['Iul',13.0],['Aug',12.0],['Sep',9.5],['Oct',6.5],['Nov',3.5],['Dec',2.5]
        ];
        const monthly = monthShare.map(([month, pct]) => ({month, kwh:annualKwh * pct / 100}));

        const c = getAnnualizedDayConsumption();
        const usefulKwh = c.annualDayKwh > 0 ? Math.min(annualKwh, c.annualDayKwh * 0.85) : 0;
        const surplusKwh = c.annualDayKwh > 0 ? Math.max(0, annualKwh - usefulKwh) : 0;

        let gridNote = 'Limitarea de racordare nu a fost introdusă.';
        if(exportLimitKw > 0 && additionalKwp > exportLimitKw) gridNote = 'Puterea suplimentară estimată depășește limitarea de injecție introdusă. Ar trebui analizate limitarea invertorului, stocarea sau flexibilizarea consumului.';
        if(zeroExport === 'yes') gridNote = 'Ai selectat zero-export: potențialul tehnic există, dar surplusul trebuie consumat local, stocat sau limitat.';

        const payload = {
          inputs:{lat,lon,surfaceM2,usablePercent,density,tilt,azimuth,losses,specificYieldGross,netSpecificYield,existingKwp,exportLimitKw,zeroExport,mounting,surfaces},
          results:{usableArea,additionalKwp,annualKwh,usefulKwh,surplusKwh,annualDayKwh:c.annualDayKwh,annualTotalKwh:c.annualTotalKwh,gridNote},
          monthly,
          createdAt:new Date().toISOString()
        };

        sessionStorage.setItem('svtPotentialQ4', JSON.stringify(payload));
        renderQuestion4Result(box, payload);
        card.classList.remove('loading','needs-data');
        card.classList.add('available','done');
        const badge = card.querySelector('.badge.incomplete');
        if(badge) badge.outerHTML = '<span class="answer-slot" title="Răspuns calculat">✓</span>';
      }catch(err){
        box.innerHTML = `
          <div class="q4-form">
            <h2>Date insuficiente</h2>
            <p>${esc(err.message || 'Verifică datele introduse.')}</p>
            <button class="btn back" type="button" onclick="renderQuestion4Form(document.getElementById('details-q4'), document.querySelector('.q-card[data-q=&quot;4&quot;]'))">Completează din nou</button>
          </div>
        `;
      }
    }

    function renderQuestion4Result(box, data){
      const r = data.results || {};
      const i = data.inputs || {};
      const annualMwh = (r.annualKwh || 0) / 1000;
      const usefulMwh = (r.usefulKwh || 0) / 1000;
      const surplusMwh = (r.surplusKwh || 0) / 1000;

      box.innerHTML = `
        <div class="q4-result-meta">
              <span class="q4-chip">${fmt(i.surfaceM2,0)} m² brut</span>
              <span class="q4-chip">${fmt(i.usablePercent,0)}% utilizabil</span>
              <span class="q4-chip">${fmt(i.density,1)} m²/kWp</span>
              <span class="q4-chip">${fmt(i.netSpecificYield,0)} kWh/kWp/an net</span>
              <span class="q4-chip">${(i.surfaces || []).length || 1} suprafețe</span>
            </div>
        <div class="answer-summary">
          <div class="summary-card"><strong>${fmt(r.additionalKwp,1)} kWp</strong><span>putere PV suplimentară posibilă</span></div>
          <div class="summary-card"><strong>${fmt(annualMwh,1)} MWh/an</strong><span>energie locală suplimentară estimată</span></div>
          <div class="summary-card"><strong>${r.usefulKwh ? fmt(usefulMwh,1) + ' MWh/an' : 'n/a'}</strong><span>potențial util local estimat pe baza curbei de consum</span></div>
        </div>
        <div class="chart-wrap"><canvas id="question4Chart"></canvas></div>
        <div class="top-list">
          <div class="top-row">
            <div class="rank">1</div>
            <div><strong>Suprafață utilă pentru PV</strong><small>${fmt(i.surfaceM2,0)} m² × ${fmt(i.usablePercent,0)}%</small></div>
            <div class="cost" style="color:#067436">${fmt(r.usableArea,0)} m²</div>
          </div>
          <div class="top-row">
            <div class="rank">2</div>
            <div><strong>Estimare autoconsum / surplus</strong><small>${r.annualDayKwh ? 'bazat pe consumul diurn anualizat' : 'necesită curba de consum pentru estimare mai bună'}</small></div>
            <div class="cost" style="color:#0f172a">${r.annualDayKwh ? `${fmt(usefulMwh,1)} MWh util · ${fmt(surplusMwh,1)} MWh surplus` : 'date limitate'}</div>
          </div>
          <div class="top-row">
            <div class="rank">3</div>
            <div><strong>Limitări racordare / injecție</strong><small>${esc(r.gridNote || '')}</small></div>
            <div class="cost" style="color:#b45309">${i.zeroExport === 'yes' ? 'zero-export' : (i.exportLimitKw ? fmt(i.exportLimitKw,0) + ' kW' : 'n/a')}</div>
          </div>
        </div>
      `;

      if(activeCharts.q4) activeCharts.q4.destroy();
      activeCharts.q4 = new Chart(document.getElementById('question4Chart'), {
        type:'bar',
        data:{
          labels:data.monthly.map(x=>x.month),
          datasets:[
            {label:'Producție suplimentară estimată',data:data.monthly.map(x=>x.kwh/1000),backgroundColor:'rgba(7,148,63,.62)',borderColor:'#07943f',borderWidth:1,borderRadius:7}
          ]
        },
        options:{
          responsive:true, maintainAspectRatio:false,
          plugins:{legend:{position:'bottom'}, tooltip:{callbacks:{label:ctx=>`${ctx.dataset.label}: ${Number(ctx.parsed.y||0).toLocaleString('ro-RO',{maximumFractionDigits:1})} MWh`}}},
          scales:{x:{grid:{display:false}}, y:{beginAtZero:true,title:{display:true,text:'MWh/lună'}}}
        }
      });
    }



    function getQ5Defaults(){
      const ds = (() => { try{return JSON.parse(sessionStorage.getItem('svtDataset') || '{}')}catch(e){return {}} })();
      const q4 = (() => { try{return JSON.parse(sessionStorage.getItem('svtPotentialQ4') || '{}')}catch(e){return {}} })();
      const ctx = getContext();
      const fixed = Number(ds?.meta?.fixedPriceRonKwh || ctx.fixedTariffRonKwh || 0.75);
      const zeroExport = q4?.inputs?.zeroExport || 'unknown';
      const exportLimitKw = q4?.inputs?.exportLimitKw || '';
      return {
        tariffConsumption:String(fixed || 0.75),
        exportTariff:'0.20',
        zeroExport:String(zeroExport || 'unknown'),
        exportLimitKw:String(exportLimitKw || ''),
        flexibleMode:'unknown',
        flexibleKwhDay:'',
        bessMode:'no',
        bessCapacityKwh:'',
        bessEfficiency:'90'
      };
    }

    function handleQuestion5(cardArg){
      const card = cardArg || document.querySelector('.q-card[data-q="5"]');
      const box = document.getElementById('details-q5');
      if(!box) return;

      const stored = sessionStorage.getItem('svtUsefulEnergyQ5');
      card.classList.add('loading');
      card.classList.remove('done');
      box.classList.add('open');

      window.setTimeout(() => {
        card.classList.remove('loading');
        if(stored){
          try{
            const parsed = JSON.parse(stored);
            if(parsed?.compact){
              renderQuestion5CompactResult(box, parsed);
            }else{
              renderQuestion5Result(box, parsed);
            }
            card.classList.add('done');
            return;
          }catch(e){}
        }
        renderQuestion5Form(box, card);
      }, 450);
    }

    function renderQuestion5Form(box, card){
      const q4 = (() => { try{return JSON.parse(sessionStorage.getItem('svtPotentialQ4') || '{}')}catch(e){return {}} })();
      const ds = (() => { try{return JSON.parse(sessionStorage.getItem('svtDataset') || '{}')}catch(e){return {}} })();

      if(!q4?.results?.annualKwh){
        box.innerHTML = `
          <div class="q5-prereq">
            <strong>Date incomplete · este necesară estimarea producției suplimentare</strong>
            <p>Pentru această întrebare trebuie calculată mai întâi întrebarea 4: „Câtă energie ar mai putea fi produsă local?”. Fără producția suplimentară estimată nu avem baza pentru a calcula cât este utilizabil local.</p>
            <button class="btn next" type="button" id="q5OpenQ4Btn">Deschide întrebarea 4 ›</button>
          </div>
        `;
        document.getElementById('q5OpenQ4Btn')?.addEventListener('click', () => {
          const q4Card = document.querySelector('.q-card[data-q="4"]');
          if(q4Card){
            q4Card.scrollIntoView({behavior:'smooth', block:'center'});
            window.setTimeout(() => q4Card.click(), 250);
          }
        });
        return;
      }

      if(!ds?.rows?.length){
        box.innerHTML = `
          <div class="q5-prereq">
            <strong>Date incomplete · lipsește curba de consum</strong>
            <p>Pentru a calcula energia utilizabilă local este necesară curba de consum electric. Revino la pagina de încărcare și adaugă consumul.</p>
          </div>
        `;
        return;
      }

      const d = getQ5Defaults();
      const addMwh = (q4.results.annualKwh || 0) / 1000;
      const addKwp = q4.results.additionalKwp || 0;

      box.innerHTML = `
        <div class="q5-form">
          <div>
            <h2>Cât din energia suplimentar produsă ar fi utilizabilă util?</h2>
            <p>Preluăm automat curba de consum și producția suplimentară estimată la întrebarea 4. Completează doar ipotezele despre export, flexibilitate, stocare și tarife.</p>
          </div>

          <div class="q5-result-meta">
            <span class="q5-chip">PV suplimentar: ${fmt(addKwp,1)} kWp</span>
            <span class="q5-chip">Producție suplimentară: ${fmt(addMwh,1)} MWh/an</span>
            <span class="q5-chip">Curba consum: ${fmt(ds.rows.length,0)} intervale</span>
          </div>

          <details class="svt-advanced"><summary>Modifică ipotezele avansate</summary>
          <div class="q5-grid">
            <div class="q5-field">
              <label for="q5ZeroExport">Regim zero-export</label>
              <select id="q5ZeroExport">
                <option value="unknown">Nu știu / nu este specificat</option>
                <option value="no">Nu</option>
                <option value="yes">Da</option>
              </select>
            </div>
            <div class="q5-field">
              <label for="q5ExportLimit">Limitare injecție [kW]</label>
              <input id="q5ExportLimit" type="number" min="0" step="1" value="${esc(d.exportLimitKw)}" placeholder="opțional">
            </div>
            <div class="q5-field">
              <label for="q5FlexibleMode">Consumuri mutabile</label>
              <select id="q5FlexibleMode">
                <option value="unknown">Nu știu</option>
                <option value="no">Nu</option>
                <option value="yes">Da</option>
              </select>
            </div>
            <div class="q5-field">
              <label for="q5FlexibleKwhDay">Energie mutabilă [kWh/zi]</label>
              <input id="q5FlexibleKwhDay" type="number" min="0" step="1" value="${esc(d.flexibleKwhDay)}" placeholder="ex. 300">
            </div>
            <div class="q5-field">
              <label for="q5BessMode">BESS / stocare</label>
              <select id="q5BessMode">
                <option value="no">Nu</option>
                <option value="yes">Da</option>
              </select>
            </div>
            <div class="q5-field">
              <label for="q5BessCapacity">Capacitate BESS [kWh]</label>
              <input id="q5BessCapacity" type="number" min="0" step="1" value="${esc(d.bessCapacityKwh)}" placeholder="ex. 1000">
            </div>
            <div class="q5-field">
              <label for="q5BessEfficiency">Randament BESS [%]</label>
              <input id="q5BessEfficiency" type="number" min="50" max="100" step="1" value="${esc(d.bessEfficiency)}">
            </div>
            <div class="q5-field">
              <label for="q5TariffConsumption">Tarif consum [lei/kWh]</label>
              <input id="q5TariffConsumption" type="number" min="0" step="0.001" value="${esc(d.tariffConsumption)}">
            </div>
            <div class="q5-field">
              <label for="q5ExportTariff">Tarif export [lei/kWh]</label>
              <input id="q5ExportTariff" type="number" min="0" step="0.001" value="${esc(d.exportTariff)}">
            </div>
          </div>

          </details>
          <div class="q5-actions">
            <span class="q5-note">Calculul afișează întâi scenariul simplu: energie utilizabilă local vs surplus. Ipotezele avansate pot fi modificate doar la nevoie.</span>
            <button class="btn next" type="button" id="q5RunBtn">Calculează utilizabilul ›</button>
          </div>
        </div>
      `;

      document.getElementById('q5ZeroExport').value = d.zeroExport;
      document.getElementById('q5FlexibleMode').value = d.flexibleMode;
      document.getElementById('q5BessMode').value = d.bessMode;
      document.getElementById('q5RunBtn')?.addEventListener('click', () => calculateQ5UsefulEnergy(box, card));
    }

    function buildQ5AdditionalProfile(ds, q4){
      const rows = ds.rows || [];
      const annualKwh = Number(q4?.results?.annualKwh || 0);
      if(!rows.length || !(annualKwh > 0)) return [];

      const start = new Date(rows[0].timestamp);
      const end = new Date(rows[rows.length-1].timestamp);
      const days = Math.max(1, (end - start) / 86400000);
      const targetPeriodKwh = annualKwh * days / 365;

      const existingPvTotal = rows.reduce((a,r)=>a + Number(r.pvKwh || 0),0);
      const monthShare = {0:.040,1:.055,2:.085,3:.105,4:.120,5:.125,6:.130,7:.120,8:.095,9:.065,10:.035,11:.025};

      if(existingPvTotal > 0){
        return rows.map(r => ({timestamp:r.timestamp, additionalPvKwh:Number(r.pvKwh || 0) / existingPvTotal * targetPeriodKwh}));
      }

      const weights = rows.map(r => {
        const d = new Date(r.timestamp);
        const h = Number(r.hour ?? d.getHours());
        const solarHour = h >= 5 && h <= 20 ? Math.sin(Math.PI * (h - 5) / 15) : 0;
        const month = isNaN(d) ? 6 : d.getMonth();
        return Math.max(0, solarHour) * (monthShare[month] || .08);
      });
      const totalWeight = weights.reduce((a,b)=>a+b,0) || 1;
      return rows.map((r,i) => ({timestamp:r.timestamp, additionalPvKwh:weights[i] / totalWeight * targetPeriodKwh}));
    }


    function safeStoreQ5Payload(payload){
      const compact = {
        compact:true,
        inputs:payload.inputs,
        source:payload.source,
        totals:payload.totals,
        createdAt:payload.createdAt
      };
      try{
        sessionStorage.setItem('svtUsefulEnergyQ5', JSON.stringify(compact));
        return true;
      }catch(err){
        console.warn('Q5 compact storage failed; continuing without persisted result', err);
        try{ sessionStorage.removeItem('svtUsefulEnergyQ5'); }catch(e){}
        return false;
      }
    }

    function calculateQ5UsefulEnergy(box, card){
      try{
        const ds = JSON.parse(sessionStorage.getItem('svtDataset') || '{}');
        const q4 = JSON.parse(sessionStorage.getItem('svtPotentialQ4') || '{}');
        if(!ds?.rows?.length) throw new Error('Lipsește curba de consum.');
        if(!q4?.results?.annualKwh) throw new Error('Lipsește producția suplimentară estimată din întrebarea 4.');

        const zeroExport = document.getElementById('q5ZeroExport')?.value || 'unknown';
        const exportLimitKw = Number(document.getElementById('q5ExportLimit')?.value || 0);
        const flexibleMode = document.getElementById('q5FlexibleMode')?.value || 'unknown';
        const flexibleKwhDay = flexibleMode === 'yes' ? Number(document.getElementById('q5FlexibleKwhDay')?.value || 0) : 0;
        const bessMode = document.getElementById('q5BessMode')?.value || 'no';
        const bessCapacityKwh = bessMode === 'yes' ? Number(document.getElementById('q5BessCapacity')?.value || 0) : 0;
        const bessEfficiency = Number(document.getElementById('q5BessEfficiency')?.value || 90) / 100;
        const tariffConsumption = Number(document.getElementById('q5TariffConsumption')?.value || 0);
        const exportTariff = Number(document.getElementById('q5ExportTariff')?.value || 0);

        const profile = buildQ5AdditionalProfile(ds, q4);
        const byTimestamp = new Map(profile.map(x => [String(new Date(x.timestamp).getTime()), x.additionalPvKwh]));

        let direct = 0, rawSurplus = 0, remainingDeficit = 0, totalAdd = 0, existingPvTotal = 0;
        const intervalRows = [];
        const dayMap = new Map();

        for(const r of ds.rows || []){
          const d = new Date(r.timestamp);
          const key = String(d.getTime());
          const addPv = Number(byTimestamp.get(key) || 0);
          const consumption = Number(r.electricKwh || r.consumptionKwh || 0);
          const existingPv = Number(r.pvKwh || 0);
          const demandAfterExisting = Math.max(0, consumption - existingPv);
          const localDirect = Math.min(demandAfterExisting, addPv);
          const surplus = Math.max(0, addPv - localDirect);
          const deficitAfter = Math.max(0, demandAfterExisting - localDirect);
          const day = isNaN(d) ? 'n/a' : d.toLocaleDateString('ro-RO', {day:'2-digit', month:'2-digit', year:'numeric'});
          const hour = isNaN(d) ? '' : d.toLocaleTimeString('ro-RO', {hour:'2-digit', minute:'2-digit'});

          totalAdd += addPv;
          existingPvTotal += existingPv;
          direct += localDirect;
          rawSurplus += surplus;
          remainingDeficit += deficitAfter;

          const out = {timestamp:r.timestamp, day, hour, consumption, demandAfterExisting, additionalPvKwh:addPv, directKwh:localDirect, surplusKwh:surplus, deficitAfterKwh:deficitAfter};
          intervalRows.push(out);

          if(!dayMap.has(day)) dayMap.set(day, {day, rows:[], surplus:0, direct:0, add:0, deficit:0});
          const g = dayMap.get(day);
          g.rows.push(out); g.surplus += surplus; g.direct += localDirect; g.add += addPv; g.deficit += deficitAfter;
        }

        let flexUseful = 0, bessUseful = 0, exportKwh = 0, curtailedKwh = 0;
        const days = Array.from(dayMap.values());

        for(const g of days){
          let s = g.surplus;
          const flex = Math.min(s, Math.max(0, flexibleKwhDay));
          flexUseful += flex;
          s -= flex;

          if(bessMode === 'yes' && bessCapacityKwh > 0){
            const charge = Math.min(s, bessCapacityKwh, g.deficit / Math.max(.5, bessEfficiency));
            const discharged = charge * Math.max(.5, Math.min(1, bessEfficiency));
            bessUseful += discharged;
            s -= charge;
          }

          if(zeroExport === 'yes') curtailedKwh += s;
          else exportKwh += s;
        }

        const usefulTotal = direct + flexUseful + bessUseful;
        const usefulPercent = totalAdd > 0 ? usefulTotal / totalAdd * 100 : 0;
        const surplusPercent = totalAdd > 0 ? (exportKwh + curtailedKwh) / totalAdd * 100 : 0;
        const localValue = usefulTotal * tariffConsumption;
        const exportValue = exportKwh * exportTariff;
        const lostOpportunity = (exportKwh + curtailedKwh) * Math.max(0, tariffConsumption - exportTariff);

        const payload = {
          inputs:{zeroExport, exportLimitKw, flexibleMode, flexibleKwhDay, bessMode, bessCapacityKwh, bessEfficiency:bessEfficiency*100, tariffConsumption, exportTariff},
          source:{q4AnnualKwh:q4.results.annualKwh, q4AdditionalKwp:q4.results.additionalKwp, datasetRows:ds.rows.length, existingPvTotal},
          totals:{totalAdd, direct, flexUseful, bessUseful, usefulTotal, exportKwh, curtailedKwh, remainingDeficit, usefulPercent, surplusPercent, localValue, exportValue, lostOpportunity},
          days,
          intervalRows,
          createdAt:new Date().toISOString()
        };

        safeStoreQ5Payload(payload);
        renderQuestion5Result(box, payload);
        card.classList.remove('loading','needs-data');
        card.classList.add('available','done');
        const badge = card.querySelector('.badge.incomplete');
        if(badge) badge.outerHTML = '<span class="answer-slot" title="Răspuns calculat">✓</span>';
      }catch(err){
        box.innerHTML = `
          <div class="q5-prereq">
            <strong>Date insuficiente</strong>
            <p>${esc(err.message || 'Verifică datele introduse.')}</p>
            <button class="btn back" type="button" onclick="renderQuestion5Form(document.getElementById('details-q5'), document.querySelector('.q-card[data-q=&quot;5&quot;]'))">Completează din nou</button>
          </div>
        `;
      }
    }


    function renderQuestion5CompactResult(box, data){
      const t = data.totals || {};
      box.innerHTML = `
        <div class="q5-result-wrap">
        <div class="q5-result-meta">
          <span class="q5-chip">PV suplimentar: ${fmt((data.source?.q4AdditionalKwp || 0),1)} kWp</span>
          <span class="q5-chip">Rezumat salvat compact</span>
          <span class="q5-chip">Pentru tabel orar complet, recalculează</span>
        </div>

        <div class="answer-summary">
          <div class="summary-card"><strong>${fmt((t.totalAdd || 0)/1000,1)} MWh/an</strong><span>producție suplimentară estimată</span></div>
          <div class="summary-card"><strong>${fmt((t.usefulTotal || 0)/1000,1)} MWh/an</strong><span>energie utilizabilă local direct/flexibil/BESS</span></div>
          <div class="summary-card"><strong>${fmt(t.usefulPercent || 0,1)}%</strong><span>procent utilizabil local</span></div>
        </div>

        <div class="top-list">
          <div class="top-row">
            <div class="rank">1</div>
            <div><strong>Utilizare directă locală</strong><small>PV suplimentar consumat simultan cu consumul disponibil</small></div>
            <div class="cost" style="color:#067436">${fmt((t.direct || 0)/1000,1)} MWh</div>
          </div>
          <div class="top-row">
            <div class="rank">2</div>
            <div><strong>Flexibilitate + BESS</strong><small>energie suplimentară valorificată prin mutare consum sau stocare</small></div>
            <div class="cost" style="color:#067436">${fmt(((t.flexUseful || 0)+(t.bessUseful || 0))/1000,1)} MWh</div>
          </div>
          <div class="top-row">
            <div class="rank">3</div>
            <div><strong>Export / limitare</strong><small>surplus care nu este utilizat local</small></div>
            <div class="cost" style="color:#b45309">${fmt(((t.exportKwh || 0)+(t.curtailedKwh || 0))/1000,1)} MWh</div>
          </div>
        </div>

        <div class="q5-actions" style="margin-top:14px">
          <span class="q5-note">Rezumatul este salvat compact pentru a nu depăși limita browserului. Tabelul orar complet se generează din nou la recalculare.</span>
          <button class="btn next" type="button" id="q5RecalcBtn">Recalculează tabelul complet ›</button>
        </div>
      `;
      document.getElementById('q5RecalcBtn')?.addEventListener('click', () => {
        sessionStorage.removeItem('svtUsefulEnergyQ5');
        renderQuestion5Form(box, document.querySelector('.q-card[data-q="5"]'));
      });
    }



    function renderQ5Bars(t){
      const values = [
        {name:'Utilizat direct', value:Number(t.direct || 0), tone:'ok'},
        {name:'Flexibilitate', value:Number(t.flexUseful || 0), tone:'ok'},
        {name:'BESS', value:Number(t.bessUseful || 0), tone:'ok'},
        {name:'Export', value:Number(t.exportKwh || 0), tone:'warn'},
        {name:'Limitat / pierdut', value:Number(t.curtailedKwh || 0), tone:'danger'}
      ];
      const max = Math.max(1, ...values.map(x => x.value));
      return `
        <div class="q5-bars" aria-label="Distribuție energie suplimentară utilizabilă">
          ${values.map(x => `
            <div class="q5-bar-row">
              <div class="q5-bar-name">${esc(x.name)}</div>
              <div class="q5-bar-track">
                <div class="q5-bar-fill ${x.tone === 'warn' ? 'warn' : x.tone === 'danger' ? 'danger' : ''}" style="width:${Math.max(2, Math.round(x.value / max * 100))}%"></div>
              </div>
              <div class="q5-bar-value">${fmt(x.value/1000,1)} MWh</div>
            </div>
          `).join('')}
        </div>
      `;
    }


    function renderQuestion5Result(box, data){
      const t = data.totals || {};
      const usefulMwh = (Number(t.usefulTotal || 0) / 1000);
      const totalMwh = (Number(t.totalAdd || 0) / 1000);
      const exportMwh = ((Number(t.exportKwh || 0) + Number(t.curtailedKwh || 0)) / 1000);
      const usefulPct = Number(t.usefulPercent || 0);
      const source = data.source || {};
      const inputs = data.inputs || {};
      const directMwh = Number(t.direct || 0) / 1000;
      const flexMwh = Number(t.flexUseful || 0) / 1000;
      const bessMwh = Number(t.bessUseful || 0) / 1000;
      const valueRon = Number(t.localValue || 0) + Number(t.exportValue || 0);

      const interpretation = usefulPct >= 80
        ? 'Producția suplimentară estimată se potrivește bine cu profilul de consum. Cea mai mare parte poate fi folosită local, deci investiția are șanse bune să reducă energia cumpărată din rețea.'
        : usefulPct >= 50
          ? 'O parte importantă din producția suplimentară poate fi utilizată local, dar rămâne și surplus. Pentru creșterea valorii, trebuie analizate consumuri mutabile, BESS sau limitări de injecție.'
          : 'Producția suplimentară estimată depășește consumul disponibil în multe intervale. Fără flexibilitate, stocare sau export avantajos, o parte mare poate deveni surplus sau energie limitată.';

      const recommendations = [
        usefulPct < 70 ? 'Dimensionează PV suplimentar în raport cu consumul diurn real, nu doar cu suprafața disponibilă.' : 'Menține dimensionarea PV suplimentară aproape de consumul diurn disponibil.',
        exportMwh > usefulMwh * 0.25 ? 'Analizează BESS sau mutarea consumurilor flexibile în orele cu surplus.' : 'Surplusul este relativ controlat; prioritizează consum local direct.',
        inputs.zeroExport === 'yes' ? 'Pentru zero-export, verifică limitarea invertorului și consumatorii care pot absorbi surplusul în timp real.' : 'Compară valoarea exportului cu valoarea autoconsumului pentru decizia economică finală.'
      ];

      box.innerHTML = `
        <div class="q5-result-wrap">
          <div class="q5-result-meta">
            <span class="q5-chip">PV suplimentar: ${fmt((source.q4AdditionalKwp || 0),1)} kWp</span>
            <span class="q5-chip">Utilizabil local: ${fmt(usefulPct,1)}%</span>
            <span class="q5-chip">Valoare estimată: ${fmt(valueRon,0)} lei/an</span>
          </div>

          <div class="answer-summary">
            <div class="summary-card"><strong>${fmt(totalMwh,1)} MWh/an</strong><span>producție suplimentară estimată</span></div>
            <div class="summary-card"><strong>${fmt(usefulMwh,1)} MWh/an</strong><span>energie utilizabilă local</span></div>
            <div class="summary-card"><strong>${fmt(exportMwh,1)} MWh/an</strong><span>export / surplus / limitare</span></div>
          </div>

          <div class="client-short-answer">Răspuns pe scurt: ${fmt(usefulMwh,1)} MWh/an din producția suplimentară ar putea fi utilizată local, iar ${fmt(exportMwh,1)} MWh/an rămân export/surplus/limitare.</div>
          ${renderQ5StableBars(t)}

          <div class="insight-grid">
            <div class="insight-card">
              <h3>Interpretare rezultat</h3>
              <p>${esc(interpretation)}</p>
            </div>
            <div class="insight-card">
              <h3>Recomandări</h3>
              <ul>${recommendations.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
            </div>
          </div>

          <div class="q5-safe-card">
            <h3>Rezumat energetic</h3>
            <ul>
              <li>Utilizare directă locală: <strong>${fmt(directMwh,1)} MWh/an</strong></li>
              <li>Flexibilitate / mutare consum: <strong>${fmt(flexMwh,1)} MWh/an</strong></li>
              <li>BESS / stocare: <strong>${fmt(bessMwh,1)} MWh/an</strong></li>
              <li>Export sau energie limitată: <strong>${fmt(exportMwh,1)} MWh/an</strong></li>
            </ul>
          </div>

          ${renderQ5StableTable(data.intervalRows || [])}
        </div>
      `;
    }

    function renderQ5StableBars(t){
      const values = [
        {name:'Utilizat direct', value:Number(t.direct || 0), tone:'ok'},
        {name:'Flexibilitate', value:Number(t.flexUseful || 0), tone:'ok'},
        {name:'BESS', value:Number(t.bessUseful || 0), tone:'ok'},
        {name:'Export', value:Number(t.exportKwh || 0), tone:'warn'},
        {name:'Limitat / pierdut', value:Number(t.curtailedKwh || 0), tone:'danger'}
      ];
      const max = Math.max(1, ...values.map(x => x.value));
      return `
        <div class="q5-safe-card">
          <h3>Distribuția energiei suplimentare</h3>
          <div class="q5-distribution">
            ${values.map(x => `
              <div class="q5-distribution-row">
                <div class="q5-distribution-label">${esc(x.name)}</div>
                <div class="q5-distribution-track">
                  <div class="q5-distribution-fill ${x.tone === 'warn' ? 'warn' : x.tone === 'danger' ? 'danger' : ''}" style="width:${Math.max(1, Math.round(x.value / max * 100))}%"></div>
                </div>
                <div class="q5-distribution-value">${fmt(x.value/1000,1)} MWh</div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    function renderQ5StableTable(rows){
      const relevant = (rows || []).filter(r => Number(r.additionalPvKwh || 0) > 0 || Number(r.directKwh || 0) > 0 || Number(r.surplusKwh || 0) > 0);
      if(!relevant.length) return '';
      const shown = relevant.slice(0, 2000);
      const hidden = relevant.length - shown.length;
      return `
        <div class="q5-detail-box">
          <div class="q5-detail-head">
            <strong>Tabel detaliat pe intervale</strong>
            <span>${shown.length} intervale afișate${hidden > 0 ? ` · încă ${hidden} intervale nu sunt afișate în browser pentru stabilitate` : ''}</span>
          </div>
          <div class="q5-detail-scroll">
            <table class="q5-stable-table">
              <thead>
                <tr>
                  <th>Ziua</th>
                  <th>Ora</th>
                  <th>Consum disp.</th>
                  <th>PV supl.</th>
                  <th>Utilizat</th>
                  <th>Surplus</th>
                </tr>
              </thead>
              <tbody>
                ${shown.map(x => `
                  <tr>
                    <td>${esc(x.day || '')}</td>
                    <td>${esc(x.hour || '')}</td>
                    <td>${fmt(x.demandAfterExisting)} kWh</td>
                    <td>${fmt(x.additionalPvKwh)} kWh</td>
                    <td>${fmt(x.directKwh)} kWh</td>
                    <td>${fmt(x.surplusKwh)} kWh</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    }


    function renderQ5DayBoard(rows){
      const relevant = (rows || []).filter(r => Number(r.additionalPvKwh || 0) > 0 || Number(r.directKwh || 0) > 0 || Number(r.surplusKwh || 0) > 0);
      if(!relevant.length) return '';
      const groups = new Map();
      for(const r of relevant){
        if(!groups.has(r.day)) groups.set(r.day, []);
        groups.get(r.day).push(r);
      }
      const cards = Array.from(groups.entries()).map(([day,list]) => {
        const add = list.reduce((a,x)=>a+Number(x.additionalPvKwh||0),0);
        const use = list.reduce((a,x)=>a+Number(x.directKwh||0),0);
        const sur = list.reduce((a,x)=>a+Number(x.surplusKwh||0),0);
        const body = list.map(x => `
          <div class="q5-hour-row">
            <div>${esc(x.hour)}</div>
            <div>${fmt(x.demandAfterExisting)} kWh</div>
            <div>${fmt(x.additionalPvKwh)} kWh</div>
            <div class="q5-useful-val">${fmt(x.directKwh)} kWh</div>
            <div class="q5-surplus-val">${fmt(x.surplusKwh)} kWh</div>
          </div>
        `).join('');
        return `
          <section class="q5-day-card">
            <div class="q5-day-head">
              <strong>${esc(day)}</strong>
              <span>PV supl. ${fmt(add)} kWh · utilizat ${fmt(use)} kWh · surplus ${fmt(sur)} kWh</span>
            </div>
            <div class="q5-hour-table">
              <div class="q5-hour-row header">
                <div>Ora</div><div>Consum disp.</div><div>PV supl.</div><div>Utilizat</div><div>Surplus</div>
              </div>
              ${body}
            </div>
          </section>
        `;
      }).join('');
      return `<div class="q5-day-board"><div class="q5-day-grid">${cards}</div></div>`;
    }



    function getQ6Defaults(){
      const ds = (() => { try{return JSON.parse(sessionStorage.getItem('svtDataset') || '{}')}catch(e){return {}} })();
      const q5 = (() => { try{return JSON.parse(sessionStorage.getItem('svtUsefulEnergyQ5') || '{}')}catch(e){return {}} })();
      const ctx = getContext();
      const tariff = Number(ds?.meta?.fixedPriceRonKwh || q5?.inputs?.tariffConsumption || ctx.fixedTariffRonKwh || 0.75);
      const exportTariff = Number(q5?.inputs?.exportTariff || 0.20);
      const surplusMwh = ((Number(q5?.totals?.exportKwh || 0) + Number(q5?.totals?.curtailedKwh || 0)) / 1000) || 0;
      return {tariff, exportTariff, surplusMwh, rows:ds.rows || []};
    }

    function handleQuestion6(cardArg){
      const card = cardArg || document.querySelector('.q-card[data-q="6"]');
      const box = document.getElementById('details-q6');
      if(!box) return;
      const stored = sessionStorage.getItem('svtFlexibleLoadsQ6');
      card.classList.add('loading');
      card.classList.remove('done');
      box.classList.add('open');
      window.setTimeout(() => {
        card.classList.remove('loading');
        if(stored){
          try{
            renderQuestion6Result(box, JSON.parse(stored));
            card.classList.add('done');
            return;
          }catch(e){}
        }
        renderQuestion6Form(box, card);
      }, 350);
    }

    function renderQuestion6Form(box, card){
      const d = getQ6Defaults();
      if(!d.rows.length){
        box.innerHTML = `
          <div class="q5-prereq">
            <strong>Date incomplete · lipsește curba de consum</strong>
            <p>Pentru a recomanda consumuri mutabile este necesară curba de consum electric încărcată inițial.</p>
          </div>
        `;
        return;
      }

      box.innerHTML = `
        <div class="q6-form">
          <div>
            <h2>Ce consumuri aș putea muta în timp?</h2>
            <p>Preluăm automat curba de consum, tariful, surplusul PV existent și surplusul estimat din producția suplimentară Q4/Q5. Completează doar procesele care pot fi mutate tehnologic.</p>
          </div>

          <div class="q6-auto-strip">
            <span class="q6-chip">Curba consum: ${fmt(d.rows.length,0)} intervale</span>
            <span class="q6-chip">Tarif consum: ${fmt(d.tariff,3)} lei/kWh</span>
            <span class="q6-chip">Export: ${fmt(d.exportTariff,3)} lei/kWh</span>
            <span class="q6-chip">Surplus Q5: ${fmt(d.surplusMwh,1)} MWh/an</span>
            <span class="q6-chip">Include surplus Q4/Q5 în recomandări</span>
          </div>

          <div class="q6-process-list" id="q6ProcessList"></div>

          <div class="q6-actions">
            <button class="btn back" type="button" id="q6AddProcessBtn">+ Adaugă consumator</button>
            <span class="q6-note">Completează consumatorii flexibili: compresoare, pompe, chillere, boilere, EV/stivuitoare, HVAC sau procese auxiliare.</span>
            <button class="btn next" type="button" id="q6RunBtn">Calculează mutarea ›</button>
          </div>
        </div>
      `;

      const defaults = [
        {name:'Compresor', category:'compresor', power:30, duration:2, currentStart:'18:00', currentEnd:'20:00', allowedStart:'10:00', allowedEnd:'15:00', flexibility:'same_day', priority:'medie'},
        {name:'Încărcare EV / stivuitor', category:'ev', power:22, duration:3, currentStart:'16:00', currentEnd:'19:00', allowedStart:'10:00', allowedEnd:'16:00', flexibility:'same_day', priority:'scazuta'},
        {name:'Boiler / pompă / HVAC', category:'hvac', power:15, duration:2, currentStart:'06:00', currentEnd:'08:00', allowedStart:'11:00', allowedEnd:'15:00', flexibility:'partial', priority:'medie'}
      ];
      defaults.forEach(x => addQ6ProcessRow(x));
      document.getElementById('q6AddProcessBtn')?.addEventListener('click', () => addQ6ProcessRow({}));
      document.getElementById('q6RunBtn')?.addEventListener('click', () => calculateQ6Shifting(box, card));
    }

    function addQ6ProcessRow(values){
      const list = document.getElementById('q6ProcessList');
      if(!list) return;
      const idx = list.querySelectorAll('.q6-process-card').length + 1;
      const v = Object.assign({name:'', category:'altul', power:'', duration:'', energy:'', currentStart:'18:00', currentEnd:'20:00', allowedStart:'10:00', allowedEnd:'16:00', flexibility:'partial', interruptible:'partial', operator:'yes', impact:'low', priority:'medie', days:'5'}, values || {});
      const node = document.createElement('section');
      node.className = 'q6-process-card';
      node.innerHTML = `
        <div class="q6-process-title">
          <strong>Consumator / proces ${idx}</strong>
          <button class="btn back" type="button" data-q6-remove>Șterge</button>
        </div>
        <div class="q6-grid">
          <div class="q6-field"><label>Denumire</label><input data-q6="name" value="${esc(v.name)}" placeholder="ex. Compresor 1"></div>
          <div class="q6-field"><label>Categorie</label><select data-q6="category">
            <option value="compresor">Compresor</option><option value="pompa">Pompă</option><option value="chiller">Chiller</option><option value="boiler">Boiler</option><option value="ev">EV / stivuitor</option><option value="hvac">HVAC</option><option value="proces">Proces auxiliar</option><option value="altul">Altul</option>
          </select></div>
          <div class="q6-field"><label>Putere [kW]</label><input data-q6="power" type="number" min="0" step="0.1" value="${esc(v.power)}"></div>
          <div class="q6-field"><label>Durată [h]</label><input data-q6="duration" type="number" min="0" step="0.25" value="${esc(v.duration)}"></div>
          <div class="q6-field"><label>Consum ciclu [kWh]</label><input data-q6="energy" type="number" min="0" step="0.1" value="${esc(v.energy)}" placeholder="opțional"></div>
          <div class="q6-field"><label>Start actual</label><input data-q6="currentStart" type="time" value="${esc(v.currentStart)}"></div>
          <div class="q6-field"><label>Stop actual</label><input data-q6="currentEnd" type="time" value="${esc(v.currentEnd)}"></div>
          <div class="q6-field"><label>Start permis</label><input data-q6="allowedStart" type="time" value="${esc(v.allowedStart)}"></div>
          <div class="q6-field"><label>Stop permis</label><input data-q6="allowedEnd" type="time" value="${esc(v.allowedEnd)}"></div>
          <div class="q6-field"><label>Zile/săpt.</label><input data-q6="days" type="number" min="1" max="7" step="1" value="${esc(v.days)}"></div>
          <div class="q6-field"><label>Flexibilitate</label><select data-q6="flexibility">
            <option value="full">Flexibil total</option><option value="partial">Flexibil parțial</option><option value="same_day">În aceeași zi</option><option value="unknown">Nu știu</option>
          </select></div>
          <div class="q6-field"><label>Poate fi întrerupt?</label><select data-q6="interruptible">
            <option value="no">Nu</option><option value="partial">Parțial</option><option value="yes">Da</option>
          </select></div>
          <div class="q6-field"><label>Necesită operator?</label><select data-q6="operator">
            <option value="yes">Da</option><option value="no">Nu</option><option value="unknown">Nu știu</option>
          </select></div>
          <div class="q6-field"><label>Impact proces</label><select data-q6="impact">
            <option value="low">Scăzut</option><option value="med">Mediu</option><option value="high">Ridicat</option>
          </select></div>
          <div class="q6-field"><label>Prioritate</label><select data-q6="priority">
            <option value="scazuta">Scăzută</option><option value="medie">Medie</option><option value="critica">Critică</option>
          </select></div>
        </div>
      `;
      list.appendChild(node);
      ['category','flexibility','interruptible','operator','impact','priority'].forEach(k => {
        const el = node.querySelector(`[data-q6="${k}"]`);
        if(el && v[k]) el.value = v[k];
      });
      node.querySelector('[data-q6-remove]')?.addEventListener('click', () => node.remove());
    }

    function timeToMinutes(value){
      const [h,m] = String(value || '00:00').split(':').map(Number);
      return (isNaN(h)?0:h)*60 + (isNaN(m)?0:m);
    }
    function hourInWindow(hour, startStr, endStr){
      const minute = hour * 60;
      const start = timeToMinutes(startStr);
      const end = timeToMinutes(endStr);
      if(start <= end) return minute >= start && minute <= end;
      return minute >= start || minute <= end;
    }

    function collectQ6Processes(){
      return Array.from(document.querySelectorAll('.q6-process-card')).map((card, i) => {
        const val = k => card.querySelector(`[data-q6="${k}"]`)?.value || '';
        const power = Number(val('power') || 0);
        const duration = Number(val('duration') || 0);
        const explicitEnergy = Number(val('energy') || 0);
        const energy = explicitEnergy > 0 ? explicitEnergy : power * duration;
        return {id:i+1, name:val('name') || `Consumator ${i+1}`, category:val('category') || 'altul', power, duration, energy, currentStart:val('currentStart') || '18:00', currentEnd:val('currentEnd') || '20:00', allowedStart:val('allowedStart') || '10:00', allowedEnd:val('allowedEnd') || '16:00', days:Number(val('days') || 5), flexibility:val('flexibility') || 'partial', interruptible:val('interruptible') || 'partial', operator:val('operator') || 'yes', impact:val('impact') || 'low', priority:val('priority') || 'medie'};
      }).filter(x => x.energy > 0 && x.duration > 0);
    }

    function buildQ6HourlySignals(){
      const ds = (() => { try{return JSON.parse(sessionStorage.getItem('svtDataset') || '{}')}catch(e){return {}} })();
      const q4 = (() => { try{return JSON.parse(sessionStorage.getItem('svtPotentialQ4') || '{}')}catch(e){return {}} })();
      const rows = ds.rows || [];
      const additionalProfile = q4?.results?.annualKwh ? buildQ5AdditionalProfile(ds, q4) : [];
      const addByTs = new Map(additionalProfile.map(x => [String(new Date(x.timestamp).getTime()), Number(x.additionalPvKwh || 0)]));
      const buckets = Array.from({length:24}, (_,h)=>({hour:h, consumption:0, surplus:0, count:0, pv:0, additionalPv:0}));
      for(const r of rows){
        const d = new Date(r.timestamp);
        const h = Number(r.hour ?? d.getHours());
        if(h < 0 || h > 23) continue;
        const consumption = Number(r.electricKwh || r.consumptionKwh || 0);
        const existingPv = Number(r.pvKwh || 0);
        const additionalPv = Number(addByTs.get(String(d.getTime())) || 0);
        const demandAfterExisting = Math.max(0, consumption - existingPv);
        const surplusFromAdditional = Math.max(0, additionalPv - demandAfterExisting);
        const existingSurplus = Math.max(0, existingPv - consumption);
        const surplus = surplusFromAdditional + existingSurplus;
        buckets[h].consumption += consumption;
        buckets[h].pv += existingPv;
        buckets[h].additionalPv += additionalPv;
        buckets[h].surplus += surplus;
        buckets[h].count += 1;
      }
      return buckets.map(b => {
        const c = Math.max(1,b.count);
        const solarHour = b.hour >= 6 && b.hour <= 19 ? Math.sin(Math.PI * (b.hour - 6) / 13) : 0;
        return {hour:b.hour, avgConsumption:b.consumption / c, avgPv:b.pv / c, avgAdditionalPv:b.additionalPv / c, avgSurplus:b.surplus / c, solarScore:Math.max(0, solarHour)};
      });
    }

    function calculateQ6Shifting(box, card){
      try{
        const processes = collectQ6Processes();
        if(!processes.length) throw new Error('Adaugă cel puțin un consumator flexibil cu putere/durată sau consum ciclu.');
        const defaults = getQ6Defaults();
        const signals = buildQ6HourlySignals();
        const maxConsumption = Math.max(1, ...signals.map(x => x.avgConsumption));
        const maxSurplus = Math.max(1, ...signals.map(x => x.avgSurplus));

        const results = processes.map(p => {
          const allowed = signals.filter(s => hourInWindow(s.hour, p.allowedStart, p.allowedEnd));
          const candidates = allowed.length ? allowed : signals;
          let best = candidates[0];
          let bestScore = -Infinity;
          for(const s of candidates){
            const surplusScore = s.avgSurplus / maxSurplus;
            const lowPeakScore = 1 - s.avgConsumption / maxConsumption;
            const solarScore = s.solarScore;
            const score = surplusScore * 0.55 + solarScore * 0.25 + lowPeakScore * 0.20;
            if(score > bestScore){ bestScore = score; best = s; }
          }
          const currentStartHour = Math.floor(timeToMinutes(p.currentStart) / 60);
          const currentSignal = signals[currentStartHour] || {avgSurplus:0, avgConsumption:0};
          const currentUseful = Math.min(p.energy, currentSignal.avgSurplus || 0);
          const recommendedUseful = Math.min(p.energy, best.avgSurplus || 0);
          const extraAbsorbed = Math.max(0, recommendedUseful - currentUseful);
          const annualCycles = p.days * 52;
          const annualMoved = p.energy * annualCycles / 1000;
          const annualUseful = extraAbsorbed * annualCycles / 1000;
          const annualSaving = extraAbsorbed * annualCycles * Math.max(0, defaults.tariff - defaults.exportTariff);
          const impactClass = p.impact === 'high' || p.priority === 'critica' ? 'q6-impact-high' : p.impact === 'med' ? 'q6-impact-med' : 'q6-impact-low';
          const recStart = `${String(best.hour).padStart(2,'0')}:00`;
          const recEndHour = Math.min(23, best.hour + Math.ceil(p.duration));
          const recEnd = `${String(recEndHour).padStart(2,'0')}:00`;
          return {...p, recommendedStart:recStart, recommendedEnd:recEnd, score:bestScore, avgSurplusAtTarget:best.avgSurplus, currentUseful, recommendedUseful, extraAbsorbed, annualMoved, annualUseful, annualSaving, impactClass};
        });

        const totalMovedMwh = results.reduce((a,x)=>a+x.annualMoved,0);
        const totalUsefulMwh = results.reduce((a,x)=>a+x.annualUseful,0);
        const totalSaving = results.reduce((a,x)=>a+x.annualSaving,0);
        const bestCount = results.filter(x => x.annualUseful > 0).length;
        const payload = {compact:true, inputs:{tariff:defaults.tariff, exportTariff:defaults.exportTariff}, totals:{totalMovedMwh,totalUsefulMwh,totalSaving,bestCount,processCount:results.length}, results, createdAt:new Date().toISOString()};
        try{ sessionStorage.setItem('svtFlexibleLoadsQ6', JSON.stringify(payload)); }catch(e){ console.warn('Q6 compact storage skipped', e); }
        renderQuestion6Result(box, payload);
        card.classList.remove('loading','needs-data');
        card.classList.add('available','done');
        const badge = card.querySelector('.badge.incomplete');
        if(badge) badge.outerHTML = '<span class="answer-slot" title="Răspuns calculat">✓</span>';
      }catch(err){
        box.innerHTML = `<div class="q5-prereq"><strong>Date insuficiente</strong><p>${esc(err.message || 'Verifică datele introduse.')}</p><button class="btn back" type="button" onclick="renderQuestion6Form(document.getElementById('details-q6'), document.querySelector('.q-card[data-q=&quot;6&quot;]'))">Completează din nou</button></div>`;
      }
    }

    function renderQuestion6Result(box, data){
      const t = data.totals || {};
      const rows = data.results || [];
      box.innerHTML = `
        <div class="q6-result-wrap">
          <div class="q6-auto-strip">
            <span class="q6-chip">${fmt(t.processCount || 0,0)} consumatori analizați</span>
            <span class="q6-chip">${fmt(t.totalMovedMwh || 0,1)} MWh/an mutabili</span>
            <span class="q6-chip">${fmt(t.totalUsefulMwh || 0,1)} MWh/an absorbiți util</span>
            <span class="q6-chip">${fmt(t.totalSaving || 0,0)} lei/an economie estimată</span>
          </div>
          <div class="answer-summary">
            <div class="summary-card"><strong>${fmt(t.totalMovedMwh || 0,1)} MWh/an</strong><span>consum mutabil estimat</span></div>
            <div class="summary-card"><strong>${fmt(t.totalUsefulMwh || 0,1)} MWh/an</strong><span>surplus PV absorbit util</span></div>
            <div class="summary-card"><strong>${fmt(t.totalSaving || 0,0)} lei/an</strong><span>economie orientativă</span></div>
          </div>
          ${renderQ6Bars(data)}
          <div class="insight-grid">
            <div class="insight-card"><h3>Interpretare</h3><p>${esc(t.totalUsefulMwh > 0 ? 'Există consumuri care pot fi mutate în ore mai bune energetic. Recomandarea urmărește în primul rând orele cu surplus PV și în al doilea rând evitarea vârfurilor de consum.' : 'Nu s-a identificat suficient surplus disponibil pentru procesele introduse. Poate fi nevoie de ferestre tehnologice mai largi, BESS sau redimensionarea PV suplimentar.')}</p></div>
            <div class="insight-card"><h3>Recomandări</h3><ul><li>Mută consumatorii cu impact scăzut în orele recomandate din tabel.</li><li>Consumatorii critici trebuie validați cu responsabilul de producție înainte de programare automată.</li><li>Pentru surplus rămas mare, combină flexibilizarea cu BESS sau limitare controlată a invertorului.</li></ul></div>
          </div>
          <div class="q6-table-box">
            <div class="q6-table-head"><strong>Consumuri recomandate pentru mutare</strong><span>Intervalele sunt orientative și trebuie validate cu procesul tehnologic.</span></div>
            <div class="q6-table-scroll"><table class="q6-table"><thead><tr><th>Consumator</th><th>Categorie</th><th>Consum/ciclu</th><th>Actual</th><th>Recomandat</th><th>Util absorbit</th><th>Economie</th><th>Impact</th></tr></thead><tbody>
              ${rows.map(r => `<tr><td>${esc(r.name)}</td><td>${esc(r.category)}</td><td>${fmt(r.energy)} kWh</td><td>${esc(r.currentStart)}–${esc(r.currentEnd)}</td><td>${esc(r.recommendedStart)}–${esc(r.recommendedEnd)}</td><td>${fmt(r.annualUseful,1)} MWh/an</td><td>${fmt(r.annualSaving,0)} lei/an</td><td class="${esc(r.impactClass)}">${esc(r.impact === 'high' ? 'Ridicat' : r.impact === 'med' ? 'Mediu' : 'Scăzut')}</td></tr>`).join('')}
            </tbody></table></div>
          </div>
        </div>
      `;
    }

    function renderQ6Bars(data){
      const rows = data.results || [];
      const max = Math.max(1, ...rows.map(x => Number(x.annualUseful || 0)));
      return `<div class="q6-bars">${rows.map(x => `<div class="q6-bar-row"><div class="q6-bar-name">${esc(x.name)}</div><div class="q6-bar-track"><div class="q6-bar-fill ${x.annualUseful <= 0 ? 'warn' : ''}" style="width:${Math.max(2, Math.round(Number(x.annualUseful || 0) / max * 100))}%"></div></div><div class="q6-bar-value">${fmt(x.annualUseful || 0,1)} MWh/an</div></div>`).join('')}</div>`;
    }


    // Momentan butonul Continuă nu face nimic.
    document.getElementById('continueBtn')?.addEventListener('click', () => {});
    resetDerivedResultsIfDataChanged();
    render();
  
