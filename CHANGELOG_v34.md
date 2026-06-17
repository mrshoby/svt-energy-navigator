# v34 — Fixed tariff grid consumption for question 1

Întrebarea implementată:
`Când consum din rețea energie scumpă?`

Date necesare:
- curba de consum electric;
- tarif fix lei/kWh;
- producție locală/PV doar dacă există, pentru că întrebarea spune `din rețea`.

Logica:
- fără producție locală: `consum din rețea = consum total`;
- cu producție locală/PV: `consum din rețea = max(consum total - producție locală, 0)`;
- tarif fix: `cost interval = consum din rețea × tarif fix`;
- intervalele scumpe sunt cele cu cel mai mare cost, adică cele cu cel mai mare consum din rețea la tariful fix.

Schimbări:
- adăugat câmp `Tarif fix energie`;
- adăugat upload opțional pentru producție locală/PV;
- grafic: Consum total, Producție locală, Consum din rețea, Intervale scumpe;
- tabel mic Top intervale scumpe;
- eliminat PZU, zi/noapte, tip tarif, putere contractată.
