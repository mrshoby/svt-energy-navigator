# AUDIT v249

## Cerință
Bara cu pașii trebuia să rămână în stânga pe verticală la orice rezoluție.

## Implementare
- Desktop mediu: coloană de 150 px.
- Tabletă: coloană de 118 px.
- Telefon: coloană de 82 px.
- Telefon foarte îngust: coloană de 70 px.
- Progresul este `sticky`, nu `fixed`, în breakpointurile responsive, astfel încât nu poate acoperi formularul.
- Conținutul principal ocupă a doua coloană cu `minmax(0,1fr)`.
