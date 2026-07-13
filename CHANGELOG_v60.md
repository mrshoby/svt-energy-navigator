# v60 — Hotfix testeaza-gratuit render restore

Fix critic:
- repară eroarea de JavaScript din `testeaza-gratuit.html` introdusă în v59;
- cauza: funcția `renderQuestion5Result()` nu era închisă corect după înlocuirea graficului Q5 cu bare native;
- efectul în browser: lista de întrebări nu se mai randa și pagina rămânea aproape goală;
- păstrează fixurile v59:
  - fără canvas/Chart.js la Q5;
  - bare native HTML/CSS;
  - tabel Q5 în scroll orizontal fără să împingă pagina;
  - compact storage pentru Q5;
- adaugă test real de sintaxă: extrage scriptul inline din `testeaza-gratuit.html` și rulează `node --check`.
