(() => {
  const html = document.documentElement;
  const ridotto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* ---------- Intro: gli scuri si aprono quando la foto è pronta ---------- */
  const heroImg = $('#hero-img');
  let avviato = false;
  const avvia = () => { if (!avviato) { avviato = true; html.classList.add('avvio'); } };
  if (ridotto) avvia();
  else {
    if (heroImg.complete && heroImg.naturalWidth) setTimeout(avvia, 120);
    else heroImg.addEventListener('load', () => setTimeout(avvia, 80), { once: true });
    setTimeout(avvia, 1300);
  }

  /* ---------- Testata, parallasse ---------- */
  const testata = $('#testata');
  const hero = $('.hero');
  const heroFoto = $('.hero__foto');
  const lavoriFoto = $('.lavori__foto');
  const lavoriImg = $('.lavori__foto img');
  let inCoda = false;
  const aggiorna = () => {
    inCoda = false;
    const y = scrollY;
    const hh = hero.offsetHeight;
    testata.classList.toggle('piena', y > hh - 90);
    if (!ridotto) {
      if (y < hh) heroFoto.style.transform = `translate3d(0, ${(y * 0.3).toFixed(1)}px, 0)`;
      const r = lavoriFoto.getBoundingClientRect();
      if (r.bottom > 0 && r.top < innerHeight) {
        const p = (innerHeight - r.top) / (innerHeight + r.height); // 0 → 1
        lavoriImg.style.transform = `translate3d(0, ${(-15 * p).toFixed(2)}%, 0)`;
      }
    }
  };
  addEventListener('scroll', () => { if (!inCoda) { inCoda = true; requestAnimationFrame(aggiorna); } }, { passive: true });
  addEventListener('resize', aggiorna);
  aggiorna();

  /* ---------- Menu mobile ---------- */
  const btnMenu = $('.testata__menu');
  const menu = $('#menu');
  const chiudiMenu = () => {
    menu.hidden = true;
    btnMenu.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('menu-aperto');
  };
  btnMenu.addEventListener('click', () => {
    if (btnMenu.getAttribute('aria-expanded') === 'true') return chiudiMenu();
    menu.hidden = false;
    btnMenu.setAttribute('aria-expanded', 'true');
    document.body.classList.add('menu-aperto');
  });
  menu.addEventListener('click', e => { if (e.target.closest('a')) chiudiMenu(); });
  addEventListener('keydown', e => { if (e.key === 'Escape' && !menu.hidden) { chiudiMenu(); btnMenu.focus(); } });

  /* ---------- Abaco dei servizi ---------- */
  const voci = $$('.voce');
  voci.forEach(v => {
    const b = $('.voce__testa', v);
    b.addEventListener('click', () => {
      const eraAperta = v.classList.contains('aperta');
      voci.forEach(a => { a.classList.remove('aperta'); $('.voce__testa', a).setAttribute('aria-expanded', 'false'); });
      if (!eraAperta) {
        v.classList.add('aperta');
        b.setAttribute('aria-expanded', 'true');
        setTimeout(() => {
          const t = b.getBoundingClientRect().top;
          if (t < testata.offsetHeight + 8) scrollBy({ top: t - testata.offsetHeight - 12, behavior: ridotto ? 'auto' : 'smooth' });
        }, 520);
      }
    });
  });

  const osserva = (el, fn, opz) => {
    if (!el) return;
    if (!('IntersectionObserver' in window)) return fn();
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { io.disconnect(); fn(); } }), opz);
    io.observe(el);
  };
  const abaco = $('#abaco');
  osserva(abaco, () => abaco.classList.add('traccia'), { threshold: 0.12 });

  /* ---------- Finestra 3D (caricata solo vicino alla sezione) ---------- */
  const scena = $('#scena3d');
  let essenza = 'larice';
  const scelte = $$('.essenze__scelta [role="radio"]');
  const scegli = btn => {
    scelte.forEach(x => { x.setAttribute('aria-checked', String(x === btn)); x.tabIndex = x === btn ? 0 : -1; });
    essenza = btn.dataset.essenza;
    scena.dataset.essenza = essenza;
    if (window.carmas3d) window.carmas3d.essenza(essenza);
  };
  scelte.forEach((b, i) => {
    b.tabIndex = i === 0 ? 0 : -1;
    b.addEventListener('click', () => scegli(b));
    b.addEventListener('keydown', e => {
      const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
      if (!d) return;
      e.preventDefault();
      const n = scelte[(i + d + scelte.length) % scelte.length];
      n.focus(); scegli(n);
    });
  });
  scena.dataset.essenza = essenza;
  let caricato = false;
  const carica3d = () => {
    if (caricato) return;
    caricato = true;
    import('./3d.js')
      .then(m => m.avvia(scena, $('#legno')))
      .catch(err => { console.warn('3D non disponibile', err); scena.classList.add('senza3d'); });
  };
  osserva(scena, carica3d, { rootMargin: '900px 0px' });

  /* ---------- Prima e dopo ---------- */
  const confronti = $$('.confronto');
  const anima = (c, tappe, durata) => {
    if (ridotto || c._toccato) return;
    const t0 = performance.now();
    const passo = () => {
      if (c._toccato) return;
      const k = Math.min(1, (performance.now() - t0) / durata);
      const n = tappe.length - 1;
      const i = Math.min(n - 1, Math.floor(k * n));
      const f = k * n - i;
      const e = f < .5 ? 4 * f * f * f : 1 - Math.pow(-2 * f + 2, 3) / 2;
      c._imposta(tappe[i] + (tappe[i + 1] - tappe[i]) * e);
      if (k < 1) requestAnimationFrame(passo);
    };
    requestAnimationFrame(passo);
  };
  confronti.forEach(c => {
    const m = $('.confronto__maniglia', c);
    let pos = 50, trascina = false;
    c._imposta = p => {
      pos = Math.max(0, Math.min(100, p));
      c.style.setProperty('--pos', pos.toFixed(2) + '%');
      m.setAttribute('aria-valuenow', String(Math.round(pos)));
    };
    const daEvento = e => { const r = c.getBoundingClientRect(); c._imposta((e.clientX - r.left) / r.width * 100); };
    c.addEventListener('pointerdown', e => {
      c._toccato = true; trascina = true;
      if (e.pointerType !== 'touch') { c.setPointerCapture(e.pointerId); daEvento(e); }
    });
    c.addEventListener('pointermove', e => { if (trascina) daEvento(e); });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(t => c.addEventListener(t, () => { trascina = false; }));
    m.addEventListener('keydown', e => {
      const k = { ArrowLeft: -5, ArrowDown: -5, ArrowRight: 5, ArrowUp: 5, Home: -100, End: 100 }[e.key];
      if (k === undefined) return;
      e.preventDefault(); c._toccato = true; c._imposta(pos + k);
    });
  });
  const tappe = [50, 84, 16, 50];
  osserva($('.confronti'), () => anima(confronti.find(c => !c.hidden), tappe, 2600), { threshold: 0.45 });

  const schede = $$('.schede [role="tab"]');
  const mostra = t => {
    schede.forEach(x => {
      const sel = x === t;
      x.setAttribute('aria-selected', String(sel));
      x.tabIndex = sel ? 0 : -1;
      $('#' + x.getAttribute('aria-controls')).hidden = !sel;
    });
    const c = $('#' + t.getAttribute('aria-controls'));
    c._toccato = false; c._imposta(50);
    anima(c, tappe, 2200);
  };
  schede.forEach((t, i) => {
    t.addEventListener('click', () => mostra(t));
    t.addEventListener('keydown', e => {
      const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!d) return;
      const n = schede[(i + d + schede.length) % schede.length];
      n.focus(); mostra(n);
    });
  });

  /* ---------- CAR.MAS → Carraretto e Massetto ---------- */
  const sigla = $('.sigla');
  const misura = () => $$('.sigla__resto', sigla).forEach(r => {
    const fs = parseFloat(getComputedStyle(r).fontSize) || 16;
    r.style.setProperty('--w', (r.scrollWidth / fs + 0.04).toFixed(3) + 'em');
  });
  misura();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(misura).catch(() => {});
  osserva(sigla, () => setTimeout(() => sigla.classList.add('apri'), ridotto ? 0 : 250), { threshold: 0.6 });

  /* ---------- Modulo → WhatsApp ---------- */
  const modulo = $('#modulo');
  const nota = $('#modulo-nota');
  modulo.addEventListener('submit', e => {
    e.preventDefault();
    const nome = modulo.nome.value.trim();
    if (!nome) {
      modulo.nome.classList.add('errore');
      modulo.nome.focus();
      nota.textContent = 'Scrivi il tuo nome, così sappiamo chi ci scrive.';
      return;
    }
    modulo.nome.classList.remove('errore');
    const comune = modulo.comune.value.trim();
    const cosa = $$('input[name="cosa"]:checked', modulo).map(i => i.value);
    const msg = modulo.messaggio.value.trim();
    let t = `Buongiorno Car.Mas, sono ${nome}`;
    if (comune) t += ` di ${comune}`;
    t += '. Vorrei chiedere un sopralluogo';
    if (cosa.length) t += ` per: ${cosa.join(', ')}`;
    t += '.';
    if (msg) t += `\n\n${msg}`;
    const url = 'https://wa.me/393270804467?text=' + encodeURIComponent(t);
    const w = window.open(url, '_blank');
    if (w) w.opener = null; else location.href = url;
    nota.textContent = 'Ti abbiamo aperto WhatsApp con il messaggio pronto: ora premi invia.';
  });
  modulo.nome.addEventListener('input', () => modulo.nome.classList.remove('errore'));
})();
