/* Automil — interazioni della pagina. La scena 3D sta in 3d.js e si carica solo quando serve. */
(() => {
  const WA = '393471802145';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const ridotto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const waLink = (testo) => `https://wa.me/${WA}?text=${encodeURIComponent(testo)}`;
  const euro = (n) => (n ? '€ ' + n.toLocaleString('it-IT') : 'Prezzo su richiesta');

  /* anno nel piede */
  $$('[data-anno]').forEach((el) => { el.textContent = new Date().getFullYear(); });

  /* link WhatsApp con messaggio precompilato */
  $$('[data-wa]').forEach((a) => { a.href = waLink(a.dataset.wa); a.target = '_blank'; a.rel = 'noopener'; });

  /* menu mobile */
  const menuBtn = $('[data-menu]');
  const chiudiMenu = () => { document.documentElement.classList.remove('menu-aperto'); menuBtn.setAttribute('aria-expanded', 'false'); };
  menuBtn.addEventListener('click', () => {
    const aperto = document.documentElement.classList.toggle('menu-aperto');
    menuBtn.setAttribute('aria-expanded', String(aperto));
  });
  $$('#menu a').forEach((a) => a.addEventListener('click', chiudiMenu));
  addEventListener('keydown', (e) => { if (e.key === 'Escape') chiudiMenu(); });

  /* testata, barra mobile e parallasse dell'hero: un solo giro per fotogramma */
  const testata = $('[data-testata]');
  const barra = $('.barra');
  const hero = $('[data-hero]');
  let altezzaHero = hero.offsetHeight;
  addEventListener('resize', () => { altezzaHero = hero.offsetHeight; }, { passive: true });
  let inCoda = false;
  const aggiorna = () => {
    inCoda = false;
    const y = scrollY;
    testata.classList.toggle('is-piena', y > 30);
    barra.classList.toggle('is-su', y > altezzaHero * 0.55);
    if (!ridotto && y < altezzaHero * 1.2) {
      hero.style.setProperty('--q', Math.min(1, y / altezzaHero).toFixed(4));
    }
  };
  addEventListener('scroll', () => { if (!inCoda) { inCoda = true; requestAnimationFrame(aggiorna); } }, { passive: true });
  aggiorna();

  /* comparse leggere */
  const compare = new IntersectionObserver((voci) => {
    voci.forEach((v) => { if (v.isIntersecting) { v.target.classList.add('is-visto'); compare.unobserve(v.target); } });
  }, { rootMargin: '0px 0px -12% 0px' });
  $$('.omologa, .parco__testa, .officina__testa, .lavoro, .linea li, .vendi__griglia > *, .visita__griglia > *').forEach((el) => {
    if (!el.classList.contains('omologa')) el.classList.add('compare');
    compare.observe(el);
  });

  /* ---------- parco veicoli ---------- */
  const dati = JSON.parse($('#dati-mezzi').textContent);
  const lista = $('[data-mezzi]');
  const carte = $$('.mezzo', lista);
  const conta = { tutti: carte.length };
  carte.forEach((c) => { conta[c.dataset.cat] = (conta[c.dataset.cat] || 0) + 1; });
  $$('[data-conta]').forEach((s) => { s.textContent = conta[s.dataset.conta] || 0; });
  $$('[data-totale]').forEach((s) => { s.textContent = carte.length; });
  lista.dataset.filtro = 'tutti';

  $$('[data-filtro]').forEach((b) => b.addEventListener('click', () => {
    const f = b.dataset.filtro;
    $$('[data-filtro]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    lista.dataset.filtro = f;
    carte.forEach((c, i) => {
      const vedi = f === 'tutti' || c.dataset.cat === f;
      c.hidden = !vedi;
      if (vedi && !ridotto) { c.style.animation = 'none'; void c.offsetWidth; c.style.animation = ''; c.style.animationDelay = `${Math.min(i, 8) * 35}ms`; }
    });
  }));

  /* scheda del mezzo */
  const scheda = $('[data-scheda]');
  const sf = $('[data-scheda-foto]');
  const sp = $('[data-scheda-punti]');
  let ultimoBottone = null;

  const apri = (id) => {
    const m = dati[id];
    if (!m) return;
    const cat = { camper: 'Camper', multivan: 'Multivan e Caravelle', auto: 'Auto', accessori: 'Accessori' }[m.cat];
    $('[data-scheda-cat]', scheda).textContent = cat + (m.arrivo ? ', in arrivo' : '');
    $('[data-scheda-nome]', scheda).textContent = m.nome;
    $('[data-scheda-prezzo]', scheda).textContent = euro(m.prezzo);

    const spec = [
      ['Anno', m.anno], ['Chilometri', m.km ? m.km.toLocaleString('it-IT') + ' km' : null], ['Motore', m.motore],
      ['Cambio', m.cambio], ['Trazione', m.trazione], ['Posti viaggio', m.viaggio], ['Posti letto', m.letti],
    ].filter(([, v]) => v);
    $('[data-scheda-spec]', scheda).innerHTML = spec.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
    $('[data-scheda-forti]', scheda).innerHTML = (m.punti || []).map((p) => `<li>${p}</li>`).join('');
    $('[data-scheda-dot]', scheda).innerHTML = (m.dotazioni || []).map((p) => `<li>${p}</li>`).join('');

    if (m.foto && m.foto.length) {
      sf.innerHTML = m.foto.map((src, i) => `<img src="${src}" width="1280" height="960" decoding="async" ${i ? 'loading="lazy"' : ''} alt="${m.nome}, foto ${i + 1} di ${m.foto.length}">`).join('');
    } else {
      sf.innerHTML = '<div class="mezzo__arrivo"><svg viewBox="0 0 120 64"><use href="#sagoma"/></svg><span>Foto in arrivo</span></div>';
    }
    sp.innerHTML = (m.foto || []).map((_, i) => `<i class="${i ? '' : 'is-attivo'}"></i>`).join('');
    sf.scrollLeft = 0;

    const testo = `Buongiorno, mi interessa il ${m.nome}${m.prezzo ? ` a ${euro(m.prezzo)}` : ''} visto sul vostro sito. È ancora disponibile? Quando posso venire a vederlo?`;
    const wa = $('[data-scheda-wa]', scheda);
    wa.href = waLink(testo); wa.target = '_blank'; wa.rel = 'noopener';

    scheda.classList.remove('is-chiude');
    scheda.showModal();
    $('.scheda__corpo', scheda).scrollTop = 0;
    history.replaceState(null, '', '#mezzo-' + id);
  };
  const chiudi = () => {
    if (!scheda.open) return;
    if (ridotto) { scheda.close(); return; }
    scheda.classList.add('is-chiude');
    setTimeout(() => { scheda.close(); scheda.classList.remove('is-chiude'); }, 300);
  };
  scheda.addEventListener('close', () => {
    history.replaceState(null, '', location.pathname + location.search);
    if (ultimoBottone) ultimoBottone.focus({ preventScroll: true });
  });
  scheda.addEventListener('cancel', (e) => { e.preventDefault(); chiudi(); });
  scheda.addEventListener('click', (e) => { if (e.target === scheda) chiudi(); });
  $('[data-chiudi]', scheda).addEventListener('click', chiudi);
  sf.addEventListener('scroll', () => {
    const i = Math.round(sf.scrollLeft / sf.clientWidth);
    $$('i', sp).forEach((d, k) => d.classList.toggle('is-attivo', k === i));
  }, { passive: true });
  carte.forEach((c) => $('button', c).addEventListener('click', (e) => { ultimoBottone = e.currentTarget; apri(c.dataset.id); }));
  if (location.hash.startsWith('#mezzo-')) apri(location.hash.slice(7));

  /* modulo "vendi il tuo Westfalia" → WhatsApp */
  const modulo = $('[data-modulo]');
  modulo.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(modulo));
    const err = $('[data-errore]', modulo);
    if (!f.modello.trim() || !f.nome.trim()) { err.hidden = false; (f.modello.trim() ? modulo.nome : modulo.modello).focus(); return; }
    err.hidden = true;
    const righe = [
      'Buongiorno, vorrei vendervi il mio camper.',
      `Modello: ${f.modello.trim()}`,
      f.anno && `Anno: ${f.anno}`,
      f.km && `Km: ${f.km}`,
      f.note && `Note: ${f.note.trim()}`,
      `Mi chiamo ${f.nome.trim()}. Vi mando le foto qui sotto.`,
    ].filter(Boolean);
    window.open(waLink(righe.join('\n')), '_blank', 'noopener');
  });

  /* ---------- scena 3D: si carica quando la sezione si avvicina ---------- */
  const tetto = $('[data-tetto]');
  const canvas = $('[data-tela]');
  const prova = document.createElement('canvas');
  const webgl = !!(window.WebGLRenderingContext && (prova.getContext('webgl2') || prova.getContext('webgl')));
  if (!webgl) { tetto.classList.add('is-fermo'); return; }

  // i passi seguono lo scroll anche prima che la scena sia pronta
  const passi = $$('[data-passo]', tetto);
  const binario = $('[data-binario]', tetto);
  let passoAttivo = -1;
  const progresso = () => {
    const r = tetto.getBoundingClientRect();
    const corsa = tetto.offsetHeight - innerHeight;
    return Math.min(1, Math.max(0, -r.top / corsa));
  };
  const segnaPasso = () => {
    const p = progresso();
    const i = p < 0.075 ? -1 : Math.min(passi.length - 1, Math.floor((p - 0.075) / ((1 - 0.075) / passi.length)));
    tetto.classList.toggle('is-avanti', p > 0.06);
    binario.parentElement.style.setProperty('--p', p.toFixed(4));
    if (i !== passoAttivo) {
      passoAttivo = i;
      passi.forEach((el, k) => el.classList.toggle('is-attivo', k === i));
    }
  };
  addEventListener('scroll', () => requestAnimationFrame(segnaPasso), { passive: true });
  segnaPasso();

  let caricato = false;
  const carica = () => {
    if (caricato) return;
    caricato = true;
    import('./3d.js').then((mod) => mod.avvia({ sezione: tetto, canvas, progresso, ridotto }))
      .then(() => tetto.classList.add('is-pronto'))
      .catch((err) => { console.error(err); tetto.classList.add('is-fermo'); });
  };
  // dopo l'intro dell'hero, in un momento libero (o prima, se la sezione si avvicina): il giro parte solo quando è in vista
  const vicino = new IntersectionObserver((v) => { if (v.some((x) => x.isIntersecting)) { vicino.disconnect(); carica(); } }, { rootMargin: '150% 0px' });
  vicino.observe(tetto);
  const dopoLoad = () => setTimeout(() => (window.requestIdleCallback ? requestIdleCallback(carica, { timeout: 2000 }) : carica()), 2600);
  if (document.readyState === 'complete') dopoLoad();
  else addEventListener('load', dopoLoad, { once: true });
})();
