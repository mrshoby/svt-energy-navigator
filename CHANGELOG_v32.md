# v32 — Real Load Curve Parser Profiles

Implementare parser real pentru fișierele din ZIP-ul cu curbe de sarcină.

Profile detectate:
- `long_timestamp`: tabele cu `Data-ora`, `EA+[kWh]`, `EA-[kWh]`, `ER+[kVArh]`, `ER-[kVArh]`.
- `split_data_ora_ea_delim`: tabele cu `Data`, `Ora`, `EA+ delim`, `EA- delim`.
- `monthly_matrix_ibd_days`: matrice lunară DEER/IBD cu `Interval`, `IBD`, zilele 1..31 și valori pe ore.
- `day_hour_cs_mas`: tabele `Ziua`, `Ora`, `CS mas`.
- `invoice_monthly_fallback_estimated`: fallback pentru fișiere care par facturi/index lunar, nu curbe reale.

Fișiere actualizate:
- `assets/js/svt-load-curve-profiles.js`
- `assets/js/svt-analysis-engine.js`
- `incarcare-curba-sarcina.html`
- `svt-analiza.html`
- `assets/templates/model_curba_sarcina.csv`
- `scripts/test-v32-load-curves.mjs`

Test real efectuat pe CSV-uri extrase din fișierele utilizatorului:
- `01.2022.csv`
- `01.Marquardt - Curba de sarcina - ianuarie 2021.csv`
- `IBD (Curba de sarcina la nivel orar) IAN 2024.csv`
- `Raport curba de sarcina - Salina_Dej_1 01.07.2013.csv`
