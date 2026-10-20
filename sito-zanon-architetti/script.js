(() => {
  const html = document.documentElement;
  const riduci = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

  const anno = $('#anno');
  if (anno) anno.textContent = String(new Date().getFullYear());

  /* ---------- testata e menu mobile ---------- */
  const testata = $('#testata');
  const burger = $('.burger');
  const menu = $('#menu-mobile');
  const barra = $('.barra');

  function apriMenu(apri) {
    burger.setAttribute('aria-expanded', String(apri));
    burger.querySelector('.burger__testo').textContent = apri ? 'Chiudi' : 'Menu';
    menu.hidden = !apri;
    document.body.style.overflow = apri ? 'hidden' : '';
    if (barra) barra.classList.toggle('via', apri);
  }
  burger.addEventListener('click', () => apriMenu(menu.hidden));
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) apriMenu(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) { apriMenu(false); burger.focus(); } });
  window.addEventListener('resize', () => { if (window.innerWidth >= 900 && !menu.hidden) apriMenu(false); });

  /* ---------- intro: il compasso disegna l'anello, poi la foto ---------- */
  const foto = $('.hero__foto');
  const img = $('.hero__img');
  const svg = $('.hero__tracciato');
  const [fx, fy, fr, fri] = foto.dataset.anello.split(' ').map(Number);

  function geometria() {
    const w = foto.clientWidth, h = foto.clientHeight;
    const iw = img.naturalWidth || 1920, ih = img.naturalHeight || 1440;
    const s = Math.max(w / iw, h / ih);
    const dw = iw * s, dh = ih * s;
    const ox = (w - dw) / 2, oy = (h - dh) / 2;
    return { w, h, cx: ox + fx * dw, cy: oy + fy * dh, r: fr * dw, ri: fri * dw };
  }

  function preparaTracciato(g) {
    svg.setAttribute('viewBox', `0 0 ${g.w} ${g.h}`);
    const [cos, est, int] = svg.querySelectorAll('circle');
    [[cos, g.r * 1.16], [est, g.r], [int, g.ri]].forEach(([c, r]) => {
      c.setAttribute('cx', g.cx.toFixed(1));
      c.setAttribute('cy', g.cy.toFixed(1));
      c.setAttribute('r', r.toFixed(1));
    });
    const k = Math.max(8, g.ri * 0.12);
    svg.querySelector('.t-croce').setAttribute('d', `M${g.cx - k} ${g.cy}H${g.cx + k}M${g.cx} ${g.cy - k}V${g.cy + k}`);
    return { cos, est, int, croce: svg.querySelector('.t-croce') };
  }

  let introFatta = false;
  function intro() {
    if (introFatta) return;
    introFatta = true;
    if (riduci || typeof img.animate !== 'function') { html.classList.add('avviato'); return; }
    const g = geometria();
    const t = preparaTracciato(g);
    const curva = 'cubic-bezier(.7,0,.2,1)';
    const anim = [];
    const traccia = (el, r, ritardo, durata) => {
      const L = 2 * Math.PI * r;
      el.style.strokeDasharray = `${L} ${L}`;
      anim.push(el.animate([{ strokeDashoffset: L }, { strokeDashoffset: 0 }], { duration: durata, delay: ritardo, easing: curva, fill: 'both' }));
    };
    svg.style.opacity = '1';
    anim.push(t.croce.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, delay: 0, fill: 'both' }));
    anim.push(t.cos.animate([{ opacity: 0, transform: 'scale(.92)' }, { opacity: 0.55, transform: 'none' }], { duration: 900, delay: 60, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'both' }));
    t.cos.style.transformOrigin = `${g.cx}px ${g.cy}px`;
    traccia(t.est, g.r, 120, 900);
    traccia(t.int, g.ri, 320, 800);

    const lontano = Math.hypot(Math.max(g.cx, g.w - g.cx), Math.max(g.cy, g.h - g.cy)) + 4;
    const at = `at ${g.cx.toFixed(1)}px ${g.cy.toFixed(1)}px`;
    const clip = img.animate([
      { clipPath: `circle(0px ${at})`, offset: 0, easing: 'cubic-bezier(.6,0,.25,1)' },
      { clipPath: `circle(${(g.r + 1).toFixed(1)}px ${at})`, offset: 0.36 },
      { clipPath: `circle(${(g.r + 1).toFixed(1)}px ${at})`, offset: 0.5, easing: curva },
      { clipPath: `circle(${lontano.toFixed(1)}px ${at})`, offset: 1 },
    ], { duration: 2000, delay: 560, fill: 'both' });
    anim.push(clip);
    anim.push(svg.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 600, delay: 1650, fill: 'both' }));

    html.classList.add('avviato');
    // a fine intro si tolgono ritaglio e tracciato (setTimeout: il video di presentazione lo fa avanzare)
    setTimeout(() => {
      anim.forEach((a) => a.cancel());
      svg.style.display = 'none';
    }, 2700);
  }

  const attesa = (ms) => new Promise((r) => setTimeout(r, ms));
  const pronta = Promise.all([
    (img.decode ? img.decode() : Promise.resolve()).catch(() => {}),
    (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).catch(() => {}),
  ]);
  Promise.race([pronta, attesa(1600)]).then(() => requestAnimationFrame(intro));

  /* ---------- scroll: testata, parallasse, fasi ---------- */
  const fotoTavole = $$('.tavola__foto');
  const visibili = new Set();
  if (!riduci && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((voci) => voci.forEach((v) => (v.isIntersecting ? visibili.add(v.target) : visibili.delete(v.target))), { rootMargin: '15% 0px' });
    fotoTavole.forEach((f) => io.observe(f));
  }

  const pista = $('#pista');
  const palco = $('#palco');
  const scena = $('#scena');
  const fasi = $$('.fase');
  let fasiDa3d = false;
  let faseCorrente = 0;

  function fasiDaScroll() {
    if (fasiDa3d || !pista) return;
    const r = pista.getBoundingClientRect();
    const corsa = pista.offsetHeight - window.innerHeight;
    const p = corsa > 0 ? clamp(-r.top / corsa) : 0;
    const f = p < 0.25 ? 0 : p < 0.5 ? 1 : p < 0.78 ? 2 : 3;
    if (f === faseCorrente) return;
    faseCorrente = f;
    fasi.forEach((el, i) => el.classList.toggle('attiva', i === f));
    palco.dataset.fase = String(f);
  }

  let inAttesa = false;
  function suScroll() {
    inAttesa = false;
    testata.classList.toggle('scorsa', window.scrollY > 8);
    const vh = window.innerHeight;
    visibili.forEach((f) => {
      const r = f.getBoundingClientRect();
      const p = clamp((r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2), -1, 1);
      f.style.setProperty('--sposta', (-p * r.height * 0.05).toFixed(1) + 'px');
    });
    fasiDaScroll();
  }
  window.addEventListener('scroll', () => { if (!inAttesa) { inAttesa = true; requestAnimationFrame(suScroll); } }, { passive: true });
  window.addEventListener('resize', suScroll);
  suScroll();

  /* ---------- plastico 3D: si carica dopo la pagina ---------- */
  let caricato = false;
  async function carica3d() {
    if (caricato || riduci || !scena) return;
    caricato = true;
    try {
      const m = await import('./3d.js');
      const ok = await m.avvia({ palco, scena, pista, fasi, fotoUrl: img.currentSrc || img.src, mobile: window.innerWidth < 900 });
      if (ok) fasiDa3d = true;
    } catch (e) {
      console.warn('Plastico 3D non disponibile, resta la foto', e);
    }
  }
  if (!riduci && pista) {
    const io3 = new IntersectionObserver(([v]) => { if (v.isIntersecting) { io3.disconnect(); carica3d(); } }, { rootMargin: '120% 0px' });
    io3.observe(pista);
    const dopoLoad = () => setTimeout(carica3d, 1500);
    if (document.readyState === 'complete') dopoLoad(); else window.addEventListener('load', dopoLoad, { once: true });
  }

  /* ---------- binario dei progetti recenti ---------- */
  const binario = $('.recenti__binario');
  const frecce = $$('.freccia');
  function statoFrecce() {
    const max = binario.scrollWidth - binario.clientWidth - 2;
    frecce[0].disabled = binario.scrollLeft <= 2;
    frecce[1].disabled = binario.scrollLeft >= max;
  }
  frecce.forEach((b) => b.addEventListener('click', () => {
    const passo = ($('.recente', binario).offsetWidth + 24) * Number(b.dataset.dir);
    binario.scrollBy({ left: passo, behavior: riduci ? 'auto' : 'smooth' });
  }));
  binario.addEventListener('scroll', statoFrecce, { passive: true });
  statoFrecce();

  /* ---------- archivio ---------- */
  const voci = $$('.voce');
  const filtri = $$('.filtro');
  const altri = $('#altri');
  let filtro = 'tutti';
  let espanso = false;
  function applica(animare) {
    let n = 0;
    voci.forEach((v, i) => {
      const ok = filtro === 'tutti' || v.dataset.settori.split(' ').includes(filtro);
      const nascondi = !ok || (filtro === 'tutti' && !espanso && i >= 24);
      v.classList.toggle('nascosta', nascondi);
      if (!nascondi && animare && !riduci) {
        v.classList.remove('entra');
        void v.offsetWidth;
        v.style.animationDelay = Math.min(n, 24) * 16 + 'ms';
        v.classList.add('entra');
      }
      if (!nascondi) n++;
    });
    altri.hidden = !(filtro === 'tutti' && !espanso);
  }
  filtri.forEach((b) => b.addEventListener('click', () => {
    filtro = b.dataset.filtro;
    filtri.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    applica(true);
  }));
  altri.addEventListener('click', () => { espanso = true; applica(true); });
  applica(false);

  /* ---------- modulo: compone l'email ---------- */
  const modulo = $('#modulo');
  const errore = $('#errore');
  $$('[data-tipo]').forEach((a) => a.addEventListener('click', () => {
    const r = modulo.querySelector(`input[name="tipo"][value="${a.dataset.tipo}"]`);
    if (r) r.checked = true;
  }));

  modulo.addEventListener('submit', (e) => {
    e.preventDefault();
    const d = new FormData(modulo);
    const v = (k) => String(d.get(k) || '').trim();
    const mancano = [];
    const nome = modulo.elements.nome, email = modulo.elements.email, privacy = modulo.elements.privacy;
    [nome, email].forEach((c) => c.classList.remove('non-valido'));
    if (!v('nome')) { mancano.push('il nome'); nome.classList.add('non-valido'); }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v('email'))) { mancano.push("un'email valida"); email.classList.add('non-valido'); }
    if (!privacy.checked) mancano.push("l'accettazione dell'informativa");
    if (mancano.length) {
      errore.textContent = `Per preparare l'email ${mancano.length > 1 ? 'mancano' : 'manca'} ${mancano.slice(0, -1).join(', ')}${mancano.length > 1 ? ' e ' : ''}${mancano[mancano.length - 1]}.`;
      errore.hidden = false;
      return;
    }
    errore.hidden = true;
    const tipo = v('tipo'), luogo = v('luogo'), quando = v('quando');
    const righe = ['Buongiorno,', '', `vorrei parlarvi di un progetto${tipo ? ' (' + tipo.toLowerCase() + ')' : ''}.`];
    if (luogo) righe.push(`Dove: ${luogo}`);
    if (quando) righe.push(`Tempi: ${quando}`);
    if (v('messaggio')) righe.push('', v('messaggio'));
    righe.push('', v('nome') + (v('azienda') ? `, ${v('azienda')}` : ''), v('email'));
    if (v('telefono')) righe.push(v('telefono'));
    const oggetto = `Nuovo progetto${tipo ? ': ' + tipo : ''}${luogo ? ', ' + luogo : ''}`;
    window.location.href = `mailto:info@zanonarchitettiassociati.it?subject=${encodeURIComponent(oggetto)}&body=${encodeURIComponent(righe.join('\n'))}`;
    errore.textContent = "Si è aperta l'email con il messaggio già scritto: controllala e premi Invia.";
    errore.hidden = false;
    errore.style.color = 'var(--grafite)';
  });

  /* ---------- barra mobile: via quando il modulo è in vista ---------- */
  const contatti = $('#contatti');
  if (barra && contatti && 'IntersectionObserver' in window) {
    new IntersectionObserver(([v]) => barra.classList.toggle('via', v.isIntersecting), { rootMargin: '0px 0px -30% 0px' }).observe(contatti);
  }
})();
