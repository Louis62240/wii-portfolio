# Menu Wii — mes projets

Une page unique qui rejoue le menu de la Wii et sert de lanceur vers mes projets.
Pas de build, pas de dépendance : c'est du HTML/CSS/JS à ouvrir tel quel.

## Ajouter un projet

Tout se passe dans **`js/projects.js`**. Un projet = un objet :

```js
{
  title: "Carnet de voyages",
  url: "https://exemple.com/voyages",
  image: "assets/banners/voyages.jpg",  // optionnel, format 4:3
  color: "#0aa5e0",                     // optionnel, dégradé de secours
  subtitle: "Web app",                  // optionnel
  newTab: true                          // optionnel
}
```

- Sans `image`, la chaîne affiche un dégradé de la couleur `color` avec le titre
  dessus. C'est déjà propre, les vignettes peuvent attendre.
- Les vignettes vont dans `assets/banners/`. Format idéal **4:3** (512×384 par ex.).
- 12 chaînes par page, les pages suivantes se créent toutes seules.
- L'ordre de la liste = l'ordre à l'écran.

### `newTab`

Par défaut, cliquer sur une chaîne la fait **zoomer en plein écran** puis ouvre le
projet dans le même onglet — le bouton retour du navigateur ramène au menu.
Mettre `newTab: true` ouvre dans un nouvel onglet, mais sans animation (les
navigateurs exigent que `window.open` parte directement du clic).

## Les sons

Les effets (survol, clic, ouverture, changement de page) sont **synthétisés en
Web Audio** : aucun fichier audio n'est nécessaire et rien n'est sous copyright.

La musique d'ambiance est **désactivée par défaut**. Pour l'activer : déposer le
fichier dans `audio/`, puis renseigner son chemin en haut de `js/app.js` :

```js
var MUSIC_SRC = "audio/menu.mp3";
```

Tant que cette valeur est vide, aucun fichier n'est demandé (pas de 404 dans la
console) et le bouton ne pilote que les effets sonores. Le bouton rond en bas à droite coupe/rétablit le son, et le choix est
mémorisé dans le navigateur.

> À noter : la musique du menu Wii est une œuvre Nintendo. La déposer localement
> pour son usage personnel est une chose, la publier en ligne en est une autre.

## Raccourcis

| Action | Touche |
|---|---|
| Page suivante / précédente | `→` / `←` |
| Navigation clavier | `Tab` puis `Entrée` |

Le curseur main de Wiimote s'active automatiquement à la souris. Sur écran
tactile, le curseur système reprend la main.

## Lancer en local

Un simple double-clic sur `index.html` suffit. Pour un vrai serveur :

```powershell
python -m http.server 8080
# puis http://localhost:8080
```

## Mettre en ligne (GitHub Pages)

```powershell
git init
git add .
git commit -m "Menu Wii"
git branch -M main
git remote add origin https://github.com/<moi>/<repo>.git
git push -u origin main
```

Puis dans le dépôt : **Settings → Pages → Source: `main` / `root`**.
Le site sort sur `https://<moi>.github.io/<repo>/`.

## Structure

```
index.html            structure de la page
css/style.css         tout le visuel
js/projects.js        <- le seul fichier à éditer au quotidien
js/app.js             grille, pagination, sons, curseur, transitions
assets/wii_hand.png   le curseur main (pixel art 27x33)
assets/banners/       les vignettes 4:3
audio/menu.mp3        musique optionnelle
```
