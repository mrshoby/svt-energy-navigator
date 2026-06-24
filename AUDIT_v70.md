# AUDIT v70 — Hotfix conținut dublat Electric + Termic

Cauza problemei:
- în v69 CSS-ul pentru `.termic-flow` avea `display:grid!important`;
- această regulă suprascria `style="display:none"` pus pe `#termicSection`;
- rezultatul: Electric și Termic apăreau simultan pe aceeași pagină.

Fix v70:
- `#termicSection` pornește cu atribut `hidden`;
- `setTab()` setează explicit:
  - `electricSection.hidden = !electric`;
  - `termicSection.hidden = electric`;
  - `body[data-energy-mode]`;
- CSS nou:
  - `#termicSection[hidden] { display:none!important; }`;
  - `body[data-energy-mode="electric"] #termicSection { display:none!important; }`;
  - `body[data-energy-mode="termic"] #electricSection { display:none!important; }`;
- butoanele mirror din Termic pot reveni la Electric.
