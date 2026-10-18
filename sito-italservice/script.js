(() => {
  const doc = document.documentElement;
  const muovi = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const DATI = window.PRODOTTI || {};

  /* ---------- sequenza d'apertura */
  const conta = (el, durata = 900) => {
    const fine = parseInt(el.dataset.contaA, 10);
    if (!muovi || isNaN(fine)) { el.textContent = fine; return; }
    const t0 = performance.now();
    const passo = (t) => {
      const k = Math.min(1, (t - t0) / durata);
      el.textContent = Math.round(fine * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(passo);
    };
    el.textContent = '0';
    requestAnimationFrame(passo);
  };

  if (muovi) {
    doc.classList.add('js-anima');
    const img = $('.tavola-img');
    const parti = () => {
      requestAnimationFrame(() => requestAnimationFrame(() => {
        doc.classList.add('pronto');
        setTimeout(() => $$('.tavola [data-conta-a]').forEach((el) => conta(el, 800)), 1500);
        setTimeout(() => { const t1 = $('.t1'); if (t1) t1.classList.add('tratteggia'); }, 1750);
      }));
    };
    if (img && !img.complete) {
      img.addEventListener('load', parti, { once: true });
      img.addEventListener('error', parti, { once: true });
      setTimeout(() => { if (!doc.classList.contains('pronto')) parti(); }, 1600);
    } else parti();
  }

  /* ---------- testata */
  const testata = $('#testata');
  const suScroll = () => testata.classList.toggle('scorsa', window.scrollY > 8);
  window.addEventListener('scroll', suScroll, { passive: true });
  suScroll();

  const menuBtn = $('.menu-apri');
  const menu = $('#menu-mobile');
  const chiudiMenu = () => { menu.hidden = true; menuBtn.setAttribute('aria-expanded', 'false'); };
  menuBtn.addEventListener('click', () => {
    const aperto = menuBtn.getAttribute('aria-expanded') === 'true';
    menu.hidden = aperto;
    menuBtn.setAttribute('aria-expanded', String(!aperto));
  });
  $$('a', menu).forEach((a) => a.addEventListener('click', chiudiMenu));

  /* ---------- numeri di fiducia */
  const numeri = $$('.fiducia [data-conta-a]');
  if ('IntersectionObserver' in window && muovi) {
    const io = new IntersectionObserver((voci) => {
      voci.forEach((v) => { if (v.isIntersecting) { conta(v.target, 1100); io.unobserve(v.target); } });
    }, { threshold: 0.6 });
    numeri.forEach((n) => io.observe(n));
  }

  /* ---------- catalogo: linee, mappa, archi */
  const chips = $$('.chip');
  const pannelli = $$('.pannello');
  const mappa = $('.mappa');
  const luoghi = $$('.luogo', mappa);
  const etichette = $$('.etichetta', mappa);
  const archi = $$('.arco', mappa);
  let lineaAttiva = chips[0] ? chips[0].dataset.linea : null;

  const accendiLinea = (linea) => {
    luoghi.forEach((g) => g.classList.toggle('attivo', g.dataset.linee.split(' ').includes(linea)));
    etichette.forEach((t) => t.classList.toggle('visibile', t.dataset.linea === linea));
    archi.forEach((a) => {
      a.classList.remove('attivo');
      if (a.dataset.linea === linea) {
        void a.getBoundingClientRect();
        requestAnimationFrame(() => a.classList.add('attivo'));
      }
    });
  };

  const scegli = (chip, focus = false) => {
    const linea = chip.dataset.linea;
    chips.forEach((c) => {
      const sel = c === chip;
      c.setAttribute('aria-selected', String(sel));
      c.tabIndex = sel ? 0 : -1;
    });
    pannelli.forEach((p) => {
      const vis = p.dataset.linea === linea;
      p.hidden = !vis;
      if (vis) $$('.griglia li', p).forEach((li, i) => li.style.setProperty('--n', Math.min(i, 14)));
    });
    if (focus) chip.focus();
    chip.scrollIntoView({ block: 'nearest', inline: 'center', behavior: muovi ? 'smooth' : 'auto' });
    lineaAttiva = linea;
    if (mappaVista) accendiLinea(linea);
  };

  chips.forEach((chip, i) => {
    chip.addEventListener('click', () => {
      if (chip.getAttribute('aria-selected') === 'true') return;
      scegli(chip);
      const corpo = $('.catalogo-corpo');
      const top = corpo.getBoundingClientRect().top;
      if (top < 0) window.scrollTo({ top: window.scrollY + top - 140, behavior: muovi ? 'smooth' : 'auto' });
    });
    chip.addEventListener('keydown', (ev) => {
      let j = null;
      if (ev.key === 'ArrowRight') j = (i + 1) % chips.length;
      if (ev.key === 'ArrowLeft') j = (i - 1 + chips.length) % chips.length;
      if (ev.key === 'Home') j = 0;
      if (ev.key === 'End') j = chips.length - 1;
      if (j !== null) { ev.preventDefault(); scegli(chips[j], true); }
    });
  });
  if (pannelli[0]) $$('.griglia li', pannelli[0]).forEach((li, i) => li.style.setProperty('--n', Math.min(i, 14)));

  let mappaVista = false;
  const mostraMappa = () => {
    if (mappaVista) return;
    mappaVista = true;
    mappa.classList.add('vista');
    setTimeout(() => accendiLinea(lineaAttiva), muovi ? 650 : 0);
  };
  if (mappa) {
    if ('IntersectionObserver' in window && muovi) {
      const io = new IntersectionObserver((v) => { if (v.some((x) => x.isIntersecting)) { mostraMappa(); io.disconnect(); } }, { threshold: 0.25 });
      io.observe($('.catalogo-corpo'));
    } else mostraMappa();
  }

  // passaggio sulle macchine: il luogo si accende sulla mappa
  const evidenzia = (nomi, on) => {
    nomi.forEach((n) => {
      luoghi.forEach((g) => { if (g.dataset.luogo === n) g.classList.toggle('acceso', on); });
      etichette.forEach((t) => { if (t.dataset.luogo === n && t.dataset.linea === lineaAttiva) t.classList.toggle('acceso', on); });
    });
  };
  $$('.pannelli .tile').forEach((t) => {
    const nomi = (t.dataset.luoghi || '').split(' ').filter(Boolean);
    if (!nomi.length) return;
    t.addEventListener('mouseenter', () => evidenzia(nomi, true));
    t.addEventListener('mouseleave', () => evidenzia(nomi, false));
    t.addEventListener('focus', () => evidenzia(nomi, true));
    t.addEventListener('blur', () => evidenzia(nomi, false));
  });

  /* ---------- lista preventivo */
  const scelte = [];
  const lista = $('.scelte-lista');
  const box = $('#scelte');
  const contatori = $$('[data-conta]');
  const disegnaScelte = () => {
    lista.innerHTML = '';
    scelte.forEach((id) => {
      const p = DATI[id];
      const li = document.createElement('li');
      li.textContent = p.n;
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', 'Togli ' + p.n + ' dal preventivo');
      b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';
      b.addEventListener('click', () => { scelte.splice(scelte.indexOf(id), 1); disegnaScelte(); });
      li.appendChild(b);
      lista.appendChild(li);
    });
    box.classList.toggle('piena', scelte.length > 0);
    contatori.forEach((c) => {
      c.hidden = scelte.length === 0;
      c.textContent = scelte.length;
      c.classList.remove('salta-su'); void c.offsetWidth; c.classList.add('salta-su');
    });
  };
  const aggiungi = (id) => { if (DATI[id] && !scelte.includes(id)) { scelte.push(id); disegnaScelte(); } };

  /* ---------- scheda prodotto */
  const scheda = $('#scheda');
  let idAperto = null;
  const riempi = (id) => {
    const p = DATI[id];
    idAperto = id;
    const img = $('#scheda-img');
    img.src = 'assets/img/prodotti/' + id + '.jpg';
    img.alt = p.f + ' ' + p.n;
    scheda.classList.toggle('scura', !!p.dk);
    $('#scheda-fam').textContent = p.f + ', ' + p.l;
    $('#scheda-nome').textContent = p.n;
    $('#scheda-desc').textContent = p.d;
    const ul = $('#scheda-punti'); ul.innerHTML = '';
    p.pt.forEach((t) => { const li = document.createElement('li'); li.textContent = t; ul.appendChild(li); });
    const dl = $('#scheda-spec'); dl.innerHTML = '';
    p.s.forEach(([k, v]) => {
      const d = document.createElement('div');
      const dt = document.createElement('dt'); dt.textContent = k;
      const dd = document.createElement('dd'); dd.textContent = v;
      d.append(dt, dd); dl.appendChild(d);
    });
    const luogo = $('#scheda-luogo');
    if (p.pl.length) {
      luogo.hidden = false;
      const g = $('#scheda-punti-mappa');
      g.innerHTML = p.pl.map((q) => '<circle cx="' + q[2] + '" cy="' + q[3] + '" r="34"/>').join('');
      const nomi = p.pl.map((q) => q[0] + ' (' + q[1] + ')');
      const elenco = nomi.length > 1 ? nomi.slice(0, -1).join(', ') + ' e ' + nomi[nomi.length - 1] : nomi[0];
      $('#scheda-luogo-t').textContent = (p.pl.length > 1 ? 'Porta i nomi di ' : 'Porta il nome di ') + elenco + '.';
    } else luogo.hidden = true;
    const chiedi = $('[data-chiedi]', scheda);
    chiedi.textContent = 'Chiedi il prezzo';
    const agg = $('[data-aggiungi]', scheda);
    agg.textContent = scelte.includes(id) ? 'Già nel preventivo' : 'Aggiungi al preventivo';
  };
  const apri = (id, origine) => {
    if (!DATI[id]) return;
    const fai = () => { riempi(id); if (!scheda.open) scheda.showModal(); $('.scheda-in').scrollTop = 0; };
    const img = origine && $('img', origine);
    if (muovi && document.startViewTransition && img && window.innerWidth >= 860) {
      img.style.viewTransitionName = 'foto-scheda';
      $('#scheda-img').style.viewTransitionName = 'none';
      const vt = document.startViewTransition(() => {
        img.style.viewTransitionName = '';
        $('#scheda-img').style.viewTransitionName = 'foto-scheda';
        fai();
      });
      vt.finished.finally(() => { $('#scheda-img').style.viewTransitionName = ''; });
    } else fai();
  };
  $$('.tile').forEach((t) => t.addEventListener('click', () => apri(t.dataset.id, t)));
  $$('[data-chiudi]', scheda).forEach((b) => b.addEventListener('click', () => scheda.close()));
  scheda.addEventListener('click', (ev) => { if (ev.target === scheda) scheda.close(); });
  $('[data-aggiungi]', scheda).addEventListener('click', (ev) => {
    aggiungi(idAperto);
    ev.currentTarget.textContent = 'Aggiunto al preventivo';
  });
  $('[data-chiedi]', scheda).addEventListener('click', () => {
    aggiungi(idAperto);
    scheda.close();
    const dest = $('#preventivo');
    dest.scrollIntoView({ behavior: muovi ? 'smooth' : 'auto' });
    setTimeout(() => { const n = $('#modulo [name="nome"]'); if (n) n.focus({ preventScroll: true }); }, muovi ? 700 : 0);
  });

  /* ---------- modulo: prepara l'email */
  const modulo = $('#modulo');
  const esito = $('#esito');
  modulo.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const f = modulo.elements;
    const obbligatori = ['nome', 'attivita', 'telefono'];
    let primo = null;
    obbligatori.forEach((n) => {
      const vuoto = !f[n].value.trim();
      f[n].setAttribute('aria-invalid', vuoto ? 'true' : 'false');
      if (vuoto && !primo) primo = f[n];
    });
    if (primo) { esito.className = 'modulo-esito errore'; esito.textContent = 'Mancano nome, locale o telefono: compilali per inviare la richiesta.'; primo.focus(); return; }
    if (!f.privacy.checked) { esito.className = 'modulo-esito errore'; esito.textContent = 'Spunta il consenso privacy per inviare la richiesta.'; f.privacy.focus(); return; }
    const righe = [
      'Richiesta di preventivo dal sito',
      '',
      'Nome: ' + f.nome.value.trim(),
      'Locale o azienda: ' + f.attivita.value.trim(),
      'Tipo di attività: ' + f.tipo.value,
      'Telefono: ' + f.telefono.value.trim(),
    ];
    if (f.email.value.trim()) righe.push('Email: ' + f.email.value.trim());
    if (scelte.length) {
      righe.push('', 'Macchine:');
      scelte.forEach((id) => righe.push('- ' + DATI[id].n + ' (' + DATI[id].f + ')'));
    }
    if (f.note.value.trim()) righe.push('', 'Cosa mi serve:', f.note.value.trim());
    const oggetto = 'Richiesta preventivo: ' + f.attivita.value.trim();
    window.location.href = 'mailto:info@ital-service.it?subject=' + encodeURIComponent(oggetto) + '&body=' + encodeURIComponent(righe.join('\n'));
    esito.className = 'modulo-esito';
    esito.textContent = 'Si è aperta la tua app di posta con la richiesta già scritta: premi Invia. Se non si apre, chiama lo 049 963 0654.';
  });

  /* ---------- anno */
  $$('[data-anno]').forEach((el) => { el.textContent = new Date().getFullYear(); });
})();
