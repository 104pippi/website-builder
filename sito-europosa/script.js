(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const calmo = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Anni di attività e anno nel footer
  const oggi = new Date().getFullYear();
  $$('[data-anni]').forEach(el => { el.textContent = oggi - 1997; });
  const anno = $('#anno');
  if (anno) anno.textContent = oggi;

  // Header e menu mobile
  const top = $('#top-bar');
  const burger = $('.burger');
  const onScrollTop = () => top.classList.toggle('solid', scrollY > 30);
  onScrollTop();
  addEventListener('scroll', onScrollTop, { passive: true });
  const chiudiMenu = () => {
    document.body.classList.remove('menu-open');
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', 'Apri il menu');
  };
  burger.addEventListener('click', () => {
    const aperto = document.body.classList.toggle('menu-open');
    burger.setAttribute('aria-expanded', String(aperto));
    burger.setAttribute('aria-label', aperto ? 'Chiudi il menu' : 'Apri il menu');
  });
  $$('#nav a').forEach(a => a.addEventListener('click', chiudiMenu));
  addEventListener('keydown', e => { if (e.key === 'Escape') chiudiMenu(); });

  // Hero: la foto del porfido si compone tessera per tessera, ad archi, come una posa vera
  const hero = $('.hero');
  const media = $('.hero-media');
  const tessere = $('.hero-tiles');
  const foto = $('.hero-img');
  let posata = false;
  const finePosa = () => {
    if (posata) return;
    posata = true;
    hero.classList.add('is-laid');
    setTimeout(() => tessere.remove(), 1400);
  };
  const posa = () => {
    if (calmo) return finePosa();
    const W = media.clientWidth, H = media.clientHeight;
    const lato = W < 700 ? 40 : W < 1200 ? 56 : 64;
    const cols = Math.ceil(W / lato), righe = Math.ceil(H / lato);
    const k = Math.max(W / 1024, H / 768);
    const bw = 1024 * k, bh = 768 * k, ox = (W - bw) / 2, oy = (H - bh) / 2;
    const cx = W / 2, cy = H * 1.08;
    const rMax = Math.hypot(Math.max(cx, W - cx), cy);
    const fascia = lato * 1.5;
    const src = foto.currentSrc || foto.src;
    const frag = document.createDocumentFragment();
    let ultima = 0;
    for (let r = 0; r < righe; r++) {
      for (let c = 0; c < cols; c++) {
        const x = c * lato, y = r * lato;
        const dx = x + lato / 2 - cx, dy = y + lato / 2 - cy;
        const dist = Math.hypot(dx, dy);
        let ang = (Math.atan2(dy, dx) + Math.PI) / Math.PI;
        if (Math.floor(dist / fascia) % 2) ang = 1 - ang; // il posatore va avanti e indietro, arco dopo arco
        const d = (dist / rMax) * 1150 + ang * 240 + Math.random() * 70;
        const t = document.createElement('i');
        t.className = 'tile';
        t.style.cssText =
          `left:${x + 1}px;top:${y + 1}px;width:${lato - 2}px;height:${lato - 2}px;` +
          `background-image:url("${src}");background-size:${bw}px ${bh}px;` +
          `background-position:${ox - x - 1}px ${oy - y - 1}px;` +
          `--d:${d | 0}ms;--rot:${(Math.random() * 10 - 5).toFixed(1)}deg`;
        frag.appendChild(t);
        ultima = Math.max(ultima, d);
      }
    }
    tessere.appendChild(frag);
    setTimeout(finePosa, ultima + 700);
  };
  if (foto.complete && foto.naturalWidth) posa();
  else {
    foto.addEventListener('load', posa, { once: true });
    foto.addEventListener('error', finePosa, { once: true });
  }
  setTimeout(finePosa, 4500);

  // Rivelazione delle foto allo scroll
  const rv = $$('.rv');
  if ('IntersectionObserver' in window && !calmo) {
    const io = new IntersectionObserver(voci => voci.forEach(v => {
      if (v.isIntersecting) { v.target.classList.add('in'); io.unobserve(v.target); }
    }), { threshold: 0, rootMargin: '0px 0px 4% 0px' });
    rv.forEach(el => io.observe(el));
  } else rv.forEach(el => el.classList.add('in'));

  // Metodo: la sezione stradale si costruisce fase dopo fase
  const box = $('.strato-box');
  const strati = $$('.strato .l');
  const fasi = $$('.fase');
  const didascalia = $('.strato-cap');
  const nomi = ['', 'scavo e sbancamento', 'sottofondo e rullatura', 'cordoli e sottoservizi', 'posa e boiaccatura'];
  const setFase = n => {
    box.dataset.fase = n;
    strati.forEach((l, i) => l.classList.toggle('on', i < n));
    fasi.forEach(f => f.classList.toggle('attiva', +f.dataset.fase === n));
    didascalia.textContent = `Fase ${n} di 4: ${nomi[n]}`;
  };
  if ('IntersectionObserver' in window && !calmo) {
    const ioF = new IntersectionObserver(voci => voci.forEach(v => {
      if (v.isIntersecting) setFase(+v.target.dataset.fase);
    }), { rootMargin: '-48% 0px -42% 0px' });
    fasi.forEach(f => ioF.observe(f));
  } else {
    strati.forEach(l => l.classList.add('on'));
    fasi.forEach(f => f.classList.add('attiva'));
  }

  // Motto: le tre parole scorrono in direzioni opposte con lo scroll
  const motto = $('.motto');
  const parole = $$('.motto-w');
  let mottoVisibile = false, rafM = 0;
  const muoviMotto = () => {
    rafM = 0;
    const r = motto.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (innerHeight - r.top) / (innerHeight + r.height)));
    parole.forEach(w => { w.style.transform = `translate3d(${(+w.dataset.dir) * (.5 - p) * 36}vw,0,0)`; });
  };
  if (!calmo) {
    new IntersectionObserver(v => { mottoVisibile = v[0].isIntersecting; if (mottoVisibile) muoviMotto(); }).observe(motto);
    addEventListener('scroll', () => { if (mottoVisibile && !rafM) rafM = requestAnimationFrame(muoviMotto); }, { passive: true });
    muoviMotto();
  }

  // Cantieri: filtri, "mostra tutti" e lightbox
  const galleria = $('#galleria');
  const foto_g = $$('.g', galleria);
  const filtri = $$('.filtri button');
  const altri = $('#altri');
  let filtro = 'tutti', espanso = false;
  const applica = (anima = true) => {
    foto_g.forEach(g => {
      const ok = filtro === 'tutti' ? (espanso || !g.classList.contains('extra')) : g.dataset.cat === filtro;
      if (ok && g.hidden) {
        g.hidden = false;
        if (anima && !calmo) { g.classList.remove('appare'); void g.offsetWidth; g.classList.add('appare'); }
      } else if (!ok) g.hidden = true;
    });
    altri.hidden = filtro !== 'tutti' || espanso;
    filtri.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.f === filtro)));
  };
  foto_g.forEach(g => { if (g.classList.contains('extra')) g.hidden = true; });
  applica(false);
  filtri.forEach(b => b.addEventListener('click', () => { filtro = b.dataset.f; applica(); }));
  altri.addEventListener('click', () => { espanso = true; applica(); });
  $$('[data-vai]').forEach(b => b.addEventListener('click', () => {
    filtro = b.dataset.vai;
    applica();
    $('#cantieri').scrollIntoView({ behavior: calmo ? 'auto' : 'smooth' });
  }));

  const lb = $('#lb'), lbImg = $('#lb-img'), lbCap = $('#lb-cap');
  let lista = [], idx = 0;
  const mostra = i => {
    idx = (i + lista.length) % lista.length;
    const img = $('img', lista[idx]);
    lbImg.src = img.currentSrc || img.src;
    lbImg.alt = img.alt;
    lbCap.textContent = img.alt;
  };
  foto_g.forEach(g => g.addEventListener('click', () => {
    lista = foto_g.filter(x => !x.hidden);
    mostra(lista.indexOf(g));
    if (typeof lb.showModal === 'function') lb.showModal(); else lb.setAttribute('open', '');
  }));
  lb.addEventListener('click', e => {
    const a = e.target.dataset && e.target.dataset.lb;
    if (a === 'prev') mostra(idx - 1);
    else if (a === 'next') mostra(idx + 1);
    else if (a === 'chiudi' || e.target === lb) lb.close();
  });
  lb.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') mostra(idx - 1);
    if (e.key === 'ArrowRight') mostra(idx + 1);
  });
  let x0 = null;
  lb.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', e => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 50) mostra(idx + (dx < 0 ? 1 : -1));
    x0 = null;
  });

  // Link che precompilano il tipo di lavoro nel form
  const selTipo = $('#f-tipo');
  $$('[data-tipo]').forEach(a => a.addEventListener('click', () => { selTipo.value = a.dataset.tipo; }));

  // Form: compone il messaggio e apre WhatsApp o l'email
  const form = $('#form-preventivo');
  const err = $('#form-err');
  form.addEventListener('submit', e => {
    e.preventDefault();
    const via = (e.submitter && e.submitter.dataset.via) || 'wa';
    const f = form.elements;
    const mancano = [];
    [['nome', 'nome e cognome'], ['telefono', 'telefono'], ['tipo', 'tipo di lavoro']].forEach(([n, etichetta]) => {
      const vuoto = !f[n].value.trim();
      f[n].classList.toggle('errato', vuoto);
      if (vuoto) mancano.push(etichetta);
    });
    if (!f.privacy.checked) mancano.push("consenso sull'informativa privacy");
    if (mancano.length) {
      err.textContent = `Manca: ${mancano.join(', ')}.`;
      err.hidden = false;
      return;
    }
    err.hidden = true;
    const righe = [
      'Richiesta di preventivo dal sito',
      `Nome: ${f.nome.value.trim()}`,
      `Telefono: ${f.telefono.value.trim()}`,
      f.ente.value.trim() && `Ente o azienda: ${f.ente.value.trim()}`,
      `Lavoro: ${f.tipo.value}`,
      f.luogo.value.trim() && `Comune del cantiere: ${f.luogo.value.trim()}`,
      f.messaggio.value.trim() && `Dettagli: ${f.messaggio.value.trim()}`,
    ].filter(Boolean);
    const testo = righe.join('\n');
    if (via === 'mail') {
      location.href = `mailto:info@europosa.eu?subject=${encodeURIComponent('Richiesta di preventivo: ' + f.tipo.value)}&body=${encodeURIComponent(testo)}`;
    } else {
      window.open(`https://wa.me/39337912005?text=${encodeURIComponent(testo)}`, '_blank', 'noopener');
    }
  });

  // Barra Chiama / WhatsApp su mobile: compare quando i bottoni dell'hero escono dallo schermo
  const barra = $('#barra');
  const heroCta = $('#hero-cta');
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(v => {
      const e = v[0];
      barra.classList.toggle('on', !e.isIntersecting && e.boundingClientRect.top < 0);
    }).observe(heroCta);
  } else barra.classList.add('on');
})();
