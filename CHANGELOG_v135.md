# CHANGELOG v135 — Invoice true clean baseline

## Modificări
- Curățat patchurile conflictuale pentru factura lunară v120, v130, v131, v132.
- Reparat tagul HTML invalid `</style data-svt-invoice-upload=...>`.
- Adăugat un singur bloc CSS izolat `svt-v135-invoice-true-clean`, aplicat strict pe `#invoiceBox`.
- Câmpurile `Consum total facturat`, `Număr zile facturate`, `Valoare factură energie` sunt compacte și nu se suprapun.
- `Program de lucru` rămâne mai lung, pentru valorile de tip `L-V, 8-18`.
- Uploadul `Alege factură` rămâne în dreapta și folosește dimensiuni/înălțime ca uploadul principal din pasul 3.
- `#invoiceBox` rămâne ascuns implicit și este afișat doar când se selectează `Am doar factura lunară`.

## Nu s-a modificat
- Modalul „Cum obții fișierul orar / curba de sarcină?”.
- Logica de calcul.
- Uploadul principal `Alege fișier` din pasul 3.
