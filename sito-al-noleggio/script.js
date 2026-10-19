/* AL Noleggio — interazioni comuni a tutte le pagine */
(() => {
  const WA = '3904221834001';
  const html = document.documentElement;
  const ridotto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  const linkWa = (testo) => `https://wa.me/${WA}?text=${encodeURIComponent(testo)}`;
  const testoAttrezzo = (nome, vendita) => vendita
    ? `Buongiorno Angela, vorrei informazioni per l'acquisto di: ${nome}.`
    : `Buongiorno Angela, vorrei sapere disponibilità e prezzo per il noleggio di: ${nome}. Mi servirebbe per i giorni: `;

  /* ---------- Ricerca nel catalogo (condivisa con catalogo.html) ---------- */
  const SINONIMI = {
    tosaerba: 'rasaerba', tagliaerba: 'rasaerba', prato: 'rasaerba', generatore: 'elettrogen', gruppo: 'elettrogen',
    ponteggio: 'trabatell', trabattello: 'trabatell', camion: 'autocarr', furgone: 'furgon', pulmino: 'pulmin',
    minibus: 'pulmin', demolitore: 'demol', flex: 'smerigliatric', lavapavimenti: 'lavasciug', stufa: 'riscaldator',
    condizionatore: 'climatizzator', ruspa: 'escavat', bobcat: 'minipal', cestello: 'cesta', siepe: 'siep',
    legna: 'spaccaleg', moquette: 'moquette', tapparella: 'tapparell', trattorino: 'trattor', idro: 'idropulitric',
    gazebo: 'gazebo', tavoli: 'tavol', wc: 'bagn', bagno: 'bagn', sega: 'seg', sabbiatura: 'sabbiatric'
  };
  const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  const radice = (t) => SINONIMI[t] || (t.length > 4 ? t.replace(/[aeiou]$/, '') : t);
  const VENDITA = new Set([46, 51, 49, 55]);
  const NOMI_CAT = { 15: 'Edilizia, utensili e accessori', 11: 'Eventi, varie', 41: 'Riscaldatori elettrici, a gas e gasolio', 14: 'Rulli, piastre vibranti e costipatori' };
  let catalogo = null;
  const caricaCatalogo = () => catalogo || (catalogo = fetch('catalogo.json').then((r) => r.json()).then((d) => {
    const cats = new Map(d.cats.map((c) => [c.id, { ...c, n: NOMI_CAT[c.id] || c.n }]));
    d.items.forEach((x) => {
      x.cn = cats.get(x.c).n;
      x.v = VENDITA.has(x.c);
      x.h = norm(`${x.n} ${x.m} ${x.cn}`);
      x.hn = norm(x.n);
    });
    d.catMap = cats;
    return d;
  }));
  const cerca = (items, q) => {
    const t = norm(q).split(' ').filter((p) => p.length > 1).map(radice);
    if (!t.length) return [];
    const out = [];
    for (const x of items) {
      let s = 0;
      for (const p of t) {
        if (x.hn.includes(p)) s += x.hn.startsWith(p) ? 4 : 3;
        else if (x.h.includes(p)) s += 1;
        else { s = -1; break; }
      }
      if (s > 0) out.push([s, x]);
    }
    return out.sort((a, b) => b[0] - a[0] || a[1].n.length - b[1].n.length).map((o) => o[1]);
  };
  window.ALN = { linkWa, testoAttrezzo, caricaCatalogo, cerca, norm, ridotto };

  /* ---------- Link WhatsApp precompilati ---------- */
  $$('[data-wa]').forEach((a) => { a.href = linkWa(a.dataset.wa); a.target = '_blank'; a.rel = 'noopener'; });
  $$('[data-attrezzo]').forEach((a) => { a.href = linkWa(testoAttrezzo(a.dataset.attrezzo)); a.target = '_blank'; a.rel = 'noopener'; });

  /* ---------- Intro: livrea che passa, titolo che sale ---------- */
  const livrea = $('.livrea-intro');
  requestAnimationFrame(() => requestAnimationFrame(() => html.classList.add('avviato')));
  setTimeout(() => livrea && livrea.classList.add('finita'), ridotto ? 0 : 1500);

  /* ---------- Header e barra in basso ---------- */
  const header = $('#header');
  const barra = $('#barra-cta');
  const suScroll = () => {
    const y = scrollY;
    if (header) header.classList.toggle('pieno', y > 12 || !$('.hero'));
  };
  addEventListener('scroll', suScroll, { passive: true });
  suScroll();
  if (barra) setTimeout(() => barra.classList.add('visibile'), ridotto ? 0 : 1100);

  /* ---------- Comparse allo scroll ---------- */
  const io = new IntersectionObserver((voci) => voci.forEach((v) => {
    if (v.isIntersecting) { v.target.classList.add('in'); io.unobserve(v.target); }
  }), { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  $$('[data-rivela]').forEach((el) => io.observe(el));

  /* ---------- Tabellone reparti: anteprima foto su desktop ---------- */
  const tab = $('[data-tabellone]');
  const ant = $('.anteprima');
  if (tab && ant) {
    const imgs = new Map([[ant.querySelector('img').dataset.nome, ant.querySelector('img')]]);
    const cap = ant.querySelector('[data-didascalia]');
    const mostra = (a) => {
      const n = a.dataset.foto;
      let im = imgs.get(n);
      if (!im) {
        im = new Image();
        im.src = `assets/img/foto/${n}.webp`; im.alt = ''; im.decoding = 'async';
        if ('contain' in a.dataset) im.className = 'contain';
        ant.insertBefore(im, cap); imgs.set(n, im);
      }
      imgs.forEach((x) => x.classList.toggle('on', x === im));
      cap.textContent = a.dataset.didascalia;
    };
    $$('a', tab).forEach((a) => { a.addEventListener('mouseenter', () => mostra(a)); a.addEventListener('focus', () => mostra(a)); });
  }

  /* ---------- Cartellini: oscillano quando entrano e quando si scorre la fila ---------- */
  const fila = $('[data-fila]');
  if (fila && !ridotto) {
    const cart = $$('.cartellino', fila);
    const oi = new IntersectionObserver(([v]) => {
      if (!v.isIntersecting) return;
      cart.forEach((c, i) => {
        c.style.setProperty('--ritardo', `${Math.min(i, 5) * 0.09}s`);
        c.classList.add('oscilla');
        c.addEventListener('animationend', () => c.classList.remove('oscilla'), { once: true });
      });
      oi.disconnect();
    }, { threshold: 0.25 });
    oi.observe(fila);
    let ultimo = fila.scrollLeft, t0 = performance.now(), fermo;
    fila.addEventListener('scroll', () => {
      const now = performance.now();
      const v = (fila.scrollLeft - ultimo) / Math.max(16, now - t0);
      ultimo = fila.scrollLeft; t0 = now;
      const ang = Math.max(-9, Math.min(9, -v * 6));
      cart.forEach((c) => { c.style.transform = `rotate(calc(var(--rot) + ${ang}deg))`; });
      clearTimeout(fermo);
      fermo = setTimeout(() => cart.forEach((c) => { c.style.transform = ''; }), 90);
    }, { passive: true });
  }

  /* ---------- Movimenti legati allo scroll: flotta e passi ---------- */
  const flotta = $('[data-flotta]');
  const passi = $('[data-passi]');
  const passiLi = passi ? $$('li', passi) : [];
  let inCoda = false;
  const aggiorna = () => {
    inCoda = false;
    const vh = innerHeight;
    if (flotta) {
      const r = flotta.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (r.top - vh * 0.25) / (vh * 0.6)));
      flotta.style.setProperty('--p', p.toFixed(3));
      flotta.style.setProperty('--p2', (1 - Math.min(1, Math.max(0, (r.top - vh * 0.05) / (vh * 0.55)))).toFixed(3));
    }
    if (passi) {
      const r = passi.getBoundingClientRect();
      const a = Math.min(1, Math.max(0, (vh * 0.72 - r.top) / (r.height * 0.9)));
      passi.style.setProperty('--avanza', a.toFixed(3));
      passiLi.forEach((li, i) => li.classList.toggle('fatto', a >= i / passiLi.length + 0.02));
    }
  };
  if (!ridotto && (flotta || passi)) {
    addEventListener('scroll', () => { if (!inCoda) { inCoda = true; requestAnimationFrame(aggiorna); } }, { passive: true });
    addEventListener('resize', aggiorna);
    aggiorna();
  } else if (passi) { passi.style.setProperty('--avanza', 1); passiLi.forEach((li) => li.classList.add('fatto')); }

  /* ---------- Aperto ora (orari verificati del negozio) ---------- */
  const FASCE = { 1: [[450, 750], [870, 1110]], 2: [[450, 750], [870, 1110]], 3: [[450, 750], [870, 1110]], 4: [[450, 750], [870, 1110]], 5: [[450, 750], [870, 1110]], 6: [[480, 720]], 0: [] };
  const GIORNI = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
  const hm = (m) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
  try {
    const parti = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Rome', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
    const g = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parti.find((p) => p.type === 'weekday').value);
    const ora = +parti.find((p) => p.type === 'hour').value * 60 + +parti.find((p) => p.type === 'minute').value;
    const fascia = FASCE[g].find(([a, b]) => ora >= a && ora < b);
    let testo;
    if (fascia) testo = `Aperto ora, fino alle ${hm(fascia[1])}`;
    else {
      let prossima = FASCE[g].find(([a]) => a > ora), giorno = g, giri = 0;
      while (!prossima && giri < 7) { giorno = (giorno + 1) % 7; giri++; prossima = FASCE[giorno][0]; }
      testo = `Chiuso ora, riapre ${giorno === g ? 'oggi' : giri === 1 ? 'domani' : GIORNI[giorno]} alle ${hm(prossima[0])}`;
    }
    $$('[data-aperto]').forEach((el) => { el.textContent = testo; el.classList.toggle('si', !!fascia); el.hidden = false; });
    $$('[data-orari] tr').forEach((tr) => tr.classList.toggle('oggi', (tr.dataset.giorni || '').split(',').includes(String(g))));
  } catch (e) { /* senza Intl resta tutto statico */ }

  /* ---------- Modulo: compone il messaggio e apre WhatsApp ---------- */
  const modulo = $('#modulo');
  if (modulo) {
    const comune = $('[data-comune]', modulo);
    modulo.addEventListener('change', () => { comune.hidden = modulo.ritiro.value !== 'Consegna in cantiere'; });
    const data = (v) => v ? v.split('-').reverse().join('/') : '';
    modulo.addEventListener('submit', (e) => {
      e.preventDefault();
      const f = modulo.elements;
      if (!f.attrezzo.value.trim()) { f.attrezzo.focus(); f.attrezzo.setAttribute('aria-invalid', 'true'); f.attrezzo.placeholder = 'Scrivi qui l’attrezzo o il mezzo che ti serve'; return; }
      f.attrezzo.removeAttribute('aria-invalid');
      const righe = [`Buongiorno Angela, vorrei sapere disponibilità e prezzo per il noleggio di: ${f.attrezzo.value.trim()}.`];
      if (f.dal.value || f.al.value) righe.push(`Periodo: ${f.dal.value ? 'dal ' + data(f.dal.value) : ''}${f.al.value ? ' al ' + data(f.al.value) : ''}.`);
      righe.push(`Ritiro: ${f.ritiro.value}${f.ritiro.value === 'Consegna in cantiere' && f.comune.value.trim() ? ' a ' + f.comune.value.trim() : ''}.`);
      if (f.note.value.trim()) righe.push(`Note: ${f.note.value.trim()}`);
      if (f.nome.value.trim()) righe.push(`${f.nome.value.trim()}`);
      window.open(linkWa(righe.join('\n')), '_blank', 'noopener');
    });
    const q = new URLSearchParams(location.search).get('attrezzo');
    if (q) modulo.attrezzo.value = q;
  }

  /* ---------- Ricerca nell'hero ---------- */
  const formCerca = $('[data-cerca]');
  if (formCerca) {
    const input = $('input', formCerca);
    const box = $('.risultati', formCerca);
    const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    let timer;
    const disegna = async () => {
      const q = input.value.trim();
      if (q.length < 2) { box.hidden = true; return; }
      const d = await caricaCatalogo();
      const r = cerca(d.items, q);
      if (!r.length) {
        box.innerHTML = `<div class="vuoto"><p>Nessun attrezzo a catalogo per “${esc(q)}”. Se non c’è, lo cerchiamo noi.</p><a class="btn" target="_blank" rel="noopener" href="${linkWa(`Buongiorno, mi servirebbe a noleggio: ${q}. Lo avete o potete trovarlo?`)}">Chiedi su WhatsApp</a></div>`;
      } else {
        box.innerHTML = `<ul>${r.slice(0, 6).map((x) => `<li><a class="risultato" role="option" target="_blank" rel="noopener" href="${linkWa(testoAttrezzo(x.n + (x.m ? ` (${x.m})` : ''), x.v))}">
          ${x.x ? '<span class="senza-foto"></span>' : `<img src="assets/img/cat/${x.i}.webp" alt="" width="56" height="56" loading="lazy">`}
          <span><span class="nome">${esc(x.n)}</span><span class="cat">${esc(x.cn)}</span></span>
          <span class="chiedi"><svg aria-hidden="true"><use href="#i-wa"/></svg>Chiedi</span></a></li>`).join('')}</ul>
          <a class="tutti" href="catalogo.html?q=${encodeURIComponent(q)}">${r.length > 6 ? `Vedi tutti i ${r.length} risultati nel catalogo` : 'Apri nel catalogo'}</a>`;
      }
      box.hidden = false;
    };
    input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(disegna, 120); });
    input.addEventListener('focus', () => { caricaCatalogo(); if (input.value.trim().length > 1) disegna(); }, { once: false });
    document.addEventListener('click', (e) => { if (!formCerca.contains(e.target)) box.hidden = true; });
    input.addEventListener('keydown', (e) => { if (e.key === 'Escape') { box.hidden = true; input.blur(); } });
  }

  /* ---------- Anno nel footer ---------- */
  $$('[data-anno]').forEach((el) => { el.textContent = new Date().getFullYear(); });

  /* ---------- Espositore 3D: arriva dopo la pagina ---------- */
  const esp = $('#espositore');
  if (esp) {
    let partito = false;
    const avvia = () => {
      if (partito) return; partito = true;
      const prova = document.createElement('canvas');
      const gl = prova.getContext('webgl2') || prova.getContext('webgl');
      if (!gl) return;
      const perdi = gl.getExtension('WEBGL_lose_context'); if (perdi) perdi.loseContext();
      import('./3d.js').then((m) => m.avvia(esp, { ridotto })).catch(() => {});
    };
    // parte appena il poster è a schermo, senza aspettare le foto più in basso
    const poster = esp.querySelector('.poster');
    if (document.readyState === 'complete' || !poster || poster.complete) setTimeout(avvia, 60);
    else {
      poster.addEventListener('load', () => setTimeout(avvia, 60), { once: true });
      addEventListener('load', avvia, { once: true });
    }
  }
})();
