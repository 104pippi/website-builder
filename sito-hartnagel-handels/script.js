/* Hartnagel Handels — demo. Palco del container, ricerca per codice, preventivo. */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const sstep = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const ridotto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* niente */ } },
  };
  const TEL_WA = '393483018871';
  const EMAIL = 'info@hhsrl.it';

  /* ---------- intro ---------- */
  const avvia = () => document.documentElement.classList.add('avvio');
  const fonti = document.fonts && document.fonts.ready ? document.fonts.ready.catch(() => {}) : Promise.resolve();
  Promise.race([fonti, new Promise((r) => setTimeout(r, 700))]).then(() => requestAnimationFrame(avvia));
  setTimeout(avvia, 1500);

  /* ---------- testata e menu ---------- */
  const testata = $('#testata');
  const burger = $('#burger');
  const menu = $('#menu');
  const chiudiMenu = () => { menu.classList.remove('aperto'); burger.setAttribute('aria-expanded', 'false'); burger.setAttribute('aria-label', 'Apri il menu'); };
  burger.addEventListener('click', () => {
    const aperto = menu.classList.toggle('aperto');
    burger.setAttribute('aria-expanded', String(aperto));
    burger.setAttribute('aria-label', aperto ? 'Chiudi il menu' : 'Apri il menu');
    testata.classList.add('solida');
  });
  $$('a', menu).forEach((a) => a.addEventListener('click', chiudiMenu));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') chiudiMenu(); });

  /* ---------- palco: hero + 4 allestimenti guidati dallo scroll ---------- */
  const palco = $('#allestimenti');
  const hero = $('#palcoHero');
  const velo = $('.palco__velo');
  const indizio = $('#palcoIndizio');
  const schede = $('#palcoSchede');
  const tabs = $$('button', schede);
  const barra = $('#palcoBarra');
  const pannelli = $$('.pannello');
  const S_MAX = 4.4;
  window.HH = window.HH || { s: 0 };
  let corsa = 1, inizio = 0;
  const misura = () => { inizio = palco.offsetTop; corsa = Math.max(1, palco.offsetHeight - innerHeight); };
  misura();
  addEventListener('resize', misura);
  addEventListener('load', misura);

  let ultimoS = -1, ultimoPasso = -1;
  const disegnaPalco = () => {
    const p = clamp((scrollY - inizio) / corsa, 0, 1);
    const s = p * S_MAX;
    window.HH.s = s;
    if (Math.abs(s - ultimoS) < 0.0005) return;
    ultimoS = s;
    const oh = 1 - sstep(0.1, 0.4, s);
    hero.style.opacity = oh.toFixed(3);
    hero.style.visibility = oh < 0.02 ? 'hidden' : '';
    hero.style.translate = `0 ${(-(1 - oh) * 40).toFixed(1)}px`;
    velo.style.opacity = (1 - sstep(0.05, 0.5, s)).toFixed(3);
    indizio.style.opacity = (1 - sstep(0.02, 0.15, s)).toFixed(3);
    const os = sstep(0.32, 0.56, s);
    schede.style.opacity = os.toFixed(3);
    schede.style.visibility = os < 0.02 ? 'hidden' : 'visible';
    barra.style.transform = `scaleX(${clamp((s - 0.5) / (S_MAX - 0.5), 0, 1).toFixed(4)})`;
    pannelli.forEach((el, i) => {
      const k = i + 1;
      const dentro = sstep(k - 0.64, k - 0.4, s);
      const fuori = k === 4 ? 0 : sstep(k + 0.4, k + 0.64, s);
      const o = dentro * (1 - fuori);
      el.style.opacity = o.toFixed(3);
      el.style.visibility = o < 0.02 ? 'hidden' : 'visible';
      el.style.translate = `0 ${((1 - dentro) * 26 - fuori * 26).toFixed(1)}px`;
      el.setAttribute('aria-hidden', o < 0.5 ? 'true' : 'false');
    });
    const passo = s < 0.5 ? 0 : clamp(Math.round(s), 1, 4);
    if (passo !== ultimoPasso) {
      ultimoPasso = passo;
      tabs.forEach((t) => t.setAttribute('aria-selected', String(Number(t.dataset.passo) === passo)));
    }
  };
  tabs.forEach((t) => t.addEventListener('click', () => {
    const k = Number(t.dataset.passo);
    scrollTo({ top: inizio + (k / S_MAX) * corsa, behavior: ridotto ? 'auto' : 'smooth' });
  }));

  /* ---------- testata solida e zoom della flotta ---------- */
  const flotta = $('.azienda__flotta img');
  const disegnaPagina = () => {
    testata.classList.toggle('solida', scrollY > 8 || menu.classList.contains('aperto'));
    if (flotta && !ridotto) {
      const r = flotta.parentElement.getBoundingClientRect();
      if (r.bottom > 0 && r.top < innerHeight) {
        const t = clamp((innerHeight - r.top) / (innerHeight + r.height), 0, 1);
        flotta.style.setProperty('--zoom', (1.12 - 0.12 * t).toFixed(4));
      }
    }
  };
  let richiesta = 0;
  const giro = () => { richiesta = 0; disegnaPalco(); disegnaPagina(); };
  const chiedi = () => { if (!richiesta) richiesta = requestAnimationFrame(giro); };
  addEventListener('scroll', chiedi, { passive: true });
  addEventListener('resize', () => { ultimoS = -1; chiedi(); });
  giro();

  /* ---------- scena 3D (dopo il load, mai bloccante) ---------- */
  const puoWebGL = () => {
    try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; }
  };
  const lento = navigator.connection && navigator.connection.saveData;
  const carica3D = () => {
    if (!puoWebGL() || lento) return;
    import('./3d.js')
      .then((m) => m.avvia({ canvas: $('#scena3d'), palco, ridotto, pronto: () => palco.classList.add('pronto') }))
      .catch((e) => console.warn('Scena 3D non disponibile:', e));
  };
  if (document.readyState === 'complete') setTimeout(carica3D, 60);
  else addEventListener('load', () => setTimeout(carica3D, 60));

  /* ---------- numeri che contano ---------- */
  const formatta = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const conta = $$('.conta');
  if ('IntersectionObserver' in window && !ridotto) {
    conta.forEach((el) => { el.textContent = '0'; });
    const io = new IntersectionObserver((voci) => voci.forEach((v) => {
      if (!v.isIntersecting) return;
      io.unobserve(v.target);
      const el = v.target, a = Number(el.dataset.a), t0 = performance.now(), dur = a > 1000 ? 1800 : 1300;
      const passo = () => {
        const t = clamp((performance.now() - t0) / dur, 0, 1);
        const e = 1 - Math.pow(1 - t, 4);
        el.textContent = formatta(a * e);
        if (t < 1) requestAnimationFrame(passo);
      };
      requestAnimationFrame(passo);
    }), { threshold: 0.6 });
    conta.forEach((el) => io.observe(el));
  }

  /* ---------- ricerca per codice (home) ---------- */
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const normCod = (s) => norm(s).replace(/[^a-z0-9]/g, '');
  let catalogo = null;
  const caricaCatalogo = () => catalogo || (catalogo = fetch('catalogo.json').then((r) => r.json()).catch(() => []));
  window.HH.caricaCatalogo = caricaCatalogo;
  const cerca = (dati, q) => {
    const qn = norm(q).trim(), qc = normCod(q);
    if (qn.length < 2) return [];
    const parole = qn.split(/\s+/).filter(Boolean);
    const out = [];
    dati.forEach((f, fi) => {
      const testo = norm(f.nome + ' ' + f.punti.join(' '));
      f.var.forEach((v) => {
        let punti = 0;
        const c = normCod(v.c);
        if (qc && c === qc) punti = 100;
        else if (qc.length >= 3 && c.startsWith(qc)) punti = 60;
        else if (qc.length >= 3 && c.includes(qc)) punti = 40;
        else if (parole.every((p) => testo.includes(p))) punti = 10;
        if (punti) out.push({ f, fi, v, punti });
      });
    });
    out.sort((a, b) => b.punti - a.punti);
    if (out.length && out[0].punti < 40) {
      const viste = new Set();
      return out.filter((r) => (viste.has(r.fi) ? false : viste.add(r.fi)));
    }
    return out;
  };
  const input = $('#cercaCodice');
  const lista = $('#cercaRisultati');
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const mostra = async () => {
    const q = input.value;
    const dati = await caricaCatalogo();
    const ris = cerca(dati, q);
    if (!q.trim() || q.trim().length < 2) { lista.hidden = true; return; }
    const top = ris.slice(0, 5);
    const url = (r) => `catalogo.html?q=${encodeURIComponent(r.punti >= 40 ? r.v.c : q)}`;
    lista.innerHTML = top.length
      ? top.map((r) => {
          const img = r.v.img || r.f.img[0];
          const foto = img ? `<img src="assets/catalogo/${esc(img)}.jpg" alt="" width="48" height="48" loading="lazy">` : '<img src="favicon.svg" alt="" width="48" height="48">';
          return `<li><a href="${url(r)}">${foto}<span><b>${esc(r.f.nome)}</b><span><span class="targhetta">${esc(r.v.c)}</span> ${esc(r.v.d || '')}</span></span></a></li>`;
        }).join('') + `<li><a class="tutti" href="catalogo.html?q=${encodeURIComponent(q)}">Vedi tutti i risultati (${ris.length})</a></li>`
      : `<li><a class="tutti" href="catalogo.html">Nessun prodotto con "${esc(q)}". Apri il catalogo completo</a></li>`;
    lista.hidden = false;
  };
  if (input) {
    input.addEventListener('focus', caricaCatalogo, { once: true });
    input.addEventListener('input', mostra);
    $$('.cerca__prova button').forEach((b) => b.addEventListener('click', () => { input.value = b.dataset.q; mostra(); input.focus(); }));
    document.addEventListener('click', (e) => { if (!e.target.closest('.cerca__form')) lista.hidden = true; });
  }

  /* ---------- preventivo ---------- */
  const modulo = $('#modulo');
  const campoCodici = $('#campoCodici');
  const errore = $('#moduloErrore');
  const evidenzia = () => { modulo.classList.remove('flash'); void modulo.offsetWidth; modulo.classList.add('flash'); };
  $$('[data-allestimento]').forEach((a) => a.addEventListener('click', () => {
    const box = $(`input[name="cosa"][value="${a.dataset.allestimento}"]`, modulo);
    if (box) box.checked = true;
    const att = campoCodici.value.trim();
    if (!att.includes(a.dataset.codici)) campoCodici.value = (att ? att + '\n' : '') + a.dataset.codici;
    setTimeout(evidenzia, 500);
  }));
  // codici scelti nel catalogo
  const daLista = store.get('hh-lista');
  if (Array.isArray(daLista) && daLista.length && !campoCodici.value) {
    campoCodici.value = daLista.map((x) => `${x.c} x ${x.n}`).join(', ');
    const altro = $('input[name="cosa"][value="Altro dal catalogo"]', modulo);
    if (altro) altro.checked = true;
    if (location.hash === '#preventivo') setTimeout(evidenzia, 700);
  }

  let via = 'email';
  $$('button[type="submit"]', modulo).forEach((b) => b.addEventListener('click', () => { via = b.dataset.via; }));
  modulo.addEventListener('submit', (e) => {
    e.preventDefault();
    const d = new FormData(modulo);
    const nome = (d.get('nome') || '').trim(), tel = (d.get('telefono') || '').trim();
    const mancano = [];
    modulo.nome.setAttribute('aria-invalid', String(!nome));
    modulo.telefono.setAttribute('aria-invalid', String(!tel));
    if (!nome) mancano.push('nome e cognome');
    if (!tel) mancano.push('telefono');
    if (mancano.length) {
      errore.textContent = mancano.length === 2 ? 'Scrivi nome e telefono: ci servono per richiamarti.'
        : !nome ? 'Scrivi nome e cognome: ci serve per risponderti.' : 'Scrivi il telefono: ci serve per richiamarti.';
      errore.hidden = false;
      (!nome ? modulo.nome : modulo.telefono).focus();
      return;
    }
    errore.hidden = true;
    const righe = [
      'Buongiorno, vorrei un preventivo.',
      '',
      d.get('chi') ? `Chi sono: ${d.get('chi')}` : '',
      d.getAll('cosa').length ? `Da arredare: ${d.getAll('cosa').join(', ')}` : '',
      d.get('quanti') ? `Quantità: ${d.get('quanti')}` : '',
      d.get('provincia') ? `Consegna in provincia di: ${d.get('provincia')}` : '',
      d.get('codici') ? `Codici: ${String(d.get('codici')).replace(/\s*\n\s*/g, ', ')}` : '',
      d.get('note') ? `Note: ${d.get('note')}` : '',
      '',
      `${nome}${d.get('azienda') ? ' - ' + d.get('azienda') : ''}`,
      `Tel. ${tel}`,
      d.get('email') ? `Email: ${d.get('email')}` : '',
    ].filter((r, i, a) => r !== '' || (a[i - 1] && a[i - 1] !== ''));
    const testo = righe.join('\n').trim();
    if (via === 'whatsapp') {
      window.open(`https://wa.me/${TEL_WA}?text=${encodeURIComponent(testo)}`, '_blank', 'noopener');
    } else {
      const ogg = `Richiesta preventivo${d.get('azienda') ? ' - ' + d.get('azienda') : ''}`;
      location.href = `mailto:${EMAIL}?subject=${encodeURIComponent(ogg)}&body=${encodeURIComponent(testo)}`;
    }
  });

  const anno = $('#anno');
  if (anno) anno.textContent = new Date().getFullYear();
})();
