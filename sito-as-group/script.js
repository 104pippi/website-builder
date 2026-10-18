/* AS Group — demo. Nessuna libreria: tutto qui. */
(function () {
  "use strict";

  var calmo = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- Anno ---------- */
  $$("[data-anno]").forEach(function (el) { el.textContent = new Date().getFullYear(); });

  /* ---------- Testata: diventa solida dopo l'hero ---------- */
  var testata = $("[data-testata]");
  var heroFoto = $("[data-parallax]");
  var inAttesa = false;
  function aggiornaScroll() {
    inAttesa = false;
    var y = window.scrollY || window.pageYOffset;
    testata.classList.toggle("solida", y > 30);
    if (heroFoto && !calmo && y < window.innerHeight * 1.2) {
      heroFoto.style.transform = "translate3d(0," + (y * 0.18).toFixed(1) + "px,0)";
    }
  }
  window.addEventListener("scroll", function () {
    if (!inAttesa) { inAttesa = true; requestAnimationFrame(aggiornaScroll); }
  }, { passive: true });
  aggiornaScroll();

  /* ---------- Menu mobile ---------- */
  var menu = $("[data-menu]");
  var menuApri = $("[data-menu-apri]");
  var menuTesto = menuApri && $(".menu-testo", menuApri);
  function chiudiMenu(rimettiFocus) {
    if (!menu || menu.hidden) return;
    menu.classList.remove("aperto");
    menuApri.setAttribute("aria-expanded", "false");
    testata.classList.remove("menu-aperto");
    document.body.style.overflow = "";
    if (menuTesto) menuTesto.textContent = "Menu";
    setTimeout(function () { menu.hidden = true; }, calmo ? 0 : 350);
    if (rimettiFocus) menuApri.focus();
  }
  if (menu && menuApri) {
    menuApri.addEventListener("click", function () {
      if (!menu.hidden) { chiudiMenu(false); return; }
      menu.hidden = false;
      requestAnimationFrame(function () { menu.classList.add("aperto"); });
      menuApri.setAttribute("aria-expanded", "true");
      testata.classList.add("menu-aperto");
      document.body.style.overflow = "hidden";
      if (menuTesto) menuTesto.textContent = "Chiudi";
      var primo = $("a", menu);
      if (primo) primo.focus({ preventScroll: true });
    });
    $$("a", menu).forEach(function (a) { a.addEventListener("click", function () { chiudiMenu(false); }); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") chiudiMenu(true); });
    window.addEventListener("resize", function () { if (window.innerWidth >= 1100) chiudiMenu(false); });
  }

  /* ---------- Linea di monitoraggio con il picco Λ ---------- */
  var segnale = $("[data-segnale]");
  if (segnale) {
    var traccia = $(".segnale-traccia", segnale);
    var alone = $(".segnale-alone", segnale);
    var impulso = $(".segnale-impulso", segnale);
    var lambda = $(".segnale-lambda", segnale);
    var lambdaAlone = $(".segnale-lambda-alone", segnale);
    var dati = null, attivo = false, t0 = 0, rafId = 0, larghezza = 0;

    var costruisci = function () {
      var w = segnale.clientWidth, h = segnale.clientHeight;
      if (!w || !h) return;
      larghezza = w;
      segnale.setAttribute("viewBox", "0 0 " + w + " " + h);
      var desktop = window.innerWidth >= 1024;
      var base = h * 0.84;
      var H = Math.min(h * 0.7, desktop ? 132 : 104);
      var corsa = H * 0.36;          /* inclinazione delle gambe del Λ */
      var piatto = H * 0.27;         /* la cima piatta del marchio */
      var cx = w * (desktop ? 0.665 : 0.72);
      var a = cx - piatto / 2 - corsa, b = cx - piatto / 2, c = cx + piatto / 2, d = cx + piatto / 2 + corsa;

      var picchi = [0.09, 0.23, 0.37, 0.5, 0.87, 0.96].map(function (f) { return f * w; })
        .filter(function (x) { return x < a - 40 || x > d + 40; });
      var y = function (x) {
        var v = Math.sin(x * 0.045) * 1.6 + Math.sin(x * 0.13 + 1.3) * 1 + Math.sin(x * 0.31 + 0.4) * 0.6;
        for (var i = 0; i < picchi.length; i++) {
          var q = (x - picchi[i]) / 6;
          if (Math.abs(q) < 4) v += -10 * Math.exp(-q * q) + 4.5 * Math.exp(-(q - 1.7) * (q - 1.7));
        }
        return base + v;
      };

      var punti = [], x;
      for (x = 0; x < a - 6; x += 4) punti.push([x, y(x)]);
      punti.push([a, base], [b, base - H], [c, base - H], [d, base]);
      for (x = d + 6; x <= w + 4; x += 4) punti.push([x, y(x)]);

      var dPath = "", lung = 0, la = 0, ld = 0;
      for (var i = 0; i < punti.length; i++) {
        var p = punti[i];
        dPath += (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1);
        if (i) {
          var q0 = punti[i - 1];
          lung += Math.hypot(p[0] - q0[0], p[1] - q0[1]);
        }
        if (p[0] === a && p[1] === base) la = lung;
        if (p[0] === d && p[1] === base) ld = lung;
      }
      var dLambda = "M" + a.toFixed(1) + " " + base + "L" + b.toFixed(1) + " " + (base - H).toFixed(1) + "L" + c.toFixed(1) + " " + (base - H).toFixed(1) + "L" + d.toFixed(1) + " " + base;
      [traccia, alone, impulso].forEach(function (el) { el.setAttribute("d", dPath); });
      [lambda, lambdaAlone].forEach(function (el) { el.setAttribute("d", dLambda); });
      var trattino = Math.max(90, w * 0.09);
      dati = { L: lung, la: la, ld: ld, D: trattino, Ll: lambda.getTotalLength() };
      [alone, impulso].forEach(function (el) { el.style.strokeDasharray = trattino + " " + (lung + trattino * 2); el.style.strokeDashoffset = trattino; });
    };

    var disegnaIngresso = function () {
      if (!dati) return;
      if (calmo) { impulso.style.opacity = alone.style.opacity = "0"; return; }
      traccia.style.strokeDasharray = dati.L;
      traccia.style.strokeDashoffset = dati.L;
      [lambda, lambdaAlone].forEach(function (el) { el.style.strokeDasharray = dati.Ll; el.style.strokeDashoffset = dati.Ll; });
      segnale.getBoundingClientRect();
      traccia.style.transition = "stroke-dashoffset 2.2s cubic-bezier(.45,.05,.25,1) .55s";
      traccia.style.strokeDashoffset = 0;
      [lambda, lambdaAlone].forEach(function (el) {
        el.style.transition = "stroke-dashoffset .9s cubic-bezier(.2,.75,.15,1) 1.75s";
        el.style.strokeDashoffset = 0;
      });
      t0 = performance.now() + 2600;
    };

    var ciclo = function (ora) {
      if (!attivo) return;
      rafId = requestAnimationFrame(ciclo);
      if (!dati || ora < t0) return;
      var periodo = 5200;
      var p = ((ora - t0) % periodo) / periodo;
      var s = p * (dati.L + dati.D) * 1.28;            /* oltre la fine: pausa naturale */
      var off = dati.D - s;
      impulso.style.strokeDashoffset = off;
      alone.style.strokeDashoffset = off;
      var g = 0;
      if (s > dati.la - 30 && s < dati.ld + dati.D + 120) {
        var dentro = Math.min(1, (s - dati.la + 30) / 60);
        var fuori = Math.max(0, 1 - (s - dati.ld) / (dati.D + 120));
        g = Math.max(0, Math.min(dentro, fuori));
      }
      segnale.style.setProperty("--bagliore", (0.25 + 0.75 * g).toFixed(3));
    };

    costruisci();
    disegnaIngresso();

    if (!calmo && "IntersectionObserver" in window) {
      new IntersectionObserver(function (voci) {
        attivo = voci[0].isIntersecting;
        cancelAnimationFrame(rafId);
        if (attivo) rafId = requestAnimationFrame(ciclo);
      }).observe(segnale);
    }

    var timerResize = 0;
    window.addEventListener("resize", function () {
      clearTimeout(timerResize);
      timerResize = setTimeout(function () {
        if (segnale.clientWidth === larghezza) return;   /* ignora la barra del browser mobile */
        costruisci();
        traccia.style.transition = "none"; traccia.style.strokeDasharray = "none"; traccia.style.strokeDashoffset = 0;
        [lambda, lambdaAlone].forEach(function (el) { el.style.transition = "none"; el.style.strokeDasharray = "none"; });
      }, 160);
    });
  }

  /* ---------- Contatori ---------- */
  /* toLocaleString("it-IT") non separa le migliaia a 4 cifre: lo facciamo a mano */
  var formatta = function (n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, "."); };
  var contatori = $$("[data-conta]");
  if (!calmo && "IntersectionObserver" in window) {
    contatori.forEach(function (el) { el.textContent = "0"; });
    var ioConta = new IntersectionObserver(function (voci) {
      voci.forEach(function (v) {
        if (!v.isIntersecting) return;
        ioConta.unobserve(v.target);
        var el = v.target, fine = +el.getAttribute("data-conta"), inizio = performance.now(), durata = 1600;
        (function passo(ora) {
          var t = Math.min(1, (ora - inizio) / durata);
          el.textContent = formatta(fine * (1 - Math.pow(1 - t, 4)));
          if (t < 1) requestAnimationFrame(passo);
        })(inizio);
      });
    }, { threshold: 0.5 });
    contatori.forEach(function (el) { ioConta.observe(el); });
  }

  /* ---------- Schede e-Zen ---------- */
  var moduli = $("[data-moduli]");
  if (moduli) {
    var schede = $$('[role="tab"]', moduli);
    var attiva = function (scheda, focus) {
      schede.forEach(function (s) {
        var sel = s === scheda;
        s.setAttribute("aria-selected", sel ? "true" : "false");
        s.tabIndex = sel ? 0 : -1;
        var pan = document.getElementById(s.getAttribute("aria-controls"));
        if (sel) {
          pan.hidden = false;
          pan.classList.remove("entra");
          void pan.offsetWidth;
          pan.classList.add("entra");
        } else {
          pan.hidden = true;
        }
      });
      if (focus) scheda.focus();
    };
    schede.forEach(function (s, i) {
      s.addEventListener("click", function () { if (s.getAttribute("aria-selected") !== "true") attiva(s, false); });
      s.addEventListener("keydown", function (e) {
        var j = null;
        if (e.key === "ArrowRight") j = (i + 1) % schede.length;
        if (e.key === "ArrowLeft") j = (i - 1 + schede.length) % schede.length;
        if (e.key === "Home") j = 0;
        if (e.key === "End") j = schede.length - 1;
        if (j !== null) { e.preventDefault(); attiva(schede[j], true); }
      });
    });
  }

  /* ---------- Selettore tempi di intervento ---------- */
  var selettore = $("[data-selettore]");
  var messaggio = $("#f-messaggio");
  var spunta = function (valore) {
    var c = $('input[name="interesse"][value="' + valore + '"]');
    if (c) c.checked = true;
  };
  if (selettore) {
    var grande = $("[data-mostra-grande]", selettore);
    var testo = $("[data-mostra-testo]", selettore);
    var fascia = $("[data-mostra-fascia]", selettore);
    var linea = $(".binario-linea", selettore);
    var aggiorna = function (anima) {
      var t = $('input[name="tempo"]:checked', selettore);
      var f = $('input[name="fascia"]:checked', selettore);
      if (grande.textContent !== t.dataset.grande) {
        grande.textContent = t.dataset.grande;
        grande.classList.toggle("lungo", t.dataset.grande.length > 4);
        if (anima && !calmo) { grande.classList.remove("cambia"); void grande.offsetWidth; grande.classList.add("cambia"); }
      }
      testo.textContent = t.dataset.testo;
      fascia.textContent = f.dataset.testo;
      linea.style.setProperty("--pos", t.dataset.pos);
    };
    $$("input", selettore).forEach(function (r) { r.addEventListener("change", function () { aggiorna(true); }); });
    aggiorna(false);

    var prev = $("[data-preventivo]", selettore);
    prev.addEventListener("click", function () {
      var t = $('input[name="tempo"]:checked', selettore);
      var f = $('input[name="fascia"]:checked', selettore);
      var etichetta = { "4h": "entro 4 ore", "6h": "entro 6 ore", "SBD": "in giornata (SBD)", "NBD": "il giorno dopo (NBD)" }[t.value];
      spunta("e-Zen");
      if (messaggio) messaggio.value = "Vorrei un preventivo per e-Zen Maintenance con intervento tecnico " + etichetta + " e copertura " + f.value.replace("x", "×") + ".\nNumero di PC e server da coprire: ";
    });
  }
  $$("[data-interesse]").forEach(function (a) {
    a.addEventListener("click", function () { spunta(a.getAttribute("data-interesse")); });
  });

  /* ---------- Rivelazione diagonale delle foto ----------
     Si osserva il contenitore: Chrome considera invisibile un elemento tutto ritagliato dal clip-path. */
  var daRivelare = $$("[data-rivela]");
  if (!calmo && "IntersectionObserver" in window) {
    var ioRivela = new IntersectionObserver(function (voci) {
      voci.forEach(function (v) {
        if (!v.isIntersecting) return;
        $$("[data-rivela]", v.target).forEach(function (el) { el.classList.add("in"); });
        ioRivela.unobserve(v.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    daRivelare.forEach(function (el) { ioRivela.observe(el.parentElement); });
  } else {
    daRivelare.forEach(function (el) { el.classList.add("in"); });
  }

  /* ---------- Mappa sedi ---------- */
  var mappa = $("[data-mappa]");
  if (mappa) {
    if ("IntersectionObserver" in window && !calmo) {
      var ioMappa = new IntersectionObserver(function (voci) {
        if (voci[0].isIntersecting) { mappa.classList.add("is-live"); ioMappa.disconnect(); }
      }, { threshold: 0.3 });
      ioMappa.observe(mappa);
    } else {
      mappa.classList.add("is-live");
    }
    var evidenzia = function (citta, si) {
      $$('[data-citta="' + citta + '"]', mappa).forEach(function (el) { el.classList.toggle("attiva", si); });
    };
    $$(".sedi-elenco li").forEach(function (li) {
      var c = li.getAttribute("data-citta");
      ["mouseenter", "focusin"].forEach(function (ev) { li.addEventListener(ev, function () { evidenzia(c, true); }); });
      ["mouseleave", "focusout"].forEach(function (ev) { li.addEventListener(ev, function () { evidenzia(c, false); }); });
    });
  }

  /* ---------- Modulo contatti: compone l'email ---------- */
  var form = $("[data-form]");
  if (form) {
    var errore = $("[data-errore]", form);
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var nome = form.nome.value.trim();
      var email = form.email.value.trim();
      var sbagliati = [];
      form.nome.setAttribute("aria-invalid", nome ? "false" : "true");
      if (!nome) sbagliati.push("il nome");
      var emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      form.email.setAttribute("aria-invalid", emailOk ? "false" : "true");
      if (!emailOk) sbagliati.push("un'email valida");
      if (sbagliati.length) {
        errore.textContent = "Per inviare la richiesta inserisci " + sbagliati.join(" e ") + ".";
        errore.hidden = false;
        (nome ? form.email : form.nome).focus();
        return;
      }
      errore.hidden = true;
      var interessi = $$('input[name="interesse"]:checked', form).map(function (c) { return c.value; });
      var righe = [
        "Nome e cognome: " + nome,
        form.azienda.value.trim() ? "Azienda: " + form.azienda.value.trim() : "",
        "Email: " + email,
        form.telefono.value.trim() ? "Telefono: " + form.telefono.value.trim() : "",
        interessi.length ? "Mi interessa: " + interessi.join(", ") : "",
        "",
        form.messaggio.value.trim()
      ].filter(function (r, i, arr) { return r !== "" || (i === 5 && arr[6]); });
      var oggetto = "Richiesta di consulenza" + (form.azienda.value.trim() ? " – " + form.azienda.value.trim() : "");
      window.location.href = "mailto:marketing@as-srl.com?subject=" + encodeURIComponent(oggetto) + "&body=" + encodeURIComponent(righe.join("\n"));
    });
  }

  /* ---------- Barra fissa mobile ---------- */
  var barra = $("[data-barra]");
  var heroAzioni = $("[data-hero-azioni]");
  var contatti = $("#contatti");
  if (barra && heroAzioni && "IntersectionObserver" in window) {
    var heroVisibile = true, contattiVisibili = false;
    var decidi = function () { barra.classList.toggle("visibile", !heroVisibile && !contattiVisibili); };
    new IntersectionObserver(function (v) { heroVisibile = v[0].isIntersecting || v[0].boundingClientRect.top > 0; decidi(); }).observe(heroAzioni);
    if (contatti) new IntersectionObserver(function (v) { contattiVisibili = v[0].isIntersecting; decidi(); }, { rootMargin: "0px 0px -35% 0px" }).observe(contatti);
  }
})();
