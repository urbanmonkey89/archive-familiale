# Archive familiale — guide de la personne qui saisit

Ce guide est pour la personne qui alimente l'arbre. Pas besoin de connaissances techniques.

## 1. Installer l'application

1. Ouvrez la page de téléchargement qu'on vous a transmise (page « Releases » sur GitHub).
2. Téléchargez :
   - **Windows** : le fichier qui se termine par `-setup.exe` ;
   - **Linux** : le fichier `.AppImage` (ou `.deb` sur Ubuntu / Debian).
3. Lancez-le. Sous Windows, si un écran bleu « Windows a protégé votre ordinateur » apparaît,
   cliquez sur **Informations complémentaires** puis **Exécuter quand même** (l'application n'est
   pas « signée » par un éditeur commercial, c'est normal).

Ensuite, l'application **se met à jour toute seule** : quand une nouvelle version existe,
un bandeau propose « Installer et redémarrer ».

## 2. Premier lancement

- **Créer une nouvelle archive** : donnez-lui un nom (« La famille Martin »), puis choisissez
  un dossier vide, par exemple `Documents\Archive Famille`. Tout y sera rangé :
  - `archive.json` : toutes les informations (personnes, liens, histoires…) ;
  - `medias\` : les photos originales ;
  - `sauvegardes\` : des copies automatiques.
- **Ouvrir une archive existante** : si on vous a donné un dossier d'archive (ou un ZIP décompressé).
- **Découvrir avec une famille d'exemple** : pour s'entraîner sans risque, rien n'est enregistré.

L'application rouvre automatiquement la dernière archive au lancement suivant.

## 3. Saisir la famille

- **Ajouter une personne** : bouton doré en haut à droite. Seul le prénom ou le nom est obligatoire.
- **Ajouter un parent, un enfant, un conjoint, un frère ou une sœur** : ouvrez la fiche de la personne,
  puis utilisez les liens « ＋ Enfant », « ＋ Conjoint »… dans le cadre **Liens familiaux**.
  C'est la façon la plus simple de construire l'arbre, de proche en proche.
- **Relier deux personnes déjà saisies** : « Relier une personne existante… » dans le même cadre.
- **Modifier un mariage** (date, divorce, veuvage) : petit crayon ✎ à côté du conjoint,
  ou clic sur le cœur ♥ dans l'arbre.
- **Dates** : tapez ce que vous savez — `1931`, `14/03/1931`, `vers 1890`, `avant 1900`, `entre 1890 et 1895`.
- **Photos** : sur une fiche, « ＋ Portrait » ou la case « ＋ Ajouter » sous Photos. Indiquez qui est
  sur la photo : elle apparaîtra sur la page de chacun.
- **Histoires et souvenirs** : « ＋ Ajouter » dans la section du même nom. C'est le cœur de l'archive !
- **Lieux** : onglet Lieux, pour les maisons, commerces, villages qui ont compté.
- **Branches** (couleurs dans l'arbre) : roue ⚙ en haut, puis « Branches de la famille ».

Tout est **enregistré automatiquement** (indication « ✓ Enregistré » en haut).

## 4. L'arbre

- Cliquez sur une personne pour **centrer** l'arbre sur elle ; cliquez une seconde fois pour ouvrir sa fiche.
- Les boutons « Ancêtres » et « Descendants » règlent le nombre de générations affichées.
- Les petits ▲ / ▼ sur une carte signalent qu'il y a d'autres ancêtres / descendants : cliquez dessus pour les voir.
- Glissez avec la souris pour vous déplacer, **Ctrl + molette** pour zoomer.

## 5. Publier le site pour la famille

1. Roue ⚙ → **Créer le site dans un dossier…** → choisissez un dossier vide (par ex. `Documents\Site famille`).
2. Envoyez ce dossier en ligne (Cloudflare Pages, voir avec la personne qui a installé l'application) :
   sur le tableau de bord Cloudflare, projet du site → **Create deployment** → glissez le dossier.
3. Republiez de temps en temps, après vos ajouts.

## 6. Sauvegardes — important

- Une copie de `archive.json` est faite à chaque ouverture dans `sauvegardes\` (20 dernières).
- Mais ces copies sont sur le même ordinateur : **une fois par mois**, faites
  Roue ⚙ → **Télécharger toute l'archive (ZIP)** et copiez ce fichier sur une clé USB ou un disque externe.
- Pour restaurer une ancienne version : fermez l'application, remplacez `archive.json` par un fichier
  du dossier `sauvegardes` (renommé en `archive.json`), relancez.

## 7. Importer depuis Geneanet, Heredis…

Roue ⚙ → **Importer un fichier GEDCOM…** Exportez d'abord votre arbre en GEDCOM (`.ged`) depuis l'autre logiciel.
Conseil : importez dans une **nouvelle archive vide**, l'import ne fusionne pas les doublons.
