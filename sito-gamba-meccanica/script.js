/* Gamba S.r.l. — demo. Interazioni della pagina; la scena 3D del tornio sta in 3d.js. */
(function () {
  "use strict";

  var ridotto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* anno */
  var anno = $("#anno");
  if (anno) anno.textContent = String(new Date().getFullYear());

  /* testata */
  var testata = $("#testata");
  function aggiornaTestata() { testata.classList.toggle("scorre", window.scrollY > 24); }

  /* menu mobile */
  var bottoneMenu = $(".testata__menu");
  var menu = $("#menu-mobile");
  function chiudiMenu() {
    menu.hidden = true;
    bottoneMenu.setAttribute("aria-expanded", "false");
    bottoneMenu.textContent = "Menu";
    document.body.classList.remove("menu-aperto");
  }
  bottoneMenu.addEventListener("click", function () {
    var apri = menu.hidden;
    if (!apri) return chiudiMenu();
    menu.hidden = false;
    bottoneMenu.setAttribute("aria-expanded", "true");
    bottoneMenu.textContent = "Chiudi";
    document.body.classList.add("menu-aperto");
    testata.classList.add("scorre");
  });
  $$("a", menu).forEach(function (a) { a.addEventListener("click", chiudiMenu); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !menu.hidden) { chiudiMenu(); bottoneMenu.focus(); } });

  /* schede generiche: role=tab dentro un tablist, pannelli da aria-controls o data-settore */
  function attivaSchede(lista, mostra) {
    var tabs = $$('[role="tab"]', lista);
    function seleziona(tab, focus) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute("aria-selected", on ? "true" : "false");
        t.tabIndex = on ? 0 : -1;
      });
      mostra(tab);
      if (focus) tab.focus();
    }
    tabs.forEach(function (tab, i) {
      tab.addEventListener("click", function () { seleziona(tab, false); });
      tab.addEventListener("keydown", function (e) {
        var d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
        if (!d) return;
        e.preventDefault();
        seleziona(tabs[(i + d + tabs.length) % tabs.length], true);
      });
    });
  }

  var schedeReparti = $("#reparti .schede");
  if (schedeReparti) attivaSchede(schedeReparti, function (tab) {
    $$('#reparti [role="tabpanel"]').forEach(function (p) { p.hidden = p.id !== tab.getAttribute("aria-controls"); });
  });

  var filtri = $("#pezzi .filtri");
  if (filtri) attivaSchede(filtri, function (tab) {
    var s = tab.getAttribute("data-settore");
    $$("#pezzi .vetrina").forEach(function (v) {
      v.hidden = v.getAttribute("data-settore") !== s;
      if (!v.hidden) { v.scrollLeft = 0; inclinaVetrina(v); }
    });
    $$("#pezzi [data-nota]").forEach(function (n) { n.hidden = n.getAttribute("data-nota") !== s; });
  });

  /* vetrina su telefono: le schede ruotano in profondità mentre scorrono */
  var mqDesk = window.matchMedia("(min-width: 1024px)");
  function inclinaVetrina(v) {
    var pezzi = $$(".pezzo", v);
    if (mqDesk.matches || ridotto) { pezzi.forEach(function (p) { p.style.transform = ""; }); return; }
    var r = v.getBoundingClientRect();
    var centro = r.left + r.width / 2;
    pezzi.forEach(function (p) {
      var b = p.getBoundingClientRect();
      var d = ((b.left + b.width / 2) - centro) / r.width;
      d = Math.max(-1.2, Math.min(1.2, d));
      p.style.transform = "rotateY(" + (-d * 26).toFixed(2) + "deg) translateZ(" + (-Math.abs(d) * 90).toFixed(1) + "px) scale(" + (1 - Math.abs(d) * 0.06).toFixed(3) + ")";
    });
  }
  $$("#pezzi .vetrina").forEach(function (v) {
    var attesa = false;
    v.addEventListener("scroll", function () {
      if (attesa) return;
      attesa = true;
      requestAnimationFrame(function () { attesa = false; inclinaVetrina(v); });
    }, { passive: true });
    inclinaVetrina(v);
  });
  mqDesk.addEventListener("change", function () { $$("#pezzi .vetrina").forEach(inclinaVetrina); });

  /* inclinazione al passaggio del mouse (solo desktop) */
  if (window.matchMedia("(hover: hover) and (pointer: fine)").matches && !ridotto) {
    $$("#pezzi .pezzo").forEach(function (p) {
      p.addEventListener("pointermove", function (e) {
        var b = p.getBoundingClientRect();
        var x = (e.clientX - b.left) / b.width - 0.5, y = (e.clientY - b.top) / b.height - 0.5;
        p.style.transform = "perspective(800px) rotateY(" + (x * 10).toFixed(2) + "deg) rotateX(" + (-y * 8).toFixed(2) + "deg) translateY(-4px)";
      });
      p.addEventListener("pointerleave", function () { p.style.transform = ""; });
    });
  }

  /* scansione della foto qualità: si osserva il contenitore, non l'immagine ritagliata */
  if ("IntersectionObserver" in window) {
    var oss = new IntersectionObserver(function (voci) {
      voci.forEach(function (v) { if (v.isIntersecting) { v.target.classList.add("in"); oss.unobserve(v.target); } });
    }, { threshold: 0.25 });
    $$(".scansione").forEach(function (el) { oss.observe(el); });
  } else {
    $$(".scansione").forEach(function (el) { el.classList.add("in"); });
  }

  /* tornio: avanzamento legato allo scroll */
  var scena = $("#tornio-scena");
  var pista = $(".tornio__pista");
  var barra = $(".tornio__avanzamento");
  var statoTornio = window.gambaTornio = { p: 0, ridotto: ridotto };
  function aggiornaTornio() {
    if (!pista) return;
    var p;
    if (ridotto) p = 1;
    else {
      var r = pista.getBoundingClientRect();
      var corsa = r.height - window.innerHeight;
      p = corsa > 0 ? Math.min(1, Math.max(0, -r.top / corsa)) : 0;
    }
    statoTornio.p = p;
    var fase = p < 0.38 ? 1 : p < 0.59 ? 2 : p < 0.81 ? 3 : 4;
    if (scena.getAttribute("data-fase") !== String(fase)) scena.setAttribute("data-fase", String(fase));
    if (p > 0.95) scena.setAttribute("data-fine", ""); else scena.removeAttribute("data-fine");
    barra.style.setProperty("--p", p.toFixed(4));
  }

  /* storia: linea che si riempie e foto d'epoca che cambiano */
  var linea = $(".linea-tempo");
  var vociStoria = $$(".linea-tempo li");
  var fotoStoria = $$(".storia__immagini img");
  function aggiornaStoria() {
    if (!linea) return;
    var r = linea.getBoundingClientRect();
    var soglia = window.innerHeight * 0.62;
    var a = Math.min(1, Math.max(0, (soglia - r.top) / r.height));
    linea.style.setProperty("--avanz", a.toFixed(4));
    var epoca = 0;
    vociStoria.forEach(function (li) {
      var passato = li.getBoundingClientRect().top < soglia;
      li.classList.toggle("passato", passato);
      if (passato) epoca = +li.getAttribute("data-epoca");
    });
    fotoStoria.forEach(function (img) { img.classList.toggle("attiva", +img.getAttribute("data-epoca") === epoca); });
  }

  var inAttesa = false;
  function suScroll() {
    if (inAttesa) return;
    inAttesa = true;
    requestAnimationFrame(function () {
      inAttesa = false;
      aggiornaTestata();
      aggiornaTornio();
      aggiornaStoria();
    });
  }
  window.addEventListener("scroll", suScroll, { passive: true });
  window.addEventListener("resize", suScroll);
  aggiornaTestata(); aggiornaTornio(); aggiornaStoria();

  /* scena 3D: arriva dopo la pagina, solo se WebGL c'è */
  function caricaTornio() {
    if (!scena) return;
    var prova = document.createElement("canvas");
    var gl = null;
    try { gl = prova.getContext("webgl2") || prova.getContext("webgl"); } catch (e) { gl = null; }
    if (!gl) return;
    import("./3d.js").then(function (m) { m.avvia(scena, statoTornio); }).catch(function (e) { console.warn("Tornio 3D non disponibile", e); });
  }
  if (document.readyState === "complete") setTimeout(caricaTornio, 60);
  else window.addEventListener("load", function () { setTimeout(caricaTornio, 60); });

  /* modulo: compone l'email per l'ufficio commerciale */
  var modulo = $("#modulo");
  if (modulo) modulo.addEventListener("submit", function (e) {
    e.preventDefault();
    var errore = $("#modulo-errore");
    var obbligatori = [["nome", "il nome"], ["azienda", "l'azienda"], ["email", "l'email"]];
    var mancanti = [];
    obbligatori.forEach(function (c) {
      var campo = modulo.elements[c[0]];
      var vuoto = !campo.value.trim() || (c[0] === "email" && !/^\S+@\S+\.\S+$/.test(campo.value.trim()));
      campo.setAttribute("aria-invalid", vuoto ? "true" : "false");
      if (vuoto) mancanti.push(c[1]);
    });
    if (mancanti.length) {
      errore.textContent = "Manca " + mancanti.join(", ") + ": completa il campo per preparare l'email.";
      errore.hidden = false;
      modulo.elements[obbligatori.filter(function (c) { return modulo.elements[c[0]].getAttribute("aria-invalid") === "true"; })[0][0]].focus();
      return;
    }
    errore.hidden = true;
    var v = function (n) { return modulo.elements[n].value.trim(); };
    var righe = [
      "Buongiorno,",
      "vi chiedo un preventivo per il pezzo nel disegno allegato.",
      "",
      "Lavorazione: " + v("lavorazione"),
      "Materiale: " + (v("materiale") || "da definire"),
      "Pezzi per lotto: " + (v("quantita") || "da definire"),
      v("note") ? "Note: " + v("note") : "",
      "",
      v("nome") + " – " + v("azienda"),
      v("email") + (v("telefono") ? " – " + v("telefono") : "")
    ].filter(function (r, i, a) { return !(r === "" && a[i - 1] === ""); });
    var oggetto = "Richiesta di preventivo – " + v("azienda");
    window.location.href = "mailto:commerciale@gambamec.it?subject=" + encodeURIComponent(oggetto) + "&body=" + encodeURIComponent(righe.join("\n"));
    var nota = $("#modulo-nota");
    nota.textContent = "Email preparata. Allega il disegno (PDF, DWG o STEP) e premi invia.";
    nota.classList.add("inviata");
  });
})();
