# v100 — Clean Modal 1:1 + Invoice Shrink

Modificări:
- modalul ajutor distribuitor este refăcut cu clase noi `svt-v100-*`, ca să nu mai fie afectat de cascadele vechi `svt-help-modal-v95` / `svt-v98`;
- layoutul urmărește direct imaginile de referință: titlu centrat, taburi egale, hero mare, pași în stânga, două carduri în dreapta, footer cu CTA și surse;
- câmpurile din `Am doar factura lunară` au clase dedicate și lățimi scurte, fără `:has()`:
  - Consum total facturat: 82px
  - Număr zile facturate: 70px
  - Valoare factură energie: 104px
  - Program de lucru: 78px
- etichetele sunt împărțite explicit pe două rânduri cu `<br>`;
- Program de lucru folosește format scurt: `L-V, 8-18`, `L-V, 6-22`, `24/7`, `L-S, 8-18`, `S-D inclus`, `Alt program`;
- uploadul facturii este aliniat hard la dreapta cu `position:absolute; right:0`.
