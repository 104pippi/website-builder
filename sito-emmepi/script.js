(() => {
  const html = document.documentElement;
  const fermo = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const limita = (v) => Math.min(1, Math.max(0, v));

  // Stampo d'apertura: una volta per sessione, poi sparisce dal DOM visivo
  const stampo = document.querySelector('.stampo');
  if (stampo) {
    const chiudi = () => stampo.classList.add('is-finito');
    stampo.querySelector('.stampo-dx').addEventListener('animationend', chiudi, { once: true });
    setTimeout(chiudi, 2000);
    try { sessionStorage.setItem('emmepi-intro', '1'); } catch (e) {}
  }

  // Testata piena dopo la hero, barra mobile dopo il primo scroll
  const testata = document.getElementById('testata');
  const barra = document.querySelector('.barra-mobile');
  let barraNascosta = false;

  // Menu mobile
  const apri = document.querySelector('.menu-apri');
  const menu = document.getElementById('menu');
  const chiudiMenu = () => {
    html.classList.remove('menu-aperto');
    apri.setAttribute('aria-expanded', 'false');
  };
  apri.addEventListener('click', () => {
    const aperto = html.classList.toggle('menu-aperto');
    apri.setAttribute('aria-expanded', String(aperto));
  });
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) chiudiMenu(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') chiudiMenu(); });

  // Servizi: una scheda aperta alla volta (accordion su mobile, foto a destra su desktop)
  const servizi = [...document.querySelectorAll('.servizio')];
  servizi.forEach((s) => {
    s.querySelector('.servizio-tab').addEventListener('click', () => {
      servizi.forEach((x) => {
        const on = x === s;
        x.classList.toggle('is-attivo', on);
        x.querySelector('.servizio-tab').setAttribute('aria-expanded', String(on));
      });
    });
  });

  // Rivelazioni: le foto si aprono dal centro quando entrano
  const rivela = document.querySelectorAll('.rivela');
  if ('IntersectionObserver' in window && !fermo) {
    const io = new IntersectionObserver((voci) => {
      voci.forEach((v) => { if (v.isIntersecting) { v.target.classList.add('is-vista'); io.unobserve(v.target); } });
    }, { rootMargin: '0px 0px -12% 0px' });
    rivela.forEach((el) => io.observe(el));
  } else {
    rivela.forEach((el) => el.classList.add('is-vista'));
  }

  // Barra mobile nascosta mentre si compila il preventivo
  const preventivo = document.getElementById('preventivo');
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([v]) => { barraNascosta = v.isIntersecting; aggiorna(); }, { threshold: 0.15 }).observe(preventivo);
  }

  // Presse: le tonnellate crescono (e si allargano) mentre la sezione entra
  const presse = document.querySelector('.presse-numero');
  const tonnellate = document.getElementById('tonnellate');
  const fila = [...document.querySelectorAll('.presse-fila i')];
  // Processo: il granulo scende lungo i passi
  const passi = document.querySelector('[data-processo]');
  const elencoPassi = [...document.querySelectorAll('.passo')];
  const linea = document.querySelector('.processo-linea');

  function aggiorna() {
    const y = window.scrollY;
    const vh = window.innerHeight;
    testata.classList.toggle('is-piena', y > vh * 0.6);
    barra.classList.toggle('is-visibile', y > 160 && !barraNascosta);

    if (fermo) return;

    const r = presse.getBoundingClientRect();
    const p = limita((vh * 0.95 - r.top) / (vh * 0.6));
    presse.style.setProperty('--p', p.toFixed(3));
    tonnellate.textContent = String(50 + Math.round(p * 95) * 10);
    const accese = Math.round(p * fila.length);
    fila.forEach((f, i) => f.classList.toggle('is-accesa', i < accese));

    const rp = linea.getBoundingClientRect();
    const pp = limita((vh * 0.55 - rp.top) / rp.height);
    passi.style.setProperty('--pp', pp.toFixed(4));
    const fondo = rp.top + pp * rp.height;
    elencoPassi.forEach((el) => {
      el.classList.toggle('is-passato', el.querySelector('.passo-n').getBoundingClientRect().top + 22 <= fondo + 1);
    });
  }

  if (fermo) {
    fila.forEach((f) => f.classList.add('is-accesa'));
    elencoPassi.forEach((el) => el.classList.add('is-passato'));
    passi.style.setProperty('--pp', '1');
  }
  window.addEventListener('scroll', aggiorna, { passive: true });
  window.addEventListener('resize', aggiorna);
  aggiorna();

  // Preventivo: il modulo compone la mail per info@emmepi.tv
  const modulo = document.getElementById('modulo');
  const errore = document.getElementById('modulo-errore');
  modulo.addEventListener('submit', (e) => {
    e.preventDefault();
    const obbligatori = [...modulo.querySelectorAll('[required]')];
    let primo = null;
    obbligatori.forEach((c) => {
      const ok = c.type === 'checkbox' ? c.checked : c.value.trim() !== '' && c.checkValidity();
      if (c.type !== 'checkbox') c.setAttribute('aria-invalid', String(!ok));
      if (!ok && !primo) primo = c;
    });
    if (primo) {
      errore.hidden = false;
      errore.textContent = primo.type === 'checkbox'
        ? 'Per inviare la richiesta serve il consenso all\'informativa privacy.'
        : primo.type === 'email' && primo.value.trim()
          ? 'Controllate l\'indirizzo email: sembra incompleto.'
          : 'Compilate i campi azienda, nome, email e descrizione del pezzo.';
      primo.focus();
      return;
    }
    errore.hidden = true;
    const d = new FormData(modulo);
    const righe = [
      'Buongiorno,',
      '',
      `vorremmo un preventivo per: ${d.get('tipo')}.`,
      '',
      d.get('messaggio').trim(),
      '',
      d.get('quantita').trim() ? `Quantità indicativa: ${d.get('quantita').trim()}` : null,
      '',
      `${d.get('nome').trim()}`,
      `${d.get('azienda').trim()}`,
      d.get('telefono').trim() ? `Tel. ${d.get('telefono').trim()}` : null,
      d.get('email').trim(),
      '',
      '(Allego il disegno / file 3D del pezzo.)',
    ].filter((r) => r !== null);
    const oggetto = `Richiesta preventivo – ${d.get('azienda').trim()}`;
    window.location.href = `mailto:info@emmepi.tv?subject=${encodeURIComponent(oggetto)}&body=${encodeURIComponent(righe.join('\n'))}`;
  });
  modulo.addEventListener('input', (e) => { if (e.target.getAttribute('aria-invalid') === 'true') e.target.setAttribute('aria-invalid', 'false'); });

  const anno = document.getElementById('anno');
  if (anno) anno.textContent = new Date().getFullYear();
})();
