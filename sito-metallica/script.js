(() => {
  const d = document, html = d.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* anno nel footer */
  const anno = d.getElementById('anno');
  if (anno) anno.textContent = new Date().getFullYear();

  /* header: trasparente sull'hero, pieno dopo */
  const hd = d.getElementById('hd');
  const onScroll = () => hd.classList.toggle('is-solid', scrollY > 40);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* menu mobile */
  const burger = d.querySelector('.burger'), menu = d.getElementById('menu');
  const setMenu = open => {
    burger.setAttribute('aria-expanded', String(open));
    burger.querySelector('.burger__txt').textContent = open ? 'Chiudi' : 'Menu';
    menu.hidden = !open;
    hd.classList.toggle('is-open', open);
    d.body.style.overflow = open ? 'hidden' : '';
  };
  burger.addEventListener('click', () => setMenu(menu.hidden));
  menu.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
  addEventListener('keydown', e => { if (e.key === 'Escape' && !menu.hidden) { setMenu(false); burger.focus(); } });

  /* i link "Chiedi un preventivo" scelgono già il tipo di lavoro */
  const tipo = d.getElementById('f-tipo');
  d.querySelectorAll('[data-tipo]').forEach(a => a.addEventListener('click', () => { tipo.value = a.dataset.tipo; }));

  /* linee di quota e lamiere che si disegnano quando entrano in vista */
  const draws = d.querySelectorAll('.draw');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
    }), { threshold: .35 });
    draws.forEach(el => io.observe(el));
  } else draws.forEach(el => el.classList.add('is-in'));

  /* indice dei lavori: su desktop la foto a destra segue il progetto al centro dello schermo */
  const items = [...d.querySelectorAll('.idx__it')];
  const frames = [...d.querySelectorAll('.idx__frame img')];
  const wide = matchMedia('(min-width: 1000px)');
  let cur = -1, z = 1;
  const show = i => {
    if (i === cur || !frames[i]) return;
    items.forEach((it, k) => it.classList.toggle('is-on', k === i));
    const f = frames[i];
    f.classList.add('is-first'); f.classList.remove('is-on');
    void f.offsetWidth;
    f.classList.remove('is-first');
    f.style.zIndex = ++z;
    f.classList.add('is-on');
    cur = i;
  };
  if (items.length && 'IntersectionObserver' in window) {
    frames[0].classList.add('is-on', 'is-first'); items[0].classList.add('is-on'); cur = 0;
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting && wide.matches) show(+e.target.dataset.i);
    }), { rootMargin: '-46% 0px -46% 0px' });
    items.forEach(it => io.observe(it));
  }

  /* barra mobile: si toglie quando il form è sullo schermo */
  const mbar = d.querySelector('.mbar'), pre = d.getElementById('preventivo');
  if (mbar && pre && 'IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => mbar.classList.toggle('is-away', e.isIntersecting), { rootMargin: '0px 0px -30% 0px' }).observe(pre);
  }

  /* form: compone l'email con i campi e apre il programma di posta */
  const form = d.getElementById('form');
  if (form) form.addEventListener('submit', e => {
    e.preventDefault();
    const v = n => form.elements[n].value.trim();
    const err = d.getElementById('form-err'), ok = d.getElementById('form-ok');
    const missing = ['nome', 'telefono'].map(n => form.elements[n]).filter(el => {
      const bad = !el.value.trim();
      el.setAttribute('aria-invalid', String(bad));
      return bad;
    });
    if (missing.length) {
      err.textContent = 'Scrivi nome e telefono: ci servono per richiamarti.';
      err.hidden = false; ok.hidden = true;
      missing[0].focus();
      return;
    }
    err.hidden = true;
    const righe = ['Buongiorno,', 'vorrei un preventivo per questo lavoro.', '', 'Tipo di lavoro: ' + v('tipo')];
    if (v('luogo')) righe.push('Cantiere: ' + v('luogo'));
    if (v('messaggio')) righe.push('', v('messaggio'));
    righe.push('', v('nome') + (v('azienda') ? ' (' + v('azienda') + ')' : ''), 'Telefono: ' + v('telefono'));
    if (v('email')) righe.push('Email: ' + v('email'));
    const oggetto = 'Richiesta preventivo: ' + v('tipo') + ' - ' + v('nome');
    location.href = 'mailto:info@metallicasrl.net?subject=' + encodeURIComponent(oggetto) + '&body=' + encodeURIComponent(righe.join('\n'));
    ok.hidden = false;
  });

  /* hero: il titolo viene tagliato al plasma, con torcia e scintille */
  const hero = d.querySelector('.hero');
  const lines = [...d.querySelectorAll('.hero__title .cut > span')];
  const torch = d.querySelector('.torch');
  const cv = d.querySelector('.hero__sparks');
  const finish = () => {
    html.classList.remove('cut-hot');
    html.classList.add('cut-done');
    lines.forEach(l => { l.style.clipPath = ''; });
    if (torch) torch.style.opacity = 0;
  };
  if (reduce || !cv || !cv.getContext || !lines.length) { finish(); return; }

  html.classList.add('cut-hot');
  const ctx = cv.getContext('2d');
  let W = 0, H = 0;
  const size = () => {
    const r = hero.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
    W = r.width; H = r.height;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  size();
  addEventListener('resize', size);

  const parts = [];
  const spark = (x, y) => {
    const life = .28 + Math.random() * .62;
    return {
      x, y, life, max: life,
      vx: (Math.random() - .64) * 980,
      vy: (Math.random() - .72) * 760,
      hue: 28 + Math.random() * 24,
      l: 58 + Math.random() * 34,
      w: Math.random() < .18 ? 2.2 : 1.2
    };
  };

  const go = () => {
    const hr = hero.getBoundingClientRect();
    const segs = lines.map(el => {
      const r = el.getBoundingClientRect();
      return { el, x: r.left - hr.left, y: r.top - hr.top, w: r.width, h: r.height };
    });
    const speed = Math.max(520, Math.min(1150, W * .85));
    let acc = .2;
    segs.forEach(s => { s.d = Math.min(1, Math.max(.5, s.w / speed)); s.t = acc; acc += s.d + .14; });
    const end = acc + .7;
    const rate = W < 700 ? 520 : 900;
    let t0 = null, last = 0;

    const frame = now => {
      if (t0 === null) { t0 = now; last = now; }
      const t = (now - t0) / 1000, dt = Math.min(.05, Math.max(0, (now - last) / 1000));
      last = now;
      let at = null;
      segs.forEach(s => {
        const p = Math.min(1, Math.max(0, (t - s.t) / s.d));
        s.el.style.clipPath = p >= 1 ? 'inset(-20% -6% -20% 0)' : 'inset(-20% ' + ((1 - p) * 100).toFixed(2) + '% -20% 0)';
        const cool = Math.min(1, Math.max(0, (t - s.t - s.d) / .6));
        s.el.style.setProperty('--h', (p < 1 ? p * 100 : 100 + cool * 45).toFixed(1) + '%');
        if (p > 0 && p < 1) at = { x: s.x + s.w * p, y: s.y + s.h * .5 };
      });

      if (at) {
        torch.style.opacity = 1;
        torch.style.transform = 'translate(' + at.x.toFixed(1) + 'px,' + at.y.toFixed(1) + 'px)';
        const n = Math.min(40, Math.round(dt * rate));
        for (let i = 0; i < n && parts.length < 700; i++) parts.push(spark(at.x, at.y));
      } else torch.style.opacity = 0;

      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      for (let i = parts.length - 1; i >= 0; i--) {
        const q = parts[i];
        q.life -= dt;
        if (q.life <= 0) { parts.splice(i, 1); continue; }
        q.vy += 1700 * dt;
        q.vx *= 1 - .7 * dt;
        q.x += q.vx * dt; q.y += q.vy * dt;
        const a = Math.min(1, (q.life / q.max) * 1.5);
        ctx.strokeStyle = 'hsla(' + q.hue + ',100%,' + q.l + '%,' + a.toFixed(3) + ')';
        ctx.lineWidth = q.w;
        ctx.beginPath();
        ctx.moveTo(q.x - q.vx * .014, q.y - q.vy * .014);
        ctx.lineTo(q.x, q.y);
        ctx.stroke();
      }

      if (t < end || parts.length) requestAnimationFrame(frame);
      else { ctx.clearRect(0, 0, W, H); finish(); }
    };
    requestAnimationFrame(frame);
  };

  const fonts = d.fonts && d.fonts.ready ? d.fonts.ready : Promise.resolve();
  Promise.race([fonts, new Promise(r => setTimeout(r, 1500))]).then(() => requestAnimationFrame(go));
})();
