import { leggiTappe, statoTimeline, disegnaDisco, SPAN } from './disco.js';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const ridotto = matchMedia('(prefers-reduced-motion: reduce)').matches;
const html = document.documentElement;

$$('[data-anno-corrente]').forEach((e) => { e.textContent = new Date().getFullYear(); });

/* ---------- menu mobile ---------- */
const btnMenu = $('[data-menu-btn]');
const menu = $('[data-menu]');
function chiudiMenu() {
  menu.hidden = true;
  btnMenu.setAttribute('aria-expanded', 'false');
  html.classList.remove('menu-aperto');
  document.body.style.overflow = '';
}
btnMenu.addEventListener('click', () => {
  if (btnMenu.getAttribute('aria-expanded') === 'true') return chiudiMenu();
  menu.hidden = false;
  btnMenu.setAttribute('aria-expanded', 'true');
  html.classList.add('menu-aperto');
  document.body.style.overflow = 'hidden';
});
$$('a', menu).forEach((a) => a.addEventListener('click', chiudiMenu));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) chiudiMenu(); });

/* ---------- modulo: compone l'email ---------- */
$$('[data-servizio]').forEach((a) => a.addEventListener('click', () => {
  const s = $('[data-campo-servizio]');
  if (s) s.value = a.dataset.servizio;
}));
const modulo = $('[data-modulo]');
modulo.addEventListener('submit', (e) => {
  e.preventDefault();
  const errore = $('[data-errore]');
  const mancano = [];
  $$('[required]', modulo).forEach((campo) => {
    const ok = campo.value.trim() !== '';
    campo.setAttribute('aria-invalid', ok ? 'false' : 'true');
    if (!ok) mancano.push(campo.labels[0].textContent.trim().toLowerCase());
  });
  if (mancano.length) {
    errore.textContent = `Manca ${mancano.join(' e ')}: ci serve per richiamarvi.`;
    errore.hidden = false;
    $('[aria-invalid="true"]', modulo).focus();
    return;
  }
  errore.hidden = true;
  const f = new FormData(modulo);
  const v = (k) => String(f.get(k) || '').trim();
  const righe = [
    `Richiesta: ${v('servizio')}`,
    `Nome: ${v('nome')}`,
    v('azienda') && `Azienda: ${v('azienda')}`,
    `Telefono: ${v('telefono')}`,
    v('mezzo') && `Mezzo o targa: ${v('mezzo')}`,
  ].filter(Boolean);
  if (v('messaggio')) righe.push('', v('messaggio'));
  const oggetto = `${v('servizio')}: richiesta dal sito`;
  window.location.href = `mailto:info@tezcar.it?subject=${encodeURIComponent(oggetto)}&body=${encodeURIComponent(righe.join('\n'))}`;
});

