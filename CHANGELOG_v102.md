# SVT Energy Navigator v102 — Help Modal Clean Rebuild

Data build: 2026-06-23

## Schimbări principale

- Reconstruit complet modalul „Cum obții fișierul orar / curba de sarcină?” cu o structură nouă izolată pe clase `svt102-*`.
- Păstrate compatibilitățile existente pentru codul paginii:
  - `id="distributorHelpModal"`
  - `id="closeDistributorHelp"`
  - `window.closeDistributorHelp`
  - `data-dist-tab`
  - `data-dist-panel`
  - `.svt-dist-panel.active`
- Implementat layout uniform pentru toate taburile:
  - titlu și subtitlu centrate;
  - taburi pill pe un rând;
  - tab activ verde;
  - card hero mare cu ilustrație verde în stânga și text în dreapta;
  - card „Pașii de urmat” cu pași 1–6;
  - carduri dreapta „Ce fișier cauți?” și „Atenție”;
  - footer cu buton principal și surse/documentație.
- Compactate câmpurile pentru scenariul „Am doar factura lunară”:
  - `Consum total / facturat`
  - `Număr zile / facturate`
  - `Valoare factură / energie`
  - `Program de / lucru`
- Uploadul pentru factura lunară este aliniat la dreapta, pe aceeași logică vizuală cu uploadul principal de la pasul 3.
- `Program de lucru` folosește prescurtările cerute:
  - `L-V, 8-18`
  - `L-V, 6-22`
  - `24/7`
  - `L-S, 8-18`
  - `S-D inclus`
  - `Alt program`
- Incluse paginile și asseturile JS cerute în pachet:
  - `incarcare-curba-sarcina.html`
  - `testeaza-gratuit.html`
  - `svt-analiza.html`
  - `assets/js/svt-analysis-engine.js`
  - `assets/js/svt-load-curve-profiles.js`

## Observații

- Buildul v102 nu copiază branding, layout sau asseturi de la niciun portal extern. Modalul este o implementare originală în stil SVT/Servelect: alb, verde, navy, border subtil și shadow soft.
- Pentru a evita efectul de patch peste patch, modalul v102 folosește namespace separat `svt102-*`.
