/* ============================================================
   MES PROJETS — c'est le SEUL fichier à éditer au quotidien.
   ============================================================

   Chaque projet = un objet dans la liste ci-dessous.

   Champs de la vignette :
     title    (obligatoire) nom affiché sous la chaîne
     url      (obligatoire*) lien ouvert au lancement
     image    (optionnel)   bannière : "assets/banners/mon-projet.jpg"
                            format idéal 4:3 (ex. 512x384). Si absent
                            ou introuvable -> dégradé auto avec le titre.
     color    (optionnel)   couleur du dégradé de secours (ex. "#e8453c")
     subtitle (optionnel)   petit texte affiché sur le dégradé de secours
     newTab   (optionnel)   true = ouvre dans un nouvel onglet, sans
                            animation. Par défaut la chaîne zoome en
                            plein écran puis ouvre dans le même onglet
                            (retour = bouton précédent du navigateur).

   Écran de présentation — dès qu'UN de ces champs est renseigné, le
   clic n'ouvre plus le lien : il ouvre d'abord un écran décrivant le
   projet, avec les boutons « Retour » et « Démarrer ». Sans aucun de
   ces champs, la chaîne se lance directement comme avant.

     description (optionnel) texte de présentation. Une ligne vide
                             sépare deux paragraphes.
     tech        (optionnel) liste de technologies : ["Python", "Nginx"]
     repo        (optionnel) lien « Code source », ouvert dans un
                             nouvel onglet
     shots       (optionnel) captures d'écran : ["assets/shots/a.png"]

   * url devient facultatif si le projet a une description : un projet
     sans démo en ligne affiche alors seulement « Code source ».

   L'ordre de la liste = l'ordre à l'écran. 12 chaînes par page en
   grand écran (9 puis 6 sur les largeurs réduites), les pages
   suivantes se créent toutes seules.
   ============================================================ */

const PROJECTS = [
  {
    title: "Flight Scanner",
    url: "https://louishanquiez.fr/travel/",
    image: "assets/banners/flight_scanner.webp",
    color: "#0aa5e0",
    subtitle: "Comparateur de vols",
    tech: ["Python", "Gunicorn", "Nginx"],
    // TODO Louis : texte rédigé d'après la conf du serveur, à relire.
    description:
      "Un comparateur de vols qui interroge plusieurs sources et remonte " +
      "les meilleures combinaisons de dates au départ de Paris.\n\n" +
      "Les recherches respectent le crawl-delay des sites interrogés : " +
      "une requête large peut demander plusieurs minutes avant de rendre " +
      "ses résultats."
  },
  {
    title: "Trains à 0 €",
    url: "/trains/",
    image: "assets/banners/trains.webp",
    color: "#5b3fa8",
    subtitle: "TGVmax en direct",
    tech: ["JavaScript", "SNCF Open Data"],
    description:
      "Tous les trains réservables à 0 € avec un abonnement TGVmax, entre " +
      "deux gares, sur les trente jours publiés par la SNCF.\n\n" +
      "La page interroge l'open data SNCF directement depuis le navigateur : " +
      "aucun serveur, aucune base, et des horaires toujours à jour. Un bot " +
      "Discord surveille en parallèle les mêmes données et signale les " +
      "nouveaux trains dès qu'ils apparaissent."
  }
];
