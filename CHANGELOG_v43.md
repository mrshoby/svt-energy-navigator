# v43 — PVGIS/inverter production parser + embedded PV detection + clean question page

Fixuri:
- producția locală nu mai este tratată ca „curbă de sarcină”; parserul are mod separat `production`;
- compatibilitate pentru PVGIS Timeseries CSV (`time`, `P`, etc.);
- compatibilitate generică pentru exporturi inverter cu dată/oră + producție/putere/PAC/PV/yield;
- dacă fișierul de consum conține deja coloane de producție locală/PV, se detectează automat;
- checkbox-ul `Am și producție locală / fotovoltaică` se bifează automat când producția există în fișierul principal;
- zona de upload producție locală primește overlay diagonal: `DATE PRODUCȚIE EXISTENTE ÎN FIȘIERUL DE CONSUM ÎNCĂRCAT MAI SUS`;
- în `testeaza-gratuit.html` se elimină subtitle-ul, pill-urile de context și mesajul informativ de jos;
- păstrează întrebările curate, fără iconițe.

Observație:
PVGIS `P` este putere medie în W/kW în interval; conversia se face la kWh pe interval.
