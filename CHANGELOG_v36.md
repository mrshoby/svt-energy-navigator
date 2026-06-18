# v36 — Upload fișier / factură lunară manuală + tarif fix

Modificări:
- păstrează designul paginii `Curba ta de consum zilnic`;
- la consum electric există două opțiuni:
  - `Încarc fișierul orar`;
  - `Am doar factura lunară`;
- la factura lunară rămâne introducerea manuală, fiind mai sigură decât parsarea automată a PDF-ului în browser;
- se adaugă upload opțional pentru factură, doar pentru verificare/atașare;
- se elimină fraza: `Dacă nu ai acces, îl poate solicita contabilul sau responsabilul tehnic.`;
- `Tip tarif actual` este blocat pe `Tarif fix`;
- nivelul de tensiune/distribuție nu mai este cerut în modul tarif fix total;
- producția locală/PV rămâne opțională;
- fișierul orar se procesează cu parserul real v32/v34;
- factura lunară generează doar estimare orară pe baza programului de lucru.

Important:
Factura lunară nu poate răspunde exact la `când`, pentru că nu conține distribuția reală pe ore. Răspunsul real se obține din curbă orară/15 minute.
