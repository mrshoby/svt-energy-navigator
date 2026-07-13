# v101 — Help Modal From Zero

Modificări:
- zona „Cum obții fișierul orar / curba de sarcină?” este reconstruită de la zero cu markup nou `svt-help101-*`;
- modalul nu mai depinde de clasele vechi `svt-help-modal-v95`, `svt-v98` sau `svt-v100`;
- păstrează aceleași atribute funcționale `data-dist-tab` și `data-dist-panel`;
- păstrează același conținut final pentru cele 5 taburi, dar într-un layout dedicat;
- câmpurile din `Am doar factura lunară` au clase dedicate și lățimi mici:
  - `Consum total / facturat`: 82px
  - `Număr zile / facturate`: 70px
  - `Valoare factură / energie`: 104px
  - `Program de / lucru`: 78px
- uploadul facturii este forțat la dreapta cu `position:absolute; right:0`.
