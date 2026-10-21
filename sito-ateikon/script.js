(() => {
  const html = document.documentElement;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const liscio = (a, b, v) => { const x = clamp((v - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); };

  /* intro: parte quando il font è pronto, al massimo dopo 900 ms */
  let avviato = false;
  const avvia = () => {
    if (avviato) return;
    avviato = true;
    window.__introInizio = performance.now();
    html.classList.add('avvio');
  };
  if (document.fonts && document.fonts.load) {
    Promise.race([
      document.fonts.load('800 40px Archivo').catch(() => {}),
      new Promise((r) => setTimeout(r, 700)),
    ]).then(() => requestAnimationFrame(avvia));
  }
  setTimeout(avvia, 900);

  /* testata e menu */
  const testata = $('#testata');
  const menu = $('#menu');
  const bottoneMenu = $('.testata__menu');
  const chiudiMenu = () => { menu.hidden = true; bottoneMenu.setAttribute('aria-expanded', 'false'); bottoneMenu.textContent = 'Menu'; };
  bottoneMenu.addEventListener('click', () => {
    const apri = menu.hidden;
    menu.hidden = !apri;
    bottoneMenu.setAttribute('aria-expanded', String(apri));
    bottoneMenu.textContent = apri ? 'Chiudi' : 'Menu';
  });
  $$('a', menu).forEach((a) => a.addEventListener('click', chiudiMenu));
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) chiudiMenu(); });

  /* palco dell'esploso: lo stato lo legge anche 3d.js a ogni fotogramma */
  const esploso = $('#settori');
  const palco = $('#palco');
  const pannelli = $$('.pannello', palco);
  let inizio = 1, corsa = 1;
  const misura = () => {
    inizio = esploso.getBoundingClientRect().top + scrollY;
    corsa = Math.max(1, esploso.offsetHeight - palco.offsetHeight);
  };
  const statoPalco = () => {
    const y = scrollY;
    const p = clamp((y - inizio) / corsa, 0, 1);
    const t = clamp(y / inizio, 0, 1);
    const e = liscio(0.1, 0.22, p) * (1 - liscio(0.84, 0.94, p));
    const s = p < 0.22 ? 0 : p < 0.43 ? 1 : p < 0.64 ? 2 : p < 0.85 ? 3 : 4;
    return { p, t, e, s };
  };
  window.__statoPalco = statoPalco;
  window.__palco = { esploso, palco };

  let statoMostrato = -1;
  const aggiornaPalco = () => {
    const { e, s } = statoPalco();
    palco.style.setProperty('--e', e.toFixed(3));
    if (s !== statoMostrato) {
      statoMostrato = s;
      palco.dataset.stato = s;
      pannelli.forEach((el) => el.classList.toggle('attivo', +el.dataset.p === s));
    }
  };

  /* frase di chi siamo: le parole si accendono con lo scroll */
  const frase = $('.chi__frase p');
  let parole = [];
  if (frase) {
    frase.innerHTML = frase.textContent.trim().split(/\s+/).map((w) => `<span class="parola">${w}</span>`).join(' ');
    parole = $$('.parola', frase);
  }
  const aggiornaFrase = () => {
    if (!frase) return;
    const r = frase.getBoundingClientRect();
    const k = clamp((innerHeight * 0.85 - r.top) / (r.height + innerHeight * 0.35), 0, 1);
    const n = Math.round(k * parole.length);
    parole.forEach((w, i) => w.classList.toggle('on', i < n));
  };

  /* metodo: la linea si riempie e i numeri si accendono */
  const passi = $('#passi');
  const voci = passi ? $$('li', passi) : [];
  const aggiornaPassi = () => {
    if (!passi) return;
    const r = passi.getBoundingClientRect();
    const linea = innerHeight * 0.62;
    const k = clamp((linea - r.top) / r.height, 0, 1);
    passi.style.setProperty('--riempi', k.toFixed(3));
    voci.forEach((li) => li.classList.toggle('passato', li.getBoundingClientRect().top + 20 < linea));
  };

  let inCoda = false;
  const suScroll = () => {
    if (inCoda) return;
    inCoda = true;
    requestAnimationFrame(() => {
      inCoda = false;
      testata.classList.toggle('su', scrollY > 8);
      aggiornaPalco();
      aggiornaFrase();
      aggiornaPassi();
    });
  };
  misura();
  aggiornaPalco();
  suScroll();
  addEventListener('scroll', suScroll, { passive: true });
  addEventListener('resize', () => { misura(); suScroll(); });
  addEventListener('load', () => { misura(); suScroll(); });

  /* reveal */
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((voci) => {
      voci.forEach((v) => { if (v.isIntersecting) { v.target.classList.add('in'); io.unobserve(v.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    $$('[data-rivela]').forEach((el) => io.observe(el));
  } else {
    $$('[data-rivela]').forEach((el) => el.classList.add('in'));
  }

  /* trova il tuo Progen */
  const schede = $$('.ruoli__scelte [role="tab"]');
  const scegli = (tab, fuoco) => {
    schede.forEach((t) => {
      const attiva = t === tab;
      t.setAttribute('aria-selected', String(attiva));
      t.tabIndex = attiva ? 0 : -1;
      const pannello = document.getElementById(t.getAttribute('aria-controls'));
      pannello.hidden = !attiva;
      if (attiva) { pannello.classList.remove('entra'); void pannello.offsetWidth; pannello.classList.add('entra'); }
    });
    if (fuoco) tab.focus();
  };
  schede.forEach((t, i) => {
    t.addEventListener('click', () => scegli(t));
    t.addEventListener('keydown', (e) => {
      const dir = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      if (dir) { e.preventDefault(); scegli(schede[(i + dir + schede.length) % schede.length], true); }
      if (e.key === 'Home') { e.preventDefault(); scegli(schede[0], true); }
      if (e.key === 'End') { e.preventDefault(); scegli(schede[schede.length - 1], true); }
    });
  });

  /* i bottoni delle schede preselezionano il settore nel modulo */
  $$('[data-settore]').forEach((b) => b.addEventListener('click', () => {
    const r = $(`.pillole input[value="${b.dataset.settore}"]`);
    if (r) r.checked = true;
  }));

  /* modulo: compone l'email per marketing@ateikon.net */
  const modulo = $('#modulo');
  const errore = $('#modulo-errore');
  const nota = $('#modulo-nota');
  modulo.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = new FormData(modulo);
    const v = (k) => String(f.get(k) || '').trim();
    const mancanti = [];
    const segna = (nome, ok) => {
      const campo = modulo.elements[nome];
      if (campo && campo.classList) campo.classList.toggle('errato', !ok);
      if (!ok) mancanti.push(nome);
    };
    segna('nome', v('nome').length > 1);
    segna('email', /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v('email')));
    segna('messaggio', v('messaggio').length > 3);
    const privacy = modulo.elements.privacy.checked;
    if (mancanti.length || !privacy) {
      const testi = { nome: 'il nome', email: "un'email valida", messaggio: 'che cosa ti serve' };
      const elenco = mancanti.map((m) => testi[m]);
      if (!privacy) elenco.push("il consenso all'informativa privacy");
      errore.textContent = 'Per inviare la richiesta manca ' + elenco.join(', ') + '.';
      errore.hidden = false;
      const primo = mancanti.length ? modulo.elements[mancanti[0]] : modulo.elements.privacy;
      primo.focus();
      return;
    }
    errore.hidden = true;
    const settore = v('settore') || 'non indicato';
    const oggetto = `Richiesta proposta Progen® - ${settore}${v('azienda') ? ' - ' + v('azienda') : ''}`;
    const dati = [
      `Nome: ${v('nome')}`,
      v('azienda') && `Azienda: ${v('azienda')}`,
      `Settore: ${settore}`,
      `Email: ${v('email')}`,
      v('telefono') && `Telefono: ${v('telefono')}`,
    ].filter(Boolean);
    const corpo = `Buongiorno,\n\n${v('messaggio')}\n\n${dati.join('\n')}`;
    location.href = `mailto:marketing@ateikon.net?subject=${encodeURIComponent(oggetto)}&body=${encodeURIComponent(corpo)}`;
    nota.textContent = 'Abbiamo aperto la tua app di posta con la richiesta già scritta: premi Invia per mandarla.';
    nota.classList.add('fatto');
  });

  /* targhette: inclinazione e riflesso col mouse, solo su desktop */
  if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
    $$('.targa').forEach((t) => {
      const dentro = $('.targa__in', t);
      t.addEventListener('pointermove', (e) => {
        const r = t.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        dentro.style.setProperty('--ry', ((x - 0.5) * 10).toFixed(2) + 'deg');
        dentro.style.setProperty('--rx', ((0.5 - y) * 8).toFixed(2) + 'deg');
        dentro.style.setProperty('--mx', (x * 100).toFixed(1) + '%');
        dentro.style.setProperty('--my', (y * 100).toFixed(1) + '%');
      });
      t.addEventListener('pointerleave', () => {
        ['--rx', '--ry', '--mx', '--my'].forEach((p) => dentro.style.removeProperty(p));
      });
    });
  }

  /* anno */
  const anno = $('#anno');
  if (anno) anno.textContent = new Date().getFullYear();

  /* scena 3D: dopo il caricamento, mai prima della pagina */
  const risparmio = navigator.connection && navigator.connection.saveData;
  const carica3d = () => {
    if (risparmio) { html.classList.add('no-webgl'); return; }
    import('./3d.js')
      .then((m) => m.avvia())
      .catch((err) => { console.warn('Scena 3D non disponibile:', err); html.classList.add('no-webgl'); });
  };
  if (document.readyState === 'complete') setTimeout(carica3d, 50);
  else addEventListener('load', () => setTimeout(carica3d, 50), { once: true });
})();
