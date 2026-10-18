(() => {
  const doc = document.documentElement;
  const calmo = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Menu mobile */
  const burger = document.getElementById('burger');
  const menu = document.getElementById('menu');
  const chiudiMenu = () => {
    menu.classList.remove('aperto');
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', 'Apri il menu');
    document.body.style.overflow = '';
  };
  burger.addEventListener('click', () => {
    const apri = !menu.classList.contains('aperto');
    menu.classList.toggle('aperto', apri);
    burger.setAttribute('aria-expanded', String(apri));
    burger.setAttribute('aria-label', apri ? 'Chiudi il menu' : 'Apri il menu');
    document.body.style.overflow = apri ? 'hidden' : '';
  });
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) chiudiMenu(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') chiudiMenu(); });

  /* Comparse allo scroll */
  const daRivelare = document.querySelectorAll('.rivela');
  if ('IntersectionObserver' in window && !calmo) {
    const io = new IntersectionObserver((voci) => {
      voci.forEach((v) => {
        if (v.isIntersecting) { v.target.classList.add('visto'); io.unobserve(v.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    daRivelare.forEach((el) => io.observe(el));
  } else {
    daRivelare.forEach((el) => el.classList.add('visto'));
  }

  /* Testata, occhi e linea del tempo: tutto legato allo scroll */
  const testata = document.getElementById('testata');
  const faccia = document.getElementById('faccia');
  const occhi = faccia.querySelector('.faccia__occhi');
  const linea = document.getElementById('linea');
  const tappe = linea.querySelectorAll('.tappa');
  const desktop = window.matchMedia('(min-width: 1000px)');
  let puntatore = false;

  const aggiorna = () => {
    const vh = window.innerHeight;
    testata.classList.toggle('scorre', window.scrollY > 8);

    if (!puntatore) {
      const giu = Math.min(window.scrollY / 300, 1);
      faccia.style.setProperty('--sx', '0px');
      faccia.style.setProperty('--sy', (giu * 7).toFixed(1) + 'px');
    }

    const r = linea.getBoundingClientRect();
    const p = Math.max(0, Math.min(1, (vh * 0.7 - r.top) / (r.height * (desktop.matches ? 0.55 : 0.92))));
    linea.style.setProperty('--p', p.toFixed(3));
    tappe.forEach((t, i) => {
      const attiva = desktop.matches
        ? p >= i / tappe.length + 0.04
        : t.getBoundingClientRect().top < vh * 0.7;
      t.classList.toggle('attiva', attiva);
    });
  };
  let inCoda = false;
  const chiedi = () => {
    if (inCoda) return;
    inCoda = true;
    requestAnimationFrame(() => { inCoda = false; aggiorna(); });
  };
  window.addEventListener('scroll', chiedi, { passive: true });
  window.addEventListener('resize', chiedi);
  aggiorna();

  /* Gli occhi guardano il puntatore (su computer) e ogni tanto sbattono */
  if (!calmo) {
    window.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      puntatore = true;
      const r = occhi.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const d = Math.hypot(dx, dy) || 1;
      const max = Math.min(10, r.height * 0.14);
      const k = Math.min(1, d / 400) * max;
      faccia.style.setProperty('--sx', ((dx / d) * k).toFixed(1) + 'px');
      faccia.style.setProperty('--sy', ((dy / d) * k).toFixed(1) + 'px');
    }, { passive: true });

    const sbatti = () => {
      occhi.classList.add('ammicca');
      setTimeout(() => occhi.classList.remove('ammicca'), 140);
      setTimeout(sbatti, 3200 + Math.random() * 3200);
    };
    setTimeout(sbatti, 2600);
  }

  /* Orari: riga di oggi e stato "aperto adesso" (ora di Roma) */
  const fasce = {
    0: [], 1: [[630, 810], [850, 1140]], 2: [[570, 810], [850, 1140]], 3: [[570, 810], [850, 1140]],
    4: [[570, 810], [850, 1140]], 5: [[570, 810], [850, 1080]], 6: []
  };
  const nomiGiorni = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
  const hm = (m) => Math.floor(m / 60) + ':' + String(m % 60).padStart(2, '0');
  try {
    const parti = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Europe/Rome', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(new Date());
    const val = (t) => parti.find((x) => x.type === t).value;
    const giorno = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(val('weekday'));
    const ora = parseInt(val('hour'), 10) * 60 + parseInt(val('minute'), 10);

    document.querySelectorAll('#orari tr').forEach((tr) => {
      if (tr.dataset.giorni.split(' ').includes(String(giorno))) tr.classList.add('oggi');
    });

    let testo;
    let aperto = false;
    const oggi = fasce[giorno];
    const ora_in = oggi.find(([a, b]) => ora >= a && ora < b);
    if (ora_in) {
      aperto = true;
      testo = 'Aperti adesso, fino alle ' + hm(ora_in[1]);
    } else {
      const dopo = oggi.find(([a]) => a > ora);
      if (dopo) {
        testo = (ora > oggi[0][0] ? 'In pausa, riapriamo alle ' : 'Chiusi, apriamo oggi alle ') + hm(dopo[0]);
      } else {
        for (let i = 1; i <= 7; i++) {
          const g = (giorno + i) % 7;
          if (fasce[g].length) {
            testo = 'Chiusi, riapriamo ' + (i === 1 ? 'domani' : nomiGiorni[g]) + ' alle ' + hm(fasce[g][0][0]);
            break;
          }
        }
      }
    }
    const stato = document.getElementById('stato');
    stato.textContent = testo;
    stato.classList.toggle('aperto', aperto);
    stato.hidden = false;
  } catch (e) { /* senza Intl resta solo la tabella degli orari */ }

  /* Modulo: sotto i 6 anni solo mattina, poi la richiesta parte via email */
  const modulo = document.getElementById('modulo');
  const pomeriggio = document.getElementById('pomeriggio');
  const avviso = document.getElementById('avviso-under6');
  const errore = document.getElementById('errore');
  const esito = document.getElementById('esito');

  modulo.addEventListener('change', (e) => {
    if (e.target.name === 'paziente') {
      const piccolo = e.target.value.startsWith('Bambino');
      pomeriggio.disabled = piccolo;
      if (piccolo) modulo.querySelector('input[name="fascia"][value^="Mattina"]').checked = true;
      avviso.hidden = !piccolo;
    }
    const blocco = e.target.closest('.invalido');
    if (blocco) blocco.classList.remove('invalido');
    if (e.target.classList.contains('invalido')) e.target.classList.remove('invalido');
  });
  modulo.addEventListener('input', (e) => e.target.classList.remove('invalido'));

  modulo.addEventListener('submit', (e) => {
    e.preventDefault();
    const d = new FormData(modulo);
    const v = (k) => (d.get(k) || '').toString().trim();
    const mancano = [];
    const segna = (el) => { el.classList.add('invalido'); mancano.push(el); };

    ['nome', 'cognome'].forEach((k) => { if (!v(k)) segna(modulo.elements[k]); });
    if (v('telefono').replace(/\D/g, '').length < 6) segna(modulo.elements.telefono);
    if (!v('paziente')) segna(modulo.querySelector('input[name="paziente"]').closest('.scelta'));
    if (!v('visita')) segna(modulo.elements.visita);
    if (!d.get('privacy')) segna(modulo.querySelector('.consenso'));

    if (mancano.length) {
      errore.textContent = 'Mancano alcuni dati: controlla i campi evidenziati in rosso.';
      errore.hidden = false;
      esito.hidden = true;
      const primo = mancano[0];
      (primo.matches('input, select, textarea') ? primo : primo.querySelector('input'))?.focus();
      return;
    }
    errore.hidden = true;

    const righe = [
      'Buongiorno, vorrei prenotare una visita.',
      '',
      'Nome: ' + v('nome') + ' ' + v('cognome'),
      'Telefono: ' + v('telefono'),
      v('email') ? 'Email: ' + v('email') : null,
      'Paziente: ' + v('paziente'),
      'Tipo di visita: ' + v('visita'),
      'Preferenza oraria: ' + v('fascia'),
      v('note') ? 'Note: ' + v('note') : null,
      '',
      'Grazie.'
    ].filter((r) => r !== null);
    const oggetto = 'Richiesta visita: ' + v('nome') + ' ' + v('cognome');
    window.location.href = 'mailto:segreteria@sorrisidelfuturo.it?subject=' + encodeURIComponent(oggetto) +
      '&body=' + encodeURIComponent(righe.join('\n'));
    esito.hidden = false;
  });

  document.getElementById('anno').textContent = new Date().getFullYear();
})();
