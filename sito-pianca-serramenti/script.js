// Pianca Serramenti: intro, menu, reveal, oggetti dei prodotti, anatomia, galleria, modulo
const html = document.documentElement;
const ridotto = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

$('#anno').textContent = new Date().getFullYear();

/* ---------- intro dell'hero: parte quando la foto del vano è pronta ---------- */
const fotoVano = $('.vano__foto');
let avviata = false;
function avvia() {
  if (avviata) return;
  avviata = true;
  requestAnimationFrame(() => requestAnimationFrame(() => html.classList.add('avvio')));
}
if (fotoVano.complete) avvia();
else {
  fotoVano.addEventListener('load', avvia, { once: true });
  fotoVano.addEventListener('error', avvia, { once: true });
}
setTimeout(avvia, 1200);

/* ---------- testata e barra mobile ---------- */
const testata = $('#testata');
const barra = $('#barra');
let ctaHeroVisibile = true, preventivoVisibile = false;
function aggiornaBarra() {
  barra.classList.toggle('visibile', !ctaHeroVisibile && !preventivoVisibile);
}
new IntersectionObserver(([e]) => { ctaHeroVisibile = e.isIntersecting; aggiornaBarra(); }).observe($('.hero__azioni'));
new IntersectionObserver(([e]) => { preventivoVisibile = e.isIntersecting; aggiornaBarra(); }, { threshold: .15 }).observe($('#modulo'));

/* ---------- menu mobile ---------- */
const menuBtn = $('.menu-btn');
const menuMobile = $('#menu-mobile');
function menu(apri) {
  menuMobile.hidden = !apri;
  menuBtn.setAttribute('aria-expanded', String(apri));
  $('.menu-btn__testo').textContent = apri ? 'Chiudi' : 'Menu';
  document.body.style.overflow = apri ? 'hidden' : '';
  testata.classList.toggle('solida', apri || scrollY > 30);
}
menuBtn.addEventListener('click', () => menu(menuMobile.hidden));
$$('a', menuMobile).forEach(a => a.addEventListener('click', () => menu(false)));
addEventListener('keydown', e => { if (e.key === 'Escape' && !menuMobile.hidden) { menu(false); menuBtn.focus(); } });

/* ---------- reveal: titoli che scorrono e tapparelle che salgono ---------- */
function osservaUnaVolta(soglia, margine) {
  const io = new IntersectionObserver(voci => {
    voci.forEach(v => { if (v.isIntersecting) { v.target.classList.add('in'); io.unobserve(v.target); } });
  }, { threshold: soglia, rootMargin: margine });
  return io;
}
const rivelaTitoli = osservaUnaVolta(.2, '0px 0px -6% 0px');
$$('.titolo-sez').forEach(el => rivelaTitoli.observe(el));
// le tapparelle partono appena la foto si affaccia, così non resta mai un riquadro vuoto
const rivelaFoto = osservaUnaVolta(.04, '0px');
$$('.foto').forEach(el => rivelaFoto.observe(el));

/* ---------- oggetti dei prodotti: fanno il loro movimento quando li vedi o li tocchi ---------- */
const oggetti = $$('.oggetto');
const guarda = new IntersectionObserver(voci => {
  voci.forEach(v => {
    if (!v.isIntersecting) return;
    guarda.unobserve(v.target);
    setTimeout(() => v.target.classList.add('attivo'), ridotto ? 0 : 280);
  });
}, { threshold: .7 });
oggetti.forEach(o => {
  guarda.observe(o);
  o.addEventListener('click', () => { guarda.unobserve(o); o.classList.toggle('attivo'); });
});

/* ---------- anatomia: stato condiviso con la scena 3D ---------- */
const pista = $('#anatomia-pista');
const passi = $$('#anatomia-passi li');
const barraAnat = $('#anatomia-barra');
const interruttore = $('.interruttore');
const bottoniMat = $$('button', interruttore);
const statoAnat = { p: 0, passo: 0, alu: false, scelta: 'legno' };

function cursore() {
  const attivo = bottoniMat.find(b => b.getAttribute('aria-pressed') === 'true');
  interruttore.style.setProperty('--cw', attivo.offsetWidth + 'px');
  interruttore.style.setProperty('--cx', attivo.offsetLeft + 'px');
}
function materiale(mat) {
  statoAnat.alu = mat === 'alu';
  bottoniMat.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mat === mat)));
  cursore();
}
bottoniMat.forEach(b => b.addEventListener('click', () => { statoAnat.scelta = b.dataset.mat; materiale(b.dataset.mat); }));
if (document.fonts) document.fonts.ready.then(cursore);
cursore();

function aggiornaAnatomia() {
  if (html.classList.contains('no3d')) return;
  const r = pista.getBoundingClientRect();
  const corsa = Math.max(1, r.height - innerHeight);
  const p = clamp(-r.top / corsa);
  const passo = Math.min(passi.length - 1, Math.floor(p * passi.length));
  statoAnat.p = p;
  if (passo !== statoAnat.passo || !passi[passo].classList.contains('attivo')) {
    passi.forEach((li, i) => li.classList.toggle('attivo', i === passo));
    // l'ultimo passo mostra il legno-alluminio; tornando indietro torna la scelta fatta
    if (passo === passi.length - 1) materiale('alu');
    else if (statoAnat.passo === passi.length - 1) materiale(statoAnat.scelta);
    statoAnat.passo = passo;
  }
  barraAnat.style.setProperty('--p', p.toFixed(4));
}