/* ---------- aperto o chiuso adesso (ora di Roma) ---------- */
const FERIALI = { tezcar: [[480, 720], [810, 1110]], bet: [[480, 720], [810, 1080]] };
const SABATO = [[480, 720]];
const GIORNI = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
const hhmm = (m) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
const fasce = (sede, g) => (g === 0 ? [] : g === 6 ? SABATO : FERIALI[sede]);
function oraRoma() {
  try {
    const parti = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Rome', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
    const val = (t) => parti.find((x) => x.type === t).value;
    return { g: { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[val('weekday')], min: +val('hour') * 60 + +val('minute') };
  } catch (e) {
    const d = new Date();
    return { g: d.getDay(), min: d.getHours() * 60 + d.getMinutes() };
  }
}
function stato(sede) {
  const { g, min } = oraRoma();
  for (const [a, b] of fasce(sede, g)) if (min >= a && min < b) return { aperto: true, testo: `Aperto ora, chiude alle ${hhmm(b)}` };
  for (const [a] of fasce(sede, g)) if (min < a) return { aperto: false, testo: `Chiuso ora, riapre alle ${hhmm(a)}` };
  for (let d = 1; d <= 7; d++) {
    const gg = (g + d) % 7;
    const f = fasce(sede, gg);
    if (f.length) return { aperto: false, testo: `Chiuso ora, riapre ${d === 1 ? 'domani' : GIORNI[gg]} alle ${hhmm(f[0][0])}` };
  }
  return { aperto: false, testo: '' };
}
function aggiornaStati() {
  ['tezcar', 'bet'].forEach((sede) => {
    const s = stato(sede);
    $$(`[data-stato-sede="${sede}"]`).forEach((e) => { e.textContent = s.testo; });
    $$(`[data-stato-pallino="${sede}"]`).forEach((e) => { e.classList.toggle('aperto', s.aperto); e.classList.toggle('chiuso', !s.aperto); });
  });
  const s = stato('tezcar');
  $('[data-stato="tezcar"]').textContent = s.testo;
  const p = $('.hero-orari [data-stato-pallino]');
  p.classList.toggle('aperto', s.aperto);
  p.classList.toggle('chiuso', !s.aperto);
}
aggiornaStati();
setInterval(aggiornaStati, 60000);

/* ---------- hero: il laser dell'allineamento scopre la foto ---------- */
const hero = $('[data-hero]');
const zoom = $('[data-hero-zoom]');
const mira = $('[data-mira]');
const fotoHero = $('.hero-img--colore');
const parole = $$('.parola > span', hero);
const entra = $$('[data-entra]', hero);
const PINZA = { x: 0.54, y: 0.41 }; // pomello della pinza rossa nella foto

const fuori3 = (t) => 1 - Math.pow(1 - t, 3);
const fuoriExpo = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
const dentroFuori = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const tratto = (t, a, d) => Math.min(1, Math.max(0, (t - a) / d));

let introFatta = ridotto;
let t0 = null;
let inizioScan = null;
const fotoPronta = new Promise((ok) => {
  if (fotoHero.complete && fotoHero.naturalWidth) return ok();
  fotoHero.addEventListener('load', ok, { once: true });
  fotoHero.addEventListener('error', ok, { once: true });
  setTimeout(ok, 1400);
});
fotoPronta.then(() => { posizionaMira(); inizioScan = t0 === null ? 0.15 : Math.max(0.15, (performance.now() - t0) / 1000); });

function passoIntro(ora) {
  if (t0 === null) t0 = ora;
  const t = (ora - t0) / 1000;
  parole.forEach((el, i) => {
    const k = fuoriExpo(tratto(t, 0.25 + i * 0.065, 0.85));
    el.style.transform = k >= 1 ? 'none' : `translateY(${((1 - k) * 108).toFixed(2)}%)`;
  });
  entra.forEach((el, i) => {
    const k = fuori3(tratto(t, 0.8 + i * 0.1, 0.7));
    el.style.opacity = k.toFixed(3);
    el.style.transform = k >= 1 ? 'none' : `translateY(${((1 - k) * 14).toFixed(2)}px)`;
  });
  if (inizioScan === null) return;
  const ts = t - inizioScan;
  hero.style.setProperty('--scan', dentroFuori(tratto(ts, 0, 1.25)).toFixed(4));
  hero.style.setProperty('--laser', (tratto(ts, -0.05, 0.12) * (1 - tratto(ts, 1.22, 0.35))).toFixed(3));
  hero.style.setProperty('--zoom', (1.1 - 0.1 * fuori3(tratto(ts, -0.15, 2.6))).toFixed(4));
  hero.style.setProperty('--mira', fuori3(tratto(ts, 1.15, 0.65)).toFixed(3));
  if (ts > 2.5 && t > 2.2) introFatta = true;
}

function posizionaMira() {
  const W = zoom.clientWidth, H = zoom.clientHeight;
  const w0 = fotoHero.naturalWidth || 1400, h0 = fotoHero.naturalHeight || 1045;
  const s = Math.max(W / w0, H / h0);
  const dw = w0 * s, dh = h0 * s;
  const [ox, oy] = getComputedStyle(fotoHero).objectPosition.split(' ').map((v) => parseFloat(v) / 100);
  const x = (W - dw) * (isNaN(ox) ? 0.5 : ox) + PINZA.x * dw;
  const y = (H - dh) * (isNaN(oy) ? 0.5 : oy) + PINZA.y * dh;
  mira.style.setProperty('--mx', `${x.toFixed(1)}px`);
  mira.style.setProperty('--my', `${y.toFixed(1)}px`);
}
posizionaMira();
addEventListener('resize', posizionaMira, { passive: true });

/* ---------- foto che si scoprono ---------- */
const svela = new IntersectionObserver((voci) => voci.forEach((v) => {
  if (v.isIntersecting) { v.target.classList.add('svelato'); svela.unobserve(v.target); }
}), { threshold: 0.22, rootMargin: '0px 0px -6% 0px' });
$$('[data-svela]').forEach((el) => (ridotto ? el.classList.add('svelato') : svela.observe(el)));

/* ---------- storia: il disco ---------- */
const storia = $('[data-storia]');
const tappe = leggiTappe($('[data-elenco]'));
const scenaEl = $('[data-scena]');
const annoEl = $('[data-anno]');
const testiEl = $('[data-tappe-testo]');
const taccheEl = $('[data-tacche]');
const memoria = $('[data-memoria]');
let memoriaPrima = -1;
const statoDisco = { p: 0, e: 0, fermo: false };
let disco2d = null;

if (!ridotto) {
  storia.style.setProperty('--tappe', tappe.length);
  storia.classList.add('vivo');
  tappe.forEach((T) => {
    const p = document.createElement('p');
    p.innerHTML = T.testo;
    testiEl.appendChild(p);
    const li = document.createElement('li');
    li.textContent = T.etichetta;
    taccheEl.appendChild(li);
  });
}

let caricato = false;
function ripiego2d() {
  if (disco2d) return;
  const c = document.createElement('canvas');
  c.width = c.height = 1024;
  c.className = 'disco-2d';
  disegnaDisco(c, tappe);
  document.fonts.ready.then(() => disegnaDisco(c, tappe));
  scenaEl.appendChild(c);
  disco2d = c;
}
function carica3d() {
  if (caricato || ridotto) return;
  caricato = true;
  import('./3d.js')
    .then((m) => m.avvia({ contenitore: scenaEl, tappe, stato: statoDisco }))
    .then((ok) => { if (!ok) ripiego2d(); })
    .catch(() => ripiego2d());
}
if (!ridotto) {
  new IntersectionObserver(([v]) => { if (v.isIntersecting) carica3d(); }, { rootMargin: '150% 0px' }).observe(storia);
  if (document.readyState === 'complete') setTimeout(carica3d, 1500);
  else addEventListener('load', () => setTimeout(carica3d, 1500), { once: true });
}

let kPrima = -1, annoPrima = -1;
function aggiornaStoria(vh) {
  const r = storia.getBoundingClientRect();
  statoDisco.p = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - vh)));
  statoDisco.e = Math.min(1, Math.max(0, 1 - r.top / vh));
  if (r.bottom < 0 || r.top > vh) return;
  const st = statoTimeline(statoDisco.p, tappe);
  const anno = Math.floor(st.anno + 0.0001);
  if (anno !== annoPrima) { annoEl.textContent = anno; annoPrima = anno; }
  if (st.k !== kPrima) {
    [...testiEl.children].forEach((el, i) => el.classList.toggle('attiva', i === st.k));
    [...taccheEl.children].forEach((el, i) => { el.classList.toggle('attiva', i === st.k); el.classList.toggle('fatta', i < st.k); });
    kPrima = st.k;
  }
  if (disco2d) disco2d.style.setProperty('--giro', `${(-statoDisco.p * SPAN).toFixed(4)}rad`);
  // la foto del gruppo storico resta solo nei primi anni
  const m = Math.round(statoDisco.e * Math.max(0, 1 - statoDisco.p / 0.28) * 26) / 100;
  if (m !== memoriaPrima) { memoria.style.opacity = m; memoriaPrima = m; }
}

