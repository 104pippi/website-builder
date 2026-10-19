// DOXON — testata, barra mobile, animazioni legate allo scroll, modulo preventivo, scena 3D
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const riduci = matchMedia('(prefers-reduced-motion: reduce)').matches;

const testata = $('#testata');
const barra = $('#barra');
const hero = $('.hero');
const scorrevoli = $$('[data-scorri]');

// ---------- Scroll: testata, barra, progressi ----------
let inCoda = false;
function aggiorna() {
  inCoda = false;
  const y = scrollY;
  const vh = innerHeight;
  testata.classList.toggle('scorsa', y > 24);
  barra.classList.toggle('su', y > hero.offsetHeight * 0.7);
  if (riduci) return;
  for (const el of scorrevoli) {
    const r = el.getBoundingClientRect();
    if (r.bottom < -vh || r.top > vh * 2) continue;
    // 0 quando l'elemento entra dal basso, 1 quando è a un terzo dello schermo
    const p = Math.min(1, Math.max(0, (vh * 0.98 - r.top) / (vh * 0.62)));
    el.style.setProperty('--p', p.toFixed(3));
  }
}
function suScroll() { if (!inCoda) { inCoda = true; requestAnimationFrame(aggiorna); } }
addEventListener('scroll', suScroll, { passive: true });
addEventListener('resize', suScroll);
aggiorna();

// ---------- Calendario hotel: le notti libere si accendono ----------
const calendario = $('.calendario');
if (calendario) {
  if (riduci || !('IntersectionObserver' in window)) calendario.classList.add('in');
  else {
    const io = new IntersectionObserver((voci) => {
      voci.forEach((v) => { if (v.isIntersecting) { calendario.classList.add('in'); io.disconnect(); } });
    }, { threshold: 0.45 });
    io.observe(calendario);
  }
}

// ---------- Modulo: i bottoni dei servizi preselezionano il mezzo ----------
const modulo = $('#modulo');
$$('[data-mezzo]').forEach((a) => a.addEventListener('click', () => {
  const v = a.dataset.mezzo;
  $$('input[name="mezzo"]', modulo).forEach((c) => {
    if (v === 'Auto') c.checked = c.value === 'Auto' || c.value === 'Furgone' ? true : c.checked;
    else if (c.value === v) c.checked = true;
  });
  if (v === 'Formula hotel') $('input[name="cliente"][value="Hotel"]', modulo).checked = true;
}));

const errore = $('#modulo-errore');
modulo.addEventListener('submit', (e) => {
  e.preventDefault();
  const d = new FormData(modulo);
  const nome = (d.get('nome') || '').trim();
  const tel = (d.get('telefono') || '').trim();
  const email = (d.get('email') || '').trim();
  if (!nome || (!tel && !email)) {
    errore.textContent = !nome
      ? 'Scrivi nome e cognome, così sappiamo chi ricontattare.'
      : 'Lascia almeno un telefono o un’email per ricevere la proposta.';
    errore.hidden = false;
    (!nome ? modulo.nome : modulo.telefono).focus();
    return;
  }
  errore.hidden = true;
  const mezzi = d.getAll('mezzo');
  const righe = [
    'Buongiorno, vorrei un preventivo di noleggio.',
    '',
    `Mezzo: ${mezzi.length ? mezzi.join(', ') : 'da definire'}`,
    `Per: ${d.get('cliente')}`,
    `Durata: ${d.get('durata')}`,
    '',
    `Nome: ${nome}`,
    d.get('azienda') ? `Azienda o struttura: ${d.get('azienda').trim()}` : null,
    tel ? `Telefono: ${tel}` : null,
    email ? `Email: ${email}` : null,
    d.get('messaggio') ? `\n${d.get('messaggio').trim()}` : null,
  ].filter((r) => r !== null);
  const oggetto = `Richiesta preventivo: ${mezzi.length ? mezzi.join(', ') : 'noleggio'}`;
  location.href = `mailto:info@doxon.it?subject=${encodeURIComponent(oggetto)}&body=${encodeURIComponent(righe.join('\n'))}`;
});

// ---------- Anno ----------
$('#anno').textContent = new Date().getFullYear();

// ---------- Scena 3D: arriva dopo la pagina, mai prima ----------
function webglOk() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch { return false; }
}
function avvia3d() {
  if (!webglOk()) { hero.classList.add('no-3d'); return; }
  import('./3d.js')
    .then((m) => m.avvia({ hero, canvas: $('.hero-3d'), riduci }))
    .catch(() => hero.classList.add('no-3d'));
}
if (document.readyState === 'complete') setTimeout(avvia3d, 30);
else addEventListener('load', () => setTimeout(avvia3d, 30), { once: true });
