# TEST REPORT v133

## Teste statice rulate în sandbox

### JavaScript extern
- `node --check assets/js/svt-analysis-engine.js` — PASS
- `node --check assets/js/svt-load-curve-profiles.js` — PASS

### JavaScript inline din `incarcare-curba-sarcina.html`
- Script inline 1 — PASS
- Script inline 2 — PASS

### Sanity checks HTML
- Blocurile conflictuale `svt-v120`, `svt-v130`, `svt-v131`, `svt-v132` au fost eliminate din `incarcare-curba-sarcina.html`.
- Tagul invalid `</style data-svt-invoice-upload=...>` nu mai există.
- Blocul nou `svt-v133-invoice-align-clean` există o singură dată.

## Teste vizuale
- Nu declar pixel-perfect final pe GitHub Pages fără screenshot după deploy.
- Buildul este făcut pe baza comparației `aaa1.png` -> `aaa2.png`: coborâre/control labeluri + centrare verticală upload în zona facturii.
