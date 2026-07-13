# AUDIT v138 — Help modal visual rebuild

## Obiectiv

Refacerea modalului „Cum obții fișierul orar / curba de sarcină?” ca în imaginile de referință, fără să fie schimbată zona facturii lunare sau logica de upload.

## Verificări efectuate

- Confirmat că fișierul de bază conține `#distributorHelpModal`, `data-dist-tab` și `data-dist-panel`.
- Fixul este izolat pe selectorul `#distributorHelpModal.svt-help101-backdrop`.
- Nu sunt folosite reguli globale care să afecteze inputurile facturii.
- Păstrată compatibilitatea cu scriptul existent de deschidere/închidere și schimbare taburi.

## Ce s-a urmărit vizual

- Lățime modal apropiată de referințe, cu margini laterale curate.
- Titlu mare, centrat, cu subtitlu sub el.
- Taburi pill pe un singur rând la desktop.
- Tab activ verde cu shadow discret.
- Card hero mare, verde pal, cu ilustrație în stânga și text în dreapta.
- Zona inferioară: card mare „Pașii de urmat” în stânga și două carduri în dreapta.
- Footer cu buton verde mare și surse/documentație în dreapta.

## Limitări

- Testul vizual final pe GitHub Pages trebuie confirmat după push/deploy, cu cache gol (`Ctrl + F5`).
