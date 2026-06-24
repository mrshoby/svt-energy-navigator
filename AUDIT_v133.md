# AUDIT v133 — Invoice alignment clean build

## Ce am verificat în fișierul încărcat
- `incarcare-curba-sarcina.html` are markup real pentru secțiunea `2 Sursa datelor`:
  - `#invoiceBox`
  - `.invoice-grid`
  - `.invoice-field`
  - `#invoiceDrop.file-inline`
  - textul `Alege factură`
  - textul `Format acceptat`
- Fișierul conținea patchuri vechi și conflictuale v120, v130, v131 și v132.
- Fișierul conținea un tag invalid rezultat din patchuri anterioare: `</style data-svt-invoice-upload=...>`.

## Strategie v133
- Nu se mai injectează JavaScript pentru mutări vizuale.
- Nu se mai folosește `top`, `translateY` sau offset fix pentru upload.
- Se curăță blocurile conflictuale și se aplică un singur CSS final, scoped pe `#invoiceBox`.
- Alinierea uploadului se face nativ prin grid/flex: `align-items:center`.

## Risc redus
- Nu se modifică logica JS existentă a formularului.
- Nu se modifică modalul de ajutor.
- Nu se modifică alte pagini, în afara copierii lor în pachet pentru consistență.

## Neconfirmat
- Nu pot confirma vizual pe GitHub Pages după deploy din mediul local al utilizatorului. Verificarea finală trebuie făcută după aplicare cu `?v=133` și refresh fără cache.
