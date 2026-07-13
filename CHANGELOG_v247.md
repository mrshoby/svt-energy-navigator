# CHANGELOG v247

- `testeaza-gratuit.html`: corectat logica pentru zona Q1 `Unde apare economia în următoarele 24h?`.
- Scenariile PZU, BESS, mutare consum și reducere consum sunt mai realiste:
  - PZU poate fi economie sau cost suplimentar;
  - BESS folosește capacitate orientativă, fereastră SoC, randament, uzură și prag de spread;
  - mutarea consumului este limitată la consum realist mutabil;
  - reducerea consumului este limitată la consumatori necritici.
- Fereastra din dreapta afișează detalii concrete: capacitate baterie, kWh utili, randament, SoC, kWh influențați, tarife și limitări.
- Nu s-au modificat celelalte pagini.
