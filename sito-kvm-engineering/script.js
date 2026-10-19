// KVM Engineering — testata, menu, flower pattern dei servizi, nastri dei progetti, lente, modulo e scena 3D
import { sezione, angoli } from './profilo.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const ridotto = matchMedia('(prefers-reduced-motion: reduce)').matches;
const desktop = matchMedia('(min-width: 900px)');
const NS = 'http://www.w3.org/2000/svg';

$('#anno').textContent = new Date().getFullYear();

// ---------- profili in SVG: sezioni del nastro, una per stazione (il "flower pattern")
const SCALA = 180;
const tracciato = p => sezione(p, 32).map(([x, y], i) => `${i ? 'L' : 'M'}${(x * SCALA).toFixed(1)} ${(-y * SCALA).toFixed(1)}`).join('');
function percorso(svg, d, classe, extra = {}) {
  const el = document.createElementNS(NS, 'path');
  el.setAttribute('d', d);
  if (classe) el.setAttribute('class', classe);
  for (const [k, v] of Object.entries(extra)) el.setAttribute(k, v);
  svg.appendChild(el);
  return el;
}
const TAPPE = 8;

const heroFiore = $('#hero-fiore');
percorso(heroFiore, 'M0 30V-125', 'asse');
for (let k = 0; k <= TAPPE; k++) percorso(heroFiore, tracciato(k / TAPPE), '', { pathLength: 1, style: `--i:${k}` });

const fioreSvg = $('#fiore-svg');
percorso(fioreSvg, 'M0 22V-98', 'asse');
const tappe = [];
for (let k = 0; k <= TAPPE; k++) tappe.push(percorso(fioreSvg, tracciato(k / TAPPE), 'tappa'));
const profiloOra = percorso(fioreSvg, tracciato(0), 'ora');
const fStazione = $('#fiore-stazione'), fAngolo = $('#fiore-angolo');
const stazioni = $$('.stazione');
let pFiore = -1;

function aggiornaFiore() {
  const linea = innerHeight * 0.45;
  let f = 0;
  stazioni.forEach((st, i) => {
    const r = st.getBoundingClientRect();
    if (r.top <= linea) f = i + Math.min(1, (linea - r.top) / r.height);
  });
  const p = Math.min(1, f / stazioni.length);
  const attiva = Math.min(stazioni.length, Math.floor(f) + 1);
  stazioni.forEach((st, i) => st.classList.toggle('attiva', i + 1 === attiva && f > 0));
  if (Math.abs(p - pFiore) < 0.002) return;
  pFiore = p;
  profiloOra.setAttribute('d', tracciato(p));
  tappe.forEach((t, k) => t.classList.toggle('fatta', k / TAPPE <= p + 0.001));
  const [a1, a2] = angoli(p).map(a => Math.round(a * 180 / Math.PI));
  fStazione.textContent = `Stazione ${attiva} di ${stazioni.length}`;
  fAngolo.textContent = a2 > 0 ? `Ali a ${a1}°, risvolti a ${a2}°` : `Ali a ${a1}°`;
}

// ---------- testata, barra in basso e menu
const testata = $('#testata'), hero = $('.hero'), barra = $('#barra');
let contattiInVista = false;
new IntersectionObserver(([e]) => { contattiInVista = e.isIntersecting; aggiornaBarra(); }, { rootMargin: '0px 0px -30% 0px' })
  .observe($('#contatti'));
function aggiornaBarra() {
  barra.classList.toggle('vista', scrollY > hero.offsetHeight * 0.55 && !contattiInVista);
}

const bottoneMenu = $('.testata-menu'), menu = $('#menu-mobile');
function apriMenu(apri) {
  menu.hidden = !apri;
  bottoneMenu.setAttribute('aria-expanded', String(apri));
  bottoneMenu.querySelector('.vh').textContent = apri ? 'Chiudi il menu' : 'Apri il menu';
  document.documentElement.style.overflow = apri ? 'hidden' : '';
  testata.classList.toggle('piena', apri || scrollY > 30);
}
bottoneMenu.addEventListener('click', () => apriMenu(menu.hidden));
menu.addEventListener('click', e => { if (e.target.closest('a')) apriMenu(false); });
addEventListener('keydown', e => { if (e.key === 'Escape' && !menu.hidden) apriMenu(false); });

// ---------- nastri dei progetti (desktop: scorrono in versi opposti con lo scroll)
const nastri = $$('.nastro').map(n => ({ el: n, lista: $('.nastro-lista', n), verso: Number(n.dataset.verso) }));
function aggiornaNastri() {
  for (const n of nastri) {
    if (!desktop.matches || ridotto) { n.lista.style.transform = ''; continue; }
    const r = n.el.getBoundingClientRect();
    if (r.bottom < -200 || r.top > innerHeight + 200) continue;
    const corsa = Math.max(0, n.lista.scrollWidth - document.documentElement.clientWidth);
    const t = Math.min(1, Math.max(0, (innerHeight - r.top) / (innerHeight + r.height)));
    const x = n.verso < 0 ? -corsa * t : -corsa * (1 - t);
    n.lista.style.transform = `translate3d(${x.toFixed(1)}px,0,0)`;
  }
}

