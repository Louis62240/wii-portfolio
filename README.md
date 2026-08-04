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
- 12 chaînes par page (9 sous 760 px, 6 sous 460 px : la grille reste sur
  trois rangées). Les pages suivantes se créent toutes seules.
- L'ordre de la liste = l'ordre à l'écran.

### L'écran de présentation

Dès qu'**un** des champs `description`, `tech`, `repo` ou `shots` est renseigné,
le clic n'ouvre plus le lien directement : la chaîne s'agrandit en un écran qui
présente le projet, avec les boutons **Retour** et **Démarrer**.

```js
{
  title: "Carnet de voyages",
  url: "https://exemple.com/voyages",
  image: "assets/banners/voyages.jpg",
  color: "#0aa5e0",
  subtitle: "Web app",

  description: "Ce que fait le projet.\n\nUn second paragraphe.",
  tech: ["Vue", "Supabase"],
  repo: "https://github.com/moi/voyages",
  shots: ["assets/shots/voyages-1.png", "assets/shots/voyages-2.png"]
}
```

- Une **ligne vide** dans `description` sépare deux paragraphes.
- `repo` ajoute un bouton « Code source », toujours ouvert dans un nouvel onglet.
  Une chaîne peut ainsi mener à deux endroits, la démo et le dépôt.
- Sans aucun de ces champs, la chaîne se lance directement, comme avant.
- `url` devient facultatif si le projet a une description : un projet sans démo
  en ligne n'affiche alors que « Code source ».
- Les textes sont insérés en `textContent`, jamais en HTML : pas de mise en forme
  possible dans `description`, mais aucun risque d'injection non plus.

`Échap` ou **Retour** referme l'écran et rend le focus à la chaîne d'origine.

### `newTab`

Par défaut, cliquer sur une chaîne la fait **zoomer en plein écran** puis ouvre le
projet dans le même onglet — le bouton retour du navigateur ramène au menu.
Mettre `newTab: true` ouvre dans un nouvel onglet, mais sans animation (les
navigateurs exigent que `window.open` parte directement du clic).
Combiné à une description, `newTab` s'applique au bouton **Démarrer**.

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
| Fermer l'écran de présentation | `Échap` |

Le curseur main de Wiimote s'active automatiquement à la souris. Sur écran
tactile, le curseur système reprend la main.

## Lancer en local

Un simple double-clic sur `index.html` suffit. Pour un vrai serveur :

```powershell
python -m http.server 8080
# puis http://localhost:8080
```

## Mise en ligne

Le site est hébergé sur mon serveur, à `https://louishanquiez.fr/`.
**Toute poussée sur `main` le déploie**, via `.github/workflows/deploy.yml`.

La chaîne fait trois choses dans cet ordre :

1. **elle vérifie** — syntaxe des `js/*.js`, validité de `sitemap.xml`,
   présence des fichiers essentiels. Si l'un échoue, rien n'est déployé.
2. **elle synchronise** — `rsync --delete` vers `/var/www/wii-portfolio`.
3. **elle contrôle** — l'accueil et `kit/kit.css` doivent répondre 200,
   sinon le job est en échec.

Le bouton *Run workflow* de l'onglet **Actions** relance un déploiement
sans avoir à pousser.

### Ce qui n'est pas déployé

`.git`, `.github`, `.gitignore`, `README.md`, et `data/` — ce dernier est
exclu exprès pour qu'un script qui y déposerait ses JSON sur le serveur ne
soit pas effacé au déploiement suivant.

### La clé de déploiement

Un seul secret GitHub, `DEPLOY_KEY` : la clé privée d'une paire dédiée,
qui ne sert qu'à ça. Côté serveur elle est bridée dans `authorized_keys` :

```
command="/usr/bin/rrsync -wo /var/www/wii-portfolio",restrict ssh-ed25519 …
```

Elle ne peut donc qu'**écrire par rsync dans le dossier du site** : aucune
commande, aucun shell, aucune lecture ailleurs. C'est pour ça que la
destination du `rsync` est `:/` — ce chemin est relatif au dossier autorisé.

Les clés publiques du serveur sont versionnées dans `.github/known_hosts`
(elles ne sont pas secrètes) : le serveur est épinglé, et une substitution
d'hôte fait échouer le déploiement au lieu de livrer le site à un inconnu.

### Déployer à la main, en dépannage

```bash
rsync -avz --delete \
  --exclude='.git' --exclude='.github' --exclude='.gitignore' \
  --exclude='README.md' --exclude='data/' \
  -e "ssh -i ~/.ssh/wii-portfolio-deploy_key -o IdentitiesOnly=yes" \
  ./ ubuntu@51.210.97.104:/
```

## Structure

```
.github/workflows/    la chaine de deploiement
kit/kit.css           l'ADN visuel partage par mes pages (couleurs, typo,
                      composants) -- le menu s'en sert aussi
kit/index.html        le catalogue des composants (/kit/)
index.html            structure de la page
css/style.css         ce qui est propre au menu : grille, curseur
                      Wiimote, ecran de presentation
js/projects.js        <- le seul fichier à éditer au quotidien
js/app.js             grille, pagination, sons, curseur, transitions
robots.txt            indexation + pointeur vers le sitemap
sitemap.xml           les URLs du site (a completer si tu en ajoutes)
assets/wii_hand.png   le curseur main (pixel art 27x33)
assets/avatar.png     mon Mii, affiche dans le bouton rond en bas a gauche
assets/og-cover.png   1200x630, l'apercu affiche quand on partage le lien
assets/banners/       les vignettes 4:3, en WebP
audio/menu.mp3        musique optionnelle
```
