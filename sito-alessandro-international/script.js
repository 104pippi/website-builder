/* Alessandro International Italia: interazioni del sito */
(() => {
  "use strict";
  document.documentElement.classList.add("js");

  const WA = "https://wa.me/393456059664?text=";
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const riduci = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- testata, barra mobile, paravento, parallasse ---------- */
  const testata = $("[data-testata]");
  const hero = $("[data-hero]");
  const barra = $(".barra");
  const fotoStoria = $(".storia__foto");
  let inCoda = false;

  function aggiornaScroll() {
    inCoda = false;
    const y = scrollY;
    const h = hero.offsetHeight;
    testata.dataset.stato = y > h - 90 ? "chiaro" : "scuro";
    barra.classList.toggle("is-su", y > h * 0.35);
    if (!riduci) {
      hero.style.setProperty("--p", Math.min(Math.max(y / h, 0), 1).toFixed(4));
      if (fotoStoria) {
        const r = fotoStoria.getBoundingClientRect();
        const q = (r.top + r.height / 2 - innerHeight / 2) / innerHeight;
        if (q > -1.2 && q < 1.2) fotoStoria.style.setProperty("--q", (-q).toFixed(4));
      }
    }
  }
  addEventListener("scroll", () => { if (!inCoda) { inCoda = true; requestAnimationFrame(aggiornaScroll); } }, { passive: true });
  addEventListener("resize", aggiornaScroll);
  aggiornaScroll();

  /* ---------- menu mobile ---------- */
  const menu = $("[data-menu]");
  const menuBtn = $("[data-menu-btn]");
  function chiudiMenu() {
    menu.classList.remove("is-aperto");
    menuBtn.setAttribute("aria-expanded", "false");
    document.body.classList.remove("menu-aperto");
    $(".menu-btn__testo").textContent = "Menu";
  }
  menuBtn.addEventListener("click", () => {
    const aperto = !menu.classList.contains("is-aperto");
    menu.classList.toggle("is-aperto", aperto);
    menuBtn.setAttribute("aria-expanded", String(aperto));
    document.body.classList.toggle("menu-aperto", aperto);
    $(".menu-btn__testo").textContent = aperto ? "Chiudi" : "Menu";
  });
  $$("a", menu).forEach((a) => a.addEventListener("click", chiudiMenu));
  addEventListener("keydown", (e) => { if (e.key === "Escape" && menu.classList.contains("is-aperto")) { chiudiMenu(); menuBtn.focus(); } });

  /* ---------- foto che si rivelano (si osserva il contenitore) ---------- */
  const rivela = $$(".come__foto, .storia__foto, .pro__banda");
  rivela.forEach((el) => el.setAttribute("data-rivela", ""));
  if ("IntersectionObserver" in window && !riduci) {
    const io = new IntersectionObserver((voci) => {
      voci.forEach((v) => { if (v.isIntersecting) { v.target.classList.add("in"); io.unobserve(v.target); } });
    }, { rootMargin: "0px 0px -12% 0px" });
    rivela.forEach((el) => io.observe(el));
  } else rivela.forEach((el) => el.classList.add("in"));

  /* ---------- WhatsApp con testo precompilato ---------- */
  $$("[data-wa-testo]").forEach((a) => {
    a.href = WA + encodeURIComponent(a.dataset.waTesto);
    a.target = "_blank";
    a.rel = "noopener";
  });
  const apriWA = (testo) => window.open(WA + encodeURIComponent(testo), "_blank", "noopener");

  /* ---------- moduli ---------- */
  $$("[data-modulo]").forEach((form) => {
    const errore = $("[data-errore]", form);
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      let primo = null;
      $$("input[required], textarea[required]", form).forEach((c) => {
        let ok = c.value.trim().length > 1;
        if (c.name === "piva") ok = /^\d{11}$/.test(c.value.replace(/\s/g, ""));
        c.setAttribute("aria-invalid", ok ? "false" : "true");
        if (!ok && !primo) primo = c;
      });
      if (primo) {
        const etichetta = $(`label[for="${primo.id}"]`, form)?.textContent || "questo campo";
        errore.textContent = primo.name === "piva"
          ? "La partita IVA ha 11 cifre: controlla il numero."
          : `Manca ${etichetta.toLowerCase()}: compilalo per inviare.`;
        primo.focus();
        return;
      }
      errore.textContent = "";
      const d = new FormData(form);
      let testo;
      if (form.dataset.modulo === "pro") {
        const interessi = d.getAll("interesse");
        testo = `Ciao! Sono ${d.get("nome").trim()} del centro ${d.get("centro").trim()} di ${d.get("citta").trim()} (P.IVA ${d.get("piva").replace(/\s/g, "")}).`
          + (interessi.length ? ` Mi interessa: ${interessi.join(", ")}.` : "")
          + (d.get("messaggio").trim() ? ` ${d.get("messaggio").trim()}` : "");
      } else {
        testo = `Ciao! Sono ${d.get("nome").trim()}, ${d.get("chi")}. ${d.get("messaggio").trim()}`;
      }
      apriWA(testo);
    });
    $$("input, textarea", form).forEach((c) => c.addEventListener("input", () => c.removeAttribute("aria-invalid")));
  });

  /* ---------- anno ---------- */
  $$("[data-anno]").forEach((el) => { el.textContent = new Date().getFullYear(); });

  /* ---------- WebGL disponibile? ---------- */
  const webgl = (() => {
    try {
      const c = document.createElement("canvas");
      return !!(c.getContext("webgl2") || c.getContext("webgl"));
    } catch { return false; }
  })();
  const quandoVicino = (el, fn, margine = "300px") => {
    if (!("IntersectionObserver" in window)) { fn(); return; }
    const io = new IntersectionObserver((v) => { if (v.some((x) => x.isIntersecting)) { io.disconnect(); fn(); } }, { rootMargin: margine });
    io.observe(el);
  };

  /* ---------- tavolozza Striplac + unghia 3D ---------- */
  const sezColori = $("#colori");
  const griglia = $("[data-tavolozza]");
  const unghia = $("[data-unghia]");
  const ui = {
    numero: $("[data-tinta-numero]"), n: $("[data-tinta-n]"), nome: $("[data-tinta-nome]"),
    nota: $("[data-tinta-nota]"), link: $("[data-tinta-link]"), foto: $("[data-tinta-foto]"),
  };
  let tinte = [];
  let attuale = null;
  let unghia3d = null;
  let giroAuto = !riduci;
  let timerGiro = 0;
  const GIRO = ["634", "103", "215", "209", "128", "207", "122", "217", "636", "105"];

  const finitura = (nome) => (/glitter/.test(nome) ? "glitter" : /shimmer|metallic/.test(nome) ? "shimmer" : "lucida");
  const pulito = (nome) => nome.replace(/\s*\(.*?\)\s*/g, "").trim();
  function nota(t) {
    if (t.nuovo) return "Nuova collezione Diamond Obsession";
    if (/glitter/.test(t.nome)) return "Con glitter";
    if (/metallic/.test(t.nome)) return "Effetto metallizzato";
    if (/shimmer/.test(t.nome)) return "Effetto shimmer";
    return "Striplac 3.0, 6,5 ml";
  }

  function scegli(t, daUtente) {
    if (!t || t === attuale) return;
    attuale = t;
    sezColori.style.setProperty("--tinta", t.hex);
    ui.numero.textContent = t.n;
    ui.n.textContent = t.n;
    ui.nome.textContent = pulito(t.nome);
    ui.nota.textContent = nota(t);
    ui.link.href = t.url;
    ui.link.textContent = `Compra ${pulito(t.nome)} sullo shop`;
    if (t.foto) {
      const src = `assets/img/tinte/${t.n}.webp`;
      if (!ui.foto.src.endsWith(src)) {
        ui.foto.classList.add("is-carico");
        const img = new Image();
        img.onload = () => { ui.foto.src = src; ui.foto.classList.remove("is-carico"); };
        img.src = src;
        ui.foto.alt = `Mano con smalto Striplac ${t.n} ${pulito(t.nome)} e la sua boccetta`;
      }
    }
    $$(".goccia", griglia).forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.n === t.n)));
    if (unghia3d) unghia3d.colore(t.hex, finitura(t.nome));
    if (daUtente) fermaGiro();
  }

  function fermaGiro() { giroAuto = false; clearTimeout(timerGiro); }
  let colorivisibile = false;
  function prossimo() {
    clearTimeout(timerGiro);
    if (!giroAuto) return;
    timerGiro = setTimeout(() => {
      if (giroAuto && colorivisibile && !document.hidden) {
        const i = GIRO.indexOf(attuale?.n);
        scegli(tinte.find((t) => t.n === GIRO[(i + 1) % GIRO.length]));
      }
      prossimo();
    }, 3400);
  }

  fetch("assets/data/tinte.json").then((r) => r.json()).then((dati) => {
    tinte = dati.sort((a, b) => (b.nuovo ? 1 : 0) - (a.nuovo ? 1 : 0) || a.n.localeCompare(b.n));
    const frag = document.createDocumentFragment();
    tinte.forEach((t) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "goccia" + (t.nuovo ? " is-nuova" : "");
      b.style.setProperty("--c", t.hex);
      b.dataset.n = t.n;
      b.dataset.f = t.f;
      b.setAttribute("aria-label", `${t.n} ${pulito(t.nome)}`);
      b.setAttribute("aria-pressed", "false");
      b.title = `${t.n} ${pulito(t.nome)}`;
      b.addEventListener("click", () => scegli(t, true));
      frag.appendChild(b);
    });
    griglia.appendChild(frag);
    scegli(tinte.find((t) => t.n === "634") || tinte[0]);
    // le foto delle prossime tinte del giro arrivano in anticipo
    const pre = () => GIRO.forEach((n) => { const i = new Image(); i.src = `assets/img/tinte/${n}.webp`; });
    "requestIdleCallback" in window ? requestIdleCallback(pre) : setTimeout(pre, 2000);
  }).catch(() => { griglia.textContent = "Le tinte non si sono caricate: le trovi tutte sullo shop."; });

  $$("[data-famiglia]").forEach((chip) => chip.addEventListener("click", () => {
    const f = chip.dataset.famiglia;
    $$("[data-famiglia]").forEach((c) => { c.classList.toggle("is-on", c === chip); c.setAttribute("aria-pressed", String(c === chip)); });
    $$(".goccia", griglia).forEach((b) => { b.hidden = f !== "tutte" && b.dataset.f !== f; });
    fermaGiro();
  }));

  if ("IntersectionObserver" in window) {
    new IntersectionObserver((v) => {
      colorivisibile = v[0].isIntersecting;
      if (colorivisibile) prossimo();
    }, { threshold: 0.25 }).observe(unghia);
  }

  if (webgl) {
    quandoVicino(unghia, () => {
      import("./3d-unghia.js").then((m) => m.avvia($("[data-unghia-canvas]"), {
        hex: attuale ? attuale.hex : "#7b1823",
        finitura: attuale ? finitura(attuale.nome) : "lucida",
        fermo: riduci,
      })).then((api) => {
        unghia3d = api;
        if (attuale) api.colore(attuale.hex, finitura(attuale.nome), true);
        unghia.classList.add("is-3d");
      }).catch((e) => console.warn("3D unghia non disponibile", e));
    }, "400px");
  }

  /* ---------- centri autorizzati: dati, ricerca, mappa 3D ---------- */
  const sezCentri = $("#centri");
  const mappaEl = $("[data-mappa]");
  const stato = $("[data-cerca-stato]");
  const lista = $("[data-risultati]");
  let datiMappa = null;
  let mappa3d = null;
  const carica = () => datiMappa || (datiMappa = fetch("assets/data/mappa.json").then((r) => r.json()));

  quandoVicino(sezCentri, () => {
    carica().then((dati) => {
      if (!webgl) return mostraMappa2d(dati);
      import("./3d-mappa.js")
        .then((m) => m.avvia($("[data-mappa-canvas]"), dati, { fermo: riduci }))
        .then((api) => { mappa3d = api; mappaEl.classList.add("is-pronta"); })
        .catch((e) => { console.warn("3D mappa non disponibile", e); mostraMappa2d(dati); });
    });
  }, "500px");

  function mostraMappa2d(dati) {
    const cv = $("[data-mappa-canvas]");
    const r = cv.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio || 1, 2);
    cv.width = r.width * dpr; cv.height = r.height * dpr;
    const g = cv.getContext("2d");
    const k = Math.min(r.width / 12.5, r.height / 11.5) * dpr;
    const px = (lon, lat) => [(lon - 12.4) * 0.745 * k + cv.width / 2, cv.height / 2 - (lat - 41.9) * k];
    g.fillStyle = "#3d2930";
    dati.italia.forEach((anello) => { g.beginPath(); anello.forEach(([lo, la], i) => { const [x, y] = px(lo, la); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.closePath(); g.fill(); });
    dati.centri.forEach(([, la, lo, oro]) => { const [x, y] = px(lo, la); g.fillStyle = oro ? "#b88e4e" : "#f0cfd0"; g.beginPath(); g.arc(x, y, (oro ? 2.6 : 1.8) * dpr, 0, 7); g.fill(); });
    mappaEl.classList.add("is-pronta");
  }

  const km = (a1, o1, a2, o2) => {
    const R = 6371, r = Math.PI / 180;
    const da = (a2 - a1) * r, dO = (o2 - o1) * r;
    const h = Math.sin(da / 2) ** 2 + Math.cos(a1 * r) * Math.cos(a2 * r) * Math.sin(dO / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  };
  const tel = (t) => (t.length === 10 && t[0] === "3" ? t.replace(/(\d{3})(\d{3})(\d+)/, "$1 $2 $3") : t);

  function mostraVicini(lat, lon, dove) {
    carica().then((dati) => {
      const vicini = dati.centri.map((c, i) => ({ c, i, d: km(lat, lon, c[1], c[2]) })).sort((a, b) => a.d - b.d).slice(0, 6);
      lista.innerHTML = "";
      vicini.forEach(({ c, d }, k) => {
        const [nome, la, lo, oro, t] = c;
        const li = document.createElement("li");
        li.className = "risultato";
        li.style.animationDelay = `${k * 60}ms`;
        const forte = document.createElement("strong");
        forte.textContent = nome;
        if (oro) { const s = document.createElement("span"); s.className = "oro"; s.textContent = "Gold"; forte.appendChild(s); }
        const dist = document.createElement("span");
        dist.className = "risultato__km";
        dist.textContent = d < 1 ? "meno di 1 km" : `${Math.round(d)} km`;
        const az = document.createElement("div");
        az.className = "risultato__azioni";
        const ind = document.createElement("a");
        ind.href = `https://www.google.com/maps/search/?api=1&query=${la},${lo}`;
        ind.target = "_blank"; ind.rel = "noopener"; ind.textContent = "Indicazioni";
        az.appendChild(ind);
        if (t) { const a = document.createElement("a"); a.href = `tel:+39${t}`; a.textContent = `Chiama ${tel(t)}`; az.appendChild(a); }
        li.append(forte, dist, az);
        lista.appendChild(li);
      });
      stato.textContent = `I 6 centri più vicini a ${dove}.`;
      if (mappa3d) mappa3d.cerca(lat, lon, vicini.map((v) => v.i));
    });
  }

  $("[data-cerca]").addEventListener("submit", (e) => {
    e.preventDefault();
    const q = $("#cerca-citta").value.trim();
    if (q.length < 2) { stato.textContent = "Scrivi il nome della tua città o il CAP."; $("#cerca-citta").focus(); return; }
    stato.textContent = "Cerco…";
    fermaGiro();
    fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=it&accept-language=it&q=${encodeURIComponent(q)}`)
      .then((r) => r.json())
      .then((ris) => {
        if (!ris.length) { stato.textContent = `Non trovo "${q}": prova con il nome del comune o il CAP.`; return; }
        mostraVicini(+ris[0].lat, +ris[0].lon, q);
      })
      .catch(() => { stato.textContent = "La ricerca non risponde: riprova tra poco o usa la tua posizione."; });
  });

  $("[data-posizione]").addEventListener("click", () => {
    if (!navigator.geolocation) { stato.textContent = "Questo browser non condivide la posizione: scrivi la tua città."; return; }
    stato.textContent = "Cerco la tua posizione…";
    navigator.geolocation.getCurrentPosition(
      (p) => mostraVicini(p.coords.latitude, p.coords.longitude, "te"),
      () => { stato.textContent = "Posizione non disponibile: scrivi la tua città o il CAP."; },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 }
    );
  });
})();
