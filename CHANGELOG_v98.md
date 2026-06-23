# v98 — Modal Rebuild + Upload Align Hard Fix

Fixuri:
- modalul „Cum obții fișierul orar / curba de sarcină?” este refăcut în markup nou `svt-v98-*`, nu doar suprascris peste v95;
- layoutul este mult mai apropiat de imaginile de referință: titlu centrat, taburi pill egale, hero card cu ilustrație mare, 2 coloane și footer CTA/surse;
- funcționalitatea este păstrată cu aceleași atribute `data-dist-tab` și `data-dist-panel`;
- uploadul de la „Am doar factura lunară” este aliniat hard cu `right:0`, astfel încât marginea dreaptă să fie aceeași ca la uploadul de la pasul 3;
- etichetele `Consum total facturat`, `Număr zile facturate`, `Valoare factură energie (opțional)` și `Program de lucru` sunt forțate cu `<br>` pe două rânduri;
- inputurile pentru factură rămân scurtate.
