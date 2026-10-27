(() => {
  'use strict';
  const root = document.documentElement;
  const ridotto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  /* anno nel piede */
  const anno = $('#anno');
  if (anno) anno.textContent = new Date().getFullYear();

  /* ---------- titolo diviso in parole ---------- */
  const titolo = $('.hero__titolo');
  if (titolo) {
    const parole = titolo.textContent.trim().split(/\s+/);
    titolo.setAttribute('aria-label', titolo.textContent.trim());
    titolo.innerHTML = parole
      .map((p, i) => `<span class="parola" aria-hidden="true"><span style="--i:${i}">${p}</span></span>`)
      .join(' ');
    titolo.classList.add('diviso');
  }

  const fineIntro = () => {
    root.classList.add('testo-pronto');
    root.classList.remove('intro');
  };

  /* ---------- intro dell'hero: la foto si posa a piastrelle ---------- */
  const heroImg = $('.hero__img');
  const posa = $('.hero__posa');

  const posaHero = () => {
    const box = posa.getBoundingClientRect();
    const W = box.width, H = box.height;
    const iw = heroImg.naturalWidth, ih = heroImg.naturalHeight;
    if (!W || !H || !iw || !ih) return fineIntro();

    const scala = Math.max(W / iw, H / ih);
    const dw = iw * scala, dh = ih * scala;
    const ox = (W - dw) / 2, oy = (H - dh) / 2;
    const col = W < 700 ? 5 : W < 1200 ? 9 : 11;
    const ts = W / col;
    const righe = Math.ceil(H / ts);
    posa.style.setProperty('--ts', ts + 'px');

    const src = heroImg.currentSrc || heroImg.src;
    const frag = document.createDocumentFragment();
    const animazioni = [];
    const passo = 46;
    for (let r = 0; r < righe; r++) {
      for (let c = 0; c < col; c++) {
        const t = document.createElement('div');
        t.className = 'tessera';
        t.style.cssText =
          `left:${c * ts}px;top:${r * ts}px;width:${Math.ceil(ts)}px;height:${Math.ceil(ts)}px;` +
          `background-image:url("${src}");background-size:${dw}px ${dh}px;` +
          `background-position:${ox - c * ts}px ${oy - r * ts}px;opacity:0`;
        frag.appendChild(t);
        // la posa parte dall'angolo in basso a sinistra, come fa un posatore dalla porta
        const ritardo = (c + (righe - 1 - r)) * passo + Math.random() * 40;
        animazioni.push([t, ritardo]);
      }
    }
    posa.appendChild(frag);

    let ultima = 0;
    animazioni.forEach(([t, ritardo]) => {
      ultima = Math.max(ultima, ritardo);
      t.animate(
        [
          { opacity: 0, transform: 'translate3d(0,-26px,60px) rotateX(34deg) scale(1.06)' },
          { opacity: 1, offset: 0.55 },
          { opacity: 1, transform: 'none' }
        ],
        { duration: 760, delay: ritardo, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'both' }
      );
    });

    // il testo entra mentre la posa è a metà
    setTimeout(() => root.classList.add('testo-pronto'), 420);
    // a posa finita la foto intera prende il posto delle piastrelle
    setTimeout(() => {
      root.classList.remove('intro');
      setTimeout(() => posa.replaceChildren(), 600);
    }, ultima + 820);
  };

  if (root.classList.contains('intro') && heroImg && posa) {
    let partito = false;
    const via = () => {
      if (partito) return;
      partito = true;
      requestAnimationFrame(posaHero);
    };
    if (heroImg.complete && heroImg.naturalWidth) via();
    else {
      heroImg.addEventListener('load', via, { once: true });
      heroImg.addEventListener('error', fineIntro, { once: true });
      // se la foto tarda troppo, niente intro: si mostra tutto
      setTimeout(() => { if (!partito) { partito = true; fineIntro(); } }, 2200);
    }
  } else {
    fineIntro();
  }

  /* ---------- testata ---------- */
  const testata = $('#testata');
  const aggiornaTestata = () => testata.classList.toggle('solida', scrollY > 40);
  aggiornaTestata();
  addEventListener('scroll', aggiornaTestata, { passive: true });

  /* ---------- menu mobile ---------- */
  const menuBtn = $('.menu-btn');
  const menu = $('#menu');
  const chiudiMenu = () => {
    menu.hidden = true;
    root.classList.remove('menu-aperto');
    menuBtn.setAttribute('aria-expanded', 'false');
    menuBtn.setAttribute('aria-label', 'Apri il menu');
  };
  menuBtn.addEventListener('click', () => {
    const apri = menu.hidden;
    if (!apri) return chiudiMenu();
    menu.hidden = false;
    root.classList.add('menu-aperto');
    menuBtn.setAttribute('aria-expanded', 'true');
    menuBtn.setAttribute('aria-label', 'Chiudi il menu');
  });
  $$('a', menu).forEach((a) => a.addEventListener('click', chiudiMenu));
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) chiudiMenu(); });

  /* ---------- percorso: la linea avanza con lo scroll ---------- */
  const passi = $('.passi');
  const voci = $$('.passo');
  let rafPercorso = 0;
  const aggiornaPercorso = () => {
    rafPercorso = 0;
    const r = passi.getBoundingClientRect();
    const meta = innerHeight * 0.62;
    const av = Math.min(1, Math.max(0, (meta - r.top) / r.height));
    passi.style.setProperty('--avanzamento', av.toFixed(4));
    voci.forEach((v) => v.classList.toggle('fatto', v.getBoundingClientRect().top < meta));
  };
  if (passi) {
    aggiornaPercorso();
    addEventListener('scroll', () => { if (!rafPercorso) rafPercorso = requestAnimationFrame(aggiornaPercorso); }, { passive: true });
  }

  /* ---------- storia: la K gira e diventa un tetto ---------- */
  const k = $('#storia-k');
  let rafK = 0;
  const aggiornaK = () => {
    rafK = 0;
    // la sezione, non la K: su desktop la K è sticky e la sua posizione non cambia
    const r = k.closest('.storia').getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (innerHeight * 0.7 - r.top) / (innerHeight * 0.45)));
    const e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
    k.style.setProperty('--giro', (90 * e).toFixed(2) + 'deg');
  };
  if (k && !ridotto) {
    aggiornaK();
    addEventListener('scroll', () => { if (!rafK) rafK = requestAnimationFrame(aggiornaK); }, { passive: true });
  }

  /* ---------- lavori: filtri e "mostra altri" ---------- */
  const lista = $('#lavori-lista');
  const altri = $('#lavori-altri');
  const lavori = $$('.lavoro', lista);
  $$('.filtro').forEach((b) =>
    b.addEventListener('click', () => {
      const f = b.dataset.filtro;
      $$('.filtro').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      lavori.forEach((l) => { l.hidden = f !== 'tutti' && l.dataset.tipo !== f; });
      if (f !== 'tutti') {
        lista.classList.add('tutti-visibili');
        altri.hidden = true;
      } else if (!lista.dataset.aperta) {
        lista.classList.remove('tutti-visibili');
        altri.hidden = false;
      }
    })
  );
  altri.addEventListener('click', () => {
    lista.classList.add('tutti-visibili');
    lista.dataset.aperta = '1';
    altri.hidden = true;
    const primo = $('.lavoro--in-piu:not([hidden])', lista);
    if (primo) primo.querySelector('button').focus({ preventScroll: true });
  });

  /* ---------- lente: foto ingrandita ---------- */
  const lente = $('#lente');
  const lenteImg = $('#lente-img');
  $$('.lavoro__img').forEach((b) =>
    b.addEventListener('click', () => {
      const img = b.querySelector('img');
      lenteImg.src = img.currentSrc || img.src;
      lenteImg.alt = img.alt;
      if (typeof lente.showModal === 'function') lente.showModal();
      else window.open(lenteImg.src, '_blank');
    })
  );
  $('#lente-chiudi').addEventListener('click', () => lente.close());
  lente.addEventListener('click', (e) => { if (e.target === lente) lente.close(); });

  /* ---------- modulo: compone l'email ---------- */
  const modulo = $('#modulo');
  const errore = $('#modulo-errore');
  modulo.addEventListener('submit', (e) => {
    e.preventDefault();
    const nome = modulo.nome.value.trim();
    const tel = modulo.telefono.value.trim();
    modulo.nome.setAttribute('aria-invalid', String(!nome));
    modulo.telefono.setAttribute('aria-invalid', String(tel.replace(/\D/g, '').length < 6));
    if (!nome || tel.replace(/\D/g, '').length < 6) {
      errore.textContent = !nome ? 'Scrivi il tuo nome, così sappiamo chi cercare.' : 'Scrivi un numero di telefono valido per farti richiamare.';
      errore.hidden = false;
      (!nome ? modulo.nome : modulo.telefono).focus();
      return;
    }
    errore.hidden = true;
    const lavoriScelti = $$('input[name="lavoro"]:checked', modulo).map((i) => i.value);
    const messaggio = modulo.messaggio.value.trim();
    const righe = ['Buongiorno, vorrei prenotare una visita in showroom.', '', `Nome: ${nome}`, `Telefono: ${tel}`];
    if (lavoriScelti.length) righe.push(`Cosa vorrei rifare: ${lavoriScelti.join(', ')}`);
    righe.push(`Quando preferisco: ${modulo.quando.value}`);
    if (messaggio) righe.push('', messaggio);
    righe.push('', 'Grazie, aspetto una vostra chiamata.');
    const oggetto = `Visita in showroom: ${nome}`;
    location.href = `mailto:info@krea.casa?subject=${encodeURIComponent(oggetto)}&body=${encodeURIComponent(righe.join('\n'))}`;
  });

  /* ---------- barra mobile: si toglie sopra il modulo ---------- */
  const barra = $('.barra');
  const prenota = $('#prenota');
  if (barra && prenota && 'IntersectionObserver' in window) {
    new IntersectionObserver(([v]) => barra.classList.toggle('via', v.isIntersecting), { threshold: 0.15 }).observe(prenota);
  }

  /* ---------- prova la posa: il 3D arriva quando serve ---------- */
  const palco = $('#posa-palco');
  let caricato = false;
  const carica3D = () => {
    if (caricato) return;
    caricato = true;
    import('./posa3d.js')
      .then((m) => m.avvia(palco, { ridotto }))
      .catch(() => palco.classList.add('senza-3d'));
  };
  if (palco) {
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(([v]) => { if (v.isIntersecting) { io.disconnect(); carica3D(); } }, { rootMargin: '700px 0px' });
      io.observe(palco);
    }
    // dopo il caricamento della pagina si prepara comunque, senza fretta
    addEventListener('load', () => setTimeout(carica3D, 2500), { once: true });
  }
})();
