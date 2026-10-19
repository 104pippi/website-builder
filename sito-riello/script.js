/* Riello · logica della pagina (il 3D sta in 3d.js e arriva dopo il caricamento) */
(() => {
  const html = document.documentElement;
  const ridotto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const liscio = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };

  /* ---------- menu ---------- */
  const bottone = document.querySelector('.top__menu');
  const menu = document.getElementById('menu');
  if (bottone && menu) {
    const chiudi = () => { bottone.setAttribute('aria-expanded', 'false'); menu.hidden = true; };
    bottone.addEventListener('click', () => {
      const aperto = bottone.getAttribute('aria-expanded') === 'true';
      bottone.setAttribute('aria-expanded', String(!aperto));
      menu.hidden = aperto;
    });
    menu.addEventListener('click', e => { if (e.target.closest('a')) chiudi(); });
    addEventListener('keydown', e => { if (e.key === 'Escape') chiudi(); });
  }

  /* ---------- hero: termocamera che si scalda in foto vera ---------- */
  const hero = document.querySelector('.hero');
  const media = hero.querySelector('.hero__media');
  const termica = hero.querySelector('.hero__termica');
  const scan = hero.querySelector('.hero__scan');
  const testoHero = hero.querySelector('.hero__testo');
  const hud = hero.querySelector('.hud');
  const punti = [...hud.querySelectorAll('.hud__punto')];
  const telefono = matchMedia('(max-width: 700px)');

  function piazzaHud() {
    const W = media.clientWidth, H = media.clientHeight;
    const tel = telefono.matches;
    const iw = tel ? 1152 : 1920, ih = tel ? 1440 : 960;
    const k = Math.max(W / iw, H / ih);
    const w = iw * k, h = ih * k;
    const ox = (W - w) * (tel ? .5 : .45), oy = (H - h) * .42;
    for (const p of punti) {
      let x = parseFloat(tel && p.dataset.xm ? p.dataset.xm : p.dataset.x);
      const y = parseFloat(tel && p.dataset.ym ? p.dataset.ym : p.dataset.y);
      if (tel) x = (x - .30) / .40;              // la foto del telefono è il taglio centrale 30–70%
      p.style.left = (ox + x * w).toFixed(1) + 'px';
      p.style.top = (oy + y * h).toFixed(1) + 'px';
    }
  }
  piazzaHud();
  addEventListener('resize', piazzaHud);

  const letture = punti.map(p => p.querySelector('b'));
  const bersagli = letture.map(b => parseFloat(b.dataset.temp));
  const scriviTemp = v => (v < 0 ? '−' : '') + Math.abs(Math.round(v));

  let introS = ridotto ? 108 : -8;           // posizione della linea di scansione, in %
  let introFine = ridotto;
  let introT0 = 0;
  const INTRO_RITARDO = 380, INTRO_DURATA = 2100;

  function avviaIntro() {
    hero.classList.add('is-in');
    hud.classList.add('is-on');
    if (ridotto) return;
    introT0 = performance.now() + INTRO_RITARDO;
  }
  // parte quando la foto termica è pronta (al massimo 1,2 s di attesa)
  const imgTermica = termica.querySelector('img');
  const pronta = imgTermica.complete ? Promise.resolve() : new Promise(r => { imgTermica.addEventListener('load', r, { once: true }); imgTermica.addEventListener('error', r, { once: true }); });
  Promise.race([pronta, new Promise(r => setTimeout(r, 1200))]).then(avviaIntro);

  /* ---------- rete: contatori ---------- */
  const contatori = [...document.querySelectorAll('[data-conta]')];
  const formatta = (n, migliaia) => { const v = String(Math.round(n)); return migliaia ? v.replace(/\B(?=(\d{3})+(?!\d))/g, '.') : v; };
  const conti = contatori.map(el => ({ el, fine: +el.dataset.conta, m: el.hasAttribute('data-migliaia'), t0: 0 }));
  if (!ridotto && 'IntersectionObserver' in window) {
    conti.forEach(c => (c.el.textContent = '0'));
    const io = new IntersectionObserver(voci => voci.forEach(v => {
      if (!v.isIntersecting) return;
      conti.forEach((c, i) => { if (!c.t0) c.t0 = performance.now() + i * 120; });
      io.disconnect();
    }), { threshold: .4 });
    io.observe(document.querySelector('.rete'));
  }

  /* ---------- stagioni: pannelli, indice, cielo ---------- */
  const stagioni = document.querySelector('.stagioni');
  const pannelli = [...stagioni.querySelectorAll('.pannello')];
  const voci = [...stagioni.querySelectorAll('.stagioni__indice li')];
  const cielo = stagioni.querySelector('.stagioni__cielo');
  const CIELI = [
    ['#0B1533', '#22346B', '#3A4F8E', 0, 0],
    ['#1C1F4A', '#7A4E7E', '#E8946C', .55, 0],
    ['#2C78D2', '#86C0F0', '#D6EAFA', 1, .9],
    ['#3B69B0', '#E7A469', '#FFD9A3', .9, .55]
  ];
  const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const mix = (a, b, t) => { const A = hex(a), B = hex(b); return 'rgb(' + A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',') + ')'; };
  let attivo = -2;

  function progressoStagioni() {
    const r = stagioni.getBoundingClientRect();
    return clamp(-r.top / (r.height - innerHeight));
  }
  // c: -… intro, 0..4 i quattro capitoli
  window.__rielloCapitolo = () => (progressoStagioni() - .05) / .95 * 4;

  function aggiornaStagioni() {
    const c = window.__rielloCapitolo();
    const i = c < 0 ? -1 : Math.min(3, Math.floor(c));
    if (i !== attivo) {
      attivo = i;
      pannelli.forEach((p, k) => p.classList.toggle('is-on', k === i));
      voci.forEach((v, k) => v.classList.toggle('is-on', k === i));
    }
    voci.forEach((v, k) => v.style.setProperty('--p', clamp(c - k).toFixed(3)));
    stagioni.classList.toggle('is-avanti', c > -0.16);
    // cielo: resta sulla stagione e cambia verso la fine di ogni capitolo
    const base = clamp(Math.floor(c), 0, 3), f = clamp(c - base);
    const succ = Math.min(3, base + 1), t = liscio(.72, 1, f);
    const A = CIELI[base], B = CIELI[succ];
    cielo.style.setProperty('--c1', mix(A[0], B[0], t));
    cielo.style.setProperty('--c2', mix(A[1], B[1], t));
    cielo.style.setProperty('--c3', mix(A[2], B[2], t));
  }

  /* ---------- storia: parallasse della sede ---------- */
  const fotoStoria = document.querySelector('.storia__foto');
  const imgStoria = fotoStoria && fotoStoria.querySelector('img');

  /* ---------- barra mobile ---------- */
  const barra = document.querySelector('.barra');
  const trova = document.getElementById('trova');

  /* ---------- un solo giro per fotogramma ---------- */
  function giro(now) {
    const y = scrollY, hH = hero.offsetHeight;

    // linea di scansione: entra all'avvio, poi torna termica scendendo verso il 3D
    if (!introFine && introT0) {
      const u = clamp((now - introT0) / INTRO_DURATA);
      const e = u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
      introS = -8 + 116 * e;
      letture.forEach((b, k) => { if (k > 0) b.textContent = scriviTemp(20 + (bersagli[k] - 20) * liscio(.15, .95, u)); });
      if (u >= 1) introFine = true;
    }
    const scrollS = 108 - 116 * clamp(y / (hH * .9));
    const s = Math.min(introS, scrollS);
    termica.style.setProperty('--s', s.toFixed(2) + '%');
    scan.style.setProperty('--s', s.toFixed(2) + '%');
    const inMoto = (!introFine && introT0 && now >= introT0) || (y > 4 && s < 106);
    scan.style.setProperty('--scan-o', inMoto ? (liscio(-6, 4, s) * (1 - liscio(96, 106, s))).toFixed(3) : '0');

    if (!ridotto && y < hH * 1.2) {
      const q = clamp(y / hH);
      media.style.transform = `translate3d(0, ${(y * .28).toFixed(1)}px, 0) scale(${(1 + q * .05).toFixed(4)})`;
      testoHero.style.transform = `translate3d(0, ${(-y * .1).toFixed(1)}px, 0)`;
      testoHero.style.opacity = (1 - liscio(.25, .8, q)).toFixed(3);
    }

    // contatori
    for (const c of conti) {
      if (!c.t0 || c.done) continue;
      const u = clamp((now - c.t0) / 1500);
      c.el.textContent = formatta(c.fine * (1 - Math.pow(1 - u, 3)), c.m);
      if (u >= 1) c.done = true;
    }

    aggiornaStagioni();

    if (imgStoria && !ridotto) {
      const r = fotoStoria.getBoundingClientRect();
      if (r.bottom > 0 && r.top < innerHeight) {
        const k = clamp((r.top + r.height) / (innerHeight + r.height));   // 1 entra dal basso, 0 esce in alto
        const extra = imgStoria.offsetHeight - r.height;
        imgStoria.style.setProperty('--py', (-extra * (1 - k)).toFixed(1) + 'px');
      }
    }

    if (barra && trova) {
      const r = trova.getBoundingClientRect();
      barra.classList.toggle('is-giu', r.top < innerHeight * .7 && r.bottom > 0);
    }

    requestAnimationFrame(giro);
  }
  requestAnimationFrame(giro);

  /* ---------- da dove partire ---------- */
  const R = 'https://www.riello.it/';
  const P = 'assets/img/prodotti/';
  const GAMME = {
    caldaie: { n: 'Caldaie murali a condensazione', d: 'Residence HM, Family HM, Residence HM Aqua con accumulo da 30 litri: calore e acqua calda in poco spazio.', f: 'residence-hm.webp', u: R + 'catalogo/caldaie' },
    ibridi: { n: 'Sistemi ibridi', d: 'Pompa di calore e caldaia in un unico sistema, come Adapto Hybrid: usa ogni volta l\'energia più conveniente.', f: 'adapto-hybrid.webp', u: R + 'catalogo/sistemi-ibridi' },
    split: { n: 'Pompe di calore split murali', d: 'Family Sprint: riscalda, raffresca e produce acqua calda con l\'unità interna a parete.', f: 'family-sprint.webp', u: R + 'catalogo/pompe-di-calore' },
    monoblocco: { n: 'Pompe di calore monoblocco', d: 'NXHP con refrigerante naturale R290 e NXHM: mandata fino a 75 °C, vanno bene anche con i radiatori.', f: 'nxhp.webp', u: R + 'catalogo/pompe-di-calore' },
    inwall: { n: 'Sprint In-Wall Box', d: 'Tutto ad incasso: pompa di calore, unità interna e bollitore inox da 160 litri in un solo box.', f: 'sprint-in-wall-box.webp', u: R + 'news/prodotti/sprint-in-wall-box' },
    basamento: { n: 'Sistemi a basamento', d: 'Domus M, il sistema integrato con accumulo per l\'acqua calda, per chi ha un locale tecnico.', f: 'domus-m.webp', u: R + 'catalogo/pompe-di-calore' },
    condexa: { n: 'Moduli termici Condexa HPR', d: 'Moduli murali a condensazione a gas, da comporre in centrale termica.', f: 'condexa-hpr.webp', u: R + 'catalogo/caldaie' },
    nxhm: { n: 'Pompe di calore NXHM 018÷030', d: 'Monoblocco aria-acqua R32 per potenze più alte, in riscaldamento e raffrescamento.', f: 'nxhm.webp', u: R + 'catalogo/pompe-di-calore' },
    bruciatori: { n: 'Bruciatori Serie RS ULX', d: 'La tecnologia ULX per ridurre le emissioni di NOx nei grandi impianti.', f: 'bruciatori-rs.webp', u: R + 'catalogo/ricerca' },
    mono: { n: 'Climatizzatori a parete', d: 'Aaria Mono Plus I e Aaria Start NI: fino ad A+++, Wi-Fi integrato, silenziosi di notte.', f: 'aaria-mono-plus-i.webp', u: R + 'catalogo/condizionamento' },
    multi: { n: 'Climatizzatori multisplit', d: 'Aaria Multi Plus I: una sola unità esterna per più stanze.', f: 'aaria-start.webp', u: R + 'catalogo/condizionamento' },
    pro: { n: 'Climatizzatori commerciali', d: 'Aaria Pro P a cassetta, canalizzabili e a soffitto, per negozi e uffici.', f: 'aaria-start.webp', u: R + 'catalogo/condizionamento' }
  };
  const SCELTE = {
    'caldo-appartamento': ['caldaie', 'ibridi', 'split'],
    'caldo-casa': ['monoblocco', 'ibridi', 'inwall'],
    'caldo-ufficio': ['condexa', 'nxhm', 'monoblocco'],
    'caldo-grandi': ['condexa', 'bruciatori', 'nxhm'],
    'fresco-appartamento': ['mono', 'multi', 'split'],
    'fresco-casa': ['multi', 'monoblocco', 'inwall'],
    'fresco-ufficio': ['pro', 'nxhm', 'multi'],
    'fresco-grandi': ['pro', 'nxhm', 'monoblocco']
  };
  const frase = document.querySelector('[data-frase]');
  const proposte = document.querySelector('[data-proposte]');
  function mostraProposte() {
    const cosa = frase.querySelector('[name="cosa"]:checked').value;
    const dove = frase.querySelector('[name="dove"]:checked').value;
    const chiavi = SCELTE[cosa + '-' + dove] || SCELTE['caldo-appartamento'];
    proposte.innerHTML = chiavi.map(k => {
      const g = GAMME[k];
      return `<a class="proposta" href="${g.u}" rel="noopener">
        <div class="proposta__foto"><img src="${P + g.f}" alt="" width="220" height="220" loading="lazy" decoding="async"></div>
        <div><h3>${g.n}</h3><p>${g.d}</p><span class="proposta__vai">Vedi la gamma</span></div>
      </a>`;
    }).join('');
  }
  if (frase && proposte) { frase.addEventListener('change', mostraProposte); mostraProposte(); }

  /* ---------- cerca il tecnico: CAP o comune verso il cercatore ufficiale ---------- */
  document.querySelectorAll('[data-cerca]').forEach(form => {
    form.addEventListener('submit', () => {
      const tipo = form.querySelector('[name="tipo"]:checked');
      if (tipo) form.action = tipo.value;
      const campo = form.querySelector('[name="searched"]');
      campo.value = campo.value.trim();
      // "tipo" non serve al cercatore: non lo mandiamo
      if (tipo) form.querySelectorAll('[name="tipo"]').forEach(r => r.disabled = true);
      setTimeout(() => form.querySelectorAll('[name="tipo"]').forEach(r => r.disabled = false), 0);
    });
  });

  /* ---------- vetrina: inclinazione col puntatore (solo desktop) ---------- */
  if (matchMedia('(hover: hover) and (pointer: fine)').matches && !ridotto) {
    document.querySelectorAll('.pezzo a').forEach(a => {
      const foto = a.querySelector('.pezzo__foto');
      a.addEventListener('pointermove', e => {
        const r = foto.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
        foto.style.setProperty('--ry', (x * 18).toFixed(2) + 'deg');
        foto.style.setProperty('--rx', (-y * 12).toFixed(2) + 'deg');
      });
      a.addEventListener('pointerleave', () => { foto.style.setProperty('--ry', '0deg'); foto.style.setProperty('--rx', '0deg'); });
    });
  }

  /* ---------- anno ---------- */
  const anno = document.querySelector('[data-anno]');
  if (anno) anno.textContent = new Date().getFullYear();

  /* ---------- 3D: dopo il caricamento della pagina ---------- */
  function carica3D() {
    let gl = null;
    try { const c = document.createElement('canvas'); gl = c.getContext('webgl2') || c.getContext('webgl'); } catch (e) { gl = null; }
    if (!gl) { stagioni.classList.add('no-webgl'); return; }
    import('./3d.js')
      .then(m => m.avvia(stagioni, { ridotto }))
      .catch(() => stagioni.classList.add('no-webgl'));
  }
  if (document.readyState === 'complete') setTimeout(carica3D, 200);
  else addEventListener('load', () => setTimeout(carica3D, 200), { once: true });
})();
