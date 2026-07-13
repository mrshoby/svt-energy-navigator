# AUDIT v134

## Țintă vizuală
Pe baza screenshotului primit după v133:
- uploadul facturii de la `2 Sursa datelor` trebuie să arate și să fie aliniat ca uploadul de la `3 Încarcă fișierul`;
- câmpurile facturii trebuie să rămână scurte, nu late;
- inputul trebuie să se întindă doar cât labelul de deasupra, nu până la următoarea coloană.

## Intervenție
- Am înlocuit blocul CSS `svt-v133-invoice-align-clean` cu `svt-v134-invoice-aaa2-exact`.
- Nu s-au folosit transformări JS, offseturi dinamice sau `translateY`.
- Nu s-au introdus scripturi noi care să modifice DOM-ul la click/focus.

## Risc redus
- Patchul este izolat pe `#invoiceBox`, `#invoiceDrop`, `#invoiceChoose` și clasele invoice.
- Nu afectează uploadul principal `#dropZone`, ci doar îl copiază ca dimensiuni/aliniere pentru uploadul facturii.
