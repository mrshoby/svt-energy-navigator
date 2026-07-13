# v44 — Multiple load curve files + compact question cards

Modificări:
- text upload consum: `Încarcă fișierul / fișierele cu consumul tău electric`;
- inputul pentru consum electric acceptă multiple fișiere;
- drag & drop acceptă multiple fișiere;
- inputul pentru producție locală acceptă multiple fișiere PVGIS/inverter;
- fișierele multiple sunt parsate, unite cronologic și sortate după timestamp;
- duplicatele de timestamp se agregă;
- graficul folosește perioada completă rezultată din toate fișierele încărcate;
- se păstrează detecția automată de producție locală în fișierul principal;
- `testeaza-gratuit.html`: cardurile întrebărilor sunt mai înguste, iar întrebările lungi primesc font mai mic pentru un singur rând.
