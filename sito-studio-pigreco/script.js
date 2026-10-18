// Studio Pigreco — testata, menu, catena di quote, voci, galleria, linea del tempo, modulo
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const ridotto = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Testata solida, parallasse dell'hero, catena del processo */
  const testata = $('#testata');
  const hero = $('.hero');
  const passi = $('#passi');
  let inCoda = false;
  const aggiorna = () => {
    inCoda = false;
    const y = scrollY;
    testata.classList.toggle('solida', y > 40);
    if (!ridotto && hero && y < innerHeight * 1.2) hero.style.setProperty('--py', (y * 0.22).toFixed(1) + 'px');
    if (passi) {
      const r = passi.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (innerHeight * 0.75 - r.top) / r.height));
      passi.style.setProperty('--p', p.toFixed(3));
    }
  };
  addEventListener('scroll', () => { if (!inCoda) { inCoda = true; requestAnimationFrame(aggiorna); } }, { passive: true });
  addEventListener('resize', aggiorna);
  aggiorna();

  /* Barra mobile: compare quando i bottoni dell'hero escono dallo schermo */
  const barra = $('.barra-mobile');
  const azioniHero = $('.hero-azioni');
  if ('IntersectionObserver' in window && azioniHero) {
    new IntersectionObserver(([e]) => barra.classList.toggle('su', !e.isIntersecting && e.boundingClientRect.top < innerHeight)).observe(azioniHero);
  } else barra.classList.add('su');

  /* Menu mobile */
  const menuBtn = $('.menu-btn');
  const menu = $('#menu');
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

  /* Voci "cosa costruiamo": su desktop una sempre attiva, su mobile fisarmonica */
  const voci = $$('.voce');
  const largo = matchMedia('(min-width: 1000px)');
  const attiva = v => voci.forEach(x => {
    const on = x === v;
    x.classList.toggle('attiva', on);
    $('.voce-testa', x).setAttribute('aria-expanded', String(on));
  });
  voci.forEach(v => $('.voce-testa', v).addEventListener('click', () => {
    if (largo.matches) attiva(v);
    else attiva(v.classList.contains('attiva') ? null : v);
  }));
  largo.addEventListener('change', e => { if (e.matches && !voci.some(v => v.classList.contains('attiva'))) attiva(voci[0]); });

  /* Galleria: filtri e lente */
  const opere = $$('.opera');
  const galleria = $('#galleria');
  const tutti = $('#galleria-tutti');
  const apriGalleria = () => { galleria.classList.remove('compatta'); tutti.hidden = true; };
  tutti.addEventListener('click', apriGalleria);
  $$('.filtro').forEach(f => f.addEventListener('click', () => {
    apriGalleria();
    $$('.filtro').forEach(x => x.setAttribute('aria-pressed', String(x === f)));
    const cat = f.dataset.filtro;
    let k = 0;
    opere.forEach(o => {
      const dentro = cat === 'tutti' || o.dataset.cat === cat;
      o.classList.toggle('fuori', !dentro);
      o.classList.remove('entra');
      if (dentro) { void o.offsetWidth; o.style.setProperty('--k', k++); o.classList.add('entra'); }
    });
  }));

  const lente = $('#lente');
  const lenteImg = $('#lente-img');
  const lenteTesto = $('#lente-didascalia');
  let corrente = 0;
  const visibili = () => opere.filter(o => !o.classList.contains('fuori'));
  const mostra = i => {
    const lista = visibili();
    corrente = (i + lista.length) % lista.length;
    const b = $('button', lista[corrente]);
    const img = $('img', b);
    lenteImg.style.animation = 'none'; void lenteImg.offsetWidth; lenteImg.style.animation = '';
    lenteImg.src = b.dataset.grande;
    lenteImg.alt = img.alt;
    lenteTesto.textContent = $('span', b).textContent;
  };
  opere.forEach(o => $('button', o).addEventListener('click', () => {
    mostra(visibili().indexOf(o));
    lente.showModal();
  }));
  $('.lente-chiudi').addEventListener('click', () => lente.close());
  $('.lente-prec').addEventListener('click', () => mostra(corrente - 1));
  $('.lente-succ').addEventListener('click', () => mostra(corrente + 1));
  lente.addEventListener('click', e => { if (e.target === lente || e.target.tagName === 'FIGURE') lente.close(); });
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

  /* Linea del tempo in scala: posizioni calcolate sull'anno corrente */
  const anno = new Date().getFullYear();
  const anni = anno - 1988;
  $('#anni-attivita').textContent = anni;
  $('#anno').textContent = anno;
  const tappe = $$('.lt-tappe li');
  [[1, 2000], [2, 2010]].forEach(([i, a]) => tappe[i].style.setProperty('--pos', ((a - 1988) / anni).toFixed(4)));
  const lt = $('#linea-tempo');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { lt.classList.add('in'); io.disconnect(); }
    }), { threshold: 0.35 });
    io.observe(lt);
  } else lt.classList.add('in');

  /* Modulo: compone la mail per l'ufficio tecnico */
  const modulo = $('#modulo');
  const errore = $('#modulo-errore');
  const nota = $('#modulo-nota');
  const nomi = { nome: 'Nome e cognome', email: 'Email', messaggio: 'Descrivi il pezzo o la macchina' };
  modulo.addEventListener('input', e => e.target.removeAttribute('aria-invalid'));
  modulo.addEventListener('submit', e => {
    e.preventDefault();
    const nonValido = $$('input, select, textarea', modulo).find(c => !c.checkValidity());
    if (nonValido) {
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
    location.href = `mailto:ut@studiopigreco.it?subject=${encodeURIComponent(oggetto)}&body=${encodeURIComponent(corpo)}`;
    nota.textContent = 'Richiesta di preventivo pronta nel tuo programma di posta: controlla e premi Invia. Se non si è aperto, scrivi a ut@studiopigreco.it.';
  });
})();
