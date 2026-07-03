window.SVTReportRenderer = (() => {
  let charts = [];
  function fmt(n, d=0) { return (Number(n)||0).toLocaleString('ro-RO', { maximumFractionDigits:d, minimumFractionDigits:d }); }
  function ron(n) { return fmt(n,0) + ' RON'; }
  function destroyCharts(){ charts.forEach(c=>c.destroy()); charts=[]; }
  function render(analysis) {
    destroyCharts();
    const t = analysis.totals;
    document.getElementById('reportFile').textContent = analysis.meta.fileName || 'date încărcate';
    document.getElementById('kpiCost').textContent = ron(t.fixedCostRon);
    document.getElementById('kpiSaving').textContent = ron(t.totalPossibleSavingRon);
    document.getElementById('kpiPeak').textContent = fmt(t.maxDemandKw,1) + ' kW';
    document.getElementById('kpiEnergy').textContent = fmt(t.electricKwh,0) + ' kWh';
    document.getElementById('scoreValue').textContent = Math.max(35, Math.min(92, Math.round(82 - Math.min(40, t.totalPossibleSavingRon / Math.max(1,t.fixedCostRon)*100))));

    const top = analysis.expensiveIntervals.slice(0,5);
    document.getElementById('findings').innerHTML = top.map((x,i) => `
      <div class="svt-finding">
        <div class="bar ${i<2?'red':i<4?'amber':'green'}"></div>
        <div>
          <strong>${x.localLabel}: ${fmt(x.kw,1)} kW la ${fmt(x.price,3)} RON/kWh</strong>
          <span>Cost estimat în interval: ${ron(x.cost)}. Acesta este unul dintre intervalele în care consumul te costă cel mai mult.</span>
          <em>Acțiune: verifică dacă acest consum poate fi mutat sau pornit treptat.</em>
        </div>
      </div>`).join('');

    document.getElementById('recommendations').innerHTML = analysis.recommendations.map(r => `
      <div class="svt-finding">
        <div class="bar ${r.priority==='urgent'?'red':r.priority==='medium'?'amber':'green'}"></div>
        <div>
          <strong>${r.title}</strong>
          <span>${r.body}</span>
          <em>Economie estimată: ${ron(r.savingRon)} · dificultate: ${r.difficulty}</em>
        </div>
      </div>`).join('');

    document.getElementById('plan').innerHTML = analysis.tomorrowPlan.map(p => `
      <div class="svt-plan-item">
        <div class="svt-plan-time">${p.time}</div>
        <div><strong>${p.title}</strong><span style="display:block;color:#64748b;font-size:13px;margin-top:4px;line-height:1.45">${p.body}</span><em style="display:block;color:#07943f;font-style:normal;font-weight:900;margin-top:5px">Economie estimată: ${ron(p.saving)}</em></div>
      </div>`).join('');

    buildCharts(analysis);
  }

  function buildCharts(a) {
    const curve = a.charts.loadCurve;
    const maxPoints = curve.length > 96 ? Math.ceil(curve.length / 96) : 1;
    const sampled = curve.filter((_,i)=>i%maxPoints===0).slice(0,160);
    charts.push(new Chart(document.getElementById('chartLoad'), {
      type:'line',
      data:{ labels: sampled.map(x=>x.localLabel), datasets:[
        { label:'Consum electric kWh', data:sampled.map(x=>x.electricKwh), borderColor:'#e24b4a', backgroundColor:'rgba(226,75,74,.12)', borderWidth:2, pointRadius:0, fill:true, tension:.3 },
        { label:'Energie produsă local kWh', data:sampled.map(x=>x.pvKwh), borderColor:'#07943f', backgroundColor:'rgba(7,148,63,.10)', borderWidth:2, pointRadius:0, fill:false, tension:.3 }
      ]},
      options:{ responsive:true, maintainAspectRatio:false, plugins:{legend:{position:'bottom'}}, scales:{x:{ticks:{maxTicksLimit:8}}, y:{beginAtZero:true}} }
    }));
    charts.push(new Chart(document.getElementById('chartCostHour'), {
      type:'bar',
      data:{ labels:a.charts.costByHour.map(x=>String(x.hour).padStart(2,'0')), datasets:[
        { label:'Cost RON/oră', data:a.charts.costByHour.map(x=>x.cost), backgroundColor:a.charts.costByHour.map(x=>x.cost>0?'rgba(7,148,63,.72)':'rgba(148,163,184,.25)'), borderRadius:5 }
      ]},
      options:{ responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{y:{beginAtZero:true}} }
    }));
    charts.push(new Chart(document.getElementById('chartPzu'), {
      type:'bar',
      data:{ labels:['Preț fix actual','Preț schimbător pe ore'], datasets:[
        { label:'Cost RON', data:[a.totals.fixedCostRon, a.totals.pzuCostRon], backgroundColor:['rgba(226,75,74,.75)','rgba(7,148,63,.75)'], borderRadius:10 }
      ]},
      options:{ responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{y:{beginAtZero:true}} }
    }));
  }
  return { render };
})();
