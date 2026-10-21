(() => {
  const doc = document.documentElement;
  const ridotto = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- intro ---------- */
  const avvia = () => doc.classList.add('avvio');
  if (document.fonts && document.fonts.load) {
    Promise.race([
      document.fonts.load('650 100px Archivo').catch(() => {}),
      new Promise((r) => setTimeout(r, 900)),
    ]).then(avvia);
  } else avvia();
  setTimeout(avvia, 1500);

  /* ---------- testata e barra mobile ---------- */
  const testata = document.getElementById('testata');
  const barra = document.querySelector('.barra');
  const heroCta = document.getElementById('hero-cta');
  const aggiornaTestata = () => testata.classList.toggle('solida', scrollY > 40);
  aggiornaTestata();
  addEventListener('scroll', aggiornaTestata, { passive: true });

  if ('IntersectionObserver' in window && heroCta) {
    new IntersectionObserver(([v]) => {
      barra.classList.toggle('visibile', !v.isIntersecting && v.boundingClientRect.top < 0);
    }).observe(heroCta);
  } else barra.classList.add('visibile');

  /* ---------- menu mobile ---------- */
  const burger = document.querySelector('.burger');
  const menu = document.getElementById('menu');
  const chiudiMenu = () => { menu.hidden = true; burger.setAttribute('aria-expanded', 'false'); burger.textContent = 'Menu'; };
  burger.addEventListener('click', () => {
    const apri = menu.hidden;
    menu.hidden = !apri;
    burger.setAttribute('aria-expanded', String(apri));
    burger.textContent = apri ? 'Chiudi' : 'Menu';
    if (apri) testata.classList.add('solida'); else aggiornaTestata();
  });
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) chiudiMenu(); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) chiudiMenu(); });

  /* ---------- reveal e contatori ---------- */
  const punti = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const conta = (box) => {
    const numeri = [...box.querySelectorAll('[data-conta]')];
    if (ridotto) return;
    const t0 = performance.now();
    const passo = () => {
      const k = Math.min(1, (performance.now() - t0) / 1700);
      const e = 1 - Math.pow(1 - k, 4);
      numeri.forEach((b) => { b.textContent = punti(Math.round(+b.dataset.conta * e)); });
      if (k < 1) requestAnimationFrame(passo);
    };
    numeri.forEach((b) => { b.textContent = '0'; });
    requestAnimationFrame(passo);
  };
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((voci) => {
      voci.forEach((v) => {
        if (!v.isIntersecting) return;
        v.target.classList.add('in');
        if (v.target.classList.contains('registro')) conta(v.target);
        io.unobserve(v.target);
      });
    }, { rootMargin: '0px 0px -12% 0px' });
    document.querySelectorAll('[data-rivela], .galileo, .registro').forEach((el) => io.observe(el));
  } else {
    document.querySelectorAll('[data-rivela], .galileo').forEach((el) => el.classList.add('in'));
  }

  /* ---------- traccia del segnale nell'hero ---------- */
  const tela = document.querySelector('.hero__traccia');
  if (tela && tela.getContext) {
    const ctx = tela.getContext('2d');
    const FREQ = 90;
    let w = 0, h = 0, dpr = 1, energia = 0, ultimoY = scrollY, ultimoT = performance.now();
    let attiva = true, indice = -1;
    const campioni = [];
    const misura = () => {
      dpr = Math.min(devicePixelRatio || 1, 2);
      w = tela.clientWidth; h = tela.clientHeight;
      tela.width = Math.round(w * dpr); tela.height = Math.round(h * dpr);
    };
    misura();
    addEventListener('resize', misura);
    addEventListener('scroll', () => {
      energia = Math.min(1.3, energia + Math.abs(scrollY - ultimoY) * 0.004);
      ultimoY = scrollY;
    }, { passive: true });
    const segnale = (t, e) => {
      const ciclo = (t % 3.4) / 3.4;
      const camion = Math.exp(-Math.pow((ciclo - 0.35) * 14, 2)) * 0.9;
      const a = 0.16 + camion + e;
      return a * (0.55 * Math.sin(6.283 * 1.7 * t) + 0.3 * Math.sin(6.283 * 4.3 * t + 1) + 0.15 * Math.sin(6.283 * 11.1 * t + 2))
        + 0.05 * Math.sin(6.283 * 0.37 * t);
    };
    const disegna = () => {
      if (!attiva) return;
      const ora = performance.now();
      const dt = Math.min(0.1, (ora - ultimoT) / 1000);
      ultimoT = ora;
      energia *= Math.exp(-dt * 2.2);
      const t = ora / 1000;
      const fino = Math.floor(t * FREQ);
      if (indice < 0) indice = fino - 400;
      for (let i = Math.max(indice + 1, fino - 400); i <= fino; i++) campioni.push(segnale(i / FREQ, energia));
      indice = fino;
      while (campioni.length > 400) campioni.shift();

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const passo = w > 900 ? 3.2 : 2.4;
      const n = Math.min(campioni.length, Math.ceil(w / passo) + 1);
      const mezzo = h * 0.55, scala = h * 0.34;
      ctx.beginPath();
      for (let k = 0; k < n; k++) {
        const v = campioni[campioni.length - n + k];
        const x = w - (n - 1 - k) * passo;
        const y = mezzo - v * scala;
        k ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      const grad = ctx.createLinearGradient(0, 0, w, 0);
      grad.addColorStop(0, 'rgba(164,193,203,0)');
      grad.addColorStop(0.35, 'rgba(164,193,203,.35)');
      grad.addColorStop(1, 'rgba(164,193,203,.9)');
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.4;
      ctx.lineJoin = 'round';
      ctx.stroke();
      const ult = campioni[campioni.length - 1] || 0;
      ctx.fillStyle = '#DCEAF0';
      ctx.beginPath(); ctx.arc(w - 1.5, mezzo - ult * scala, 2.6, 0, 6.283); ctx.fill();
      if (!ridotto) requestAnimationFrame(disegna);
    };
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([v]) => {
        const prima = attiva;
        attiva = v.isIntersecting && !document.hidden;
        if (attiva && !prima) { ultimoT = performance.now(); requestAnimationFrame(disegna); }
      }).observe(tela);
    }
    document.addEventListener('visibilitychange', () => {
      const prima = attiva;
      attiva = !document.hidden && tela.getBoundingClientRect().bottom > 0;
      if (attiva && !prima) { ultimoT = performance.now(); requestAnimationFrame(disegna); }
    });
    requestAnimationFrame(disegna);
  }

  /* ---------- bosforo: passi guidati dallo scroll ---------- */
  const pista = document.getElementById('bosforo-pista');
  const palco = pista && pista.querySelector('.bosforo__palco');
  const passi = palco ? [...palco.querySelectorAll('.passo')] : [];
  const barraP = palco && palco.querySelector('.bosforo__barra');
  let passoAttivo = -1;
  const progresso = () => {
    const r = pista.getBoundingClientRect();
    const corsa = r.height - innerHeight;
    return corsa > 0 ? Math.min(1, Math.max(0, -r.top / corsa)) : 0;
  };
  const aggiornaPassi = () => {
    const p = progresso();
    const n = Math.min(3, Math.floor(p * 3 + 0.5));
    barraP.style.setProperty('--p', p.toFixed(4));
    if (n !== passoAttivo) {
      passoAttivo = n;
      palco.dataset.passo = String(n);
      passi.forEach((el, i) => el.classList.toggle('attivo', i === n));
    }
  };
  if (pista) {
    let inCoda = false;
    addEventListener('scroll', () => {
      if (inCoda) return;
      inCoda = true;
      requestAnimationFrame(() => { inCoda = false; aggiornaPassi(); });
    }, { passive: true });
    addEventListener('resize', aggiornaPassi);
    aggiornaPassi();

    const haWebGL = (() => {
      try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); }
      catch (e) { return false; }
    })();
    let caricato = false;
    const carica = () => {
      if (caricato || !haWebGL) return;
      caricato = true;
      import('./3d.js')
        .then((m) => m.avvia({ pista, palco, ridotto }))
        .catch((e) => console.warn('Scena 3D non disponibile', e));
    };
    if ('IntersectionObserver' in window) {
      const io3d = new IntersectionObserver(([v]) => { if (v.isIntersecting) { carica(); io3d.disconnect(); } }, { rootMargin: '150% 0px' });
      io3d.observe(pista);
    } else carica();
    addEventListener('load', () => setTimeout(carica, 2500));
  }

  /* ---------- lavori: filtri ---------- */
  const griglia = document.querySelector('.griglia-lavori');
  const schede = [...document.querySelectorAll('.lavoro')];
  const testiSettore = [...document.querySelectorAll('.settore')];
  document.querySelectorAll('.filtri button').forEach((b, _, tutti) => {
    b.addEventListener('click', () => {
      const f = b.dataset.filtro;
      tutti.forEach((x) => x.setAttribute('aria-selected', String(x === b)));
      schede.forEach((s) => { s.hidden = f !== 'tutti' && s.dataset.settore !== f; });
      testiSettore.forEach((t) => { t.hidden = t.dataset.settore !== f; });
      griglia.classList.toggle('filtrata', f !== 'tutti');
    });
  });

  /* ---------- scheda progetto ---------- */
  const dlg = document.getElementById('scheda');
  const nomeSettore = {
    'grandi-opere': 'Gallerie e grandi opere', ponti: 'Ponti',
    civile: 'Edilizia civile e industriale', storica: 'Edilizia storica',
  };
  let rif = '';
  const apriScheda = (art) => {
    const tpl = art.querySelector('template').content;
    rif = art.querySelector('.lavoro__titolo').textContent;
    dlg.querySelector('.scheda__settore').textContent = nomeSettore[art.dataset.settore] || '';
    dlg.querySelector('#scheda-titolo').textContent = rif;
    dlg.querySelector('.scheda__foto').replaceChildren(...tpl.querySelector('[data-galleria]').cloneNode(true).children);
    dlg.querySelector('.scheda__dati').replaceChildren(...tpl.querySelector('[data-dati]').cloneNode(true).children);
    dlg.querySelector('.scheda__corpo').replaceChildren(...tpl.querySelector('[data-corpo]').cloneNode(true).children);
    dlg.querySelector('.scheda__in').scrollTop = 0;
    dlg.querySelector('.scheda__foto').scrollLeft = 0;
    if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
    document.body.style.overflow = 'hidden';
  };
  const chiudiScheda = () => { if (dlg.open) dlg.close(); };
  dlg.addEventListener('close', () => { document.body.style.overflow = ''; });
  schede.forEach((art) => art.querySelector('.lavoro__apri').addEventListener('click', () => apriScheda(art)));
  dlg.querySelector('.scheda__chiudi').addEventListener('click', chiudiScheda);
  dlg.addEventListener('click', (e) => { if (e.target === dlg) chiudiScheda(); });
  dlg.querySelector('[data-rif]').addEventListener('click', (e) => {
    e.preventDefault();
    chiudiScheda();
    const msg = modulo.querySelector('[name="messaggio"]');
    if (!msg.value.includes(rif)) msg.value = `Opera simile a: ${rif}. ` + msg.value;
    document.getElementById('contatti').scrollIntoView({ behavior: ridotto ? 'auto' : 'smooth' });
    setTimeout(() => modulo.querySelector('[name="nome"]').focus({ preventScroll: true }), 700);
  });

  /* ---------- modulo preventivo ---------- */
  const modulo = document.getElementById('modulo');
  const errore = modulo.querySelector('.modulo__errore');
  modulo.addEventListener('submit', (e) => {
    e.preventDefault();
    const d = new FormData(modulo);
    const nome = (d.get('nome') || '').trim();
    const email = (d.get('email') || '').trim();
    if (!nome || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      errore.textContent = !nome ? 'Scrivete nome e cognome per inviare la richiesta.' : 'Controllate l\'email: serve per rispondervi.';
      errore.hidden = false;
      modulo.querySelector(!nome ? '[name="nome"]' : '[name="email"]').focus();
      return;
    }
    errore.hidden = true;
    const azienda = (d.get('azienda') || '').trim();
    const opera = d.get('opera') || '';
    const servizi = d.getAll('servizio');
    const righe = [
      'Buongiorno, vorrei un preventivo.',
      '',
      `Nome: ${nome}`,
      azienda ? `Azienda o ente: ${azienda}` : null,
      `Email: ${email}`,
      d.get('telefono') ? `Telefono: ${d.get('telefono')}` : null,
      opera ? `Opera: ${opera}` : null,
      servizi.length ? `Servizi: ${servizi.join(', ')}` : null,
      '',
      (d.get('messaggio') || '').trim(),
    ].filter((r) => r !== null);
    const oggetto = `Richiesta preventivo${opera ? ' - ' + opera : ''}${azienda ? ' - ' + azienda : ''}`;
    location.href = `mailto:info@akronservizi.it?subject=${encodeURIComponent(oggetto)}&body=${encodeURIComponent(righe.join('\n'))}`;
  });

  document.getElementById('anno').textContent = new Date().getFullYear();
})();
