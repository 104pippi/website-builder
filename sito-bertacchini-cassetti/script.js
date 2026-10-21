(() => {
  const html = document.documentElement;
  const ridotto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

  document.getElementById('anno').textContent = new Date().getFullYear();

  /* intro: parte quando il font è pronto, al massimo dopo 900 ms */
  let avviato = false;
  const avvia = () => { if (!avviato) { avviato = true; html.classList.add('avviato'); } };
  if (document.fonts && document.fonts.load) {
    Promise.race([
      document.fonts.load('800 60px Archivo').catch(() => {}),
      new Promise(r => setTimeout(r, 900))
    ]).then(avvia);
  }
  setTimeout(avvia, 1200);

  /* testata e menu */
  const testata = document.getElementById('testata');
  const hamburger = document.querySelector('.hamburger');
  const pannello = document.getElementById('pannello');
  const chiudiMenu = () => {
    pannello.hidden = true;
    hamburger.setAttribute('aria-expanded', 'false');
    hamburger.setAttribute('aria-label', 'Apri il menu');
    testata.classList.toggle('testata--piena', scrollY > 8);
  };
  hamburger.addEventListener('click', () => {
    const apri = pannello.hidden;
    pannello.hidden = !apri;
    hamburger.setAttribute('aria-expanded', String(apri));
    hamburger.setAttribute('aria-label', apri ? 'Chiudi il menu' : 'Apri il menu');
    if (apri) testata.classList.add('testata--piena');
    else chiudiMenu();
  });
  pannello.addEventListener('click', e => { if (e.target.closest('a')) chiudiMenu(); });
  addEventListener('keydown', e => { if (e.key === 'Escape' && !pannello.hidden) { chiudiMenu(); hamburger.focus(); } });

  /* effetti legati allo scroll, tutti in un solo giro di rAF */
  const fotoAzienda = document.querySelector('.azienda__foto img');
  const tempo = document.querySelector('.tempo__linea');
  const ventaglio = document.getElementById('ventaglio');
  let inCoda = false;
  const aggiorna = () => {
    inCoda = false;
    const vh = innerHeight;
    testata.classList.toggle('testata--piena', scrollY > 8 || !pannello.hidden);
    if (ridotto) return;
    if (fotoAzienda) {
      const r = fotoAzienda.parentElement.getBoundingClientRect();
      if (r.bottom > 0 && r.top < vh) {
        const p = clamp((vh - r.top) / (vh + r.height));
        fotoAzienda.style.transform = `translate3d(0, ${(-p * 15).toFixed(2)}%, 0)`;
      }
    }
    if (tempo) {
      const r = tempo.getBoundingClientRect();
      tempo.style.setProperty('--t', clamp((vh * .92 - r.top) / (vh * .45)).toFixed(3));
    }
    if (ventaglio) {
      const r = ventaglio.getBoundingClientRect();
      const p = clamp((vh * .95 - r.top) / (vh * .6));
      const e = 1 - Math.pow(1 - p, 3);
      ventaglio.style.setProperty('--ap', e.toFixed(3));
    }
  };
  const chiedi = () => { if (!inCoda) { inCoda = true; requestAnimationFrame(aggiorna); } };
  addEventListener('scroll', chiedi, { passive: true });
  addEventListener('resize', chiedi);
  if (!ridotto && ventaglio) ventaglio.style.setProperty('--ap', '0');
  if (!ridotto && tempo) tempo.style.setProperty('--t', '0');
  aggiorna();

  /* fasi della produzione: il taglio della foto parte quando la fase entra */
  const fasi = document.querySelectorAll('.fase');
  if ('IntersectionObserver' in window && !ridotto) {
    const io = new IntersectionObserver(voci => {
      voci.forEach(v => { if (v.isIntersecting) { v.target.classList.add('in'); io.unobserve(v.target); } });
    }, { threshold: .2, rootMargin: '0px 0px -8% 0px' });
    fasi.forEach(f => io.observe(f));
  } else fasi.forEach(f => f.classList.add('in'));

  /* scheda lavorazioni: la foto grande segue la voce attiva */
  const voci = [...document.querySelectorAll('.voce')];
  const vetrina = [...document.querySelectorAll('.scheda__vetrina img')];
  const attiva = n => {
    voci.forEach(v => v.classList.toggle('attiva', v.dataset.v === n));
    vetrina.forEach(i => i.classList.toggle('attiva', i.dataset.v === n));
  };
  voci.forEach(v => {
    v.addEventListener('mouseenter', () => attiva(v.dataset.v));
    v.addEventListener('focus', () => attiva(v.dataset.v));
    v.addEventListener('click', () => attiva(v.dataset.v));
  });
  if ('IntersectionObserver' in window) {
    const desktop = matchMedia('(min-width: 960px)');
    const io = new IntersectionObserver(es => {
      if (!desktop.matches) return;
      es.forEach(e => { if (e.isIntersecting) attiva(e.target.dataset.v); });
    }, { rootMargin: '-46% 0px -46% 0px' });
    voci.forEach(v => io.observe(v));
  }

  /* cartiglio: compone l'email di richiesta */
  const form = document.getElementById('cartiglio');
  const errore = document.getElementById('errore');
  form.addEventListener('submit', e => {
    e.preventDefault();
    const d = new FormData(form);
    const val = k => String(d.get(k) || '').trim();
    form.querySelectorAll('.c.errore').forEach(c => c.classList.remove('errore'));
    const mancano = [];
    if (!val('azienda')) mancano.push(['azienda', "il nome dell'azienda"]);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val('email'))) mancano.push(['email', "un'email valida"]);
    if (mancano.length) {
      mancano.forEach(([k]) => form.elements[k].closest('.c').classList.add('errore'));
      errore.textContent = 'Per preparare la richiesta serve ' + mancano.map(m => m[1]).join(' e ') + '.';
      form.elements[mancano[0][0]].focus();
      return;
    }
    errore.textContent = '';
    const righe = [
      'Buongiorno,',
      'vi chiedo un preventivo per questa fornitura.',
      '',
      'Azienda: ' + val('azienda'),
      (val('referente') ? 'Referente: ' + val('referente') : null),
      'Email: ' + val('email'),
      (val('telefono') ? 'Telefono: ' + val('telefono') : null),
      'Prodotto: ' + val('prodotto'),
      'Fornitura: ' + val('fornitura'),
      (val('quantita') ? 'Quantità indicativa: ' + val('quantita') : null),
      (val('note') ? '\nMisure e note:\n' + val('note') : null),
      '',
      'Allego il disegno tecnico.',
      '',
      'Grazie'
    ].filter(r => r !== null);
    const oggetto = 'Richiesta preventivo cassetti: ' + val('azienda');
    location.href = 'mailto:info@bertacchinicassetti.it?subject=' + encodeURIComponent(oggetto) + '&body=' + encodeURIComponent(righe.join('\n'));
  });

  /* il cassetto in 3D: arriva dopo la pagina, solo se c'è WebGL */
  const palco = document.getElementById('palco');
  const webgl = () => {
    try {
      const c = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
    } catch (e) { return false; }
  };
  const carica3d = () => {
    if (!palco || !webgl()) return;
    import('./3d.js')
      .then(m => m.avvia(palco, document.getElementById('etichette'), { fermo: ridotto }))
      .catch(err => console.warn('3D non disponibile:', err));
  };
  if (document.readyState === 'complete') setTimeout(carica3d, 60);
  else addEventListener('load', () => setTimeout(carica3d, 60), { once: true });
})();
