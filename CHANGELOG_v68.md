# v68 — Thermic Back to Electric + 1:1 Compact Fix

Fix principal:
- după selectarea `Termic`, utilizatorul poate reveni la `Electric`;
- butoanele din headerul Termic sunt acum funcționale, nu doar decorative;
- `setTab()` sincronizează și butoanele mirror din ecranul Termic;
- `electricSection` și `termicSection` folosesc `display:grid`, nu block, ca să păstreze layout-ul compact.

Layout polish:
- rândurile sunt mai compacte;
- zona `Detalii tarif` este mai bine aliniată și nu se mai lățește necontrolat;
- inputurile și dropdown-urile sunt mai compacte;
- Termic păstrează același limbaj vizual cu Electric;
- se păstrează toate ID-urile funcționale și logica existentă.
