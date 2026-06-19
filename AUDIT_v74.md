# AUDIT v74 — reconstrucție reală layout

Problema din v73:
- încă exista markup vechi `v71-row/v71-icon/v71-check`;
- chiar dacă era suprascris CSS, reguli vechi puteau câștiga în browser și rupeau punctul 3;
- punctul 3 se rupea deoarece vechiul grid păstra coloane pentru iconiță.

Fix v74:
- am reconstruit panelul cu clase noi `v74-*`;
- am eliminat complet clasele vechi din rândurile principale;
- punctul 3 are structură directă:
  `număr | text normal | upload box | check`;
- textul și linkul nu mai sunt în coloane înguste;
- stepperul, titlul și subtitlul sunt mutate mai sus;
- controalele rămân fără iconițe/emoji.
