(() => {
  const doc = document.documentElement;
  doc.classList.add('js');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const t0 = performance.now();

  // Header: bordo quando si scorre
  const top = document.querySelector('.top');
  const onScroll = () => top.classList.toggle('is-scrolled', window.scrollY > 8);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  // Menu mobile
  const burger = document.querySelector('.burger');
  const nav = document.getElementById('nav');
  const setMenu = (open) => {
    nav.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Chiudi il menu' : 'Apri il menu');
  };
  burger.addEventListener('click', () => setMenu(!nav.classList.contains('is-open')));
  nav.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

  // Codici a barre (scontrino e footer), ricavati dal testo come un vero codice
  document.querySelectorAll('.barcode').forEach((el) => {
    const unit = el.classList.contains('barcode--foot') ? 1.5 : 2;
    const bars = [1, 0, 1, 1, 0, 1];
    for (const ch of el.dataset.code) {
      const c = ch.charCodeAt(0);
      for (let b = 0; b < 9; b++) bars.push((c >> (b % 7)) & 1 ? 2 + (b % 2) : 1);
      bars.push(1);
    }
    bars.push(1, 1, 0, 1);
    const frag = document.createDocumentFragment();
    bars.forEach((w, i) => {
      const bar = document.createElement('i');
      bar.style.width = (w || 1) * unit + 'px';
      if (i % 2) bar.className = 's';
      frag.append(bar);
    });
    el.append(frag);
  });

  // Lo scontrino si stampa quando è in vista, dopo il passaggio del laser sul titolo
  const printer = document.querySelector('.printer');
  if (printer && !reduce && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      const wait = Math.max(150, 1450 - (performance.now() - t0));
      setTimeout(() => {
        printer.classList.add('is-printing');
        setTimeout(() => printer.classList.add('is-done'), 2500);
      }, wait);
    }, { threshold: 0.2 });
    io.observe(printer);
  } else if (printer) {
    printer.classList.add('is-printing', 'is-done');
  }

  // Display "Serviamo il numero": segue il passo della sagra che stai leggendo
  const vfd = document.getElementById('vfd-num');
  const steps = document.querySelectorAll('.step');
  if (vfd && steps.length && 'IntersectionObserver' in window) {
    const show = (step) => {
      const n = step.dataset.n;
      steps.forEach((s) => s.classList.toggle('is-current', s === step));
      if (vfd.textContent === n) return;
      vfd.textContent = n;
      if (!reduce) { vfd.classList.remove('tick'); void vfd.offsetWidth; vfd.classList.add('tick'); }
    };
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) show(e.target); });
    }, { rootMargin: '-40% 0px -55% 0px' });
    steps.forEach((s) => io.observe(s));
    steps[0].classList.add('is-current');
  }

  // Comparsa delle foto
  const reveals = document.querySelectorAll('.reveal');
  if (!reduce && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -12% 0px' });
    reveals.forEach((r) => io.observe(r));
  } else {
    reveals.forEach((r) => r.classList.add('is-in'));
  }

  // I pulsanti delle sezioni preimpostano la richiesta nel modulo
  const need = document.getElementById('bisogno');
  document.querySelectorAll('[data-need]').forEach((a) => {
    a.addEventListener('click', () => { need.value = a.dataset.need; });
  });

  // Modulo: compone l'email per info@areabyte.it
  const form = document.getElementById('form');
  const err = document.getElementById('form-err');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = form.elements;
    const missing = ['nome', 'telefono'].filter((k) => !f[k].value.trim());
    ['nome', 'telefono'].forEach((k) => f[k].setAttribute('aria-invalid', String(missing.includes(k))));
    if (missing.length) { err.hidden = false; f[missing[0]].focus(); return; }
    err.hidden = true;
    const subject = `Richiesta consulenza: ${f.bisogno.value}`;
    const lines = [
      `Nome: ${f.nome.value.trim()}`,
      f.attivita.value.trim() && `Attività: ${f.attivita.value.trim()}`,
      `Telefono: ${f.telefono.value.trim()}`,
      `Richiesta: ${f.bisogno.value}`,
    ].filter(Boolean);
    const msg = f.messaggio.value.trim();
    const body = lines.join('\n') + (msg ? `\n\n${msg}` : '');
    window.location.href = `mailto:info@areabyte.it?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  });

  document.getElementById('year').textContent = new Date().getFullYear();
})();
