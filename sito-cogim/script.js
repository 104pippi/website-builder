// CO.G.IM. — interazioni del sito. La scena WebGL sta in 3d.js e arriva dopo la pagina.
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const ridotto = matchMedia('(prefers-reduced-motion: reduce)').matches;
const T0 = performance.now();
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const easeInOut = (t) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/* Anno nel piede */
$$('[data-anno]').forEach((el) => { el.textContent = new Date().getFullYear(); });

/* Testata: trasparente sull'hero, piena dopo */
const testata = $('[data-testata]');
const hero = $('[data-hero]');
const aggiornaTestata = () => {
  const soglia = hero ? hero.offsetHeight * 0.72 - 80 : 40;
  testata.classList.toggle('is-solida', scrollY > soglia);
};
addEventListener('scroll', aggiornaTestata, { passive: true });
aggiornaTestata();

/* Menu mobile */
const bottoneMenu = $('[data-apri-menu]');
const menu = $('#menu-mobile');
const chiudiMenu = () => {
  menu.hidden = true;
  bottoneMenu.setAttribute('aria-expanded', 'false');
  bottoneMenu.querySelector('.vh').textContent = 'Apri il menu';
  testata.classList.remove('is-aperta');
};
bottoneMenu.addEventListener('click', () => {
  const apri = menu.hidden;
  if (!apri) return chiudiMenu();
  menu.hidden = false;
  bottoneMenu.setAttribute('aria-expanded', 'true');
  bottoneMenu.querySelector('.vh').textContent = 'Chiudi il menu';
  testata.classList.add('is-aperta');
});
$$('a', menu).forEach((a) => a.addEventListener('click', chiudiMenu));
addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) { chiudiMenu(); bottoneMenu.focus(); } });

/* Barra CTA mobile: compare quando la CTA dell'hero esce dallo schermo */
const barra = $('[data-barra-cta]');
const ctaHero = $('.hero__azioni .bottone--verde');
if (barra && ctaHero && 'IntersectionObserver' in window) {
  new IntersectionObserver(([v]) => barra.classList.toggle('is-visibile', !v.isIntersecting), { threshold: 0 }).observe(ctaHero);
} else if (barra) barra.classList.add('is-visibile');

/* ---------- HERO: il rustico che torna a vivere ---------- */
const stato = $('[data-hero-stato]');
const parola = $('[data-hero-parola]');
const barraHero = $('[data-hero-barra]');
let heroAvviato = false;
const segnaHero = (p) => {
  barraHero.style.transform = `scaleX(${p.toFixed(4)})`;
  const dopo = p > 0.52;
  if (dopo !== stato.classList.contains('is-dopo')) {
    stato.classList.toggle('is-dopo', dopo);
    parola.textContent = dopo ? 'Dopo' : 'Prima';
  }
};
const RESTAURO_MS = 2300;
const PARTENZA_MS = 750;

// Ripiego senza WebGL: l'intonaco passa in CSS da sinistra a destra (stessa durata)
function avviaHeroCss() {
  if (heroAvviato) return;
  heroAvviato = true;
  hero.classList.add('hero--css');
  const inizio = performance.now();
  const passo = () => {
    const p = clamp((performance.now() - inizio) / RESTAURO_MS, 0, 1);
    segnaHero(easeInOut(p));
    if (p < 1) requestAnimationFrame(passo);
  };
  requestAnimationFrame(passo);
}

if (ridotto) {
  hero.classList.add('hero--statico');
  segnaHero(1);
} else {
  // se il WebGL non è pronto in tempo, parte il ripiego CSS
  const scadenza = setTimeout(avviaHeroCss, 2600);
  const caricaHero = () => {
    import('./3d.js').then(async (m) => {
      const scena = await m.creaHero({
        canvas: $('[data-hero-canvas]'),
        hero,
        mobile: matchMedia('(max-width: 899px)').matches,
      });
      if (!scena || heroAvviato) return;
      heroAvviato = true;
      clearTimeout(scadenza);
      hero.classList.add('hero--webgl');
      const attesa = Math.max(0, PARTENZA_MS - (performance.now() - T0));
      setTimeout(() => scena.restaura(RESTAURO_MS, segnaHero), attesa);
    }).catch(() => { /* resta il ripiego CSS */ });
  };
  if (document.readyState === 'complete') caricaHero();
  else addEventListener('load', caricaHero, { once: true });
}

