// Itelyum demo: testata, menu, barra mobile, chiamate, svelamenti, palco della rigenerazione, modulo, 3D
(() => {
  const html = document.documentElement;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const ridotto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

  /* menu mobile */
  const apri = $('.menu-apri'), menu = $('#menu');
  function chiudiMenu() {
    menu.hidden = true; menu.classList.remove('aperto');
    apri.setAttribute('aria-expanded', 'false');
    $('.menu-apri__testo').textContent = 'Menu';
    document.body.style.overflow = '';
  }
  apri.addEventListener('click', () => {
    if (apri.getAttribute('aria-expanded') === 'true') return chiudiMenu();
    menu.hidden = false; menu.classList.add('aperto');
    apri.setAttribute('aria-expanded', 'true');
    $('.menu-apri__testo').textContent = 'Chiudi';
    document.body.style.overflow = 'hidden';
  });
  $$('#menu a').forEach((a) => a.addEventListener('click', chiudiMenu));
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) chiudiMenu(); });
  matchMedia('(min-width: 1040px)').addEventListener('change', (m) => { if (m.matches) chiudiMenu(); });

  /* barra mobile: compare quando i bottoni dell'hero escono, sparisce sul modulo */
  const barra = $('#barra');
  let ctaVisibile = true, moduloVisibile = false;
  const aggiornaBarra = () => barra.classList.toggle('vis', !ctaVisibile && !moduloVisibile);
  new IntersectionObserver(([e]) => { ctaVisibile = e.isIntersecting; aggiornaBarra(); }).observe($('#hero-cta'));
  new IntersectionObserver(([e]) => { moduloVisibile = e.isIntersecting; aggiornaBarra(); }).observe($('#modulo'));

  /* "Chi vuoi chiamare?" */
  const dlg = $('#chiama');
  $$('[data-chiama]').forEach((b) => b.addEventListener('click', () => {
    if (typeof dlg.showModal === 'function') dlg.showModal();
    else location.href = 'tel:+3902305485283';
  }));
  $('[data-chiudi]').addEventListener('click', () => dlg.close());
  dlg.addEventListener('click', (e) => {
    const r = dlg.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dlg.close();
  });

  /* svelamenti delle foto e anello dell'84% */
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((voci) => voci.forEach((v) => {
      if (v.isIntersecting) { v.target.classList.add('in'); io.unobserve(v.target); }
    }), { rootMargin: '0px 0px -10% 0px' });
    $$('.rivela, .anello').forEach((el) => io.observe(el));
  } else {
    $$('.rivela, .anello').forEach((el) => el.classList.add('in'));
  }

  /* palco: le etichette arrivano con le gocce (stessi tempi di goccia.js) */
  const rig = $('#rigenera'), esiti = $$('.esito'), confronto = $('.palco__confronto');
  function progresso() {
    const r = rig.getBoundingClientRect(), corsa = r.height - innerHeight;
    return corsa > 0 ? Math.min(1, Math.max(0, -r.top / corsa)) : 1;
  }
  window.__palcoProgresso = progresso;
  function aggiornaPalco() {
    if (html.classList.contains('no-3d')) return;
    const p = progresso();
    esiti.forEach((el, i) => el.style.setProperty('--a', ss(.3 + i * .06, .42 + i * .06, p).toFixed(3)));
    confronto.style.setProperty('--c', ss(.64, .76, p).toFixed(3));
  }

  /* parallasse delle foto grandi, solo quelle sullo schermo */
  const inVista = new Set();
  if (!ridotto && 'IntersectionObserver' in window) {
    const iop = new IntersectionObserver((voci) => voci.forEach((v) => (v.isIntersecting ? inVista.add(v.target) : inVista.delete(v.target))));
    $$('.parallasse').forEach((el) => iop.observe(el));
  }
  function parallasse() {
    inVista.forEach((el) => {
      const r = el.getBoundingClientRect();
      const d = (r.top + r.height / 2 - innerHeight / 2) / innerHeight;
      el.style.setProperty('--py', `${(-d * r.height * .07).toFixed(1)}px`);
    });
  }

  /* testata piena dopo l'inizio */
  const testata = $('#testata');
  let inCoda = false;
  function suScroll() {
    inCoda = false;
    testata.classList.toggle('piena', scrollY > 40);
    aggiornaPalco();
    parallasse();
  }
  addEventListener('scroll', () => { if (!inCoda) { inCoda = true; requestAnimationFrame(suScroll); } }, { passive: true });
  addEventListener('resize', suScroll);
  suScroll();

  /* modulo: compone l'email per la divisione giusta */
  const indirizzi = {
    ambiente: 'info.ambiente@itelyum.com',
    regeneration: 'info.regeneration@itelyum.com',
    purification: 'info.purification@itelyum.com'
  };
  const modulo = $('#modulo'), nota = $('#modulo-nota');
  modulo.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = modulo.elements;
    const mancanti = [];
    ['nome', 'azienda', 'email', 'bisogno', 'settore'].forEach((n) => {
      const el = f[n];
      const ok = n === 'email' ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value.trim()) : el.value.trim() !== '';
      el.closest('.campo').classList.toggle('errore', !ok);
      if (!ok) mancanti.push(el);
    });
    const privacy = f.privacy;
    privacy.closest('.consenso').classList.toggle('errore', !privacy.checked);
    if (!privacy.checked) mancanti.push(privacy);
    if (mancanti.length) {
      nota.textContent = 'Completa i campi evidenziati: nome, azienda, email valida, bisogno, settore e informativa.';
      nota.classList.add('avviso');
      mancanti[0].focus();
      return;
    }
    const scelta = f.bisogno.selectedOptions[0];
    const a = indirizzi[scelta.dataset.a] || indirizzi.ambiente;
    const oggetto = `Richiesta dal sito: ${f.bisogno.value} (${f.azienda.value.trim()})`;
    const righe = [
      'Buongiorno,',
      '',
      `vorrei parlare con un esperto Itelyum di: ${f.bisogno.value}.`,
      '',
      `Nome: ${f.nome.value.trim()}`,
      `Azienda: ${f.azienda.value.trim()}`,
      `Settore: ${f.settore.value}`,
      `Email: ${f.email.value.trim()}`,
      f.telefono.value.trim() ? `Telefono: ${f.telefono.value.trim()}` : '',
      f.messaggio.value.trim() ? `\n${f.messaggio.value.trim()}` : '',
      '',
      'Grazie'
    ].filter((r, i, arr) => r !== '' || arr[i - 1] !== '');
    nota.classList.remove('avviso');
    nota.textContent = `Abbiamo preparato l'email per ${a}. Se l'app di posta non si apre, scrivi a quell'indirizzo.`;
    location.href = `mailto:${a}?subject=${encodeURIComponent(oggetto)}&body=${encodeURIComponent(righe.join('\n'))}`;
  });
  modulo.addEventListener('input', (e) => {
    const c = e.target.closest('.campo, .consenso');
    if (c) c.classList.remove('errore');
  });

  /* anno */
  $('#anno').textContent = new Date().getFullYear();

  /* goccia 3D: dopo il caricamento, mai prima del contenuto */
  if (ridotto) {
    html.classList.add('no-3d');
  } else {
    const carica = () => import('./goccia.js').catch((err) => {
      console.warn('goccia 3D non disponibile:', err);
      html.classList.remove('has-3d');
      html.classList.add('no-3d');
      suScroll();
    });
    if (document.readyState === 'complete') setTimeout(carica, 50);
    else addEventListener('load', () => setTimeout(carica, 50), { once: true });
  }
})();
