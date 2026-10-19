/* Bertoncello Gomme: menu, intro, ruota, sedi, modulo */
(() => {
  const html = document.documentElement;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const ridotto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Intro: parte quando la foto hero è pronta (al massimo dopo 1,2 s) ---------- */
  const fotoHero = $('.hero__foto img');
  let partito = false;
  const parti = () => { if (partito) return; partito = true; html.classList.add('pronto'); };
  if (fotoHero && fotoHero.complete) parti();
  else if (fotoHero) { fotoHero.addEventListener('load', parti, { once: true }); fotoHero.addEventListener('error', parti, { once: true }); }
  setTimeout(parti, 1200);

  /* ---------- Testata ---------- */
  const testata = $('[data-testata]');
  const aggiornaTestata = () => testata.classList.toggle('solida', window.scrollY > 40);
  aggiornaTestata();

  const burger = $('[data-burger]');
  const menuMobile = $('[data-menu-mobile]');
  const chiudiMenu = () => { menuMobile.hidden = true; burger.setAttribute('aria-expanded', 'false'); };
  burger.addEventListener('click', () => {
    const apri = menuMobile.hidden;
    menuMobile.hidden = !apri;
    burger.setAttribute('aria-expanded', String(apri));
    if (apri) testata.classList.add('solida'); else aggiornaTestata();
  });
  $$('a', menuMobile).forEach(a => a.addEventListener('click', chiudiMenu));

  /* ---------- Foglio "quale sede chiami?" ---------- */
  const foglio = $('[data-foglio]');
  $$('[data-apri-chiama]').forEach(b => b.addEventListener('click', () => { foglio.hidden = false; $('.foglio__sede', foglio).focus(); }));
  $$('[data-chiudi-chiama]', foglio).forEach(b => b.addEventListener('click', () => { foglio.hidden = true; }));
  $$('.foglio__sede', foglio).forEach(a => a.addEventListener('click', () => { setTimeout(() => { foglio.hidden = true; }, 300); }));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { foglio.hidden = true; chiudiMenu(); } });

  /* ---------- Stagione: il messaggio cambia con il calendario ---------- */
  const stagione = $('[data-stagione]');
  if (stagione) {
    const d = new Date(); const m = d.getMonth() + 1; const g = d.getDate();
    const giorno = m * 100 + g;
    let testo;
    if (giorno >= 1001 && giorno <= 1130) testo = 'Dal 15 novembre servono gomme invernali su molte strade: prenota il cambio.';
    else if (giorno >= 1201 || giorno <= 228) testo = 'Inverno: controlla pressione e usura delle gomme prima dei viaggi.';
    else if (giorno >= 301 && giorno <= 515) testo = 'Dal 15 aprile si torna alle gomme estive: prenota il cambio.';
    else testo = 'Prima delle vacanze fai controllare gomme e assetto.';
    stagione.textContent = testo;
  }

  /* ---------- Saracinesche sulle foto ---------- */
  const serrande = $$('[data-serranda]');
  if ('IntersectionObserver' in window && !ridotto) {
    const io = new IntersectionObserver(voci => {
      voci.forEach(v => { if (v.isIntersecting) { v.target.classList.add('in'); io.unobserve(v.target); } });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.01 });
    serrande.forEach(f => io.observe(f));
  } else serrande.forEach(f => f.classList.add('in'));

  /* ---------- Ruota: fasi del racconto legate allo scroll ---------- */
  const ruota = $('[data-ruota]');
  const pista = $('[data-pista]');
  const palco = $('[data-palco]');
  const barra = $('.ruota__barra span');
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const progresso = () => {
    const r = pista.getBoundingClientRect();
    const corsa = r.height - window.innerHeight;
    return corsa > 0 ? clamp(-r.top / corsa) : 0;
  };
  window.__ruotaProgresso = progresso;
  const fase = p => {
    if (p < 0.075) return 'intro';
    if (p >= 0.915) return 'fine';
    return String(Math.min(5, 1 + Math.floor((p - 0.075) / 0.168)));
  };
  let ultimaFase = '';
  const aggiornaRuota = () => {
    if (ruota.classList.contains('statica')) return;
    const p = progresso();
    const f = fase(p);
    if (f !== ultimaFase) { palco.dataset.fase = f; ultimaFase = f; }
    barra.style.setProperty('--p', p.toFixed(4));
  };

  const webgl = (() => {
    try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; }
  })();
  if (ridotto || !webgl) {
    ruota.classList.add('statica');
  } else {
    aggiornaRuota();
    let caricato = false;
    const carica = () => {
      if (caricato) return; caricato = true;
      import('./3d.js')
        .then(m => m.avvia({ ruota, pista, palco, scena: $('[data-scena]'), progresso }))
        .catch(err => { console.warn('Ruota 3D non disponibile:', err); });
    };
    const ioRuota = new IntersectionObserver(v => { if (v.some(x => x.isIntersecting)) { carica(); ioRuota.disconnect(); } }, { rootMargin: '120% 0px' });
    ioRuota.observe(ruota);
    window.addEventListener('load', () => setTimeout(carica, 300), { once: true });
  }

  /* ---------- Scroll: un solo aggiornamento per fotogramma ---------- */
  let inAttesa = false;
  window.addEventListener('scroll', () => {
    if (inAttesa) return; inAttesa = true;
    requestAnimationFrame(() => { inAttesa = false; aggiornaTestata(); aggiornaRuota(); });
  }, { passive: true });
  window.addEventListener('resize', aggiornaRuota);

  /* ---------- Sedi: aperto adesso? (ora italiana) ---------- */
  const oraRoma = () => {
    const parti = new Intl.DateTimeFormat('it-IT', { timeZone: 'Europe/Rome', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
    const v = t => parti.find(x => x.type === t)?.value;
    const giorni = { dom: 0, lun: 1, mar: 2, mer: 3, gio: 4, ven: 5, sab: 6 };
    return { g: giorni[(v('weekday') || '').slice(0, 3).toLowerCase()] ?? new Date().getDay(), min: +v('hour') * 60 + +v('minute') };
  };
  const turni = g => (g >= 1 && g <= 5) ? [[480, 720], [870, 1110]] : g === 6 ? [[480, 720]] : [];
  const hhmm = m => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
  const nomiGiorno = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
  const statoApertura = () => {
    const { g, min } = oraRoma();
    const aperto = turni(g).find(([a, c]) => min >= a && min < c);
    if (aperto) return { aperto: true, testo: `Aperto adesso, chiude alle ${hhmm(aperto[1])}` };
    const dopo = turni(g).find(([a]) => min < a);
    if (dopo) return { aperto: false, testo: `Chiuso, riapre oggi alle ${hhmm(dopo[0])}` };
    for (let i = 1; i <= 7; i++) {
      const gg = (g + i) % 7; const t = turni(gg);
      if (t.length) return { aperto: false, testo: `Chiuso, riapre ${i === 1 ? 'domani' : nomiGiorno[gg]} alle ${hhmm(t[0][0])}` };
    }
    return { aperto: false, testo: '' };
  };
  try {
    const s = statoApertura();
    $$('[data-stato]').forEach(el => { el.textContent = s.testo; el.classList.toggle('aperto', s.aperto); });
    const { g } = oraRoma();
    $$('.orari tr').forEach(tr => {
      const [a, b] = tr.dataset.giorni.split('-').map(Number);
      if (g >= a && g <= (b ?? a)) tr.classList.add('oggi');
    });
  } catch (e) { /* senza Intl resta la tabella */ }

  /* ---------- Mappa: San Martino o Asolo ---------- */
  const iframe = $('[data-iframe-mappa]');
  $$('[data-mappa]').forEach(b => b.addEventListener('click', () => {
    $$('[data-mappa]').forEach(x => x.setAttribute('aria-selected', String(x === b)));
    iframe.src = 'https://www.google.com/maps?q=' + encodeURIComponent(b.dataset.mappa) + '&output=embed';
  }));

  /* ---------- Servizio preselezionato dai bottoni ---------- */
  $$('[data-servizio]').forEach(a => a.addEventListener('click', () => {
    const sel = $('#f-servizio');
    const opz = [...sel.options].find(o => o.text === a.dataset.servizio);
    if (opz) sel.value = opz.value;
  }));

  /* ---------- Modulo: compone l'email ---------- */
  const modulo = $('[data-modulo]');
  modulo.addEventListener('submit', e => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(modulo));
    const errore = $('[data-errore]', modulo);
    if (!d.nome.trim() || !d.telefono.trim()) { errore.hidden = false; (!d.nome.trim() ? $('#f-nome') : $('#f-tel')).focus(); return; }
    errore.hidden = true;
    const righe = [
      'Buongiorno,',
      `vorrei prenotare: ${d.servizio}.`,
      '',
      `Sede: ${d.sede}`,
      `Quando: ${d.quando}`,
      d.misura.trim() ? `Auto e misura gomme: ${d.misura.trim()}` : '',
      d.note.trim() ? `Note: ${d.note.trim()}` : '',
      '',
      `${d.nome.trim()}`,
      `Telefono: ${d.telefono.trim()}`
    ].filter((r, i, a) => r !== '' || (a[i - 1] !== '' && i > 0));
    const oggetto = `Richiesta appuntamento: ${d.servizio} (${d.sede})`;
    window.location.href = `mailto:info@bertoncellogomme.it?subject=${encodeURIComponent(oggetto)}&body=${encodeURIComponent(righe.join('\n'))}`;
    $('[data-info]', modulo).textContent = 'Fatto: controlla la tua app di posta e premi Invia. Se non si è aperta, chiamaci.';
  });

  /* ---------- Anno ---------- */
  $$('[data-anno]').forEach(el => { el.textContent = new Date().getFullYear(); });
})();
