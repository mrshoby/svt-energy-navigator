# v70.1 — Apply Script False Positive Fix

Fix:
- păstrează hotfixul v70 pentru Electric/Termic;
- repară scriptul PowerShell care oprea aplicarea cu eroare falsă:
  `Regula veche care forteaza Termic vizibil inca exista.`
- cauza era regex prea larg în `APPLY_v70.ps1`;
- v70.1 verifică strict doar regula `.termic-flow { ... }`, fără să prindă regula corectă:
  `body[data-energy-mode="termic"] #termicSection { display:grid!important; }`
- `APPLY_v70.ps1` redirecționează acum către `APPLY_v70_1.ps1`, ca să nu mai poți rula accidental scriptul greșit.
