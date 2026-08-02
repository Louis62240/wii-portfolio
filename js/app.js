/* ============================================================
   Menu Wii — logique
   Rien à modifier ici au quotidien : les projets se déclarent
   dans js/projects.js.
   ============================================================ */

(function () {
  "use strict";

  var PER_PAGE = 12;
  /* Musique d'ambiance : vide = désactivée. Pour l'activer, déposer le
     fichier dans audio/ puis mettre "audio/menu.mp3" ci-dessous.
     Laissé vide par défaut pour ne pas déclencher un 404 au chargement. */
  var MUSIC_SRC = "";
  var STORE_KEY = "wii-menu:sound";

  /* projects.js déclare `const PROJECTS`, qui vit dans la portée globale
     de script sans devenir une propriété de window : on y accède par le
     nom, jamais par window.PROJECTS (qui serait toujours undefined). */
  var list = (typeof PROJECTS !== "undefined" && Array.isArray(PROJECTS)) ? PROJECTS : [];
  var pageCount = Math.max(1, Math.ceil(list.length / PER_PAGE));
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
    grid.textContent = "";
    var start = page * PER_PAGE;

    for (var i = 0; i < PER_PAGE; i++) {
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
      grid.classList.remove(dir);
      grid.classList.add(dir === "turn-left" ? "turn-right" : "turn-left");
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          grid.classList.remove("is-turning", "turn-left", "turn-right");
          turning = false;
        });
      });
    }, 165);
  }

  /* ==========================================================
     4. Ouverture d'une chaîne
     ========================================================== */

  function open(p, faceEl) {
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

  document.addEventListener("keydown", function (e) {
    if (e.key === "ArrowRight") goTo(page + 1);
    else if (e.key === "ArrowLeft") goTo(page - 1);
  });

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

  Sound.init();
  initPointer();
  render();
  tick();
})();