// ---------- foto di chi siamo: parallasse leggera dentro la cornice
const fotoChi = $('.chi-foto img');
function aggiornaFotoChi() {
  if (ridotto) return;
  const r = fotoChi.parentElement.getBoundingClientRect();
  if (r.bottom < 0 || r.top > innerHeight) return;
  const d = (r.top + r.height / 2 - innerHeight / 2) / innerHeight;
  fotoChi.style.setProperty('--sposta', `${(d * -36).toFixed(1)}px`);
}

// ---------- un solo giro per frame per tutto quello che dipende dallo scroll
let inCoda = false;
function suScroll() {
  if (inCoda) return;
  inCoda = true;
  requestAnimationFrame(() => {
    inCoda = false;
    if (menu.hidden) testata.classList.toggle('piena', scrollY > 30);
    aggiornaBarra();
    aggiornaFiore();
    aggiornaNastri();
    aggiornaFotoChi();
  });
}
addEventListener('scroll', suScroll, { passive: true });
addEventListener('resize', suScroll);
suScroll();

// ---------- comparse
const daRivelare = $$('.sez-testa, .stazione > div, .nastro-etichetta, .chi-testo, .contatti-info, .modulo, .servizi-chiusa');
daRivelare.forEach(el => el.setAttribute('data-rivela', ''));
const osservatore = new IntersectionObserver(voci => {
  for (const v of voci) if (v.isIntersecting) { v.target.classList.add('in'); osservatore.unobserve(v.target); }
}, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
daRivelare.forEach(el => osservatore.observe(el));

// ---------- lente sulle foto dei progetti
const lente = $('#lente'), lenteImg = $('#lente-img'), lenteDid = $('#lente-did');
const foto = $$('.foto');
let corrente = 0;
function mostra(n) {
  corrente = (n + foto.length) % foto.length;
  const img = $('img', foto[corrente]);
  lenteImg.src = img.currentSrc || img.src;
  lenteImg.alt = img.alt;
  lenteDid.textContent = $('.foto-did', foto[corrente]).textContent;
}
foto.forEach((f, i) => f.addEventListener('click', () => { mostra(i); lente.showModal(); }));
lente.addEventListener('click', e => {
  const b = e.target.closest('[data-lente]');
  if (b) { b.dataset.lente === 'chiudi' ? lente.close() : mostra(corrente + Number(b.dataset.lente)); return; }
  if (e.target === lente) lente.close();
});
lente.addEventListener('keydown', e => {
  if (e.key === 'ArrowRight') mostra(corrente + 1);
  if (e.key === 'ArrowLeft') mostra(corrente - 1);
});

// ---------- modulo: compone l'email per info@kvm-engineering.com
const modulo = $('#modulo'), errore = $('#modulo-errore'), ok = $('#modulo-ok');
modulo.addEventListener('submit', e => {
  e.preventDefault();
  const d = new FormData(modulo);
  const v = k => String(d.get(k) || '').trim();
  const nome = v('nome'), azienda = v('azienda'), email = v('email'), tel = v('telefono'), progetto = v('progetto');
  const servizi = d.getAll('servizio');
  const manca = [];
  if (!nome) manca.push(['m-nome', 'Scrivi nome e cognome.']);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) manca.push(['m-email', 'Scrivi un indirizzo email valido: ti rispondiamo lì.']);
  if (progetto.length < 10) manca.push(['m-progetto', 'Descrivi il progetto in qualche riga.']);
  $$('[aria-invalid]', modulo).forEach(el => el.removeAttribute('aria-invalid'));
  if (manca.length) {
    manca.forEach(([id]) => $('#' + id).setAttribute('aria-invalid', 'true'));
    errore.textContent = manca.map(m => m[1]).join(' ');
    errore.hidden = false;
    ok.hidden = true;
    $('#' + manca[0][0]).focus();
    return;
  }
  errore.hidden = true;
  const oggetto = ['Richiesta progetto', azienda, servizi.join(', ')].filter(Boolean).join(' – ');
  const corpo = [
    'Buongiorno,', '', progetto, '',
    servizi.length ? `Servizi di interesse: ${servizi.join(', ')}` : '',
    `Nome: ${nome}`, azienda ? `Azienda: ${azienda}` : '', `Email: ${email}`, tel ? `Telefono: ${tel}` : '',
  ].filter((r, i, a) => r !== '' || (i < 4)).join('\n');
  location.href = `mailto:info@kvm-engineering.com?subject=${encodeURIComponent(oggetto)}&body=${encodeURIComponent(corpo)}`;
  ok.hidden = false;
});

// ---------- scena 3D: arriva dopo la pagina, in dissolvenza
const tela = $('#linea-3d');
function carica3d() {
  import('./3d.js')
    .then(m => { if (!m.avvia(tela, hero)) hero.classList.add('senza-3d'); })
    .catch(() => hero.classList.add('senza-3d'));
}
if (document.readyState === 'complete') setTimeout(carica3d, 50);
else addEventListener('load', () => setTimeout(carica3d, 50), { once: true });