/* ---------- filo del metodo ---------- */
const listaPassi = $('#passi');
const filo = $('#passi-filo');
function aggiornaFilo() {
  const r = listaPassi.getBoundingClientRect();
  filo.style.setProperty('--p', clamp((innerHeight * .72 - r.top) / r.height).toFixed(4));
}

/* ---------- scroll: un solo giro per fotogramma ---------- */
let inCoda = false;
function suScroll() {
  if (inCoda) return;
  inCoda = true;
  requestAnimationFrame(() => {
    inCoda = false;
    if (menuMobile.hidden) testata.classList.toggle('solida', scrollY > 30);
    aggiornaAnatomia();
    aggiornaFilo();
  });
}
addEventListener('scroll', suScroll, { passive: true });

// aggancio per il video di presentazione: lo chiama il registratore prima di ogni fotogramma, così stato dello
// scroll e scene 3D sono quelli dell'istante esatto (il suo orologio finto chiama rAF ogni 16 ms, non 16,67)
window.__fotogramma = () => {
  aggiornaAnatomia();
  aggiornaFilo();
  (window.__scene3d || []).forEach(f => f());
};
addEventListener('resize', () => { cursore(); suScroll(); });
suScroll();

/* ---------- galleria: foto grande ---------- */
const lightbox = $('#lightbox');
const lbImg = $('#lightbox-img');
$$('.foto button').forEach(b => b.addEventListener('click', () => {
  const img = $('img', b);
  lbImg.src = b.dataset.grande;
  lbImg.alt = img.alt;
  $('#lightbox-testo').textContent = $('p', b.parentElement).textContent;
  lightbox.showModal();
}));
$('#lightbox-chiudi').addEventListener('click', () => lightbox.close());
lightbox.addEventListener('click', e => { if (e.target === lightbox) lightbox.close(); });

/* ---------- modulo: compone l'email pronta da inviare ---------- */
const modulo = $('#modulo');
const errore = $('#modulo-errore');
modulo.addEventListener('submit', e => {
  e.preventDefault();
  const d = new FormData(modulo);
  const nome = (d.get('nome') || '').trim();
  const tel = (d.get('telefono') || '').trim();
  if (!nome || tel.replace(/\D/g, '').length < 6) {
    errore.textContent = !nome ? 'Scrivi il tuo nome, così sappiamo chi richiamare.' : 'Scrivi un numero di telefono valido, così possiamo richiamarti.';
    errore.hidden = false;
    modulo.querySelector(!nome ? '[name=nome]' : '[name=telefono]').focus();
    return;
  }
  errore.hidden = true;
  const cosa = d.getAll('cosa');
  const righe = [
    'Buongiorno, vorrei un preventivo.',
    '',
    `Cosa mi serve: ${cosa.length ? cosa.join(', ') : 'da definire'}`,
    `Lavoro: ${d.get('lavoro') || 'da definire'}`,
    `Comune del cantiere: ${(d.get('comune') || '').trim() || 'da definire'}`,
    '',
    (d.get('messaggio') || '').trim(),
    '',
    `${nome}`,
    `Tel. ${tel}`
  ].filter((r, i, a) => !(r === '' && a[i - 1] === ''));
  const oggetto = `Richiesta preventivo: ${cosa.length ? cosa.join(', ') : 'serramenti'}`;
  location.href = `mailto:info@piancaserramenti.it?subject=${encodeURIComponent(oggetto)}&body=${encodeURIComponent(righe.join('\n'))}`;
});

/* ---------- 3D: arriva dopo la pagina, solo se il WebGL c'è ---------- */
function webglOk() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch (err) { return false; }
}
function senza3d() {
  html.classList.add('no3d');
  passi.forEach(li => li.classList.add('attivo'));
}
async function carica3d() {
  if (!webglOk()) { senza3d(); return; }
  let modulo3d;
  try { modulo3d = await import('./3d.js'); }
  catch (err) { console.warn('3D non disponibile', err); senza3d(); return; }

  try {
    modulo3d.avviaHero({ hero: $('.hero'), vano: $('#vano'), canvas: $('#hero-3d') });
  } catch (err) { console.warn('Hero 3D non avviato', err); }

  const palco = $('#anatomia-palco');
  const vicino = new IntersectionObserver(([v]) => {
    if (!v.isIntersecting) return;
    vicino.disconnect();
    try { modulo3d.avviaAnatomia({ palco, canvas: $('#anatomia-3d'), stato: statoAnat }); }
    catch (err) { console.warn('Anatomia 3D non avviata', err); senza3d(); }
  }, { rootMargin: '900px 0px' });
  vicino.observe(pista);
}
if (document.readyState === 'complete') carica3d();
else addEventListener('load', carica3d, { once: true });
