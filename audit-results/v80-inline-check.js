
    const tabElectric = document.getElementById('tabElectric');
    const tabTermic = document.getElementById('tabTermic');
    const electricSection = document.getElementById('electricSection');
    const termicSection = document.getElementById('termicSection');
    const methodFileCard = document.getElementById('methodFileCard');
    const methodInvoiceCard = document.getElementById('methodInvoiceCard');
    const fileModeBox = document.getElementById('fileModeBox');
    const invoiceBox = document.getElementById('invoiceBox');
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const chooseBtn = document.getElementById('chooseBtn');
    const fileName = document.getElementById('fileName');
    const invoiceDrop = document.getElementById('invoiceDrop');
    const invoiceInput = document.getElementById('invoiceInput');
    const invoiceChoose = document.getElementById('invoiceChoose');
    const invoiceFileName = document.getElementById('invoiceFileName');
    const productionBox = document.getElementById('productionBox');
    const hasProduction = document.getElementById('hasProduction');
    const productionDrop = document.getElementById('productionDrop');
    const productionInput = document.getElementById('productionInput');
    const productionChoose = document.getElementById('productionChoose');
    const productionFileName = document.getElementById('productionFileName');
    const fixedTariff = document.getElementById('fixedTariff');
    const continueBtn = document.getElementById('continueBtn');
    const message = document.getElementById('message');

    let currentTab = 'electric';
    let loadMethod = 'file';
    let consumptionFiles = [];
    let productionFiles = [];
    let invoiceFile = null;
    let embeddedProductionDetected = false;

    function showMessage(type, text){ message.className = 'message ' + type; message.textContent = text; }

    function fileListText(files, singular, plural){
      if(!files || !files.length) return '';
      const names = files.map(f => f.name);
      if(files.length === 1) return `${singular}: ${names[0]}`;
      return `${plural} (${files.length}): ${names.join(', ')}`;
    }

    function setTab(tab){
      currentTab = tab;
      const electric = tab === 'electric';
      tabElectric.classList.toggle('active', electric);
      tabTermic.classList.toggle('active', !electric);
      electricSection.style.display = electric ? 'block' : 'none';
      termicSection.style.display = electric ? 'none' : 'block';
      document.body.setAttribute('data-energy-mode', electric ? 'electric' : 'termic');
      message.className = 'message';
      message.textContent = '';
      validateForm();
    }

    function setLoadMethod(method){
      loadMethod = method;
      methodFileCard.classList.toggle('active', method === 'file');
      methodInvoiceCard.classList.toggle('active', method === 'invoice');
      fileModeBox.style.display = method === 'file' ? 'grid' : 'none';
      invoiceBox.style.display = method === 'invoice' ? 'block' : 'none';
      validateForm();
    }

    function validateFiles(files){
      for(const file of files){
        if(file.size > 10 * 1024 * 1024){
          throw new Error(`Fișierul ${file.name} este prea mare. Dimensiunea maximă permisă este 10 MB / fișier.`);
        }
      }
    }

    function aggregateDatasets(datasets, mode, tariff){
      const map = new Map();
      const fileNames = [];
      const profiles = new Set();
      let hasEmbeddedProduction = false;
      for(const ds of datasets){
        if(!ds || !ds.rows) continue;
        if(ds.meta?.fileName) fileNames.push(ds.meta.fileName);
        if(ds.meta?.sourceProfile) profiles.add(ds.meta.sourceProfile);
        if(ds.meta?.hasEmbeddedProduction || ds.meta?.productionDetectedInMainFile) hasEmbeddedProduction = true;
        for(const r of ds.rows){
          const t = new Date(r.timestamp).getTime();
          if(!Number.isFinite(t)) continue;
          const key = String(t);
          const existing = map.get(key) || { timestamp:new Date(t).toISOString(), localLabel:new Date(t).toLocaleString('ro-RO',{dateStyle:'short',timeStyle:'short'}), hour:new Date(t).getHours(), minute:new Date(t).getMinutes(), electricKwh:0, electricExportKwh:0, reactiveInductiveKvarh:0, reactiveCapacitiveKvarh:0, thermalKwh:0, pvKwh:0, priceRonKwh:tariff };
          if(mode === 'production') existing.pvKwh += Number(r.pvKwh || r.electricKwh || 0);
          else {
            existing.electricKwh += Number(r.electricKwh || 0);
            existing.electricExportKwh += Number(r.electricExportKwh || 0);
            existing.reactiveInductiveKvarh += Number(r.reactiveInductiveKvarh || 0);
            existing.reactiveCapacitiveKvarh += Number(r.reactiveCapacitiveKvarh || 0);
            existing.thermalKwh += Number(r.thermalKwh || 0);
            existing.pvKwh += Number(r.pvKwh || 0);
          }
          map.set(key, existing);
        }
      }
      const rows = Array.from(map.values()).sort((a,b)=>new Date(a.timestamp)-new Date(b.timestamp));
      const start = rows[0]?.timestamp || null;
      const end = rows[rows.length-1]?.timestamp || null;
      const intervalMinutes = rows.length > 1 ? Math.max(1, Math.round((new Date(rows[1].timestamp)-new Date(rows[0].timestamp))/60000)) : 60;
      return { rows, meta:{ fileName:fileNames.length > 1 ? `${fileNames.length} fișiere încărcate` : (fileNames[0] || 'fișier încărcat'), fileNames, sourceProfile:profiles.size > 1 ? 'multi_file_merged' : (Array.from(profiles)[0] || (mode === 'production' ? 'production_multi_file' : 'electric_multi_file')), intervalMinutes, fixedPriceRonKwh:tariff, rowsCount:rows.length, start, end, hasEmbeddedProduction, productionDetectedInMainFile:hasEmbeddedProduction, parserVersion:'v75' } };
    }

    async function parseAndMergeFiles(files, mode, tariff){
      const arr = Array.from(files || []);
      validateFiles(arr);
      const datasets = [];
      for(const file of arr){ datasets.push(await SVTLoadCurveProfiles.parseFile(file, {mode, fixedPriceRonKwh:tariff})); }
      return aggregateDatasets(datasets, mode, tariff);
    }

    async function handlePickedFiles(files, targetNameEl, targetZoneEl, targetType){
      const arr = Array.from(files || []).filter(Boolean);
      if(!arr.length) return;
      try{ validateFiles(arr); } catch(e){ showMessage('err', e.message || String(e)); return; }
      targetZoneEl.classList.add('has-file');
      if(targetType === 'consumption'){
        consumptionFiles = arr;
        targetNameEl.textContent = fileListText(arr, 'Fișier selectat', 'Fișiere selectate');
        embeddedProductionDetected = false;
        productionBox.classList.remove('embedded');
        try{
          const previewDataset = await parseAndMergeFiles(consumptionFiles, 'electric', Number(fixedTariff.value || 0.75));
          embeddedProductionDetected = !!(previewDataset?.meta?.productionDetectedInMainFile || previewDataset?.rows?.some(r => Number(r.pvKwh || 0) > 0));
          if(embeddedProductionDetected){
            hasProduction.checked = true;
            productionBox.classList.add('visible','embedded');
            const banner = document.getElementById('productionExistingBanner');
            if(banner) banner.textContent = 'Date producție existente în fișierul de consum încărcat mai sus';
            showMessage('ok', `${arr.length === 1 ? 'Fișier selectat' : 'Fișiere selectate'}: ${arr.length}. Am detectat și date de producție locală în fișierul principal.`);
          } else {
            if(!hasProduction.checked) productionBox.classList.remove('visible');
            showMessage('ok', `${arr.length === 1 ? 'Fișier selectat' : 'Fișiere selectate'}: ${arr.length}. Datele vor fi unite cronologic pentru analiză.`);
          }
        } catch(e){ showMessage('ok', `${arr.length === 1 ? 'Fișier selectat' : 'Fișiere selectate'}: ${arr.length}. Datele vor fi procesate la continuare.`); }
      }
      if(targetType === 'production'){
        productionFiles = arr;
        targetNameEl.textContent = fileListText(arr, 'Fișier de producție selectat', 'Fișiere de producție selectate');
        productionBox.classList.remove('embedded');
        embeddedProductionDetected = false;
        showMessage(consumptionFiles.length ? 'ok' : 'warn', `${arr.length === 1 ? 'Fișier de producție selectat' : 'Fișiere de producție selectate'}: ${arr.length}.`);
      }
      if(targetType === 'invoice'){
        invoiceFile = arr[0];
        targetNameEl.textContent = fileListText([invoiceFile], 'Factură selectată', 'Facturi selectate');
        showMessage('ok', `Factură selectată: ${invoiceFile.name}`);
      }
      validateForm();
    }

    function wireDropZone(zone, input, btn, nameEl, type){
      if(!zone || !input || !btn || !nameEl) return;
      btn.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); input.click(); });
      zone.addEventListener('click', e => { if(e.target !== btn) input.click(); });
      ['dragenter','dragover'].forEach(ev => zone.addEventListener(ev, e => { e.preventDefault(); zone.classList.add('drag'); }));
      ['dragleave','drop'].forEach(ev => zone.addEventListener(ev, e => { e.preventDefault(); zone.classList.remove('drag'); }));
      zone.addEventListener('drop', e => { e.preventDefault(); const files = Array.from(e.dataTransfer.files || []); if(files.length) handlePickedFiles(files, nameEl, zone, type); });
      input.addEventListener('change', e => { const files = Array.from(e.target.files || []); if(files.length) handlePickedFiles(files, nameEl, zone, type); });
    }

    function validateForm(){
      const tariffOk = Number(fixedTariff.value) > 0;
      let dataOk = true;
      if(currentTab === 'electric'){
        if(loadMethod === 'file') dataOk = consumptionFiles.length > 0;
        else dataOk = Number(document.getElementById('invoiceConsumption').value || 0) > 0 && Number(document.getElementById('invoiceDays').value || 0) > 0;
      }
      continueBtn.disabled = !(tariffOk && dataOk);
    }

    function buildInvoiceDataset(){
      const total = Number(document.getElementById('invoiceConsumption').value || 0);
      const days = Number(document.getElementById('invoiceDays').value || 30);
      const schedule = document.getElementById('workSchedule').value;
      const rows = [];
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      const hourlyWeights = Array.from({length:24}, (_,h) => { if(schedule.includes('24/7')) return 1; if(schedule.includes('6–22')) return h>=6 && h<22 ? 1.6 : .35; if(schedule.includes('8–18')) return h>=8 && h<18 ? 2.2 : .25; if(schedule.includes('Luni–Sâmbătă')) return h>=7 && h<19 ? 1.7 : .35; return h>=8 && h<18 ? 2 : .4; });
      const totalWeight = hourlyWeights.reduce((a,b)=>a+b,0) * days;
      for(let d=0; d<days; d++) for(let h=0; h<24; h++){
        const ts = new Date(start.getTime() + (d*24+h)*3600000);
        const kwh = total * hourlyWeights[h] / totalWeight;
        rows.push({ timestamp: ts.toISOString(), localLabel: ts.toLocaleString('ro-RO', {day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit'}), hour: h, minute: 0, electricKwh: kwh, pvKwh: 0, priceRonKwh: Number(fixedTariff.value || 0) });
      }
      return { rows, meta:{ fileName:'Estimare din factura lunară', sourceProfile:'invoice_monthly_manual_estimate', rowsCount:rows.length, intervalMinutes:60, fixedPriceRonKwh:Number(fixedTariff.value || 0), invoiceFileName: invoiceFile ? invoiceFile.name : null, warning:'Estimare: factura lunară nu conține distribuția reală pe ore.' } };
    }

    function createSVTDataFingerprint(dataset, tariff, loadMethod, sourceType){
      const rows = dataset?.rows || [];
      const totalConsumption = rows.reduce((a,r)=>a + Number(r.electricKwh || r.consumptionKwh || 0),0);
      const totalProduction = rows.reduce((a,r)=>a + Number(r.pvKwh || 0),0);
      const first = rows[0]?.timestamp || '';
      const last = rows[rows.length-1]?.timestamp || '';
      const files = [...(dataset?.meta?.fileNames || []), ...(dataset?.meta?.productionFileNames || [])].join('|');
      return [loadMethod || '', sourceType || 'total', Number(tariff || 0).toFixed(4), rows.length, totalConsumption.toFixed(3), totalProduction.toFixed(3), first, last, files].join('::');
    }

    function clearDerivedQuestionResults(){ ['svtForecastQ3','svtPotentialQ4','svtUsefulEnergyQ5','svtFlexibleLoadsQ6'].forEach(k => { try{ sessionStorage.removeItem(k); }catch(e){} }); }

    async function continueFlow(){
      try{
        if(!window.SVTLoadCurveProfiles || !window.SVTAnalysisEngine){ showMessage('err', 'Modulele de analiză nu s-au încărcat corect. Reîncarcă pagina cu Ctrl+F5.'); return; }
        showMessage('warn', 'Procesăm datele...');
        const tariff = Number(fixedTariff.value || 0.75);
        const consumptionDataSource = document.getElementById('consumptionDataSource')?.value || 'total';
        if(currentTab === 'termic'){
          const navigatorContext = { selectedMode:'termic', loadMethod:'thermal', hasElectricData:false, hasThermalData:true, hasProduction:false, fixedTariffRonKwh:tariff, thermal:{ monitored: document.getElementById('thermalMonitored')?.value || '', source: document.getElementById('thermalSource')?.value || '', annualValue: Number(document.getElementById('annualThermal')?.value || 0), unit: document.getElementById('thermalUnit')?.value || '' }, createdAt:new Date().toISOString() };
          sessionStorage.setItem('svtNavigatorContext', JSON.stringify(navigatorContext));
          localStorage.setItem('svtNavigatorContext', JSON.stringify(navigatorContext));
          window.location.href = './testeaza-gratuit.html';
          return;
        }
        let dataset;
        if(loadMethod === 'file'){
          if(!consumptionFiles || !consumptionFiles.length){ showMessage('err', 'Pentru a continua este obligatoriu să încarci fișierul / fișierele cu consumul electric.'); return; }
          dataset = await parseAndMergeFiles(consumptionFiles, 'electric', tariff);
        } else dataset = buildInvoiceDataset();
        if(hasProduction.checked && productionFiles.length && !embeddedProductionDetected){
          const productionDataset = await parseAndMergeFiles(productionFiles, 'production', tariff);
          dataset = SVTAnalysisEngine.mergeProduction(dataset, productionDataset);
          dataset.meta.productionFileNames = productionDataset.meta.fileNames || [];
        }
        if(embeddedProductionDetected || dataset?.meta?.productionDetectedInMainFile || dataset?.rows?.some(r => Number(r.pvKwh || 0) > 0)){ dataset.meta.hasEmbeddedProduction = true; dataset.meta.productionDetectedInMainFile = true; }
        dataset.meta.fixedPriceRonKwh = tariff;
        dataset.meta.consumptionDataSource = consumptionDataSource;
        dataset.meta.dataFingerprint = createSVTDataFingerprint(dataset, tariff, loadMethod, consumptionDataSource);
        clearDerivedQuestionResults();
        const analysis = SVTAnalysisEngine.analyzeQuestion1(dataset, {fixedTariffRonKwh:tariff});
        analysis.meta.loadMethod = loadMethod;
        analysis.meta.invoiceFileName = invoiceFile ? invoiceFile.name : null;
        analysis.meta.fileNames = dataset.meta.fileNames || [];
        analysis.meta.productionFileNames = dataset.meta.productionFileNames || [];
        analysis.meta.consumptionDataSource = consumptionDataSource;
        analysis.meta.dataFingerprint = dataset.meta.dataFingerprint;
        sessionStorage.setItem('svtDataset', JSON.stringify(dataset));
        sessionStorage.setItem('svtAnalysis', JSON.stringify(analysis));
        sessionStorage.setItem('svtData', JSON.stringify({ question:analysis.question, fixedTariffRonKwh:tariff, loadMethod, consumptionDataSource, dataFingerprint:dataset.meta.dataFingerprint, hasProduction:analysis.meta.hasProduction || !!dataset.meta.hasEmbeddedProduction, invoiceFileName:invoiceFile ? invoiceFile.name : null, fileNames:dataset.meta.fileNames || [], productionFileNames:dataset.meta.productionFileNames || [] }));
        const navigatorContext = { selectedMode: currentTab, loadMethod, hasElectricData: currentTab === 'electric', hasThermalData: currentTab === 'termic', hasProduction: !!((hasProduction.checked && productionFiles.length) || embeddedProductionDetected || dataset.meta.hasEmbeddedProduction), hasInvoiceOnly: loadMethod === 'invoice', hasHourlyFile: loadMethod === 'file' && consumptionFiles.length > 0, fixedTariffRonKwh: tariff, consumptionDataSource, dataFingerprint: dataset.meta.dataFingerprint, fileCount: consumptionFiles.length, productionFileCount: productionFiles.length, thermal:{ monitored: document.getElementById('thermalMonitored')?.value || '', source: document.getElementById('thermalSource')?.value || '', annualValue: Number(document.getElementById('annualThermal')?.value || 0), unit: document.getElementById('thermalUnit')?.value || '' }, createdAt: new Date().toISOString() };
        sessionStorage.setItem('svtNavigatorContext', JSON.stringify(navigatorContext));
        localStorage.setItem('svtNavigatorContext', JSON.stringify(navigatorContext));
        window.location.href = './testeaza-gratuit.html';
      } catch(err){ console.error(err); showMessage('err', err.message || 'Nu am putut procesa datele încărcate.'); }
    }

    tabElectric.addEventListener('click', () => setTab('electric'));
    tabTermic.addEventListener('click', () => setTab('termic'));
    methodFileCard.addEventListener('click', () => setLoadMethod('file'));
    methodInvoiceCard.addEventListener('click', () => setLoadMethod('invoice'));
    hasProduction.addEventListener('change', () => { productionBox.classList.toggle('visible', hasProduction.checked); if(!hasProduction.checked){ productionBox.classList.remove('embedded'); embeddedProductionDetected = false; productionFiles = []; productionFileName.textContent = ''; productionDrop.classList.remove('has-file'); } validateForm(); });
    fixedTariff.addEventListener('input', validateForm);
    document.getElementById('invoiceConsumption').addEventListener('input', validateForm);
    document.getElementById('invoiceDays').addEventListener('input', validateForm);
    continueBtn.addEventListener('click', continueFlow);

    wireDropZone(dropZone, fileInput, chooseBtn, fileName, 'consumption');
    wireDropZone(productionDrop, productionInput, productionChoose, productionFileName, 'production');
    wireDropZone(invoiceDrop, invoiceInput, invoiceChoose, invoiceFileName, 'invoice');

    function initDistributorHelpModal(){
      const modal = document.getElementById('distributorHelpModal');
      const closeBtn = document.getElementById('closeDistributorHelp');
      const openButtons = Array.from(document.querySelectorAll('[data-open-distributor-help], #openDistributorHelp'));
      const tabs = Array.from(document.querySelectorAll('[data-dist-tab]'));
      const panels = Array.from(document.querySelectorAll('[data-dist-panel]'));
      if(!modal || !closeBtn || !openButtons.length) return;
      const openModal = () => { modal.classList.add('open'); modal.setAttribute('aria-hidden','false'); document.body.style.overflow = 'hidden'; };
      const closeModal = () => { modal.classList.remove('open'); modal.setAttribute('aria-hidden','true'); document.body.style.overflow = ''; };
      const activateTab = (id) => { tabs.forEach(tab => { const active = tab.getAttribute('data-dist-tab') === id; tab.classList.toggle('active', active); tab.setAttribute('aria-selected', active ? 'true' : 'false'); }); panels.forEach(panel => { const active = panel.getAttribute('data-dist-panel') === id; panel.classList.toggle('active', active); panel.style.display = active ? 'grid' : 'none'; }); };
      openButtons.forEach(btn => btn.addEventListener('click', (event) => { event.preventDefault(); openModal(); const active = tabs.find(t => t.classList.contains('active'))?.getAttribute('data-dist-tab') || tabs[0]?.getAttribute('data-dist-tab'); if(active) activateTab(active); }));
      closeBtn.addEventListener('click', closeModal);
      modal.addEventListener('click', (event) => { if(event.target === modal) closeModal(); });
      document.addEventListener('keydown', (event) => { if(event.key === 'Escape' && modal.classList.contains('open')) closeModal(); });
      tabs.forEach(tab => { tab.setAttribute('role','tab'); tab.addEventListener('click', (event) => { event.preventDefault(); activateTab(tab.getAttribute('data-dist-tab')); }); });
      panels.forEach(panel => panel.setAttribute('role','tabpanel'));
      activateTab(tabs.find(t => t.classList.contains('active'))?.getAttribute('data-dist-tab') || tabs[0]?.getAttribute('data-dist-tab') || 'deer');
    }

    validateForm();
    document.addEventListener('DOMContentLoaded', initDistributorHelpModal);
  
