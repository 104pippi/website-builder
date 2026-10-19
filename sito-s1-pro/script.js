// S1 PRO — comportamenti della pagina
const doc = document.documentElement;
const ridotto = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- Testata e menu ---------- */
const testata = document.querySelector('[data-testata]');
const menuBtn = document.querySelector('[data-menu]');
const menu = document.getElementById('menu');

function chiudiMenu() {
  testata.classList.remove('is-aperta');
  menuBtn.setAttribute('aria-expanded', 'false');
  menuBtn.querySelector('.sr').textContent = 'Apri il menu';
}
menuBtn.addEventListener('click', () => {
  const aperto = testata.classList.toggle('is-aperta');
  menuBtn.setAttribute('aria-expanded', String(aperto));
  menuBtn.querySelector('.sr').textContent = aperto ? 'Chiudi il menu' : 'Apri il menu';
});
menu.addEventListener('click', (e) => { if (e.target.closest('a')) chiudiMenu(); });
addEventListener('keydown', (e) => { if (e.key === 'Escape') chiudiMenu(); });

/* ---------- Link interni: scorrimento morbido solo al clic ---------- */
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;
  const id = a.getAttribute('href');
  const meta = id.length > 1 ? document.querySelector(id) : null;
  if (!meta) return;
  e.preventDefault();
  meta.scrollIntoView({ behavior: ridotto ? 'auto' : 'smooth', block: 'start' });
  history.replaceState(null, '', id);
});

/* ---------- Barra in basso su telefono ---------- */
const barraCta = document.querySelector('[data-barra-cta]');
const contatti = document.getElementById('contatti');
let contattiInVista = false;
let azioniHeroInVista = true;
function aggiornaBarra() {
  barraCta.classList.toggle('is-visibile', !azioniHeroInVista && !contattiInVista);
}
new IntersectionObserver((voci) => {
  contattiInVista = voci[0].isIntersecting;
  aggiornaBarra();
}, { rootMargin: '0px 0px -35% 0px' }).observe(contatti.querySelector('.modulo'));
new IntersectionObserver((voci) => {
  azioniHeroInVista = voci[0].isIntersecting;
  aggiornaBarra();
}).observe(document.querySelector('.hero__azioni'));

/* ---------- Il tampone: avanzamento e passi ---------- */
const tamp = document.querySelector('[data-tampone]');
const passi = [...tamp.querySelectorAll('.passo')];
const stato = { p: 0 };
let ultimoPasso = -1;

function progressoTampone() {
  const r = tamp.getBoundingClientRect();
  const corsa = r.height - innerHeight;
  if (corsa <= 0) return 1;
  return Math.min(1, Math.max(0, -r.top / corsa));
}
function passoDa(p) {
  if (p < 0.05) return 0;
  if (p < 0.27) return 1;
  if (p < 0.47) return 2;
  if (p < 0.63) return 3;
  if (p < 0.81) return 4;
  return 5;
}
function aggiornaTampone() {
  const p = ridotto ? 1 : progressoTampone();
  stato.p = p;
  tamp.style.setProperty('--p', p.toFixed(4));
  const n = passoDa(p);
  if (n !== ultimoPasso) {
    ultimoPasso = n;
    tamp.dataset.passo = String(n);
    const attivo = Math.max(1, n);
    passi.forEach((li, i) => li.classList.toggle('is-attivo', i + 1 === attivo));
  }
}

/* ---------- Scroll: un solo aggiornamento per fotogramma ---------- */
let inCoda = false;
function aCadaScroll() {
  testata.classList.toggle('is-piena', scrollY > 40);
  aggiornaTampone();
  inCoda = false;
}
addEventListener('scroll', () => { if (!inCoda) { inCoda = true; requestAnimationFrame(aCadaScroll); } }, { passive: true });
addEventListener('resize', aCadaScroll);
aCadaScroll();

/* ---------- Scena 3D: arriva dopo la pagina ---------- */
function quandoCaricata(fn) {
  if (document.readyState === 'complete') setTimeout(fn, 120);
  else addEventListener('load', () => setTimeout(fn, 120), { once: true });
}
const osservaTampone = new IntersectionObserver((voci) => {
  if (!voci.some((v) => v.isIntersecting)) return;
  osservaTampone.disconnect();
  quandoCaricata(() => {
    import('./3d.js')
      .then((m) => m.avvia(tamp, stato, { ridotto }))
      .catch(() => { /* senza WebGL resta la foto */ });
  });
}, { rootMargin: '120% 0px' });
osservaTampone.observe(tamp);

