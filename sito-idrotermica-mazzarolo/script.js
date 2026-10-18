(() => {
  const d = document;
  const root = d.documentElement;
  root.classList.add('js');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const WA = '393488910040';

  /* anno nel footer */
  d.querySelectorAll('[data-year]').forEach((n) => { n.textContent = new Date().getFullYear(); });

  /* titolo: parole che salgono una alla volta */
  const title = d.querySelector('[data-split]');
  if (title && !reduce) {
    const text = title.textContent.trim();
    title.setAttribute('aria-label', text);
    title.innerHTML = text.split(/\s+/)
      .map((w, i) => `<span class="w" aria-hidden="true"><span style="--i:${i}">${w}</span></span>`)
      .join(' ');
  }

  /* tubo dell'hero: dal bordo sinistro, sopra il titolo, giù fino al bottone Chiama */
  const hero = d.querySelector('.hero');
  const pipe = d.querySelector('[data-hero-pipe]');
  const pipePath = pipe && pipe.querySelector('path');
  const target = d.querySelector('[data-pipe-target]');
  const col = d.querySelector('.hero__col');

  const drawPipe = () => {
    if (!pipe || !title || !target) return;
    const h = hero.getBoundingClientRect();
    const t = title.getBoundingClientRect();
    const c = col.getBoundingClientRect();
    const b = target.getBoundingClientRect();
    const W = Math.round(h.width);
    const H = Math.round(h.height);
    const wide = W >= 960;
    const r = wide ? 28 : 18;
    const y0 = Math.round(t.top - h.top - (wide ? 40 : 28));
    const x1 = Math.round(wide ? c.right - h.left + 56 : W - 15);
    const yb = Math.round(b.top - h.top + b.height / 2);
    const xe = Math.round(b.right - h.left + 2);
    pipe.setAttribute('viewBox', `0 0 ${W} ${H}`);
    pipePath.setAttribute('d',
      `M-40 ${y0}H${x1 - r}A${r} ${r} 0 0 1 ${x1} ${y0 + r}V${yb - r}A${r} ${r} 0 0 1 ${x1 - r} ${yb}H${xe}`);
  };
  drawPipe();
  if (d.fonts && d.fonts.ready) d.fonts.ready.then(drawPipe);
  if (pipePath && target) {
    if (reduce) target.classList.add('is-live');
    else pipePath.addEventListener('animationend', () => target.classList.add('is-live'), { once: true });
  }

  /* circuito degli impianti: si riempie mentre scorri */
  const circuit = d.querySelector('[data-circuit]');
  const services = circuit ? [...circuit.querySelectorAll('.svc')] : [];
  const fillCircuit = () => {
    if (!circuit) return;
    const line = innerHeight * 0.62;
    const r = circuit.getBoundingClientRect();
    const p = reduce ? 1 : Math.min(1, Math.max(0, (line - r.top) / r.height));
    circuit.style.setProperty('--p', p.toFixed(4));
    services.forEach((s) => {
      const t = s.querySelector('.svc__title').getBoundingClientRect();
      const hot = reduce || t.top + t.height / 2 < line;
      s.classList.toggle('is-hot', hot);
      if (hot || s.getBoundingClientRect().top < innerHeight * 0.85) s.classList.add('is-seen');
    });
  };

  /* header pieno e barra mobile */
  const top = d.querySelector('[data-top]');
  const bar = d.querySelector('[data-mbar]');
  const onScroll = () => {
    const y = scrollY;
    top.classList.toggle('is-solid', y > 24);
    if (bar) bar.classList.toggle('is-visible', y > hero.offsetHeight * 0.55);
    fillCircuit();
  };
  addEventListener('scroll', onScroll, { passive: true });
  let rz;
  addEventListener('resize', () => {
    clearTimeout(rz);
    rz = setTimeout(() => { drawPipe(); onScroll(); }, 120);
  });
  onScroll();

  /* targa e passi: si accendono quando entrano */
  const once = (el, cls, threshold) => {
    if (!el) return;
    if (reduce || !('IntersectionObserver' in window)) { el.classList.add(cls); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { el.classList.add(cls); io.disconnect(); } });
    }, { threshold });
    io.observe(el);
  };
  once(d.querySelector('[data-plate]'), 'is-in', 0.4);
  once(d.querySelector('[data-steps]'), 'is-on', 0.25);

  /* menu mobile */
  const menuBtn = d.querySelector('[data-menu-btn]');
  const menu = d.getElementById('menu');
  const setMenu = (open) => {
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.querySelector('.top__menu-txt').textContent = open ? 'Chiudi' : 'Menu';
    menu.classList.toggle('is-open', open);
    root.classList.toggle('no-scroll', open);
    if (open) top.classList.add('is-solid'); else onScroll();
  };
  if (menuBtn && menu) {
    menuBtn.addEventListener('click', () => setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'));
    menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
    addEventListener('keydown', (e) => { if (e.key === 'Escape' && menu.classList.contains('is-open')) { setMenu(false); menuBtn.focus(); } });
  }

  /* modulo: compone il messaggio e apre WhatsApp o l'email */
  const form = d.querySelector('[data-form]');
  if (form) {
    const msg = form.querySelector('[data-form-msg]');
    const say = (text, kind) => { msg.textContent = text; msg.className = `form__msg is-${kind}`; };
    const valid = () => {
      const nome = form.elements.nome;
      const tel = form.elements.telefono;
      const privacy = form.elements.privacy;
      const okNome = nome.value.trim().length > 1;
      const okTel = tel.value.replace(/\D/g, '').length >= 6;
      nome.setAttribute('aria-invalid', String(!okNome));
      tel.setAttribute('aria-invalid', String(!okTel));
      privacy.closest('.check').classList.toggle('is-invalid', !privacy.checked);
      if (!okNome || !okTel) { say('Scrivi nome e telefono, così possiamo richiamarti.', 'error'); (okNome ? tel : nome).focus(); return false; }
      if (!privacy.checked) { say("Spunta la casella dell'informativa privacy per inviare la richiesta.", 'error'); privacy.focus(); return false; }
      return true;
    };
    const text = () => {
      const f = new FormData(form);
      return [
        'Buongiorno, vi scrivo dal sito per richiedere un sopralluogo.',
        `Nome: ${f.get('nome').trim()}`,
        `Telefono: ${f.get('telefono').trim()}`,
        f.get('comune') && `Comune: ${f.get('comune').trim()}`,
        f.get('intervento') && `Intervento: ${f.get('intervento')}`,
        f.get('messaggio') && `Note: ${f.get('messaggio').trim()}`,
      ].filter(Boolean).join('\n');
    };
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!valid()) return;
      window.open(`https://wa.me/${WA}?text=${encodeURIComponent(text())}`, '_blank', 'noopener');
      say('Richiesta pronta su WhatsApp: premi Invia nella chat per mandarla.', 'ok');
    });
    form.querySelector('[data-mail]').addEventListener('click', (e) => {
      e.preventDefault();
      if (!valid()) return;
      location.href = `mailto:preventivi@idrotermicamazzarolo.it?subject=${encodeURIComponent('Richiesta di sopralluogo dal sito')}&body=${encodeURIComponent(text())}`;
      say('Richiesta pronta nella tua email: premi Invia per mandarla.', 'ok');
    });
  }
})();
