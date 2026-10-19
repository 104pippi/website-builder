(() => {
  const doc = document.documentElement;
  const ridotto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const WA = '393406084580';
  const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
  const ora = new Date();
  const m = ora.getMonth();
  const Mese = MESI[m].charAt(0).toUpperCase() + MESI[m].slice(1);
  const stagione = doc.dataset.stagione === 'clima' ? 'clima' : 'caldaia';

  document.getElementById('anno').textContent = ora.getFullYear();

  /* ---------- stagione: testi, foto e servizio proposto ---------- */
  const testoChip = m === 8 || m === 9 ? `<strong>${Mese}:</strong> il riscaldamento si riaccende. È il momento del controllo caldaia.`
    : m >= 10 || m <= 2 ? `<strong>${Mese}:</strong> la caldaia lavora a pieno ritmo. Se non l'hai ancora fatta controllare, è il momento.`
    : m <= 4 ? `<strong>${Mese}:</strong> prima del caldo, fai pulire e sanificare il climatizzatore.`
    : `<strong>${Mese}:</strong> il climatizzatore lavora a pieno ritmo. Filtri puliti vuol dire aria più sana.`;
  const testoOra = m === 8 || m === 9 ? `Siamo a ${MESI[m]}: è la finestra giusta per il controllo caldaia, prima che arrivi il freddo.`
    : m >= 10 || m <= 2 ? `Siamo a ${MESI[m]}, in piena stagione del riscaldamento: se la caldaia non è ancora stata controllata, prenota adesso.`
    : m <= 4 ? `Siamo a ${MESI[m]}: è il momento di preparare il climatizzatore all'estate.`
    : `Siamo a ${MESI[m]}: se il climatizzatore non è stato pulito, fallo adesso. A settembre tocca alla caldaia.`;
  const chip = document.querySelector('[data-testo-stagione]');
  if (chip) chip.innerHTML = testoChip;
  const frase = document.querySelector('[data-testo-ora]');
  if (frase) frase.textContent = testoOra;

  if (stagione === 'clima') {
    document.querySelectorAll('.hero__foto source, .hero__foto img').forEach((el) => {
      if (el.tagName === 'SOURCE') el.srcset = el.dataset.clima; else { el.src = el.dataset.clima; el.alt = el.dataset.altClima; }
    });
    const chiFoto = document.querySelector('.chi__foto img');
    if (chiFoto) { chiFoto.src = chiFoto.dataset.clima; chiFoto.alt = 'Tecnico AD Service al lavoro su una caldaia murale'; }
    document.querySelectorAll('[data-cta-stagione]').forEach((a) => { a.textContent = 'Prenota il controllo clima'; });
    const r = document.querySelector('input[name="servizio"][value="Manutenzione climatizzatore"]');
    if (r) r.checked = true;
  }

  /* calendario: segno di oggi */
  const segno = document.getElementById('oggi');
  if (segno) {
    const inizio = new Date(ora.getFullYear(), 0, 1);
    const giorni = (new Date(ora.getFullYear() + 1, 0, 1) - inizio) / 864e5;
    segno.style.left = (((ora - inizio) / 864e5) / giorni * 100).toFixed(2) + '%';
  }

  /* ---------- testata, barra mobile, parallasse hero ---------- */
  const testata = document.getElementById('testata');
  const barra = document.getElementById('barra');
  const hero = document.querySelector('.hero');
  const dentro = document.getElementById('manutenzione');
  const binario = document.getElementById('binario');
  const passi = [...document.querySelectorAll('#passi li')];
  let passoAttivo = 0;

  const progresso = () => {
    const r = binario.getBoundingClientRect();
    const corsa = r.height - innerHeight;
    return corsa > 0 ? Math.min(1, Math.max(0, -r.top / corsa)) : 0;
  };
  window.ADcaldaia = { progresso };

  let inCoda = false;
  const aggiorna = () => {
    inCoda = false;
    const y = scrollY;
    const hh = hero.offsetHeight;
    testata.classList.toggle('sotto', y > 40);
    barra.classList.toggle('visibile', y > hh * 0.6 && !document.body.classList.contains('menu-aperto'));
    if (!ridotto && y < hh * 1.2) hero.style.setProperty('--hp', Math.min(1, y / hh).toFixed(4));

    const p = progresso();
    dentro.style.setProperty('--p', p.toFixed(4));
    const n = p < 0.26 ? 1 : p < 0.44 ? 2 : p < 0.62 ? 3 : p < 0.80 ? 4 : 5;
    if (n !== passoAttivo) {
      passoAttivo = n;
      passi.forEach((li, i) => li.classList.toggle('attivo', i === n - 1));
    }
  };
  const chiedi = () => { if (!inCoda) { inCoda = true; requestAnimationFrame(aggiorna); } };
  addEventListener('scroll', chiedi, { passive: true });
  addEventListener('resize', chiedi);
  aggiorna();

  /* ---------- menu mobile ---------- */
  const burger = document.querySelector('.testata__burger');
  const menu = document.getElementById('menu-mobile');
  const chiudiMenu = () => {
    menu.hidden = true; menu.classList.remove('aperto');
    document.body.classList.remove('menu-aperto');
    burger.setAttribute('aria-expanded', 'false'); burger.setAttribute('aria-label', 'Apri il menu');
    chiedi();
  };
  burger.addEventListener('click', () => {
    if (!menu.hidden) return chiudiMenu();
    menu.hidden = false; requestAnimationFrame(() => menu.classList.add('aperto'));
    document.body.classList.add('menu-aperto');
    burger.setAttribute('aria-expanded', 'true'); burger.setAttribute('aria-label', 'Chiudi il menu');
    chiedi();
  });
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) chiudiMenu(); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) chiudiMenu(); });

  /* ancore con scorrimento morbido (niente scroll-behavior globale) */
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href');
    const t = id.length > 1 && document.querySelector(id);
    if (!t) return;
    e.preventDefault();
    t.scrollIntoView({ behavior: ridotto ? 'auto' : 'smooth', block: 'start' });
    history.replaceState(null, '', id);
  });

  /* ---------- reveal ---------- */
  const rivela = document.querySelectorAll('[data-rivela]');
  if ('IntersectionObserver' in window && !ridotto) {
    const io = new IntersectionObserver((voci) => {
      voci.forEach((v) => { if (v.isIntersecting) { v.target.classList.add('in'); io.unobserve(v.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    rivela.forEach((el) => io.observe(el));
  } else {
    rivela.forEach((el) => el.classList.add('in'));
  }

  /* ---------- caldaia 3D: si carica dopo la pagina o quando la sezione si avvicina ---------- */
  let caricata = false;
  const carica3d = () => {
    if (caricata) return;
    caricata = true;
    import('./3d.js').then((mod) => mod.avvia()).catch(() => {});
  };
  if ('IntersectionObserver' in window) {
    const vicino = new IntersectionObserver((v) => { if (v[0].isIntersecting) { carica3d(); vicino.disconnect(); } }, { rootMargin: '120% 0px' });
    vicino.observe(dentro);
  }
  addEventListener('load', () => setTimeout(carica3d, 1200));

  /* ---------- modulo: compone il messaggio e apre WhatsApp ---------- */
  const modulo = document.getElementById('modulo');
  const errore = document.getElementById('errore');
  const leggi = () => {
    const d = new FormData(modulo);
    const v = (k) => (d.get(k) || '').toString().trim();
    return { servizio: v('servizio'), per: v('per'), nome: v('nome'), comune: v('comune'), telefono: v('telefono'), note: v('note') };
  };
  const messaggio = (f) => [
    `Ciao AD Service, vorrei prenotare: ${f.servizio}.`,
    `Per: ${f.per === 'azienda' ? 'azienda' : 'casa'}`,
    f.nome && `Nome: ${f.nome}`,
    f.comune && `Comune: ${f.comune}`,
    f.telefono && `Telefono: ${f.telefono}`,
    f.note && `Note: ${f.note}`,
  ].filter(Boolean).join('\n');

  modulo.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = leggi();
    const mancano = [];
    [['nome', f.nome.length >= 2], ['comune', f.comune.length >= 2], ['telefono', f.telefono.replace(/\D/g, '').length >= 6]].forEach(([k, ok]) => {
      modulo.elements[k].setAttribute('aria-invalid', ok ? 'false' : 'true');
      if (!ok) mancano.push(k);
    });
    if (mancano.length) {
      errore.textContent = 'Completa ' + mancano.map((k) => ({ nome: 'nome e cognome', comune: 'comune', telefono: 'telefono' })[k]).join(', ') + ' per inviare la richiesta.';
      errore.hidden = false;
      modulo.elements[mancano[0]].focus();
      return;
    }
    errore.hidden = true;
    const url = `https://wa.me/${WA}?text=${encodeURIComponent(messaggio(f))}`;
    const w = window.open(url, '_blank', 'noopener');
    if (!w) location.href = url;
  });
  modulo.addEventListener('input', (e) => { if (e.target.getAttribute('aria-invalid') === 'true') e.target.setAttribute('aria-invalid', 'false'); });

  document.getElementById('via-email').addEventListener('click', (e) => {
    const f = leggi();
    e.currentTarget.href = `mailto:assistenza@ad-servicesrl.it?subject=${encodeURIComponent('Richiesta: ' + f.servizio)}&body=${encodeURIComponent(messaggio(f))}`;
  });
})();
