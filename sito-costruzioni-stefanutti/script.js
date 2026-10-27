(() => {
  const html = document.documentElement;
  const ridotto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  // intro dell'hero: parte quando il font è pronto (o comunque dopo 1,2 s)
  let avviato = false;
  const avvia = () => {
    if (avviato) return;
    avviato = true;
    html.classList.add('avvio');
    setTimeout(() => html.classList.add('aperto'), 2300);
  };
  if (ridotto) avvia();
  else {
    const font = document.fonts ? document.fonts.load('820 64px "Mona Sans"').catch(() => {}) : Promise.resolve();
    Promise.race([font, new Promise(r => setTimeout(r, 1200))]).then(() => requestAnimationFrame(avvia));
    setTimeout(avvia, 2000);
  }

  // testata solida dopo l'hero
  const testata = $('#testata');
  const aggiornaTestata = () => testata.classList.toggle('solida', scrollY > 24);
  addEventListener('scroll', aggiornaTestata, { passive: true });
  aggiornaTestata();

  // menu mobile
  const btnMenu = $('.testata__menu');
  const menu = $('#menu');
  const chiudiMenu = () => {
    menu.hidden = true;
    btnMenu.setAttribute('aria-expanded', 'false');
    html.classList.remove('menu-aperto');
    $('.testata__menu-testo').textContent = 'Menu';
  };
  btnMenu.addEventListener('click', () => {
    const apri = menu.hidden;
    if (!apri) return chiudiMenu();
    menu.hidden = false;
    btnMenu.setAttribute('aria-expanded', 'true');
    html.classList.add('menu-aperto');
    $('.testata__menu-testo').textContent = 'Chiudi';
  });
  $$('a', menu).forEach(a => a.addEventListener('click', chiudiMenu));
  addEventListener('keydown', e => { if (e.key === 'Escape' && !menu.hidden) chiudiMenu(); });

  // foto che salgono come un getto (si osserva la figura, non l'immagine ritagliata)
  const daRivelare = $$('[data-rivela]');
  if ('IntersectionObserver' in window && !ridotto) {
    const io = new IntersectionObserver(voci => voci.forEach(v => {
      if (v.isIntersecting) { v.target.classList.add('in'); io.unobserve(v.target); }
    }), { rootMargin: '0px 0px -8% 0px', threshold: .12 });
    daRivelare.forEach(el => io.observe(el));
  } else daRivelare.forEach(el => el.classList.add('in'));

  // palco "come nasce un capannone": avanzamento legato allo scroll
  const cantiere = $('#cantiere');
  const palco = $('.cantiere__palco', cantiere);
  const stato = { p: 0 };
  let attesa = false;
  const misura = () => {
    attesa = false;
    const r = cantiere.getBoundingClientRect();
    const corsa = cantiere.offsetHeight - palco.offsetHeight;
    const p = Math.min(1, Math.max(0, -r.top / Math.max(1, corsa)));
    stato.p = p;
    palco.style.setProperty('--p', p.toFixed(4));
    const fase = Math.min(3, Math.floor(p * 4.0001));
    if (palco.dataset.fase !== String(fase)) palco.dataset.fase = fase;
  };
  addEventListener('scroll', () => { if (!attesa) { attesa = true; requestAnimationFrame(misura); } }, { passive: true });
  addEventListener('resize', misura);
  misura();

  // la scena three.js arriva solo quando il palco si avvicina, mai prima della pagina
  const webgl = (() => {
    try {
      const c = document.createElement('canvas');
      return !!(window.WebGL2RenderingContext && c.getContext('webgl2'));
    } catch (e) { return false; }
  })();
  if (webgl && 'IntersectionObserver' in window) {
    const io3d = new IntersectionObserver(voci => {
      if (!voci.some(v => v.isIntersecting)) return;
      io3d.disconnect();
      import('./3d.js')
        .then(m => m.avvia({
          canvas: $('.cantiere__canvas', cantiere),
          scena: $('.cantiere__scena', cantiere),
          sezione: cantiere,
          etichette: $$('.etichetta-3d', cantiere),
          leggiP: () => stato.p,
          ridotto
        }))
        .then(() => cantiere.classList.add('pronto'))
        .catch(err => console.warn('Scena 3D non disponibile:', err));
    }, { rootMargin: '700px 0px' });
    io3d.observe(cantiere);
  }

  // lavori: filtri, apertura dal mosaico e dai link "vedi i lavori"
  const righe = $$('.lavoro');
  const filtri = $$('.filtro');
  const filtra = cat => {
    filtri.forEach(f => f.setAttribute('aria-pressed', String(f.dataset.filtro === cat)));
    righe.forEach(r => r.classList.toggle('nascosto', cat !== 'tutti' && r.dataset.cat !== cat));
  };
  filtri.forEach(f => f.addEventListener('click', () => filtra(f.dataset.filtro)));
  $$('[data-filtra]').forEach(a => a.addEventListener('click', () => filtra(a.dataset.filtra)));
  $$('[data-apri]').forEach(a => a.addEventListener('click', e => {
    const riga = document.getElementById(a.dataset.apri);
    if (!riga) return;
    e.preventDefault();
    filtra('tutti');
    $('details', riga).open = true;
    riga.scrollIntoView({ behavior: ridotto ? 'auto' : 'smooth', block: 'start' });
  }));

  // via Cavour: esploso dei tre piani
  const esploso = $('#esploso');
  const testi = {
    '01': "Appartamento 0.1, al piano terra.",
    '11': "Appartamento 1.1, al primo piano. Al piano terra, il suo posto auto.",
    '12': "Appartamento 1.2, al primo piano. Al piano terra, il suo posto auto.",
    '13': "Appartamento 1.3, al primo piano. Al piano terra, il suo posto auto.",
    '21': "Appartamento 2.1, al secondo piano. Al piano terra, il suo posto auto.",
    '22': "Appartamento 2.2, al secondo piano. Al piano terra, il suo posto auto."
  };
  const bottoni = $$('.esploso__scelta button', esploso);
  const info = $('.esploso__info', esploso);
  const scegli = u => {
    esploso.classList.add('scelto');
    bottoni.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.u === u)));
    $$('.unita[data-u]', esploso).forEach(el => el.classList.toggle('on', el.dataset.u === u));
    $$('.piano', esploso).forEach(p => p.classList.toggle('acceso', !!$(`.unita[data-u="${u}"]`, p)));
    info.textContent = testi[u];
  };
  // finché nessuno tocca, gli appartamenti si accendono uno dopo l'altro
  let giro = null, toccato = false, indice = 0;
  const ordine = ['12', '01', '21', '13', '22', '11'];
  const ferma = () => { clearInterval(giro); giro = null; };
  bottoni.forEach(b => b.addEventListener('click', () => { toccato = true; ferma(); scegli(b.dataset.u); }));
  if ('IntersectionObserver' in window && !ridotto) {
    new IntersectionObserver(voci => voci.forEach(v => {
      if (toccato) return;
      if (v.isIntersecting && !giro) {
        scegli(ordine[indice % ordine.length]);
        giro = setInterval(() => { indice++; scegli(ordine[indice % ordine.length]); }, 2400);
      } else if (!v.isIntersecting) ferma();
    }), { threshold: .35 }).observe($('.esploso__palco', esploso));
  }

  const dialogo = $('#piante');
  $('[data-apri-piante]').addEventListener('click', () => {
    if (dialogo.showModal) dialogo.showModal(); else dialogo.setAttribute('open', '');
  });
  $('[data-chiudi-piante]').addEventListener('click', () => dialogo.close ? dialogo.close() : dialogo.removeAttribute('open'));
  dialogo.addEventListener('click', e => { if (e.target === dialogo) dialogo.close(); });

  // modulo: compone l'email e apre l'app di posta
  const modulo = $('#modulo');
  modulo.addEventListener('submit', e => {
    e.preventDefault();
    const d = new FormData(modulo);
    const v = k => (d.get(k) || '').toString().trim();
    const errore = $('.modulo__errore', modulo);
    const nome = modulo.elements.nome, tel = modulo.elements.telefono;
    nome.classList.toggle('invalido', !v('nome'));
    tel.classList.toggle('invalido', !v('telefono'));
    if (!v('nome') || !v('telefono')) {
      errore.hidden = false;
      (v('nome') ? tel : nome).focus();
      return;
    }
    errore.hidden = true;
    const corpo = ['Buongiorno,', 'vorrei un preventivo per questo lavoro.', '', `Tipo di lavoro: ${v('tipo')}`];
    if (v('luogo')) corpo.push(`Comune del cantiere: ${v('luogo')}`);
    if (v('messaggio')) corpo.push('', v('messaggio'));
    corpo.push('', `Nome: ${v('nome')}`);
    if (v('azienda')) corpo.push(`Azienda o ente: ${v('azienda')}`);
    corpo.push(`Telefono: ${v('telefono')}`);
    if (v('email')) corpo.push(`Email: ${v('email')}`);
    const oggetto = `Richiesta di preventivo: ${v('tipo')}`;
    location.href = `mailto:info@costruzionistefanutti.it?subject=${encodeURIComponent(oggetto)}&body=${encodeURIComponent(corpo.join('\n'))}`;
  });

  // mappa caricata solo su richiesta: niente cookie di Google prima del clic
  $('[data-carica-mappa]').addEventListener('click', () => {
    const f = document.createElement('iframe');
    f.src = 'https://www.google.com/maps?q=Via%20Cavour%2014%2C%2031020%20San%20Vendemiano%20TV&z=16&output=embed';
    f.title = 'Mappa: Via Cavour 14, San Vendemiano (TV)';
    f.loading = 'lazy';
    f.referrerPolicy = 'no-referrer-when-downgrade';
    $('#mappa').replaceChildren(f);
  });

  $$('[data-anno]').forEach(el => { el.textContent = new Date().getFullYear(); });
})();
