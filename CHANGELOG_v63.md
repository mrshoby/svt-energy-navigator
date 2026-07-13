# v63 — Logic & UX Clean Audit Fix for Questions 1–6

Implementare:
- adaugă în pagina de încărcare tipul curbei de consum:
  - consum total;
  - consum din rețea / import;
  - nu știu;
- salvează `consumptionDataSource` în dataset, analiză și context;
- adaugă `dataFingerprint`;
- resetează automat rezultatele Q3–Q6 când se schimbă datele;
- Q2 afișează avertizare dacă datele nu sunt sigur consum total;
- Q4 suportă mai multe suprafețe PV suplimentare:
  - acoperiș plat;
  - acoperiș înclinat;
  - teren;
  - carport;
  - fațadă;
  - altceva;
- Q5 ascunde ipotezele avansate implicit sub `Modifică ipotezele avansate`;
- Q5 afișează răspuns scurt pentru client înainte de detalii;
- Q6 folosește surplusul estimat din Q4/Q5 prin profilul de producție suplimentară, nu doar PV existent;
- Q6 explică explicit că recomandările includ surplusul Q4/Q5;
- fiecare logică rămâne mai complexă în spate, dar interfața clientului este mai simplă și mai intuitivă.
