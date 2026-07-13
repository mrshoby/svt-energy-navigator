# v45 — Robust PVGIS / inverter production parser fix

Fix real:
- repară detecția delimiterului CSV: nu mai folosește doar prima linie, ci scanează primele linii relevante;
- suport pentru PVGIS cu `;` separator;
- suport pentru header-uri PVGIS de tip `time`, `time(UTC)`, `P`, `P [W]`;
- suport pentru metadate/comentarii înainte de header;
- suport mai bun pentru exporturi inverter cu `PAC`, `P_AC`, `Power`, `Putere`, `Yield`, `Generation`;
- conversie putere W/kW în energie kWh pe interval;
- păstrează rândurile cu zero noaptea, dar cere să existe minim producție pozitivă în fișier;
- mesajul de eroare rămâne doar dacă nu există un timestamp + coloană de producție validă.

Test inclus:
- `test-data/pvgis_semicolon.csv`
- `test-data/pvgis_header_units.csv`
- `test-data/inverter_semicolon.csv`
- `scripts/test-v45-pvgis-parser.cjs`
