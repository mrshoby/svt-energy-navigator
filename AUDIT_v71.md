# AUDIT v71 — Single-flow reference rebuild

Problemă reală după v69/v70:
- se încerca păstrarea a două flow-uri complete, unul Electric și unul Termic;
- asta a creat risc permanent de dublare / afișare greșită;
- CSS-ul acumulat din buildurile anterioare făcea greu de controlat layout-ul;
- dimensiunile nu se așezau ca în referință pentru că erau prea multe controale vizibile în același rând.

Decizie v71:
- nu mai duplicăm primul rând `Tip energie`;
- există un singur rând de selecție Electric/Termic, vizibil permanent;
- sub el se afișează fie flow-ul Electric, fie flow-ul Termic, niciodată ambele;
- Electric este refăcut ca în referință:
  1. Tip energie
  2. Sursa datelor
  3. Încarcă fișierul
  4. Detalii tarif
  5. Producție locală / fotovoltaică
- `Fișierul de consum reprezintă` rămâne ascuns, dar prezent pentru compatibilitate logică.
- `De unde obții fișierul?` apare o singură dată și este hyperlink.
