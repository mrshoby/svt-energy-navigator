# v65.2 — Inline Distributor Help + Modal Tabs Fix

Fix pe cerința exactă:
- elimină blocul separat adăugat în v65.1;
- modifică textul direct în aceeași fereastră/card unde există `Cum preferi să încarci datele de consum electric?`;
- textul devine:
  - `Dacă ai fișierul orar, aceasta este varianta recomandată.`
  - rând nou cu linkul `De unde obții fișierul?`
  - continuare pe același rând nou cu explicația scurtă;
- click pe `De unde obții fișierul?` deschide fereastra explicativă;
- repară taburile din modal:
  - DEER;
  - Rețele Electrice;
  - Delgaz Grid;
  - Distribuție Oltenia;
  - Furnizor / aplicație client;
- taburile schimbă panourile prin handler robust `activateTab`;
- adaugă test de sintaxă și test pentru toate taburile/panourile.
