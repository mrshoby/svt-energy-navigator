# AUDIT v73 — Fix row 3 layout after icon cleanup

Problemă observată în screenshot:
- Punctul 3 `Încarcă fișierul` se rupea vertical;
- `De unde obții fișierul?` apărea sub formă de text spart pe mai multe rânduri;
- cauza: v72 a ascuns iconițele mari, dar anumite reguli mai specifice vechi (`.v71-upload-row`) păstrau coloana pentru iconiță + număr;
- după ascunderea iconiței, numărul intra în prima coloană, iar textul intra în coloana de 34px.

Fix:
- suprascriere finală cu selectori mai specifici:
  `.v71-panel .v71-row.v71-upload-row`;
- nou grid:
  `34px minmax(310px, 360px) minmax(360px, 1fr)`;
- textul rămâne în coloana lată;
- zona upload rămâne în dreapta;
- linkul `De unde obții fișierul?` rămâne pe un singur rând.
