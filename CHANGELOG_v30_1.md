# v30.1 — Wizard-compatible SVT analiza

Corecție față de v30:
- pagina de upload nu mai are structură generică;
- `incarcare-curba-sarcina.html` folosește aceleași date/întrebări ca `svt-wizard.html` Pasul 1:
  - electric / termic tabs;
  - tip încărcare electrică;
  - upload curba electrică;
  - putere maximă racordată;
  - tarif actual RON/kWh;
  - tip tarif: fix / biorată / PZU;
  - consum termic monitorizat;
  - upload termic;
  - sursă termică;
  - consum termic anual + unitate.
- raportul final este `svt-analiza.html`, nu `raport-costuri.html`;
- `svt-analiza.html` primește `svtData`, `svtDataset` și `svtAnalysis` din sessionStorage;
- raportul afișează explicit datele preluate din wizard.
