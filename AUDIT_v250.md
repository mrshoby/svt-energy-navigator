# AUDIT v250

## Problemă
La fullscreen, nota explicativă pentru distribuitor și nivelul de tensiune putea apărea peste mijlocul conținutului.

## Cauză
Existau reguli istorice concurente pentru `left`, `right`, `position: fixed` și breakpointuri.

## Remediere
- Reguli finale cu specificitate ridicată pentru `#tariffSideNotes.svt194-side-note`.
- Poziția desktop este calculată din marginea reală a `.hero`.
- Lățimea este limitată la spațiul rămas până la marginea viewportului.
- Poziția verticală este calculată din rândul „Detalii tarif”.
- La viewport îngust, nota devine statică și intră în flux.
