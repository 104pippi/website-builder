/* Nol System — interazioni della pagina */
(() => {
  const html = document.documentElement;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const riduci = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- avvio dell'intro quando il font dei titoli è pronto (con paracadute) ---- */
  let partito = false;
  const parti = () => { if (partito) return; partito = true; html.classList.add('avvio'); };
  if (document.fonts && document.fonts.load) {
    Promise.race([
      document.fonts.load('900 100px Anybody').catch(() => {}),
      new Promise((ok) => setTimeout(ok, 900))
    ]).then(parti, parti);
  } else parti();
  setTimeout(parti, 1500);

  /* ---- testata piena dopo lo scroll ---- */
  const testata = $('#testata');
  const aggiornaTestata = () => testata.classList.toggle('piena', scrollY > 40);
  aggiornaTestata();

  /* ---- menu mobile ---- */
  const bottoneMenu = $('.testata__menu');
  const menu = $('#menu-mobile');
  const chiudiMenu = () => { menu.hidden = true; bottoneMenu.setAttribute('aria-expanded', 'false'); bottoneMenu.textContent = 'Menu'; document.body.style.overflow = ''; };
  bottoneMenu.addEventListener('click', () => {
    const apri = menu.hidden;
    if (!apri) return chiudiMenu();
    menu.hidden = false; bottoneMenu.setAttribute('aria-expanded', 'true'); bottoneMenu.textContent = 'Chiudi';
    document.body.style.overflow = 'hidden'; testata.classList.add('piena');
  });
  $$('a', menu).forEach((a) => a.addEventListener('click', chiudiMenu));
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) chiudiMenu(); });

  /* ---- reveal ---- */
  const rivela = $$('[data-rivela]');
  if ('IntersectionObserver' in window && !riduci) {
    const io = new IntersectionObserver((voci) => voci.forEach((v) => {
      if (v.isIntersecting) { v.target.classList.add('in'); io.unobserve(v.target); }
    }), { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    rivela.forEach((el) => io.observe(el));
  } else rivela.forEach((el) => el.classList.add('in'));

  /* ---- contatori della targhetta ---- */
  const migliaia = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const contatori = $$('[data-conta]');
  const conta = () => {
    const t0 = performance.now(), durata = 1600;
    const passo = () => {
      const k = Math.min(1, (performance.now() - t0) / durata);
      const e = 1 - Math.pow(1 - k, 4);
      contatori.forEach((el) => { el.textContent = migliaia(Math.round(+el.dataset.conta * e)); });
      if (k < 1) requestAnimationFrame(passo);
    };
    requestAnimationFrame(passo);
  };
  if (!riduci && 'IntersectionObserver' in window) {
    contatori.forEach((el) => { el.textContent = '0'; });
    const io = new IntersectionObserver((v) => { if (v[0].isIntersecting) { io.disconnect(); setTimeout(conta, 250); } }, { threshold: 0.4 });
    io.observe($('.targhetta'));
  }

  /* ---- righello del turno: dalle 6 alle 9 del giorno dopo ---- */
  const righello = $('#righello');
  [[0, '6:00'], [6, '12:00'], [12, '18:00'], [18, '0:00'], [24, '6:00'], [27, '9:00']].forEach(([i, t]) => {
    const s = document.createElement('span');
    s.textContent = t; s.style.left = (i / 27 * 100) + '%';
    if (i === 0) s.style.transform = 'none';
    if (i === 27) { s.style.transform = 'translateX(-100%)'; s.className = 'solo-largo'; }
    righello.appendChild(s);
  });
  const turno = $('.turno');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((v) => { if (v[0].isIntersecting) { turno.classList.add('in'); io.disconnect(); } }, { threshold: 0.6 });
    io.observe(turno);
  } else turno.classList.add('in');

  /* ---- modulo: precompila la famiglia dai bottoni ---- */
  const selCosa = $('#f-cosa');
  $$('[data-categoria]').forEach((a) => a.addEventListener('click', () => {
    const v = a.dataset.categoria;
    const opt = Array.from(selCosa.options).find((o) => o.value === v || o.text === v);
    if (opt) selCosa.value = opt.value || opt.text;
  }));

  /* ---- corner ---- */
  const SEDI = [
    { id: 'lambrate', nome: 'Milano Lambrate', via: 'Via G. Crespi 11, 20134 Milano', q: 'Via Giuseppe Crespi 11, 20134 Milano', lat: 45.489, lon: 9.243, x: 100, y: 251, lato: 'r' },
    { id: 'corvetto', nome: 'Milano Corvetto', via: 'Via C. Boncompagni 49, 20139 Milano', q: 'Via Carlo Boncompagni 49, 20139 Milano', lat: 45.437, lon: 9.222, x: 85, y: 303, lato: 'r' },
    { id: 'cusano', nome: 'Cusano Milanino', via: 'Via Caveto 1 bis, 20095 Cusano Milanino (MI)', q: 'Via Caveto 1, 20095 Cusano Milanino', lat: 45.553, lon: 9.188, x: 62, y: 187, lato: 'r' },
    { id: 'agrate', nome: 'Agrate Brianza', via: 'Via G. Matteotti 137, 20864 Agrate Brianza (MB)', q: 'Via Giacomo Matteotti 137, 20864 Agrate Brianza', lat: 45.567, lon: 9.356, x: 179, y: 173, lato: 'r', sede: true },
    { id: 'vimercate', nome: 'Vimercate', via: 'Via Trezzo 890, 20871 Vimercate (MB)', q: 'Via Trezzo 890, 20871 Vimercate', lat: 45.611, lon: 9.395, x: 206, y: 129, lato: 'r' },
    { id: 'cologno', nome: 'Cologno al Serio', via: 'Via del Casale, 24055 Cologno al Serio (BG)', q: 'Via del Casale, 24055 Cologno al Serio', lat: 45.580, lon: 9.694, x: 416, y: 160, lato: 'b' }
  ];
  const lista = $('#sedi'), punti = $('#punti'), iframe = $('#mappa-iframe'), esito = $('#esito');
  const NS = 'http://www.w3.org/2000/svg';
  const enc = encodeURIComponent;
  SEDI.forEach((s) => {
    const li = document.createElement('li');
    li.className = 'sedi__riga';
    li.innerHTML =
      `<button class="sede" type="button" aria-pressed="false" data-id="${s.id}">` +
      `<span class="sede__nome">${s.nome}${s.sede ? ' <small>sede</small>' : ''}</span>` +
      `<span class="sede__via">${s.via}</span></button>` +
      `<a class="sede__vai" href="https://www.google.com/maps/dir/?api=1&destination=${enc(s.q)}" target="_blank" rel="noopener" aria-label="Indicazioni per ${s.nome}">Indicazioni</a>`;
    lista.appendChild(li);

    const g = document.createElementNS(NS, 'g');
    g.setAttribute('class', 'punto'); g.setAttribute('data-id', s.id); g.setAttribute('tabindex', '0'); g.setAttribute('role', 'button');
    g.setAttribute('aria-label', `${s.nome}, ${s.via}`);
    const alone = document.createElementNS(NS, 'circle'); alone.setAttribute('class', 'alone'); alone.setAttribute('cx', s.x); alone.setAttribute('cy', s.y); alone.setAttribute('r', 8);
    const nucleo = document.createElementNS(NS, 'circle'); nucleo.setAttribute('class', 'nucleo'); nucleo.setAttribute('cx', s.x); nucleo.setAttribute('cy', s.y); nucleo.setAttribute('r', 6);
    const t = document.createElementNS(NS, 'text');
    const dx = s.lato === 'l' ? -12 : s.lato === 'b' ? 0 : 12;
    t.setAttribute('x', s.x + dx); t.setAttribute('y', s.lato === 'b' ? s.y + 24 : s.y + 4);
    t.setAttribute('text-anchor', s.lato === 'l' ? 'end' : s.lato === 'b' ? 'middle' : 'start');
    t.textContent = s.nome.replace('Milano ', '');
    g.append(alone, nucleo, t);
    punti.appendChild(g);
  });

  const scegli = (id, ricarica = true) => {
    const s = SEDI.find((x) => x.id === id); if (!s) return;
    $$('.sede', lista).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.id === id)));
    $$('.punto', punti).forEach((p) => p.classList.toggle('scelto', p.dataset.id === id));
    if (ricarica) iframe.src = `https://www.google.com/maps?q=${enc(s.q)}&output=embed`;
  };
  const suScelta = (e) => {
    if (e.target.closest('.sede__vai')) return;
    const el = e.target.closest('[data-id]'); if (el) scegli(el.dataset.id);
  };
  lista.addEventListener('click', suScelta);
  punti.addEventListener('click', suScelta);
  [punti].forEach((c) => c.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-id]')) { e.preventDefault(); scegli(e.target.dataset.id); }
  }));
  scegli('agrate', false);

  const distanza = (a, b, c, d) => {
    const R = 6371, r = Math.PI / 180;
    const x = Math.sin((c - a) * r / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin((d - b) * r / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(x));
  };
  $('#vicino').addEventListener('click', () => {
    if (!navigator.geolocation) { esito.textContent = 'Il tuo browser non condivide la posizione: chiama il centralino e ti indichiamo il corner più vicino.'; return; }
    esito.textContent = 'Cerco la tua posizione…';
    navigator.geolocation.getCurrentPosition((pos) => {
      const { latitude: la, longitude: lo } = pos.coords;
      const ord = SEDI.map((s) => ({ s, km: distanza(la, lo, s.lat, s.lon) })).sort((a, b) => a.km - b.km);
      const v = ord[0];
      scegli(v.s.id);
      esito.textContent = `Il più vicino è ${v.s.nome}, a circa ${Math.max(1, Math.round(v.km))} km in linea d'aria.`;
    }, () => {
      esito.textContent = 'Posizione non disponibile: chiama il 039 642 10655 e ti passiamo il corner più vicino.';
    }, { enableHighAccuracy: false, timeout: 9000, maximumAge: 600000 });
  });

  /* ---- modulo preventivo: compone l'email ---- */
  const modulo = $('#modulo'), errore = $('#errore'), ok = $('#ok');
  const dal = $('#f-dal');
  const oggi = new Date(); dal.min = oggi.toISOString().slice(0, 10);
  modulo.addEventListener('submit', (e) => {
    e.preventDefault();
    const nome = $('#f-nome'), tel = $('#f-tel'), privacy = $('#f-privacy');
    const mancano = [];
    [[selCosa, 'cosa ti serve'], [nome, 'nome'], [tel, 'telefono']].forEach(([el, n]) => {
      const vuoto = !el.value.trim();
      el.closest('.campo').classList.toggle('errato', vuoto);
      if (vuoto) mancano.push(n);
    });
    if (mancano.length || !privacy.checked) {
      errore.textContent = mancano.length ? `Manca: ${mancano.join(', ')}.` : 'Serve il consenso al trattamento dei dati per inviare la richiesta.';
      if (mancano.length && !privacy.checked) errore.textContent += ' Serve anche il consenso privacy.';
      errore.hidden = false; ok.hidden = true;
      (mancano.length ? modulo.querySelector('.errato select, .errato input') : privacy).focus();
      return;
    }
    errore.hidden = true;
    const d = dal.value ? new Date(dal.value + 'T12:00').toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' }) : 'da concordare';
    const righe = [
      'Buongiorno, vorrei un preventivo di noleggio.',
      '',
      `Cosa mi serve: ${selCosa.value}`,
      $('#f-mezzo').value.trim() ? `Mezzo o lavorazione: ${$('#f-mezzo').value.trim()}` : null,
      `Dal giorno: ${d}`,
      `Durata: ${$('#f-giorni').value}`,
      `Corner di ritiro: ${$('#f-corner').value}`,
      $('#f-note').value.trim() ? `Note: ${$('#f-note').value.trim()}` : null,
      '',
      `${nome.value.trim()}${$('#f-azienda').value.trim() ? ' - ' + $('#f-azienda').value.trim() : ''}`,
      `Tel. ${tel.value.trim()}`
    ].filter((r) => r !== null);
    const oggetto = `Richiesta noleggio: ${selCosa.value}`;
    const url = `mailto:info@nolsystem.com?subject=${enc(oggetto)}&body=${enc(righe.join('\n'))}`;
    (window.__apriEmail || ((u) => { location.href = u; }))(url);
    ok.hidden = false;
  });
  modulo.addEventListener('input', (e) => { const c = e.target.closest('.campo'); if (c && e.target.value) c.classList.remove('errato'); });

  /* barra in basso fuori dai piedi mentre si scrive nel modulo (tastiera aperta) */
  const barra = $('.barra-cta');
  modulo.addEventListener('focusin', () => barra.classList.add('nascosta'));
  modulo.addEventListener('focusout', () => setTimeout(() => { if (!modulo.contains(document.activeElement)) barra.classList.remove('nascosta'); }, 50));

  /* ---- privacy ---- */
  const dlg = $('#privacy');
  $$('[data-apri-privacy]').forEach((a) => a.addEventListener('click', (e) => {
    if (dlg && dlg.showModal) { e.preventDefault(); dlg.showModal(); }
  }));
  $('#anno').textContent = new Date().getFullYear();

  /* ---- dal banco al cantiere: fasi del testo e caricamento della scena 3D ---- */
  const collaudo = $('#collaudo'), fasi = $$('.fase'), barra3d = $('#barra3d');
  let faseAttuale = 0;
  const progresso = () => {
    const r = collaudo.getBoundingClientRect();
    const corsa = r.height - innerHeight;
    return Math.min(1, Math.max(0, -r.top / (corsa > 0 ? corsa : 1)));
  };
  const aggiornaFasi = () => {
    const p = progresso();
    const f = p < 0.36 ? 0 : p < 0.64 ? 1 : 2;
    if (f !== faseAttuale) { faseAttuale = f; fasi.forEach((el, i) => el.classList.toggle('attiva', i === f)); }
    barra3d.style.transform = `scaleX(${p.toFixed(4)})`;
  };
  window.__nolProgresso = progresso;

  let carico = false;
  const carica3d = () => {
    if (carico) return; carico = true;
    const c = document.createElement('canvas').getContext('webgl2') || document.createElement('canvas').getContext('webgl');
    if (!c) return;
    import('./3d.js').then((m) => m.avvia($('#scena3d'), { riduci })).catch((err) => console.warn('3D non disponibile', err));
  };
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((v) => { if (v[0].isIntersecting) { io.disconnect(); carica3d(); } }, { rootMargin: '120% 0px 120% 0px' });
    io.observe(collaudo);
  }
  addEventListener('load', () => setTimeout(carica3d, 2600));

  /* ---- scroll unico ---- */
  let inCoda = false;
  const suScroll = () => {
    if (inCoda) return; inCoda = true;
    requestAnimationFrame(() => { inCoda = false; aggiornaTestata(); aggiornaFasi(); });
  };
  addEventListener('scroll', suScroll, { passive: true });
  addEventListener('resize', suScroll);
  aggiornaFasi();
})();
