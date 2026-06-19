# v67 — Compact 1:1 Layout + Thermal Restore

Implementare principală:
- refăcut din nou layout-ul pentru `incarcare-curba-sarcina.html` ca să fie mai compact și mai aproape de referințele trimise;
- redus efectul „lăbărțat” prin:
  - card central mai compact;
  - rânduri mai scurte și mai bine aliniate;
  - butoane și inputuri mai compacte;
  - grile controlate pentru tarif și termic;
- reparat overflow-ul de la `Detalii tarif` prin transformarea zonei din dreapta într-un grid 2+1 rânduri;
- zona `Termic` nu mai este o pagină goală / simplificată excesiv:
  - are același limbaj vizual ca zona electrică;
  - are rânduri compacte, similare cu designul de referință;
  - păstrează câmpurile funcționale existente: `thermalMonitored`, `thermalSource`, `annualThermal`, `thermalUnit`;
- `De unde obții fișierul?` rămâne o singură dată și este hyperlink funcțional;
- fix logic: `fileModeBox` revine pe `display:grid` când este activ modul `file`, nu `block`;
- nu s-a schimbat motorul de parsare / analiză, doar layout-ul și prezentarea.
