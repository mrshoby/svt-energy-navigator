# AUDIT v90

Problema:
- textul din rândul 3 era încă perceput sus/jos în card.

Fix aplicat:
- `.upload-flow-row .flow-left` forțat cu `display:flex`, `align-items:center`, `height:100%`;
- `.upload-flow-row .title-wrap` forțat la `height:44px` și `justify-content:center`;
- marginile titlului și subtitlului resetate controlat.