/* Parallasse leggera del testo dell'hero */
const contenutoHero = $('.hero__contenuto');
if (!ridotto && contenutoHero) {
  let inCoda = false;
  addEventListener('scroll', () => {
    if (inCoda) return;
    inCoda = true;
    requestAnimationFrame(() => {
      inCoda = false;
      const y = scrollY;
      if (y > innerHeight * 1.2) return;
      contenutoHero.style.transform = `translate3d(0, ${(-y * 0.22).toFixed(1)}px, 0)`;
      contenutoHero.style.opacity = (1 - clamp(y / (innerHeight * 0.75), 0, 1)).toFixed(3);
    });
  }, { passive: true });
}

/* ---------- PRIMA E DOPO ---------- */
const OPERE = [
  { id: 'farmacia-vazzola', nome: 'Farmacia di Vazzola', cat: 'Restauro', luogo: 'Vazzola',
    storia: "La storica farmacia del paese, rifatta dalle fondazioni al tetto passando per un solaio completamente nuovo. Il tetto è tornato su con le stesse travi e tavole di prima: recuperate, lavorate e trattate a mano da noi.",
    cantiere: 'le vecchie travi recuperate, pronte per essere lavorate a mano.' },
  { id: 'rustico-cappella-maggiore', nome: 'Rustico a Cappella Maggiore', cat: 'Restauro', luogo: 'Colline sopra Vittorio Veneto',
    storia: "Era un rudere: muri in sassi pericolanti e una casa che si sbriciolava. Abbiamo legato i muri con tiranti in ferro, svuotato l'interno e rifatto le fondazioni su micropali, che reggono anche la nuova taverna davanti alla villa. Moderna dentro, con la pietra a vista fuori.",
    cantiere: 'la perforatrice per i micropali dentro la casa svuotata.' },
  { id: 'rustico-colli-conegliano', nome: 'Rustico sui colli di Conegliano', cat: 'Restauro', luogo: 'Colli di Conegliano',
    storia: "Una casa colonica in collina, consumata dal tempo e disabitata da anni. È stato uno dei primi cantieri di bioedilizia nel Coneglianese: materiali conformi alle norme della bioedilizia, che rispettano la natura e lasciano parlare l'architettura originale.",
    cantiere: "un arco in mattoni rifatto sulla centina di legno." },
  { id: 'palazzo-calissoni', nome: 'Palazzo Calissoni', cat: 'Restauro', luogo: 'Centro storico di Conegliano',
    storia: "Un palazzo del Seicento nel cuore antico di Conegliano. L'abbiamo svuotato, abbiamo rinforzato i muri perimetrali in sassi e ricostruito solai e tetto con lo stesso legname recuperato. Fuori, la scelta dell'intonaco ha fatto la differenza.",
    cantiere: 'i nuovi solai in legno dentro il palazzo svuotato.' },
  { id: 'podere-la-gerla', nome: 'Podere la Gerla', cat: 'Restauro', luogo: 'Rustico residenziale',
    storia: "Una vecchia casa colonica destinata all'abbandono. L'abbiamo svuotata e ricostruita dalle fondazioni al tetto, scegliendo i materiali uno a uno: oggi ha un vestito nuovo ed elegante, e la pietra di una volta.",
    cantiere: 'le travi del nuovo tetto, appoggiate sui muri in pietra.' },
  { id: 'rustico-san-pietro-feletto', nome: 'Rustico a San Pietro di Feletto', cat: 'Restauro', luogo: 'Tra i vigneti del Coneglianese',
    storia: "Una casa colonica immersa nei vigneti, ridotta quasi a un rudere. L'abbiamo svuotata e trasformata in una villa; parte dei vecchi solai è stata recuperata e lavorata per il nuovo tetto, antico nello stile e moderno nel tocco.",
    cantiere: 'la nuova orditura del tetto vista dal basso.' },
  { id: 'rustico-campolongo', nome: 'Rustico a Campolongo', cat: 'Restauro', luogo: 'Tra Ramera e Campolongo',
    storia: "Uno dei nostri lavori più conosciuti: il rustico appena fuori Conegliano che è diventato il Geographic e poi il Filò, ritrovo di migliaia di ragazzi nel fine settimana. Ancora oggi ospita eventi e serate.",
    cantiere: 'il legname recuperato, accatastato in cantiere.' },
  { id: 'centro-storico-conegliano', nome: 'Complesso residenziale in centro', cat: 'Restauro', luogo: 'Centro storico di Conegliano',
    storia: "Palazzi antichi in decadenza, in una corte dove il camion non poteva entrare: terra e macerie uscivano su nastri trasportatori fino al cassone in strada. Micropali per mettere in sicurezza gli edifici, legname recuperato a mano e facciate affrescate restaurate da collaboratori delle Belle Arti di Venezia.",
    cantiere: 'i nastri trasportatori che portavano le macerie fino al camion.' },
  { id: 'complesso-commerciale-conegliano', nome: 'Complesso commerciale in centro', cat: 'Restauro', luogo: 'Corte interna a Conegliano',
    storia: "Un garage abbandonato in una corte interna, nel cuore di Conegliano. Spazio strettissimo: siamo ripartiti dalle fondazioni e abbiamo scavato sotto il fabbricato per creare un interrato su micropali. Il nostro marchio di fabbrica: modernizzare l'antico.",
    cantiere: "le casseforme dell'interrato, scavato sotto il fabbricato." },
  { id: 'villa-liberty-sacile', nome: 'Villa liberty a Sacile', cat: 'Restauro', luogo: 'Sacile, nel Pordenonese',
    storia: "Una villa in stile Liberty studiata nei minimi dettagli: i canoni architettonici del primo Novecento rispettati uno per uno, con il nostro tocco moderno dove serviva.",
    cantiere: 'il tetto in legno rifatto.' },
  { id: 'villa-conegliano', nome: 'Villa a Conegliano', cat: 'Nuova costruzione', luogo: 'Colline di Conegliano',
    storia: "Una villa nuova sulle colline di Conegliano, costruita da zero. Il suo tratto più forte è il rivestimento in pietra, preparato e posato tutto a mano.",
    cantiere: 'il rivestimento in pietra, posato a mano.' },
  { id: 'casa-vittorio-veneto', nome: 'Casa a Vittorio Veneto', cat: 'Nuova costruzione', luogo: 'Vittoriese',
    storia: "Una casa degli anni Sessanta, demolita completamente e ricostruita. Il dettaglio che si nota subito, dentro: la scala in ferro fatta a mano.",
    cantiere: 'la demolizione della vecchia casa.' },
  { id: 'complesso-industriale', nome: 'Complesso industriale', cat: 'Industriale', luogo: 'Per una nota industria del territorio',
    storia: "Per gettare l'enorme platea in calcestruzzo armato senza interruzioni, la squadra ha lavorato 24 ore su 24, a turni: un blocco unico e compatto, capace di reggere silos alti oltre 25 metri.",
    cantiere: 'la platea in calcestruzzo armato, gettata senza fermarsi.' },
];

