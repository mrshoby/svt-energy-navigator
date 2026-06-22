# AUDIT v77

Cerere utilizator:
1. Paginarea `1 Consum / 2 Procesare / 3 Rezultate / 4 Recomandări` trebuie mutată în exterior, deasupra ferestrei albe.
2. Paginarea trebuie să fie mai mică.
3. Conținutul din fereastră trebuie mutat mai sus.
4. Pe pagina următoare trebuie să apară aceeași paginare, cu `2 Procesare` activ.
5. Când se apasă pe o întrebare și apar rezultatele, trebuie activat `3 Rezultate`.

Implementare:
- componentă comună `.svt-progress-outside`;
- upload page: active step 1;
- testează gratuit page: active step 2 inițial;
- click pe întrebare: `setSVTProgressStep(3)`.
