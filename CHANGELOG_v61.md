# v61 — Q5 Stable Result Layout

Fix major pentru întrebarea 5:
- elimină complet randarea instabilă care strica layout-ul după `Calculează`;
- nu mai folosește canvas/Chart.js la întrebarea 5;
- nu mai folosește carduri orizontale uriașe pentru toate zilele;
- rezultatul Q5 este randat stabil:
  - rezumat KPI;
  - bare native HTML/CSS;
  - interpretare rezultat;
  - recomandări;
  - rezumat energetic;
  - tabel detaliat într-un container controlat;
- tabelul detaliat are scroll intern și nu mai împinge pagina spre dreapta;
- pentru stabilitate în browser, afișează până la 2000 de intervale relevante în tabel; calculele totale rămân pe tot setul de date;
- păstrează compact-storage din v58 și fixul de sintaxă din v60;
- adaugă test real `node --check` pentru scriptul inline.
