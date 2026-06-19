# AUDIT v70.1

Eroarea raportată:
- `APPLY_v70.ps1:33`
- scriptul credea că regula veche care forțează Termic vizibil încă există.

Cauză:
- regex-ul era prea larg:
  `.termic-flow{[\s\S]*?display:grid!important`
- acesta pornea de la `.termic-flow` și putea ajunge până la o altă regulă validă care conține `display:grid!important`.

Rezolvare:
- regex limitat la corpul CSS al regulii:
  `\.termic-flow\s*\{[^}]*display\s*:\s*grid\s*!important`
- scriptul verifică separat regulile corecte pentru:
  - ascundere Termic în modul Electric;
  - ascundere Electric în modul Termic.
