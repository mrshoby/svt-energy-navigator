# SVT Energy Navigator v133 — Invoice section aaa2 alignment clean build

## Scope
Pagina afectată: `incarcare-curba-sarcina.html`.

Buildul v133 curăță patchurile conflictuale din zona `Am doar factura lunară` și reconstruiește alinierea pentru starea comparată în imaginile `aaa1.png` -> `aaa2.png`.

## Modificări
- Eliminat tag HTML corupt rămas din patchurile anterioare: `</style data-svt-invoice-upload=...>`.
- Eliminat CSS/JS conflictual pentru invoice din patchurile v120, v130, v131 și v132.
- Adăugat un singur bloc CSS izolat: `svt-v133-invoice-align-clean`.
- Inputurile facturii rămân compacte, fără JS și fără mutări dinamice.
- Labelurile sunt păstrate aproape de inputuri, cu spațiere controlată.
- Uploadul `Alege factură / Format acceptat` este centrat vertical față de grupul label + input, prin `align-items:center` pe grid, nu prin offseturi fragile.
- Nu se modifică modalul `Cum obții fișierul orar / curba de sarcină?`.
- Nu se modifică flow-ul principal și nu se rescrie pagina cu o variantă simplificată.

## Fișiere incluse
- `incarcare-curba-sarcina.html`
- `testeaza-gratuit.html`
- `svt-analiza.html`
- `assets/js/svt-analysis-engine.js`
- `assets/js/svt-load-curve-profiles.js`
- `CHANGELOG_v133.md`
- `AUDIT_v133.md`
- `TEST_REPORT_v133.md`
- `APPLY_v133.ps1`
