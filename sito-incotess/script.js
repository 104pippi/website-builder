(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const desktop = matchMedia('(min-width: 900px)');
  const body = document.body;

  $$('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });

  /* ---------- Apertura: i rotoli si srotolano quando le prime foto sono pronte ---------- */
  const firstImgs = $$('.rotolo img').slice(0, 3);
  const ready = Promise.all(firstImgs.map((img) => (img.decode ? img.decode().catch(() => {}) : Promise.resolve())));
  const timeout = new Promise((r) => setTimeout(r, 900));
  Promise.race([ready, timeout]).then(() => requestAnimationFrame(() => body.classList.add('is-loaded')));

  /* ---------- Parallasse dei rotoli ---------- */
  const hero = $('.hero');
  const strips = $$('.rotolo');
  let ticking = false;
  const parallax = () => {
    ticking = false;
    const y = window.scrollY;
    if (!hero || y > hero.offsetHeight + 200) return;
    strips.forEach((fig) => {
      const k = parseFloat(fig.style.getPropertyValue('--k')) || 0.1;
      const room = fig.offsetHeight * 0.11;
      const shift = Math.min(y * k * (desktop.matches ? 0.55 : 0.4), room);
      fig.firstElementChild.style.translate = `0 ${shift.toFixed(1)}px`;
    });
  };
  if (!reduce) {
    window.addEventListener('scroll', () => {
      if (!ticking) { ticking = true; requestAnimationFrame(parallax); }
    }, { passive: true });
  }

  /* ---------- Menu mobile ---------- */
  const burger = $('.burger');
  const nav = $('#nav');
  const closeNav = () => { nav.classList.remove('is-open'); burger.setAttribute('aria-expanded', 'false'); burger.setAttribute('aria-label', 'Apri il menu'); };
  burger.addEventListener('click', () => {
    const open = !nav.classList.contains('is-open');
    nav.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Chiudi il menu' : 'Apri il menu');
  });
  $$('a', nav).forEach((a) => a.addEventListener('click', closeNav));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeNav(); });

  /* ---------- Barra fissa su mobile ---------- */
  const barra = $('.barra');
  const heroCtas = $('.hero__ctas');
  if ('IntersectionObserver' in window && heroCtas) {
    new IntersectionObserver(([en]) => barra.classList.toggle('is-on', !en.isIntersecting), { threshold: 0 }).observe(heroCtas);
  } else {
    barra.classList.add('is-on');
  }

  /* ---------- Reveal ---------- */
  const wipes = $$('.wipe, .draw');
  if ('IntersectionObserver' in window) {
    // Chrome conta il clip-path del bersaglio: per i .wipe si osserva il contenitore
    const owner = new Map();
    const io = new IntersectionObserver((ens) => ens.forEach((en) => {
      if (en.isIntersecting) { owner.get(en.target).classList.add('is-in'); io.unobserve(en.target); }
    }), { threshold: 0.2 });
    wipes.forEach((w) => {
      const trigger = w.classList.contains('wipe') ? w.parentElement : w;
      owner.set(trigger, w);
      io.observe(trigger);
    });
  } else {
    wipes.forEach((w) => w.classList.add('is-in'));
  }

  /* ---------- Toast ---------- */
  const toast = $('[data-toast]');
  let toastT;
  const say = (msg) => {
    toast.textContent = msg;
    toast.classList.add('is-on');
    clearTimeout(toastT);
    toastT = setTimeout(() => toast.classList.remove('is-on'), 2400);
  };

  /* ---------- Lista preventivo ---------- */
  const KEY = 'incotess-preventivo';
  let items = [];
  try { items = JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { items = []; }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(items)); } catch (e) { /* storage non disponibile */ } };

  const lista = $('[data-lista]');
  const listaEmpty = $('[data-lista-empty]');
  const counts = $$('[data-count]');
  const addBtns = $$('.add');

  const render = () => {
    lista.innerHTML = '';
    items.forEach((it) => {
      const li = document.createElement('li');
      const th = document.createElement('i');
      th.className = 'lista__thumb';
      if (it.img) th.style.backgroundImage = `url('${it.img}')`;
      if (it.color) th.style.setProperty('--c', it.color);
      const tx = document.createElement('span');
      tx.textContent = it.label;
      const rm = document.createElement('button');
      rm.type = 'button';
      rm.className = 'lista__rm';
      rm.setAttribute('aria-label', `Togli dalla richiesta: ${it.label}`);
      rm.innerHTML = '<svg viewBox="0 0 14 14" aria-hidden="true"><path d="M2 2l10 10M12 2L2 12"/></svg>';
      rm.addEventListener('click', () => toggle(it));
      li.append(th, tx, rm);
      lista.append(li);
    });
    listaEmpty.hidden = items.length > 0;
    counts.forEach((c) => { c.textContent = items.length; c.hidden = items.length === 0; });
    addBtns.forEach((b) => {
      const on = items.some((it) => it.key === b.dataset.add);
      b.setAttribute('aria-pressed', String(on));
      $('.add__t', b).textContent = on ? 'Aggiunto' : 'Aggiungi';
      b.setAttribute('aria-label', `${on ? 'Togli dal preventivo' : 'Aggiungi al preventivo'}: ${b.dataset.add}`);
    });
  };

  const fly = (fromEl, it) => {
    const target = desktop.matches ? $('.top__cta') : $('.barra__pv');
    if (!desktop.matches) barra.classList.add('is-on');
    const bump = () => counts.forEach((c) => { c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump'); });
    if (reduce || !fromEl || !target || !fromEl.animate) { bump(); return; }
    const a = fromEl.getBoundingClientRect();
    const b = target.getBoundingClientRect();
    const x0 = a.left + a.width / 2;
    const y0 = a.top + a.height / 2;
    const dx = b.left + b.width / 2 - x0;
    const dy = b.top + b.height / 2 - y0;
    const dot = document.createElement('div');
    dot.className = 'fly';
    dot.style.left = `${x0}px`;
    dot.style.top = `${y0}px`;
    if (it.img) dot.style.backgroundImage = `url('${it.img}')`;
    if (it.color) dot.style.setProperty('--c', it.color);
    body.append(dot);
    const lift = Math.min(160, Math.abs(dy) * 0.35 + 60);
    dot.animate([
      { transform: 'translate(0, 0) scale(.6)', opacity: 0 },
      { transform: `translate(${dx * 0.18}px, ${dy * 0.18 - lift * 0.6}px) scale(1.15)`, opacity: 1, offset: 0.25 },
      { transform: `translate(${dx * 0.6}px, ${dy * 0.6 - lift}px) scale(.9)`, offset: 0.6 },
      { transform: `translate(${dx}px, ${dy}px) scale(.3)`, opacity: 0.4 }
    ], { duration: 820, easing: 'cubic-bezier(.45,0,.25,1)' }).onfinish = () => { dot.remove(); bump(); };
  };

  function toggle(it, fromEl) {
    const i = items.findIndex((x) => x.key === it.key);
    if (i > -1) {
      items.splice(i, 1);
      say(`Tolto dalla richiesta: ${it.label}`);
    } else {
      items.push(it);
      fly(fromEl, it);
      say(`Aggiunto alla richiesta: ${it.label}`);
    }
    save();
    render();
  }

  addBtns.forEach((b) => b.addEventListener('click', () => {
    const card = b.closest('.card');
    toggle({ key: b.dataset.add, label: b.dataset.add, img: b.dataset.img }, $('.card__img', card) || b);
  }));

  render();

  /* ---------- Cartella colori panno lenci ---------- */
  const chips = $$('.chip');
  const big = $('[data-swatch-big]');
  const swCode = $('[data-sw-code]');
  const swName = $('[data-sw-name]');
  let current = chips.find((c) => c.getAttribute('aria-checked') === 'true') || chips[0];

  const pick = (chip, focus) => {
    if (!chip || chip === current) return;
    current.setAttribute('aria-checked', 'false');
    current.tabIndex = -1;
    chip.setAttribute('aria-checked', 'true');
    chip.tabIndex = 0;
    if (focus) chip.focus();
    current = chip;
    const color = chip.style.getPropertyValue('--c');
    const layer = document.createElement('div');
    layer.className = 'swatch-big__layer';
    layer.style.setProperty('--sw', color);
    layer.style.backgroundImage = `url('assets/img/pl/${chip.dataset.img}')`;
    big.insertBefore(layer, $('.swatch-tag', big));
    void layer.offsetWidth;
    layer.classList.add('is-on');
    const old = $$('.swatch-big__layer', big).slice(0, -1);
    setTimeout(() => old.forEach((o) => o.remove()), reduce ? 0 : 800);
    swCode.textContent = chip.dataset.code;
    swName.textContent = chip.dataset.name;
  };

  chips.forEach((c, i) => {
    c.addEventListener('click', () => pick(c));
    c.addEventListener('keydown', (e) => {
      const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      if (!step) return;
      e.preventDefault();
      pick(chips[(i + step + chips.length) % chips.length], true);
    });
  });

  const ART_PEZZA = { '5 m': '1040', '10 m': '1049', '30 m': '1041' };
  $('[data-pl-add]').addEventListener('click', (e) => {
    const pezza = ($('input[name="pezza"]:checked') || {}).value || '10 m';
    const code = current.dataset.code;
    const name = current.dataset.name;
    const label = `Art. ${ART_PEZZA[pezza]}, Panno lenci unito, col. ${code} ${name}, pezza da ${pezza}`;
    const key = `pl-${code}-${pezza}`;
    if (items.some((x) => x.key === key)) { say(`Già nella richiesta: col. ${code} ${name}, pezza da ${pezza}`); return; }
    toggle({ key, label, color: current.style.getPropertyValue('--c'), img: `assets/img/pl/${current.dataset.img}` }, big || e.currentTarget);
  });

  /* ---------- Tab del catalogo ---------- */
  const tabs = $$('.tab');
  const tabBar = $('.tabs');
  const panels = tabs.map((t) => document.getElementById(t.getAttribute('aria-controls')));

  const showTab = (tab, opts = {}) => {
    tabs.forEach((t, i) => {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      panels[i].hidden = !on;
    });
    const panel = document.getElementById(tab.getAttribute('aria-controls'));
    tab.scrollIntoView({ block: 'nearest', inline: 'center', behavior: reduce ? 'auto' : 'smooth' });
    if (opts.focus) tab.focus();
    if (!reduce && panel.animate) {
      $$('.card', panel).slice(0, 12).forEach((card, i) => card.animate(
        [{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'none' }],
        { duration: 480, delay: i * 40, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' }
      ));
    }
    if (opts.scroll && tabBar.classList.contains('is-stuck')) {
      const top = panel.getBoundingClientRect().top + window.scrollY - tabBar.offsetHeight - parseInt(getComputedStyle(document.documentElement).getPropertyValue('--top-h'), 10);
      window.scrollTo({ top, behavior: reduce ? 'auto' : 'smooth' });
    }
  };

  tabs.forEach((t, i) => {
    t.addEventListener('click', () => showTab(t, { scroll: true }));
    t.addEventListener('keydown', (e) => {
      const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
      if (e.key === 'Home') { e.preventDefault(); showTab(tabs[0], { focus: true }); }
      if (e.key === 'End') { e.preventDefault(); showTab(tabs[tabs.length - 1], { focus: true }); }
      if (!step) return;
      e.preventDefault();
      showTab(tabs[(i + step + tabs.length) % tabs.length], { focus: true });
    });
  });

  const stuck = () => {
    const topH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--top-h'), 10) || 64;
    tabBar.classList.toggle('is-stuck', tabBar.getBoundingClientRect().top <= topH + 1);
  };
  window.addEventListener('scroll', stuck, { passive: true });

  /* Cartellini sui rotoli: aprono l'articolo nel catalogo */
  $$('[data-goto]').forEach((a) => a.addEventListener('click', (e) => {
    const card = document.getElementById(`art-${a.dataset.goto}`);
    if (!card) return;
    e.preventDefault();
    const panel = card.closest('.panel');
    const tab = tabs.find((t) => t.getAttribute('aria-controls') === panel.id);
    if (tab) showTab(tab);
    requestAnimationFrame(() => {
      card.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      card.classList.remove('is-flash');
      void card.offsetWidth;
      card.classList.add('is-flash');
    });
  }));

  /* ---------- Form preventivo: compone l'email ---------- */
  const form = $('#form-preventivo');
  const err = $('[data-form-err]');
  const ok = $('[data-form-ok]');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = form.elements;
    const req = [f.azienda, f.nome, f.email];
    let bad = null;
    req.forEach((el) => {
      const invalid = !el.value.trim() || (el.type === 'email' && !/^\S+@\S+\.\S+$/.test(el.value.trim()));
      el.setAttribute('aria-invalid', String(invalid));
      if (invalid && !bad) bad = el;
    });
    if (bad) {
      err.textContent = bad === f.email && f.email.value.trim()
        ? 'Controlla l\'email: manca la @ o il dominio.'
        : 'Compila ragione sociale, nome e email per inviare la richiesta.';
      err.hidden = false;
      bad.focus();
      return;
    }
    err.hidden = true;
    const righe = [
      'Richiesta di preventivo dal sito',
      '',
      `Ragione sociale: ${f.azienda.value.trim()}`,
      `Referente: ${f.nome.value.trim()}`,
      `Email: ${f.email.value.trim()}`,
      f.telefono.value.trim() && `Telefono: ${f.telefono.value.trim()}`,
      f.attivita.value && `Attività: ${f.attivita.value}`,
      f.citta.value.trim() && `Città: ${f.citta.value.trim()}`,
      '',
      items.length ? 'Articoli:' : '',
      ...items.map((it) => `- ${it.label}`),
      '',
      f.messaggio.value.trim() && `Messaggio:\n${f.messaggio.value.trim()}`
    ].filter((r) => r !== false && r !== null && r !== undefined);
    const subject = `Richiesta preventivo: ${f.azienda.value.trim()}`;
    const href = `mailto:info@incotess.it?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(righe.join('\n').replace(/\n{3,}/g, '\n\n'))}`;
    ok.hidden = false;
    window.location.href = href;
  });
  $$('input', form).forEach((el) => el.addEventListener('input', () => el.removeAttribute('aria-invalid')));
})();
