# CHANGELOG v248

- `incarcare-curba-sarcina.html`: full responsive guard for desktop compact, laptop, tablet and mobile widths.
- Progress tracker is moved into normal flow below 1600 px and can no longer overlap the form.
- Fixed/floating tariff help panels become in-flow on reduced widths.
- Upload, tariff, PV, thermal and action sections stack cleanly at tablet/mobile breakpoints.
- Added `assets/js/svt-safe-storage.js` to prevent `The quota has been exceeded`.
- Full parsed dataset is retained in IndexedDB when available.
- Session payload is sanitized and dynamically aggregated only when necessary; analysis chart rows are rebuilt from the stored dataset.
- Applied quota-safe storage to initial continue flow and production upload inside `testeaza-gratuit.html`.
