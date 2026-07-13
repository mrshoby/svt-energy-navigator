# TEST REPORT v136

Static checks prepared for:

- `node --check assets/js/svt-analysis-engine.js`
- `node --check assets/js/svt-load-curve-profiles.js`
- Inline scripts extracted from `incarcare-curba-sarcina.html`

Result in sandbox: PASS for available JavaScript syntax checks.

Manual post-deploy check required:
1. Open `incarcare-curba-sarcina.html?v=136`.
2. In `2 Sursa datelor`, click `Am doar factura lunară`.
3. Confirm invoice fields appear only then.
4. Click `Încarc fișierul orar`.
5. Confirm invoice fields disappear and step 3 upload returns.
