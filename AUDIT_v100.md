# AUDIT v100

Probleme adresate:
1. v99 nu era suficient de vizibil pentru inputurile facturii — v100 folosește clase dedicate pe fiecare câmp și nu depinde de `:has()`.
2. Modalul nu se apropia suficient de imaginile de referință — v100 folosește markup nou `svt-v100-*`, nu doar CSS pe clase vechi.
3. Uploadul facturii trebuie să fie aliniat cu pasul 3 — v100 îl poziționează absolut la `right:0`.
4. Etichetele facturii sunt forțate în HTML pe două rânduri.
