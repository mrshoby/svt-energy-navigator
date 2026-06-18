# v48 — Q2 inline production upload + required consumption guard

Modificări:
- în `testeaza-gratuit.html`, întrebarea `Când nu valorific optim energia produsă local?` nu mai este `În curând` când lipsește producția;
- în loc de `În curând` apare: `Date incomplete · adaugă producție`;
- click pe întrebarea 2 deschide dropdown cu upload de producție locală/PV;
- upload-ul din dropdown acceptă multiple fișiere PVGIS/inverter/CSV/XLSX/HTML;
- după upload, producția este parsată, aliniată peste consum și Q2 afișează automat graficul;
- actualizează `sessionStorage` cu datasetul complet, astfel Q1 și Q2 folosesc aceeași bază de date;
- în `incarcare-curba-sarcina.html`, nu se poate continua doar cu fișiere de producție; fișierul de consum electric este obligatoriu;
- cache-bust pe JS: `?v=48-q2-inline-upload`.
