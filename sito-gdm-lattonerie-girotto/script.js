(() => {
  const ridotto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const desktop = matchMedia('(min-width: 980px)');
  const WA = '393275767229';

  // Anno nel footer
  document.querySelectorAll('[data-anno]').forEach((el) => { el.textContent = new Date().getFullYear(); });

  // Titolo hero: una parola alla volta
  document.querySelectorAll('[data-parole]').forEach((el) => {
    const parole = el.textContent.trim().split(/ +/);
    el.textContent = '';
    parole.forEach((p, i) => {
      const fuori = document.createElement('span');
      const dentro = document.createElement('span');
      fuori.className = 'parola';
      dentro.textContent = p;
      dentro.style.setProperty('--i', i);
      fuori.appendChild(dentro);
      el.appendChild(fuori);
      if (i < parole.length - 1) el.appendChild(document.createTextNode(' '));
    });
  });

  // Testata e menu mobile
  const testata = document.getElementById('testata');
  const menuBtn = testata.querySelector('.testata__menu');
  const chiudiMenu = () => {
    testata.classList.remove('is-aperto');
    menuBtn.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('menu-aperto');
  };
  menuBtn.addEventListener('click', () => {
    const aperto = testata.classList.toggle('is-aperto');
    menuBtn.setAttribute('aria-expanded', String(aperto));
    document.body.classList.toggle('menu-aperto', aperto);
  });
  testata.querySelectorAll('.testata__nav a').forEach((a) => a.addEventListener('click', chiudiMenu));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') chiudiMenu(); });

  // Comparsa al passaggio: le foto si srotolano come una lamiera, partendo poco prima di entrare nello schermo
  const osserva = new IntersectionObserver((voci) => {
    voci.forEach((v) => {
      if (!v.isIntersecting) return;
      v.target.classList.add('visto');
      osserva.unobserve(v.target);
    });
  }, { rootMargin: '0px 0px 12% 0px', threshold: 0 });
  document.querySelectorAll('.srotola, .fiducia').forEach((el) => osserva.observe(el));
  document.querySelectorAll('.opera').forEach((el, i) => {
    el.style.setProperty('--d', `${(i % 4) * 60}ms`);
    osserva.observe(el);
  });

  // Servizi: l'immagine accanto all'indice segue la voce attiva
  const servizi = [...document.querySelectorAll('.servizio')];
  const palco = [...document.querySelectorAll('.servizi__cornice img')];
  const attiva = (i) => {
    servizi.forEach((s, j) => {
      s.classList.toggle('is-attivo', i === j);
      s.querySelector('.servizio__testa').setAttribute('aria-pressed', String(i === j));
    });
    palco.forEach((img, j) => img.classList.toggle('is-attivo', i === j));
  };
  servizi.forEach((s, i) => {
    const testa = s.querySelector('.servizio__testa');
    s.addEventListener('mouseenter', () => { if (desktop.matches) attiva(i); });
    testa.addEventListener('click', () => attiva(i));
    testa.addEventListener('focus', () => attiva(i));
  });
  const centro = new IntersectionObserver((voci) => {
    if (!desktop.matches) return;
    voci.forEach((v) => { if (v.isIntersecting) attiva(servizi.indexOf(v.target)); });
  }, { rootMargin: '-42% 0px -42% 0px' });
  servizi.forEach((s) => centro.observe(s));

  // Filtri dei lavori
  const filtri = document.querySelectorAll('.filtro');
  const opere = document.querySelectorAll('.opera');
  filtri.forEach((f) => f.addEventListener('click', () => {
    const scelta = f.dataset.filtro;
    filtri.forEach((x) => x.setAttribute('aria-pressed', String(x === f)));
    let k = 0;
    opere.forEach((o) => {
      const ok = scelta === 'tutti' || o.dataset.tipo.split(' ').includes(scelta);
      o.hidden = !ok;
      if (!ok) return;
      o.classList.remove('entra');
      void o.offsetWidth;
      o.style.setProperty('--d', `${(k++ % 8) * 60}ms`);
      o.classList.add('visto', 'entra');
    });
  }));

  // Prima / dopo
  const confronto = document.querySelector('.confronto');
  if (confronto) {
    const cursore = confronto.querySelector('.confronto__cursore');
    let toccato = false;
    const imposta = (v) => {
      const pos = Math.max(0, Math.min(100, v));
      confronto.style.setProperty('--pos', `${pos}%`);
      cursore.value = Math.round(pos);
    };
    const daPuntatore = (e) => {
      const r = confronto.getBoundingClientRect();
      imposta(((e.clientX - r.left) / r.width) * 100);
    };
    let trascina = false;
    confronto.addEventListener('pointerdown', (e) => {
      toccato = true;
      trascina = true;
      confronto.setPointerCapture(e.pointerId);
      daPuntatore(e);
    });
    confronto.addEventListener('pointermove', (e) => { if (trascina) daPuntatore(e); });
    ['pointerup', 'pointercancel'].forEach((t) => confronto.addEventListener(t, () => { trascina = false; }));
    cursore.addEventListener('input', () => { toccato = true; imposta(+cursore.value); });

    // Un solo gesto dimostrativo quando il confronto entra in vista
    if (!ridotto) {
      const tappe = [[0, 50], [900, 78], [1900, 26], [2700, 50]];
      const morbido = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
      const dimostra = () => {
        const inizio = performance.now();
        const passo = (ora) => {
          if (toccato) return;
          const t = ora - inizio;
          let i = 0;
          while (i < tappe.length - 2 && t > tappe[i + 1][0]) i++;
          const [t0, v0] = tappe[i];
          const [t1, v1] = tappe[i + 1];
          const p = Math.min(1, (t - t0) / (t1 - t0));
          imposta(v0 + (v1 - v0) * morbido(p));
          if (t < tappe[tappe.length - 1][0]) requestAnimationFrame(passo);
        };
        requestAnimationFrame(passo);
      };
      const vedi = new IntersectionObserver((voci) => {
        if (voci[0].isIntersecting) { vedi.disconnect(); setTimeout(dimostra, 350); }
      }, { threshold: 0.6 });
      vedi.observe(confronto);
    }
  }

  // Tecniche di posa: schede con disegno che si traccia
  const tabs = [...document.querySelectorAll('[role="tab"]')];
  const pannelli = tabs.map((t) => document.getElementById(t.getAttribute('aria-controls')));
  const disegna = (p) => {
    p.classList.remove('disegna');
    void p.offsetWidth;
    p.classList.add('disegna');
  };
  const seleziona = (i, metti) => {
    tabs.forEach((t, j) => {
      const on = i === j;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      pannelli[j].hidden = !on;
    });
    disegna(pannelli[i]);
    if (metti) tabs[i].focus();
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => seleziona(i));
    t.addEventListener('keydown', (e) => {
      const n = tabs.length;
      const mappa = { ArrowRight: (i + 1) % n, ArrowDown: (i + 1) % n, ArrowLeft: (i - 1 + n) % n, ArrowUp: (i - 1 + n) % n, Home: 0, End: n - 1 };
      if (e.key in mappa) { e.preventDefault(); seleziona(mappa[e.key], true); }
    });
  });
  const tecniche = document.getElementById('tecniche');
  if (tecniche && pannelli[0]) {
    const vedi = new IntersectionObserver((voci) => {
      if (!voci[0].isIntersecting) return;
      vedi.disconnect();
      const attivo = pannelli.find((p) => !p.hidden) || pannelli[0];
      disegna(attivo);
    }, { threshold: 0.3 });
    vedi.observe(tecniche);
  }

  // Barra mobile: compare quando i bottoni dell'hero escono dallo schermo
  const barra = document.querySelector('.barra-mobile');
  const azioni = document.querySelector('.hero__azioni');
  if (barra && azioni) {
    new IntersectionObserver((voci) => {
      barra.classList.toggle('is-visibile', !voci[0].isIntersecting && voci[0].boundingClientRect.top < 0);
    }).observe(azioni);
  }

  // Scorrimento: testata piena, parallasse dell'hero, avanzamento dei passi
  const foto = document.querySelector('.hero__foto');
  const passi = document.querySelector('.passi');
  const singoli = passi ? [...passi.querySelectorAll('.passo')] : [];
  let inAttesa = false;
  const aggiorna = () => {
    inAttesa = false;
    const y = window.scrollY;
    testata.classList.toggle('is-pieno', y > 40);
    if (foto && !ridotto && y < window.innerHeight * 1.2) {
      foto.style.transform = `translate3d(0, ${y * 0.28}px, 0)`;
    }
    if (passi) {
      const r = passi.getBoundingClientRect();
      const linea = window.innerHeight * 0.62;
      const p = Math.max(0, Math.min(1, (linea - r.top) / (r.height - 60)));
      passi.style.setProperty('--avanz', p.toFixed(3));
      singoli.forEach((s) => s.classList.toggle('raggiunto', s.getBoundingClientRect().top + 24 < linea));
    }
  };
  window.addEventListener('scroll', () => {
    if (!inAttesa) { inAttesa = true; requestAnimationFrame(aggiorna); }
  }, { passive: true });
  window.addEventListener('resize', aggiorna);
  aggiorna();

  // Modulo: compone il messaggio e apre WhatsApp
  const modulo = document.getElementById('modulo');
  if (modulo) {
    const errore = document.getElementById('modulo-errore');
    modulo.addEventListener('submit', (e) => {
      e.preventDefault();
      const obbligatori = ['nome', 'comune', 'lavoro'].map((n) => modulo.elements[n]);
      const mancanti = obbligatori.filter((c) => !c.value.trim());
      obbligatori.forEach((c) => c.setAttribute('aria-invalid', String(mancanti.includes(c))));
      if (mancanti.length) {
        errore.textContent = 'Per inviare la richiesta servono nome, comune del cantiere e tipo di lavoro.';
        errore.hidden = false;
        mancanti[0].focus();
        return;
      }
      errore.hidden = true;
      const d = Object.fromEntries(new FormData(modulo));
      const righe = [
        `Buongiorno, sono ${d.nome.trim()}.`,
        `Vorrei un sopralluogo gratuito per: ${d.lavoro}.`,
        `Cantiere a: ${d.comune.trim()}`,
      ];
      if (d.telefono && d.telefono.trim()) righe.push(`Telefono: ${d.telefono.trim()}`);
      if (d.messaggio && d.messaggio.trim()) righe.push('', d.messaggio.trim());
      const url = `https://wa.me/${WA}?text=${encodeURIComponent(righe.join('\n'))}`;
      const finestra = window.open(url, '_blank');
      if (finestra) finestra.opener = null;
      else window.location.href = url;
    });
  }
})();
