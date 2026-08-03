/* ============================================================
   Menu Wii — logique
   Rien à modifier ici au quotidien : les projets se déclarent
   dans js/projects.js.
   ============================================================ */

(function () {
  "use strict";

  /* La grille passe de 4 à 3 puis 2 colonnes (voir les media queries de
     style.css). Le nombre de chaînes par page suit, pour garder trois
     rangées quoi qu'il arrive : sinon les rangées surnuméraires
     déborderaient sous la barre du bas. Les seuils sont les mêmes que
     ceux du CSS — s'ils changent d'un côté, changer de l'autre. */
  var mqNarrow = window.matchMedia("(max-width: 760px)");
  var mqTiny = window.matchMedia("(max-width: 460px)");

  function perPage() {
    if (mqTiny.matches) return 6;    // 2 colonnes
    if (mqNarrow.matches) return 9;  // 3 colonnes
    return 12;                       // 4 colonnes
  }

  /* Musique d'ambiance : vide = désactivée. Pour l'activer, déposer le
     fichier dans audio/ puis mettre "audio/menu.mp3" ci-dessous.
     Laissé vide par défaut pour ne pas déclencher un 404 au chargement. */
  var MUSIC_SRC = "";
  var STORE_KEY = "wii-menu:sound";

  /* projects.js déclare `const PROJECTS`, qui vit dans la portée globale
     de script sans devenir une propriété de window : on y accède par le
     nom, jamais par window.PROJECTS (qui serait toujours undefined). */
  var list = (typeof PROJECTS !== "undefined" && Array.isArray(PROJECTS)) ? PROJECTS : [];
  var per = perPage();
  var pageCount = Math.max(1, Math.ceil(list.length / per));
  var page = 0;

  /* localStorage peut lever une SecurityError en file:// selon le
     navigateur : on ne laisse jamais ça casser le reste de la page. */
  var store = {
    get: function (k) {
      try { return localStorage.getItem(k); } catch (e) { return null; }
    },
    set: function (k, v) {
      try { localStorage.setItem(k, v); } catch (e) { /* tant pis */ }
    }
  };

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  var grid = document.getElementById("grid");
  var dots = document.getElementById("dots");
  var prev = document.querySelector(".pager--prev");
  var next = document.querySelector(".pager--next");
  var clockTime = document.getElementById("clockTime");
  var clockDate = document.getElementById("clockDate");
  var btnHome = document.getElementById("btnHome");
  var btnSound = document.getElementById("btnSound");
  var zoomLayer = document.getElementById("zoomLayer");
  var flash = document.getElementById("flash");

  var csRoot = document.getElementById("channelScreen");
  var csArt = document.getElementById("csArt");
  var csTitle = document.getElementById("csTitle");
  var csSubtitle = document.getElementById("csSubtitle");
  var csTech = document.getElementById("csTech");
  var csDesc = document.getElementById("csDesc");
  var csShots = document.getElementById("csShots");
  var csBack = document.getElementById("csBack");
  var csRepo = document.getElementById("csRepo");
  var csGo = document.getElementById("csGo");

  /* ==========================================================
     1. Son — tout est synthétisé, aucun fichier requis
     ========================================================== */

  var Sound = (function () {
    var ctx = null;
    var master = null;
    var music = null;
    var musicReady = false;
    var on = store.get(STORE_KEY) !== "off";

    function ensure() {
      if (ctx) {
        if (ctx.state === "suspended") ctx.resume();
        return ctx;
      }
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.9;
      master.connect(ctx.destination);
      return ctx;
    }

    /* Petite note percussive : c'est ce qui fait le "poc" du menu. */
    function tone(opts) {
      if (!on) return;
      var c = ensure();
      if (!c) return;

      var t0 = c.currentTime + (opts.delay || 0);
      var osc = c.createOscillator();
      var g = c.createGain();

      osc.type = opts.type || "triangle";
      osc.frequency.setValueAtTime(opts.from, t0);
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(40, opts.to || opts.from),
        t0 + (opts.dur || 0.12)
      );

      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(opts.gain || 0.1, t0 + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + (opts.dur || 0.12));

      osc.connect(g);
      g.connect(master);
      osc.start(t0);
      osc.stop(t0 + (opts.dur || 0.12) + 0.02);
    }

    function loadMusic() {
      if (music || !MUSIC_SRC) return;
      music = new Audio(MUSIC_SRC);
      music.loop = true;
      music.volume = 0.3;
      music.preload = "auto";
      music.addEventListener("canplaythrough", function () { musicReady = true; });
      music.addEventListener("error", function () { musicReady = false; music = null; });
    }

    function syncMusic() {
      if (!music || !musicReady) return;
      if (on) {
        var p = music.play();
        if (p && p.catch) p.catch(function () { /* autoplay bloqué : au prochain clic */ });
      } else {
        music.pause();
      }
    }

    return {
      get on() { return on; },

      init: function () {
        loadMusic();
        // Le navigateur exige un geste utilisateur avant tout son.
        var wake = function () {
          ensure();
          syncMusic();
          window.removeEventListener("pointerdown", wake);
          window.removeEventListener("keydown", wake);
          window.removeEventListener("pointermove", wake);
        };
        window.addEventListener("pointerdown", wake);
        window.addEventListener("keydown", wake);
        window.addEventListener("pointermove", wake);
      },

      toggle: function () {
        on = !on;
        store.set(STORE_KEY, on ? "on" : "off");
        syncMusic();
        if (on) this.click();
        return on;
      },

      hover: function () { tone({ from: 1180, to: 700, dur: 0.10, gain: 0.06 }); },

      click: function () {
        tone({ from: 900, to: 900, dur: 0.07, gain: 0.11, type: "sine" });
        tone({ from: 1360, to: 1360, dur: 0.13, gain: 0.10, type: "sine", delay: 0.055 });
      },

      page: function () { tone({ from: 520, to: 980, dur: 0.16, gain: 0.08 }); },

      launch: function () {
        tone({ from: 700, to: 700, dur: 0.09, gain: 0.12, type: "sine" });
        tone({ from: 1050, to: 1050, dur: 0.09, gain: 0.11, type: "sine", delay: 0.07 });
        tone({ from: 1570, to: 1570, dur: 0.22, gain: 0.11, type: "sine", delay: 0.14 });
      }
    };
  })();

  /* ==========================================================
     2. Curseur Wiimote
     ========================================================== */

  function initPointer() {
    if (!finePointer) return;

    var el = document.createElement("div");
    el.className = "wii-pointer";
    el.setAttribute("aria-hidden", "true");
    el.innerHTML =
      '<img src="assets/wii_hand.png" width="972" height="1188" alt="">';
    document.body.appendChild(el);
    document.body.classList.add("pointer-wii");

    var x = -999, y = -999, lastX = -999;
    var tilt = 0, tiltGoal = 0;
    var shown = false;
    var raf = null;

    function frame() {
      tilt += (tiltGoal - tilt) * 0.16;
      var w = el.offsetWidth || 42;
      var h = el.offsetHeight || 51;
      // Point actif = bout de l'index, à 35% / 2% de l'image.
      // Mêmes valeurs que le transform-origin dans le CSS.
      el.style.transform =
        "translate3d(" + (x - w * 0.35) + "px," + (y - h * 0.02) + "px,0) rotate(" + tilt.toFixed(2) + "deg)";
      raf = Math.abs(tiltGoal - tilt) > 0.05 ? requestAnimationFrame(frame) : null;
    }

    function ping() {
      if (!raf) raf = requestAnimationFrame(frame);
    }

    window.addEventListener("pointermove", function (e) {
      if (e.pointerType && e.pointerType !== "mouse") return;
      if (lastX !== -999) {
        var dx = e.clientX - lastX;
        tiltGoal = Math.max(-14, Math.min(14, dx * 0.9));
      }
      lastX = e.clientX;
      x = e.clientX;
      y = e.clientY;

      if (!shown) {
        shown = true;
        el.classList.add("on");
      }
      ping();
    }, { passive: true });

    // Le tilt revient à zéro quand la souris s'arrête.
    setInterval(function () {
      if (Math.abs(tiltGoal) > 0.1) { tiltGoal *= 0.5; ping(); }
    }, 90);

    document.documentElement.addEventListener("pointerleave", hide);
    window.addEventListener("blur", hide);

    function hide() {
      shown = false;
      el.classList.remove("on");
    }
  }

  /* ==========================================================
     3. Grille
     ========================================================== */

  function makeChannel(p, index) {
    var li = document.createElement("li");
    li.className = "cell";

    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chan";
    btn.dataset.index = String(index);
    btn.title = p.title + (p.subtitle ? " — " + p.subtitle : "");

    var face = document.createElement("span");
    face.className = "chan-face";

    var art = document.createElement("span");
    art.className = "chan-art";
    if (p.color) art.style.setProperty("--c", p.color);

    if (p.image) {
      /* Une bannière porte presque toujours son propre titre : on masque
         l'étiquette du dessous pour éviter de l'afficher deux fois. */
      btn.classList.add("has-banner");

      var img = document.createElement("img");
      img.alt = "";
      img.loading = "lazy";
      img.decoding = "async";
      img.addEventListener("error", function () {
        art.classList.add("no-image");
        btn.classList.remove("has-banner"); // image absente : on rend l'étiquette
      });
      img.src = p.image;
      art.appendChild(img);
    } else {
      art.classList.add("no-image");
    }

    var fb = document.createElement("span");
    fb.className = "chan-fallback";
    var b = document.createElement("b");
    b.textContent = p.title;
    fb.appendChild(b);
    if (p.subtitle) {
      var i = document.createElement("i");
      i.textContent = p.subtitle;
      fb.appendChild(i);
    }
    art.appendChild(fb);

    face.appendChild(art);
    btn.appendChild(face);

    var label = document.createElement("span");
    label.className = "chan-label";
    label.textContent = p.title;
    btn.appendChild(label);

    btn.addEventListener("mouseenter", Sound.hover);
    btn.addEventListener("focus", function (e) {
      if (btn.matches(":focus-visible")) Sound.hover();
    });
    btn.addEventListener("click", function () { open(p, face); });

    li.appendChild(btn);
    return li;
  }

  function makeEmpty() {
    var li = document.createElement("li");
    li.className = "cell cell--empty";
    li.innerHTML =
      '<span class="chan" aria-hidden="true">' +
        '<span class="chan-face"><span class="slot-face"><span class="wii-mark">Wii</span></span></span>' +
        '<span class="chan-label">.</span>' +
      "</span>";
    return li;
  }

  function render() {
    // Un changement de palier pendant une transition de page peut laisser
    // `page` hors bornes : on recadre plutôt que d'afficher une page vide.
    page = Math.max(0, Math.min(pageCount - 1, page));

    grid.textContent = "";
    var start = page * per;

    for (var i = 0; i < per; i++) {
      var p = list[start + i];
      grid.appendChild(p ? makeChannel(p, start + i) : makeEmpty());
    }

    prev.disabled = page === 0;
    next.disabled = page >= pageCount - 1;
    prev.hidden = next.hidden = pageCount < 2;

    dots.textContent = "";
    if (pageCount > 1) {
      for (var d = 0; d < pageCount; d++) {
        var s = document.createElement("span");
        if (d === page) s.className = "on";
        dots.appendChild(s);
      }
    }
  }

  var turning = false;

  function goTo(n) {
    n = Math.max(0, Math.min(pageCount - 1, n));
    if (n === page || turning) return;

    var dir = n > page ? "turn-left" : "turn-right";
    Sound.page();

    if (reduceMotion) {
      page = n;
      render();
      return;
    }

    turning = true;
    grid.classList.add("is-turning", dir);

    setTimeout(function () {
      page = n;
      render();

      // La nouvelle page est posée décalée du côté opposé...
      grid.classList.remove(dir);
      grid.classList.add(dir === "turn-left" ? "turn-right" : "turn-left");

      /* ...puis remise d'aplomb juste après, pour qu'elle glisse en
         place. Une minuterie et non requestAnimationFrame : rAF est
         gelé dans un onglet en arrière-plan, et `turning` restait
         alors bloqué à true — la pagination ne repartait plus jamais. */
      setTimeout(function () {
        grid.classList.remove("is-turning", "turn-left", "turn-right");
        turning = false;
      }, 32);
    }, 165);
  }

  /* Le passage d'un palier de largeur à l'autre change le nombre de
     chaînes par page : on repagine sans perdre de vue la chaîne qui
     ouvrait la page courante. */
  function relayout() {
    var next = perPage();
    if (next === per) return;

    var firstShown = page * per;
    per = next;
    pageCount = Math.max(1, Math.ceil(list.length / per));
    page = Math.min(pageCount - 1, Math.floor(firstShown / per));
    render();
  }

  /* ==========================================================
     4. Ouverture d'une chaîne
     ========================================================== */

  /* Une chaîne documentée s'ouvre sur son écran de présentation ; les
     autres partent directement, comme avant. */
  function hasDetail(p) {
    return !!(p.description || p.repo ||
              (p.tech && p.tech.length) ||
              (p.shots && p.shots.length));
  }

  function open(p, faceEl) {
    if (!p.url && !hasDetail(p)) return;

    if (hasDetail(p)) {
      Sound.click();
      openChannelScreen(p, faceEl);
      return;
    }

    launch(p, faceEl);
  }

  function launch(p, faceEl) {
    if (!p.url) return;

    // Nouvel onglet : il faut ouvrir dans le geste utilisateur,
    // donc pas d'animation (elle serait invisible de toute façon).
    if (p.newTab) {
      Sound.click();
      window.open(p.url, "_blank", "noopener");
      return;
    }

    if (reduceMotion) {
      Sound.click();
      window.location.href = p.url;
      return;
    }

    Sound.launch();

    /* Départ depuis l'écran de présentation : il n'y a plus de vignette
       d'où s'envoler, le flash suffit à couvrir la transition. */
    if (!faceEl) {
      setTimeout(function () { flash.classList.add("on"); }, 110);
      setTimeout(function () { window.location.href = p.url; }, 430);
      return;
    }

    var rect = faceEl.getBoundingClientRect();
    var vw = window.innerWidth;
    var vh = window.innerHeight;

    var flyer = faceEl.cloneNode(true);
    flyer.classList.add("flyer");
    flyer.style.left = rect.left + "px";
    flyer.style.top = rect.top + "px";
    flyer.style.width = rect.width + "px";
    flyer.style.height = rect.height + "px";
    zoomLayer.appendChild(flyer);
    faceEl.style.visibility = "hidden";

    var scale = Math.max(vw / rect.width, vh / rect.height) * 1.08;
    var dx = vw / 2 - (rect.left + rect.width / 2);
    var dy = vh / 2 - (rect.top + rect.height / 2);

    requestAnimationFrame(function () {
      flyer.style.borderRadius = "0px";
      flyer.style.boxShadow = "none";
      flyer.style.transform =
        "translate(" + dx + "px," + dy + "px) scale(" + scale + ")";
    });

    setTimeout(function () { flash.classList.add("on"); }, 330);
    setTimeout(function () { window.location.href = p.url; }, 620);
  }

  /* ==========================================================
     4 bis. Écran de présentation d'une chaîne
     ========================================================== */

  var csProject = null;   // le projet affiché
  var csOpener = null;    // la chaîne d'où l'on vient, pour lui rendre le focus

  function csIsOpen() { return !csRoot.hidden; }

  /* Tout est construit en textContent : les champs de projects.js ne
     sont jamais interprétés comme du HTML. */
  function fillChannelScreen(p) {
    csTitle.textContent = p.title;

    csSubtitle.textContent = p.subtitle || "";
    csSubtitle.hidden = !p.subtitle;

    csArt.textContent = "";
    csArt.style.setProperty("--c", p.color || "#8fa3ad");
    if (p.image) {
      var img = document.createElement("img");
      img.alt = "";
      img.decoding = "async";
      img.addEventListener("error", function () { img.remove(); });
      img.src = p.image;
      csArt.appendChild(img);
    }

    // Une ligne vide sépare deux paragraphes.
    csDesc.textContent = "";
    if (p.description) {
      var blocks = String(p.description).split(/\n\s*\n/);
      for (var b = 0; b < blocks.length; b++) {
        var txt = blocks[b].trim();
        if (!txt) continue;
        var para = document.createElement("p");
        para.textContent = txt;
        csDesc.appendChild(para);
      }
    }

    csTech.textContent = "";
    csTech.hidden = !(p.tech && p.tech.length);
    if (p.tech) {
      for (var t = 0; t < p.tech.length; t++) {
        var li = document.createElement("li");
        li.textContent = p.tech[t];
        csTech.appendChild(li);
      }
    }

    csShots.textContent = "";
    csShots.hidden = !(p.shots && p.shots.length);
    if (p.shots) {
      for (var s = 0; s < p.shots.length; s++) {
        var shot = document.createElement("img");
        shot.alt = "";
        shot.loading = "lazy";
        shot.decoding = "async";
        shot.src = p.shots[s];
        csShots.appendChild(shot);
      }
    }

    csRepo.hidden = !p.repo;
    if (p.repo) csRepo.href = p.repo;

    // Un projet peut n'avoir qu'un dépôt, sans démo en ligne.
    csGo.hidden = !p.url;
  }

  function openChannelScreen(p, faceEl) {
    csProject = p;
    csOpener = faceEl ? faceEl.parentNode : null;
    fillChannelScreen(p);

    // Le panneau grandit depuis le centre de la vignette cliquée.
    if (faceEl) {
      var r = faceEl.getBoundingClientRect();
      csRoot.style.setProperty("--ox", (r.left + r.width / 2) + "px");
      csRoot.style.setProperty("--oy", (r.top + r.height / 2) + "px");
    } else {
      csRoot.style.setProperty("--ox", "50%");
      csRoot.style.setProperty("--oy", "50%");
    }

    csRoot.hidden = false;
    csContentTop();

    // Deux frames : la première pose l'état initial, la seconde anime.
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { csRoot.classList.add("on"); });
    });

    (csGo.hidden ? csRepo.hidden ? csBack : csRepo : csGo).focus();
  }

  function csContentTop() {
    var box = csRoot.querySelector(".cs-content");
    if (box) box.scrollTop = 0;
  }

  function closeChannelScreen() {
    if (!csIsOpen()) return;
    Sound.click();
    csRoot.classList.remove("on");

    var done = function () {
      csRoot.hidden = true;
      if (csOpener && csOpener.focus) csOpener.focus();
      csProject = null;
      csOpener = null;
    };

    if (reduceMotion) done();
    else setTimeout(done, 300);
  }

  /* Le panneau est modal : la tabulation ne doit pas s'en échapper. */
  function csTrapFocus(e) {
    if (e.key !== "Tab") return;

    var items = csRoot.querySelectorAll("button:not([hidden]), a[href]:not([hidden])");
    if (!items.length) return;

    var first = items[0];
    var last = items[items.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  /* ==========================================================
     5. Horloge
     ========================================================== */

  var JOURS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

  function tick() {
    var now = new Date();
    var h = now.getHours();
    var m = String(now.getMinutes()).padStart(2, "0");

    clockTime.textContent = h + ":" + m;
    clockDate.textContent =
      JOURS[now.getDay()] + " " + now.getDate() + "/" + (now.getMonth() + 1);

    // Recalage sur la seconde 0 de la minute suivante.
    setTimeout(tick, (60 - now.getSeconds()) * 1000 + 200);
  }

  /* ==========================================================
     6. Câblage
     ========================================================== */

  prev.addEventListener("click", function () { goTo(page - 1); });
  next.addEventListener("click", function () { goTo(page + 1); });
  prev.addEventListener("mouseenter", Sound.hover);
  next.addEventListener("mouseenter", Sound.hover);

  btnHome.addEventListener("mouseenter", Sound.hover);
  btnHome.addEventListener("click", function () {
    Sound.click();
    goTo(0);
  });

  btnSound.addEventListener("mouseenter", Sound.hover);
  btnSound.addEventListener("click", function () {
    var on = Sound.toggle();
    btnSound.classList.toggle("is-muted", !on);
    btnSound.setAttribute("aria-pressed", String(!on));
    btnSound.setAttribute("aria-label", on ? "Couper le son" : "Activer le son");
  });

  csBack.addEventListener("mouseenter", Sound.hover);
  csBack.addEventListener("click", closeChannelScreen);

  csRepo.addEventListener("mouseenter", Sound.hover);
  csRepo.addEventListener("click", function () { Sound.click(); });

  csGo.addEventListener("mouseenter", Sound.hover);
  csGo.addEventListener("click", function () {
    if (csProject) launch(csProject, null);
  });

  document.addEventListener("keydown", function (e) {
    // Panneau ouvert : il capte le clavier, la grille est en sommeil.
    if (csIsOpen()) {
      if (e.key === "Escape") closeChannelScreen();
      else csTrapFocus(e);
      return;
    }

    if (e.key === "ArrowRight") goTo(page + 1);
    else if (e.key === "ArrowLeft") goTo(page - 1);
  });

  /* addListener : Safari n'a connu addEventListener sur MediaQueryList
     qu'à partir de la version 14. */
  function onMediaChange(mq, fn) {
    if (mq.addEventListener) mq.addEventListener("change", fn);
    else if (mq.addListener) mq.addListener(fn);
  }
  onMediaChange(mqNarrow, relayout);
  onMediaChange(mqTiny, relayout);

  window.addEventListener("pageshow", function () {
    // Retour arrière depuis un projet : on remet la grille d'aplomb.
    flash.classList.remove("on");
    zoomLayer.textContent = "";
    var hidden = grid.querySelectorAll(".chan-face");
    for (var i = 0; i < hidden.length; i++) hidden[i].style.visibility = "";
  });

  // État initial du bouton son
  if (!Sound.on) {
    btnSound.classList.add("is-muted");
    btnSound.setAttribute("aria-pressed", "true");
    btnSound.setAttribute("aria-label", "Activer le son");
  }

  /* Les projets ne vivent que dans projects.js. Plutôt que de les
     recopier en dur dans le HTML — deux sources à tenir d'accord —
     on publie leur description structurée au chargement. Les moteurs
     qui exécutent le JavaScript la lisent ; ceux qui ne l'exécutent
     pas se rabattent sur les balises Open Graph du <head>. */
  function publishStructuredData() {
    if (!list.length) return;

    var items = [];
    for (var i = 0; i < list.length; i++) {
      var p = list[i];
      var item = { "@type": "ListItem", position: i + 1, name: p.title };
      if (p.url) item.url = p.url;
      if (p.subtitle) item.description = p.subtitle;
      items.push(item);
    }

    var tag = document.createElement("script");
    tag.type = "application/ld+json";
    tag.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "Projets de Louis Hanquiez",
      itemListElement: items
    });
    document.head.appendChild(tag);
  }

  Sound.init();
  initPointer();
  render();
  tick();
  publishStructuredData();
})();
