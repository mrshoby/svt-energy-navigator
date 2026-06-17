# v31.2 — Fix titlu + upload page 100% funcțională fără navbar

- `testeaza-gratuit.html`
  - titlul nu mai trece peste marginea din dreapta;
  - font-size redus controlat și wrap normal;
  - subtitlul nu mai forțează lățimea paginii.

- `incarcare-curba-sarcina.html`
  - navbarul de sus a fost scos complet;
  - taburile Electric / Termic funcționează;
  - butonul `Alege fișier` funcționează;
  - drag & drop funcționează;
  - parse CSV/XLSX funcțional;
  - dacă nu există fișier sau coloanele nu sunt detectate, folosește fallback demonstrativ ca să nu blocheze fluxul;
  - `Continuă` generează `svtData`, `svtDataset`, `svtAnalysis` în sessionStorage și merge la `svt-analiza.html`.
