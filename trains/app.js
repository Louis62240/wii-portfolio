/* ============================================================
   Trains à 0 € — interroge l'open data SNCF depuis le navigateur.

   Aucun backend : le jeu de données « tgvmax » de ressources.data.sncf.com
   répond avec « access-control-allow-origin: * », donc la page peut le
   questionner directement. C'est aussi ce que fait le bot Discord du
   projet sncf-max-tracker, qui surveille les nouveautés toutes les 3 h ;
   cette page-ci montre ce qui est disponible à l'instant.
   ============================================================ */

(() => {
  "use strict";

  const API = "https://ressources.data.sncf.com/api/explore/v2.1/catalog/datasets/tgvmax";
  const PAR_PAGE = 100;          // maximum autorisé par l'API
  const MAX_PAGES = 40;          // garde-fou : 4000 trains suffisent largement

  const JOURS_FR = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
  const JOURS_COURT = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
  const MOIS_FR = ["janv.", "févr.", "mars", "avr.", "mai", "juin",
                   "juil.", "août", "sept.", "oct.", "nov.", "déc."];

  const $ = (id) => document.getElementById(id);
  const form = $("form");
  const zone = $("zone");

  /* ==========================================================
     Utilitaires
     ========================================================== */

  // Même échappement que le bot : ODSQL attend des chaînes entre
  // guillemets doubles, il faut donc protéger \ et ".
  const echapper = (v) => v.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

  const isoDate = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  function dateFr(iso) {
    const d = new Date(`${iso}T00:00:00`);
    return `${JOURS_COURT[d.getDay()]} ${d.getDate()} ${MOIS_FR[d.getMonth()]}`;
  }

  function minutes(hhmm) {
    const [h, m] = hhmm.split(":").map(Number);
    return h * 60 + m;
  }

  // Un train peut arriver après minuit : la durée doit rester positive.
  function duree(depart, arrivee) {
    let d = minutes(arrivee) - minutes(depart);
    if (d < 0) d += 24 * 60;
    return d;
  }

  const dureeFr = (min) => `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, "0")}`;

  /* ==========================================================
     Interface : jours de la semaine, liste des gares
     ========================================================== */

  function poserJours() {
    const hote = $("jourscoches");
    // Lundi en premier : c'est l'ordre attendu en France, alors que
    // getDay() commence le dimanche.
    [1, 2, 3, 4, 5, 6, 0].forEach((n) => {
      const label = document.createElement("label");
      label.className = "k-check";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.value = String(n);
      input.dataset.jour = "1";
      label.append(input, document.createTextNode(" " + JOURS_COURT[n]));
      hote.appendChild(label);
    });
  }

  const joursCoches = () =>
    [...document.querySelectorAll('[data-jour="1"]:checked')].map((i) => Number(i.value));

  async function chargerGares() {
    try {
      const res = await fetch(`${API}/facets?facet=origine`);
      if (!res.ok) return;
      const data = await res.json();
      const facette = (data.facets || []).find((f) => f.name === "origine");
      if (!facette) return;

      const liste = $("gares");
      facette.facets
        .map((f) => f.name)
        .sort((a, b) => a.localeCompare(b, "fr"))
        .forEach((nom) => {
          const opt = document.createElement("option");
          opt.value = nom;
          liste.appendChild(opt);
        });
    } catch {
      // Sans suggestions on peut toujours taper le nom à la main.
    }
  }

  /* ==========================================================
     Appel à l'API
     ========================================================== */

  async function trainsGratuits(de, vers, jours) {
    const debut = new Date();
    const fin = new Date();
    fin.setDate(fin.getDate() + jours);

    const where = [
      'od_happy_card="OUI"',
      `origine like "${echapper(de)}"`,
      `destination like "${echapper(vers)}"`,
      `date in ["${isoDate(debut)}".."${isoDate(fin)}"]`,
    ].join(" and ");

    const trouves = [];
    for (let page = 0; page < MAX_PAGES; page++) {
      const url = new URL(`${API}/records`);
      url.searchParams.set("where", where);
      url.searchParams.set("limit", String(PAR_PAGE));
      url.searchParams.set("offset", String(page * PAR_PAGE));
      url.searchParams.set("order_by", "date,heure_depart");

      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`l'API SNCF a répondu ${res.status}`);
      }
      const data = await res.json();
      trouves.push(...(data.results || []));

      if (trouves.length >= (data.total_count || 0) || !data.results?.length) break;
    }
    return trouves;
  }

  // L'API ne sait pas filtrer par jour de la semaine (testé : ni fonction
  // dayofweek(), ni "date in [liste]" — seul "date in [debut..fin]", un
  // intervalle, est accepté). Pour cibler juste certains jours, on énumère
  // les dates qui nous intéressent dans la fenêtre et on les OR ensemble,
  // chacune comme un intervalle d'un seul jour.
  function joursCandidats(jours, weekdaysCibles) {
    const dates = [];
    const curseur = new Date();
    for (let i = 0; i <= jours; i++) {
      if (weekdaysCibles.includes(curseur.getDay())) dates.push(isoDate(curseur));
      curseur.setDate(curseur.getDate() + 1);
    }
    return dates;
  }

  // weekdaysCibles : liste de jours (0=dimanche ... 6=samedi, comme
  // Date#getDay()) à laquelle restreindre la recherche, ou null pour
  // garder toute la fenêtre sans distinction de jour.
  function clauseDates(jours, weekdaysCibles) {
    const debut = new Date();
    const fin = new Date();
    fin.setDate(fin.getDate() + jours);

    if (!weekdaysCibles) {
      return `date in ["${isoDate(debut)}".."${isoDate(fin)}"]`;
    }

    const dates = joursCandidats(jours, weekdaysCibles);
    if (dates.length === 0) return null; // aucun des jours ciblés dans la fenêtre
    return "(" + dates.map((d) => `date in ["${d}".."${d}"]`).join(" or ") + ")";
  }

  // Contrairement à trainsGratuits (une paire de gares fixe), ici on fixe
  // un seul champ (origine OU destination) et on laisse l'autre libre, en
  // le faisant agréger par l'API (select + group_by) plutôt que de
  // rapatrier un train par ligne (des milliers sur 30 jours) : une
  // poignée de requêtes suffit. champGroupe vaut "destination" (liste des
  // villes accessibles depuis champFixe) ou "origine" (liste des villes
  // d'où revenir vers champFixe) — sert aux deux sens du mode "partout".
  async function agregerTrains(champFixe, valeurFixe, champGroupe, jours, weekdaysCibles = null) {
    const clauseDate = clauseDates(jours, weekdaysCibles);
    if (!clauseDate) return [];

    const where = [
      'od_happy_card="OUI"',
      `${champFixe} like "${echapper(valeurFixe)}"`,
      clauseDate,
    ].join(" and ");

    const lignes = [];
    for (let page = 0; page < MAX_PAGES; page++) {
      const url = new URL(`${API}/records`);
      url.searchParams.set("where", where);
      url.searchParams.set("select", `${champGroupe}, count(*) as nb, min(date) as premiere_date`);
      url.searchParams.set("group_by", champGroupe);
      url.searchParams.set("order_by", `premiere_date,${champGroupe}`);
      url.searchParams.set("limit", String(PAR_PAGE));
      url.searchParams.set("offset", String(page * PAR_PAGE));

      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`l'API SNCF a répondu ${res.status}`);
      }
      const data = await res.json();
      lignes.push(...(data.results || []));

      if (lignes.length >= (data.total_count || 0) || !data.results?.length) break;
    }
    return lignes;
  }

  // Pour chaque destination accessible depuis `de`, on regarde aussi si un
  // retour existe (même ville, comme origine cette fois vers `de`) : c'est
  // ce qui permet de repérer d'un coup d'œil un aller-retour possible,
  // sans avoir à re-chercher chaque ville une par une.
  const VENDREDI_SAMEDI = [5, 6];
  const DIMANCHE_LUNDI = [0, 1];

  async function destinationsAllerRetour(de, jours, weekend) {
    const [aller, retour] = await Promise.all([
      agregerTrains("origine", de, "destination", jours, weekend ? VENDREDI_SAMEDI : null),
      agregerTrains("destination", de, "origine", jours, weekend ? DIMANCHE_LUNDI : null),
    ]);

    const retourParVille = new Map(retour.map((r) => [r.origine, r]));

    return aller.map((d) => ({
      destination: d.destination,
      nb: d.nb,
      premiere_date: d.premiere_date,
      retour: retourParVille.get(d.destination) || null,
    }));
  }

  /* ==========================================================
     Filtres et tri, appliqués sur ce que l'API a renvoyé
     ========================================================== */

  function affiner(trains) {
    const hMin = $("heureMin").value;
    const hMax = $("heureMax").value;
    const jours = joursCoches();

    let out = trains;
    if (hMin) out = out.filter((t) => t.heure_depart >= hMin);
    if (hMax) out = out.filter((t) => t.heure_depart <= hMax);
    if (jours.length) {
      out = out.filter((t) => jours.includes(new Date(`${t.date}T00:00:00`).getDay()));
    }

    const tris = {
      date: (a, b) => a.date.localeCompare(b.date) || a.heure_depart.localeCompare(b.heure_depart),
      heure: (a, b) => a.heure_depart.localeCompare(b.heure_depart),
      duree: (a, b) => duree(a.heure_depart, a.heure_arrivee) - duree(b.heure_depart, b.heure_arrivee),
      trajet: (a, b) =>
        `${a.origine}${a.destination}`.localeCompare(`${b.origine}${b.destination}`, "fr") ||
        a.date.localeCompare(b.date),
    };
    return [...out].sort(tris[$("tri").value] || tris.date);
  }

  /* ==========================================================
     Rendu
     ========================================================== */

  const etat = (titre, texte, erreur = false, spinner = false) => {
    zone.innerHTML = "";
    const carte = document.createElement("div");
    carte.className = "k-card";
    carte.style.marginTop = "var(--k-gap)";

    const bloc = document.createElement("div");
    bloc.className = "k-state" + (erreur ? " k-state--error" : "");

    if (spinner) {
      const s = document.createElement("div");
      s.className = "k-spinner";
      bloc.appendChild(s);
    }
    const h = document.createElement("p");
    h.className = "k-state__title";
    h.textContent = titre;
    bloc.appendChild(h);

    if (texte) {
      const p = document.createElement("p");
      p.className = "t-note";
      p.textContent = texte;
      bloc.appendChild(p);
    }
    carte.appendChild(bloc);
    zone.appendChild(carte);
  };

  function rendre(trains, total) {
    zone.innerHTML = "";

    if (!trains.length) {
      etat(
        "Aucun train à 0 € pour ces critères",
        total
          ? `${total} train(s) trouvé(s) sur la période, mais aucun ne passe les filtres.`
          : "Essaie d'élargir la période ou de changer de gare."
      );
      return;
    }

    const titre = document.createElement("h2");
    titre.className = "t-h2";
    titre.textContent = `${trains.length} train${trains.length > 1 ? "s" : ""} à 0 € `;
    const petit = document.createElement("small");
    petit.textContent =
      trains.length === total ? "— tous affichés" : `— sur ${total} trouvés, avant filtres`;
    titre.appendChild(petit);
    zone.appendChild(titre);

    const wrap = document.createElement("div");
    wrap.className = "k-table-wrap";
    const table = document.createElement("table");
    table.className = "k-table";

    table.innerHTML =
      "<thead><tr>" +
      "<th scope='col'>Date</th><th scope='col'>Trajet</th>" +
      "<th scope='col'>Départ</th><th scope='col'>Arrivée</th>" +
      "<th scope='col' class='k-table__num'>Durée</th><th scope='col'>Train</th>" +
      "</tr></thead>";

    const tbody = document.createElement("tbody");
    for (const t of trains) {
      const jour = new Date(`${t.date}T00:00:00`).getDay();
      const weekend = jour === 0 || jour === 6;

      const tr = document.createElement("tr");

      const tdDate = document.createElement("td");
      tdDate.className = "t-jour" + (weekend ? " t-we" : "");
      tdDate.textContent = dateFr(t.date);
      tdDate.title = JOURS_FR[jour];

      const tdTrajet = document.createElement("td");
      tdTrajet.className = "t-trajet";
      tdTrajet.textContent = `${t.origine} → ${t.destination}`;

      const tdDep = document.createElement("td");
      tdDep.className = "t-time";
      tdDep.textContent = t.heure_depart;

      const tdArr = document.createElement("td");
      tdArr.className = "t-time";
      tdArr.textContent = t.heure_arrivee;

      const tdDur = document.createElement("td");
      tdDur.className = "k-table__num t-time";
      tdDur.textContent = dureeFr(duree(t.heure_depart, t.heure_arrivee));

      const tdNo = document.createElement("td");
      tdNo.className = "t-train";
      tdNo.textContent = t.train_no;

      tr.append(tdDate, tdTrajet, tdDep, tdArr, tdDur, tdNo);
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    wrap.appendChild(table);
    zone.appendChild(wrap);
  }

  // Une cellule "dès le [date] (n trains)", ou un badge d'absence si la
  // liste n'a rien pour cette ville (pas de retour trouvé sur la période).
  function celluleDateTrains(entree, texteAbsence) {
    const td = document.createElement("td");
    if (!entree) {
      const badge = document.createElement("span");
      badge.className = "k-chip k-chip--warn";
      badge.textContent = texteAbsence;
      td.appendChild(badge);
      return td;
    }

    const dateIso = (entree.premiere_date || "").slice(0, 10);
    const jour = new Date(`${dateIso}T00:00:00`).getDay();
    const weekend = jour === 0 || jour === 6;

    td.className = "t-jour" + (weekend ? " t-we" : "");
    td.title = JOURS_FR[jour];
    const trainWord = entree.nb > 1 ? "trains" : "train";
    td.textContent = `${dateFr(dateIso)} (${entree.nb} ${trainWord})`;
    return td;
  }

  function rendrePartout(destinations, origine, weekend) {
    zone.innerHTML = "";

    if (!destinations.length) {
      etat(
        "Aucune destination à 0 € trouvée",
        weekend
          ? "Essaie de décocher \"Idéal week-end\", d'élargir la période, ou de changer de gare de départ."
          : "Essaie d'élargir la période ou de changer de gare de départ."
      );
      return;
    }

    const titre = document.createElement("h2");
    titre.className = "t-h2";
    titre.textContent = `${destinations.length} destination${destinations.length > 1 ? "s" : ""} à 0 € `;
    const petit = document.createElement("small");
    petit.textContent = weekend
      ? `depuis ${origine}, départ ven/sam et retour dim/lun — clique une ligne pour le détail`
      : `depuis ${origine} — clique une ligne pour voir le détail des horaires`;
    titre.appendChild(petit);
    zone.appendChild(titre);

    const wrap = document.createElement("div");
    wrap.className = "k-table-wrap";
    const table = document.createElement("table");
    table.className = "k-table";

    table.innerHTML =
      "<thead><tr>" +
      "<th scope='col'>Destination</th><th scope='col'>Aller</th>" +
      "<th scope='col'>Retour</th>" +
      "</tr></thead>";

    const tbody = document.createElement("tbody");
    for (const d of destinations) {
      const tr = document.createElement("tr");
      tr.className = "t-row-click";
      tr.tabIndex = 0;
      tr.title = "Voir le détail des horaires aller-retour";

      const ouvrirDetail = () => voirDetailAllerRetour(origine, d.destination);
      tr.addEventListener("click", ouvrirDetail);
      tr.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          ouvrirDetail();
        }
      });

      const tdDest = document.createElement("td");
      tdDest.className = "t-trajet";
      tdDest.textContent = d.destination;

      tr.append(tdDest, celluleDateTrains(d, "—"), celluleDateTrains(d.retour, "Pas de retour trouvé"));
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    wrap.appendChild(table);
    zone.appendChild(wrap);
  }

  /* ==========================================================
     Enchaînement
     ========================================================== */

  let enCours = false;

  async function chercher() {
    if (enCours) return;
    const a = $("gareA").value.trim();
    const b = $("gareB").value.trim();
    if (!a || !b) {
      etat("Il manque une gare", "Renseigne les deux gares.", true);
      return;
    }

    enCours = true;
    $("btn").disabled = true;
    etat("Recherche en cours…", "Interrogation de l'open data SNCF.", false, true);

    const sens = $("sens").value;
    const jours = Math.min(30, Math.max(1, Number($("jours").value) || 14));

    try {
      const requetes = [];
      if (sens === "both" || sens === "ab") requetes.push(trainsGratuits(a, b, jours));
      if (sens === "both" || sens === "ba") requetes.push(trainsGratuits(b, a, jours));

      const lots = await Promise.all(requetes);
      const tous = lots.flat();
      rendre(affiner(tous), tous.length);
    } catch (e) {
      etat("La recherche a échoué", String(e.message || e), true);
    } finally {
      enCours = false;
      $("btn").disabled = false;
    }
  }

  async function chercherPartout() {
    if (enCours) return;
    const de = $("garePartout").value.trim();
    if (!de) {
      etat("Il manque une gare", "Renseigne la gare de départ.", true);
      return;
    }

    enCours = true;
    $("btn").disabled = true;
    etat("Recherche en cours…", "Interrogation de l'open data SNCF.", false, true);

    const jours = Math.min(30, Math.max(1, Number($("joursPartout").value) || 14));
    const weekend = $("weekendPartout").checked;

    try {
      const destinations = await destinationsAllerRetour(de, jours, weekend);
      rendrePartout(destinations, de, weekend);
    } catch (e) {
      etat("La recherche a échoué", String(e.message || e), true);
    } finally {
      enCours = false;
      $("btn").disabled = false;
    }
  }

  /* ==========================================================
     Bascule entre les deux modes (deux boutons en guise d'onglets)
     ========================================================== */

  let modeActuel = "pair";

  function definirMode(mode) {
    modeActuel = mode;
    form.classList.toggle("t-mode--anywhere", mode === "anywhere");
    $("modePair").classList.toggle("k-btn--primary", mode === "pair");
    $("modeAnywhere").classList.toggle("k-btn--primary", mode === "anywhere");
    $("modePair").setAttribute("aria-selected", String(mode === "pair"));
    $("modeAnywhere").setAttribute("aria-selected", String(mode === "anywhere"));
    if (mode === "pair") chercher();
    else chercherPartout();
  }

  $("modePair").addEventListener("click", () => definirMode("pair"));
  $("modeAnywhere").addEventListener("click", () => definirMode("anywhere"));

  // Clic sur une ligne du mode "partout" : bascule vers le mode détaillé,
  // gares déjà remplies, pour voir les horaires précis de l'aller-retour.
  function voirDetailAllerRetour(origine, destination) {
    $("gareA").value = origine;
    $("gareB").value = destination;
    $("sens").value = "both";
    definirMode("pair");
    zone.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (modeActuel === "anywhere") chercherPartout();
    else chercher();
  });

  // Raccourci : le motif que surveille le bot, week-ends compris.
  $("btnWe").addEventListener("click", () => {
    document.querySelectorAll('[data-jour="1"]').forEach((i) => {
      i.checked = i.value === "0" || i.value === "6";
    });
    chercher();
  });

  poserJours();
  chargerGares();
  chercher();
})();
