/* AL Noleggio — catalogo: ricerca, reparti, categorie, richiesta su WhatsApp per ogni attrezzo */
(() => {
  const { caricaCatalogo, cerca, linkWa, testoAttrezzo } = window.ALN;
  const $ = (s, r = document) => r.querySelector(s);
  const REPARTI = [
    ['tutti', 'Tutto'], ['edilizia', 'Edilizia'], ['giardino', 'Giardinaggio'], ['sollevamento', 'Sollevamento'],
    ['pulizia', 'Pulizia'], ['furgoni', 'Furgoni e mezzi'], ['clima', 'Clima ed eventi'], ['luce', 'Luce e corrente'], ['usato', 'Usato']
  ];
  const LAVORI = {
    demolire: { t: 'Demolire e forare', c: [13], re: /demol|martell|perforat|tassell|carot/ },
    pavimenti: { t: 'Levigare pavimenti', c: [16] },
    giardino: { t: 'Giardino e potatura', r: 'giardino' },
    altezza: { t: 'Lavori in altezza', c: [27, 44, 28, 29, 30, 32] },
    pulire: { t: 'Pulire', r: 'pulizia' },
    trasporto: { t: 'Traslochi e trasporto', c: [2, 53, 54, 3, 4, 31, 52] },
    clima: { t: 'Scaldare o asciugare', c: [41, 6, 7] },
    eventi: { t: 'Feste ed eventi', c: [8, 9, 10, 11] }
  };
  const PAGINA = 40;
  const griglia = $('#griglia'), input = $('#cerca-cat'), pill = $('#pillole'), sel = $('#sottocat'), conta = $('#conteggio'), altri = $('#altri'), vuoto = $('#nessuno'), titolo = $('#titolo-lavoro');
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const par = new URLSearchParams(location.search);
  const stato = { q: par.get('q') || '', r: par.get('r') || 'tutti', c: +par.get('c') || 0, lavoro: par.get('lavoro') || '', n: PAGINA };
  if (!REPARTI.some(([k]) => k === stato.r)) stato.r = 'tutti';
  if (stato.lavoro && !LAVORI[stato.lavoro]) stato.lavoro = '';
  input.value = stato.q;

  caricaCatalogo().then((d) => {
    if (stato.c && d.catMap.has(stato.c)) stato.r = d.catMap.get(stato.c).r;
    const conteggi = {}; d.items.forEach((x) => { conteggi[x.r] = (conteggi[x.r] || 0) + 1; });
    pill.innerHTML = REPARTI.map(([k, n]) => `<button type="button" data-r="${k}" aria-pressed="${k === stato.r}">${n}<span class="k">${k === 'tutti' ? d.items.length : conteggi[k] || 0}</span></button>`).join('');

    const sottocat = () => {
      const cats = [...d.catMap.values()].filter((c) => stato.r === 'tutti' || c.r === stato.r).sort((a, b) => a.n.localeCompare(b.n, 'it'));
      sel.innerHTML = `<option value="0">Tutte le categorie</option>` + cats.map((c) => `<option value="${c.id}"${c.id === stato.c ? ' selected' : ''}>${esc(c.n)} (${c.k})</option>`).join('');
    };

    // senza ricerca si parte dagli attrezzi, nell'ordine dei reparti; auto e furgoni dopo
    const pos = Object.fromEntries(REPARTI.map(([k], i) => [k, i]));
    const vetrina = d.items.slice().sort((a, b) => pos[a.r] - pos[b.r]);

    const filtra = () => {
      let l = stato.q.trim().length > 1 ? cerca(d.items, stato.q) : vetrina.slice();
      if (stato.lavoro) {
        const L = LAVORI[stato.lavoro];
        l = l.filter((x) => (L.r && x.r === L.r) || (L.c && L.c.includes(x.c)) || (L.re && x.r === 'edilizia' && L.re.test(x.hn)));
      }
      if (stato.r !== 'tutti') l = l.filter((x) => x.r === stato.r);
      if (stato.c) l = l.filter((x) => x.c === stato.c);
      return l;
    };

    const scheda = (x) => `<li class="scheda-cat">
      ${x.v ? '<span class="vendita">In vendita</span>' : ''}
      <div class="img">${x.x ? '<svg class="senza-foto" aria-hidden="true"><use href="#i-chiave"/></svg>' : `<img src="assets/img/cat/${x.i}.webp" width="${x.w}" height="${x.h}" alt="${esc(x.n)}" loading="lazy" decoding="async">`}</div>
      <div class="testo"><h3>${esc(x.n)}</h3>${x.m ? `<p class="modello">${esc(x.m)}</p>` : ''}<p class="cat">${esc(x.cn)}</p></div>
      <a class="azione" target="_blank" rel="noopener" href="${linkWa(testoAttrezzo(x.n + (x.m ? ` (${x.m})` : ''), x.v))}" aria-label="${x.v ? 'Chiedi informazioni' : 'Chiedi disponibilità'} su WhatsApp: ${esc(x.n)}"><svg aria-hidden="true"><use href="#i-wa"/></svg>Chiedi<span class="extra">&nbsp;${x.v ? 'informazioni' : 'disponibilità'}</span></a>
    </li>`;

    const disegna = (aggiungi) => {
      const l = filtra();
      const mostra = l.slice(aggiungi ? stato.n - PAGINA : 0, stato.n);
      if (aggiungi) griglia.insertAdjacentHTML('beforeend', mostra.map(scheda).join(''));
      else griglia.innerHTML = mostra.map(scheda).join('');
      conta.textContent = `${l.length} ${l.length === 1 ? 'articolo' : 'articoli'}`;
      altri.hidden = l.length <= stato.n;
      vuoto.hidden = l.length > 0;
      if (!l.length) {
        $('#nessuno-q').textContent = stato.q ? `“${stato.q}”` : 'questi filtri';
        $('#nessuno-wa').href = linkWa(`Buongiorno, mi servirebbe a noleggio: ${stato.q || 'un attrezzo'}. Lo avete o potete trovarlo?`);
      }
      titolo.hidden = !stato.lavoro;
      if (stato.lavoro) titolo.querySelector('b').textContent = LAVORI[stato.lavoro].t;
      const u = new URLSearchParams();
      if (stato.q) u.set('q', stato.q); if (stato.r !== 'tutti') u.set('r', stato.r); if (stato.c) u.set('c', stato.c); if (stato.lavoro) u.set('lavoro', stato.lavoro);
      history.replaceState(null, '', `${location.pathname}${u.toString() ? '?' + u : ''}`);
    };

    let t;
    input.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { stato.q = input.value; stato.n = PAGINA; disegna(); }, 140); });
    $('#form-cat').addEventListener('submit', (e) => { e.preventDefault(); stato.q = input.value; stato.n = PAGINA; disegna(); input.blur(); });
    pill.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      stato.r = b.dataset.r; stato.c = 0; stato.n = PAGINA;
      pill.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', x === b));
      sottocat(); disegna();
    });
    sel.addEventListener('change', () => { stato.c = +sel.value; stato.n = PAGINA; disegna(); });
    titolo.querySelector('button').addEventListener('click', () => { stato.lavoro = ''; stato.n = PAGINA; disegna(); });
    altri.querySelector('button').addEventListener('click', () => { stato.n += PAGINA; disegna(true); });
    // carica altri arrivando in fondo
    new IntersectionObserver(([v]) => { if (v.isIntersecting && !altri.hidden) { stato.n += PAGINA; disegna(true); } }, { rootMargin: '600px' }).observe(altri);

    sottocat(); disegna();
    const attivo = pill.querySelector('[aria-pressed="true"]');
    if (attivo) attivo.scrollIntoView({ inline: 'center', block: 'nearest' });
  });
})();
