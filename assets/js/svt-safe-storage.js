/* SVT v248 — quota-safe session payload + full dataset IndexedDB retention */
(function(root){
  'use strict';
  const DB_NAME = 'svt-energy-navigator';
  const DB_VERSION = 1;
  const STORE_NAME = 'datasets';
  const ACTIVE_KEY = 'active-full-dataset';
  const DEFAULT_TARGET_ROWS = 6500;
  const FALLBACK_TARGET_ROWS = 2200;

  function num(value){
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }

  function parseJson(value, fallback){
    try{ return value ? JSON.parse(value) : fallback; }
    catch(e){ return fallback; }
  }

  function openDb(){
    return new Promise((resolve, reject) => {
      if(!root.indexedDB){ reject(new Error('IndexedDB unavailable')); return; }
      const request = root.indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if(!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('IndexedDB open failed'));
    });
  }

  async function persistFullDataset(dataset){
    try{
      const db = await openDb();
      await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put({dataset, savedAt:new Date().toISOString()}, ACTIVE_KEY);
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error || new Error('IndexedDB write failed'));
        tx.onabort = () => reject(tx.error || new Error('IndexedDB write aborted'));
      });
      db.close();
      return true;
    }catch(e){
      console.warn('[SVT v248] Full dataset IndexedDB retention unavailable:', e);
      return false;
    }
  }

  async function readFullDataset(){
    try{
      const db = await openDb();
      const value = await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const req = tx.objectStore(STORE_NAME).get(ACTIVE_KEY);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error || new Error('IndexedDB read failed'));
      });
      db.close();
      return value?.dataset || null;
    }catch(e){ return null; }
  }

  function compactRow(row){
    const timestamp = row?.timestamp || row?.date || '';
    const d = timestamp ? new Date(timestamp) : null;
    const validDate = d && !Number.isNaN(d.getTime());
    const electricKwh = num(row?.electricKwh ?? row?.consumptionKwh);
    const thermalKwh = num(row?.thermalKwh);
    const pvKwh = num(row?.pvKwh ?? row?.productionKwh);
    return {
      timestamp: validDate ? d.toISOString() : String(timestamp || ''),
      localLabel: String(row?.localLabel || (validDate ? d.toLocaleString('ro-RO',{dateStyle:'short',timeStyle:'short'}) : '')),
      hour: Number.isFinite(Number(row?.hour)) ? Number(row.hour) : (validDate ? d.getHours() : 0),
      minute: Number.isFinite(Number(row?.minute)) ? Number(row.minute) : (validDate ? d.getMinutes() : 0),
      electricKwh,
      consumptionKwh: num(row?.consumptionKwh) || electricKwh || thermalKwh,
      electricExportKwh: num(row?.electricExportKwh),
      reactiveInductiveKvarh: num(row?.reactiveInductiveKvarh),
      reactiveCapacitiveKvarh: num(row?.reactiveCapacitiveKvarh),
      thermalKwh,
      pvKwh,
      priceRonKwh: num(row?.priceRonKwh ?? row?.fixedTariffRonKwh)
    };
  }

  function aggregateRows(rows, targetRows){
    const clean = (rows || []).map(compactRow).filter(r => r.timestamp && !Number.isNaN(new Date(r.timestamp).getTime()));
    if(clean.length <= targetRows) return clean;
    clean.sort((a,b)=>new Date(a.timestamp)-new Date(b.timestamp));
    const firstMs = new Date(clean[0].timestamp).getTime();
    const lastMs = new Date(clean[clean.length-1].timestamp).getTime();
    const durationMs = Math.max(1, lastMs - firstMs);
    const rawBucketMinutes = Math.max(1, Math.ceil(durationMs / Math.max(1,targetRows-1) / 60000));
    const rounding = rawBucketMinutes <= 60 ? 15 : 60;
    const bucketMinutes = Math.max(rounding, Math.ceil(rawBucketMinutes / rounding) * rounding);
    const bucketMs = bucketMinutes * 60000;
    const buckets = new Map();

    for(const r of clean){
      const t = new Date(r.timestamp).getTime();
      const key = Math.floor((t - firstMs) / bucketMs);
      let b = buckets.get(key);
      if(!b){
        const start = new Date(firstMs + key * bucketMs);
        b = {
          timestamp:start.toISOString(),
          localLabel:start.toLocaleString('ro-RO',{dateStyle:'short',timeStyle:'short'}),
          hour:start.getHours(), minute:start.getMinutes(),
          electricKwh:0, consumptionKwh:0, electricExportKwh:0,
          reactiveInductiveKvarh:0, reactiveCapacitiveKvarh:0,
          thermalKwh:0, pvKwh:0, priceWeighted:0, priceWeight:0, priceSum:0, priceCount:0
        };
        buckets.set(key,b);
      }
      b.electricKwh += r.electricKwh;
      b.consumptionKwh += r.consumptionKwh;
      b.electricExportKwh += r.electricExportKwh;
      b.reactiveInductiveKvarh += r.reactiveInductiveKvarh;
      b.reactiveCapacitiveKvarh += r.reactiveCapacitiveKvarh;
      b.thermalKwh += r.thermalKwh;
      b.pvKwh += r.pvKwh;
      const weight = Math.max(0, r.electricKwh || r.thermalKwh || r.consumptionKwh || 0);
      if(r.priceRonKwh > 0){
        b.priceWeighted += r.priceRonKwh * (weight || 1);
        b.priceWeight += weight || 1;
        b.priceSum += r.priceRonKwh;
        b.priceCount += 1;
      }
    }

    return Array.from(buckets.values()).sort((a,b)=>new Date(a.timestamp)-new Date(b.timestamp)).map(b => ({
      timestamp:b.timestamp,
      localLabel:b.localLabel,
      hour:b.hour,
      minute:b.minute,
      electricKwh:b.electricKwh,
      consumptionKwh:b.consumptionKwh,
      electricExportKwh:b.electricExportKwh,
      reactiveInductiveKvarh:b.reactiveInductiveKvarh,
      reactiveCapacitiveKvarh:b.reactiveCapacitiveKvarh,
      thermalKwh:b.thermalKwh,
      pvKwh:b.pvKwh,
      priceRonKwh:b.priceWeight > 0 ? b.priceWeighted / b.priceWeight : (b.priceCount ? b.priceSum / b.priceCount : 0)
    }));
  }

  function compactDataset(dataset, options={}){
    const originalRows = Array.isArray(dataset?.rows) ? dataset.rows : [];
    const targetRows = Math.max(500, Number(options.targetRows || DEFAULT_TARGET_ROWS));
    const rows = aggregateRows(originalRows, targetRows);
    const originalInterval = num(dataset?.meta?.intervalMinutes);
    let storedInterval = originalInterval;
    if(rows.length > 1){
      const delta = (new Date(rows[1].timestamp)-new Date(rows[0].timestamp))/60000;
      if(Number.isFinite(delta) && delta > 0) storedInterval = Math.round(delta);
    }
    return {
      ...dataset,
      rows,
      meta:{
        ...(dataset?.meta || {}),
        rowsCount:rows.length,
        originalRowsCount:originalRows.length,
        originalIntervalMinutes:originalInterval || null,
        intervalMinutes:storedInterval || originalInterval || null,
        sessionStorageCompacted:rows.length < originalRows.length,
        sessionStorageRows:rows.length,
        fullDatasetRetainedInIndexedDB:null,
        storageVersion:'v248'
      }
    };
  }

  function compactAnalysis(analysis){
    if(!analysis || typeof analysis !== 'object') return analysis || {};
    const compact = {...analysis};
    delete compact.chartRows;
    compact.meta = {...(compact.meta || {}), chartRowsRebuiltFromDataset:true, storageVersion:'v248'};
    return compact;
  }

  function clearKnownSessionKeys(){
    const keys = [
      'svtDataset','svtAnalysis','svtData','svtNavigatorContext','svtActiveDataFingerprint',
      'svtForecastQ3','svtPotentialQ4','svtUsefulEnergyQ5','svtFlexibleLoadsQ6'
    ];
    for(const key of keys){ try{ root.sessionStorage.removeItem(key); }catch(e){} }
  }

  function writeJson(storage, key, value){
    storage.setItem(key, JSON.stringify(value ?? {}));
  }

  function quotaError(error){
    const name = String(error?.name || '');
    const message = String(error?.message || error || '');
    return /quota|exceed/i.test(name + ' ' + message);
  }

  async function storeNavigationPayload(payload={}){
    const dataset = payload.dataset || {rows:[],meta:{}};
    const analysis = payload.analysis || {};
    const data = payload.data || {};
    const context = payload.context || {};

    const retained = await persistFullDataset(dataset);
    let compact = compactDataset(dataset, {targetRows:DEFAULT_TARGET_ROWS});
    compact.meta.fullDatasetRetainedInIndexedDB = retained;
    let compactA = compactAnalysis(analysis);

    function attemptWrite(){
      clearKnownSessionKeys();
      writeJson(root.sessionStorage,'svtDataset',compact);
      writeJson(root.sessionStorage,'svtAnalysis',compactA);
      writeJson(root.sessionStorage,'svtData',data);
      writeJson(root.sessionStorage,'svtNavigatorContext',context);
    }

    try{
      attemptWrite();
    }catch(error){
      if(!quotaError(error)) throw error;
      console.warn('[SVT v248] Session quota reached; retrying with stronger compaction.');
      clearKnownSessionKeys();
      compact = compactDataset(dataset, {targetRows:FALLBACK_TARGET_ROWS});
      compact.meta.fullDatasetRetainedInIndexedDB = retained;
      compactA = compactAnalysis(analysis);
      try{
        attemptWrite();
      }catch(secondError){
        clearKnownSessionKeys();
        const emergency = compactDataset(dataset, {targetRows:900});
        emergency.meta.fullDatasetRetainedInIndexedDB = retained;
        writeJson(root.sessionStorage,'svtDataset',emergency);
        writeJson(root.sessionStorage,'svtAnalysis',compactA);
        writeJson(root.sessionStorage,'svtData',data);
        writeJson(root.sessionStorage,'svtNavigatorContext',context);
        compact = emergency;
      }
    }

    try{ writeJson(root.localStorage,'svtNavigatorContext',context); }catch(e){ console.warn('[SVT v248] Context localStorage unavailable:',e); }
    return {dataset:compact, analysis:compactA, fullDatasetRetained:retained};
  }

  function getDataset(){
    return parseJson(root.sessionStorage?.getItem('svtDataset'), {});
  }

  function rebuildAnalysis(dataset, storedAnalysis, engine){
    const base = storedAnalysis && typeof storedAnalysis === 'object' ? storedAnalysis : {};
    if(Array.isArray(base.chartRows) && base.chartRows.length) return base;
    if(!dataset?.rows?.length || !engine?.analyzeQuestion1) return base;
    try{
      const tariff = num(dataset?.meta?.fixedPriceRonKwh || base?.meta?.fixedTariffRonKwh || 0.75) || 0.75;
      const rebuilt = engine.analyzeQuestion1(dataset,{fixedTariffRonKwh:tariff, mode:dataset?.meta?.selectedMode === 'termic' ? 'thermal' : undefined});
      return {
        ...rebuilt,
        ...base,
        meta:{...(rebuilt.meta||{}),...(base.meta||{})},
        totals:base.totals || rebuilt.totals,
        expensiveIntervals:base.expensiveIntervals || rebuilt.expensiveIntervals,
        chartRows:rebuilt.chartRows || []
      };
    }catch(e){
      console.warn('[SVT v248] Could not rebuild analysis chart rows:',e);
      return base;
    }
  }

  function getAnalysis(engine){
    const stored = parseJson(root.sessionStorage?.getItem('svtAnalysis'), {});
    const dataset = getDataset();
    const fingerprint = dataset?.meta?.dataFingerprint || stored?.meta?.dataFingerprint || [dataset?.rows?.length || 0,dataset?.rows?.[0]?.timestamp || '',dataset?.rows?.[dataset?.rows?.length-1]?.timestamp || ''].join('|');
    if(root.__SVT_ANALYSIS_CACHE__?.fingerprint === fingerprint) return root.__SVT_ANALYSIS_CACHE__.value;
    const value = rebuildAnalysis(dataset, stored, engine || root.SVTAnalysisEngine);
    root.__SVT_ANALYSIS_CACHE__ = {fingerprint,value};
    return value;
  }

  const api={
    compactDataset, compactAnalysis, persistFullDataset, readFullDataset,
    storeNavigationPayload, getDataset, getAnalysis, rebuildAnalysis,
    quotaError, version:'v248'
  };
  root.SVTSafeStorage=api;
  if(typeof module !== 'undefined' && module.exports) module.exports=api;
})(typeof window !== 'undefined' ? window : globalThis);