/* ---------- ciclo unico: testata, barra, parallasse, storia ---------- */
const testata = $('[data-top]');
const barra = $('[data-barra]');
const strisce = $('.mobile-strisce');
const scure = $$('[data-scuro]');
let yPrima = -1;
let solido = null, su = null, scuro = null;

function ciclo(ora) {
  if (!introFatta) passoIntro(ora);
  const y = window.scrollY;
  const vh = window.innerHeight;
  if (y !== yPrima) {
    const s = y > 24;
    if (s !== solido) { testata.classList.toggle('solido', s); solido = s; }
    const meta = testata.offsetHeight / 2;
    const sc = scure.some((el) => { const r = el.getBoundingClientRect(); return r.top <= meta && r.bottom >= meta; });
    if (sc !== scuro) { testata.classList.toggle('scuro', sc); scuro = sc; }
    const b = y > hero.offsetHeight * 0.55;
    if (b !== su) { barra.classList.toggle('su', b); su = b; }
    if (!ridotto && y < hero.offsetHeight) zoom.style.setProperty('--hy', `${(y * 0.28).toFixed(1)}px`);
    if (!ridotto && strisce) strisce.style.setProperty('--sx', `${(y * 0.35).toFixed(1)}px`);
    yPrima = y;
  }
  if (!ridotto) aggiornaStoria(vh);
  requestAnimationFrame(ciclo);
}
requestAnimationFrame(ciclo);
