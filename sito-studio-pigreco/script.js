// Studio Pigreco — motion: titoli, comparse, cartiglio, scroll, comparatore, ingranaggi, galleria, mirino CAD, modulo
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const ridotto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mouse = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const limita = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const morbido = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  /* Titoli: ogni parola sale dalla sua maschera */
  $$('[data-parole]').forEach(el => {
    const parole = el.textContent.trim().split(/\s+/);
    el.textContent = '';
    parole.forEach((p, i) => {
      const fuori = document.createElement('span');
      const dentro = document.createElement('span');
      fuori.className = 'parola';
      dentro.className = 'parola-in';
      dentro.textContent = p;
      dentro.style.setProperty('--w', i);
      fuori.append(dentro);
      el.append(fuori);
      if (i < parole.length - 1) el.append(' ');
    });
  });
  const titoloHero = $('#hero-titolo');
  requestAnimationFrame(() => requestAnimationFrame(() => titoloHero.classList.add('in')));

  /* Comparse allo scroll */
  const avvii = new Map();
  const quandoVisibile = (el, fn) => avvii.set(el, fn);
  let lotto = 0;
  const rivela = el => {
    if (el.classList.contains('opera')) el.style.setProperty('--k', lotto++ % 6);
    el.classList.add('in');
    const fn = avvii.get(el);
    if (fn) fn(el);
  };
  const daOsservare = $$('[data-parole]:not(#hero-titolo), [data-rivela], .opera, #linea-tempo, #ing-scena, #comparatore');
  if (ridotto || !('IntersectionObserver' in window)) {
    requestAnimationFrame(() => daOsservare.forEach(rivela));
  } else {
    const io = new IntersectionObserver(voci => {
      lotto = 0;
      voci.forEach(v => { if (v.isIntersecting) { io.unobserve(v.target); rivela(v.target); } });
    }, { rootMargin: '0px 0px -10% 0px', threshold: .12 });
    requestAnimationFrame(() => daOsservare.forEach(el => io.observe(el)));
  }

  /* Cartiglio: i valori si scrivono, i metri quadri contano */
  quandoVisibile($('.cartiglio-sez'), sez => {
    if (ridotto) return;
    $$('[data-scrivi]', sez).forEach((el, i) => {
      const testo = el.textContent;
      el.textContent = '';
      el.classList.add('scrive');
      let j = 0;
      const batti = () => {
        el.textContent = testo.slice(0, ++j);
        if (j < testo.length) setTimeout(batti, 55);
        else setTimeout(() => el.classList.remove('scrive'), 450);
      };
      setTimeout(batti, 420 + i * 420);
    });
    const n = $('[data-conta]', sez);
    const fine = +n.dataset.conta;
    const t0 = performance.now();
    n.textContent = '0';
    const conta = () => {
      const p = limita((performance.now() - t0 - 300) / 1500);
      n.textContent = Math.round(fine * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(conta);
    };
    requestAnimationFrame(conta);
  });

  /* Comparatore: lo stelo tocca il pezzo, la lancetta oscilla e si azzera */
  const comp = $('#comparatore');
  const ago = $('#comp-ago');
  const giri = $('#comp-giri');
  const stelo = $('#comp-stelo');
  (() => {
    const tacche = $('#comp-tacche');
    const numeri = $('#comp-numeri');
    const ns = 'http://www.w3.org/2000/svg';
    for (let i = 0; i < 100; i++) {
      const a = (i * 3.6 - 90) * Math.PI / 180;
      const lunga = i % 10 === 0;
      const l = lunga ? 12 : i % 5 === 0 ? 8 : 5;
      const t = document.createElementNS(ns, 'line');
      t.setAttribute('x1', 120 + Math.cos(a) * 91);
      t.setAttribute('y1', 120 + Math.sin(a) * 91);
      t.setAttribute('x2', 120 + Math.cos(a) * (91 - l));
      t.setAttribute('y2', 120 + Math.sin(a) * (91 - l));
      if (lunga) {
        t.classList.add('lunga');
        const n = document.createElementNS(ns, 'text');
        n.setAttribute('x', 120 + Math.cos(a) * 68);
        n.setAttribute('y', 120 + Math.sin(a) * 68);
        n.textContent = i;
        numeri.append(n);
      }
      tacche.append(t);
    }
  })();
  const posaComparatore = (gradi, salita) => {
    ago.setAttribute('transform', `rotate(${gradi.toFixed(2)} 120 120)`);
    giri.setAttribute('transform', `rotate(${(gradi / 10).toFixed(2)} 120 160)`);
    stelo.setAttribute('transform', `translate(0 ${salita.toFixed(2)})`);
  };
  let compVia = false;
  const misura = () => {
    if (ridotto) return posaComparatore(0, 0);
    if (compVia) return;
    compVia = true;
    const t0 = performance.now();
    const passo = () => {
      const s = (performance.now() - t0) / 1000;
      if (s < .45) {
        posaComparatore(0, -26 * (1 - morbido(s / .45)));
      } else {
        const u = s - .45;
        const g = 170 * Math.exp(-2.4 * u) * Math.cos(8 * u);
        posaComparatore(g, -Math.abs(g) * .012);
      }
      if (s < 3.2) requestAnimationFrame(passo);
      else { posaComparatore(0, 0); compVia = false; }
    };
    requestAnimationFrame(passo);
  };
  posaComparatore(0, ridotto ? 0 : -26);
  quandoVisibile(comp, misura);
  if (mouse) comp.addEventListener('pointerenter', misura);

  /* Ingranaggi in disegno: profilo a evolvente, ruotano con lo scroll */
  const profilo = (z, m) => {
    const alfa = 20 * Math.PI / 180;
    const r = m * z / 2, ra = r + m, rf = r - 1.25 * m, rb = r * Math.cos(alfa);
    const inv = x => Math.tan(x) - x;
    const mezzo = Math.PI / (2 * z) + inv(alfa);
    const tA = Math.sqrt((ra / rb) ** 2 - 1);
    const t0 = Math.sqrt(Math.max(0, (Math.max(rb, rf) / rb) ** 2 - 1));
    const polare = (R, a) => [R * Math.cos(a), R * Math.sin(a)];
    const punti = [];
    const N = 7;
    for (let i = 0; i < z; i++) {
      const c = i * 2 * Math.PI / z;
      if (rf < rb) punti.push(polare(rf, c - mezzo));
      for (let k = 0; k <= N; k++) { const t = t0 + (tA - t0) * k / N; punti.push(polare(rb * Math.hypot(1, t), c - mezzo + t - Math.atan(t))); }
      for (let k = N; k >= 0; k--) { const t = t0 + (tA - t0) * k / N; punti.push(polare(rb * Math.hypot(1, t), c + mezzo - t + Math.atan(t))); }
      if (rf < rb) punti.push(polare(rf, c + mezzo));
      const da = c + mezzo, a = c + 2 * Math.PI / z - mezzo;
      for (let k = 1; k < 3; k++) punti.push(polare(rf, da + (a - da) * k / 3));
    }
    return punti;
  };
  window.pigrecoProfilo = profilo;
  const ZA = 28, ZB = 14;
  const faseB = 180 - 180 / ZB;
  const ruotaA = $('#ruota-a');
  const ruotaB = $('#ruota-b');
  const disegnaRuota = (g, z, m, cx, cy, fori) => {
    const ns = 'http://www.w3.org/2000/svg';
    const p = document.createElementNS(ns, 'path');
    p.setAttribute('d', 'M' + profilo(z, m).map(([x, y]) => `${(cx + x).toFixed(2)} ${(cy + y).toFixed(2)}`).join('L') + 'Z');
    p.setAttribute('pathLength', '1');
    g.append(p);
    for (let i = 0; i < fori; i++) {
      const a = i * 2 * Math.PI / fori;
      const c = document.createElementNS(ns, 'path');
      const x = cx + Math.cos(a) * 78, y = cy + Math.sin(a) * 78;
      c.setAttribute('d', `M${x + 24} ${y}a24 24 0 1 0 -48 0a24 24 0 1 0 48 0`);
      c.setAttribute('pathLength', '1');
      g.append(c);
    }
  };
  disegnaRuota(ruotaA, ZA, 10, 215, 230, 5);
  disegnaRuota(ruotaB, ZB, 10, 425, 230, 0);
  const scenaIng = $('#ing-scena');

  /* Prototipo: con il movimento ridotto le due facce stanno affiancate */
  const prototipo = $('#prototipo');
  if (ridotto) prototipo.classList.add('statico');

  /* Un solo giro di calcolo per tutto ciò che segue lo scroll */
  const testata = $('#testata');
  const hero = $('.hero');
  const righe = $$('[data-nastro]');
  const nastro = $('.nastro');
  const schede = $$('.scheda');
  const pista = $('.prototipo-pista');
  const carta = $('#carta');
  const navLink = $$('.nav a');
  const sezioniNav = navLink.map(a => $(a.getAttribute('href')));
  let inCoda = false;
  const aggiorna = () => {
    inCoda = false;
    const y = scrollY, vh = innerHeight;
    testata.classList.toggle('solida', y > 40);
    const max = Math.max(1, document.documentElement.scrollHeight - vh);
    testata.style.setProperty('--pg', (y / max).toFixed(4));
    if (agganciato) piazzaAggancio(agganciato);

    if (y < vh * 1.4 && !ridotto) {
      hero.style.setProperty('--py', (y * .25).toFixed(1) + 'px');
      hero.style.setProperty('--hp', limita(y / (hero.offsetHeight * .9)).toFixed(3));
    }

    const rn = nastro.getBoundingClientRect();
    if (rn.bottom > 0 && rn.top < vh && !ridotto) {
      const p = limita((vh - rn.top) / (vh + rn.height));
      righe.forEach(r => {
        const w = r.scrollWidth * .3;
        const x = +r.dataset.nastro < 0 ? -p * w : -w + p * w;
        r.style.setProperty('--nx', x.toFixed(1) + 'px');
      });
    }

    if (!ridotto) {
      const alto = testata.offsetHeight;
      schede.forEach((s, i) => {
        const dopo = schede[i + 1];
        if (!dopo) return;
        const fermo = alto + 14 + i * 14;
        const t = limita(1 - (dopo.getBoundingClientRect().top - fermo - 14) / s.offsetHeight);
        s.style.setProperty('--s', (1 - t * .06).toFixed(4));
        s.style.setProperty('--o', (t * .35).toFixed(3));
      });

      const rp = pista.getBoundingClientRect();
      if (rp.bottom > 0 && rp.top < vh) {
        const p = limita(-rp.top / Math.max(1, rp.height - vh));
        const f = morbido(limita((p - .18) / .58));
        const arco = Math.sin(f * Math.PI);
        carta.style.setProperty('--ry', (f * 180).toFixed(2) + 'deg');
        carta.style.setProperty('--rx', (-arco * 9 + (p - .5) * 6).toFixed(2) + 'deg');
        carta.style.setProperty('--lo', arco.toFixed(3));
        carta.style.setProperty('--lx', f.toFixed(3));
        prototipo.style.setProperty('--fp', f.toFixed(3));
        prototipo.style.setProperty('--ombra', (.35 + Math.abs(Math.cos(f * Math.PI)) * .65).toFixed(3));
      }

      const ri = scenaIng.getBoundingClientRect();
      if (ri.bottom > 0 && ri.top < vh) {
        const gradi = (vh - ri.top) * .18;
        ruotaA.setAttribute('transform', `rotate(${gradi.toFixed(2)} 215 230)`);
        ruotaB.setAttribute('transform', `rotate(${(-gradi * ZA / ZB + faseB).toFixed(2)} 425 230)`);
      }
    }

    let qui = -1;
    sezioniNav.forEach((s, i) => { if (s && s.getBoundingClientRect().top < vh * .4) qui = i; });
    navLink.forEach((a, i) => a.classList.toggle('qui', i === qui));
  };
  const chiedi = () => { if (!inCoda) { inCoda = true; requestAnimationFrame(aggiorna); } };
  addEventListener('scroll', chiedi, { passive: true });
  addEventListener('resize', chiedi);
  ruotaB.setAttribute('transform', `rotate(${faseB} 425 230)`);

  /* Barra mobile: compare quando i bottoni dell'hero escono dallo schermo */
  const barra = $('.barra-mobile');
  const azioniHero = $('.hero-azioni');
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => barra.classList.toggle('su', !e.isIntersecting && e.boundingClientRect.top < innerHeight)).observe(azioniHero);
  } else barra.classList.add('su');

  /* Menu mobile */
  const menuBtn = $('.menu-btn');
  const menu = $('#menu');
  $$('#menu nav a').forEach((a, i) => a.style.setProperty('--i', i));
  const chiudiMenu = () => {
    menu.hidden = true;
    menuBtn.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('menu-aperto');
  };
  menuBtn.addEventListener('click', () => {
    const apri = menu.hidden;
    menu.hidden = !apri;
    menuBtn.setAttribute('aria-expanded', String(apri));
    document.body.classList.toggle('menu-aperto', apri);
  });
  $$('#menu a').forEach(a => a.addEventListener('click', chiudiMenu));
  addEventListener('keydown', e => { if (e.key === 'Escape' && !menu.hidden) { chiudiMenu(); menuBtn.focus(); } });
  matchMedia('(min-width: 1100px)').addEventListener('change', e => { if (e.matches) chiudiMenu(); });

  /* Voci "cosa costruiamo": su desktop una sempre attiva (anche al passaggio del mouse), su mobile fisarmonica */
  const voci = $$('.voce');
  const largo = matchMedia('(min-width: 1000px)');
  const attiva = v => voci.forEach(x => {
    const on = x === v;
    x.classList.toggle('attiva', on);
    $('.voce-testa', x).setAttribute('aria-expanded', String(on));
  });
  let attesaVoce;
  voci.forEach(v => {
    const testa = $('.voce-testa', v);
    testa.addEventListener('click', () => {
      if (largo.matches) { if (!v.classList.contains('attiva')) attiva(v); }
      else attiva(v.classList.contains('attiva') ? null : v);
    });
    if (mouse) {
      testa.addEventListener('pointerenter', () => {
        clearTimeout(attesaVoce);
        attesaVoce = setTimeout(() => { if (largo.matches && !v.classList.contains('attiva')) attiva(v); }, 140);
      });
      testa.addEventListener('pointerleave', () => clearTimeout(attesaVoce));
    }
  });
  largo.addEventListener('change', e => { if (e.matches && !voci.some(v => v.classList.contains('attiva'))) attiva(voci[0]); });

  /* Galleria: filtri con le foto che scivolano al loro posto */
  const opere = $$('.opera');
  const galleria = $('#galleria');
  const tutti = $('#galleria-tutti');
  const apriGalleria = () => { galleria.classList.remove('compatta'); tutti.hidden = true; };
  tutti.addEventListener('click', apriGalleria);
  $$('.filtro').forEach(f => f.addEventListener('click', () => {
    $$('.filtro').forEach(x => x.setAttribute('aria-pressed', String(x === f)));
    const cat = f.dataset.filtro;
    const prima = new Map();
    opere.forEach(o => { if (o.offsetParent) prima.set(o, o.getBoundingClientRect()); });
    apriGalleria();
    opere.forEach(o => o.classList.toggle('fuori', !(cat === 'tutti' || o.dataset.cat === cat)));
    if (ridotto) { opere.forEach(o => o.classList.add('in')); return; }
    let k = 0;
    opere.forEach(o => {
      if (o.classList.contains('fuori')) return;
      const dopo = o.getBoundingClientRect();
      const da = prima.get(o);
      if (da) {
        const dx = da.left - dopo.left, dy = da.top - dopo.top;
        if (dx || dy) o.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: 650, easing: 'cubic-bezier(.2,.8,.2,1)' });
      } else {
        o.classList.add('in');
        o.animate([{ opacity: 0, transform: 'translateY(24px) scale(.94)' }, { opacity: 1, transform: 'none' }], { duration: 550, delay: 40 * k++, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' });
      }
    });
  }));

  /* Lente: la foto si ingrandisce partendo dalla miniatura */
  const lente = $('#lente');
  const lenteImg = $('#lente-img');
  const lenteTesto = $('#lente-didascalia');
  let corrente = 0;
  const visibili = () => opere.filter(o => !o.classList.contains('fuori'));
  const misuraLente = img => {
    const w = +img.getAttribute('width'), h = +img.getAttribute('height');
    const maxW = Math.min(innerWidth - 28, 1400), maxH = innerHeight - 150;
    const s = Math.min(maxW / w, maxH / h);
    lenteImg.style.width = Math.round(w * s) + 'px';
    lenteImg.style.height = Math.round(h * s) + 'px';
  };
  const caricaGrande = b => {
    const grande = new Image();
    grande.src = b.dataset.grande;
    grande.onload = () => { if (lenteImg.dataset.per === b.dataset.grande) lenteImg.src = grande.src; };
  };
  const mostra = (i, zoom) => {
    const lista = visibili();
    corrente = (i + lista.length) % lista.length;
    const b = $('button', lista[corrente]);
    const mini = $('img', b);
    lenteImg.dataset.per = b.dataset.grande;
    lenteImg.src = mini.currentSrc || mini.src;
    lenteImg.alt = mini.alt;
    lenteTesto.textContent = $('.opera-nome', b).textContent;
    misuraLente(mini);
    caricaGrande(b);
    if (ridotto) return;
    if (zoom) {
      const da = mini.getBoundingClientRect();
      const a = lenteImg.getBoundingClientRect();
      lenteImg.animate([
        { transform: `translate(${da.left - a.left}px, ${da.top - a.top}px) scale(${da.width / a.width}, ${da.height / a.height})` },
        { transform: 'none' }
      ], { duration: 520, easing: 'cubic-bezier(.2,.8,.2,1)' });
    } else {
      lenteImg.animate([{ opacity: 0, transform: 'scale(.97)' }, { opacity: 1, transform: 'none' }], { duration: 320, easing: 'ease-out' });
    }
  };
  const apriLente = o => {
    lente.showModal();
    mostra(visibili().indexOf(o), true);
    requestAnimationFrame(() => lente.classList.add('aperta'));
  };
  const chiudiLente = () => {
    if (!lente.open) return;
    lente.classList.remove('aperta');
    const mini = $('img', visibili()[corrente]);
    const da = mini.getBoundingClientRect();
    if (!ridotto && da.bottom > 0 && da.top < innerHeight) {
      const a = lenteImg.getBoundingClientRect();
      lenteImg.animate([
        { transform: 'none' },
        { transform: `translate(${da.left - a.left}px, ${da.top - a.top}px) scale(${da.width / a.width}, ${da.height / a.height})` }
      ], { duration: 380, easing: 'cubic-bezier(.65,.05,.25,1)', fill: 'forwards' });
      setTimeout(() => { lente.close(); lenteImg.getAnimations().forEach(x => x.cancel()); }, 380);
    } else lente.close();
  };
  opere.forEach(o => $('button', o).addEventListener('click', () => apriLente(o)));
  $('.lente-chiudi').addEventListener('click', chiudiLente);
  $('.lente-prec').addEventListener('click', () => mostra(corrente - 1));
  $('.lente-succ').addEventListener('click', () => mostra(corrente + 1));
  lente.addEventListener('cancel', e => { e.preventDefault(); chiudiLente(); });
  lente.addEventListener('click', e => { if (e.target === lente || e.target.tagName === 'FIGURE') chiudiLente(); });
  lente.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') mostra(corrente - 1);
    if (e.key === 'ArrowRight') mostra(corrente + 1);
  });
  let x0 = null;
  lente.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
  lente.addEventListener('touchend', e => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 50) mostra(corrente + (dx < 0 ? 1 : -1));
    x0 = null;
  });

  /* Linea del tempo in scala sull'anno corrente */
  const anno = new Date().getFullYear();
  const anni = anno - 1988;
  $('#anni-attivita').textContent = anni;
  $('#anno').textContent = anno;
  const tappe = $$('.lt-tappe li');
  [[1, 2000], [2, 2010]].forEach(([i, a]) => tappe[i].style.setProperty('--pos', ((a - 1988) / anni).toFixed(4)));

  /* Modulo: compone la mail per l'ufficio tecnico e timbra la richiesta */
  const modulo = $('#modulo');
  const errore = $('#modulo-errore');
  const nota = $('#modulo-nota');
  const timbro = $('#timbro');
  const nomi = { nome: 'Nome e cognome', email: 'Email', messaggio: 'Descrivi il pezzo o la macchina' };
  modulo.addEventListener('input', e => e.target.removeAttribute('aria-invalid'));
  modulo.addEventListener('submit', e => {
    e.preventDefault();
    const nonValido = $$('input, select, textarea', modulo).find(c => !c.checkValidity());
    if (nonValido) {
      nonValido.removeAttribute('aria-invalid');
      void nonValido.offsetWidth;
      nonValido.setAttribute('aria-invalid', 'true');
      errore.textContent = nonValido.name === 'privacy'
        ? "Spunta la casella dell'informativa sulla privacy per inviare la richiesta."
        : nonValido.type === 'email' && nonValido.value
          ? "L'indirizzo email non sembra completo: controllalo."
          : `Compila il campo «${nomi[nonValido.name]}».`;
      nonValido.focus();
      return;
    }
    errore.textContent = '';
    const d = Object.fromEntries(new FormData(modulo));
    const oggetto = `Richiesta di preventivo: ${d.tipo}`;
    const corpo = [
      'Buongiorno,', '', d.messaggio, '',
      '---',
      `Nome: ${d.nome}`,
      d.azienda ? `Azienda: ${d.azienda}` : null,
      `Email: ${d.email}`,
      d.telefono ? `Telefono: ${d.telefono}` : null,
      `Richiesta: ${d.tipo}`,
    ].filter(r => r !== null).join('\n');
    timbro.classList.remove('timbra');
    void timbro.offsetWidth;
    timbro.classList.add('timbra');
    location.href = `mailto:ut@studiopigreco.it?subject=${encodeURIComponent(oggetto)}&body=${encodeURIComponent(corpo)}`;
    nota.textContent = 'Richiesta di preventivo pronta nel tuo programma di posta: controlla e premi Invia. Se non si è aperto, scrivi a ut@studiopigreco.it.';
  });

  /* Mirino CAD, aggancio sugli elementi cliccabili, bottoni magnetici, lente sull'hero (solo con il mouse) */
  let agganciato = null;
  const aggancio = $('.aggancio');
  const piazzaAggancio = el => {
    const r = el.getBoundingClientRect();
    aggancio.style.left = r.left - 6 + 'px';
    aggancio.style.top = r.top - 6 + 'px';
    aggancio.style.width = r.width + 12 + 'px';
    aggancio.style.height = r.height + 12 + 'px';
  };
  if (mouse && !ridotto) {
    const radice = document.documentElement;
    const mirino = $('.mirino');
    const mx = $('#mx'), my = $('#my');
    let tx = -100, ty = -100, cx = -100, cy = -100, gira = false;
    const segui = () => {
      cx += (tx - cx) * .38;
      cy += (ty - cy) * .38;
      mirino.style.setProperty('--cx', cx.toFixed(1) + 'px');
      mirino.style.setProperty('--cy', cy.toFixed(1) + 'px');
      if (Math.abs(tx - cx) + Math.abs(ty - cy) > .3) requestAnimationFrame(segui);
      else gira = false;
    };
    addEventListener('pointermove', e => {
      if (e.pointerType !== 'mouse') return;
      tx = e.clientX; ty = e.clientY;
      radice.classList.add('mirino-attivo');
      mx.textContent = String(Math.round(tx + scrollX)).padStart(4, '0');
      my.textContent = String(Math.round(ty + scrollY)).padStart(4, '0');
      if (!gira) { gira = true; requestAnimationFrame(segui); }
    }, { passive: true });
    document.addEventListener('mouseleave', () => radice.classList.remove('mirino-attivo'));
    const bersagli = 'a, button, .filtro, summary';
    document.addEventListener('pointerover', e => {
      const t = e.target.closest(bersagli);
      if (t && !t.closest('.lente')) { agganciato = t; piazzaAggancio(t); radice.classList.add('aggancia'); }
    });
    document.addEventListener('pointerout', e => {
      const t = e.target.closest(bersagli);
      if (t && !t.contains(e.relatedTarget)) { agganciato = null; radice.classList.remove('aggancia'); }
    });
    $$('.btn--cta').forEach(b => {
      b.addEventListener('pointermove', e => {
        const r = b.getBoundingClientRect();
        b.style.setProperty('--mgx', ((e.clientX - r.left - r.width / 2) * .16).toFixed(1) + 'px');
        b.style.setProperty('--mgy', ((e.clientY - r.top - r.height / 2) * .22).toFixed(1) + 'px');
      });
      b.addEventListener('pointerleave', () => { b.style.setProperty('--mgx', '0px'); b.style.setProperty('--mgy', '0px'); });
    });
    let heroPronto = false;
    setTimeout(() => { heroPronto = true; }, 2800);
    hero.addEventListener('pointermove', e => {
      const r = hero.getBoundingClientRect();
      hero.style.setProperty('--mx', (e.clientX - r.left).toFixed(0) + 'px');
      hero.style.setProperty('--my', (e.clientY - r.top).toFixed(0) + 'px');
      if (heroPronto) hero.classList.toggle('lente-su', !e.target.closest('.hero-testo'));
    });
    hero.addEventListener('pointerleave', () => hero.classList.remove('lente-su'));
  }

  aggiorna();

  /* Scena 3D degli ingranaggi: arriva dopo la pagina, solo se c'è WebGL */
  const carica3d = () => {
    const prova = document.createElement('canvas');
    if (!(prova.getContext('webgl2') || prova.getContext('webgl'))) return;
    import('./3d.js')
      .then(m => m.avvia({ canvas: $('#ing-canvas'), scena: scenaIng, profilo, ZA, ZB, ridotto, mouse }))
      .catch(() => {});
  };
  if (document.readyState === 'complete') setTimeout(carica3d, 1200);
  else addEventListener('load', () => setTimeout(carica3d, 1200));
})();
