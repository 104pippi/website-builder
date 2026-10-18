// Cinema Edera: programmazione, schermo, menu, moduli
(() => {
  const PRENOTA = 'https://www.cinemaedera.it/acquista-on-line.html';
  // Copia della programmazione al momento della pubblicazione: si usa se /api/programma non risponde
  const FALLBACK = /*DATI*/{"aggiornato":"2026-10-18T20:56:20.159Z","film":[{"slug":"primetime-vos-","titolo":"PRIMETIME (VOS)","durata":"110 min","genere":"Drammatico","paese":"USA","regia":"Lance Oppenheim","cast":"Robert Pattinson, Merritt Wever, Skyler Gisondo, Matthew Maher, Phoebe Bridgers","anno":"2026","lingua":"Inglese/US con sottotitoli","locandina":"https://www.cinemaedera.it/_media/images/thumbs/380x600_rifRW7XHYuZhgkvz1pnpdt3ZZlh.jpg","spettacoli":[{"data":"2026-10-18","ora":"21:40","piccolo":false},{"data":"2026-10-21","ora":"21:45","piccolo":false}],"trama":"Nel 2006 il giornalista Chris Hansen si prepara a fare la storia della televisione con To Catch a Predator , il controverso format che, attraverso operazioni sotto copertura e telecamere nascoste, smaschera in diretta tv predatori sessuali colti sul fatto. Mentre il programma diventa un fenomeno nazionale e il suo conduttore un’icona del pubblico, il confine tra informazione, giustizia e spettacolo si fa sempre più ambiguo e il cortocircuito fra cronaca, intrattenimento e voyeurismo televisivo sempre più insostenibile. Robert Pattinson ( Odissea, The Drama - Un segreto è per sempre, The Batman ) è lo straordinario protagonista di un dirompente racconto sul potere dei media, la spettacolarizzazione del male e la vertigine del successo televisivo.","trailer":"https://www.youtube.com/watch?v=oqUNNy-J1Rs"},{"slug":"fatherland","titolo":"FATHERLAND","durata":"82 min","genere":"Drammatico","paese":"Polonia, Germania","regia":"Paweł Pawlikowski","cast":"Sandra Hüller, Anna Madeley, August Diehl, Joanna Kulig, Hanns Zischler","anno":"2026","lingua":"","locandina":"https://www.cinemaedera.it/_media/images/thumbs/380x600_FATHERLAND_1080.jpg","spettacoli":[{"data":"2026-10-18","ora":"16:20","piccolo":false},{"data":"2026-10-18","ora":"18:25","piccolo":false},{"data":"2026-10-18","ora":"20:00","piccolo":false},{"data":"2026-10-19","ora":"18:50","piccolo":false},{"data":"2026-10-20","ora":"17:00","piccolo":true},{"data":"2026-10-20","ora":"20:00","piccolo":false},{"data":"2026-10-21","ora":"17:00","piccolo":false},{"data":"2026-10-21","ora":"20:15","piccolo":false}],"trama":"Cannes Film Festival\n2026 | Vincitore: Prix de la mise en scène\nTelluride Film Festival\n2026 | Vincitore: Silver Medallion\nAmbientato all'apice della Guerra Fredda, il film racconta il rapporto tra lo scrittore Thomas Mann e sua figlia Erika, attrice, giornalista e pilota di rally.\nNel cuore della Guerra Fredda, lo scrittore Thomas Mann e sua figlia, l’attrice, scrittrice e rallista Erika, intraprendono un viaggio su una Buick nera attraverso una Germania divisa e in rovina, dalla Francoforte occupata dagli Alleati alla Weimar controllata dall’Unione Sovietica.","trailer":""},{"slug":"l-estranea","titolo":"L'estranea","durata":"115 min","genere":"Thriller","paese":"Italia","regia":"Paolo Strippoli","cast":"Jasmine Trinca, Adriano Giannini, Romana Maggiora Vergano, Valeria Bruni Tedeschi","anno":"2026","lingua":"","locandina":"https://www.cinemaedera.it/_media/images/thumbs/380x600_l_estranea_locandina_low.jpg","spettacoli":[{"data":"2026-10-18","ora":"14:00","piccolo":false},{"data":"2026-10-18","ora":"16:10","piccolo":false},{"data":"2026-10-18","ora":"18:00","piccolo":false},{"data":"2026-10-19","ora":"17:00","piccolo":false},{"data":"2026-10-19","ora":"19:15","piccolo":true},{"data":"2026-10-20","ora":"19:15","piccolo":false},{"data":"2026-10-21","ora":"19:30","piccolo":false}],"trama":"Strippoli trasforma l'horror in un perturbante dramma familiare.\nUna donna si presenta all’improvviso a casa di sua figlia per raccontarle la verità sulla loro famiglia, segnata da un patto stretto molti anni prima con un’estranea. Un segreto custodito troppo a lungo, che ora torna a reclamare il suo prezzo.","trailer":""},{"slug":"zustissia","titolo":"Zustìssia","durata":"111 min","genere":"Drammatico","paese":"Italia","regia":"Francesco Piras","cast":"Michele Riondino, Fabrizio Ferracane, Paola Giannini, Jacopo Cullin, Valentino Mannias","anno":"2026","lingua":"","locandina":"https://www.cinemaedera.it/_media/images/thumbs/380x600_ZUSTISSIA.jpg","spettacoli":[{"data":"2026-10-18","ora":"15:30","piccolo":true},{"data":"2026-10-18","ora":"19:40","piccolo":true},{"data":"2026-10-19","ora":"17:00","piccolo":true},{"data":"2026-10-20","ora":"17:30","piccolo":false},{"data":"2026-10-21","ora":"18:45","piccolo":true}],"trama":"Un'odissea carceraria raccontata con essenzialità e rigore, tratto dal libro di Mauro Trogu e Beniamino Zuncheddu \" Io sono innocente \".\nIl sardo Beniamino Zuncheddu, mite pastore che non ha mai creato problemi, è in carcere da più di trent'anni per un triplice omicidio per il quale si è sempre dichiarato innocente. Quando ormai ha perso le speranze ed è convinto di finire i suoi giorni in prigione, Beniamino riceve l'inaspettato aiuto di un giovane avvocato, Mario Trogu, deciso a ribaltare quella che ritiene una sentenza ingiusta.","trailer":"https://www.youtube.com/watch?v=y9mbbvKO08o"},{"slug":"je-so-pazzo","titolo":"Je So' Pazzo","durata":"105 min","genere":"Biografico, Drammatico","paese":"Italia","regia":"Nicola Prosatore","cast":"Massimiliano Caiazzo, Mariasole Pollio, Giovanni Ludeno, Giuseppe Brunetti, Leonardo Bianconi, Giampiero De Concilio","anno":"2026","lingua":"","locandina":"https://www.cinemaedera.it/_media/images/thumbs/380x600_Je_So_Pazzo_Verticale_NO_DATA_HD_728x1040.jpg","spettacoli":[{"data":"2026-10-18","ora":"14:15","piccolo":false},{"data":"2026-10-18","ora":"17:40","piccolo":true},{"data":"2026-10-18","ora":"21:45","piccolo":true},{"data":"2026-10-19","ora":"16:45","piccolo":false},{"data":"2026-10-20","ora":"17:00","piccolo":false},{"data":"2026-10-21","ora":"16:45","piccolo":true}],"trama":"Un film capace di restituire le luci e le ombre di un'anima ribelle: quella di Pino Daniele . Un viaggio cinematografico che ripercorre gli anni difficili nei vicoli di Napoli, fino al trionfo artistico che lo ha reso una leggenda. Liberamente tratto dal libro \" Pino Daniele. Tutto quello che mi ha dato emozione viene alla luce\" di Alessandro Daniele.\nTra conflitti familiari, fragilità personali e amori profondi, Pino, un’anima ribelle, trova nella musica un linguaggio per esprimere ciò che non riesce a dire. Non è solo la storia di un artista straordinario che ha rivoluzionato la musica italiana fondendo blues, jazz e tradizione partenopea, ma quella di un uomo in lotta con sé stesso, in cerca di riconciliazione con le sue radici e con l'amore di una città che non ha mai smesso di aspettarlo.","trailer":""},{"slug":"digger","titolo":"Digger","durata":"128 min","genere":"Drammatico, Commedia","paese":"USA","regia":"Alejandro G. Iñárritu","cast":"Tom Cruise, Jesse Plemons, Sandra Hüller, Riz Ahmed, Sophie Wilde, Emma D'Arcy, Robert John Burke, Burn Gorman, Michael Stuhlbarg, John Goodman","anno":"2026","lingua":"","locandina":"https://www.cinemaedera.it/_media/images/thumbs/380x600_DIGGER_new_scaled.jpg","spettacoli":[{"data":"2026-10-18","ora":"21:30","piccolo":false},{"data":"2026-10-20","ora":"21:40","piccolo":false}],"trama":"Il regista premio Oscar® Alejandro G. Iñárritu torna con il suo nuovo film originale DIGGER , con Tom Cruise nel ruolo del protagonista.\nL’uomo più potente del mondo intraprende una missione disperata per dimostrare di essere il salvatore dell’umanità, prima che il disastro da lui stesso provocato distrugga ogni cosa.\nAccanto a Cruise il premio Oscar® Riz Ahmed, John Goodman, la candidata all’Oscar® Sandra Hüller, Michael Stuhlbarg e il candidato all’Oscar® Jesse Plemons.","trailer":"https://www.youtube.com/watch?v=A3984R3krZw"},{"slug":"naza","titolo":"Naza (Solo V.O.S.)","durata":"80 min","genere":"Documentario","paese":"UK","regia":"Yuval Abraham, Rachel Szor","cast":"","anno":"2026","lingua":"","locandina":"https://www.cinemaedera.it/_media/images/thumbs/380x600_IWP_NAZA_artwork_web.jpg","spettacoli":[{"data":"2026-10-18","ora":"14:00","piccolo":true},{"data":"2026-10-18","ora":"20:10","piccolo":false},{"data":"2026-10-21","ora":"18:35","piccolo":false}],"trama":"🏆 Premio speciale della Giuria a Venezia83\nDurante conversazioni segrete che si svolgono di notte sui tetti di Tel Aviv, i meccanismi alla base dello sterminio di massa pianificata da Israele ai danni dei civili palestinesi a Gaza vengono svelati proprio da coloro che li hanno progettati e messi in atto.","trailer":""},{"slug":"dolomitismo-racconti-verticali","titolo":"DOLOMITISMO. Racconti Verticali","durata":"81 min","genere":"Documentario, Montagna","paese":"Italia","regia":"Emanuele Confortin","cast":"","anno":"2026","lingua":"","locandina":"https://www.cinemaedera.it/_media/images/thumbs/380x600_20261019_Treviso_verticale.jpg","spettacoli":[{"data":"2026-10-19","ora":"20:30","piccolo":false}],"trama":"LUNEDI 19 OTTOBRE ore 20.30\nLe vicende degli uomini e delle donne che hanno esplorato le Dolomiti incontrano la storia della Terra. La docuserie «Dolomitismo. Racconti Verticali» , ideata e diretta da Emanuele Confortin e prodotta dalla Fondazione Dolomiti UNESCO , ripercorre alcune ascensioni che hanno segnato la storia del dolomitismo. In ciascuno dei 3 episodi si intrecciano il presente delle emozioni vissute dagli alpinisti contemporanei al passato prossimo delle testimonianze storiche, arrivando al passato remoto del tempo profondo, che ha plasmato questi sublimi paesaggi capaci di raccontare 300 milioni di anni di storia della Terra.\nCAMPANILE BASSO, una normale fuori dal normale\nMARMOLADA, il valore della rinuncia\nCASON DI FORMIN, sul versante più selvaggio","trailer":"https://www.youtube.com/watch?v=7OoPV55tqmA"},{"slug":"fatherland-vos","titolo":"FATHERLAND (V.O.S.)","durata":"82 min","genere":"Drammatico","paese":"Polonia, Germania","regia":"Paweł Pawlikowski","cast":"Sandra Hüller, Anna Madeley, August Diehl, Joanna Kulig, Hanns Zischler","anno":"2026","lingua":"Tedesco con sottotitoli","locandina":"https://www.cinemaedera.it/_media/images/thumbs/380x600_FATHERLAND_1080_VOS.jpg","spettacoli":[{"data":"2026-10-19","ora":"21:30","piccolo":false}],"trama":"Cannes Film Festival\n2026 | Vincitore: Prix de la mise en scène\nTelluride Film Festival\n2026 | Vincitore: Silver Medallion\nNel cuore della Guerra Fredda, lo scrittore Thomas Mann e sua figlia, l’attrice, scrittrice e rallista Erika, intraprendono un viaggio su una Buick nera attraverso una Germania divisa e in rovina, dalla Francoforte occupata dagli Alleati alla Weimar controllata dall’Unione Sovietica.","trailer":""},{"slug":"the-devils-i-diavoli-director-s-cut-4k-solo-vos-","titolo":"THE DEVILS (I DIAVOLI) Director's Cut 4K (Solo VOS)","durata":"113 min","genere":"Drammatico","paese":"Gran Bretagna","regia":"Ken Russell","cast":"Oliver Reed, Max Adrian, Vanessa Redgrave, Dudley Sutton, Gemma Jones","anno":"1970","lingua":"Inglese/EN con sottotitoli","locandina":"https://www.cinemaedera.it/_media/images/thumbs/380x600_diavoli.jpg","spettacoli":[{"data":"2026-10-19","ora":"21:30","piccolo":true},{"data":"2026-10-20","ora":"21:30","piccolo":false},{"data":"2026-10-21","ora":"21:40","piccolo":false}],"trama":"A 55 anni dall’uscita, ‘The Devils’ (I diavoli) di Ken Russel torna sul grande schermo. Un capolavoro incendiario che denunciava senza compromessi la complicità tra Chiesa e potere politico.\n“Il mio film più politico – anzi, l’unico” . Ken Russell.\nDopo la première al 79/o Festival di Cannes, e il passaggio a Il Cinema Ritrovato di Bologna il restauro in 4K della versione integrale del film, finora inedita, così come concepita da Ken Russell nel 1971 sarà a La Compagnia per due giorni, in sei spettacoli.\nQuesta è la versione di The Devils che Ken Russell sperava diventasse un giorno accessibile al pubblico. La ricostruzione fu realizzata nel 2004 sotto la supervisione dello stesso regista e del montatore Michael Bradsell.\nOltre alle brillanti interpretazioni di Oliver Reed e Vanessa Redgrave, The Devils fu il trampolino di lancio per Derek Jarman – qui al suo debutto nel lungometraggio come scenografo – e la conferma per artisti già all’apice della carriera, come il direttore della fotografia Premio Oscar David Watkin e il montatore Michael Bradsell.\nAmbientato nella Francia di Luigi XIII e ispirato ai fatti delle possessioni di Loudun, ‘ The Devils ‘ prende spunto dal libro ‘ The Devils of Loudun’ di Aldous Huxley e dalla pièce di John Whiting. Con il suo stile visionario e provocatorio, il film denunciava la complicità tra Chiesa e potere politico, attirando la censura e subendo pesanti tagli; in Italia venne persino sequestrato. Oggi è considerato uno dei capolavori più radicali del cinema britannico, sostenuto negli anni da critici e registi come Guillermo del Toro. La proiezione al Cinema Ritrovato offrirà finalmente al pubblico la possibilità di riscoprirlo nella sua versione originale e definitiva.","trailer":""},{"slug":"primetime","titolo":"PRIMETIME","durata":"110 min","genere":"Drammatico","paese":"USA","regia":"Lance Oppenheim","cast":"Robert Pattinson, Merritt Wever, Skyler Gisondo, Matthew Maher, Phoebe Bridgers","anno":"2026","lingua":"","locandina":"https://www.cinemaedera.it/_media/images/thumbs/380x600_PRIME.jpg","spettacoli":[{"data":"2026-10-19","ora":"19:20","piccolo":false},{"data":"2026-10-20","ora":"18:45","piccolo":true},{"data":"2026-10-20","ora":"21:00","piccolo":true},{"data":"2026-10-21","ora":"17:15","piccolo":false}],"trama":"Nel 2006 il giornalista Chris Hansen si prepara a fare la storia della televisione con To Catch a Predator , il controverso format che, attraverso operazioni sotto copertura e telecamere nascoste, smaschera in diretta tv predatori sessuali colti sul fatto. Mentre il programma diventa un fenomeno nazionale e il suo conduttore un’icona del pubblico, il confine tra informazione, giustizia e spettacolo si fa sempre più ambiguo e il cortocircuito fra cronaca, intrattenimento e voyeurismo televisivo sempre più insostenibile. Robert Pattinson ( Odissea, The Drama - Un segreto è per sempre, The Batman ) è lo straordinario protagonista di un dirompente racconto sul potere dei media, la spettacolarizzazione del male e la vertigine del successo televisivo.","trailer":"https://www.youtube.com/watch?v=oqUNNy-J1Rs"},{"slug":"una-cosa-vicina","titolo":"Una cosa vicina","durata":"90 min","genere":"Drammatico","paese":"Italia","regia":"Loris G. Nese","cast":"Francesco Di Leva, Mario Di Leva.","anno":"2025","lingua":"","locandina":"https://www.cinemaedera.it/_media/images/thumbs/380x600_WhatsApp_Image_2026_04_15_at_18_28_24.jpeg","spettacoli":[{"data":"2026-10-21","ora":"21:00","piccolo":true}],"trama":"Ingresso libero, senza prenotazione, fino a esaurimento dei posti disponibili.\nAlla serata intervengono il regista Loris G. Nese , Chiara Marotta (produttrice e autrice del montaggio), Raffaele Lazzaroni (esperto di cinema, Edera Film Festival).\nAttraverso il documentario di creazione, il regista Loris G. Nese cerca di ricostruire la propria identità utilizzando immagini d'archivio, suoi film familiari e un'animazione sperimentale.\nNegli anni Novanta un bambino cresce circondato da profondi segreti. Gli uomini della sua famiglia, compreso il padre, muoiono troppo giovani, ma lui non è ancora in grado di capire il perché. Quando scopre che il suo cognome è un marchio in città, ha l'impressione di rivedere la propria vita nei film di gangster e horror che ama, specchio della violenza che gli ha cambiato la vita.","trailer":"https://www.youtube.com/watch?v=iR0MJEjdXEs"}],"evidenza":[{"slug":"the-devils-i-diavoli-director-s-cut-4k-solo-vos-","titolo":"THE DEVILS (I DIAVOLI) DIRECTOR'S CUT 4K (SOLO VOS)","immagine":"https://www.cinemaedera.it/_media/images/thumbs/2100x1250_AipVqRPrqkKA4EhSJjh6RIma9n3.jpg","quando":"SOLO 19-20-21 OTTOBRE","testo":"A 55 anni dall’uscita, ‘The Devils’ (I diavoli) di Ken Russel torna sul grande schermo . Un capolavoro incendiario che denunciava senza compromessi la complicità tra Chiesa e potere politico. V.M. 18"},{"slug":"fatherland-vos","titolo":"FATHERLAND (V.O.S.)","immagine":"https://www.cinemaedera.it/_media/images/thumbs/2100x1250_FATHERLAND_SLIDE_SITO.jpg","quando":"SOLO LUNEDÌ 19 OTTOBRE ore 21.30","testo":"Ambientato all'apice della Guerra Fredda, il film racconta il rapporto tra lo scrittore Thomas Mann e sua figlia Erika, attrice, giornalista e pilota di rally. Miglior Regia al Festival di Cannes 2026."},{"slug":"fatherland","titolo":"FATHERLAND","immagine":"https://www.cinemaedera.it/_media/images/thumbs/2100x1250_FATHERLAND_SLIDE_SITO2.jpg","quando":"","testo":"Ambientato all'apice della Guerra Fredda, il film racconta il rapporto tra lo scrittore Thomas Mann e sua figlia Erika, attrice, giornalista e pilota di rally. Miglior Regia al Festival di Cannes 2026. Dal 16 OTTOBRE"}],"prossimamente":[{"slug":"ragione-e-sentimento","titolo":"Ragione e Sentimento","durata":"132 min","genere":"Drammatico","regia":"Georgia Oakley","cast":"Daisy Edgar-Jones, Bodhi Rae Breathnach, George MacKay, Esme Creed-Miles","lingua":"","locandina":"https://www.cinemaedera.it/_media/images/thumbs/380x600_ragione_e_sentimento.jpg","dal":"2026-10-22"},{"slug":"dio-ride","titolo":"Dio Ride","durata":"114 min","genere":"Commedia","regia":"Giovanni Veronesi","cast":"Pierfrancesco Favino, Alma Noce, Maurizio Lombardi, Silvio Orlando, Francesco Gheghi","lingua":"","locandina":"https://www.cinemaedera.it/_media/images/thumbs/380x600_dioride.jpg","dal":"2026-11-29"},{"slug":"wild-horse-nine","titolo":"Wild Horse Nine","durata":"118 min","genere":"Commedia, Drammatico","regia":"Martin McDonagh","cast":"Sam Rockwell, Steve Buscemi, Parker Posey, John Malkovich, Tom Waits","lingua":"","locandina":"https://www.cinemaedera.it/_media/images/thumbs/380x600_WH9.jpg","dal":"2026-11-05"},{"slug":"the-rocky-horror-picture-show-night","titolo":"THE ROCKY HORROR PICTURE SHOW NIGHT","durata":"100 min","genere":"Musical","regia":"Jim Sharman","cast":"Tim Curry, Susan Sarandon, Barry Bostwick","lingua":"Inglese/US con sottotitoli","locandina":"https://www.cinemaedera.it/_media/images/thumbs/380x600_ROCKY_EDERA.jpg","dal":"2026-10-31"}]};
  const SCHERMO_LOCALE = ['fatherland', 'fatherland-vos', 'the-devils-i-diavoli-director-s-cut-4k-solo-vos-', 'digger', 'l-estranea', 'je-so-pazzo', 'naza'];
  const LOCANDINE_LOCALI = ['primetime-vos-', 'primetime', 'fatherland', 'fatherland-vos', 'l-estranea', 'zustissia', 'je-so-pazzo', 'digger', 'naza', 'dolomitismo-racconti-verticali', 'the-devils-i-diavoli-director-s-cut-4k-solo-vos-', 'una-cosa-vicina', 'ragione-e-sentimento', 'dio-ride', 'wild-horse-nine', 'the-rocky-horror-picture-show-night'];
  const GIORNI = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
  const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
  const riduciMoto = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const daIso = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const minuti = (ora) => { const [h, m] = ora.split(':').map(Number); return h * 60 + m; };
  const dataLunga = (s) => { const d = daIso(s); return `${GIORNI[d.getDay()]} ${d.getDate()} ${MESI[d.getMonth()]}`; };

  // ---------- dati: dal formato del sito attuale a film unici con tutti gli orari ----------
  const bello = (t) => t.replace(/[A-ZÀ-Ý][A-ZÀ-Ý']+/g, (w) => w[0] + w.slice(1).toLowerCase());
  const RE_VOS = /\s*\((solo\s*)?v\.?\s?o\.?\s?s\.?\)\s*/i;
  const base = (slug) => slug.replace(/-(solo-)?vos-?$/, '').replace(/-+$/, '');
  const tramaPulita = (t = '') => t.replace(/[ \t]+([,.;:!?])/g, '$1').trim();
  // premi in testa alla trama ("Cannes Film Festival" + "2026 | Vincitore: ...") in righe brevi a parte
  function htmlTrama(t) {
    const righe = t.split('\n').reduce((acc, r) => {
      if (/^\d{4}\s*\|/.test(r) && acc.length && acc[acc.length - 1].premio) acc[acc.length - 1].testo += `, ${r}`;
      else acc.push({ testo: r, premio: r.length < 70 && !/[.!?…»”"]$/.test(r) });
      return acc;
    }, []);
    return righe.map((r) => `<p${r.premio ? ' class="film__premio"' : ''}>${esc(r.testo)}</p>`).join('');
  }

  function normalizza(dati, live) {
    const oggi = iso(new Date());
    const mappa = new Map();
    for (const f of dati.film || []) {
      const vos = RE_VOS.test(f.titolo) || /sottotitol/i.test(f.lingua || '');
      const id = base(f.slug);
      let film = mappa.get(id);
      if (!film) {
        film = { id, slugs: [], titolo: '', regia: '', cast: '', durata: '', genere: '', paese: '', anno: '', lingua: '', trama: '', trailer: '', locandina: '', spettacoli: [] };
        mappa.set(id, film);
      }
      film.slugs.push(f.slug);
      const principale = !vos || !film.titolo;
      for (const k of ['regia', 'cast', 'durata', 'genere', 'paese', 'anno', 'trama', 'trailer', 'locandina']) {
        if (f[k] && (principale || !film[k])) film[k] = f[k];
      }
      if (principale) film.titolo = bello(f.titolo.replace(RE_VOS, ' ').trim());
      if (vos && f.lingua) film.lingua = f.lingua;
      for (const s of f.spettacoli || []) film.spettacoli.push({ ...s, vos });
    }
    const film = [...mappa.values()];
    for (const f of film) {
      f.spettacoli.sort((a, b) => (a.data + a.ora).localeCompare(b.data + b.ora));
      f.vos = f.spettacoli.some((s) => s.vos);
      f.soloVos = f.vos && f.spettacoli.every((s) => s.vos);
      f.trama = tramaPulita(f.trama);
      const loc = f.slugs.find((s) => LOCANDINE_LOCALI.includes(s));
      f.img = loc ? `assets/img/locandine/${loc}.webp` : f.locandina;
      f.still = f.slugs.find((s) => SCHERMO_LOCALE.includes(s)) || '';
    }
    const tutti = [...new Set(film.flatMap((f) => f.spettacoli.map((s) => s.data)))].sort();
    const futuri = tutti.filter((g) => g >= oggi);
    const prossimamente = (dati.prossimamente || []).map((p) => {
      const loc = LOCANDINE_LOCALI.includes(p.slug) ? `assets/img/locandine/${p.slug}.webp` : p.locandina;
      return { ...p, titolo: bello(p.titolo.replace(RE_VOS, ' ').trim()), img: loc };
    }).filter((p) => !mappa.has(base(p.slug))).sort((a, b) => (a.dal || '9').localeCompare(b.dal || '9'));
    return {
      live, aggiornato: dati.aggiornato, film,
      giorni: futuri.length ? futuri : tutti,
      vecchio: !futuri.length,
      evidenza: (dati.evidenza || []).map((e) => ({ ...e, id: base(e.slug) })),
      prossimamente,
    };
  }

  const firma = (m) => JSON.stringify(m.film.map((f) => [f.id, f.spettacoli.map((s) => s.data + s.ora + (s.piccolo ? 'p' : ''))]));

  let modello = normalizza(FALLBACK, false);
  let giornoScelto = null;
  let soloVos = false;

  // ---------- "Stasera" nell'hero ----------
  function prossimiSpettacoli() {
    const ora = new Date();
    const oggi = iso(ora);
    const adesso = ora.getHours() * 60 + ora.getMinutes();
    for (const g of modello.giorni) {
      if (g < oggi && !modello.vecchio) continue;
      let lista = modello.film.flatMap((f) => f.spettacoli.filter((s) => s.data === g).map((s) => ({ ...s, film: f })));
      if (g === oggi) lista = lista.filter((s) => minuti(s.ora) > adesso - 10);
      if (lista.length) return { giorno: g, lista: lista.sort((a, b) => minuti(a.ora) - minuti(b.ora)) };
    }
    return null;
  }

  function etichettaGiorno(g) {
    const ora = new Date();
    const oggi = iso(ora);
    const domani = iso(new Date(ora.getFullYear(), ora.getMonth(), ora.getDate() + 1));
    if (g === oggi) return ora.getHours() >= 17 ? 'Stasera' : 'Oggi';
    if (g === domani) return 'Domani';
    const n = GIORNI[daIso(g).getDay()];
    return n[0].toUpperCase() + n.slice(1);
  }

  function dettagliSpettacolo(s) {
    return [s.piccolo ? 'Piccolo Edera' : 'Sala Edera', s.vos ? 'versione originale sottotitolata' : ''].filter(Boolean).join(', ');
  }

  function disegnaStasera() {
    const box = $('[data-stasera]');
    const p = prossimiSpettacoli();
    const lista = $('[data-stasera-lista]', box);
    if (!p) {
      $('[data-stasera-quando]', box).textContent = 'In sala';
      $('[data-stasera-data]', box).textContent = '';
      lista.innerHTML = '<li class="stasera__vuoto">Gli orari della prossima settimana escono a breve. Chiama lo <a href="tel:+390422300224">0422 30 02 24</a>.</li>';
      return;
    }
    $('[data-stasera-quando]', box).textContent = etichettaGiorno(p.giorno);
    $('[data-stasera-data]', box).textContent = dataLunga(p.giorno);
    const max = 4;
    lista.innerHTML = p.lista.slice(0, max).map((s) => `
      <li><a class="stasera__riga" href="${PRENOTA}" target="_blank" rel="noopener" aria-label="Prenota ${esc(s.film.titolo)} alle ${s.ora}, ${esc(dettagliSpettacolo(s))}">
        <span class="stasera__ora">${s.ora}</span>
        <span class="stasera__film">${esc(s.film.titolo)}<small>${s.piccolo ? 'Piccolo Edera' : 'Sala Edera'}${s.vos ? ', V.O.S.' : ''}</small></span>
        <span class="stasera__prenota" aria-hidden="true">Prenota</span>
      </a></li>`).join('');
    const altri = p.lista.length - max;
    $('[data-stasera-tutti]', box).textContent = altri > 0 ? `Altri ${altri} spettacoli e tutta la settimana` : 'Tutta la programmazione';
    if (!giornoScelto) giornoScelto = p.giorno;
  }

  // ---------- programmazione a giorni ----------
  function disegnaGiorni() {
    const box = $('[data-giorni]');
    const oggi = iso(new Date());
    if (!modello.giorni.includes(giornoScelto)) giornoScelto = modello.giorni.find((g) => g >= oggi) || modello.giorni[0];
    box.innerHTML = modello.giorni.map((g) => {
      const d = daIso(g);
      const nome = g === oggi ? 'oggi' : GIORNI[d.getDay()].slice(0, 3);
      const sel = g === giornoScelto;
      return `<button class="giorno" type="button" role="tab" aria-selected="${sel}" tabindex="${sel ? 0 : -1}" data-giorno="${g}" aria-label="${dataLunga(g)}">
        <span class="giorno__nome">${nome}</span><span class="giorno__num">${d.getDate()}</span></button>`;
    }).join('');
  }

  function cardFilm(f, spettacoli, g) {
    const ora = new Date();
    const oggi = iso(ora);
    const adesso = ora.getHours() * 60 + ora.getMinutes();
    const meta2 = [f.durata, f.genere, [f.paese, f.anno].filter(Boolean).join(' ')].filter(Boolean).join(', ');
    const tag = [
      f.soloVos ? '<span class="tag tag--vos">Solo V.O.S.</span>' : f.vos ? '<span class="tag tag--vos">Anche in V.O.S.</span>' : '',
    ].join('');
    const chip = spettacoli.map((s) => {
      const passato = g === oggi && minuti(s.ora) < adesso - 10;
      const sotto = [s.piccolo ? '<span class="tag tag--piccolo">Piccolo</span>' : '', s.vos && !f.soloVos ? '<span class="tag tag--vos">V.O.S.</span>' : ''].join('');
      const testo = `<span class="orario__ora">${s.ora}</span>${sotto}`;
      return passato
        ? `<li><span class="orario is-passato" title="Spettacolo già iniziato">${testo}</span></li>`
        : `<li><a class="orario" href="${PRENOTA}" target="_blank" rel="noopener" aria-label="Prenota ${esc(f.titolo)} alle ${s.ora}, ${esc(dettagliSpettacolo(s))}">${testo}</a></li>`;
    }).join('');
    const idTrama = `trama-${f.id}`;
    const dettagli = f.trama || f.cast || f.trailer ? `
      <div class="film__dettagli">
        <button class="film__apri" type="button" aria-expanded="false" aria-controls="${idTrama}">Trama e cast</button>
        <div class="film__trama" id="${idTrama}"><div>
          ${f.trama ? htmlTrama(f.trama) : ''}
          ${f.cast ? `<p class="film__cast">Con ${esc(f.cast)}${f.lingua ? `. Lingua: ${esc(f.lingua)}` : ''}.</p>` : ''}
          ${f.trailer ? `<a class="film__trailer" href="${esc(f.trailer)}" target="_blank" rel="noopener">Guarda il trailer su YouTube</a>` : ''}
        </div></div>
      </div>` : '';
    return `<article class="film" id="film-${f.id}">
      <img class="film__locandina" src="${esc(f.img)}" width="420" height="630" loading="lazy" decoding="async" alt="Locandina di ${esc(f.titolo)}">
      <div class="film__corpo">
        <h3 class="film__titolo">${esc(f.titolo)}</h3>
        ${f.regia ? `<p class="film__meta">di ${esc(f.regia)}</p>` : ''}
        ${meta2 ? `<p class="film__meta">${esc(meta2)}</p>` : ''}
        ${tag ? `<div class="film__tag">${tag}</div>` : ''}
      </div>
      <ul class="orari" aria-label="Orari di ${esc(f.titolo)}">${chip}</ul>
      ${dettagli}
    </article>`;
  }

  function disegnaFilm(animato) {
    const box = $('[data-film-lista]');
    const g = giornoScelto;
    const righe = modello.film
      .map((f) => ({ f, sp: f.spettacoli.filter((s) => s.data === g && (!soloVos || s.vos)) }))
      .filter((r) => r.sp.length)
      .sort((a, b) => minuti(a.sp[0].ora) - minuti(b.sp[0].ora));

    box.innerHTML = righe.length
      ? righe.map((r) => cardFilm(r.f, r.sp, g)).join('')
      : `<div class="film-vuoto"><p>${soloVos ? `Nessun film in lingua originale ${g ? dataLunga(g) : ''}.` : 'Nessuno spettacolo in questo giorno.'}</p>
         ${soloVos ? '<button class="btn btn--linea" type="button" data-togli-filtro>Mostra tutti i film</button>' : ''}</div>`;
    if (animato) { box.classList.remove('is-cambio'); void box.offsetWidth; box.classList.add('is-cambio'); }

    const avviso = $('[data-avviso]');
    const d = g ? daIso(g) : null;
    const natale = d && ((d.getMonth() === 11 && d.getDate() >= 23) || (d.getMonth() === 0 && d.getDate() <= 6));
    if (modello.vecchio) {
      avviso.hidden = false;
      avviso.textContent = 'Questi sono gli orari della settimana scorsa: quelli nuovi stanno arrivando. Per sicurezza chiama lo 0422 30 02 24.';
    } else if (d && d.getDay() === 3 && !natale) {
      avviso.hidden = false;
      avviso.textContent = 'Mercoledì ridotto: biglietto a 7,50 €, studenti, bambini e over 60 a 6,00 €.';
    } else avviso.hidden = true;

    const fonte = $('[data-fonte]');
    if (modello.live && modello.aggiornato) {
      const t = new Date(modello.aggiornato);
      fonte.textContent = `Orari aggiornati alle ${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')} di ${GIORNI[t.getDay()]}.`;
    } else fonte.textContent = '';
  }

  function disegnaProssimamente() {
    const box = $('[data-prossimamente]');
    const sezione = $('#prossimamente');
    if (!modello.prossimamente.length) { sezione.hidden = true; return; }
    sezione.hidden = false;
    const oggi = iso(new Date());
    box.innerHTML = modello.prossimamente.map((p) => {
      const d = p.dal ? daIso(p.dal) : null;
      const quando = d && p.dal >= oggi ? `Dal ${d.getDate()} ${MESI[d.getMonth()]}` : 'In arrivo';
      return `<li class="locandina">
        <img src="${esc(p.img)}" width="420" height="630" loading="lazy" decoding="async" alt="Locandina di ${esc(p.titolo)}">
        <span class="locandina__dal">${quando}</span>
        <h3>${esc(p.titolo)}</h3>
        ${p.regia ? `<p>di ${esc(p.regia)}</p>` : ''}
      </li>`;
    }).join('');
  }

  function disegnaTutto() {
    disegnaStasera();
    disegnaGiorni();
    disegnaFilm(false);
    disegnaProssimamente();
    preparaSchermo();
  }

  // interazioni della programmazione
  $('[data-giorni]').addEventListener('click', (e) => {
    const b = e.target.closest('[data-giorno]');
    if (!b || b.dataset.giorno === giornoScelto) return;
    giornoScelto = b.dataset.giorno;
    $$('.giorno').forEach((x) => { const s = x === b; x.setAttribute('aria-selected', s); x.tabIndex = s ? 0 : -1; });
    disegnaFilm(true);
  });
  $('[data-giorni]').addEventListener('keydown', (e) => {
    if (!['ArrowRight', 'ArrowLeft'].includes(e.key)) return;
    const tutti = $$('.giorno');
    const i = tutti.indexOf(document.activeElement);
    const n = tutti[(i + (e.key === 'ArrowRight' ? 1 : -1) + tutti.length) % tutti.length];
    if (n) { n.focus(); n.click(); }
  });
  const filtro = $('[data-filtro-vos]');
  function impostaFiltro(v) { soloVos = v; filtro.setAttribute('aria-pressed', v); disegnaFilm(true); }
  filtro.addEventListener('click', () => impostaFiltro(!soloVos));
  $('[data-film-lista]').addEventListener('click', (e) => {
    const apri = e.target.closest('.film__apri');
    if (apri) {
      const aperto = apri.getAttribute('aria-expanded') === 'true';
      apri.setAttribute('aria-expanded', !aperto);
      document.getElementById(apri.getAttribute('aria-controls')).classList.toggle('is-aperta', !aperto);
    }
    if (e.target.closest('[data-togli-filtro]')) impostaFiltro(false);
  });
  $$('[data-mostra-vos]').forEach((a) => a.addEventListener('click', () => {
    const conVos = modello.giorni.find((g) => modello.film.some((f) => f.spettacoli.some((s) => s.data === g && s.vos)));
    if (conVos && conVos !== giornoScelto) { giornoScelto = conVos; disegnaGiorni(); }
    impostaFiltro(true);
  }));

  // ---------- lo schermo: proietta i fotogrammi dei film in sala ----------
  const schermo = { lista: [], i: 0, timer: 0, visibile: true };
  const tela = $('.schermo__link');
  const alone = $('[data-alone]');
  const didascalia = $('[data-didascalia]');

  function preparaSchermo() {
    const oggi = iso(new Date());
    const inSala = modello.film.filter((f) => f.spettacoli.some((s) => s.data >= oggi) || modello.vecchio);
    const ordine = modello.evidenza.map((e) => e.id);
    const peso = (f) => { const i = ordine.indexOf(f.id); return i < 0 ? 99 + (20 - f.spettacoli.length) : i; };
    const lista = inSala.filter((f) => f.still).sort((a, b) => peso(a) - peso(b)).map((f) => ({
      id: f.id, titolo: f.titolo, regia: f.regia,
      src: `assets/img/schermo/${f.still}-800.webp`,
      srcset: `assets/img/schermo/${f.still}-800.webp 800w, assets/img/schermo/${f.still}-1600.webp 1600w`,
    }));
    if (lista.length < 2) {
      for (const e of modello.evidenza) {
        if (lista.some((x) => x.id === e.id) || !e.immagine) continue;
        const f = modello.film.find((x) => x.id === e.id);
        lista.push({ id: e.id, titolo: f ? f.titolo : bello(e.titolo.replace(RE_VOS, ' ').trim()), regia: f ? f.regia : '', src: e.immagine, srcset: '' });
      }
    }
    const attuale = schermo.lista[schermo.i];
    if (!attuale) {
      // il primo fotogramma è già nell'HTML (precaricato): la proiezione riparte da lì
      const iniziale = $('.schermo__img--prima')?.dataset.id;
      const k = lista.findIndex((x) => x.id === iniziale);
      if (k > 0) lista.unshift(...lista.splice(k, 1));
      schermo.lista = lista;
      schermo.i = 0;
      if (lista[0] && k < 0) mostraFotogramma(lista[0]);
      else if (lista[0]) aggiornaDidascalia(lista[0]);
      return;
    }
    schermo.lista = lista;
    schermo.i = Math.max(0, lista.findIndex((x) => x.id === attuale.id));
  }

  function aggiornaDidascalia(x) {
    didascalia.innerHTML = testoDidascalia(x);
    tela.href = `#film-${x.id}`;
    tela.dataset.film = x.id;
    alone.style.backgroundImage = `url("${x.src}")`;
  }

  function testoDidascalia(x) {
    return `Sullo schermo: <strong>${esc(x.titolo)}</strong>${x.regia ? `, di ${esc(x.regia)}` : ''}`;
  }

  function mostraFotogramma(x) {
    const vecchia = $('.schermo__img.is-on', tela);
    const img = new Image();
    img.className = 'schermo__img';
    img.alt = `Fotogramma di ${x.titolo}`;
    img.width = 1600; img.height = 900;
    if (x.srcset) { img.srcset = x.srcset; img.sizes = '(min-width: 1100px) 1000px, 100vw'; }
    img.src = x.src;
    const entra = () => {
      tela.append(img);
      requestAnimationFrame(() => requestAnimationFrame(() => {
        img.classList.add('is-on');
        if (vecchia) { vecchia.classList.remove('is-on'); setTimeout(() => vecchia.remove(), 1400); }
      }));
      didascalia.classList.add('is-cambio');
      setTimeout(() => { aggiornaDidascalia(x); didascalia.classList.remove('is-cambio'); }, 450);
    };
    (img.decode ? img.decode() : Promise.resolve()).then(entra, () => {});
  }

  function prossimoFotogramma() {
    if (schermo.lista.length < 2 || !schermo.visibile || document.hidden) return;
    schermo.i = (schermo.i + 1) % schermo.lista.length;
    mostraFotogramma(schermo.lista[schermo.i]);
  }

  tela.addEventListener('click', (e) => {
    const id = tela.dataset.film;
    const f = modello.film.find((x) => x.id === id);
    if (!f) return;
    e.preventDefault();
    const oggi = iso(new Date());
    const g = f.spettacoli.find((s) => s.data >= oggi)?.data || f.spettacoli[0]?.data;
    if (g && g !== giornoScelto) { giornoScelto = g; disegnaGiorni(); }
    if (soloVos && !f.spettacoli.some((s) => s.data === g && s.vos)) { soloVos = false; filtro.setAttribute('aria-pressed', 'false'); }
    disegnaFilm(false);
    document.getElementById(`film-${id}`)?.scrollIntoView({ behavior: riduciMoto ? 'auto' : 'smooth', block: 'center' });
  });

  // ---------- polvere nel fascio del proiettore ----------
  function polvere() {
    const c = $('[data-polvere]');
    if (!c || !c.getContext) return;
    const ctx = c.getContext('2d');
    const dpr = Math.min(devicePixelRatio || 1, 2);
    let w = 0, h = 0, granelli = [], ultimo = 0, attivo = true;
    const nuovo = (inizio) => {
      const y = inizio ? Math.random() : 1;
      const largh = .47 * (1 - y) + .03;
      return { x: .5 + (Math.random() * 2 - 1) * largh, y, r: .5 + Math.random() * 1.5, v: .00025 + Math.random() * .0006, fase: Math.random() * 6.28, a: .25 + Math.random() * .55 };
    };
    const misura = () => {
      const r = c.getBoundingClientRect();
      w = r.width; h = r.height;
      c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round(Math.min(70, Math.max(30, w / 14)));
      granelli = Array.from({ length: n }, () => nuovo(true));
    };
    const disegna = (t) => {
      ctx.clearRect(0, 0, w, h);
      for (const g of granelli) {
        g.y -= g.v * (riduciMoto ? 0 : 1) * 16;
        g.x += Math.sin(t / 2200 + g.fase) * .00012 * 16;
        if (g.y < 0) Object.assign(g, nuovo(false));
        const largh = .47 * (1 - g.y) + .03;
        const dentro = 1 - Math.min(1, Math.abs(g.x - .5) / largh);
        const luce = g.a * Math.min(1, dentro * 2.2) * (.55 + .45 * Math.sin(t / 700 + g.fase)) * (1 - g.y * .6);
        if (luce <= .02) continue;
        ctx.fillStyle = `rgba(255, 244, 214, ${luce.toFixed(3)})`;
        ctx.beginPath(); ctx.arc(g.x * w, g.y * h, g.r, 0, 6.283); ctx.fill();
      }
    };
    const ciclo = (t) => {
      if (!attivo) return;
      if (t - ultimo > 32) { disegna(t); ultimo = t; }
      requestAnimationFrame(ciclo);
    };
    misura();
    addEventListener('resize', () => { misura(); if (riduciMoto) disegna(0); });
    if (riduciMoto) { disegna(0); return; }
    new IntersectionObserver(([e]) => {
      const era = attivo; attivo = e.isIntersecting;
      if (attivo && !era) requestAnimationFrame(ciclo);
    }).observe($('.hero'));
    requestAnimationFrame(ciclo);
  }

  // ---------- accensione dello schermo (unico momento orchestrato) ----------
  function accendi() {
    const prima = $('.schermo__img.is-on');
    let fatto = false;
    const via = () => { if (fatto) return; fatto = true; document.documentElement.classList.add('is-acceso'); };
    if (prima && !prima.complete) { prima.addEventListener('load', via, { once: true }); setTimeout(via, 1200); } else via();
  }

  // ---------- testata, menu, barra mobile, cronologia ----------
  const testata = $('[data-testata]');
  const barra = $('.barra-mobile');
  const crono = $('[data-cronologia]');
  const voci = crono ? $$('li', crono) : [];
  let inAttesa = false;
  function suScroll() {
    inAttesa = false;
    const y = scrollY;
    testata.classList.toggle('is-pieno', y > 12);
    barra.classList.toggle('is-visibile', y > 160);
    if (crono) {
      const r = crono.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (innerHeight * .62 - r.top) / r.height));
      crono.style.setProperty('--p', p.toFixed(4));
      const soglia = p * r.height;
      voci.forEach((li) => li.classList.toggle('is-raggiunto', li.offsetTop + 14 <= soglia));
    }
  }
  addEventListener('scroll', () => { if (!inAttesa) { inAttesa = true; requestAnimationFrame(suScroll); } }, { passive: true });
  addEventListener('resize', suScroll);

  const menuBtn = $('[data-menu-btn]');
  const chiudiMenu = () => { document.body.classList.remove('menu-aperto'); menuBtn.setAttribute('aria-expanded', 'false'); };
  menuBtn.addEventListener('click', () => {
    const aperto = document.body.classList.toggle('menu-aperto');
    menuBtn.setAttribute('aria-expanded', aperto);
  });
  $$('#menu a').forEach((a) => a.addEventListener('click', chiudiMenu));
  addEventListener('keydown', (e) => { if (e.key === 'Escape') chiudiMenu(); });

  // ---------- moduli: compongono l'email per il cinema ----------
  $$('[data-modulo]').forEach((form) => form.addEventListener('submit', (e) => {
    e.preventDefault();
    let ok = true;
    $$('[required]', form).forEach((el) => {
      const vuoto = !el.value.trim();
      el.classList.toggle('is-errore', vuoto);
      el.setAttribute('aria-invalid', vuoto);
      if (vuoto && ok) { el.focus(); ok = false; }
    });
    if (!ok) return;
    const righe = $$('input, textarea', form).filter((el) => el.value.trim()).map((el) => `${el.name}: ${el.value.trim()}`);
    const oggetto = form.dataset.modulo === 'scuole' ? 'Cineforum per le scuole: richiesta di proiezione' : 'Messaggio dal sito';
    location.href = `mailto:info@cinemaedera.it?subject=${encodeURIComponent(oggetto)}&body=${encodeURIComponent(righe.join('\n') + '\n')}`;
  }));

  $$('[data-anno]').forEach((el) => { el.textContent = new Date().getFullYear(); });

  // ---------- avvio ----------
  disegnaTutto();
  suScroll();
  accendi();
  polvere();

  new IntersectionObserver(([e]) => { schermo.visibile = e.isIntersecting; }).observe($('.schermo'));
  setTimeout(() => { prossimoFotogramma(); schermo.timer = setInterval(prossimoFotogramma, 5500); }, 4800);

  // programmazione aggiornata dal sito del cinema (funzione Vercel /api/programma)
  const ctrl = new AbortController();
  const limite = setTimeout(() => ctrl.abort(), 8000);
  fetch('/api/programma', { signal: ctrl.signal })
    .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
    .then((d) => {
      clearTimeout(limite);
      if (!d.film || !d.film.length) return;
      const nuovo = normalizza(d, true);
      const cambiato = firma(nuovo) !== firma(modello);
      modello = nuovo;
      if (cambiato) disegnaTutto(); else disegnaFilm(false);
    })
    .catch(() => {});
})();
