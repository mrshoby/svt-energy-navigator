# v64 — Q1 Professional Heatmap & Reusable Visual Kit

Implementare:
- înlocuiește graficul Q1 pe linii suprapuse cu o prezentare mai intuitivă pentru client;
- adaugă `SVT Visual Kit v64`, un set de funcții native HTML/CSS reutilizabile:
  - heatmap 7 zile × 24 ore;
  - top ore scumpe;
  - detaliu pe zi critică;
  - tabel stabil pentru top intervale;
- Q1 afișează acum:
  - răspuns pe scurt;
  - heatmap cost pe ore;
  - top ore scumpe;
  - zi critică detaliată;
  - top intervale cu cost ridicat;
  - interpretare;
  - recomandări;
  - detalii tehnice ascunse sub `<details>`;
- elimină `question1Chart` și folosirea Chart.js pentru Q1;
- păstrează calculele existente: consum din rețea = max(consum total - producție locală, 0), cost = consum rețea × tarif fix;
- modulul vizual este gândit să poată fi refolosit ulterior la Q2–Q6.
