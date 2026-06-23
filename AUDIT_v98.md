# AUDIT v98

Probleme corectate:
1. În v97 modalul încă depindea de clase v95 și cascade vechi — acum are markup și clase v98 dedicate.
2. Uploadul facturii era deplasat — acum este absolut poziționat la dreapta (`right:0`) în `#invoiceBox`.
3. Etichetele nu se împărțeau în două rânduri — acum sunt modificate explicit în HTML cu `<br>`.
4. Taburile rămân funcționale prin data attributes și listener robust.
