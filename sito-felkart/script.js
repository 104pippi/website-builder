(() => {
  const html = document.documentElement;
  html.classList.add('js');
  const riduci = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Testata e menu mobile ---------- */
  const testata = document.querySelector('[data-testata]');
  const menu = document.querySelector('[data-menu]');
  const apriMenu = document.querySelector('[data-menu-apri]');

  function chiudiMenu() {
    menu.hidden = true;
    apriMenu.setAttribute('aria-expanded', 'false');
    apriMenu.querySelector('.testata__menu-testo').textContent = 'Menu';
    document.body.style.overflow = '';
  }
  apriMenu.addEventListener('click', () => {
    const aperto = !menu.hidden;
    if (aperto) return chiudiMenu();
    menu.hidden = false;
    apriMenu.setAttribute('aria-expanded', 'true');
    apriMenu.querySelector('.testata__menu-testo').textContent = 'Chiudi';
    document.body.style.overflow = 'hidden';
  });
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) chiudiMenu(); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) chiudiMenu(); });

  /* ---------- Aperto o chiuso adesso (ora di Roma) ---------- */
  const orari = { 1: [[480, 720], [840, 1110]], 2: [[480, 720], [840, 1110]], 3: [[480, 720], [840, 1110]],
    4: [[480, 720], [840, 1110]], 5: [[480, 720], [840, 1110]], 6: [[540, 720]], 0: [] };
  const giorni = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
  const ora = (m) => `${Math.floor(m / 60)}.${String(m % 60).padStart(2, '0')}`;

  function statoApertura() {
    let giorno, minuti;
    try {
      const parti = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Rome', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
      const v = Object.fromEntries(parti.map((p) => [p.type, p.value]));
      giorno = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(v.weekday);
      minuti = Number(v.hour) * 60 + Number(v.minute);
    } catch (e) { return null; }
    for (const [a, b] of orari[giorno]) {
      if (minuti >= a && minuti < b) return { aperto: true, testo: `Aperto ora, fino alle ${ora(b)}` };
    }
    const dopo = orari[giorno].find(([a]) => a > minuti);
    if (dopo) return { aperto: false, testo: `Chiuso ora, riapriamo alle ${ora(dopo[0])}` };
    for (let i = 1; i <= 7; i++) {
      const g = (giorno + i) % 7;
      if (orari[g].length) {
        const quando = i === 1 ? 'domani' : giorni[g];
        return { aperto: false, testo: `Chiuso ora, riapriamo ${quando} alle ${ora(orari[g][0][0])}` };
      }
    }
    return null;
  }
  const stato = statoApertura();
  if (stato) {
    document.querySelectorAll('[data-aperto]').forEach((el) => {
      el.classList.toggle('si', stato.aperto);
      el.querySelector('[data-aperto-testo]').textContent = stato.testo;
    });
  }

  /* ---------- Comparse una tantum ---------- */
  const unaVolta = new IntersectionObserver((voci) => {
    voci.forEach((v) => {
      if (v.isIntersecting) { v.target.classList.add('in'); unaVolta.unobserve(v.target); }
    });
  }, { threshold: 0.35 });
  document.querySelectorAll('[data-dymo], [data-prova-timbro]').forEach((el) => unaVolta.observe(el));

  /* ---------- Movimento legato allo scroll ---------- */
  const cassettiera = document.querySelector('[data-cassettiera]');
  const cassetti = [...document.querySelectorAll('[data-cassetto]')];
  const percorso = document.querySelector('[data-percorso]');
  const passi = percorso ? [...percorso.querySelectorAll('.passo')] : [];
  let inAttesa = false;

  const limita = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const morbido = (v) => v * v * (3 - 2 * v);

  function aggiorna() {
    inAttesa = false;
    const vh = innerHeight;
    testata.classList.toggle('scorre', scrollY > 8);

    if (cassettiera && !riduci) {
      const r = cassettiera.getBoundingClientRect();
      if (r.bottom > -300 && r.top < vh + 300) {
        cassettiera.style.setProperty('--occhio', `${Math.round(vh * 0.16 - r.top)}px`);
        const fuoco = vh * 0.54;
        const raggio = vh * (innerWidth < 960 ? 0.24 : 0.3);
        for (const c of cassetti) {
          const b = c.getBoundingClientRect();
          const o = morbido(limita(1 - Math.abs(b.top + b.height * 0.5 - fuoco) / raggio));
          c.style.setProperty('--o', o.toFixed(3));
          c.style.zIndex = o > 0.01 ? String(2 + Math.round(o * 10)) : '';
        }
      }
    }

    if (percorso) {
      const r = percorso.getBoundingClientRect();
      const p = limita((vh * 0.72 - r.top) / r.height);
      percorso.style.setProperty('--p', p.toFixed(3));
      for (const passo of passi) {
        const n = passo.querySelector('.passo__numero').getBoundingClientRect();
        passo.classList.toggle('attivo', n.top + n.height / 2 < vh * 0.72);
      }
    }
  }
  const chiedi = () => { if (!inAttesa) { inAttesa = true; requestAnimationFrame(aggiorna); } };
  addEventListener('scroll', chiedi, { passive: true });
  addEventListener('resize', chiedi);
  aggiorna();

  /* ---------- Cataloghi per settore: piega 3D leggera ---------- */
  const fila = document.querySelector('[data-settori]');
  if (fila) {
    const opuscoli = [...fila.children];
    let filaInAttesa = false;
    const piega = () => {
      filaInAttesa = false;
      if (riduci) return;
      const f = fila.getBoundingClientRect();
      const centro = f.left + f.width / 2;
      for (const o of opuscoli) {
        const b = o.getBoundingClientRect();
        const d = Math.max(-1.4, Math.min(1.4, (b.left + b.width / 2 - centro) / f.width));
        o.style.setProperty('--ry', `${(-d * 22).toFixed(2)}deg`);
        o.style.setProperty('--tz', `${(-Math.abs(d) * 60).toFixed(1)}px`);
      }
    };
    const chiediPiega = () => { if (!filaInAttesa) { filaInAttesa = true; requestAnimationFrame(piega); } };
    fila.addEventListener('scroll', chiediPiega, { passive: true });
    addEventListener('resize', chiediPiega);
    piega();

    const passo = () => (opuscoli[1] ? opuscoli[1].offsetLeft - opuscoli[0].offsetLeft : 320);
    document.querySelector('[data-settori-prec]').addEventListener('click', () => fila.scrollBy({ left: -passo() * 2, behavior: 'smooth' }));
    document.querySelector('[data-settori-succ]').addEventListener('click', () => fila.scrollBy({ left: passo() * 2, behavior: 'smooth' }));
  }

  /* ---------- Modulo: compone l'email ---------- */
  const modulo = document.querySelector('[data-modulo]');
  if (modulo) {
    const errore = modulo.querySelector('[data-modulo-errore]');
    modulo.addEventListener('submit', (e) => {
      e.preventDefault();
      const d = new FormData(modulo);
      const val = (k) => String(d.get(k) || '').trim();
      const obbligatori = ['nome', 'azienda', 'telefono'];
      let primoVuoto = null;
      obbligatori.forEach((k) => {
        const campo = modulo.elements[k];
        const vuoto = !val(k);
        campo.setAttribute('aria-invalid', vuoto ? 'true' : 'false');
        if (vuoto && !primoVuoto) primoVuoto = campo;
      });
      if (primoVuoto) { errore.hidden = false; primoVuoto.focus(); return; }
      errore.hidden = true;

      const reparti = d.getAll('reparti');
      const righe = [
        'Buongiorno,',
        'vorrei ricevere i vostri prezzi per la nostra azienda.',
        '',
        `Nome: ${val('nome')}`,
        `Azienda: ${val('azienda')}`,
        `Telefono: ${val('telefono')}`,
      ];
      if (val('email')) righe.push(`Email: ${val('email')}`);
      if (reparti.length) righe.push(`Ci servono: ${reparti.join(', ')}`);
      if (val('messaggio')) righe.push('', val('messaggio'));
      righe.push('', 'Grazie');
      const oggetto = `Richiesta prezzi dal sito – ${val('azienda')}`;
      location.href = `mailto:info@felkart.it?subject=${encodeURIComponent(oggetto)}&body=${encodeURIComponent(righe.join('\n'))}`;
    });
  }

  /* ---------- Anno ---------- */
  const anno = document.querySelector('[data-anno]');
  if (anno) anno.textContent = String(new Date().getFullYear());

  /* ---------- Timbro 3D: dopo il caricamento, solo se c'è WebGL ---------- */
  const scena = document.querySelector('[data-scena]');
  const canvas = document.querySelector('[data-timbro-canvas]');
  function statico() { scena.classList.add('statico'); }
  function avvia3D() {
    if (!scena || !canvas) return;
    let gl = null;
    try {
      const prova = document.createElement('canvas');
      gl = prova.getContext('webgl2') || prova.getContext('webgl');
    } catch (e) { gl = null; }
    if (!gl) return statico();
    const scadenza = setTimeout(() => { if (!scena.classList.contains('tre-d')) statico(); }, 9000);
    import('./3d.js')
      .then((m) => m.avvia({ canvas, scena, riduci }))
      .then(() => clearTimeout(scadenza))
      .catch(() => { clearTimeout(scadenza); statico(); });
  }
  if (document.readyState === 'complete') avvia3D();
  else addEventListener('load', avvia3D, { once: true });
})();
