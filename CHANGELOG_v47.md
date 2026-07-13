# v47 — Align PVGIS production to consumption period

Cauza problemei:
- fișierul PVGIS este pentru 2023;
- curbele de sarcină încărcate sunt pentru 2025–2026;
- PVGIS are timestamp-uri de tip `2023-07-01 12:10`, iar IBD are de regulă `2025-07-01 12:00`;
- logica anterioară potrivea producția pe timestamp exact, deci producția nu se alinia pe consum.

Fix:
- dacă există suficiente potriviri exacte, se folosește timestamp exact;
- dacă nu există potriviri exacte, producția este proiectată pe consum după `lună + zi + oră`;
- minutul PVGIS este ignorat la fallback;
- anul PVGIS este ignorat la fallback;
- dacă consumul este sub-orar, producția orară se împarte pe intervalele din acea oră;
- metadata include `productionAlignment`, `productionExactHits`, `productionAlignedHits`.

Test:
- PVGIS 2023 exact uploadat de utilizator;
- consum sintetic 2025;
- producția se aliniază corect și se detectează surplus.