/* ---------- Titoli che si mettono a registro ---------- */
const titoli = document.querySelectorAll('[data-registra]');
if (ridotto || !('IntersectionObserver' in window)) {
  titoli.forEach((t) => t.classList.add('in'));
} else {
  const io = new IntersectionObserver((voci) => {
    voci.forEach((v) => { if (v.isIntersecting) { v.target.classList.add('in'); io.unobserve(v.target); } });
  }, { threshold: 0.6 });
  titoli.forEach((t) => io.observe(t));
}

/* ---------- Galleria: colore all'entrata dove manca lo scroll-timeline ---------- */
if (!ridotto && !(window.CSS && CSS.supports('animation-timeline: view()'))) {
  doc.classList.add('senza-sda');
  const io = new IntersectionObserver((voci) => {
    voci.forEach((v) => { if (v.isIntersecting) { v.target.classList.add('is-vivo'); io.unobserve(v.target); } });
  }, { threshold: 0.35 });
  document.querySelectorAll('.pezzo').forEach((p) => io.observe(p));
}

/* ---------- Scelta della tecnica ---------- */
const scelta = document.querySelector('[data-scelta]');
const schede = document.querySelector('.schede');
const esito = document.querySelector('[data-esito]');
const testoEsito = esito.textContent;
scelta.addEventListener('click', (e) => {
  const b = e.target.closest('button[data-filtro]');
  if (!b) return;
  const giaScelto = b.getAttribute('aria-pressed') === 'true';
  scelta.querySelectorAll('button[data-filtro]').forEach((x) => x.setAttribute('aria-pressed', 'false'));
  if (giaScelto) {
    schede.classList.remove('is-filtro');
    schede.querySelectorAll('.scheda').forEach((s) => s.classList.remove('is-adatta'));
    esito.textContent = testoEsito;
    return;
  }
  b.setAttribute('aria-pressed', 'true');
  const f = b.dataset.filtro;
  schede.classList.add('is-filtro');
  schede.querySelectorAll('.scheda').forEach((s) => {
    s.classList.toggle('is-adatta', s.dataset.per.split(' ').includes(f));
  });
  esito.textContent = b.dataset.frase;
});

/* ---------- Modulo: compone la mail ---------- */
const modulo = document.querySelector('[data-modulo]');
const errore = modulo.querySelector('[data-errore]');
modulo.addEventListener('submit', (e) => {
  e.preventDefault();
  const d = Object.fromEntries(new FormData(modulo));
  const mancanti = [];
  if (!d.nome?.trim()) mancanti.push('il nome');
  if (!/^\S+@\S+\.\S+$/.test(d.email || '')) mancanti.push('un indirizzo email valido');
  if (!d.oggetto?.trim()) mancanti.push('cosa vuoi personalizzare');
  if (!d.privacy) mancanti.push('il consenso al trattamento dei dati');
  if (mancanti.length) {
    errore.textContent = 'Per preparare la richiesta manca ' + mancanti.join(', ') + '.';
    const primo = modulo.querySelector(':invalid');
    if (primo) primo.focus();
    return;
  }
  errore.textContent = '';
  const chi = d.azienda?.trim() || d.nome.trim();
  const oggetto = `Richiesta campione: ${chi}`;
  const righe = [
    'Buongiorno,',
    'vorrei un campione per questo lavoro:',
    '',
    d.oggetto.trim(),
    '',
    `Quantità: ${d.quantita}`,
    '',
    `Nome: ${d.nome.trim()}`,
    d.azienda?.trim() ? `Azienda: ${d.azienda.trim()}` : '',
    `Email: ${d.email.trim()}`,
    d.telefono?.trim() ? `Telefono: ${d.telefono.trim()}` : '',
    '',
    'Grazie',
  ].filter((r, i, a) => !(r === '' && a[i - 1] === ''));
  location.href = `mailto:info@s1srl.it?subject=${encodeURIComponent(oggetto)}&body=${encodeURIComponent(righe.join('\n'))}`;
});

/* ---------- Anno nel piede ---------- */
document.querySelectorAll('[data-anno]').forEach((n) => { n.textContent = new Date().getFullYear(); });
