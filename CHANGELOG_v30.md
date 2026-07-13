# v30 — Upload curba de sarcină + raport funcțional costuri

Implementare funcțională pentru modulul:
1. Când consum din rețea energie scumpă?

Fișiere:
- `testeaza-gratuit.html` — butonul Continuă duce la upload.
- `incarcare-curba-sarcina.html` — upload CSV/XLSX, preview, mapare coloane, validare.
- `raport-costuri.html` — raport calculat din date reale încărcate.
- `upload-flow.css` — design SVT separat.
- `assets/js/svt-upload-parser.js` — parse CSV/XLSX, detectare coloane, normalizare.
- `assets/js/svt-price-profiles.js` — profil PZU fallback.
- `assets/js/svt-analysis-engine.js` — calcule reale: cost, ore scumpe, PZU, vârfuri, recomandări.
- `assets/js/svt-report-renderer.js` — randare KPI/grafice/recomandări.
- `assets/templates/model_curba_sarcina.csv` — model de test.

Notă:
- Nu se folosește API Claude din frontend.
- Nu se atinge `styles.css`.
- Funcționează static pe GitHub Pages pentru CSV/XLSX + Chart.js.
