# v39 — Data-first flow + filtered questions

Flux nou:
1. Butoanele `Testează gratuit` din `index.html` trimit întâi către `incarcare-curba-sarcina.html`.
2. În `incarcare-curba-sarcina.html` utilizatorul alege Electric sau Termic și completează datele.
3. La apăsarea `Continuă`, datele se salvează în `sessionStorage/localStorage`, apoi pagina merge către `testeaza-gratuit.html`.
4. `testeaza-gratuit.html` afișează doar întrebările relevante pentru Electric sau Termic.
5. În ambele cazuri, toate întrebările rămân `În curând`, cu excepția întrebării 1 când există date electrice.
6. Butonul `Continuă` din `testeaza-gratuit.html` nu face nimic momentan.

Detalii:
- Electric afișează întrebările electrice relevante: 1,2,3,4,5,6,7,8,9,10, cu doar 1 activă acum.
- Termic afișează întrebările relevante termic: 6,7,9,10, toate `În curând`.
- Q1 rămâne electrică: `Când consum din rețea energie scumpă?`.
