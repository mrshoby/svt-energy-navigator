# v58 — Q5 Storage Quota Fix

Fix:
- repară eroarea `Failed to execute 'setItem' on 'Storage': Setting the value of 'svtUsefulEnergyQ5' exceeded the quota`;
- întrebarea 5 nu mai salvează în `sessionStorage` toate intervalele orare/15-min;
- în pagină se afișează în continuare tabelul complet după calcul;
- în browser se salvează doar rezumatul compact:
  - inputs;
  - source;
  - totals;
  - createdAt;
- dacă utilizatorul redeschide întrebarea 5, vede rezumatul compact și poate apăsa `Recalculează tabelul complet`;
- dacă salvarea compactă eșuează, aplicația continuă fără să afișeze eroare clientului.
