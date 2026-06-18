# v46 — Exact PVGIS production files + cache-busting fix

Motiv:
- v45 parserul citea fișierele PVGIS în test local, dar browserul putea încărca vechiul `svt-load-curve-profiles.js` din cache.
- v46 rescrie și `incarcare-curba-sarcina.html`, nu doar parserul, și pune query cache-busting pe JS:
  `svt-load-curve-profiles.js?v=46-exact-pvgis`.

Testat pe fișierele exacte încărcate:
- Timeseries_46.455_23.464_SA3_300kWp_crystSi_10_35deg_0deg_2023_2023.csv
- Timeseries_46.455_23.464_E5_150kWp_crystSi_10_15deg_-90deg_2023_2023.csv
- Timeseries_46.455_23.464_E5_150kWp_crystSi_10_15deg_90deg_2023_2023.csv
- Timeseries_46.455_23.464_SA3_150kWp_crystSi_10_15deg_-90deg_2023_2023.csv
- Timeseries_46.455_23.464_SA3_150kWp_crystSi_10_15deg_90deg_2023_2023.csv

Rezultat:
- 5/5 fișiere PVGIS citite corect;
- fiecare are 8760 rânduri;
- profil detectat: `pvgis_timeseries_production`;
- producție totală anuală citită/conversie: vezi `TEST_REPORT_v46.md`.

Important:
După aplicare, deschide pagina cu `?v=46` sau fă Ctrl+F5.
