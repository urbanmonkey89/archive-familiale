# Archive familiale

Application pour construire l'arbre généalogique de la famille, avec photos, lieux et histoires,
puis publier un site privé que toute la famille peut consulter (ordinateur et téléphone).

- **Édition** : application de bureau Windows / Linux (Tauri), données dans un simple dossier.
- **Consultation** : site statique en lecture seule, protégé par login (Cloudflare Pages + Access).
- **Échange** : import / export GEDCOM (Geneanet, Heredis, Gramps…), export ZIP complet.

Interface reprise de la maquette Claude Design (dossier `design/`).

```bash
npm install
npm run dev     # http://localhost:5173 — « Découvrir avec une famille d'exemple » pour essayer
npm test
```

Documentation :
- [Guide de la personne qui saisit](docs/GUIDE-EDITEUR.md)
- [Guide de maintenance](docs/MAINTENANCE.md) (GitHub, versions, mise en ligne)

Ce dépôt ne contient **aucune donnée familiale réelle** : seulement le code et une famille d'exemple fictive.
