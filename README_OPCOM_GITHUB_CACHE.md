# SVT OPCOM PZU GitHub Cache

Acest proiect poate prelua preturile PZU OPCOM fara server separat:

```text
OPCOM CSV oficial -> GitHub Actions -> data/opcom/pzu/latest.json -> testeaza-gratuit.html
```

Workflow-ul `.github/workflows/opcom-pzu-cache.yml` ruleaza la 15 minute si executa `scripts/fetch-opcom-pzu-cache.mjs`.

Date generate:

```text
data/opcom/pzu/latest.json
data/opcom/pzu/YYYY-MM-DD.json
data/opcom/pzu/status.json
```

Pagina foloseste cache-ul daca exista. Daca nu exista sau nu poate fi citit, estimarea Q1 ramane functionala cu profil local orientativ.
