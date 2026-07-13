# AUDIT v69 — comparație cu referința

Probleme observate în v68 / screenshoturi:
1. Rândul `Detalii tarif` era prea lățit și se rupea deoarece avea 3 controale vizibile în aceeași zonă.
2. `Fișierul de consum reprezintă` nu apare în referință și strica alinierea 1:1. În v69 rămâne în DOM pentru logică, dar este ascuns.
3. Mesajul portocaliu de jos rupea flow-ul vizual. În v69 mesajele `warn` sunt ascunse în layout-ul normal; rămân vizibile doar mesajele `ok/err`.
4. Termic nu păstra aceeași structură vizuală ca Electric. În v69 are aceeași structură de rânduri, cu butoane Electric/Termic funcționale.
5. Cardul central și rândurile au fost recalibrate la lățimi fixe controlate: card mare, flow central, acțiuni în dreapta.
6. `De unde obții fișierul?` rămâne o singură dată și este hyperlink.

Scop v69:
- apropiere mai mare de referința 1:1;
- layout compact;
- rânduri aliniate;
- fără overflow pe tariff;
- fără blocuri vizuale care nu sunt în mockup.
