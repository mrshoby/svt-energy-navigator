# AUDIT v247

## Cerință
Pe `testeaza-gratuit.html`, în secțiunea `Unde apare economia în următoarele 24h?`, logica pentru:
- `Cât economisesc dacă prețul se schimbă pe ore?`
- `Cât economisesc cu o baterie?`
- `Cât economisesc dacă mut consumul în ore mai ieftine?`
- `Cât economisesc dacă reduc consumul în orele scumpe?`

trebuia verificată și făcută mai realistă. Fereastra din dreapta trebuia să explice detaliile scenariului, inclusiv capacitatea bateriei.

## Fix aplicat
- PZU: comparație explicită între tarif introdus și preț orar; poate afișa cost suplimentar, nu doar economie.
- BESS: capacitate nominală/utilă, randament, SoC, energie din PV, energie din rețea, cost încărcare echivalent și prag minim de spread.
- Mutare consum: limită realistă de consum mutabil și economie doar dacă ora țintă este mai ieftină.
- Reducere consum: limită realistă de reducere și cost evitat pe ora analizată.
- Fereastra dreaptă are listă de presupuneri/limitări pentru fiecare scenariu.

## Fișier modificat
- testeaza-gratuit.html