const confronto = $('[data-confronto]');
const maniglia = $('[data-maniglia]');
const elenco = $('[data-elenco]');
const testoOpera = $('[data-opera-testo]');
let pos = 50;
let animazione = 0;

const mettiPos = (p) => {
  pos = clamp(p, 0, 100);
  confronto.style.setProperty('--pos', pos.toFixed(2) + '%');
  maniglia.setAttribute('aria-valuenow', Math.round(pos));
  maniglia.setAttribute('aria-valuetext', pos > 85 ? 'Quasi tutto prima' : pos < 15 ? 'Quasi tutto dopo' : 'Metà prima, metà dopo');
  confronto.dataset.lato = pos > 88 ? 'prima' : pos < 12 ? 'dopo' : '';
};

// Mostra da solo il prima e il dopo: la maniglia scorre e si ferma a metà
function spazzata() {
  if (ridotto) return mettiPos(50);
  const id = ++animazione;
  const tappe = [[0, 50], [650, 94], [1650, 8], [2350, 50]];
  const inizio = performance.now();
  const passo = () => {
    if (id !== animazione) return;
    const t = performance.now() - inizio;
    let i = 0;
    while (i < tappe.length - 2 && t > tappe[i + 1][0]) i++;
    const [t0, p0] = tappe[i];
    const [t1, p1] = tappe[i + 1];
    const k = clamp((t - t0) / (t1 - t0), 0, 1);
    mettiPos(p0 + (p1 - p0) * easeInOut(k));
    if (t < tappe[tappe.length - 1][0]) requestAnimationFrame(passo);
  };
  requestAnimationFrame(passo);
}

