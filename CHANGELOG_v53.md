# v53 — Remove Q1 label + Q3 midnight forecast window

Modificări:
- în `incarcare-curba-sarcina.html` este eliminat textul de sus `ÎNTREBAREA 1`;
- întrebarea 3 nu mai afișează graficul începând de la ora curentă;
- graficul întrebării 3 folosește o zi calendaristică completă:
  - start: 00:00;
  - final: 23:00;
  - implicit ziua următoare disponibilă din prognoză;
- Open-Meteo cere acum 3 zile forecast pentru a avea disponibilă ziua completă;
- pe rezultat apare chip cu intervalul: `00:00–23:00`.
