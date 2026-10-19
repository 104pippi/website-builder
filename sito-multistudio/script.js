/* Multistudio: interazioni della demo. Il 3D dell'hero sta in 3d.js e arriva dopo il caricamento. */
(() => {
  const doc = document.documentElement;
  const muoviPoco = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  /* ---------- Testata: velo dopo lo scroll, colore secondo la sezione sotto ---------- */
  const testata = $('#testata');
  const sezioni = $$('[data-tema]');
  let rafTestata = 0;
  const aggiornaTestata = () => {
    rafTestata = 0;
    testata.classList.toggle('testata--velata', scrollY > 24);
    const y = testata.offsetHeight / 2;
    let tema = 'scuro';
    for (const s of sezioni) {
      const r = s.getBoundingClientRect();
      if (r.top <= y && r.bottom > y) { tema = s.dataset.tema; break; }
    }
    testata.classList.toggle('testata--chiara', tema === 'chiaro');
  };
  addEventListener('scroll', () => { rafTestata ||= requestAnimationFrame(aggiornaTestata); }, { passive: true });
  addEventListener('resize', aggiornaTestata);
  aggiornaTestata();

  /* ---------- Menu mobile ---------- */
  const bottoneMenu = $('.testata__menu');
  const menu = $('#menu-mobile');
  const chiudiMenu = () => {
    bottoneMenu.setAttribute('aria-expanded', 'false');
    menu.hidden = true;
    doc.style.overflow = '';
    testata.classList.remove('testata--aperta');
    aggiornaTestata();
  };
  bottoneMenu.addEventListener('click', () => {
    const apri = bottoneMenu.getAttribute('aria-expanded') !== 'true';
    if (!apri) return chiudiMenu();
    bottoneMenu.setAttribute('aria-expanded', 'true');
    menu.hidden = false;
    doc.style.overflow = 'hidden';
    testata.classList.remove('testata--chiara');
  });
  $$('a', menu).forEach(a => a.addEventListener('click', chiudiMenu));
  addEventListener('keydown', e => { if (e.key === 'Escape' && !menu.hidden) chiudiMenu(); });

  /* ---------- Rivelazioni: si osserva l'elemento, mai il figlio ritagliato ---------- */
  const daRivelare = $$('[data-rivela], [data-desqueeze]');
  if ('IntersectionObserver' in window && !muoviPoco) {
    const io = new IntersectionObserver(voci => {
      for (const v of voci) if (v.isIntersecting) { v.target.classList.add('in'); io.unobserve(v.target); }
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.01 });
    daRivelare.forEach(el => io.observe(el));
  } else {
    daRivelare.forEach(el => el.classList.add('in'));
  }

  /* ---------- Manifesto: le parole si accendono mentre lo leggi ---------- */
  const manifesto = $('#manifesto');
  if (manifesto) {
    const parole = manifesto.textContent.trim().split(/\s+/);
    manifesto.setAttribute('aria-label', manifesto.textContent.trim());
    manifesto.innerHTML = parole.map(p => `<span class="p" aria-hidden="true">${p}</span>`).join(' ');
    const spans = $$('.p', manifesto);
    let accese = -1, raf = 0;
    const aggiorna = () => {
      raf = 0;
      const r = manifesto.getBoundingClientRect();
      const vh = innerHeight;
      // da quando entra per un terzo a quando il suo centro passa a metà schermo
      const p = Math.min(1, Math.max(0, (vh * 0.86 - r.top) / (r.height + vh * 0.32)));
      const n = muoviPoco ? spans.length : Math.round(p * spans.length);
      if (n === accese) return;
      accese = n;
      spans.forEach((s, i) => s.classList.toggle('acceso', i < n));
    };
    addEventListener('scroll', () => { raf ||= requestAnimationFrame(aggiorna); }, { passive: true });
    addEventListener('resize', aggiorna);
    aggiorna();
  }

  /* ---------- Lavori: su telefono i primi 6, poi il pulsante ---------- */
  const lavori = $('#lavori');
  const mostra = $('#mostra-lavori');
  if (matchMedia('(max-width: 759px)').matches) {
    lavori.classList.add('lavori--compatta');
    mostra.hidden = false;
    mostra.addEventListener('click', () => {
      lavori.classList.remove('lavori--compatta');
      mostra.hidden = true;
      $('.lavoro:nth-child(7) .lavoro__apri')?.focus({ preventScroll: true });
    });
  }

  /* ---------- Scheda progetto ---------- */
  const SCHEDE = {
    centroprofondo: {
      cliente: 'Centroprofondo', tipo: 'Short film',
      testo: [
        "Uno short film dedicato a Tiziano Internò, pilota della Rally Dakar e YouTuber amatissimo nel mondo delle moto, e al suo tentativo di record: l'immersione subacquea più profonda in sella a una moto.",
        "Dietro l'impresa più folle c'è una storia di umanità: i dubbi, la paura, la forza di ritrovare l'equilibrio. Con lui i campioni dell'apnea Gianluca Genoni, Ilenia Colanero e Fabrizio Pagani e il pilota Nicola Dutto.",
        "Il film ha accompagnato anche la cerimonia del record alla struttura Y-40 di Padova, dove Tiziano è entrato nel Guinness World Records."
      ],
      ruolo: ['Art direction', 'Concept', 'Scriptwriting', 'Produzione foto e video', 'Video editing', 'Organizzazione evento', 'Gestione diretta video', 'Social strategy']
    },
    technogym: {
      cliente: 'Technogym', tipo: 'Lancio prodotto',
      testo: [
        'Non chiamatelo tapis roulant. Per il lancio di Skillmill, una comunicazione integrata dedicata alle sue caratteristiche più innovative.',
        'Luce caravaggesca su corpi e macchine nelle foto, racconto tecnico dei benefici nei video. La campagna, premiata con riconoscimenti internazionali, è uscita in affissione, sui media digitali e sui magazine di settore in Europa, Nord America e Asia.',
        'Le foto della campagna arredano i flagship store Technogym in giro per il mondo.'
      ],
      ruolo: ['Art direction', 'Concept', 'Produzione foto e video', 'Video editing', 'Social strategy']
    },
    'save-the-children': {
      cliente: 'Save the Children', tipo: 'Spot televisivo', premio: 'Special Star per la Regia, Mediastars 2021',
      testo: [
        "Non è mai troppo tardi per fare un gesto importante. Lo spot racconta i lasciti testamentari: una firma che può cambiare il futuro di chi è meno fortunato.",
        "Un tema delicato trattato con rispetto e misura. La regia lavora per sottrazione, con immagini simboliche e luce naturale; la voce narrante accompagna verso una riflessione semplice e diretta.",
        'Lo spot è andato in onda su scala nazionale.'
      ],
      ruolo: ['Art direction', 'Concept', 'Scriptwriting', 'Produzione foto e video', 'Video editing', 'Social']
    },
    findus: {
      cliente: 'Findus', tipo: 'Spot televisivo',
      testo: [
        'Insieme per il futuro degli oceani: Findus si unisce ad Artichoke Bags, realtà che trasforma vele navali recuperate e tessuti riciclati in zaini unici.',
        "Il Capitano non è un testimonial ma un partner: lavora fianco a fianco con gli artigiani, tocca le vele vissute, segue la trasformazione del materiale. Una regia intima, fatta di volti e dettagli sartoriali."
      ],
      ruolo: ['Art direction', 'Concept', 'Produzione foto e video', 'Video editing']
    },
    asiago: {
      cliente: 'Consorzio Tutela Formaggio Asiago', tipo: 'Campagna ADV TV', premio: 'Miglior Spot, Cibus 2022',
      testo: [
        "Una campagna sui mille volti dell'Asiago DOP: i suoi modi d'uso e il suo potere di unire le persone, a tavola, nei picnic e nei momenti da condividere.",
        "Le immagini attraversano l'Italia, dai paesaggi dell'altipiano a Milano fino a Treviso, e uniscono le origini alla modernità.",
        'Dalla TV alle affissioni, fino al digitale: ogni frame e ogni supporto coordinato in un’unica estetica.'
      ],
      ruolo: ['Art direction', 'Film direction', 'Produzione foto e video', 'Video editing', 'Eventi e contenuti OOH']
    },
    'fondazione-fs': {
      cliente: 'Fondazione FS', tipo: 'Video celebrativo e libro', premio: "Premio OMI 2024, Migliore Monografia d'Impresa",
      testo: [
        'La storia del treno è la storia del nostro Paese. Per i dieci anni di Fondazione FS, un racconto in due forme: un video celebrativo e un libro fotografico.',
        'Materiale dagli archivi FS di Piazza della Croce Rossa a Roma e riprese originali, intrecciati per raccontare le ferrovie italiane e il lavoro della Fondazione.',
        "Il libro Una Bella Storia Italiana ha vinto il premio OMI 2024 per la Migliore Monografia d'Impresa."
      ],
      ruolo: ['Art direction', 'Concept', 'Produzione foto e video', 'Video editing', 'Progetto editoriale', 'Gestione della stampa', 'Social strategy']
    },
    'banca-prealpi': {
      cliente: 'Banca Prealpi SanBiagio', tipo: 'Short film per i 130 anni',
      testo: [
        'Una Storia con la S maiuscola fatta di tante storie con la minuscola: quelle della gente, che troppo spesso si dimenticano.',
        'Oltre 500 tavole animate in passo uno, ognuna un frammento di comunità e dei valori del credito cooperativo.',
        'Il corto è stato presentato alla Convention dei Soci, davanti a chi questa storia la vive ancora oggi.'
      ],
      ruolo: ['Art direction', 'Concept', 'Scriptwriting', 'Produzione contenuti', 'Video editing']
    },
    proraso: {
      cliente: 'Proraso', tipo: 'Campagna di posizionamento',
      testo: [
        'Una campagna di riposizionamento in giro per il mondo, da New York a Londra, Mosca, Lisbona, Monaco e Parigi, per incontrare le stelle della barberia moderna.',
        'Veri barbieri in veri saloni, raccontati per gesti: quelli del rituale della rasatura. Scatti posati e video in oltre 10 tagli diversi.',
        "L'approccio cinematografico è diventato uno stile che caratterizza ancora oggi la comunicazione Proraso."
      ],
      ruolo: ['Art direction', 'Produzione foto e video', 'Scriptwriting', 'Video editing', 'Social']
    },
    blauer: {
      cliente: 'Blauer USA', tipo: 'Campagna fotografica',
      testo: [
        'Neon blu e camouflage per Un1t3d Camou, il profumo Blauer firmato Veronique Nyberg.',
        'La palette militare diventa cifra stilistica e lega la campagna al DNA del brand. Diffusa sui canali ufficiali Blauer e in affissione negli Stati Uniti e nelle principali città europee.'
      ],
      ruolo: ['Art direction', 'Concept', 'Produzione foto', 'Photo editing']
    },
    trentino: {
      cliente: 'Trentino Marketing', tipo: 'Short movie',
      testo: [
        "Mio Trentino racconta la nuova app di Trentino Marketing con un corto cinematografico: Luca scopre che conoscere un territorio serve sempre, anche quando il programma della giornata è decisamente bizzarro.",
        "Nato da una sceneggiatura originale, è stato distribuito nei principali cinema d'Europa come pre-roll: storytelling costruito e memorabile, contro la comunicazione di pochi secondi."
      ],
      ruolo: ['Art direction', 'Concept', 'Scriptwriting', 'Produzione foto e video', 'Video editing', 'Social strategy']
    },
    m9: {
      cliente: "M9 Museo del '900", tipo: 'Video promozionale',
      testo: [
        'Arte Salvata racconta di quadri come fiori tra le macerie: capolavori sopravvissuti alla guerra, dalla curatela di Marianne Mathieu e Geraldine Lefebvre del MuMa di Le Havre.',
        'Una serie di video social con voice-over originale in 4 lingue: italiano, inglese, francese e giapponese.',
        "Il progetto è stato scelto per rappresentare Fondazione Venezia all'Expo 2025 di Osaka."
      ],
      ruolo: ['Art direction', 'Concept', 'Scriptwriting', 'Produzione foto e video', 'Video editing multilingua', 'Social']
    },
    somec: {
      cliente: 'Somec Gruppo', tipo: 'Branding',
      testo: [
        "Somec riunisce le migliori firme della qualità costruttiva italiana in un'unica famiglia di brand. Il progetto per Mestieri, la divisione dedicata agli interni, ne traduce la filosofia in una nuova identità.",
        'Un tratto minimalista comune a tutte le eccellenze del gruppo, un magazine cartaceo formato coffee table e un video corporate sulle specializzazioni artigiane.',
        "Il progetto è stato presentato dal CEO Oscar Marchetto agli stakeholder al ristorante Cracco di Milano."
      ],
      ruolo: ['Art direction', 'Concept', 'Produzione foto e video', 'Video editing', 'Progetto editoriale', 'Social strategy']
    }
  };

  const scheda = $('#scheda');
  let apertaDa = null;
  const apriScheda = (chiave, bottone) => {
    const d = SCHEDE[chiave];
    if (!d) return;
    const img = $('#scheda-img');
    img.src = `assets/img/lavoro-${chiave}.jpg`;
    img.alt = $('img', bottone)?.alt || '';
    $('#scheda-tipo').textContent = d.tipo;
    $('#scheda-cliente').textContent = d.cliente;
    const premio = $('#scheda-premio');
    premio.hidden = !d.premio;
    premio.textContent = d.premio || '';
    $('#scheda-corpo').innerHTML = d.testo.map(t => `<p>${t}</p>`).join('');
    $('#scheda-ruolo').innerHTML = d.ruolo.map(r => `<li>${r}</li>`).join('');
    apertaDa = bottone;
    if (typeof scheda.showModal === 'function') scheda.showModal(); else scheda.setAttribute('open', '');
    doc.style.overflow = 'hidden';
    $('.scheda__contenuto', scheda).scrollTop = 0;
  };
  const chiudiScheda = () => {
    if (scheda.open) scheda.close(); else scheda.removeAttribute('open');
  };
  scheda.addEventListener('close', () => { doc.style.overflow = ''; apertaDa?.focus({ preventScroll: true }); });
  $('#scheda-chiudi').addEventListener('click', chiudiScheda);
  scheda.addEventListener('click', e => { if (e.target === scheda) chiudiScheda(); });
  $('#scheda-cta').addEventListener('click', () => { chiudiScheda(); });
  $$('.lavoro').forEach(l => {
    const b = $('.lavoro__apri', l);
    b.addEventListener('click', () => apriScheda(l.dataset.lavoro, b));
  });

  /* ---------- Modulo: compone il messaggio e apre email o WhatsApp ---------- */
  const modulo = $('#modulo');
  const errore = $('#modulo-errore');
  const leggi = () => {
    const f = new FormData(modulo);
    const v = k => (f.get(k) || '').toString().trim();
    return { nome: v('nome'), azienda: v('azienda'), email: v('email'), telefono: v('telefono'), messaggio: v('messaggio'), tipi: f.getAll('tipo') };
  };
  const segna = (nome, ok) => modulo.elements[nome].closest('.campo').classList.toggle('errore', !ok);
  const controlla = (d, perEmail) => {
    const mancanti = [];
    const okNome = d.nome.length > 1; segna('nome', okNome); if (!okNome) mancanti.push('il nome');
    const okEmail = !perEmail || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email); segna('email', okEmail); if (!okEmail) mancanti.push("un'email valida");
    const okMsg = d.messaggio.length > 3; segna('messaggio', okMsg); if (!okMsg) mancanti.push('due righe sul progetto');
    if (mancanti.length) {
      errore.hidden = false;
      errore.textContent = `Per inviare la richiesta servono ${mancanti.join(', ').replace(/, ([^,]*)$/, ' e $1')}.`;
      modulo.querySelector('.campo.errore input, .campo.errore textarea')?.focus();
      return false;
    }
    errore.hidden = true;
    return true;
  };
  const componi = d => [
    'Ciao Multistudio,', '',
    d.messaggio, '',
    d.tipi.length ? `Di cosa ho bisogno: ${d.tipi.join(', ')}` : null,
    `Nome: ${d.nome}`,
    d.azienda ? `Azienda: ${d.azienda}` : null,
    d.email ? `Email: ${d.email}` : null,
    d.telefono ? `Telefono: ${d.telefono}` : null
  ].filter(r => r !== null).join('\n');

  modulo.addEventListener('submit', e => {
    e.preventDefault();
    const d = leggi();
    if (!controlla(d, true)) return;
    const oggetto = `Nuovo progetto da ${d.nome}${d.azienda ? ` (${d.azienda})` : ''}`;
    location.href = `mailto:ciao@multistudio.productions?subject=${encodeURIComponent(oggetto)}&body=${encodeURIComponent(componi(d))}`;
  });
  $('#invia-whatsapp').addEventListener('click', () => {
    const d = leggi();
    if (!controlla(d, false)) return;
    window.open(`https://wa.me/393477549190?text=${encodeURIComponent(componi(d))}`, '_blank', 'noopener');
  });
  modulo.addEventListener('input', e => e.target.closest('.campo')?.classList.remove('errore'));

  /* ---------- Anno ---------- */
  $('#anno').textContent = new Date().getFullYear();

  /* ---------- Hero: il contenuto si allontana con lo scroll ---------- */
  const hero = $('#hero');
  const contenuto = $('.hero__contenuto');
  let rafHero = 0;
  const scrollHero = () => {
    rafHero = 0;
    const p = Math.min(1, Math.max(0, scrollY / hero.offsetHeight));
    contenuto.style.transform = p ? `translateY(${(-p * 14).toFixed(2)}vh)` : '';
    contenuto.style.opacity = p ? (1 - p * 1.25).toFixed(3) : '';
  };
  if (!muoviPoco) addEventListener('scroll', () => { rafHero ||= requestAnimationFrame(scrollHero); }, { passive: true });

  /* ---------- 3D: solo dopo il caricamento, solo con WebGL2 ---------- */
  const avvia3D = () => {
    const prova = document.createElement('canvas').getContext('webgl2');
    if (!prova) return;
    import('./3d.js').then(m => m.avvia({
      canvas: $('#anello'), hero, foto: $('#hero-foto'), velo: $('.hero__velo'),
      titolo: $('.hero__titolo'), didascalia: $('#didascalia'), cornice: $('.hero__didascalia'),
      fermo: muoviPoco
    })).catch(err => console.warn('3D non disponibile', err));
  };
  if (document.readyState === 'complete') setTimeout(avvia3D, 60);
  else addEventListener('load', () => setTimeout(avvia3D, 60), { once: true });
})();
