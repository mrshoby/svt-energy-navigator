
    (function(){
      const modal = document.getElementById('distributorHelpModal');
      if(!modal || modal.dataset.help101Ready === 'true') return;
      modal.dataset.help101Ready = 'true';
      const tabs = modal.querySelectorAll('[data-dist-tab]');
      const panels = modal.querySelectorAll('[data-dist-panel]');
      tabs.forEach(tab => {
        tab.addEventListener('click', () => {
          const key = tab.getAttribute('data-dist-tab');
          tabs.forEach(t => {
            const active = t.getAttribute('data-dist-tab') === key;
            t.classList.toggle('is-active', active);
            t.classList.toggle('active', active);
            t.setAttribute('aria-selected', active ? 'true' : 'false');
          });
          panels.forEach(panel => {
            const active = panel.getAttribute('data-dist-panel') === key;
            panel.classList.toggle('is-active', active);
            panel.classList.toggle('active', active);
            panel.style.display = active ? 'grid' : 'none';
          });
        });
      });
    })();
  
