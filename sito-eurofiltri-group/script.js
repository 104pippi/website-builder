(() => {
  const doc = document.documentElement;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const ridotto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

  /* Intro: parte quando il font è pronto, o comunque dopo poco */
  let avviato = false;
  const avvia = () => { if (avviato) return; avviato = true; doc.classList.add('avvio'); setTimeout(() => $('.barra-cta')?.classList.add('vista'), 900); };
  const font = document.fonts ? document.fonts.load('700 100px Archivo').catch(() => {}) : Promise.resolve();
  Promise.race([font, new Promise(r => setTimeout(r, 700))]).then(() => requestAnimationFrame(avvia));
  setTimeout(avvia, 1500);

  /* Menu mobile */
  const burger = $('.burger');
  const menu = $('#menu-mobile');
  const chiudiMenu = () => { menu.hidden = true; burger.setAttribute('aria-expanded', 'false'); document.body.classList.remove('menu-aperto'); };
  burger?.addEventListener('click', () => {
    const apri = menu.hidden;
    menu.hidden = !apri;
    burger.setAttribute('aria-expanded', String(apri));
    document.body.classList.toggle('menu-aperto', apri);
  });
  $$('a', menu).forEach(a => a.addEventListener('click', chiudiMenu));
  addEventListener('keydown', e => { if (e.key === 'Escape' && !menu.hidden) { chiudiMenu(); burger.focus(); } });

  /* Scroll: testata, hero, plissé, scala, parallasse */
  const testata = $('#testata');
  const hero = $('.hero');
  const plisse = $('[data-plisse]');
  const fogli = $('.plisse__fogli');
  const scala = $('.scala');
  const parallasse = $$('.famiglia__vista img, .azienda__foto img');
  const ANG = 62;
  if (ridotto) plisse?.classList.add('piatto');
  let inCoda = false;

  function aggiorna() {
    inCoda = false;
    const y = scrollY, vh = innerHeight;
    testata.classList.toggle('solida', y > 24 || !menu.hidden);

    if (hero) {
      const corsa = Math.max(1, hero.offsetHeight - vh);
      const p = clamp(y / corsa);
      hero.style.setProperty('--p', p.toFixed(4));
      hero.classList.toggle('oltre', p > .45);
      window.__heroP = p;
    }

    if (fogli && !ridotto) {
      const r = plisse.getBoundingClientRect();
      if (r.top < vh * 1.2 && r.bottom > -vh * .2) {
        const t = clamp((vh * .98 - r.top) / (vh * .6));
        const e = t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        const a = ANG * (1 - e);
        const rad = a * Math.PI / 180;
        const w = fogli.clientWidth;
        fogli.style.setProperty('--a', a.toFixed(2) + 'deg');
        fogli.style.setProperty('--sposta', (w * (1 - Math.cos(rad)) / 2).toFixed(1) + 'px');
        fogli.style.setProperty('--k', (Math.sin(rad) / Math.sin(ANG * Math.PI / 180)).toFixed(3));
        plisse.classList.toggle('piatto', a < .05);
      }
    }

    if (scala) {
      const r = scala.getBoundingClientRect();
      scala.style.setProperty('--s', clamp((vh * .92 - r.top) / (vh * .55)).toFixed(3));
    }

    if (!ridotto) {
      for (const img of parallasse) {
        const r = img.getBoundingClientRect();
        if (r.bottom < -100 || r.top > vh + 100) continue;
        const v = clamp(((r.top + r.height / 2) - vh / 2) / (vh / 2 + r.height / 2), -1, 1);
        img.style.setProperty('--v', v.toFixed(3));
      }
    }
  }
  const chiedi = () => { if (!inCoda) { inCoda = true; requestAnimationFrame(aggiorna); } };
  addEventListener('scroll', chiedi, { passive: true });
  addEventListener('resize', chiedi);
  aggiorna();

  /* Rivela e contatori */
  const fmt = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const conta = el => {
    const fine = +el.dataset.conta;
    if (ridotto) { el.textContent = fmt(fine); return; }
    const t0 = performance.now(), dur = 1700;
    const passo = () => {
      const k = clamp((performance.now() - t0) / dur);
      const e = 1 - Math.pow(1 - k, 3);
      el.textContent = fmt(Math.round(fine * e));
      if (k < 1) requestAnimationFrame(passo);
    };
    requestAnimationFrame(passo);
  };
  const contatori = $$('[data-conta]');
  if (!ridotto) contatori.forEach(el => { el.textContent = '0'; });
  const io = new IntersectionObserver(voci => {
    for (const v of voci) {
      if (!v.isIntersecting) continue;
      const el = v.target;
      if (el.dataset.conta) conta(el); else el.classList.add('in');
      io.unobserve(el);
    }
  }, { threshold: .15, rootMargin: '0px 0px -6% 0px' });
  $$('[data-rivela], [data-mosaico]').forEach(el => io.observe(el));
  contatori.forEach(el => io.observe(el));

  /* Trova il filtro */
  const schede = $$('.trova__usi [role="tab"]');
  const pannelli = $$('.trova__esito .esito');
  const esito = $('#trova-esito');
  let toccato = false, giro = null;
  function mostra(i, focus = false) {
    schede.forEach((b, j) => {
      const on = i === j;
      b.setAttribute('aria-selected', String(on));
      b.tabIndex = on ? 0 : -1;
      pannelli[j].hidden = !on;
      pannelli[j].classList.toggle('entra', on);
    });
    if (focus) schede[i].focus();
  }
  function altezza() {
    if (!esito) return;
    esito.style.minHeight = '';
    let max = 0;
    pannelli.forEach(p => { const h = p.hidden; p.hidden = false; max = Math.max(max, p.offsetHeight); p.hidden = h; });
    esito.style.minHeight = max + 'px';
  }
  const ferma = () => { toccato = true; clearTimeout(giro); };
  schede.forEach((b, i) => {
    b.addEventListener('click', () => { ferma(); mostra(i); });
    b.addEventListener('keydown', e => {
      const k = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      if (k) { e.preventDefault(); ferma(); mostra((i + k + schede.length) % schede.length, true); }
      if (e.key === 'Home') { e.preventDefault(); ferma(); mostra(0, true); }
      if (e.key === 'End') { e.preventDefault(); ferma(); mostra(schede.length - 1, true); }
    });
  });
  esito?.addEventListener('pointerdown', ferma);
  if (schede.length) {
    altezza();
    addEventListener('resize', () => requestAnimationFrame(altezza));
    document.fonts?.ready.then(altezza);
    let fatto = false;
    const ioT = new IntersectionObserver(v => {
      if (!v[0].isIntersecting || fatto || ridotto) return;
      fatto = true; ioT.disconnect();
      let i = 0, n = 0;
      const prossimo = (dopo) => {
        giro = setTimeout(() => {
          if (toccato) return;
          i = (i + 1) % schede.length; n++;
          mostra(i);
          if (n < schede.length) prossimo(1900);
        }, dopo);
      };
      prossimo(1100);
    }, { threshold: .35 });
    ioT.observe($('#trova'));
  }

  /* Bottoni che precompilano il preventivo */
  const selFam = $('#f-famiglia');
  const msg = $('#f-msg');
  $$('[data-famiglia]').forEach(a => a.addEventListener('click', () => {
    ferma();
    if (selFam) selFam.value = a.dataset.famiglia;
    if (msg && !msg.value.trim() && a.dataset.uso) msg.value = `Impianto: ${a.dataset.uso.toLowerCase()}.\n`;
  }));

  /* Modulo: compone l'email per l'ufficio giusto */
  const modulo = $('#modulo');
  modulo?.addEventListener('submit', e => {
    e.preventDefault();
    const f = new FormData(modulo);
    const err = $('#modulo-errore');
    $$('.campo[data-errore]', modulo).forEach(c => c.removeAttribute('data-errore'));
    const mancanti = [];
    const segna = (id, nome) => { const el = $('#' + id); el.closest('.campo').setAttribute('data-errore', ''); mancanti.push(nome); };
    if (!String(f.get('nome') || '').trim()) segna('f-nome', 'nome');
    const mail = String(f.get('email') || '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) segna('f-email', 'email valida');
    if (!String(f.get('messaggio') || '').trim()) segna('f-msg', 'descrizione');
    if (!$('#f-privacy').checked) segna('f-privacy', 'consenso privacy');
    if (mancanti.length) {
      err.textContent = 'Manca: ' + mancanti.join(', ') + '.';
      err.hidden = false;
      modulo.querySelector('[data-errore] input, [data-errore] textarea')?.focus();
      return;
    }
    err.hidden = true;
    const tipo = f.get('tipo');
    const a = tipo === 'ordine' ? 'ordini@eurofiltrigroup.com' : tipo === 'amministrazione' ? 'amministrazione@eurofiltrigroup.com' : 'info@eurofiltrigroup.com';
    const v = k => String(f.get(k) || '').trim();
    const azienda = v('azienda');
    const oggetto = `Richiesta di ${tipo}${azienda ? ' – ' + azienda : ''}`;
    const righe = [
      `Nome: ${v('nome')}`,
      azienda ? `Azienda: ${azienda}` : null,
      `Email: ${mail}`,
      v('telefono') ? `Telefono: ${v('telefono')}` : null,
      v('famiglia') ? `Prodotto: ${v('famiglia')}` : null,
      v('misure') ? `Misure: ${v('misure')}` : null,
      v('quantita') ? `Quantità: ${v('quantita')}` : null,
      '',
      v('messaggio'),
    ].filter(r => r !== null);
    location.href = `mailto:${a}?subject=${encodeURIComponent(oggetto)}&body=${encodeURIComponent(righe.join('\n'))}`;
    $('#modulo-esito').hidden = false;
  });

  /* Anno */
  $$('[data-anno]').forEach(el => { el.textContent = new Date().getFullYear(); });

  /* Scena 3D: dopo il caricamento, mai prima della pagina */
  if (hero) {
    const carica = () => setTimeout(() => {
      import('./3d.js').then(m => m.avvia()).catch(err => console.warn('3D non disponibile:', err));
    }, 120);
    if (document.readyState === 'complete') carica(); else addEventListener('load', carica, { once: true });
  }
})();
