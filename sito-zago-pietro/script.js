const html = document.documentElement;
const ridotto = matchMedia('(prefers-reduced-motion: reduce)').matches;
if (ridotto) html.classList.add('statico');

/* testata, barra mobile e avanzamento delle fasi allo scroll */
const testata = document.getElementById('testata');
const barra = document.querySelector('.barra-mobile');
const hero = document.getElementById('hero');
const pista = document.querySelector('.processo-pista');
const fasi = [...document.querySelectorAll('.fase')];
const barraFasi = document.querySelector('.processo-barra');
export const SOGLIE = [0, 0.15, 0.33, 0.5, 0.64, 0.8];
let faseAttiva = 0;

function aggiornaFasi() {
  if (!pista || html.classList.contains('statico')) return;
  const r = pista.getBoundingClientRect();
  const corsa = Math.max(1, r.height - innerHeight);
  const p = Math.min(1, Math.max(0, -r.top / corsa));
  barraFasi.style.setProperty('--p', p.toFixed(4));
  let f = 0;
  SOGLIE.forEach((s, i) => { if (p >= s) f = i; });
  if (f !== faseAttiva) {
    fasi.forEach((el, i) => el.classList.toggle('attiva', i === f));
    faseAttiva = f;
  }
}

function suScroll() {
  const y = scrollY;
  testata.classList.toggle('scorsa', y > 8);
  barra.classList.toggle('vista', y > hero.offsetHeight * 0.5);
  aggiornaFasi();
}
addEventListener('scroll', suScroll, { passive: true });
addEventListener('resize', suScroll);
suScroll();

/* menu mobile */
const burger = document.querySelector('.burger');
const menuMobile = document.getElementById('menu-mobile');
function apriMenu(apri) {
  burger.setAttribute('aria-expanded', String(apri));
  menuMobile.hidden = !apri;
  document.body.style.overflow = apri ? 'hidden' : '';
}
burger.addEventListener('click', () => apriMenu(burger.getAttribute('aria-expanded') !== 'true'));
menuMobile.addEventListener('click', (e) => { if (e.target.closest('a')) apriMenu(false); });
addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menuMobile.hidden) { apriMenu(false); burger.focus(); } });

/* contatori: il punto delle migliaia va messo a mano (it-IT non lo mette sotto i 10.000) */
const conPunti = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const ioConta = new IntersectionObserver((voci) => {
  for (const v of voci) {
    if (!v.isIntersecting) continue;
    ioConta.unobserve(v.target);
    if (ridotto) continue;
    const el = v.target, fine = Number(el.dataset.conta), t0 = performance.now(), durata = 1700;
    const passo = () => {
      const k = Math.min(1, (performance.now() - t0) / durata);
      el.textContent = conPunti(fine * (1 - Math.pow(1 - k, 4)));
      if (k < 1) requestAnimationFrame(passo);
    };
    passo();
  }
}, { threshold: 0.6 });
document.querySelectorAll('[data-conta]').forEach((el) => ioConta.observe(el));

/* la moneta di scala sulle foto dei prodotti (si osserva la figura, non l'anello) */
const ioScala = new IntersectionObserver((voci) => {
  for (const v of voci) if (v.isIntersecting) { v.target.classList.add('in'); ioScala.unobserve(v.target); }
}, { threshold: 0.55 });
document.querySelectorAll('.prodotto-foto').forEach((el) => ioScala.observe(el));

/* modulo: compone l'email di richiesta (nessun server) */
const modulo = document.getElementById('modulo');
modulo.addEventListener('submit', (e) => {
  e.preventDefault();
  const d = new FormData(modulo);
  const v = (k) => String(d.get(k) || '').trim();
  const nome = v('nome'), email = v('email');
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const campoNome = modulo.querySelector('#f-nome'), campoEmail = modulo.querySelector('#f-email');
  campoNome.setAttribute('aria-invalid', String(!nome));
  campoEmail.setAttribute('aria-invalid', String(!emailOk));
  const errore = modulo.querySelector('.modulo-errore');
  if (!nome || !emailOk) {
    errore.hidden = false;
    (nome ? campoEmail : campoNome).focus();
    return;
  }
  errore.hidden = true;
  const righe = [
    'Buongiorno,',
    '',
    'vorrei ricevere un preventivo per:',
    `- Tipo di pezzo: ${v('tipo')}`,
    `- Materiale: ${v('materiale')}`,
  ];
  if (v('diametro')) righe.push(`- Diametro: ${v('diametro')} mm`);
  if (v('quantita')) righe.push(`- Quantità: ${v('quantita')}`);
  if (v('messaggio')) righe.push('', v('messaggio'));
  righe.push('', 'Grazie,', nome);
  if (v('azienda')) righe.push(v('azienda'));
  if (v('telefono')) righe.push(`Tel. ${v('telefono')}`);
  righe.push(email);
  const oggetto = `Richiesta preventivo: ${v('tipo')}`;
  location.href = `mailto:info@zagopietro.com?subject=${encodeURIComponent(oggetto)}&body=${encodeURIComponent(righe.join('\n'))}`;
});

document.getElementById('anno').textContent = new Date().getFullYear();

/* il 3D arriva dopo la pagina */
const avvia3d = () => import('./3d.js').catch((err) => {
  console.warn('Scena 3D non disponibile:', err);
  html.classList.add('statico');
});
if (document.readyState === 'complete') avvia3d();
else addEventListener('load', avvia3d, { once: true });
