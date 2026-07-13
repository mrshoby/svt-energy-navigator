# AUDIT v91

Problema:
- deși CSS-ul tehnic centra elementele, vizual rândul 3 apărea ușor prea sus în card, conform screenshotului.

Fix aplicat:
- `transform: translateY(5px)` pe conținutul direct din rândul 3;
- resetare margini pe titlu/subtitlu;
- upload box centrat pe aceeași linie cu textul.
