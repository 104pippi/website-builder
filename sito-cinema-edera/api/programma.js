// Programmazione del Cinema Edera letta dal sito attuale (cinemaedera.it) e restituita in JSON.
// Vercel la tiene in cache: al massimo una lettura ogni 30 minuti.
const ORIGINE = 'https://www.cinemaedera.it';
const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
const ENTITA = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ', rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”', hellip: '…', ndash: '–', mdash: '—', laquo: '«', raquo: '»', egrave: 'è', eacute: 'é', agrave: 'à', aacute: 'á', igrave: 'ì', iacute: 'í', ograve: 'ò', oacute: 'ó', ugrave: 'ù', uacute: 'ú', Egrave: 'È', Eacute: 'É', Agrave: 'À', Igrave: 'Ì', Ograve: 'Ò', Ugrave: 'Ù', ccedil: 'ç', ntilde: 'ñ', ouml: 'ö', uuml: 'ü', auml: 'ä', szlig: 'ß', reg: '®', copy: '©', trade: '™', deg: '°', euro: '€' };

const entita = (s) => s
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&([a-z]+);/gi, (m, n) => ENTITA[n] ?? m);
const testo = (s = '') => entita(s.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
// come testo(), ma tiene un a capo tra un paragrafo e l'altro
const paragrafi = (s = '') => entita(s.replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|h\d|div|li)>/gi, '\n').replace(/<[^>]+>/g, ' '))
  .split('\n').map((r) => r.replace(/\s+/g, ' ').trim()).filter(Boolean).join('\n');
const primo = (re, s) => { const m = re.exec(s); return m ? m[1] : ''; };
const assoluto = (u) => (u && u.startsWith('/') ? ORIGINE + u : u);

// "Lunedì 19 Ottobre" -> "2026-10-19" (l'anno si deduce da oggi: a dicembre gennaio è l'anno dopo)
function data(etichetta, oggi = new Date()) {
  const m = /(\d{1,2})\s+([a-zà-ù]+)/i.exec(testo(etichetta).toLowerCase());
  if (!m) return null;
  const mese = MESI.indexOf(m[2]);
  if (mese < 0) return null;
  let anno = oggi.getFullYear();
  if (mese - oggi.getMonth() < -6) anno += 1;
  if (mese - oggi.getMonth() > 6) anno -= 1;
  return `${anno}-${String(mese + 1).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}

function dettagli(blocco) {
  const d = {};
  for (const [, k, v] of blocco.matchAll(/<p><strong>([^<]+)<\/strong>\s*:\s*([\s\S]*?)<\/p>/g)) d[testo(k).toLowerCase()] = testo(v);
  return d;
}

function spettacoli(blocco) {
  const out = [];
  for (const gruppo of blocco.split('time-select__group').slice(1)) {
    const giorno = data(primo(/time-select__place">([\s\S]*?)<\/p>/, gruppo));
    if (!giorno) continue;
    for (const [li] of gruppo.matchAll(/<li class="time-select__item"[\s\S]*?<\/li>/g)) {
      const ora = primo(/>\s*(?:<span class="Piccolo">P<\/span>\s*)?(\d{1,2}:\d{2})\s*</, li.replace(/data-content="[^"]*"/, ''));
      if (ora) out.push({ data: giorno, ora: ora.padStart(5, '0'), piccolo: li.includes('class="Piccolo"') });
    }
  }
  return out;
}

async function pagina(percorso) {
  const r = await fetch(ORIGINE + percorso, {
    headers: { 'user-agent': 'Mozilla/5.0 (compatible; anteprima-cinema-edera)' },
    signal: AbortSignal.timeout(6000),
  });
  if (!r.ok) throw new Error(`${percorso}: HTTP ${r.status}`);
  return r.text();
}

async function scheda(slug) {
  try {
    const h = await pagina(`/scheda-film/${slug}.html`);
    const trama = paragrafi(primo(/Trama<\/h2>([\s\S]*?)<h2 class="page-heading">/, h));
    return { trama, trailer: primo(/href="(https:\/\/www\.youtube\.com\/watch\?v=[\w-]+)"/, h) };
  } catch {
    return { trama: '', trailer: '' };
  }
}

async function raccogli() {
  const [settimana, home, prossime] = await Promise.all([
    pagina('/i-film-della-settimana.html'),
    pagina('/').catch(() => ''),
    pagina('/prossimamente.html').catch(() => ''),
  ]);

  const film = [];
  for (const blocco of settimana.split('<!-- Movie preview item -->').slice(1)) {
    const slug = primo(/href='\/scheda-film\/([^']+)\.html'/, blocco);
    if (!slug || film.some((f) => f.slug === slug)) continue;
    const d = dettagli(blocco);
    film.push({
      slug,
      titolo: testo(primo(/class="movie__title[^"]*">([\s\S]*?)<\/a>/, blocco)),
      durata: testo(primo(/class="movie__time">([\s\S]*?)<\/p>/, blocco)),
      genere: d.genere || '', paese: d.paese || '', regia: d.regia || '', cast: d.cast || '', anno: d.anno || '', lingua: d.lingua || '',
      locandina: assoluto(primo(/movie__images">[\s\S]*?<img src="([^"]+)"/, blocco)),
      spettacoli: spettacoli(blocco),
    });
  }
  if (!film.length) throw new Error('nessun film trovato nella pagina della settimana');

  const extra = await Promise.all(film.map((f) => scheda(f.slug)));
  film.forEach((f, i) => Object.assign(f, extra[i]));

  const evidenza = [...home.matchAll(/<li class="item "[\s\S]*?background-image:url\(([^)]+)\)[\s\S]*?class="item-title ">([\s\S]*?)<\/h3>[\s\S]*?caption-movie-slide ">([\s\S]*?)<\/div>[\s\S]*?href="\/scheda-film\/([^"]+)\.html"/g)]
    .map(([, img, titolo, caption, slug]) => ({
      slug, titolo: testo(titolo), immagine: assoluto(img),
      quando: testo(primo(/<h3>([\s\S]*?)<\/h3>/, caption)),
      testo: testo(primo(/<h2>([\s\S]*?)<\/h2>/, caption)),
    }));

  const prossimamente = prossime.split('<!-- Movie preview item -->').slice(1).map((blocco) => {
    const d = dettagli(blocco);
    const dal = primo(/Dal (\d\d\/\d\d\/\d{4})/, testo(blocco));
    return {
      slug: primo(/href='\/scheda-film\/([^']+)\.html'/, blocco),
      titolo: testo(primo(/class="movie__title[^"]*">([\s\S]*?)<\/a>/, blocco)),
      durata: testo(primo(/class="movie__time">([\s\S]*?)<\/p>/, blocco)),
      genere: d.genere || '', regia: d.regia || '', cast: d.cast || '', lingua: d.lingua || '',
      locandina: assoluto(primo(/movie__images">[\s\S]*?<img src="([^"]+)"/, blocco)),
      dal: dal ? dal.split('/').reverse().join('-') : '',
    };
  }).filter((f) => f.slug);

  return { aggiornato: new Date().toISOString(), fonte: ORIGINE, film, evidenza, prossimamente };
}

module.exports = async function handler(req, res) {
  try {
    const dati = await raccogli();
    res.setHeader('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=86400');
    res.status(200).json(dati);
  } catch (e) {
    res.setHeader('Cache-Control', 'no-store');
    res.status(502).json({ errore: String(e.message || e) });
  }
};
module.exports.raccogli = raccogli;