// Trascinamento (puntatore e tocco), con lo scroll verticale sempre libero:
// col dito la maniglia si muove solo quando il gesto è chiaramente orizzontale
let trascina = false;
let partenza = null;
const daEvento = (e) => {
  const r = confronto.getBoundingClientRect();
  mettiPos(((e.clientX - r.left) / r.width) * 100);
};
const iniziaTrascina = (e) => {
  animazione++;
  trascina = true;
  confronto.classList.add('is-trascina');
  try { confronto.setPointerCapture(e.pointerId); } catch (err) { /* puntatore già rilasciato */ }
  daEvento(e);
};
confronto.addEventListener('pointerdown', (e) => {
  if (e.pointerType === 'mouse' || e.target.closest('[data-maniglia]')) return iniziaTrascina(e);
  partenza = { x: e.clientX, y: e.clientY };
});
confronto.addEventListener('pointermove', (e) => {
  if (trascina) return daEvento(e);
  if (!partenza) return;
  const dx = Math.abs(e.clientX - partenza.x);
  const dy = Math.abs(e.clientY - partenza.y);
  if (dx > 8 && dx > dy * 1.2) { partenza = null; iniziaTrascina(e); }
  else if (dy > 10) partenza = null;
});
confronto.addEventListener('click', (e) => {
  // un tocco singolo sposta la maniglia lì (solo col dito: col mouse c'è già il trascinamento)
  if (!trascina && e.pointerType !== 'mouse' && !e.target.closest('[data-maniglia]')) { animazione++; daEvento(e); }
});
const fine = () => { trascina = false; partenza = null; confronto.classList.remove('is-trascina'); };
confronto.addEventListener('pointerup', fine);
confronto.addEventListener('pointercancel', fine);
maniglia.addEventListener('keydown', (e) => {
  const passi = { ArrowLeft: -5, ArrowRight: 5, ArrowDown: -5, ArrowUp: 5, PageDown: -20, PageUp: 20 };
  if (e.key in passi) { animazione++; mettiPos(pos + passi[e.key]); e.preventDefault(); }
  if (e.key === 'Home') { animazione++; mettiPos(0); e.preventDefault(); }
  if (e.key === 'End') { animazione++; mettiPos(100); e.preventDefault(); }
});

// Elenco dei cantieri
const percorso = (id, tipo, est) => `assets/img/opere/${id}-${tipo}.${est}`;
OPERE.forEach((o, i) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'elenco__voce';
  b.setAttribute('aria-pressed', i === 0 ? 'true' : 'false');
  b.dataset.i = i;
  b.innerHTML = `<picture><source srcset="${percorso(o.id, 'mini', 'webp')}" type="image/webp"><img src="${percorso(o.id, 'mini', 'jpg')}" width="480" height="270" alt="" loading="lazy" decoding="async"></picture><span class="elenco__nome">${o.nome}</span><span class="elenco__cat">${o.cat}</span>`;
  b.addEventListener('click', () => scegli(i));
  elenco.appendChild(b);
});

const carica = (src) => new Promise((ok) => { const im = new Image(); im.onload = im.onerror = () => ok(); im.src = src; });
const supportaWebp = document.createElement('canvas').toDataURL('image/webp').startsWith('data:image/webp');
let attuale = 0;
async function scegli(i) {
  if (i === attuale) return;
  attuale = i;
  const o = OPERE[i];
  $$('.elenco__voce', elenco).forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.i === i)));
  testoOpera.classList.add('is-cambio');
  const est = supportaWebp ? 'webp' : 'jpg';
  await Promise.all([carica(percorso(o.id, 'prima', est)), carica(percorso(o.id, 'dopo', est))]);
  if (attuale !== i) return;
  for (const tipo of ['prima', 'dopo', 'cantiere']) {
    const img = $(`[data-img-${tipo}]`);
    $(`[data-src-${tipo}-webp]`).srcset = percorso(o.id, tipo, 'webp');
    img.src = percorso(o.id, tipo, 'jpg');
  }
  $('[data-img-prima]').alt = `${o.nome} prima dei lavori`;
  $('[data-img-dopo]').alt = `${o.nome} dopo i lavori di CO.G.IM.`;
  $('[data-opera-tipo]').innerHTML = `<span class="opera__cat">${o.cat}</span> ${o.luogo}`;
  $('[data-opera-titolo]').textContent = o.nome;
  $('[data-opera-storia]').textContent = o.storia;
  $('[data-opera-didascalia]').textContent = 'Dal cantiere: ' + o.cantiere;
  testoOpera.classList.remove('is-cambio');
  spazzata();
}

