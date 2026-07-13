# v52 — Q4 Local Production Potential + Reuse Data

Implementare:
- întrebarea 4 `Câtă energie ar mai putea fi produsă local?` devine activă în fluxul Electric;
- dacă nu există calcul Q4, apare `Date incomplete · completează datele necesare`;
- click pe întrebare deschide dropdown cu formular de potențial PV local;
- formularul refolosește datele introduse anterior:
  - coordonate din întrebarea 3 sau din numele fișierului PVGIS;
  - kWp existent din întrebarea 3 sau fișier PVGIS;
  - înclinare;
  - azimut;
  - pierderi sistem;
  - producție specifică derivată din PVGIS, dacă există date anuale suficiente;
- utilizatorul completează doar datele noi:
  - suprafață disponibilă suplimentar;
  - procent utilizabil;
  - tip montaj;
  - densitate m²/kWp;
  - limitare injecție / zero-export, opțional;
- calculează:
  - suprafață utilă;
  - putere PV suplimentară posibilă;
  - producție anuală suplimentară;
  - producție lunară;
  - estimare de energie utilă local / surplus pe baza curbei de consum, dacă există;
- afișează grafic lunar și rezumat.
