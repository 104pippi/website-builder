(() => {
  const d = document;
  const WA = "393293276148";
  const ridotto = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const desktop = matchMedia("(min-width: 960px)");
  const clamp = (v) => Math.min(1, Math.max(0, v));

  const anno = d.getElementById("anno");
  if (anno) anno.textContent = new Date().getFullYear();

  /* Header e barra contatti */
  const top = d.querySelector(".top");
  const dock = d.querySelector(".dock");
  setTimeout(() => dock && dock.classList.add("is-on"), ridotto ? 0 : 1500);

  /* Menu mobile */
  const btnMenu = d.querySelector(".top__menu");
  const menu = d.getElementById("menu");
  const chiudiMenu = () => {
    menu.hidden = true;
    btnMenu.setAttribute("aria-expanded", "false");
    btnMenu.textContent = "Menu";
    d.body.style.overflow = "";
    top.classList.toggle("is-solid", scrollY > 40);
  };
  btnMenu.addEventListener("click", () => {
    if (!menu.hidden) return chiudiMenu();
    menu.hidden = false;
    btnMenu.setAttribute("aria-expanded", "true");
    btnMenu.textContent = "Chiudi";
    d.body.style.overflow = "hidden";
    top.classList.add("is-solid");
  });
  menu.addEventListener("click", (e) => { if (e.target.closest("a")) chiudiMenu(); });
  d.addEventListener("keydown", (e) => { if (e.key === "Escape" && !menu.hidden) { chiudiMenu(); btnMenu.focus(); } });
  desktop.addEventListener("change", () => { if (desktop.matches && !menu.hidden) chiudiMenu(); });

  /* Comparsa dei titoli e delle foto: si osserva l'elemento, il ritaglio sta sul figlio */
  const daRivelare = d.querySelectorAll("[data-rivela]");
  if ("IntersectionObserver" in window && !ridotto) {
    const io = new IntersectionObserver((voci) => {
      voci.forEach((v) => { if (v.isIntersecting) { v.target.classList.add("in"); io.unobserve(v.target); } });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
    daRivelare.forEach((el) => io.observe(el));
  } else {
    daRivelare.forEach((el) => el.classList.add("in"));
  }

  /* Cosa costruiamo: fisarmonica su mobile, foto che cambia su desktop */
  const voci = [...d.querySelectorAll(".svc__item")];
  const apri = (voce, alterna) => {
    const giaAperta = voce.classList.contains("is-on");
    voci.forEach((x) => {
      const on = x === voce ? (alterna && !desktop.matches ? !giaAperta : true) : false;
      x.classList.toggle("is-on", on);
      x.querySelector(".svc__btn").setAttribute("aria-expanded", String(on));
    });
  };
  voci.forEach((voce) => {
    const b = voce.querySelector(".svc__btn");
    b.addEventListener("click", () => apri(voce, true));
    b.addEventListener("mouseenter", () => { if (desktop.matches) apri(voce); });
    b.addEventListener("focus", () => { if (desktop.matches) apri(voce); });
  });
  desktop.addEventListener("change", () => {
    if (desktop.matches && !voci.some((v) => v.classList.contains("is-on"))) apri(voci[0]);
  });

  /* Link che preselezionano il tipo di lavoro nel modulo */
  const form = d.getElementById("form");
  d.querySelectorAll("[data-lavoro]").forEach((a) => {
    a.addEventListener("click", () => {
      const r = form.querySelector(`input[name="lavoro"][value="${a.dataset.lavoro}"]`);
      if (r) r.checked = true;
    });
  });

  /* Modulo: compone il messaggio e apre WhatsApp */
  const err = d.getElementById("form-err");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const f = new FormData(form);
    const nome = (f.get("nome") || "").trim();
    const comune = (f.get("comune") || "").trim();
    const dettagli = (f.get("dettagli") || "").trim();
    form.nome.setAttribute("aria-invalid", String(!nome));
    form.comune.setAttribute("aria-invalid", String(!comune));
    if (!nome || !comune) {
      err.hidden = false;
      (nome ? form.comune : form.nome).focus();
      return;
    }
    err.hidden = true;
    const righe = [
      "Ciao Trevi House, vorrei un sopralluogo o un preventivo.",
      `Lavoro: ${f.get("lavoro")}`,
      `Comune del cantiere: ${comune}`,
      `Nome: ${nome}`,
    ];
    if (dettagli) righe.push(`Dettagli: ${dettagli}`);
    window.open(`https://wa.me/${WA}?text=${encodeURIComponent(righe.join("\n"))}`, "_blank", "noopener");
  });

  /* Hero: il nodo del tetto ruota nell'oculo mentre scorri, il goniometro gira al contrario */
  const hero = d.querySelector(".hero");
  const disco = d.querySelector(".hero__spin img");
  const anello = d.querySelectorAll(".hero__ticks, .hero__deg");
  const heroBody = d.querySelector(".hero__body");

  /* Il cantiere: una foto per ogni tratto di scroll, il metro avanza */
  const track = d.querySelector(".build__track");
  const fotogrammi = [...d.querySelectorAll(".build__frames img")];
  const fasi = [...d.querySelectorAll(".build__phases li")];
  const contatore = d.querySelector(".build__n");
  const metro = d.querySelector(".ruler");
  let corrente = 0;
  const caricaFotogrammi = () => fotogrammi.forEach((img) => { if (img.dataset.src) { img.src = img.dataset.src; img.removeAttribute("data-src"); } });
  if ("IntersectionObserver" in window) {
    const ioB = new IntersectionObserver((v) => { if (v[0].isIntersecting) { caricaFotogrammi(); ioB.disconnect(); } }, { rootMargin: "1600px 0px" });
    ioB.observe(track);
  } else caricaFotogrammi();

  const aggiornaCantiere = () => {
    const r = track.getBoundingClientRect();
    const corsa = r.height - innerHeight;
    if (r.top > innerHeight || r.bottom < 0) return;
    const p = clamp(-r.top / corsa);
    metro.style.setProperty("--p", p.toFixed(4));
    const i = Math.min(fotogrammi.length - 1, Math.floor(p * fotogrammi.length));
    if (i === corrente) return;
    corrente = i;
    fotogrammi.forEach((img, k) => img.classList.toggle("on", k === i));
    let fase = 0;
    fasi.forEach((li, k) => { if (i >= Number(li.dataset.da)) fase = k; });
    fasi.forEach((li, k) => li.classList.toggle("on", k === fase));
    contatore.textContent = String(i + 1).padStart(2, "0");
  };

  /* Paesi: le due righe scorrono in versi opposti */
  const paesi = d.querySelector(".towns");
  const righe = [...d.querySelectorAll(".towns__row")];
  const aggiornaPaesi = () => {
    const r = paesi.getBoundingClientRect();
    if (r.top > innerHeight || r.bottom < 0) return;
    const p = clamp((innerHeight - r.top) / (innerHeight + r.height));
    righe.forEach((riga) => {
      const max = Math.max(0, riga.scrollWidth - paesi.clientWidth);
      const x = riga.dataset.dir === "1" ? -max * (1 - p) : -max * p;
      riga.style.transform = `translate3d(${x.toFixed(1)}px,0,0)`;
    });
  };

  let inCoda = false;
  const aggiorna = () => {
    inCoda = false;
    const y = scrollY;
    if (menu.hidden) top.classList.toggle("is-solid", y > 40);
    if (!ridotto && y < hero.offsetHeight) {
      const p = clamp(y / hero.offsetHeight);
      disco.style.transform = `rotate(${(p * 90).toFixed(2)}deg)`;
      anello.forEach((g) => { g.style.transform = `rotate(${(-p * 45).toFixed(2)}deg)`; });
      heroBody.style.opacity = String(1 - p * 0.9);
      heroBody.style.transform = `translate3d(0,${(-p * 40).toFixed(1)}px,0)`;
    }
    aggiornaCantiere();
    if (!ridotto) aggiornaPaesi();
  };
  const richiedi = () => { if (!inCoda) { inCoda = true; requestAnimationFrame(aggiorna); } };
  addEventListener("scroll", richiedi, { passive: true });
  addEventListener("resize", richiedi);
  aggiorna();
})();