// La prima volta che il confronto entra in vista, la maniglia si muove da sola
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver(([v]) => {
    if (v.isIntersecting) { spazzata(); io.disconnect(); }
  }, { threshold: 0.55 });
  io.observe(confronto);
}
mettiPos(50);

/* ---------- Rivelazioni di "Cosa costruiamo" (si osserva l'articolo, non la foto ritagliata) ---------- */
const daRivelare = $$('[data-rivela]');
if (ridotto || !('IntersectionObserver' in window)) daRivelare.forEach((el) => el.classList.add('in'));
else {
  const io = new IntersectionObserver((voci) => voci.forEach((v) => {
    if (v.isIntersecting) { v.target.classList.add('in'); io.unobserve(v.target); }
  }), { threshold: 0.18, rootMargin: '0px 0px -8% 0px' });
  daRivelare.forEach((el) => io.observe(el));
}

/* ---------- CAPRIATA: progressione legata allo scroll ---------- */
const capriata = $('[data-capriata]');
const passi = $$('[data-capriata-passi] li');
const barraCapriata = $('[data-capriata-barra]');
let progressoCapriata = 0;
const leggiProgresso = () => {
  const r = capriata.getBoundingClientRect();
  const corsa = r.height - innerHeight;
  progressoCapriata = clamp(-r.top / corsa, 0, 1);
  return progressoCapriata;
};
const aggiornaPassi = () => {
  const p = leggiProgresso();
  barraCapriata.style.transform = `scaleX(${p.toFixed(4)})`;
  passi.forEach((li) => li.classList.toggle('is-on', p >= +li.dataset.da && p < +li.dataset.a));
};
addEventListener('scroll', aggiornaPassi, { passive: true });
addEventListener('resize', aggiornaPassi);
aggiornaPassi();

if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver(([v]) => {
    if (!v.isIntersecting) return;
    io.disconnect();
    import('./3d.js')
      .then((m) => m.creaCapriata({ canvas: $('[data-capriata-canvas]'), sezione: capriata, progresso: leggiProgresso, ridotto }))
      .then((ok) => { capriata.classList.add(ok ? 'is-pronta' : 'capriata--ripiego'); })
      .catch(() => capriata.classList.add('capriata--ripiego'));
  }, { rootMargin: '600px 0px' });
  io.observe(capriata);
}

/* Collegamento diretto a una sezione: ?vai=opere (con &p=0.5 dentro le sezioni lunghe) */
const vai = new URLSearchParams(location.search);
if (vai.get('vai')) {
  addEventListener('load', () => {
    const el = document.getElementById(vai.get('vai')) || $(`[data-${vai.get('vai')}]`);
    if (!el) return;
    const p = clamp(parseFloat(vai.get('p') || '0') || 0, 0, 1);
    const top = el.getBoundingClientRect().top + scrollY + (el.offsetHeight - innerHeight) * p;
    scrollTo({ top: Math.max(0, top), behavior: 'instant' });
  });
}

/* ---------- Modulo: compone l'email per info@impresacogim.it ---------- */
const modulo = $('[data-modulo]');
const errore = $('[data-modulo-errore]');
modulo.addEventListener('submit', (e) => {
  e.preventDefault();
  const d = new FormData(modulo);
  const nome = (d.get('nome') || '').trim();
  const tel = (d.get('telefono') || '').trim();
  const campoNome = modulo.elements.nome;
  const campoTel = modulo.elements.telefono;
  campoNome.setAttribute('aria-invalid', String(!nome));
  campoTel.setAttribute('aria-invalid', String(!tel));
  if (!nome || !tel) {
    errore.hidden = false;
    (nome ? campoTel : campoNome).focus();
    return;
  }
  errore.hidden = true;
  const comune = (d.get('comune') || '').trim();
  const righe = [
    'Buongiorno,',
    '',
    `vorrei un sopralluogo per: ${d.get('lavoro')}.`,
    comune ? `L'immobile si trova a: ${comune}.` : '',
    (d.get('descrizione') || '').trim() ? `Descrizione: ${(d.get('descrizione') || '').trim()}` : '',
    '',
    `${nome}`,
    `Telefono: ${tel}`,
  ].filter((r, i, a) => r !== '' || (a[i - 1] !== '' && i > 0));
  const oggetto = `Richiesta sopralluogo: ${d.get('lavoro')}${comune ? ' a ' + comune : ''}`;
  location.href = `mailto:info@impresacogim.it?subject=${encodeURIComponent(oggetto)}&body=${encodeURIComponent(righe.join('\n'))}`;
});
