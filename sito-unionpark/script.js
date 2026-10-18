// Union Park — interazioni della pagina
(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  /* ---------- header e menu ---------- */
  const top = $('.top');
  const burger = $('.burger');
  const nav = $('#nav');
  const onScroll = () => top.classList.toggle('is-solid', window.scrollY > 24);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  const setMenu = (open) => {
    burger.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('is-open', open);
    top.classList.toggle('menu-open', open);
    document.body.style.overflow = open ? 'hidden' : '';
  };
  burger.addEventListener('click', () => setMenu(burger.getAttribute('aria-expanded') !== 'true'));
  $$('a', nav).forEach((a) => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

  /* ---------- orologio del tabellone ---------- */
  const clock = $('[data-clock]');
  const fmtOra = new Intl.DateTimeFormat('it-IT', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' });
  const tickClock = () => { clock.textContent = fmtOra.format(new Date()); };
  tickClock();
  setInterval(tickClock, 15000);

  /* ---------- celle split-flap ---------- */
  const ALFA = ' ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789,.-';
  const CIFRE = ' -0123456789.,';
  const PASSO = 72;

  const setAll = (cell, ch) => {
    for (const half of cell.children) half.dataset.c = ch;
    cell._ch = ch;
  };
  const makeCell = (ch = ' ') => {
    const cell = document.createElement('span');
    cell.className = 'fl';
    cell.innerHTML = '<span class="u"></span><span class="d"></span><span class="fu"></span><span class="fd"></span>';
    setAll(cell, ch);
    return cell;
  };
  const flipOnce = (cell, next) => {
    const [u, d, fu, fd] = cell.children;
    const prev = cell._ch;
    u.dataset.c = next; d.dataset.c = prev; fu.dataset.c = prev; fd.dataset.c = next;
    cell.classList.remove('go');
    void cell.offsetWidth;
    cell.classList.add('go');
    cell._ch = next;
  };
  const playSeq = (cell, seq, delay) => {
    clearTimeout(cell._t);
    const target = seq[seq.length - 1];
    if (reduce || !seq.length) { setAll(cell, target ?? cell._ch); return; }
    let i = 0;
    const tick = () => {
      if (i >= seq.length) { cell.classList.remove('go'); setAll(cell, target); return; }
      flipOnce(cell, seq[i++]);
      cell._t = setTimeout(tick, PASSO);
    };
    cell._t = setTimeout(tick, delay);
  };
  // sequenza in avanti sul rullo, dal carattere attuale fino al bersaglio
  const forward = (set, from, to, min = 0) => {
    const n = set.length;
    let a = set.indexOf(from); if (a < 0) a = 0;
    let b = set.indexOf(to); if (b < 0) b = 0;
    let steps = (b - a + n) % n;
    if (steps < min) steps += n * Math.ceil((min - steps) / n);
    const out = [];
    for (let k = 1; k <= steps; k++) out.push(set[(a + k) % n]);
    return out;
  };

  // tabellone dell'hero
  $$('.board .row').forEach((row, r) => {
    $$('.flaps', row).forEach((group, g) => {
      const len = +group.dataset.len;
      const text = group.dataset.flap;
      const padded = g === 0 ? text.padEnd(len) : text.padStart(len);
      [...padded].forEach((ch, c) => {
        const start = reduce ? ch : ALFA[(ALFA.indexOf(ch) - 5 - Math.floor(Math.random() * 9) - c + ALFA.length * 4) % ALFA.length];
        const cell = makeCell(start);
        group.appendChild(cell);
        if (!reduce) {
          const seq = forward(ALFA, start, ch);
          playSeq(cell, seq, 350 + r * 170 + (g * 8 + c) * 28);
        }
      });
    });
  });

  /* ---------- calcolatore e prenotazione ---------- */
  const form = $('#book');
  const quote = $('[data-quote]');
  const detail = $('[data-detail]');
  const warn = $('[data-warn]');
  const err = $('[data-err]');
  const sent = $('[data-sent]');
  const TARIFFE = {
    p1c: { nome: 'P1 coperto', giorno: 10 },
    p1s: { nome: 'P1 scoperto', giorno: 6.5 },
    p2: { nome: 'P2 low cost', giorno: 5 },
  };
  const euro = (n) => n.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const fmtData = new Intl.DateTimeFormat('it-IT', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });

  const oggi = new Date();
  form.d1.value = iso(addDays(oggi, 8));
  form.d2.value = iso(addDays(oggi, 15));
  form.d1.min = iso(oggi);
  form.d2.min = iso(oggi);

  const quoteCells = [];
  const showQuote = (txt) => {
    const len = Math.max(6, txt.length);
    while (quoteCells.length < len) { const c = makeCell(' '); quote.prepend(c); quoteCells.unshift(c); }
    while (quoteCells.length > len) quoteCells.shift().remove();
    const padded = txt.padStart(len);
    quoteCells.forEach((cell, i) => {
      const ch = padded[i];
      if (cell._ch === ch) return;
      playSeq(cell, forward(CIFRE, cell._ch, ch), i * 45);
    });
  };

  const leggi = () => {
    const a = new Date(`${form.d1.value}T${form.t1.value || '00:00'}`);
    const b = new Date(`${form.d2.value}T${form.t2.value || '00:00'}`);
    const park = TARIFFE[form.park.value];
    return { a, b, park, key: form.park.value };
  };

  const calcola = () => {
    const { a, b, park, key } = leggi();
    if (!form.d1.value || !form.d2.value || isNaN(a) || isNaN(b)) {
      showQuote('--,--'); detail.textContent = 'Scegli le date per vedere il prezzo.'; warn.hidden = true; return null;
    }
    if (b <= a) {
      showQuote('--,--'); detail.textContent = 'Il ritiro deve venire dopo la consegna dell’auto: controlla le date.'; warn.hidden = true; return null;
    }
    const ore = (b - a) / 36e5;
    let giorni = Math.floor(ore / 24);
    const resto = ore - giorni * 24;
    let frazione = 0;
    if (resto > 8) giorni += 1;
    else if (resto > 0) frazione = 4;
    const totale = giorni * park.giorno + frazione;

    const g = giorni === 1 ? '1 giorno' : `${giorni} giorni`;
    let testo;
    if (giorni === 0) testo = `Sosta breve al ${park.nome}`;
    else if (frazione) testo = `${g} al ${park.nome} a ${euro(park.giorno)} € più ${euro(frazione)} € di frazione`;
    else testo = `${g} al ${park.nome} a ${euro(park.giorno)} € al giorno`;
    detail.textContent = `${testo}. Stima: ${euro(totale)} €.`;
    showQuote(euro(totale));

    const fuori = (t) => { const h = +String(t).slice(0, 2); return h < 5 || h >= 23; };
    if (key !== 'p2' && (fuori(form.t1.value) || fuori(form.t2.value))) {
      warn.textContent = 'Il P1 è custodito dalle 5:00 alle 23:00: se arrivi o riparti fuori orario, avvisa al telefono. Fuori orario c’è la chiamata notturna gratuita.';
      warn.hidden = false;
    } else warn.hidden = true;

    return { a, b, park, totale };
  };

  form.addEventListener('input', (e) => {
    if (['d1', 't1', 'd2', 't2', 'park'].includes(e.target.name)) {
      if (e.target.name === 'd1' && form.d2.value && form.d2.value < form.d1.value) form.d2.value = form.d1.value;
      form.d2.min = form.d1.value || iso(oggi);
      calcola();
    }
    if (e.target.getAttribute('aria-invalid') === 'true' && e.target.value.trim()) e.target.removeAttribute('aria-invalid');
  });
  form.addEventListener('change', calcola);

  // i link "Prenota il P…" e le righe del tabellone scelgono il parcheggio
  $$('[data-park]').forEach((a) => a.addEventListener('click', () => {
    const radio = form.querySelector(`input[name="park"][value="${a.dataset.park}"]`);
    if (radio) { radio.checked = true; calcola(); }
  }));

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const stima = calcola();
    const obbligatori = ['nome', 'tel', 'targa', 'modello'];
    const vuoti = obbligatori.filter((n) => !form[n].value.trim());
    obbligatori.forEach((n) => form[n].toggleAttribute('aria-invalid', vuoti.includes(n)));
    vuoti.forEach((n) => form[n].setAttribute('aria-invalid', 'true'));
    if (!stima) { err.textContent = 'Controlla le date di consegna e ritiro dell’auto.'; err.hidden = false; return; }
    if (vuoti.length) {
      err.textContent = 'Completa i campi evidenziati: servono per riservarti il posto.';
      err.hidden = false;
      form[vuoti[0]].focus();
      return;
    }
    err.hidden = true;
    const ora = (d) => d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    const righe = [
      'Buongiorno, vorrei prenotare un posto auto.',
      '',
      `Parcheggio: ${stima.park.nome} (${euro(stima.park.giorno)} € al giorno)`,
      `Consegna dell'auto: ${fmtData.format(stima.a)} alle ${ora(stima.a)}`,
      `Ritiro dell'auto: ${fmtData.format(stima.b)} alle ${ora(stima.b)}`,
      `Stima calcolata sul sito: ${euro(stima.totale)} €`,
      '',
      `Nome e cognome: ${form.nome.value.trim()}`,
      `Telefono: ${form.tel.value.trim()}`,
      `Targa: ${form.targa.value.trim().toUpperCase()}`,
      `Modello auto: ${form.modello.value.trim()}`,
    ];
    if (form.note.value.trim()) righe.push(`Note: ${form.note.value.trim()}`);
    righe.push('', 'Grazie, attendo la conferma.');
    const oggetto = `Prenotazione ${stima.park.nome} dal ${fmtData.format(stima.a)} al ${fmtData.format(stima.b)}`;
    const href = `mailto:info@unionpark.it?subject=${encodeURIComponent(oggetto)}&body=${encodeURIComponent(righe.join('\n'))}`;
    form.dataset.mailto = href;
    window.location.href = href;
    sent.hidden = false;
  });

  calcola();

  /* ---------- quattro passi: la linea avanza con lo scroll ---------- */
  const steps = $('[data-steps]');
  if (steps) {
    const items = $$('li', steps);
    let pending = false;
    const update = () => {
      pending = false;
      const soglia = window.innerHeight * 0.62;
      let last = -1;
      items.forEach((li, i) => {
        const on = li.getBoundingClientRect().top < soglia;
        li.classList.toggle('on', on);
        if (on) last = i;
      });
      steps.style.setProperty('--p', last < 0 ? 0 : last / (items.length - 1));
    };
    const req = () => { if (!pending) { pending = true; requestAnimationFrame(update); } };
    window.addEventListener('scroll', req, { passive: true });
    window.addEventListener('resize', req);
    update();
  }

  /* ---------- comparsa delle carte e mappa ---------- */
  $$('.passes, .quotes').forEach((group) => {
    $$('[data-reveal]', group).forEach((el, i) => el.style.setProperty('--d', `${(i % 3) * 0.09}s`));
  });
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      en.target.classList.add('on');
      io.unobserve(en.target);
      if (en.target.matches('[data-route]') && !reduce) {
        const motion = $('animateMotion', en.target);
        setTimeout(() => { en.target.classList.add('walk'); motion?.beginElement?.(); }, 1300);
      }
    });
  }, { threshold: 0.18, rootMargin: '0px 0px -6% 0px' });
  $$('[data-reveal], [data-route]').forEach((el) => io.observe(el));

  /* ---------- barra mobile: si nasconde quando il bottone del modulo è a vista ---------- */
  const dock = $('.dock');
  const submit = $('.you .btn');
  if (dock && submit) {
    new IntersectionObserver(([en]) => dock.classList.toggle('is-hidden', en.isIntersecting)).observe(submit);
  }

  /* ---------- anno ---------- */
  const y = $('[data-year]');
  if (y) y.textContent = new Date().getFullYear();
})();
