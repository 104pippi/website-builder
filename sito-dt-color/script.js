(() => {
  const WA = "393288175919";
  const doc = document.documentElement;
  const calmo = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Anno ---------- */
  document.querySelectorAll("[data-anno]").forEach((el) => (el.textContent = new Date().getFullYear()));

  /* ---------- Orari e stato "aperto ora" (ora di Roma) ---------- */
  const ORARI = { 1: [[480, 720], [840, 1050]], 2: [[480, 720], [840, 1050]], 3: [[480, 720], [840, 1050]], 4: [[480, 720], [840, 1050]], 5: [[480, 720], [840, 1050]], 6: [[480, 720]], 0: [] };
  const GIORNI = ["domenica", "lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato"];
  const hhmm = (m) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;

  function adessoRoma() {
    const parti = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Rome", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date());
    const p = Object.fromEntries(parti.map((x) => [x.type, x.value]));
    const g = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(p.weekday);
    return { g, m: (parseInt(p.hour, 10) % 24) * 60 + parseInt(p.minute, 10) };
  }

  function stato() {
    const { g, m } = adessoRoma();
    const aperta = ORARI[g].find(([a, c]) => m >= a && m < c);
    if (aperta) return { aperto: true, testo: `Aperto ora, chiude alle ${hhmm(aperta[1])}` };
    const dopo = ORARI[g].find(([a]) => a > m);
    if (dopo) return { aperto: false, testo: `Chiuso, riapre alle ${hhmm(dopo[0])}` };
    for (let i = 1; i <= 7; i++) {
      const gg = (g + i) % 7;
      if (ORARI[gg].length) {
        const quando = i === 1 ? "domani" : GIORNI[gg];
        return { aperto: false, testo: `Chiuso, apre ${quando} alle ${hhmm(ORARI[gg][0][0])}` };
      }
    }
    return { aperto: false, testo: "Chiuso" };
  }

  function aggiornaStato() {
    const s = stato();
    document.querySelectorAll("[data-stato]").forEach((el) => {
      el.classList.toggle("is-aperto", s.aperto);
      const t = el.querySelector("[data-stato-testo]");
      if (t) t.textContent = s.testo;
    });
    const { g } = adessoRoma();
    document.querySelectorAll(".orari tr[data-giorni]").forEach((tr) => {
      tr.classList.toggle("oggi", tr.dataset.giorni.split(",").map(Number).includes(g));
    });
  }
  aggiornaStato();
  setInterval(aggiornaStato, 60000);

  /* ---------- La parete che si dipinge ---------- */
  const hero = document.querySelector(".hero");
  const parete = hero && hero.querySelector(".parete");
  const base = parete && parete.querySelector(".parete__base");
  const mano = parete && parete.querySelector(".parete__mano");
  const corsie = mano ? [...mano.querySelectorAll(".corsia")] : [];
  const rullo = parete && parete.querySelector(".rullo");
  const nomeColore = document.querySelector("[data-nome-colore]");
  const metaTema = document.querySelector('meta[name="theme-color"]');
  const campioni = [...document.querySelectorAll(".campione")];
  let corrente = "#24453A";
  let giro = 0;

  const attendi = (anim) => anim.finished.catch(() => {});
  const pausa = (ms) => new Promise((r) => setTimeout(r, ms));

  function impostaColore(colore) {
    doc.style.setProperty("--parete", colore);
    if (metaTema) metaTema.setAttribute("content", colore);
  }

  async function dipingi(colore, { durata = 460 } = {}) {
    const mio = ++giro;
    if (!parete || calmo || typeof Element.prototype.animate !== "function") {
      base.style.background = colore;
      corrente = colore;
      impostaColore(colore);
      return;
    }
    const W = parete.clientWidth;
    const H = parete.clientHeight;
    const n = corsie.length;
    const sovrap = 3;
    const larg = W / n;
    const rW = Math.min(larg * 0.98, 520);
    const rH = rW * 0.5;
    const centro = rH * 0.28; // asse del manicotto dentro l'SVG

    mano.classList.remove("asciuga");
    rullo.style.width = `${rW}px`;
    rullo.style.color = colore;
    corsie.forEach((c, i) => {
      c.getAnimations().forEach((a) => a.cancel());
      c.style.left = `${i * larg - sovrap}px`;
      c.style.width = `${larg + sovrap * 2}px`;
      c.style.setProperty("--mano", colore);
      c.style.clipPath = "inset(0 0 100% 0)";
    });
    rullo.getAnimations().forEach((a) => a.cancel());
    rullo.style.opacity = "1";

    const easing = "cubic-bezier(.5,.05,.3,1)";
    for (let i = 0; i < n; i++) {
      if (mio !== giro) return;
      const giu = i % 2 === 0;
      const x = i * larg + (larg - rW) / 2;
      // il bordo della vernice segue l'asse del manicotto per tutta la passata
      const y0 = giu ? -rH : H;
      const y1 = giu ? H - centro : -centro;
      const da = giu ? `inset(0px 0px ${H + rH - centro}px 0px)` : `inset(${H + centro}px 0px 0px 0px)`;
      const corsia = corsie[i];
      const a1 = corsia.animate([{ clipPath: da }, { clipPath: "inset(0px 0px 0px 0px)" }], { duration: durata, easing, fill: "forwards" });
      const a2 = rullo.animate(
        [{ transform: `translate(${x}px, ${y0}px)` }, { transform: `translate(${x}px, ${y1}px)` }],
        { duration: durata, easing, fill: "forwards" }
      );
      await Promise.all([attendi(a1), attendi(a2)]);
    }
    if (mio !== giro) return;

    // il rullo esce, la vernice "asciuga"
    const ultimoX = (n - 1) * larg + (larg - rW) / 2;
    const fine = n % 2 === 1 ? H - centro : -centro;
    rullo.animate(
      [{ transform: `translate(${ultimoX}px, ${fine}px)`, opacity: 1 }, { transform: `translate(${W + 40}px, ${fine}px)`, opacity: 0 }],
      { duration: 380, easing: "cubic-bezier(.6,0,.8,.4)", fill: "forwards" }
    );
    impostaColore(colore);
    mano.classList.add("asciuga");
    await pausa(1150);
    if (mio !== giro) return;
    base.style.background = colore;
    corrente = colore;
    corsie.forEach((c) => {
      c.getAnimations().forEach((a) => a.cancel());
      c.style.clipPath = "inset(0 0 100% 0)";
    });
    mano.classList.remove("asciuga");
  }

  function scegli(btn) {
    const colore = btn.dataset.colore;
    campioni.forEach((b) => b.setAttribute("aria-checked", String(b === btn)));
    if (nomeColore) nomeColore.textContent = btn.dataset.nome;
    if (colore.toLowerCase() === corrente.toLowerCase()) return;
    // la mano precedente diventa la base, così la nuova passata copre sempre il colore visibile
    const visibile = getComputedStyle(doc).getPropertyValue("--parete").trim() || corrente;
    base.style.background = visibile;
    dipingi(colore, { durata: 340 });
  }

  campioni.forEach((btn, i) => {
    btn.addEventListener("click", () => scegli(btn));
    btn.addEventListener("keydown", (e) => {
      const dir = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      if (!dir) return;
      e.preventDefault();
      const prossimo = campioni[(i + dir + campioni.length) % campioni.length];
      prossimo.focus();
      scegli(prossimo);
    });
    btn.tabIndex = btn.getAttribute("aria-checked") === "true" ? 0 : -1;
  });
  const fila = document.querySelector(".campioni__fila");
  if (fila) {
    fila.addEventListener("focusin", () => campioni.forEach((b) => (b.tabIndex = b.getAttribute("aria-checked") === "true" ? 0 : -1)));
  }

  // prima mano all'apertura
  if (hero) {
    if (calmo) {
      base.style.background = corrente;
      hero.classList.add("dipinta");
    } else {
      const avvia = () => {
        dipingi(corrente, { durata: 480 });
        setTimeout(() => hero.classList.add("dipinta"), 1250);
      };
      if (document.readyState === "complete") requestAnimationFrame(avvia);
      else window.addEventListener("load", () => requestAnimationFrame(avvia), { once: true });
      // rete lenta: il testo non aspetta più di 2,2 s
      setTimeout(() => {
        if (!hero.classList.contains("dipinta")) {
          base.style.background = corrente;
          hero.classList.add("dipinta");
        }
      }, 2200);
    }
  }

  /* ---------- Rivelazioni allo scroll (si osserva il genitore) ---------- */
  const daRivelare = document.querySelectorAll("[data-rivela]");
  if ("IntersectionObserver" in window && !calmo) {
    const io = new IntersectionObserver(
      (voci) => voci.forEach((v) => {
        if (v.isIntersecting) {
          v.target.classList.add("in");
          io.unobserve(v.target);
        }
      }),
      { rootMargin: "0px 0px -12% 0px", threshold: 0.01 }
    );
    daRivelare.forEach((el) => io.observe(el));
  } else {
    daRivelare.forEach((el) => el.classList.add("in"));
  }

  /* ---------- Modulo: compone il messaggio e apre WhatsApp ---------- */
  const modulo = document.querySelector("[data-modulo]");
  if (modulo) {
    const errore = modulo.querySelector("[data-errore]");
    modulo.addEventListener("submit", (e) => {
      e.preventDefault();
      const dati = new FormData(modulo);
      const nome = String(dati.get("nome") || "").trim();
      if (!nome) {
        errore.hidden = false;
        modulo.elements.nome.focus();
        return;
      }
      errore.hidden = true;
      const tipo = dati.get("tipo");
      const dettagli = String(dati.get("dettagli") || "").trim();
      let testo = `Ciao DT Color, sono ${nome}. Mi serve ${tipo}.`;
      if (dettagli) testo += `\n${dettagli}`;
      window.open(`https://wa.me/${WA}?text=${encodeURIComponent(testo)}`, "_blank", "noopener");
    });
    modulo.elements.nome.addEventListener("input", () => {
      if (modulo.elements.nome.value.trim()) errore.hidden = true;
    });
  }
})();
