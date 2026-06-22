# AUDIT v85

Probleme din v84:
1. `Electric` / `Termic` au fost mutate greșit spre stânga.
2. Uploadul de la punctul 3 nu era suficient de îngust.
3. Câmpurile de tarif de la punctul 4 erau încă prea lungi.

Rezolvare:
- override final `.energy-switch-row .row-right { justify-content:flex-end }`;
- upload principal și PV la 320px x 34px;
- tarif la 2 x 135px, total 280px, aliniat dreapta.
