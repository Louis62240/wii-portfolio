/* ============================================================
   MES PROJETS — c'est le SEUL fichier à éditer au quotidien.
   ============================================================

   Chaque projet = un objet dans la liste ci-dessous.

   Champs disponibles :
     title    (obligatoire) nom affiché sous la chaîne
     url      (obligatoire) lien ouvert au clic
     image    (optionnel)   bannière : "assets/banners/mon-projet.jpg"
                            format idéal 4:3 (ex. 512x384). Si absent
                            ou introuvable -> dégradé auto avec le titre.
     color    (optionnel)   couleur du dégradé de secours (ex. "#e8453c")
     subtitle (optionnel)   petit texte affiché sur le dégradé de secours
     newTab   (optionnel)   true = ouvre dans un nouvel onglet, sans
                            animation. Par défaut la chaîne zoome en
                            plein écran puis ouvre dans le même onglet
                            (retour = bouton précédent du navigateur).

   L'ordre de la liste = l'ordre à l'écran. 12 chaînes par page,
   les pages suivantes se créent toutes seules.
   ============================================================ */

const PROJECTS = [
  {
    title: "Flight Scanner",
    url: "https://louishanquiez.fr/travel/",
    image: "assets/banners/flight_scanner.png",
    color: "#0aa5e0",
    subtitle: "Comparateur de vols"
  }
];
