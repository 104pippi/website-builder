(() => {
  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  $('#year').textContent = new Date().getFullYear();

  // Header trasparente sulla hero, pieno dopo
  const header = $('#header');
  const mobileBar = $('#mobile-bar');
  let contactInView = false;
  const onScroll = () => {
    const y = window.scrollY;
    header.classList.toggle('is-scrolled', y > 40);
    mobileBar.classList.toggle('is-visible', y > window.innerHeight * 0.55 && !contactInView);
    updateRouting();
  };

  // Menu mobile
  const toggle = $('#menu-toggle');
  const setMenu = (open) => {
    root.classList.toggle('nav-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Chiudi il menu' : 'Apri il menu');
  };
  toggle.addEventListener('click', () => setMenu(!root.classList.contains('nav-open')));
  $$('#nav a').forEach((a) => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

  // Video della hero: parte solo dopo il caricamento della pagina, mai con movimento ridotto o risparmio dati
  const heroVideo = $('#hero-video');
  const saveData = navigator.connection && navigator.connection.saveData;
  if (heroVideo && !reduceMotion && !saveData) {
    window.addEventListener('load', () => {
      const mobile = window.matchMedia('(max-width: 699px)').matches;
      heroVideo.src = mobile ? heroVideo.dataset.srcM : heroVideo.dataset.src;
      heroVideo.addEventListener('playing', () => heroVideo.classList.add('is-playing'), { once: true });
      heroVideo.play().catch(() => {});
    });
  }

  // Comparsa degli elementi allo scroll
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      en.target.classList.add('is-in');
      io.unobserve(en.target);
      if (en.target.id === 'map') startTravel();
    });
  }, { threshold: 0.18, rootMargin: '0px 0px -6% 0px' });
  $$('.reveal:not(.h2), .mosaic, #map').forEach((el) => io.observe(el));
  // I titoli partono nascosti con clip-path (IntersectionObserver non li vedrebbe): si osserva il loro contenitore
  const ioHead = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      $$(':scope > .h2.reveal', en.target).forEach((h) => h.classList.add('is-in'));
      ioHead.unobserve(en.target);
    });
  }, { threshold: 0, rootMargin: '0px 0px -14% 0px' });
  new Set($$('.h2.reveal').map((h) => h.parentElement)).forEach((el) => ioHead.observe(el));

  // Ciclo di lavoro: la linea avanza con lo scroll e accende le fasi superate
  const routing = $('#routing');
  const ops = $$('.op');
  function updateRouting() {
    if (!routing) return;
    const r = routing.getBoundingClientRect();
    const mark = window.innerHeight * 0.6;
    const p = Math.min(1, Math.max(0, (mark - r.top - 46) / (r.height - 76)));
    routing.style.setProperty('--p', p.toFixed(3));
    ops.forEach((op) => op.classList.toggle('is-active', op.getBoundingClientRect().top + 40 < mark));
  }

  // Mappa: piccoli punti che viaggiano da Castelfranco verso le destinazioni
  let travelling = false;
  function startTravel() {
    if (travelling || reduceMotion) return;
    travelling = true;
    const NS = 'http://www.w3.org/2000/svg';
    const group = document.createElementNS(NS, 'g');
    $$('#routes .route').forEach((route, i) => {
      const dot = document.createElementNS(NS, 'circle');
      dot.setAttribute('r', '4.5');
      dot.setAttribute('class', 'travel');
      dot.setAttribute('opacity', '0');
      const begin = (1.6 + i * 0.45).toFixed(2) + 's';
      const motion = document.createElementNS(NS, 'animateMotion');
      motion.setAttribute('dur', '3.4s');
      motion.setAttribute('begin', begin);
      motion.setAttribute('repeatCount', 'indefinite');
      motion.setAttribute('calcMode', 'spline');
      motion.setAttribute('keyTimes', '0;1');
      motion.setAttribute('keySplines', '.45 0 .25 1');
      const mpath = document.createElementNS(NS, 'mpath');
      mpath.setAttribute('href', '#' + route.id);
      motion.appendChild(mpath);
      const fade = document.createElementNS(NS, 'animate');
      fade.setAttribute('attributeName', 'opacity');
      fade.setAttribute('values', '0;1;1;0');
      fade.setAttribute('keyTimes', '0;.12;.8;1');
      fade.setAttribute('dur', '3.4s');
      fade.setAttribute('begin', begin);
      fade.setAttribute('repeatCount', 'indefinite');
      dot.append(motion, fade);
      group.appendChild(dot);
    });
    $('#routes').after(group);
  }

  // Barra mobile nascosta quando il modulo è già sullo schermo
  const contact = $('#contatti');
  new IntersectionObserver(([en]) => { contactInView = en.isIntersecting; onScroll(); }, { threshold: 0.12 }).observe(contact);

  // Video testimonianze
  const player = $('#player');
  const voices = $('#voices-video');
  $('#player-play').addEventListener('click', () => {
    player.classList.add('is-playing');
    voices.controls = true;
    voices.play().catch(() => {});
  });
  voices.addEventListener('ended', () => player.classList.remove('is-playing'));

  // Modulo: compone la richiesta e apre l'app di posta (sito senza backend)
  const form = $('#form');
  const status = $('#form-status');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const d = new FormData(form);
    const nome = (d.get('nome') || '').trim();
    const azienda = (d.get('azienda') || '').trim();
    const email = (d.get('email') || '').trim();
    const missing = [];
    $$('.is-invalid', form).forEach((el) => el.classList.remove('is-invalid'));
    if (!nome) missing.push(form.nome);
    if (!azienda) missing.push(form.azienda);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) missing.push(form.email);
    if (missing.length) {
      missing.forEach((el) => el.classList.add('is-invalid'));
      status.className = 'form-status is-error';
      status.textContent = 'Compila nome, azienda e una email valida per inviare la richiesta.';
      missing[0].focus();
      return;
    }
    if (!form.privacy.checked) {
      status.className = 'form-status is-error';
      status.textContent = "Spunta il consenso all'informativa privacy per inviare la richiesta.";
      form.privacy.focus();
      return;
    }
    const lav = d.getAll('lavorazioni').join(', ') || 'non indicate';
    const mer = d.getAll('mercati').join(', ') || 'non indicati';
    const tel = (d.get('telefono') || '').trim() || 'non indicato';
    const msg = (d.get('messaggio') || '').trim();
    const body = [
      'Buongiorno Europass,',
      'vorrei fissare un primo incontro.',
      '',
      `Nome: ${nome}`,
      `Azienda: ${azienda}`,
      `Email: ${email}`,
      `Telefono: ${tel}`,
      `Lavorazioni: ${lav}`,
      `Mercati di interesse: ${mer}`,
      msg ? `\nMessaggio:\n${msg}` : '',
    ].join('\n');
    const subject = `Richiesta primo incontro - ${azienda}`;
    window.location.href = `mailto:info@europassnet.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    status.className = 'form-status';
    status.textContent = "Si è aperta la tua app di posta con la richiesta pronta: controlla e premi Invia. Se non si apre, scrivi a info@europassnet.com o chiama lo 0423 743836.";
  });

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();
})();
