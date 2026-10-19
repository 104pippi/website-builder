(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const ridotto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const WA = '393498149876';

  // anno nel piede
  const anno = $('[data-anno]');
  if (anno) anno.textContent = new Date().getFullYear();

  // ---------- intro: le ganasce si tolgono di mezzo quando hanno finito ----------
  const ganasce = $('.ganasce');
  if (ganasce) {
    const fine = () => ganasce.classList.add('fatto');
    $('.ganascia-giu', ganasce).addEventListener('animationend', fine, { once: true });
    setTimeout(fine, 2400);
  }

  // ---------- testata e barra mobile ----------
  const testata = $('[data-testata]');
  const barra = $('[data-barra]');
  setTimeout(() => barra && barra.classList.add('vista'), 1500);

  // ---------- menu ----------
  const menu = $('[data-menu]');
  const apri = $('[data-menu-apri]');
  function menuAperto(stato) {
    apri.setAttribute('aria-expanded', String(stato));
    menu.hidden = !stato;
    document.body.classList.toggle('menu-aperto', stato);
    testata.classList.toggle('piena', stato || scrollY > 30);
    if (stato) $('a', menu).focus();
  }
  apri.addEventListener('click', () => menuAperto(apri.getAttribute('aria-expanded') !== 'true'));
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) menuAperto(false); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) { menuAperto(false); apri.focus(); } });

  // ---------- numeri che contano ----------
  const numeri = $$('[data-conta]');
  if (numeri.length && 'IntersectionObserver' in window && !ridotto) {
    numeri.forEach((n) => { n.dataset.fine = n.dataset.conta; n.textContent = '0'; });
    const io = new IntersectionObserver((voci) => {
      voci.forEach((v) => {
        if (!v.isIntersecting) return;
        io.unobserve(v.target);
        const el = v.target, fine = +el.dataset.fine, dur = 1300;
        let t0 = null;
        const passo = (ora) => {
          if (t0 === null) t0 = ora;
          const k = clamp((ora - t0) / dur);
          el.textContent = Math.round(fine * (1 - Math.pow(1 - k, 3)));
          if (k < 1) requestAnimationFrame(passo);
        };
        requestAnimationFrame(passo);
      });
    }, { threshold: 0.6 });
    numeri.forEach((n) => io.observe(n));
  }

  // ---------- catalogo ----------
  const dati = JSON.parse($('#catalogo-dati').textContent);
  const carte = $$('.mac');
  const conto = $('[data-conto]');
  const chips = $$('[data-filtro-prodotto] .chip');
  const tabs = $$('[data-filtro-famiglia] .tab');
  const NOMI_FAM = { verticali: ['confezionatrice verticale', 'confezionatrici verticali'], pesatrici: ['pesatrice', 'pesatrici'], dosatori: ['dosatore', 'dosatori'], monodose: ['confezionatrice monodose', 'confezionatrici monodose'], contapezzi: ['contapezzi', 'contapezzi'], accessori: ['accessorio di linea', 'accessori di linea'], '': ['macchina', 'macchine'] };
  const NOMI_TAG = { snack: 'per snack, pasta e granulari', polveri: 'per polveri', liquidi: 'per liquidi e creme', fragili: 'per biscotti e prodotti fragili', surgelati: 'per surgelati e prodotti voluminosi', ortofrutta: 'per ortofrutta in rete', minuterie: 'per viti e minuterie', sacchi: 'per sacchi da 5 a 25 kg', monodose: 'per bustine monodose' };
  const TAG_FORM = { snack: 'Snack, pasta e granulari', polveri: 'Polveri', liquidi: 'Liquidi e creme', fragili: 'Biscotti e prodotti fragili', surgelati: 'Surgelati e prodotti voluminosi', ortofrutta: 'Ortofrutta in sacchi a rete', minuterie: 'Viti e minuterie', sacchi: 'Sacchi da 5 a 25 kg', monodose: 'Bustine monodose' };
  const stato = { tag: '', fam: 'verticali' };

  function filtra(anima = true) {
    const conteggi = { '': 0 };
    let visibili = 0, i = 0;
    carte.forEach((c) => {
      const okTag = !stato.tag || c.dataset.tags.split(' ').includes(stato.tag);
      if (okTag) { conteggi[c.dataset.fam] = (conteggi[c.dataset.fam] || 0) + 1; conteggi['']++; }
      const mostra = okTag && (!stato.fam || c.dataset.fam === stato.fam);
      const prima = !c.hidden;
      c.hidden = !mostra;
      c.classList.remove('entra');
      if (mostra) {
        visibili++;
        if (anima && !prima && !ridotto) { c.style.setProperty('--i', Math.min(i, 12)); void c.offsetWidth; c.classList.add('entra'); }
        i++;
      }
    });
    tabs.forEach((t) => {
      const n = conteggi[t.dataset.fam] || 0;
      const b = $('span', t);
      b.textContent = n;
      b.classList.toggle('zero', n === 0);
      t.setAttribute('aria-selected', String(t.dataset.fam === stato.fam));
      t.tabIndex = t.dataset.fam === stato.fam ? 0 : -1;
    });
    const nome = NOMI_FAM[stato.fam][visibili === 1 ? 0 : 1];
    conto.textContent = visibili
      ? `${visibili} ${nome}${stato.tag ? ' ' + NOMI_TAG[stato.tag] : ''}`
      : 'Nessuna macchina di questa famiglia per questo prodotto: guarda le altre famiglie o chiedici una soluzione su misura.';
  }

  chips.forEach((ch) => ch.addEventListener('click', () => {
    chips.forEach((c) => c.setAttribute('aria-pressed', String(c === ch)));
    stato.tag = ch.dataset.tag;
    stato.fam = stato.tag ? '' : 'verticali';
    filtra();
    const sel = tabs.find((t) => t.dataset.fam === stato.fam);
    if (sel) sel.parentElement.scrollTo({ left: Math.max(0, sel.offsetLeft - 20), behavior: ridotto ? 'auto' : 'smooth' });
  }));
  tabs.forEach((t, idx) => {
    t.addEventListener('click', () => { stato.fam = t.dataset.fam; filtra(); });
    t.addEventListener('keydown', (e) => {
      const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!d) return;
      e.preventDefault();
      const n = tabs[(idx + d + tabs.length) % tabs.length];
      n.focus(); n.click();
    });
  });

  // ---------- scheda della macchina ----------
  const scheda = $('[data-scheda]');
  const S = (k) => $(`[data-s="${k}"]`, scheda);
  let corrente = null;
  function lista(ul, voci) { ul.replaceChildren(...voci.map((v) => { const li = document.createElement('li'); li.textContent = v; return li; })); }
  function apriScheda(id, img) {
    const d = dati[id];
    if (!d) return;
    corrente = d;
    S('img').src = img.currentSrc || img.src;
    S('img').alt = img.alt;
    S('serie').textContent = d.serie ? `Serie ${d.serie}` : 'Su misura';
    S('nome').textContent = d.nome;
    S('vel').textContent = d.vel || 'Su richiesta';
    S('vel-li').hidden = !d.vel;
    S('buste').textContent = d.buste;
    S('buste-li').hidden = !d.buste;
    S('intro').textContent = d.intro;
    lista(S('car'), d.car);
    S('car-box').hidden = !d.car.length;
    lista(S('opz'), d.opz);
    S('opz-box').hidden = !d.opz.length;
    S('opz-box').open = false;
    if (typeof scheda.showModal === 'function') scheda.showModal(); else scheda.setAttribute('open', '');
    $('.scheda-in', scheda).scrollTop = 0;
  }
  function chiudiScheda() { if (scheda.open) scheda.close(); }
  $('[data-griglia]').addEventListener('click', (e) => {
    const b = e.target.closest('.mac-btn');
    if (b) apriScheda(b.dataset.id, $('img', b));
  });
  $('[data-scheda-chiudi]').addEventListener('click', chiudiScheda);
  scheda.addEventListener('click', (e) => { if (e.target === scheda) chiudiScheda(); });
  S('cta').addEventListener('click', (e) => {
    e.preventDefault();
    if (corrente) {
      $('[data-campo-macchina]').value = corrente.nome + (corrente.serie ? ` (serie ${corrente.serie})` : '');
      if (stato.tag) $('#f-prodotto').value = TAG_FORM[stato.tag];
    }
    chiudiScheda();
    $('#contatti').scrollIntoView({ behavior: ridotto ? 'auto' : 'smooth' });
    setTimeout(() => $('#f-nome').focus({ preventScroll: true }), ridotto ? 0 : 700);
  });

  // ---------- modulo: compone il messaggio ----------
  const modulo = $('[data-modulo]');
  const errore = $('[data-errore]');
  function messaggio() {
    const f = new FormData(modulo);
    const v = (k) => String(f.get(k) || '').trim();
    const righe = [`Buongiorno PMC Solutions, sono ${v('nome')}${v('azienda') ? ' di ' + v('azienda') : ''}. Vorrei una consulenza gratuita.`];
    if (v('prodotto')) righe.push(`Prodotto da confezionare: ${v('prodotto')}`);
    if (v('macchina')) righe.push(`Macchina che mi interessa: ${v('macchina')}`);
    if (v('messaggio')) righe.push(v('messaggio'));
    righe.push(`Recapito: ${v('contatto')}`);
    return righe.join('\n');
  }
  function valido() {
    let ok = true;
    ['f-nome', 'f-contatto'].forEach((id) => {
      const el = $('#' + id);
      const vuoto = !el.value.trim();
      el.classList.toggle('errato', vuoto);
      el.setAttribute('aria-invalid', String(vuoto));
      if (vuoto && ok) { el.focus(); ok = false; }
    });
    errore.hidden = ok;
    return ok;
  }
  modulo.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!valido()) return;
    window.open(`https://wa.me/${WA}?text=${encodeURIComponent(messaggio())}`, '_blank', 'noopener');
  });
  $('[data-email]').addEventListener('click', () => {
    if (!valido()) return;
    location.href = `mailto:info@pmcsolutions.it?subject=${encodeURIComponent('Richiesta di consulenza dal sito')}&body=${encodeURIComponent(messaggio())}`;
  });

  // ---------- palco della linea (funziona anche senza 3D) ----------
  const corsa = $('[data-linea]');
  const passi = $$('.passo', corsa);
  const segmenti = $$('.linea-barra li', corsa);
  let passoAttivo = 0;
  function aggiornaLinea() {
    const r = corsa.getBoundingClientRect();
    const p = clamp(-r.top / Math.max(1, r.height - innerHeight));
    const s = p * 4 * 0.999;
    const n = Math.min(3, Math.floor(s));
    segmenti.forEach((li, i) => li.style.setProperty('--p', clamp(s - i).toFixed(3)));
    if (n !== passoAttivo) {
      passoAttivo = n;
      passi.forEach((el, i) => el.classList.toggle('attivo', i === n));
    }
  }

  // ---------- nastri di parole legati allo scroll ----------
  const nastri = $$('[data-nastro]');
  const sezParole = $('.parole');
  function aggiornaNastri() {
    if (ridotto || !sezParole) return;
    const r = sezParole.getBoundingClientRect();
    if (r.bottom < -100 || r.top > innerHeight + 100) return;
    const k = (innerHeight - r.top) / (innerHeight + r.height);
    nastri.forEach((n) => {
      const dir = +n.dataset.nastro;
      const larg = n.firstElementChild.scrollWidth - innerWidth;
      const x = dir > 0 ? -k * larg * 0.75 : -larg * 0.75 + k * larg * 0.75;
      n.style.transform = `translate3d(${x.toFixed(1)}px,0,0)`;
    });
  }

  // ---------- un solo giro per fotogramma sullo scroll ----------
  let richiesto = false;
  function aggiorna() {
    richiesto = false;
    testata.classList.toggle('piena', scrollY > 30 || !menu.hidden);
    aggiornaLinea();
    aggiornaNastri();
  }
  function chiedi() { if (!richiesto) { richiesto = true; requestAnimationFrame(aggiorna); } }
  addEventListener('scroll', chiedi, { passive: true });
  addEventListener('resize', chiedi);
  aggiorna();
  filtra(false);

  // ---------- 3D: arriva dopo la pagina ----------
  function webgl() {
    try {
      const c = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
    } catch (e) { return false; }
  }
  if (!webgl()) return;

  const cuboCanvas = $('[data-cubo]');
  function caricaCubo() {
    import('./3d-cubo.js').then((m) => m.avvia(cuboCanvas)).catch((err) => console.warn('Cubo 3D non disponibile', err));
  }
  if (document.readyState === 'complete') setTimeout(caricaCubo, 0);
  else addEventListener('load', () => setTimeout(caricaCubo, 0), { once: true });

  const lineaCanvas = $('[data-linea-canvas]');
  let lineaCaricata = false;
  const ioLinea = new IntersectionObserver((v) => {
    if (lineaCaricata || !v[0].isIntersecting) return;
    lineaCaricata = true;
    ioLinea.disconnect();
    import('./3d-linea.js').then((m) => m.avvia(lineaCanvas)).catch((err) => console.warn('Linea 3D non disponibile', err));
  }, { rootMargin: '120% 0px' });
  ioLinea.observe(corsa);
})();
