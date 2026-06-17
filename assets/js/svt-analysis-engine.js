/* v34 analysis engine — fixed tariff grid-consumption question 1 */
(function(root){
  function num(v){ return Number(v) || 0; }
  function round(n,d=2){ const p=Math.pow(10,d); return Math.round(num(n)*p)/p; }
  function mergeProduction(consumptionDataset, productionDataset){
    if (!productionDataset || !productionDataset.rows || !productionDataset.rows.length) return consumptionDataset;
    const prodMap = new Map();
    for (const r of productionDataset.rows){
      const d = new Date(r.timestamp);
      if (isNaN(d)) continue;
      const key = d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")+" "+String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0");
      prodMap.set(key, (prodMap.get(key)||0) + (num(r.electricKwh) || num(r.pvKwh)));
    }
    const rows = consumptionDataset.rows.map(r => {
      const d = new Date(r.timestamp);
      const key = d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")+" "+String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0");
      return {...r, pvKwh: prodMap.get(key) || r.pvKwh || 0};
    });
    return {...consumptionDataset, rows, meta:{...consumptionDataset.meta, productionFileName:productionDataset.meta?.fileName || ""}};
  }

  function analyzeQuestion1(consumptionDataset, options={}){
    const tariff = num(options.fixedTariffRonKwh) || 0.75;
    const rows = (consumptionDataset.rows || []).map(r => {
      const consumption = Math.max(0, num(r.electricKwh));
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