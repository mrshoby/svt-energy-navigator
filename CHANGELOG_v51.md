# v51 — Fix SVTAnalysisEngine loading + full cache bust

Fix:
- repară eroarea `SVTAnalysisEngine is not defined` din `incarcare-curba-sarcina.html`;
- include din nou fișierele reale:
  - `assets/js/svt-analysis-engine.js`
  - `assets/js/svt-load-curve-profiles.js`
- rescrie referințele scripturilor cu cache-busting nou:
  - `svt-analysis-engine.js?v=51-engine-fix`
  - `svt-load-curve-profiles.js?v=51-engine-fix`
- adaugă guard în `continueFlow()` ca pagina să afișeze mesaj clar dacă JS-ul nu s-a încărcat, în loc să crape cu ReferenceError;
- păstrează:
  - required consumption guard;
  - parser PVGIS exact;
  - alinierea PVGIS pe perioada curbei de consum;
  - Q2 inline upload;
  - Q3 Open-Meteo forecast.
