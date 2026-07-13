# AUDIT v135

## Scop
Reparare controlată pentru zona `2 Sursa datelor → Am doar factura lunară` după patchurile conflictuale v120–v134.

## Fișier inspectat
- `incarcare-curba-sarcina.html` din arhiva încărcată `svt-energy-navigator-main.zip`.

## Probleme găsite
- Existau patchuri multiple care ținteau `#invoicePanel`, dar structura reală folosește `#invoiceBox`.
- Existau scripturi care adăugau clase `svt120`, `svt130`, `svt131`, `svt132` peste zona facturii.
- Exista un tag invalid de tip `</style data-svt-invoice-upload=...>`.
- Unele reguli vechi forțau `#invoiceBox[style*=grid]` pe `display:block`, deși JavaScript-ul aplica `display:grid`.

## Soluție v135
- S-au eliminat blocurile experimentale v120/v130/v131/v132.
- S-a adăugat un singur bloc final cu specificitate mare pe `#invoiceBox`.
- Nu s-a folosit runtime JS pentru poziționare.
- Afișarea rămâne controlată de funcția existentă `setLoadMethod(method)`.

## Status
- Test static JS: PASS.
- Verificare vizuală în browser real pe GitHub Pages: trebuie făcută după aplicarea locală și push.
