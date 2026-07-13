# AUDIT v86

Probleme din v85:
1. A fost micșorată greșit fereastra dashed de upload, nu cardul/rândul mare.
2. `← Pagina principală` ducea greșit la `testeaza-gratuit.html`.
3. Helperul de la `Sursa datelor` încă avea titlul `Cum preferi...`.

Rezolvare:
- upload box principal și PV la min-height 46px, buton intern 34px;
- cardul/rândul 3 are padding vertical redus;
- link pagina principală schimbat în `./index.html`;
- textul helper title eliminat.
