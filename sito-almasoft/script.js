(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  /* anno nel piede */
  $$('.anno').forEach((el) => { el.textContent = new Date().getFullYear(); });

  /* testata */
  const testata = $('.testata');
  const segnaScroll = () => testata.classList.toggle('scorsa', scrollY > 8);

  /* menu mobile */
  const bottoneMenu = $('.testata__menu');
  const menu = $('#menu');
  const chiudiMenu = () => { menu.hidden = true; bottoneMenu.setAttribute('aria-expanded', 'false'); document.body.style.overflow = ''; };
  bottoneMenu.addEventListener('click', () => {
    const apri = menu.hidden;
    menu.hidden = !apri;
    bottoneMenu.setAttribute('aria-expanded', String(apri));
    document.body.style.overflow = apri ? 'hidden' : '';
  });
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) chiudiMenu(); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) { chiudiMenu(); bottoneMenu.focus(); } });

  /* palco: fasi legate allo scroll */
  const sezione = $('#modello');
  const palco = $('.modello__palco');
  const fasi = $$('.fase', palco);
  const tacche = $$('.avanzamento span', palco);
  const SOGLIE = [0.06, 0.29, 0.52, 0.76, 1];
  let faseAttuale = -1;
  function aggiornaPalco() {
    const corsa = sezione.offsetHeight - palco.offsetHeight;
    const p = corsa > 0 ? Math.min(1, Math.max(0, -sezione.getBoundingClientRect().top / corsa)) : 0;
    let f = 0;
    for (let i = 0; i < 4; i++) if (p >= SOGLIE[i]) f = i + 1;
    if (f !== faseAttuale) {
      faseAttuale = f;
      palco.dataset.fase = String(f);
      fasi.forEach((el) => el.classList.toggle('attiva', Number(el.dataset.fase) === f));
    }
    tacche.forEach((t, i) => {
      const v = Math.min(1, Math.max(0, (p - SOGLIE[i]) / (SOGLIE[i + 1] - SOGLIE[i])));
      t.style.setProperty('--f', v.toFixed(3));
    });
  }

  let inAttesa = false;
  addEventListener('scroll', () => {
    if (inAttesa) return;
    inAttesa = true;
    requestAnimationFrame(() => { inAttesa = false; segnaScroll(); aggiornaPalco(); });
  }, { passive: true });
  addEventListener('resize', aggiornaPalco);
  segnaScroll();
  aggiornaPalco();

  /* 3D: dopo il caricamento, solo se c'è WebGL */
  function haWebGL() {
    try {
      const c = document.createElement('canvas');
      return !!(c.getContext('webgl2') || c.getContext('webgl'));
    } catch (e) { return false; }
  }
  function carica3D() {
    if (!haWebGL()) return;
    import('./3d.js')
      .then((m) => m.avvia(palco))
      .catch((err) => console.warn('Scena 3D non disponibile:', err));
  }
  if (document.readyState === 'complete') carica3D();
  else addEventListener('load', carica3D, { once: true });

  /* servizi: albero del modello */
  const nodi = $$('.nodo');
  const vista = $('.albero__vista');
  const vistaImg = vista && $('img', vista);
  let cambio = 0;
  nodi.forEach((nodo) => {
    nodo.addEventListener('toggle', () => {
      if (!nodo.open) return;
      nodi.forEach((altro) => { if (altro !== nodo && altro.open) altro.open = false; });
      if (!vistaImg) return;
      const sorgente = $('.nodo__corpo img', nodo);
      if (!sorgente || vistaImg.getAttribute('src') === sorgente.getAttribute('src')) return;
      clearTimeout(cambio);
      vista.classList.add('cambio');
      cambio = setTimeout(() => {
        vistaImg.src = sorgente.getAttribute('src');
        vistaImg.onload = () => vista.classList.remove('cambio');
        setTimeout(() => vista.classList.remove('cambio'), 400);
      }, 220);
    });
  });

  /* collegamenti che scelgono il tipo di richiesta */
  const modulo = $('#modulo');
  const dest = $('.modulo__dest', modulo);
  const destinatario = (tipo) => (tipo === 'Formazione e corsi' ? 'formazione@almasoft.it' : 'info@almasoft.it');
  const scegliTipo = (tipo) => {
    const r = $(`input[name="tipo"][value="${tipo}"]`, modulo);
    if (r) { r.checked = true; dest.textContent = destinatario(tipo); }
  };
  $$('[data-tipo]').forEach((a) => a.addEventListener('click', () => scegliTipo(a.dataset.tipo)));
  $$('input[name="tipo"]', modulo).forEach((r) => r.addEventListener('change', () => { dest.textContent = destinatario(r.value); }));

  /* modulo: compone l'email */
  const errore = $('.modulo__errore', modulo);
  modulo.addEventListener('submit', (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(modulo));
    const mancanti = [];
    [['nome', 'il nome'], ['email', "l'email"], ['messaggio', 'due righe sul progetto']].forEach(([k, etichetta]) => {
      const campo = modulo.elements[k];
      const vuoto = !String(d[k] || '').trim() || (k === 'email' && !campo.checkValidity());
      campo.setAttribute('aria-invalid', String(vuoto));
      if (vuoto) mancanti.push(etichetta);
    });
    if (mancanti.length) {
      errore.textContent = `Manca ${mancanti.join(', ')}.`;
      errore.hidden = false;
      modulo.querySelector('[aria-invalid="true"]').focus();
      return;
    }
    errore.hidden = true;
    const oggetto = `Richiesta dal sito: ${d.tipo}${d.ente ? ` (${d.ente.trim()})` : ''}`;
    const corpo = [
      `Buongiorno,`,
      ``,
      d.messaggio.trim(),
      ``,
      `${d.nome.trim()}${d.ente ? `, ${d.ente.trim()}` : ''}`,
      d.email.trim(),
      d.telefono.trim() ? `Tel. ${d.telefono.trim()}` : null,
    ].filter((r) => r !== null).join('\n');
    location.href = `mailto:${destinatario(d.tipo)}?subject=${encodeURIComponent(oggetto)}&body=${encodeURIComponent(corpo)}`;
  });
})();
