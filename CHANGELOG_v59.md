# v59 — Q5 Native Bars + Layout Fix

Fix:
- repară afișarea cu iconiță/sad face din zona graficului la întrebarea 5;
- elimină graficul Q5 pe canvas/Chart.js, care putea crăpa în browser după calcul;
- înlocuiește graficul cu bare native HTML/CSS stabile;
- împiedică tabelul orizontal Q5 să lărgească pagina sau să împingă conținutul spre dreapta;
- adaugă containere `max-width:100%`, `overflow:hidden` pentru rezultat și `overflow-x:auto` doar în zona tabelului pe zile;
- păstrează tabelul orar complet și calculul compact-storage din v58.
