(() => {
  const ridotto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const limita = (v, a, b) => Math.min(b, Math.max(a, v));

  const NUMERO_WA = '393756864091';

  /* ---------- Testata, hero e barra CTA legati allo scroll ---------- */
  const testata = $('#testata');
  const hero = $('.hero');
  const barra = $('#barra-cta');
  let menuAperto = false;

  function suScroll() {
    const y = scrollY;
    const h = hero.offsetHeight;
    testata.classList.toggle('solida', y > 40 || menuAperto);
    if (!ridotto) hero.style.setProperty('--hp', limita(y / h, 0, 1).toFixed(4));
    barra.classList.toggle('visibile', y > h * 0.6);
  }

  /* ---------- Menu mobile ---------- */
  const bottoneMenu = $('.testata__menu');
  const menu = $('#menu-mobile');
  function apriMenu(apri) {
    menuAperto = apri;
    menu.hidden = !apri;
    bottoneMenu.setAttribute('aria-expanded', String(apri));
    $('.testata__menu-testo').textContent = apri ? 'Chiudi' : 'Menu';
    document.body.style.overflow = apri ? 'hidden' : '';
    suScroll();
  }
  bottoneMenu.addEventListener('click', () => apriMenu(!menuAperto));
  $$('a', menu).forEach(a => a.addEventListener('click', () => apriMenu(false)));
  addEventListener('keydown', e => { if (e.key === 'Escape' && menuAperto) apriMenu(false); });

  /* ---------- Rivelazioni ---------- */
  const rivela = new IntersectionObserver((voci) => {
    voci.forEach(v => { if (v.isIntersecting) { v.target.classList.add('in'); rivela.unobserve(v.target); } });
  }, { rootMargin: '0px 0px -8% 0px' });
  $$('[data-rivela]').forEach(el => rivela.observe(el));

  /* ---------- Catalogo: Classico / Moderno ---------- */
  const griglia = $('.griglia');
  const selettore = $('.stile');
  $$('.stile__btn').forEach(btn => btn.addEventListener('click', () => {
    const stile = btn.dataset.stile;
    if (griglia.dataset.stile === stile) return;
    griglia.dataset.mosso = '';
    griglia.dataset.stile = stile;
    selettore.dataset.attivo = stile;
    $$('.stile__btn').forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
  }));

  /* ---------- Corridoio curvo di scale e tettoie ---------- */
  const corridoio = $('[data-corridoio]');
  const fila = $('.corridoio__fila', corridoio);
  const quadri = $$('.quadro', fila);
  const desktop = matchMedia('(min-width: 900px)');
  let corsa = 0;

  function misuraCorridoio() {
    const attivo = desktop.matches && !ridotto;
    corridoio.classList.toggle('attivo', attivo);
    if (attivo) {
      fila.style.setProperty('--cx', '0');
      corsa = Math.max(0, fila.scrollWidth - innerWidth);
      corridoio.style.height = (innerHeight + corsa) + 'px';
    } else {
      corsa = 0;
      corridoio.style.height = '';
      fila.style.removeProperty('--cx');
    }
    curva();
  }

  function curva() {
    if (desktop.matches && corridoio.classList.contains('attivo')) {
      const r = corridoio.getBoundingClientRect();
      const p = corsa ? limita(-r.top / corsa, 0, 1) : 0;
      fila.style.setProperty('--cx', (p * corsa).toFixed(1));
    }
    if (ridotto) return;
    const meta = innerWidth / 2;
    quadri.forEach(q => {
      const r = q.getBoundingClientRect();
      if (r.right < -200 || r.left > innerWidth + 200) return;
      const d = limita((r.left + r.width / 2 - meta) / meta, -1.6, 1.6);
      q.style.transform = `perspective(1200px) rotateY(${(-d * 22).toFixed(2)}deg) scale(${(1 - Math.abs(d) * 0.07).toFixed(3)})`;
    });
  }
  fila.addEventListener('scroll', () => requestAnimationFrame(curva), { passive: true });

  /* ---------- Un solo ciclo per lo scroll della pagina ---------- */
  let inAttesa = false;
  addEventListener('scroll', () => {
    if (inAttesa) return;
    inAttesa = true;
    requestAnimationFrame(() => { inAttesa = false; suScroll(); curva(); });
  }, { passive: true });
  addEventListener('resize', () => { misuraCorridoio(); suScroll(); });
  addEventListener('load', misuraCorridoio);
  misuraCorridoio();
  suScroll();

  /* ---------- Video della forgia: si carica solo quando serve ---------- */
  $$('video[data-video-pigro]').forEach(v => {
    let caricato = false;
    new IntersectionObserver(([voce]) => {
      if (voce.isIntersecting) {
        if (!caricato) {
          $$('source[data-src]', v).forEach(s => { s.src = s.dataset.src; });
          v.load();
          caricato = true;
        }
        if (!ridotto) v.play().catch(() => {});
      } else if (caricato) {
        v.pause();
      }
    }, { rootMargin: '200px 0px' }).observe(v);
  });

  /* ---------- Scena 3D del segno FDE ---------- */
  const scena = $('#scena3d');
  if (scena) {
    let modulo = null;
    let avviato = false;
    const carica = () => modulo || (modulo = import('./3d.js').catch(() => null));
    addEventListener('load', () => setTimeout(carica, 2500));
    new IntersectionObserver(([voce], oss) => {
      if (!voce.isIntersecting || avviato) return;
      avviato = true;
      oss.disconnect();
      carica().then(m => { if (m) m.avvia(scena, { ridotto }); });
    }, { rootMargin: '500px 0px' }).observe(scena);
  }

  /* ---------- Preventivo: compone il messaggio e apre WhatsApp ---------- */
  const modulo = $('#modulo');
  const errore = $('#modulo-errore');
  const linkEmail = $('#modulo-email');

  function messaggio() {
    const d = new FormData(modulo);
    const v = k => (d.get(k) || '').toString().trim();
    const righe = [
      `Buongiorno FDE STEEL, sono ${v('nome') || '...'}.`,
      `Vorrei un preventivo per: ${v('tipo')}.`,
      `Stile: ${v('stile')}.`
    ];
    if (v('comune')) righe.push(`Comune del lavoro: ${v('comune')}.`);
    if (v('note')) righe.push(`Dettagli: ${v('note')}`);
    righe.push('Vi mando qui le foto del posto.');
    return righe.join('\n');
  }

  function aggiornaEmail() {
    linkEmail.href = 'mailto:info@fdesteel.com?subject=' + encodeURIComponent('Richiesta preventivo') +
      '&body=' + encodeURIComponent(messaggio().replace('Vi mando qui le foto del posto.', 'Vi allego le foto del posto.'));
  }
  modulo.addEventListener('input', aggiornaEmail);
  modulo.addEventListener('change', aggiornaEmail);

  modulo.addEventListener('submit', e => {
    e.preventDefault();
    const nome = modulo.elements.nome;
    if (!nome.value.trim()) {
      errore.hidden = false;
      nome.setAttribute('aria-invalid', 'true');
      nome.focus();
      return;
    }
    errore.hidden = true;
    nome.removeAttribute('aria-invalid');
    const url = `https://wa.me/${NUMERO_WA}?text=${encodeURIComponent(messaggio())}`;
    const finestra = window.open(url, '_blank');
    if (finestra) finestra.opener = null;
    else location.href = url;
  });

  // I link "Preventivo per…" scelgono già il tipo di lavoro nel modulo
  $$('[data-tipo]').forEach(a => a.addEventListener('click', () => {
    const scelta = $$('input[name="tipo"]', modulo).find(i => i.value === a.dataset.tipo);
    if (scelta) { scelta.checked = true; aggiornaEmail(); }
  }));
  aggiornaEmail();

  /* ---------- Anno nel piede ---------- */
  $$('[data-anno]').forEach(el => { el.textContent = new Date().getFullYear(); });
})();
