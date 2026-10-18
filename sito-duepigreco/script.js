(() => {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fmt = (n) => Math.round(n).toLocaleString('it-IT');

  /* ---------- header e menu ---------- */
  const top = $('.top');
  const onScroll = () => top.classList.toggle('is-scrolled', scrollY > 8);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const burger = $('.burger');
  const nav = $('#nav');
  const setMenu = (open) => {
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Chiudi il menu' : 'Apri il menu');
    nav.classList.toggle('is-open', open);
  };
  burger.addEventListener('click', () => setMenu(burger.getAttribute('aria-expanded') !== 'true'));
  $$('a', nav).forEach((a) => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && nav.classList.contains('is-open')) { setMenu(false); burger.focus(); } });

  $('#year').textContent = new Date().getFullYear();

  /* ---------- foto che si "stampano" a strati quando entrano in vista ---------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -10% 0px' });
  $$('.layer').forEach((el) => io.observe(el));

  /* ---------- linea del processo che avanza con lo scroll ---------- */
  const steps = $('.steps');
  const fillSteps = () => {
    const r = steps.getBoundingClientRect();
    const vh = innerHeight;
    const p = Math.min(1, Math.max(0, (vh * 0.78 - r.top) / (r.height * 0.85)));
    steps.style.setProperty('--fill', reduce ? 1 : p.toFixed(3));
  };
  addEventListener('scroll', fillSteps, { passive: true });
  addEventListener('resize', fillSteps);
  fillSteps();

  /* ---------- stato del preventivo condiviso ---------- */
  const form = $('#qform');
  const F = form.elements;
  const picked = new Set();
  const counters = $$('[data-count]');
  const toast = $('#toast');
  let toastT;
  const say = (msg) => {
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastT);
    toastT = setTimeout(() => toast.classList.remove('show'), 2600);
  };
  const flash = (el) => { el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); };
  const syncCount = () => counters.forEach((c) => { c.textContent = picked.size; c.hidden = picked.size === 0; });

  /* ---------- il tuo pezzo ci sta? ---------- */
  const MACH = [
    { id: 'f900', name: 'Stratasys F900', tech: 'FDM', d: [914, 610, 914], note: 'Per componenti monoblocco di grandi dimensioni e parti complesse. A Resana ne lavorano due.' },
    { id: 'p770', name: 'EOS P770', tech: 'SLS', d: [700, 380, 580], note: 'Doppio laser e oltre 150 litri di camera: la prima installata nel Nord Italia.' },
    { id: 'a2v4', name: '3ntr A2v4', tech: 'FFF', d: [600, 325, 500], note: 'Grande formato per polimeri rigidi e flessibili, compreso il TPU.' },
    { id: 'f450', name: 'Stratasys F400 / F450', tech: 'FDM', d: [406, 355, 406], note: 'Materiali certificati per aerospazio, automotive e medicale. La F450 lavora oltre 25 materiali, tra cui il Nylon 12CF.' },
    { id: 'f380', name: 'Stratasys F380 / F380CF', tech: 'FDM', d: [355, 305, 305], note: 'Parti accurate e stabili in ABS, ASA e PC-ISO. La versione CF stampa il Nylon 12CF caricato carbonio.' },
    { id: 'f250', name: 'Stratasys F250', tech: 'FDM', d: [254, 254, 305], note: 'La più compatta: prototipi, utensili e accessori in tempi rapidi.' },
    { id: 'dlp', name: 'Sistema DLP', tech: 'DLP', d: [192, 108, 370], note: 'Resine rigide o flessibili, con dettaglio e finitura superficiale altissimi.' },
    { id: 'fuse', name: 'Formlabs SLS', tech: 'SLS', d: [165, 165, 300], note: 'Nylon caricati carbonio e vetro, texture estetiche e strutture interne reticolari.' },
  ];
  const vol = (d) => d[0] * d[1] * d[2];
  const label = (m) => (m.name.includes(m.tech) ? m.name : `${m.name}, ${m.tech}`);
  const perms = (a) => [[a[0], a[1], a[2]], [a[1], a[0], a[2]], [a[0], a[2], a[1]], [a[2], a[0], a[1]], [a[1], a[2], a[0]], [a[2], a[1], a[0]]];
  const orient = (p, m) => {
    for (const q of perms(p)) if (q[0] <= m[0] && q[1] <= m[1] && q[2] <= m[2]) return { fit: true, o: q };
    const rank = [0, 1, 2].sort((i, j) => m[j] - m[i]);
    const ps = [...p].sort((x, y) => y - x);
    const o = [0, 0, 0];
    rank.forEach((k, r) => { o[k] = ps[r]; });
    return { fit: false, o };
  };

  const dims = $('#dims');
  const list = $('#machines');
  const verdict = $('#verdict');
  const svgEl = $('#iso');
  const g = $('#isoG');
  const legPart = $('#legPart');
  const legMach = $('#legMach');
  const machNote = $('#machNote');
  let selected = null;
  let userPick = false;
  let result = [];

  list.innerHTML = MACH.map((m) => `
    <li><button type="button" data-id="${m.id}" aria-pressed="false">
      <span class="m__name">${m.name}</span>
      <span class="m__meta">${m.tech}</span>
      <span class="m__dims">${m.d.join(' × ')} mm</span>
      <span class="m__fit"></span>
    </button></li>`).join('');

  const readDims = () => ['a', 'b', 'c'].map((k) => {
    const v = parseFloat(dims.elements[k].value);
    return Number.isFinite(v) && v > 0 ? Math.min(v, 5000) : 1;
  });

  // proiezione isometrica: x verso destra-basso, y verso sinistra-basso, z in alto
  const C = 0.866, S = 0.5;
  const pr = ([x, y, z]) => [(x - y) * C, (x + y) * S - z];
  const corners = (o, d) => {
    const pts = [];
    for (const x of [0, d[0]]) for (const y of [0, d[1]]) for (const z of [0, d[2]]) pts.push([o[0] + x, o[1] + y, o[2] + z]);
    return pts;
  };
  let view = null;   // stato disegnato, interpolato verso il target
  let anim = 0;

  function render(M, P, fit) {
    // il disegno si rimpicciolisce sul telefono: quote e distanze crescono in proporzione
    const k = Math.min(1.9, Math.max(1, 640 / (svgEl.clientWidth || 640) * 0.8));
    const W = 640, H = 500, pad = 28 + 20 * k;
    const off = [(M[0] - P[0]) / 2, (M[1] - P[1]) / 2, 0];
    const pts = [...corners([0, 0, 0], M), ...corners(off, P)].map(pr);
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    const s = Math.min((W - pad * 2) / (maxX - minX), (H - pad * 2) / (maxY - minY));
    const tx = W / 2 - s * (minX + maxX) / 2, ty = H / 2 - s * (minY + maxY) / 2 + 6;
    const P2 = (p) => { const q = pr(p); return [(tx + q[0] * s).toFixed(1), (ty + q[1] * s).toFixed(1)]; };
    const poly = (arr) => arr.map((p) => P2(p).join(',')).join(' ');
    const line = (a, b, cls) => { const p = P2(a), q = P2(b); return `<line x1="${p[0]}" y1="${p[1]}" x2="${q[0]}" y2="${q[1]}" class="${cls}"/>`; };
    const [X, Y, Z] = M;
    const [a, b, c] = P;
    const [ox, oy] = off;

    const floor = `<polygon points="${poly([[0, 0, 0], [X, 0, 0], [X, Y, 0], [0, Y, 0]])}" fill="url(#dots)" stroke="none" opacity=".9"/>`;
    const hidden = [line([0, 0, 0], [X, 0, 0], 'h'), line([0, 0, 0], [0, Y, 0], 'h'), line([0, 0, 0], [0, 0, Z], 'h')].join('');
    const sil = [
      line([X, 0, 0], [X, Y, 0], 'e'), line([0, Y, 0], [X, Y, 0], 'e'),
      line([X, 0, 0], [X, 0, Z], 'e'), line([0, Y, 0], [0, Y, Z], 'e'),
      line([0, 0, Z], [X, 0, Z], 'e'), line([0, 0, Z], [0, Y, Z], 'e'),
    ].join('');
    const front = [line([X, Y, 0], [X, Y, Z], 'f'), line([X, 0, Z], [X, Y, Z], 'f'), line([0, Y, Z], [X, Y, Z], 'f')].join('');
    const stroke = fit ? '#F2D79E' : '#E0101F';
    const part = `
      <polygon points="${poly([[ox + a, oy, 0], [ox + a, oy + b, 0], [ox + a, oy + b, c], [ox + a, oy, c]])}" fill="#A9792A"/>
      <polygon points="${poly([[ox, oy + b, 0], [ox + a, oy + b, 0], [ox + a, oy + b, c], [ox, oy + b, c]])}" fill="#C8933A"/>
      <polygon points="${poly([[ox, oy, c], [ox + a, oy, c], [ox + a, oy + b, c], [ox, oy + b, c]])}" fill="#E6B861"/>
      <polyline points="${poly([[ox, oy + b, c], [ox, oy, c], [ox + a, oy, c], [ox + a, oy, 0], [ox + a, oy + b, 0], [ox, oy + b, 0], [ox, oy + b, c], [ox + a, oy + b, c], [ox + a, oy, c]])}" fill="none" stroke="${stroke}" stroke-width="${fit ? 1 : 2}" stroke-linejoin="round" ${fit ? '' : 'stroke-dasharray="6 4"'}/>
      ${line([ox + a, oy + b, c], [ox + a, oy + b, 0], 'pe')}`;

    // quote della camera lungo i tre spigoli esterni
    const lbl = (p, txt, dx, dy, rot, anchor = 'middle') => {
      const q = P2(p);
      const x = +q[0] + dx * k, y = +q[1] + dy * k;
      return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="${anchor}" font-size="${(15 * k).toFixed(1)}" transform="rotate(${rot} ${x.toFixed(1)} ${y.toFixed(1)})">${txt}</text>`;
    };
    const labels =
      lbl([X / 2, Y, 0], `${fmt(X)} mm`, -12, 24, 30) +
      lbl([X, Y / 2, 0], `${fmt(Y)} mm`, 12, 24, -30) +
      lbl([X, 0, Z / 2], `${fmt(Z)} mm`, 12, 5, 0, 'start');

    g.innerHTML = `<style>
      #isoG line,#isoG polyline{vector-effect:non-scaling-stroke}
      #isoG .e{stroke:#8E979E;stroke-width:1.4}
      #isoG .f{stroke:#C9CFD3;stroke-width:1.6}
      #isoG .h{stroke:#5D666D;stroke-width:1.2;stroke-dasharray:5 5}
      #isoG .pe{stroke:${stroke};stroke-width:1}
    </style>${floor}${hidden}${sil}${part}${front}${labels}`;
  }

  function draw(target) {
    cancelAnimationFrame(anim);
    if (!view || reduce) { view = target; render(view.M, view.P, view.fit); return; }
    const from = { M: [...view.M], P: [...view.P] };
    const t0 = performance.now(), dur = 520;
    const ease = (t) => 1 - Math.pow(1 - t, 3);
    const step = (now) => {
      const t = Math.min(1, (now - t0) / dur), k = ease(t);
      const M = from.M.map((v, i) => v + (target.M[i] - v) * k);
      const P = from.P.map((v, i) => v + (target.P[i] - v) * k);
      view = { M, P, fit: target.fit };
      render(M, P, target.fit);
      if (t < 1) anim = requestAnimationFrame(step);
    };
    anim = requestAnimationFrame(step);
  }

  function update() {
    const p = readDims();
    result = MACH.map((m) => ({ m, ...orient(p, m.d) }));
    const fitting = result.filter((r) => r.fit).sort((x, y) => vol(x.m.d) - vol(y.m.d));
    if (!userPick || !selected) selected = (fitting[0] || result[0]).m;
    const cur = result.find((r) => r.m === selected);

    $$('button', list).forEach((btn) => {
      const r = result.find((x) => x.m.id === btn.dataset.id);
      btn.setAttribute('aria-pressed', String(r.m === selected));
      btn.classList.toggle('fits', r.fit);
      $('.m__fit', btn).textContent = r.fit ? 'Ci sta in un pezzo' : 'Troppo grande';
    });

    const misura = `${fmt(p[0])} × ${fmt(p[1])} × ${fmt(p[2])} mm`;
    if (fitting.length) {
      const best = fitting[0].m;
      verdict.innerHTML = `Si stampa in un pezzo solo su <strong>${fitting.length} ${fitting.length === 1 ? 'piattaforma' : 'piattaforme'} su ${MACH.length}</strong>. La più compatta che lo contiene: ${label(best)}.`;
    } else {
      verdict.innerHTML = `È più grande di ogni camera di stampa. Lo stampiamo in più parti e lo ricostruiamo con <strong>adesivi strutturali o graffatura metallica</strong>: è il nostro servizio per i componenti XXL.`;
    }
    legPart.textContent = `Il tuo pezzo, ${misura}`;
    legMach.textContent = `${selected.name}, ${selected.d.join(' × ')} mm`;
    machNote.textContent = selected.note;
    draw({ M: [...selected.d], P: cur.o, fit: cur.fit });
  }

  dims.addEventListener('input', () => { userPick = false; update(); });
  let rz;
  addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => view && render(view.M, view.P, view.fit), 150); });
  dims.addEventListener('submit', (e) => e.preventDefault());
  list.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-id]');
    if (!btn) return;
    selected = MACH.find((m) => m.id === btn.dataset.id);
    userPick = true;
    update();
  });
  update();

  $('#volumeCta').addEventListener('click', () => {
    const p = readDims();
    const fitting = result.filter((r) => r.fit).sort((x, y) => vol(x.m.d) - vol(y.m.d));
    const misura = `${fmt(p[0])} × ${fmt(p[1])} × ${fmt(p[2])} mm`;
    const hint = fitting.length ? label(fitting[0].m) : 'componente XXL in più parti';
    F.dimensioni.value = `${misura} (dal sito: ${hint})`;
    flash(F.dimensioni);
    setTimeout(() => F.nome.focus({ preventScroll: true }), 700);
  });

  /* ---------- materiali ---------- */
  const FAM = { fdm: 'Filamento FDM', pol: 'Polvere SLS', res: 'Resina', met: 'Metallo' };
  const TAG = { bio: 'Biocompatibile', fr: 'Ignifugo', rinf: 'Rinforzato', temp: 'Alte temperature', flex: 'Flessibile', esd: 'ESD' };
  const MATS = [
    { n: 'Nylon 12CF', f: 'fdm', t: ['rinf'], k: 1, d: 'Nylon rinforzato al 35% con fibra di carbonio: leggero e con la più alta resistenza alla flessione tra i materiali FDM.' },
    { n: 'ULTEM™ 9085', f: 'fdm', t: ['fr'], k: 1, d: 'Ignifugo con certificazione FST (fiamma, fumi, tossicità). Adatto al metal replacement, cioè a sostituire alcune parti in metallo.' },
    { n: 'ULTEM™ 1010', f: 'fdm', t: ['temp', 'bio'], k: 1, d: 'Ottima resistenza meccanica e stabilità termica. La versione 1010CG è biocompatibile e certificata per l\'alimentare.' },
    { n: 'PC-ISO', f: 'fdm', t: ['bio'], k: 1, d: 'Biocompatibile secondo ISO 10993 e USP Classe VI, sterilizzabile: per medicale, farmaceutico e alimentare.' },
    { n: 'Antero™ 840CN03', f: 'fdm', t: ['esd', 'temp'], k: 1, d: 'PEKK statico-dissipativo (ESD) con robustezza e resistenza termica e chimica eccezionali. Pensato per l\'aerospazio.' },
    { n: 'Antero™ 800NA', f: 'fdm', t: ['temp'], d: 'Robusto, a degassamento ridotto, resistente a usura e calore: per parti che devono durare e pesare poco.' },
    { n: 'ABS-M30i', f: 'fdm', t: ['bio'], d: 'Resistente, biocompatibile e sterilizzabile: adatto ai dispositivi medici.' },
    { n: 'PC-ABS', f: 'fdm', t: [], d: 'Unisce le proprietà meccaniche del policarbonato all\'estetica e all\'elasticità dell\'ABS.' },
    { n: 'PPSF / PPSU', f: 'fdm', t: ['temp'], d: 'Resiste a calore, oli, gas e acidi ed è sterilizzabile: per applicazioni impegnative.' },
    { n: 'Nylon 12', f: 'fdm', t: [], d: 'Resistente e tenace: ideale per chiusure a scatto e inserti a frizione.' },
    { n: 'ASA', f: 'fdm', t: [], d: 'Eccellente stabilità ai raggi UV e la migliore resa estetica tra i filamenti termoplastici.' },
    { n: 'TPU', f: 'fdm', t: ['flex'], d: 'Elastomero resistente ad abrasione, agenti chimici, UV e basse temperature. Per automotive, calzaturiero e tessile (non Stratasys).' },
    { n: 'VICTREX AM™ 200', f: 'fdm', t: [], d: 'PAEK a basso punto di fusione, progettato apposta per la manifattura additiva.' },
    { n: 'Covestro Addigy® PA6/66-GF20 FR LS', f: 'fdm', t: ['rinf', 'fr', 'temp'], d: 'Nylon caricato con fibre di vetro, ignifugo e stabile ad alte temperature: per ferroviario e aerospazio.' },
    { n: 'Kimya PC-FR', f: 'fdm', t: ['fr'], d: 'Policarbonato ignifugo, adatto al trasporto ferroviario e aereo.' },
    { n: 'FDM HIPS', f: 'fdm', t: [], d: 'Polistirene ad alto impatto: proprietà simili all\'ABS, con una resistenza agli urti molto più alta.' },
    { n: 'Nylon 2200 EOS', f: 'pol', t: ['temp'], k: 1, d: 'Superfici lisce, alta precisione e ottime proprietà meccaniche: parti funzionali che reggono forti sollecitazioni termiche e meccaniche.' },
    { n: 'Nylon 12 GF Formlabs', f: 'pol', t: ['rinf', 'temp'], d: 'Rigidità, precisione dimensionale e stabilità termica elevate per parti ad alte prestazioni.' },
    { n: 'Nylon 11 Formlabs', f: 'pol', t: [], d: 'Nylon di origine biologica, duttile e robusto: per parti che si piegano e resistono agli urti.' },
    { n: 'Flexa Grey', f: 'pol', t: ['flex'], d: 'TPU per prototipi flessibili: articoli in gomma, protezioni, assorbitori di urti e vibrazioni.' },
    { n: 'AlSi10Mg', f: 'met', t: [], k: 1, d: 'Lega di alluminio con buona resistenza alla corrosione e conducibilità elettrica: pareti sottili e geometrie complesse.' },
    { n: 'Acciaio maraging DIN 1.2709', f: 'met', t: [], d: 'Durezza elevata insieme ad alta duttilità: per stampi, utensili e parti molto sollecitate.' },
    { n: 'Acciaio inox AISI 316L', f: 'met', t: [], d: 'Resistente all\'usura e alle forti sollecitazioni: per medicale, automotive e aerospazio.' },
    { n: 'LOCTITE® 3D MED 412', f: 'res', t: ['bio'], k: 1, d: 'Resina di grado medico, biocompatibile e sterilizzabile, resistente a urti e compressione.' },
    { n: 'LOCTITE® 3D MED 413', f: 'res', t: [], d: 'Rigida, robusta e di alta precisione, per dispositivi medici che devono resistere agli urti.' },
    { n: 'Ultracur3D® ST45', f: 'res', t: ['bio'], d: 'Fotopolimero uretanico biocompatibile, resistente agli urti, con dettagli finissimi.' },
    { n: 'Somos® EvoLVe™ 128', f: 'res', t: [], d: 'Facile da rifinire e molto dettagliato: per aerospazio, automotive, medicale ed elettronica.' },
    { n: 'LOCTITE® 3D IND403 High Modulus', f: 'res', t: [], d: 'Resina ad alto modulo per attrezzature e stampi a temperature basse o moderate.' },
    { n: 'LOCTITE® 3843 High Toughness', f: 'res', t: [], d: 'Alta resistenza e finitura superficiale di classe A per parti funzionali.' },
    { n: 'LOCTITE® 3D 3172 High Impact', f: 'res', t: [], d: 'Robusto e resistente agli urti, per parti funzionali sotto carichi elevati.' },
    { n: 'LOCTITE® 3D 3955 FST', f: 'res', t: ['fr'], d: 'Eccellente a flessione e trazione, resistente agli agenti chimici e alla fiamma.' },
    { n: 'Dura56', f: 'res', t: [], d: 'Resistente agli urti, superfici di classe A e basso costo al chilo.' },
    { n: 'LOCTITE® 3D IND405', f: 'res', t: [], d: 'Trasparente, liscio e resistente agli urti: per guide meccaniche e dispositivi microfluidici.' },
    { n: 'Somos® QuickGen™ 500', f: 'res', t: ['flex'], d: 'Economica e veloce da stampare, più flessibile delle altre resine e con ritorno elastico.' },
    { n: 'LOCTITE® 3D IND402 High Rebound', f: 'res', t: ['flex'], d: 'Elastomero ad alta resilienza (Shore A 75), ideale per strutture a griglia.' },
  ];
  const famBox = $('#famFilters');
  const propBox = $('#propFilters');
  const matList = $('#matList');
  const matMore = $('#matMore');
  const matCount = $('#matCount');
  const st = { fam: 'all', props: new Set(), all: false };
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const plain = (s) => s.replace(/[™®]/g, '');

  propBox.innerHTML = Object.entries(TAG).map(([k, v]) =>
    `<button type="button" class="chip" data-prop="${k}" aria-pressed="false">${v}<span class="n">${MATS.filter((m) => m.t.includes(k)).length}</span></button>`).join('');

  function renderMats() {
    const filtered = st.fam !== 'all' || st.props.size > 0;
    let rows = MATS.filter((m) => (st.fam === 'all' || m.f === st.fam) && [...st.props].every((p) => m.t.includes(p)));
    const total = rows.length;
    if (!filtered && !st.all) rows = rows.filter((m) => m.k);
    matList.innerHTML = rows.length ? rows.map((m) => {
      const on = picked.has(plain(m.n));
      return `<li class="mat__item">
        <h3>${esc(m.n)}</h3>
        <span class="mat__fam">${FAM[m.f]}</span>
        <button type="button" class="mat__add" data-mat="${esc(plain(m.n))}" aria-pressed="${on}">${on ? 'Aggiunto al preventivo' : 'Aggiungi al preventivo'}</button>
        <p>${esc(m.d)}</p>
        ${m.t.length ? `<ul class="tags">${m.t.map((t) => `<li>${TAG[t]}</li>`).join('')}</ul>` : ''}
      </li>`;
    }).join('') : '<li class="mat__empty">Nessun materiale ha tutte queste proprietà insieme. Togli un filtro, oppure scrivici: lo cerchiamo noi.</li>';
    matCount.textContent = !filtered && !st.all ? `I più richiesti: ${rows.length} su ${MATS.length}` : `${total} ${total === 1 ? 'materiale' : 'materiali'}`;
    matMore.hidden = filtered || st.all;
  }
  famBox.addEventListener('click', (e) => {
    const b = e.target.closest('[data-fam]');
    if (!b) return;
    st.fam = b.dataset.fam;
    $$('[data-fam]', famBox).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    renderMats();
  });
  propBox.addEventListener('click', (e) => {
    const b = e.target.closest('[data-prop]');
    if (!b) return;
    const k = b.dataset.prop;
    st.props.has(k) ? st.props.delete(k) : st.props.add(k);
    b.setAttribute('aria-pressed', String(st.props.has(k)));
    renderMats();
  });
  matMore.addEventListener('click', () => { st.all = true; renderMats(); });
  matList.addEventListener('click', (e) => {
    const b = e.target.closest('.mat__add');
    if (!b) return;
    const n = b.dataset.mat;
    const on = !picked.has(n);
    on ? picked.add(n) : picked.delete(n);
    b.setAttribute('aria-pressed', String(on));
    b.textContent = on ? 'Aggiunto al preventivo' : 'Aggiungi al preventivo';
    F.materiale.value = [...picked].join(', ');
    syncCount();
    say(on ? `${n} aggiunto al preventivo` : `${n} tolto dal preventivo`);
  });
  F.materiale.addEventListener('input', () => {
    picked.clear();
    F.materiale.value.split(',').map((s) => s.trim()).filter(Boolean).forEach((s) => picked.add(s));
    syncCount();
    renderMats();
  });
  renderMats();

  /* ---------- invio: compone l'email con i campi ---------- */
  const status = $('#qstatus');
  const setErr = (el, msg) => {
    const box = el.closest('.field, .check');
    let e = $('.err', box);
    if (msg) {
      el.setAttribute('aria-invalid', 'true');
      if (!e) { e = document.createElement('span'); e.className = 'err'; e.id = `err-${el.name}`; box.appendChild(e); }
      e.textContent = msg;
      el.setAttribute('aria-describedby', e.id);
    } else {
      el.removeAttribute('aria-invalid');
      el.removeAttribute('aria-describedby');
      if (e) e.remove();
    }
  };
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = (n) => F[n].value.trim();
    const checks = [
      [F.nome, v('nome') ? '' : 'Scrivi nome e cognome.'],
      [F.email, /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v('email')) ? '' : 'Scrivi un indirizzo email valido.'],
      [F.messaggio, v('messaggio') ? '' : 'Descrivi in poche righe il pezzo.'],
      [F.privacy, F.privacy.checked ? '' : 'Serve la presa visione dell\'informativa.'],
    ];
    checks.forEach(([el, msg]) => setErr(el, msg));
    const bad = checks.find(([, msg]) => msg);
    if (bad) {
      status.className = 'qform__status ko';
      status.textContent = 'Controlla i campi evidenziati.';
      bad[0].focus();
      return;
    }
    const rows = [
      `Nome: ${v('nome')}`,
      v('azienda') && `Azienda: ${v('azienda')}`,
      `Email: ${v('email')}`,
      v('telefono') && `Telefono: ${v('telefono')}`,
      `Richiesta: ${v('servizio')}`,
      v('quantita') && `Quantità: ${v('quantita')}`,
      v('dimensioni') && `Dimensioni d'ingombro: ${v('dimensioni')}`,
      v('materiale') && `Materiali candidati: ${v('materiale')}`,
    ].filter(Boolean);
    const body = `${rows.join('\n')}\n\n${v('messaggio')}\n\nAllego il file 3D o il disegno del pezzo.`;
    const subject = `Richiesta preventivo dal sito: ${v('azienda') || v('nome')}`;
    location.href = `mailto:info@duepigreco3d.it?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    status.className = 'qform__status ok';
    status.textContent = 'Si è aperta la tua email con la richiesta già scritta: allega il file e inviala. Se non si apre, scrivi a info@duepigreco3d.it.';
  });
  ['nome', 'email', 'messaggio'].forEach((n) => F[n].addEventListener('input', () => { if (F[n].hasAttribute('aria-invalid')) setErr(F[n], ''); }));
  F.privacy.addEventListener('change', () => { if (F.privacy.checked) setErr(F.privacy, ''); });
})();
