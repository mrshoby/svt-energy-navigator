# v50 — Q3 Real Weather PV Forecast

Modificări:
- întrebarea 3 devine disponibilă în fluxul Electric;
- dacă nu există date pentru prognoza PV, apare `Date incomplete · completează datele necesare`;
- click pe întrebarea 3 deschide dropdown cu formular:
  - putere sistem kWp;
  - latitudine / longitudine;
  - înclinare;
  - azimut;
  - pierderi sistem;
  - sursă meteo Open-Meteo Forecast API;
- calculează producția estimată pentru următoarele 24 ore folosind prognoză meteo reală;
- folosește `shortwave_radiation`, `temperature_2m`, `cloud_cover`;
- afișează rezumat și grafic orar:
  - producție PV estimată;
  - radiație solară orară;
  - top 5 ore cu producție estimată mare.
