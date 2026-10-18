(() => {
  const fermo = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* Menu mobile */
  const menu = $('#menu');
  const apri = $('#menu-apri');
  const chiudiMenu = () => { menu.classList.remove('is-aperto'); apri.setAttribute('aria-expanded', 'false'); document.body.style.overflow = ''; };
  apri.addEventListener('click', () => {
    if (apri.getAttribute('aria-expanded') === 'true') return chiudiMenu();
    menu.classList.add('is-aperto');
    apri.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  });
  $$('a', menu).forEach(a => a.addEventListener('click', chiudiMenu));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') chiudiMenu(); });

  /* Hero: la seduta grezza viene verniciata a spruzzo, passata dopo passata */
  const hero = $('.hero');
  const foto = $('#hero-foto');
  const img = $('#hero-img');
  const tela = $('#hero-spruzzo');
  const stato = $('#stato-pezzo');
  const finito = () => { hero.classList.add('verniciato'); stato.textContent = 'Verniciato a mano'; setTimeout(() => { tela.hidden = true; }, 700); };

  const vernicia = () => {
    const ctx = tela.getContext && tela.getContext('2d');
    if (fermo || !ctx || !window.DOMMatrix) return finito();
    const r = foto.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = Math.round(r.width * dpr), H = Math.round(r.height * dpr);
    tela.width = W; tela.height = H;

    // stessa inquadratura di object-fit: cover + object-position
    const iw = img.naturalWidth, ih = img.naturalHeight;
    const s = Math.max(r.width / iw, r.height / ih);
    const [px, py] = getComputedStyle(img).objectPosition.split(' ').map(v => parseFloat(v) / 100);
    const ox = (r.width - iw * s) * (isNaN(px) ? .5 : px);
    const oy = (r.height - ih * s) * (isNaN(py) ? .5 : py);
    const pattern = ctx.createPattern(img, 'no-repeat');
    if (!pattern || !pattern.setTransform) return finito();
    pattern.setTransform(new DOMMatrix([s * dpr, 0, 0, s * dpr, ox * dpr, oy * dpr]));
    ctx.fillStyle = pattern;

    const passate = H > W ? 6 : 4;
    const R = (H / passate) * 0.95;
    const durata = 1700;
    const punto = t => {
      const k = Math.min(passate - 1, Math.floor(t * passate));
      const u = t * passate - k;
      const x = (k % 2 ? 1 - u : u) * W * 1.3 - W * 0.15;
      const y = ((k + 0.5) / passate) * H + Math.sin(u * Math.PI * 2) * R * 0.12;
      return [x, y];
    };
    const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
    const spruzza = (x, y) => {
      ctx.globalAlpha = 0.2;
      ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.9;
      for (let i = 0; i < 26; i++) {
        const a = Math.random() * Math.PI * 2, d = Math.abs(gauss()) * R * 1.35;
        ctx.beginPath(); ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, (0.6 + Math.random() * 2.2) * dpr, 0, Math.PI * 2); ctx.fill();
      }
    };

    let t0 = null, ultimo = 0;
    const passo = 1 / (passate * 34);
    const frame = now => {
      if (t0 === null) t0 = now;
      const t = Math.min(1, (now - t0) / durata);
      for (let q = ultimo; q <= t; q += passo) spruzza(...punto(q));
      ultimo = t;
      if (t > 0.45) hero.classList.add('a-meta');
      if (t < 1) return requestAnimationFrame(frame);
      ctx.globalAlpha = 1; ctx.fillRect(0, 0, W, H);
      finito();
    };
    setTimeout(() => requestAnimationFrame(frame), 350);
  };
  const pronta = () => (img.decode ? img.decode().catch(() => {}) : Promise.resolve()).then(vernicia);
  if (img.complete && img.naturalWidth) pronta(); else img.addEventListener('load', pronta, { once: true });
  img.addEventListener('error', finito, { once: true });

  /* Testata e barra in basso */
  const testata = $('#testata');
  const barra = $('#barra-cta');
  const modulo = $('#preventivo');
  let moduloInVista = false;
  const aggiorna = () => {
    const y = window.scrollY, h = hero.offsetHeight;
    testata.classList.toggle('is-solida', y > h - 90);
    barra.classList.toggle('is-visibile', y > h * 0.6 && !moduloInVista);
  };
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => { moduloInVista = e.isIntersecting; aggiorna(); }, { threshold: 0.1 }).observe(modulo);
  }
  window.addEventListener('scroll', aggiorna, { passive: true });
  aggiorna();

  /* Foto che entrano come una passata di vernice */
  const svela = $$('.svela');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in-vista'); io.unobserve(e.target); }
    }), { threshold: 0, rootMargin: '0px 0px 12% 0px' });
    svela.forEach(el => io.observe(el));
  } else svela.forEach(el => el.classList.add('in-vista'));

  /* Il ciclo: la foto grande segue il passo che stai leggendo */
  const passi = $$('.passo');
  const fotoCiclo = $$('.ciclo-foto');
  const numero = $('#ciclo-numero');
  let attivo = '1';
  const attiva = p => {
    if (p === attivo) return;
    fotoCiclo.forEach(f => {
      f.classList.toggle('is-via', f.dataset.p === attivo);
      f.classList.toggle('is-on', f.dataset.p === p);
      if (f.dataset.p !== attivo && f.dataset.p !== p) f.classList.remove('is-via');
    });
    passi.forEach(li => li.classList.toggle('is-on', li.dataset.p === p));
    numero.textContent = p.padStart(2, '0');
    attivo = p;
  };
  if ('IntersectionObserver' in window) {
    const ioCiclo = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) attiva(e.target.dataset.p); }),
      { rootMargin: '-45% 0px -50% 0px' });
    passi.forEach(li => ioCiclo.observe(li));
  }

  /* Densità: più è alta, più i pori della schiuma si chiudono */
  const range = $('#densita-range');
  const valore = $('#densita-valore');
  const desc = $('#densita-desc');
  const celle = $('#celle');
  const NS = 'http://www.w3.org/2000/svg';
  let seme = 7;
  const caso = () => (seme = (seme * 16807) % 2147483647) / 2147483647;
  const pori = [];
  for (let row = 0; row < 11; row++) {
    for (let col = 0; col < 15; col++) {
      const c = document.createElementNS(NS, 'circle');
      const x = 14 + col * 26.5 + (row % 2) * 13 + (caso() - 0.5) * 9;
      const y = 14 + row * 27 + (caso() - 0.5) * 9;
      c.setAttribute('cx', x.toFixed(1)); c.setAttribute('cy', y.toFixed(1));
      celle.appendChild(c);
      pori.push({ c, k: 0.7 + caso() * 0.6 });
    }
  }
  const aggiornaDensita = () => {
    const d = +range.value;
    const t = (d - 40) / 560;
    valore.textContent = `${d} kg/m³`;
    range.style.setProperty('--pieno', `${(t * 100).toFixed(1)}%`);
    const base = 12.5 - t * 10.8;
    pori.forEach(({ c, k }) => c.setAttribute('r', Math.max(0.8, base * k).toFixed(2)));
    desc.textContent = t < 0.3
      ? 'Bassa densità: leggerissimo e ottimo isolante.'
      : t > 0.62
        ? 'Alta densità: buona durezza superficiale, perfettamente verniciabile.'
        : 'Densità intermedie: le scegliamo con te in base al peso e alla resistenza che servono al pezzo.';
  };
  range.addEventListener('input', aggiornaDensita);
  aggiornaDensita();

  /* Orari: aperti adesso? (ora italiana) */
  const statoOrari = $('#stato');
  try {
    const ora = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Rome' }));
    const g = ora.getDay();
    const fasce = d => (d >= 1 && d <= 5) ? [[480, 720], [840, 1080]] : [];
    const hhmm = m => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
    const nomi = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
    const min = ora.getHours() * 60 + ora.getMinutes();
    const aperta = fasce(g).find(([a, c]) => min >= a && min < c);
    if (aperta) {
      statoOrari.textContent = `Aperti adesso, fino alle ${hhmm(aperta[1])}`;
      statoOrari.classList.add('is-aperto');
    } else {
      let testo = '';
      for (let i = 0; i < 8 && !testo; i++) {
        const d = (g + i) % 7;
        const prossima = fasce(d).find(([a]) => i > 0 || a > min);
        if (prossima) testo = `Chiusi adesso. Riapriamo ${i === 0 ? 'oggi' : i === 1 ? 'domani' : nomi[d]} alle ${hhmm(prossima[0])}`;
      }
      statoOrari.textContent = testo || 'Chiusi adesso';
    }
    statoOrari.hidden = false;
  } catch (e) { /* gli orari restano scritti sopra */ }

  /* Modulo: compone l'email per info@cleverdue.it */
  const errore = $('#modulo-errore');
  modulo.addEventListener('submit', e => {
    e.preventDefault();
    const f = modulo.elements;
    const email = f.email.value.trim();
    const controlli = [
      ['nome', !f.nome.value.trim(), 'il tuo nome'],
      ['email', !/^\S+@\S+\.\S+$/.test(email), 'un indirizzo email valido'],
      ['progetto', !f.progetto.value.trim(), 'due righe sul progetto']
    ];
    controlli.forEach(([n, ko]) => f[n].setAttribute('aria-invalid', String(ko)));
    const mancano = controlli.filter(c => c[1]);
    if (mancano.length) {
      errore.textContent = `Per risponderti ci servono ${mancano.map(c => c[2]).join(', ').replace(/, ([^,]*)$/, ' e $1')}.`;
      errore.hidden = false;
      f[mancano[0][0]].focus();
      return;
    }
    errore.hidden = true;
    const lavorazioni = $$('input[name="lavorazione"]:checked', modulo).map(i => i.value);
    const quantita = ($('input[name="quantita"]:checked', modulo) || {}).value;
    const azienda = f.azienda.value.trim();
    const tel = f.telefono.value.trim();
    const righe = [
      'Buongiorno, vi scrivo per una richiesta di preventivo.',
      '',
      `Nome: ${f.nome.value.trim()}`,
      azienda ? `Azienda o studio: ${azienda}` : null,
      `Email: ${email}`,
      tel ? `Telefono: ${tel}` : null,
      lavorazioni.length ? `Lavorazioni: ${lavorazioni.join(', ')}` : null,
      quantita ? `Quantità: ${quantita}` : null,
      '',
      'Il progetto:',
      f.progetto.value.trim(),
      '',
      'Allego disegni o foto.',
      '',
      'Grazie'
    ].filter(r => r !== null);
    const oggetto = `Richiesta preventivo${azienda ? ` da ${azienda}` : ''}: ${lavorazioni[0] || 'nuovo progetto'}`;
    window.location.href = `mailto:info@cleverdue.it?subject=${encodeURIComponent(oggetto)}&body=${encodeURIComponent(righe.join('\n'))}`;
  });

  const anno = $('#anno');
  if (anno) anno.textContent = new Date().getFullYear();
})();
