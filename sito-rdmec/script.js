/* R.D.MEC — demo. Niente librerie: menu, palco del compressore, indice prodotti, servizi, modulo. */
(() => {
  const doc = document.documentElement;
  const ridotto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  const lerp = (a, b, t) => a + (b - a) * t;

  /* Anno nel piede */
  const anno = document.getElementById('anno');
  if (anno) anno.textContent = new Date().getFullYear();

  /* Testata e menu mobile */
  const testata = document.getElementById('testata');
  const bottoneMenu = testata.querySelector('.testata__menu');
  const menu = document.getElementById('menu-mobile');
  const chiudiMenu = () => {
    bottoneMenu.setAttribute('aria-expanded', 'false');
    bottoneMenu.querySelector('.visually-hidden').textContent = 'Apri il menu';
    menu.hidden = true;
    aggiornaTestata();
  };
  bottoneMenu.addEventListener('click', () => {
    const aperto = bottoneMenu.getAttribute('aria-expanded') === 'true';
    if (aperto) return chiudiMenu();
    bottoneMenu.setAttribute('aria-expanded', 'true');
    bottoneMenu.querySelector('.visually-hidden').textContent = 'Chiudi il menu';
    menu.hidden = false;
    testata.classList.add('is-piena');
  });
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) chiudiMenu(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) { chiudiMenu(); bottoneMenu.focus(); } });

  const hero = document.querySelector('.hero');
  const barra = document.querySelector('.barra-cta');
  function aggiornaTestata() {
    const y = window.scrollY;
    testata.classList.toggle('is-piena', y > 24 || !menu.hidden);
    const h = hero.offsetHeight;
    barra.classList.toggle('is-visibile', y > h * 0.45);
    if (!ridotto) hero.style.setProperty('--hp', clamp(y / h).toFixed(4));
  }

  /* Palco del compressore a vite: avanzamento, fasi, manometro */
  const vite = document.getElementById('compressore');
  const fasi = [...vite.querySelectorAll('.fase')];
  const verbi = fasi.map((f) => f.querySelector('.fase__verbo'));
  const confini = [[0, 0.34], [0.34, 0.67], [0.67, 1]];
  const tacche = vite.querySelector('.manometro__tacche');
  for (let i = 0; i <= 16; i++) {
    const a = (-120 + i * 15) * Math.PI / 180;
    const lunga = i % 4 === 0;
    const r1 = 46, r2 = lunga ? 37 : 41;
    const l = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    l.setAttribute('x1', (60 + Math.sin(a) * r1).toFixed(2)); l.setAttribute('y1', (60 - Math.cos(a) * r1).toFixed(2));
    l.setAttribute('x2', (60 + Math.sin(a) * r2).toFixed(2)); l.setAttribute('y2', (60 - Math.cos(a) * r2).toFixed(2));
    if (lunga) l.setAttribute('class', 'lunga');
    tacche.appendChild(l);
  }

  function progressoVite() {
    const r = vite.getBoundingClientRect();
    const corsa = r.height - window.innerHeight;
    return corsa > 0 ? clamp(-r.top / corsa) : 0;
  }
  window.RDMEC = { progressoVite, ridotto };

  let ultimoP = -1;
  function aggiornaVite(t) {
    const p = ridotto ? 0.5 : progressoVite();
    // pressione: sale mentre comprime, poi oscilla leggera mentre eroga
    let bar = lerp(0, 0.08, sstep(0, 0.34, p)) + 0.72 * sstep(0.36, 0.66, p);
    if (p > 0.66) bar += Math.sin(t * 0.004) * 0.012;
    vite.style.setProperty('--p-bar', bar.toFixed(4));
    if (Math.abs(p - ultimoP) < 0.0004) return;
    ultimoP = p;
    vite.style.setProperty('--p', p.toFixed(4));
    if (ridotto) return;
    fasi.forEach((f, i) => {
      const [s, e] = confini[i];
      const dentro = i === 0 ? 1 : sstep(s - 0.035, s + 0.035, p);
      const fuori = i === confini.length - 1 ? 0 : sstep(e - 0.035, e + 0.035, p);
      const o = dentro * (1 - fuori);
      f.style.opacity = o.toFixed(3);
      f.style.transform = `translate3d(0, ${((1 - dentro) * 28 - fuori * 28).toFixed(1)}px, 0)`;
      f.style.visibility = o < 0.01 ? 'hidden' : 'visible';
      const lp = clamp((p - s) / (e - s));
      const v = verbi[i];
      if (i === 0) { v.style.fontStretch = `${lerp(62, 125, sstep(0, 1, lp)).toFixed(1)}%`; v.style.letterSpacing = '-0.02em'; }
      if (i === 1) { v.style.fontStretch = `${lerp(125, 62, sstep(0.05, 0.95, lp)).toFixed(1)}%`; v.style.letterSpacing = `${lerp(-0.01, -0.045, lp).toFixed(3)}em`; }
      if (i === 2) { v.style.fontStretch = `${lerp(78, 125, sstep(0, 0.8, lp)).toFixed(1)}%`; v.style.letterSpacing = `${lerp(-0.02, 0.05, sstep(0.1, 1, lp)).toFixed(3)}em`; }
    });
  }

  /* Un solo giro di rAF: legge lo scroll e aggiorna testata e palco */
  let vitaVisibile = false;
  new IntersectionObserver(([e]) => { vitaVisibile = e.isIntersecting; }, { rootMargin: '20% 0px' }).observe(vite);
  function giro(t) {
    aggiornaTestata();
    if (vitaVisibile || ultimoP < 0) aggiornaVite(t);
    requestAnimationFrame(giro);
  }
  requestAnimationFrame(giro);

  /* Scena 3D: si carica dopo la pagina, quando il palco si avvicina */
  function supportaWebGL() {
    try {
      const c = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
    } catch (e) { return false; }
  }
  function caricaScena() {
    if (!supportaWebGL()) return;
    const osservatore = new IntersectionObserver((voci) => {
      if (!voci.some((v) => v.isIntersecting)) return;
      osservatore.disconnect();
      import('./3d.js')
        .then((m) => m.avvia({ sezione: vite, canvas: vite.querySelector('.vite__canvas'), ridotto }))
        .then(() => vite.classList.add('is-3d'))
        .catch((err) => console.warn('Scena 3D non disponibile:', err));
    }, { rootMargin: '150% 0px' });
    osservatore.observe(vite);
  }
  if (document.readyState === 'complete') caricaScena();
  else window.addEventListener('load', caricaScena, { once: true });

  /* Indice prodotti */
  document.querySelectorAll('.voce__testa').forEach((b) => {
    b.addEventListener('click', () => {
      const corpo = document.getElementById(b.getAttribute('aria-controls'));
      const aperta = b.getAttribute('aria-expanded') === 'true';
      b.setAttribute('aria-expanded', String(!aperta));
      corpo.classList.toggle('is-aperta', !aperta);
    });
  });

  /* Servizi: la foto a sinistra segue il passo che stai leggendo (desktop) */
  const media = [...document.querySelectorAll('.servizi__media img')];
  const passi = [...document.querySelectorAll('.passo')];
  let attivo = 0;
  const attiva = (n) => {
    if (n === attivo) return;
    media.forEach((m) => m.classList.remove('era-attiva'));
    media[attivo].classList.remove('is-attiva');
    media[attivo].classList.add('era-attiva');
    media[n].classList.add('is-attiva');
    passi[attivo].classList.remove('is-attivo');
    passi[n].classList.add('is-attivo');
    attivo = n;
  };
  passi[0].classList.add('is-attivo');
  const ossPassi = new IntersectionObserver((voci) => {
    voci.forEach((v) => { if (v.isIntersecting) attiva(Number(v.target.dataset.passo)); });
  }, { rootMargin: '-45% 0px -45% 0px' });
  passi.forEach((p) => ossPassi.observe(p));

  /* Modulo: compone l'email per l'ufficio giusto */
  const modulo = document.getElementById('modulo');
  const errore = modulo.querySelector('.modulo__errore');
  document.querySelectorAll('[data-richiesta]').forEach((a) => {
    a.addEventListener('click', () => {
      const cosa = a.dataset.richiesta;
      const tipo = cosa === 'Ricambi originali' ? 'Ricambi' : 'Preventivo o consulenza';
      modulo.querySelector(`input[name="tipo"][value="${tipo}"]`).checked = true;
      modulo.oggetto.value = cosa;
      if (!modulo.messaggio.value) modulo.messaggio.value = `Vorrei sapere disponibilità e prezzi per: ${cosa.toLowerCase()}.`;
    });
  });
  modulo.addEventListener('submit', (e) => {
    e.preventDefault();
    const obbligatori = [modulo.nome, modulo.telefono, modulo.messaggio];
    let primo = null;
    obbligatori.forEach((c) => {
      const vuoto = !c.value.trim();
      c.setAttribute('aria-invalid', String(vuoto));
      if (vuoto && !primo) primo = c;
    });
    if (primo) { errore.textContent = 'Scrivi nome, telefono e messaggio: servono per richiamarti.'; errore.hidden = false; primo.focus(); return; }
    if (!modulo.privacy.checked) { errore.textContent = "Spunta la presa visione dell'informativa privacy per continuare."; errore.hidden = false; modulo.privacy.focus(); return; }
    errore.hidden = true;
    const tipo = modulo.querySelector('input[name="tipo"]:checked').value;
    const a = tipo === 'Assistenza o guasto' ? 'service@rdmec.it' : 'commerciale@rdmec.it';
    const nome = modulo.nome.value.trim();
    const azienda = modulo.azienda.value.trim();
    const prodotto = modulo.oggetto.value.trim();
    const righe = [
      modulo.messaggio.value.trim(), '',
      `Nome: ${nome}`,
      azienda ? `Azienda: ${azienda}` : null,
      `Telefono: ${modulo.telefono.value.trim()}`,
      prodotto ? `Prodotto o macchina: ${prodotto}` : null,
      `Richiesta: ${tipo}`,
    ].filter((r) => r !== null);
    const oggetto = `${tipo}: ${nome}${azienda ? ` (${azienda})` : ''}`;
    window.location.href = `mailto:${a}?subject=${encodeURIComponent(oggetto)}&body=${encodeURIComponent(righe.join('\n'))}`;
  });
  modulo.addEventListener('input', (e) => { if (e.target.getAttribute('aria-invalid') === 'true' && e.target.value.trim()) e.target.setAttribute('aria-invalid', 'false'); });
})();
