# AUDIT v76

Probleme din screenshot:
1. Existau două containere albe: `.hero` și `.wizard-shell`.
2. Rândul `Tip energie` era în interiorul `#electricSection`. Când selectai `Termic`, `#electricSection` se ascundea și dispărea și butonul `Electric`.

Rezolvare:
- `.wizard-shell` nu mai are border/background/padding vizual, deci rămâne o singură fereastră albă.
- rândul `Tip energie` este scos din `#electricSection` și devine rând permanent.
- `setTab()` controlează doar secțiunile Electric/Termic de sub rândul permanent.
