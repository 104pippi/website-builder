(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const fermo = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Testata: diventa chiara appena si lascia l'hero
  const testata = $('[data-testata]');
  const aggiornaTestata = () => testata.classList.toggle('is-scorsa', scrollY > 40);
  addEventListener('scroll', aggiornaTestata, { passive: true });
  aggiornaTestata();

  // Menu mobile: si riempie dal basso come l'hero
  const menu = $('[data-menu]');
  const apriMenu = $('[data-apri-menu]');
  const chiudiMenu = () => {
    menu.classList.remove('is-aperto');
    document.documentElement.classList.remove('menu-aperto');
    apriMenu.setAttribute('aria-expanded', 'false');
    apriMenu.lastChild.textContent = ' Menu';
    setTimeout(() => { if (!menu.classList.contains('is-aperto')) menu.hidden = true; }, 600);
  };
  apriMenu.addEventListener('click', () => {
    if (menu.classList.contains('is-aperto')) return chiudiMenu();
    menu.hidden = false;
    menu.getBoundingClientRect();
    menu.classList.add('is-aperto');
    document.documentElement.classList.add('menu-aperto');
    apriMenu.setAttribute('aria-expanded', 'true');
    apriMenu.lastChild.textContent = ' Chiudi';
  });
  $$('a', menu).forEach((a) => a.addEventListener('click', chiudiMenu));
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && menu.classList.contains('is-aperto')) chiudiMenu(); });

  // Barra Chiama / Preventivo: compare quando le CTA dell'hero escono dallo schermo
  const barra = $('[data-barra-cta]');
  const ctaHero = $('[data-hero-cta]');
  const contatti = $('#preventivo');
  let ctaVisibili = true;
  let contattiVisibili = false;
  const aggiornaBarra = () => barra.classList.toggle('is-visibile', !ctaVisibili && !contattiVisibili);
  new IntersectionObserver(([v]) => { ctaVisibili = v.isIntersecting; aggiornaBarra(); }).observe(ctaHero);
  new IntersectionObserver(([v]) => { contattiVisibili = v.isIntersecting; aggiornaBarra(); }, { rootMargin: '0px 0px -40% 0px' }).observe($('[data-modulo]', contatti));

  // Sfioro o skimmer
  const sistemi = $('[data-sistemi]');
  const schede = $$('[role="tab"]', sistemi);
  const pannello = $('#pannello-sistema');
  let sistemaScelto = 'sfioro';
  const scegliSistema = (tipo) => {
    sistemaScelto = tipo;
    sistemi.dataset.stato = tipo;
    schede.forEach((b) => {
      const attiva = b.dataset.sistema === tipo;
      b.setAttribute('aria-selected', attiva);
      b.tabIndex = attiva ? 0 : -1;
      if (attiva) pannello.setAttribute('aria-labelledby', b.id);
    });
    $$('[data-testo]', sistemi).forEach((t) => { t.hidden = t.dataset.testo !== tipo; });
    $$('[data-foto]', sistemi).forEach((f) => f.classList.toggle('is-attiva', f.dataset.foto === tipo));
  };
  schede.forEach((b, i) => {
    b.addEventListener('click', () => scegliSistema(b.dataset.sistema));
    b.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const altra = schede[(i + 1) % schede.length];
      altra.focus();
      scegliSistema(altra.dataset.sistema);
    });
  });
  scegliSistema('sfioro');
  new IntersectionObserver(([v]) => sistemi.classList.toggle('is-visibile', v.isIntersecting), { threshold: .25 }).observe($('.schema', sistemi));

  // Il modulo parte già con la scelta fatta altrove nella pagina
  const modulo = $('[data-modulo]');
  const imposta = (nome, valore) => {
    const r = $(`input[name="${nome}"][value="${valore}"]`, modulo);
    if (r) { r.checked = true; r.dispatchEvent(new Event('change', { bubbles: true })); }
  };
  $('[data-scegli-sistema]').addEventListener('click', () => {
    imposta('servizio', 'Una piscina nuova');
    imposta('tipo', sistemaScelto === 'sfioro' ? 'A sfioro' : 'A skimmer');
  });
  $$('[data-servizio="manutenzione"]').forEach((a) => a.addEventListener('click', () => imposta('servizio', 'Manutenzione')));

  // Foto che "salgono" quando entrano in vista
  const sale = new IntersectionObserver((voci) => voci.forEach((v) => {
    if (!v.isIntersecting) return;
    v.target.classList.add('is-dentro');
    sale.unobserve(v.target);
  }), { rootMargin: '0px 0px -8% 0px' });
  const preparaSalita = (el, i = 0) => {
    if (fermo) return;
    el.classList.add('sale');
    el.style.setProperty('--ritardo', `${(i % 3) * 0.08}s`);
    sale.observe(el);
  };
  $$('.lavori__copertina, .mosaico__voce:not([hidden])').forEach(preparaSalita);

  // Altri lavori
  const altri = $('[data-altri-lavori]');
  altri.addEventListener('click', () => {
    $$('[data-extra]').forEach((li, i) => { li.hidden = false; preparaSalita(li, i); });
    altri.remove();
  });

  // Lightbox
  const lb = $('[data-lightbox]');
  const lbImg = $('[data-lb-img]');
  const lbTesto = $('[data-lb-testo]');
  let indice = 0;
  const visibili = () => $$('[data-foto-grande]').filter((b) => !b.closest('[hidden]'));
  const mostra = (i) => {
    const lista = visibili();
    indice = (i + lista.length) % lista.length;
    const b = lista[indice];
    const alt = $('img', b).alt;
    lbImg.src = b.dataset.fotoGrande;
    lbImg.alt = alt;
    lbTesto.textContent = `${alt}. Foto ${indice + 1} di ${lista.length}`;
  };
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-foto-grande]');
    if (!b) return;
    mostra(visibili().indexOf(b));
    lb.showModal();
  });
  $('[data-lb-chiudi]').addEventListener('click', () => lb.close());
  $('[data-lb-prec]').addEventListener('click', () => mostra(indice - 1));
  $('[data-lb-succ]').addEventListener('click', () => mostra(indice + 1));
  lb.addEventListener('click', (e) => { if (e.target === lb) lb.close(); });
  lb.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') mostra(indice + 1);
    if (e.key === 'ArrowLeft') mostra(indice - 1);
  });
  let x0 = null;
  lb.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', (e) => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 40) mostra(indice + (dx < 0 ? 1 : -1));
    x0 = null;
  });

  // Luci: cambiano da sole finché non si tocca un colore
  const luci = $('[data-luci]');
  const colori = $$('[data-luce]', luci);
  const accendi = (nome) => {
    colori.forEach((c) => {
      const attivo = c.dataset.luce === nome;
      c.setAttribute('aria-pressed', attivo);
      if (attivo) luci.style.setProperty('--bagliore', c.style.getPropertyValue('--c'));
    });
    $$('[data-scena]', luci).forEach((img) => img.classList.toggle('is-attiva', img.dataset.scena === nome));
  };
  let giro = null;
  let toccato = false;
  colori.forEach((c) => c.addEventListener('click', () => {
    toccato = true;
    clearInterval(giro);
    accendi(c.dataset.luce);
  }));
  if (!fermo) {
    new IntersectionObserver(([v]) => {
      clearInterval(giro);
      if (!v.isIntersecting || toccato) return;
      giro = setInterval(() => {
        const i = colori.findIndex((c) => c.getAttribute('aria-pressed') === 'true');
        accendi(colori[(i + 1) % colori.length].dataset.luce);
      }, 2600);
    }, { threshold: .4 }).observe($('.luci__scena', luci));
  }

  // Stagione di adesso
  const mese = new Date().getMonth();
  const stagione = [2, 3, 4].includes(mese) ? 'primavera' : [5, 6, 7].includes(mese) ? 'estate' : [8, 9, 10].includes(mese) ? 'autunno' : 'inverno';
  const frasi = {
    primavera: 'Siamo in primavera: è il momento dell\'apertura stagionale.',
    estate: 'Siamo in estate: pulizia e controllo dell\'acqua tengono la vasca sempre limpida.',
    autunno: 'Siamo in autunno: è il momento giusto per la messa a riposo invernale.',
    inverno: 'Siamo in inverno: la piscina riposa, ed è il momento di progettare quella nuova.',
  };
  $$('[data-stagione]').forEach((li) => li.classList.toggle('is-adesso', li.dataset.stagione === stagione));
  $('[data-stagione-frase]').textContent = frasi[stagione];

  // Modulo: compone l'email per info@aquatek.it
  const tipoBox = $('[data-solo-nuova]', modulo);
  const errore = $('[data-errore]', modulo);
  modulo.addEventListener('change', () => {
    tipoBox.hidden = modulo.servizio.value !== 'Una piscina nuova';
  });
  modulo.addEventListener('submit', (e) => {
    e.preventDefault();
    const mancanti = [];
    ['nome', 'telefono'].forEach((n) => {
      const ok = modulo[n].value.trim().length > 1;
      modulo[n].setAttribute('aria-invalid', !ok);
      if (!ok) mancanti.push(n === 'nome' ? 'nome e cognome' : 'telefono');
    });
    if (!modulo.privacy.checked) mancanti.push('il consenso privacy');
    if (mancanti.length) {
      errore.textContent = `Manca ancora: ${mancanti.join(', ')}.`;
      errore.hidden = false;
      (modulo.querySelector('[aria-invalid="true"]') || modulo.privacy).focus();
      return;
    }
    errore.hidden = true;
    const d = new FormData(modulo);
    const righe = [
      `Richiesta: ${d.get('servizio')}`,
      d.get('servizio') === 'Una piscina nuova' ? `Tipo di piscina: ${d.get('tipo')}` : null,
      `Per: ${d.get('per')}`,
      d.get('comune') ? `Comune: ${d.get('comune')}` : null,
      '',
      d.get('messaggio') || '',
      '',
      `${d.get('nome')}`,
      `Tel. ${d.get('telefono')}`,
    ].filter((r) => r !== null);
    const oggetto = `Richiesta preventivo - ${d.get('servizio')} - ${d.get('nome')}`;
    location.href = `mailto:info@aquatek.it?subject=${encodeURIComponent(oggetto)}&body=${encodeURIComponent(righe.join('\n'))}`;
  });

  $$('[data-anno]').forEach((s) => { s.textContent = new Date().getFullYear(); });
})();
