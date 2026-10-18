(() => {
  const doc = document.documentElement;
  const riduci = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const TEL = '0422 363562';

  /* Testata piena e barra mobile allo scroll */
  const testata = document.querySelector('[data-testata]');
  const barra = document.querySelector('[data-barra]');
  const hero = document.querySelector('.hero');
  const aggiornaScroll = () => {
    const y = window.scrollY;
    testata.classList.toggle('is-piena', y > 40);
    barra.classList.toggle('is-visibile', y > hero.offsetHeight * 0.6);
  };
  addEventListener('scroll', aggiornaScroll, { passive: true });
  aggiornaScroll();

  /* Menu mobile */
  const menuBtn = document.querySelector('[data-menu-btn]');
  const menu = document.getElementById('menu');
  const impostaMenu = aperto => {
    doc.classList.toggle('menu-aperto', aperto);
    menuBtn.setAttribute('aria-expanded', String(aperto));
    menuBtn.querySelector('.sr').textContent = aperto ? 'Chiudi il menu' : 'Apri il menu';
  };
  menuBtn.addEventListener('click', () => impostaMenu(!doc.classList.contains('menu-aperto')));
  menu.addEventListener('click', e => { if (e.target.closest('a')) impostaMenu(false); });
  addEventListener('keydown', e => { if (e.key === 'Escape') impostaMenu(false); });

  /* Hero: la flotta vista con la termocamera, poi la scansione rivela la foto */
  const media = document.querySelector('[data-scan]');
  const caricata = img => new Promise(ok => {
    if (img.complete && img.naturalWidth) return ok();
    img.addEventListener('load', ok, { once: true });
    img.addEventListener('error', ok, { once: true });
  });
  if (media) {
    if (riduci) {
      media.classList.add('is-saltato');
    } else {
      const foto = media.querySelector('.hero-foto');
      const termica = media.querySelector('.hero-termica img');
      const salta = setTimeout(() => media.classList.add('is-saltato'), 2500);
      caricata(termica).then(() => {
        if (media.classList.contains('is-saltato')) return;
        clearTimeout(salta);
        media.classList.add('is-pronto');
        const inizio = performance.now();
        caricata(foto).then(() => {
          const attesa = Math.max(0, 1000 - (performance.now() - inizio));
          setTimeout(() => {
            media.classList.add('is-scan');
            setTimeout(() => media.classList.add('is-fatto'), 2300);
          }, attesa);
        });
      });
    }
  }

  /* Riga stagionale sotto la hero */
  const stagione = document.querySelector('[data-stagione]');
  if (stagione) {
    const mesi = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
    const m = new Date().getMonth();
    const articolo = `È ${mesi[m]}`;
    let frase;
    if (m >= 8 && m <= 10) frase = `${articolo}: il momento giusto per il controllo della caldaia, prima del freddo.`;
    else if (m === 11 || m <= 1) frase = `${articolo}: caldaia in blocco? Chiama lo ${TEL}.`;
    else if (m <= 3) frase = `${articolo}: fine stagione, buon momento per la manutenzione della caldaia.`;
    else if (m === 4) frase = `${articolo}: fai controllare il condizionatore prima del caldo.`;
    else frase = `${articolo}: condizionatore che non rinfresca? Chiama lo ${TEL}.`;
    stagione.textContent = frase;
  }

  /* Piani di manutenzione */
  const piani = {
    comfort: { nome: 'Formula Comfort Immergas', prezzo: 140, nota: 'Contratto Immergas, garanzia fino a 10 anni' },
    top: { nome: 'TOP', prezzo: 175, nota: 'Ricambi e manodopera compresi' },
    oro: { nome: 'ORO', prezzo: 150, nota: 'Manodopera compresa' },
    base: { nome: 'BASE', prezzo: 110, nota: 'Manutenzione e verifica annuale' }
  };
  const selettore = document.querySelector('[data-piani]');
  let pianoScelto = 'comfort';
  if (selettore) {
    const tab = [...selettore.querySelectorAll('[data-piano]')];
    const prezzo = selettore.querySelector('.prezzo');
    const cifra = selettore.querySelector('[data-prezzo]');
    const nota = selettore.querySelector('[data-nota]');
    const voci = [...selettore.querySelectorAll('.voci li')];
    voci.forEach(li => {
      const stato = document.createElement('span');
      stato.className = 'sr';
      li.append(stato);
    });

    const scegli = (chiave, conFuoco) => {
      pianoScelto = chiave;
      tab.forEach(b => {
        const attivo = b.dataset.piano === chiave;
        b.setAttribute('aria-checked', String(attivo));
        b.tabIndex = attivo ? 0 : -1;
        if (attivo && conFuoco) b.focus();
      });
      const p = piani[chiave];
      cifra.textContent = p.prezzo;
      nota.textContent = p.nota;
      prezzo.classList.remove('cambia');
      void prezzo.offsetWidth;
      prezzo.classList.add('cambia');
      voci.forEach((li, i) => {
        const dentro = li.dataset.in.split(' ').includes(chiave);
        li.style.setProperty('--ritardo', `${i * 35}ms`);
        li.classList.toggle('fuori', !dentro);
        li.lastElementChild.textContent = dentro ? ' (incluso)' : ' (non incluso)';
      });
    };

    tab.forEach((b, i) => {
      b.addEventListener('click', () => scegli(b.dataset.piano));
      b.addEventListener('keydown', e => {
        const passo = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
        if (!passo) return;
        e.preventDefault();
        scegli(tab[(i + passo + tab.length) % tab.length].dataset.piano, true);
      });
    });
    scegli('comfort');
    prezzo.classList.remove('cambia');
  }

  /* "Oppure scrivici" dal piano: precompila il modulo */
  const linkPiano = document.querySelector('[data-piano-link]');
  const form = document.querySelector('[data-form]');
  if (linkPiano && form) {
    linkPiano.addEventListener('click', () => {
      form.tipo.value = 'Piano di manutenzione';
      if (!form.messaggio.value) form.messaggio.value = `Vorrei attivare il piano ${piani[pianoScelto].nome}.`;
    });
  }

  /* Modulo: compone l'email con i dati inseriti */
  if (form) {
    const esito = form.querySelector('[data-esito]');
    const obbligatori = ['nome', 'telefono', 'comune'];
    form.addEventListener('submit', e => {
      e.preventDefault();
      let primo = null;
      obbligatori.forEach(n => {
        const campo = form[n];
        const vuoto = !campo.value.trim();
        campo.classList.toggle('errore', vuoto);
        campo.setAttribute('aria-invalid', String(vuoto));
        if (vuoto && !primo) primo = campo;
      });
      if (primo) {
        esito.className = 'form-esito ko';
        esito.textContent = 'Inserisci nome, telefono e comune: ci servono per richiamarti.';
        primo.focus();
        return;
      }
      const v = n => form[n].value.trim();
      const oggetto = `Richiesta dal sito: ${v('tipo')}`;
      const corpo = [
        `Nome: ${v('nome')}`,
        `Telefono: ${v('telefono')}`,
        `Comune: ${v('comune')}`,
        `Richiesta: ${v('tipo')}`,
        '',
        v('messaggio')
      ].join('\n');
      window.location.href = `mailto:info@santucciservice.it?subject=${encodeURIComponent(oggetto)}&body=${encodeURIComponent(corpo)}`;
      esito.className = 'form-esito ok';
      esito.textContent = `Richiesta pronta nella tua app di posta: premi Invia. Se non si è aperta, chiama lo ${TEL}.`;
    });
    form.addEventListener('input', e => {
      if (e.target.classList.contains('errore') && e.target.value.trim()) {
        e.target.classList.remove('errore');
        e.target.setAttribute('aria-invalid', 'false');
      }
    });
  }

  /* Aperto ora / chiuso, con l'ora di Silea */
  const stato = document.querySelector('[data-stato]');
  const orari = document.querySelector('[data-orari]');
  if (stato && orari) {
    const fasce = { 0: [], 1: [[480, 720], [840, 1050]], 2: [[480, 720], [840, 1050]], 3: [[480, 720], [840, 1050]], 4: [[480, 720], [840, 1050]], 5: [[480, 720], [840, 1050]], 6: [[480, 720]] };
    const nomiGiorni = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
    const parti = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Rome', weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(new Date());
    const p = t => parti.find(x => x.type === t).value;
    const giorno = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p('weekday'));
    const minuti = (+p('hour') % 24) * 60 + +p('minute');
    const hhmm = m => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;

    orari.querySelectorAll('tr').forEach(tr => tr.classList.toggle('oggi', tr.dataset.giorni.split(' ').includes(String(giorno))));

    const corrente = fasce[giorno].find(([a, b]) => minuti >= a && minuti < b);
    if (corrente) {
      stato.textContent = `Aperto ora, fino alle ${hhmm(corrente[1])}`;
      stato.classList.add('aperto');
    } else {
      const oggi = fasce[giorno].find(([a]) => a > minuti);
      if (oggi) {
        stato.textContent = `Chiuso ora, riapre alle ${hhmm(oggi[0])}`;
      } else {
        for (let k = 1; k <= 7; k++) {
          const g = (giorno + k) % 7;
          if (fasce[g].length) {
            const quando = k === 1 ? 'domani' : nomiGiorni[g];
            stato.textContent = `Chiuso ora, riapre ${quando} alle ${hhmm(fasce[g][0][0])}`;
            break;
          }
        }
      }
    }
    stato.hidden = false;
  }

  /* Comparsa allo scroll */
  const daRivelare = document.querySelectorAll('[data-rivela]');
  if ('IntersectionObserver' in window && !riduci) {
    daRivelare.forEach(el => {
      const fratelli = [...el.parentElement.children].filter(c => c.hasAttribute('data-rivela'));
      el.style.setProperty('--ritardo', `${Math.min(fratelli.indexOf(el), 4) * 90}ms`);
    });
    const io = new IntersectionObserver(voci => {
      voci.forEach(v => {
        if (v.isIntersecting) { v.target.classList.add('is-visto'); io.unobserve(v.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    daRivelare.forEach(el => io.observe(el));
  } else {
    daRivelare.forEach(el => el.classList.add('is-visto'));
  }

  /* I link "privacy" aprono l'informativa nel piede */
  const privacy = document.getElementById('privacy');
  document.querySelectorAll('a[href="#privacy"]').forEach(a => a.addEventListener('click', () => { privacy.open = true; }));

  /* Anno nel piede */
  const anno = document.querySelector('[data-anno]');
  if (anno) anno.textContent = new Date().getFullYear();
})();
