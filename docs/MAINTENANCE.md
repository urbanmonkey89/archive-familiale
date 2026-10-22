# Archive familiale — guide de maintenance

Pour la personne qui fait évoluer l'application (avec l'aide de Claude).

## Vue d'ensemble

```
Application installée (Tauri)  ──lit/écrit──▶  Dossier « Archive Famille »  (archive.json + medias/ + sauvegardes/)
        │                                                    chez l'éditeur, jamais dans ce dépôt
        └─ « Créer le site » ──▶ dossier site/ ──glisser-déposer──▶ Cloudflare Pages + Cloudflare Access (login)
```

- **Un seul code d'interface** (React + TypeScript, dossier `src/`) sert à la fois à l'application
  d'édition et au site publié (même code, en lecture seule : `data-mode="site"` dans `index.html`).
- **Les données** sont un fichier JSON lisible (`archive.json`), décrit et validé dans `src/data/schema.ts`.
- **Aucune logique en Rust** : `src-tauri/` ne fait qu'activer les modules fichiers, dialogues et mises à jour.

| Dossier | Rôle |
|---|---|
| `src/data/` | Schéma (`schema.ts`), migrations, dates floues, actions de modification (`actions.ts`), requêtes (`selectors.ts`), état (`store.ts`), famille d'exemple |
| `src/storage/` | Accès au disque : navigateur (Edge/Chrome), Tauri, exemple en mémoire, site statique |
| `src/tree/layout.ts` | Calcul automatique des positions de l'arbre |
| `src/screens/`, `src/forms/`, `src/ui/` | Écrans, formulaires, composants partagés |
| `src/export/` | Export du site, GEDCOM, ZIP |
| `src/theme/app.css` | Couleurs et styles (repris de la maquette Claude Design, dans `design/`) |
| `src-tauri/` | Configuration de l'application de bureau |
| `.github/workflows/` | Vérifications automatiques et compilation des installeurs |

## Travailler sur le code

```bash
npm install          # une fois, après un clonage
npm run dev          # ouvre l'application sur http://localhost:5173 (Edge ou Chrome)
npm test             # tests automatiques
npm run build        # vérification des types + build de production
```

En développement (`npm run dev`), l'application fonctionne dans Edge/Chrome : elle peut ouvrir un vrai
dossier d'archive. La **création du site** n'y est pas disponible (il faut un build) : utilisez
`npm run build` puis `npm run preview`, ou l'application installée.

Pour lancer la vraie application de bureau en local, il faut Rust (facultatif, la CI s'en charge) :
installez Rust depuis https://rustup.rs et les « Visual Studio Build Tools » (C++), puis `npm run app`.

### Modifier le format des données

1. Modifier `src/data/schema.ts` et incrémenter `SCHEMA_VERSION`.
2. Ajouter dans `src/data/migrations.ts` la fonction qui convertit l'ancien format.
3. Ajouter un test. Les archives existantes seront converties à l'ouverture
   (une copie de sauvegarde est faite avant, à chaque ouverture).

## Mise en place de GitHub (une seule fois)

1. Créer un compte sur https://github.com, puis un **dépôt public** (ex. `archive-familiale`).
2. Dans `src-tauri/tauri.conf.json`, remplacer `PROPRIETAIRE/DEPOT` par `votre-compte/archive-familiale`.
3. Dans le dépôt GitHub → **Settings → Secrets and variables → Actions → New repository secret** :
   - `TAURI_SIGNING_PRIVATE_KEY` : le contenu du fichier `C:\Users\<vous>\.tauri\archive-familiale.key`
   - (pas de `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` : la clé a été créée sans mot de passe)

   ⚠️ Cette clé signe les mises à jour : **ne la partagez jamais, ne la mettez jamais dans le dépôt**,
   et gardez-en une copie (sans elle, les applications installées ne pourront plus se mettre à jour).
4. Envoyer le code : `git remote add origin https://github.com/votre-compte/archive-familiale.git` puis `git push -u origin main`.

## Publier une nouvelle version de l'application

1. Changer `"version"` dans `package.json` (ex. `0.2.0`) — l'application et les installeurs reprennent ce numéro.
2. `git commit -am "Version 0.2.0"`, puis `git tag v0.2.0` et `git push origin main v0.2.0`.
3. GitHub Actions compile les installeurs (~15 min, onglet **Actions**) et crée la « Release ».
4. Les applications installées proposent la mise à jour au lancement suivant.

## Mise en ligne du site (Cloudflare, gratuit)

1. Créer un compte sur https://dash.cloudflare.com.
2. **Workers & Pages → Create → Pages → Upload assets** : nommer le projet (ex. `famille-martin`),
   glisser le dossier créé par « Créer le site dans un dossier… ». Le site est en ligne sur `famille-martin.pages.dev`.
3. **Protéger par login** : dans le projet Pages → **Settings → Access policy** (ou **Zero Trust → Access →
   Applications → Add → Self-hosted**, domaine `famille-martin.pages.dev`). Politique « Allow » avec la liste
   des adresses e-mail de la famille. Chacun reçoit un code par e-mail pour se connecter (gratuit jusqu'à 50 personnes).
   Penser à protéger aussi les adresses de prévisualisation `*.famille-martin.pages.dev`.
4. Pour mettre à jour : **Create deployment** et glisser le nouveau dossier.

## En cas de problème

- **« ⚠ Non enregistré »** en haut : le dossier de l'archive n'est plus accessible (clé USB retirée,
  disque réseau…). Survoler le message donne le détail.
- **Archive illisible** : restaurer un fichier de `sauvegardes/` (voir le guide de l'éditeur).
- **Les tests** (`npm test`) couvrent : dates, liens familiaux, placement de l'arbre, GEDCOM.
  Les lancer après toute modification.
