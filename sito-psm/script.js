/* PSM Industrial Automation — interazioni della demo */
(() => {
  const ridotto = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

  /* ---------- testata e menu ---------- */
  const testata = document.querySelector("[data-testata]");
  const bottoneMenu = document.querySelector("[data-apri-menu]");

  const chiudiMenu = () => {
    testata.removeAttribute("data-aperto");
    bottoneMenu.setAttribute("aria-expanded", "false");
  };
  bottoneMenu.addEventListener("click", () => {
    const aperto = testata.hasAttribute("data-aperto");
    if (aperto) chiudiMenu();
    else {
      testata.setAttribute("data-aperto", "");
      bottoneMenu.setAttribute("aria-expanded", "true");
    }
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") chiudiMenu(); });

  /* ancore con scorrimento morbido solo al clic (niente scroll-behavior globale) */
  document.addEventListener("click", (e) => {
    const link = e.target.closest('a[href^="#"]');
    if (!link) return;
    const id = link.getAttribute("href");
    if (id === "#") return;
    const meta = document.querySelector(id);
    if (!meta) return;
    e.preventDefault();
    chiudiMenu();
    meta.scrollIntoView({ behavior: ridotto ? "auto" : "smooth", block: "start" });
    if (meta.tagName === "DETAILS") meta.open = true;
    history.replaceState(null, "", id);
  });

  /* ---------- contaore a rulli ---------- */
  const conMigliaia = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const rulli = [];
  document.querySelectorAll(".contatore__rulli").forEach((box) => {
    const testo = conMigliaia(box.dataset.valore);
    const cifre = [...testo].filter((c) => c !== ".").length;
    let posto = 0;
    [...testo].forEach((c) => {
      if (c === ".") {
        const p = document.createElement("span");
        p.className = "punto";
        p.textContent = ".";
        box.append(p);
        return;
      }
      const finestra = document.createElement("span");
      finestra.className = "finestra";
      const rullo = document.createElement("span");
      rullo.className = "rullo";
      for (let n = 0; n < 10; n++) {
        const faccia = document.createElement("span");
        faccia.style.setProperty("--n", n);
        faccia.textContent = n;
        rullo.append(faccia);
      }
      finestra.append(rullo);
      box.append(finestra);
      // la cifra più a destra gira di più, come in un contaore vero
      const giri = cifre - posto;
      rulli.push({ rullo, cifra: Number(c), giri, posto });
      posto++;
    });
  });
  const avviaRulli = () => {
    rulli.forEach(({ rullo, cifra, giri, posto }) => {
      rullo.style.setProperty("--durata", `${2.1 + giri * 0.12}s`);
      rullo.style.setProperty("--ritardo", `${posto * 0.06}s`);
      rullo.style.setProperty("--a", `${giri * 360 + cifra * 36}deg`);
    });
  };

  /* ---------- comparse quando le sezioni entrano in vista ---------- */
  const osserva = (el, soglia, azione) => {
    if (!el) return;
    if (!("IntersectionObserver" in window)) { azione(); return; }
    const io = new IntersectionObserver((voci) => {
      if (voci.some((v) => v.isIntersecting)) { azione(); io.disconnect(); }
    }, { threshold: soglia });
    io.observe(el);
  };
  osserva(document.querySelector("[data-contaore]"), 0.35, avviaRulli);
  const alveare = document.querySelector("[data-alveare]");
  osserva(alveare.querySelector(".motto"), 0.6, () => alveare.classList.add("vista"));
  const mappa = document.querySelector("[data-mappa]");
  osserva(mappa, 0.35, () => mappa.classList.add("vista"));

  /* ---------- effetti legati allo scroll (un solo ciclo) ---------- */
  const hero = document.querySelector("[data-hero]");
  const tubo = document.querySelector(".tubo");
  const flusso = document.querySelector("[data-tubo]");
  const fasi = [...document.querySelectorAll("[data-fase]")];
  let inAttesa = false;

  const aggiorna = () => {
    inAttesa = false;
    const vh = innerHeight;
    testata.classList.toggle("testata--piena", scrollY > 24);

    const h = hero.getBoundingClientRect();
    if (h.bottom > 0) hero.style.setProperty("--s", clamp(-h.top / h.height).toFixed(3));

    const t = tubo.getBoundingClientRect();
    const linea = vh * 0.62;
    if (t.top < vh && t.bottom > 0) {
      flusso.style.setProperty("--p", clamp((linea - t.top) / t.height).toFixed(4));
    } else if (t.bottom <= 0) {
      flusso.style.setProperty("--p", 1);
    }
    fasi.forEach((f) => {
      const nodo = f.querySelector(".fase__nodo").getBoundingClientRect();
      if (nodo.top + nodo.height / 2 < linea + 6) f.classList.add("attiva");
    });

    const a = alveare.getBoundingClientRect();
    if (a.top < vh && a.bottom > 0) {
      alveare.style.setProperty("--p", clamp((vh - a.top) / (vh + a.height)).toFixed(3));
    }
  };
  const chiedi = () => { if (!inAttesa) { inAttesa = true; requestAnimationFrame(aggiorna); } };
  addEventListener("scroll", chiedi, { passive: true });
  addEventListener("resize", chiedi);
  aggiorna();

  /* ---------- modulo: prepara l'email per info@psm-srl.com ---------- */
  const modulo = document.querySelector("[data-modulo]");
  const stato = modulo.querySelector("[data-stato]");
  modulo.addEventListener("submit", (e) => {
    e.preventDefault();
    const dati = new FormData(modulo);
    let primoErrore = null;
    modulo.querySelectorAll(".errore").forEach((el) => el.classList.remove("errore"));
    modulo.querySelectorAll("[required]").forEach((campo) => {
      const vuoto = campo.type === "checkbox" ? !campo.checked : !campo.value.trim();
      const emailSbagliata = campo.type === "email" && campo.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(campo.value);
      if (vuoto || emailSbagliata) {
        campo.closest(".campo, .consenso").classList.add("errore");
        primoErrore = primoErrore || campo;
      }
    });
    if (primoErrore) {
      stato.textContent = primoErrore.type === "checkbox"
        ? "Serve il consenso privacy per inviare la richiesta."
        : "Completate i campi evidenziati: nome, azienda, email valida e due righe sull'impianto.";
      stato.classList.add("errore");
      primoErrore.focus();
      return;
    }
    const servizi = dati.getAll("servizio");
    const righe = [
      `Nome: ${dati.get("nome")}`,
      `Azienda: ${dati.get("azienda")}`,
      `Email: ${dati.get("email")}`,
      dati.get("telefono") ? `Telefono: ${dati.get("telefono")}` : null,
      servizi.length ? `Servizi richiesti: ${servizi.join(", ")}` : null,
      "",
      String(dati.get("messaggio")),
    ].filter((r) => r !== null);
    const oggetto = `Richiesta preventivo - ${dati.get("azienda")}`;
    location.href = `mailto:info@psm-srl.com?subject=${encodeURIComponent(oggetto)}&body=${encodeURIComponent(righe.join("\n"))}`;
    stato.classList.remove("errore");
    stato.textContent = "Abbiamo aperto la vostra app di posta con la richiesta già scritta: premete Invia per mandarla.";
  });

  document.querySelector("[data-anno]").textContent = new Date().getFullYear();

  /* ---------- scena 3D: arriva dopo il caricamento, la pagina non la aspetta ---------- */
  const avvia3d = () => {
    const conn = navigator.connection;
    if (conn && conn.saveData) return;
    import("./3d.js").catch(() => {});
  };
  if (document.readyState === "complete") setTimeout(avvia3d, 60);
  else addEventListener("load", () => setTimeout(avvia3d, 60), { once: true });
})();
