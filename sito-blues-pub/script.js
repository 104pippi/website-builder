// Blues Pub, demo: menù dal listino del locale, testata, barra, stato "aperto adesso", mappa al tocco, pinta 3D.

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const ridotto = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- Menù (listino del Blues Pub, gennaio 2026) ---------- */
// voce: [nome, descrizione, prezzo, extra] ; opzioni in coda: {v: 1 vegetariano | 2 vegano, b: birra consigliata}
const v1 = { v: 1 }, v2 = { v: 2 };
const b = (birra, v) => ({ b: birra, v });

const MENU = [
  { id: 'spina', nome: 'Alla spina', nota: 'Le classiche ci sono sempre; le artigianali cambiano con la stagione.', gruppi: [
    { titolo: 'Le classiche', voci: [
      ['Jupiler', 'Bionda belga dal gusto raffinato, leggermente luppolata e rinfrescante. La chiara più bevuta in Belgio.', 'da € 3,00', '25 cl € 3,00 · 40 cl € 5,00 · 5,2% vol.'],
      ['Leffe Blonde', "Birra d'abbazia, doppio malto, corposa e vellutata e allo stesso tempo fine, per i suoi profumi.", 'da € 4,00', '25 cl € 4,00 · 40 cl € 6,00 · 6,6% vol.'],
      ['Hoegaarden', "Bianca di frumento rifermentata, con bucce d'arancia, curaçao e coriandolo. Amabile e rinfrescante.", 'da € 4,00', '25 cl € 4,00 · 50 cl € 6,50 · 4,9% vol.'],
      ['Leffe Rouge', "Birra d'abbazia rosso intenso: forte e generosa, ricca di profumo e sapore.", 'da € 4,00', '25 cl € 4,00 · 40 cl € 6,00 · 6,6% vol.'],
      ['Franziskaner Weissbier', 'Frumento vivace e frizzante, con una schiuma lussureggiante. Fresca, fruttata, molto beverina.', 'da € 4,00', '30 cl € 4,00 · 50 cl € 6,50 · 5,0% vol.'],
      ['Guinness', 'La stout numero uno in Irlanda: sentori di tostatura, caffè e cacao.', '€ 6,50', '40 cl · 4,2% vol.'],
    ] },
    { titolo: 'Le artigianali', voci: [
      ['1291 Pils · Birra Mastino', 'Bohemian Pils a bassa fermentazione del birrificio Mastino di Verona, con la decozione a tre tempre. Naso fresco e floreale, luppoli Tettnanger e Mittelfrüh.', 'da € 4,50', '30 cl € 4,50 · 40 cl € 6,50 · 5,2% vol.'],
      ['Huxley · Birrificio Italiano', 'Cold IPA con luppoli americani: secca e tagliente, finale amaro e asciutto con ritorni di pompelmo e ananas.', 'da € 3,50', '20 cl € 3,50 · 40 cl € 6,80 · 5,7% vol.'],
      ['Hope · Birra Mastino', 'Session IPA moderna: arancia e mandarino al naso, finale di pompelmo rosa, malto che sostiene l\'aroma.', 'da € 5,00', '30 cl € 5,00 · 40 cl € 6,80 · 4,5% vol.'],
    ] },
  ] },
  { id: 'bottiglia', nome: 'In bottiglia', gruppi: [{ voci: [
    ['Glocken Hell · Weissenoher', 'Germania, Hell.', '€ 5,50', '50 cl · 5,0% vol.'],
    ['Kloster Sud · Weissenoher', 'Germania, Amber Lager.', '€ 5,50', '50 cl · 5,4% vol.'],
    ['Lukas · Thornbridge', 'Inghilterra, Lager. Senza glutine.', '€ 6,00', '33 cl · 4,2% vol.'],
    ['Abra Cadabra · East Side', 'Italia, Session IPA. Senza glutine, a seconda della cotta.', '€ 6,50', '44 cl · 4,5% vol.'],
    ['Blanche des Neiges · Huyghe', 'Belgio, bière blanche.', '€ 5,00', '33 cl · 4,8% vol.'],
    ['Jaipur · Thornbridge', 'Inghilterra, India Pale Ale.', '€ 6,00', '33 cl · 5,9% vol.'],
    ['Chimay Rouge · Chimay', 'Belgio, bière brune.', '€ 6,00', '33 cl · 7,0% vol.'],
    ['Schol · Schelde Brouwerij', 'Belgio, Blonde. Analcolica.', '€ 6,00', '33 cl'],
  ] }] },
  { id: 'hamburger', nome: 'Hamburger', nota: 'Hamburger artigianale di Scottona, 200 g, servito con patate fritte.', gruppi: [
    { voci: [
      ['Hamburger', 'Pane artigianale, carne, cipolla, lattuga, pomodoro fresco, cetriolo, ketchup.', '€ 13,00'],
      ['Baconburger', 'Pane artigianale, carne, bacon, cheddar cheese, cipolla, lattuga, pomodoro fresco, salsa BBQ.', '€ 13,50'],
      ['Chipotleburger', 'Pane artigianale, carne, salsa chipotle, cheddar cheese, cipolla, misticanza.', '€ 13,50'],
      ['Brunchburger', 'Pane artigianale, carne, frittatina, bacon, rucola, guacamole.', '€ 13,50'],
      ['Bluesburger', 'Pane artigianale, carne, cheddar cheese, bacon, anelli di cipolla fritti, salsa Blues Pub.', '€ 13,50'],
      ['Chickenburger', 'Pane artigianale, filetto di pollo panato, pomodoro fresco, lattuga, bacon, salsa Blues Pub.', '€ 13,50'],
      ['Bufaloburger', 'Pane artigianale, formaggio schiz alla piastra, carne, cappuccio, pesto alla genovese, bacon croccante.', '€ 13,50'],
      ['Ale Burger', 'Carne, pane artigianale, pancetta al pepe, stracciatella, spinacino, cipolla caramellata, maionese.', '€ 13,50'],
      ['Gabri Burger', 'Carne, pane nero artigianale, bacon, zucchine grigliate, pomodoro fresco, formaggio schiz alla piastra, pesto alla genovese.', '€ 13,50'],
      ['Gricia Burger', 'Pane nero artigianale, carne, crema cacio e pepe, bacon croccante, spinacino.', '€ 13,50'],
    ] },
    { titolo: 'Carne vegetale Beyond Meat, con pane senza glutine', voci: [
      ['Sportivo', 'Pane senza glutine, carne vegetale, tomino, lattuga, pomodoro fresco, cipolla caramellata, maionese.', '€ 14,50', '', v1],
    ] },
    { titolo: 'Hamburger scomposto, senza pane', voci: [
      ['Stagionale', 'Hamburger artigianale di manzo alto 250 g al sangue, cipolla caramellata, verdure di stagione, patate fritte.', '€ 14,50'],
      ['Stracco', 'Hamburger artigianale di manzo alto 250 g al sangue, cipolla caramellata, stracchino, bacon croccante, patate fritte.', '€ 14,50'],
    ] },
  ] },
  { id: 'club', nome: 'Club sandwich', nota: 'Con pane artigianale.', gruppi: [{ voci: [
    ['Classico', 'Formaggio, prosciutto cotto, pancetta, uova, lattuga, pomodoro fresco, salsa rosa.', '€ 12,00'],
    ['Vegetariano', 'Formaggio, uova, zucchine, melanzane, lattuga, pomodoro fresco, salsa rosa.', '€ 12,00', '', v1],
    ['Ai funghi', 'Formaggio, uova, pancetta, funghi, prosciutto cotto, salsa rosa.', '€ 12,00'],
    ['Al pollo', 'Formaggio, pancetta, uova, pollo, lattuga, pomodoro fresco, salsa rosa.', '€ 12,00'],
    ['Al tonno', 'Formaggio, uova, tonno, lattuga, pomodoro fresco, salsa rosa.', '€ 12,00'],
    ['Francesino', 'Formaggio, uova, prosciutto crudo, brie, lattuga, pomodoro fresco, salsa rosa.', '€ 12,00'],
    ['Carciofi', 'Pane ai cereali, speck, carciofi, uova, formaggio, brie, salsa rosa.', '€ 12,00'],
    ['Sampei', 'Pane ai cereali, sgombro, formaggio, olive taggiasche, pomodoro fresco, lattuga, salsa rosa.', '€ 12,00'],
    ['Salmone', 'Formaggio, asparagi, salmone affumicato, rucola, maionese.', '€ 12,00'],
    ['Popeye', 'Pane ai cereali, pastrami, olive taggiasche, spinacino, formaggio Asiago DOP, maionese.', '€ 12,00'],
    ['Roastbeef', 'Pane ai cereali, roastbeef, stracciatella, Philadelphia, spinacino, pomodorino al forno, maionese.', '€ 12,00'],
    ['Club Jessica', 'Pane nero, salmone, stracciatella, formaggio, pomodorino al forno, lattuga, salsa guacamole.', '€ 12,00'],
    ['Club Eleonora', 'Pane ai cereali, pastrami, stracciatella, formaggio, pomodorino al forno, zucchine grigliate, maionese.', '€ 12,00'],
    ['Tartare sandwich', 'Pane nero, tartare di manzo, stracciatella, olive taggiasche, capperi, olio EVO, con patate fritte e salsa Blues.', '€ 15,50'],
  ] }] },
  { id: 'kamut', nome: 'Panino arabo al Kamut', nota: 'Con pane artigianale.', gruppi: [{ voci: [
    ['Boscaiolo', 'Porchetta, formaggio Asiago DOP, porcini.', '€ 9,00'],
    ['Campano', 'Prosciutto crudo 22 mesi, pomodorino al forno, mozzarella di bufala, misticanza.', '€ 9,00'],
    ['Acciughino', 'Filetti di acciuga, mozzarella di bufala, pesto alla genovese, pomodorino al forno.', '€ 9,00'],
    ['Leggero', 'Rucola, bresaola, stracchino, olio EVO.', '€ 9,00'],
    ['Pastrami', 'Manzo speziato cotto a bassa temperatura, cipolla caramellata, senape al miele.', '€ 9,00'],
    ['Pulled pork', 'Spalla di maiale sfilacciata, insalata di cavolo rosso e carote, cheddar cheese.', '€ 9,00'],
    ['Norvegese', 'Salmone affumicato, cappuccio, maionese, mela.', '€ 9,00'],
    ['Inglese', 'Roastbeef, pecorino toscano, pomodoro fresco, cetriolo, maionese.', '€ 9,00'],
  ] }] },
  { id: 'bruschette', nome: 'Bruschette', nota: 'Con pane artigianale.', gruppi: [
    { titolo: 'Le classiche', voci: [
      ['Toscana', 'Passata di pomodoro, pomodoro fresco, aglio, peperoncino, origano.', '€ 6,00', '', v2],
      ['Pizzaiola', 'Mozzarella, passata di pomodoro, origano.', '€ 6,00', '', v1],
    ] },
    { titolo: 'Bianche', voci: [
      ['Reale', 'Mozzarella, brie, bacon croccante, cipolla caramellata.', '€ 9,00'],
      ['Stracchina', 'Stracchino a freddo, prosciutto crudo 22 mesi, olio EVO.', '€ 9,00'],
      ['Bianca', 'Mozzarella, formaggio grana, salamino piccante, olive taggiasche, origano.', '€ 9,00'],
      ['Mediterranea', 'Pecorino toscano, pomodorino al forno, frutto di cappero, acciughe.', '€ 9,00'],
      ['Pepata', 'Salsa al radicchio, formaggio Asiago DOP, pancetta pepata.', '€ 9,00'],
    ] },
    { titolo: 'Le particolari', voci: [
      ['Indiavolata', 'Mozzarella, passata di pomodoro, salamino piccante, origano.', '€ 9,00'],
      ['Buddy', 'Mozzarella, passata di pomodoro, prosciutto cotto, funghi, origano.', '€ 9,00'],
      ['Trevisana', 'Mozzarella, passata di pomodoro, salsa al radicchio, porchetta.', '€ 9,00'],
      ['Verdure', 'Mozzarella, passata di pomodoro, zucchine, melanzane, origano, pomodorino al forno.', '€ 9,00', '', v1],
      ['Tirolese', 'Mozzarella, passata di pomodoro, gorgonzola, speck.', '€ 9,00'],
      ['Porcellina', 'Mozzarella, passata di pomodoro, porcini, porchetta.', '€ 9,00'],
      ['Parigina', 'Mozzarella, passata di pomodoro, brie, prosciutto crudo 22 mesi.', '€ 9,00'],
      ['Asiago', 'Mozzarella, passata di pomodoro, funghi, formaggio Asiago DOP, speck.', '€ 9,00'],
      ['Bufalina', 'Mozzarella di bufala, passata di pomodoro, pomodoro fresco, origano.', '€ 9,00', '', v1],
      ['Monaco', 'Mozzarella di bufala, passata di pomodoro, bresaola, rucola.', '€ 9,00'],
      ['Angelo', 'Mozzarella, passata di pomodoro, zucchine, salamino piccante, formaggio grana, origano.', '€ 9,00'],
      ['Valdostana', 'Passata di pomodoro, prosciutto cotto, formaggio Asiago DOP, origano.', '€ 9,00'],
      ['Parmigiana', 'Mozzarella, passata di pomodoro, melanzane, pesto alla genovese, pomodorino al forno.', '€ 9,00', '', v1],
      ['Briosa', 'Mozzarella, passata di pomodoro, salsa al radicchio, brie.', '€ 9,00', '', v1],
    ] },
  ] },
  { id: 'spianate', nome: 'Spianate', nota: "Con piadina all'olio, servite come una pizza.", gruppi: [{ voci: [
    ['Margherita', 'Mozzarella, passata di pomodoro, origano.', '€ 6,00', '', v1],
    ['Asparagi', 'Mozzarella, passata di pomodoro, bacon croccante, asparagi, origano.', '€ 9,00'],
    ['Diavola', 'Mozzarella, passata di pomodoro, salamino piccante, origano.', '€ 9,00'],
    ['Prosciutto e funghi', 'Mozzarella, passata di pomodoro, funghi, prosciutto cotto, origano.', '€ 9,00'],
    ['Parma', 'Mozzarella, passata di pomodoro, prosciutto crudo 22 mesi.', '€ 9,00'],
    ['Romana', 'Mozzarella, passata di pomodoro, porchetta.', '€ 9,00'],
    ['Puttanesca', 'Mozzarella, passata di pomodoro, acciughe, olive taggiasche, origano.', '€ 9,00'],
    ['Würstel', 'Mozzarella, passata di pomodoro, würstel, origano.', '€ 9,00'],
    ["Dell'orto", 'Mozzarella, passata di pomodoro, zucchine, melanzane, origano.', '€ 9,00', '', v1],
    ['Tonnara', 'Mozzarella, passata di pomodoro, tonno, zucchine, melanzane, origano.', '€ 9,00'],
    ['Pepe', 'Passata di pomodoro, Philadelphia, olive taggiasche, salamino piccante, origano.', '€ 9,00'],
    ['Rustica', 'Passata di pomodoro, mozzarella, tonno, cipolla, origano.', '€ 9,00'],
    ['Spettacolo', 'Philadelphia, salsa al radicchio, porchetta.', '€ 9,00'],
  ] }] },
  { id: 'toast', nome: 'Toast', nota: 'Con pane artigianale.', gruppi: [{ voci: [
    ['Il classico', 'Prosciutto cotto e formaggio Asiago DOP.', '€ 6,00'],
    ['Funghi', 'Prosciutto cotto, formaggio Asiago DOP e funghi.', '€ 7,50'],
    ['Verdure', 'Prosciutto cotto, formaggio Asiago DOP, zucchine e melanzane.', '€ 7,50'],
    ['Light', 'Pane ai cereali, mozzarella, zucchine, melanzane, pomodoro fresco.', '€ 8,00', '', v1],
    ['Bresaola', 'Pane ai cereali, mozzarella, bresaola, pomodoro fresco.', '€ 8,00'],
  ] }] },
  { id: 'piatti', nome: 'Piatti etnici', nota: 'Piatti etnici e piatti unici, ognuno con la sua birra consigliata.', gruppi: [{ voci: [
    ['Fajitas di pollo', 'Tortillas, pollo speziato, cipolla e peperone.', '€ 13,50', '', b('Franziskaner Weissbier')],
    ['Fajitas di manzo', 'Tortillas, manzo speziato, cipolla e peperone.', '€ 13,50', '', b('Leffe Rossa')],
    ['Fajitas di gamberi', 'Tortillas, gamberi, spezie, cipolla e peperone.', '€ 15,00', '', b('Mastino Hope')],
    ['Blues kebab', 'Tortillas con scamone di manzo irlandese, cappuccio, pomodoro fresco, spezie, salsa mex.', '€ 12,00', '', b('Mastino 1291 Pils')],
    ['Kebab di pollo', 'Tortillas con pollo, spezie, pomodoro fresco, cavolo rosso, salsa blues.', '€ 12,00', '', b('Leffe Blonde')],
    ['Pollo al curry', 'Con riso basmati.', '€ 13,00', '', b('Jupiler')],
    ['Gamberi al curry', 'Con riso basmati.', '€ 15,00', '', b('Hoegaarden')],
    ['Pollo e gamberi al curry', 'Con riso basmati.', '€ 14,00', '', b('Huxley Birrificio Italiano')],
    ['Cous cous vegetariano', 'Con verdure croccanti saltate in padella.', '€ 12,00', '', b('Mastino Hope', 1)],
    ['Cous cous di gamberi', 'Con gamberi, zucchine croccanti, zenzero e timo.', '€ 14,00', '', b('Jupiler')],
    ['Cous cous al manzo', 'Con verdure croccanti saltate in padella e straccetti di manzo.', '€ 13,00', '', b('Leffe Blonde')],
    ['Tagliata di roastbeef "Prestige"', '250 g con contorno.', '€ 18,00', '', b('Leffe Rossa')],
    ['Chili con carne', 'Manzo macinato, fagioli neri, passata di pomodoro e spezie, servito con riso basmati.', '€ 12,00', '', b('Mastino 1291 Pils')],
  ] }] },
  { id: 'insalatone', nome: 'Insalatone', nota: 'Insalatone fresche e piatti vegani.', gruppi: [{ voci: [
    ['Piatto primavera', 'Prosciutto crudo 22 mesi, mozzarella di bufala, pomodoro fresco.', '€ 13,00'],
    ["Roastbeef all'inglese", 'Con verdure grigliate.', '€ 13,00'],
    ['Insalata di gamberi', 'Gamberi, misticanza, pomodoro fresco, cappuccio, mais, carota.', '€ 13,00'],
    ['Insalata croccante', 'Misticanza, cappuccio, carote in agrodolce, roastbeef, formaggio grana.', '€ 12,00'],
    ['Insalata di bufala', 'Lattuga, pomodoro fresco, carote, tonno, olive taggiasche, mozzarella di bufala.', '€ 12,00'],
    ['Insalata dello chef', 'Lattuga, rucola, pomodoro fresco, frittatina, bacon, formaggio Asiago DOP.', '€ 12,00'],
    ['Insalata di pollo', 'Lattuga, filetti di pollo croccanti, carote, mais, olive taggiasche, pomodoro, formaggio Asiago DOP.', '€ 12,00'],
    ['Insalata di sgombro', 'Misticanza, cous cous, cappuccio, olive taggiasche, sgombro, timo.', '€ 12,00'],
    ['Insalata caprina', 'Pecorino toscano, cappuccio, spinacino, pomodorino al forno, frutto di cappero, anelli di cipolla fritta.', '€ 11,00', '', v1],
    ['Insalata vegana', 'Spinacino, cappuccio, carote in agrodolce, pomodoro al forno, triangolini vegani fritti, semi di girasole.', '€ 11,00', '', v2],
    ['Mexican vegan', 'Burger di fagioli rossi, quinoa e sesamo di nostra produzione, tortilla di mais, guacamole, julienne di lattuga, pico de gallo, riso basmati.', '€ 12,00', '', v2],
  ] }] },
  { id: 'fritti', nome: 'Fritti', nota: 'Fritture con olio di girasole alto oleico. Prodotti surgelati.', gruppi: [
    { voci: [
      ['Nachos', 'Con salsa piccante.', '€ 4,50', '', v2],
      ['Fritto Blues Pub', 'Misto fritto per 2 persone.', '€ 11,00'],
      ['Patatine fritte', '', '€ 5,00', '', v2],
      ['Patate con buccia', '', '€ 5,00', '', v2],
      ['Triangolini vegani', '', '€ 5,50', '', v2],
      ['Filetti di pollo croccanti', '', '€ 5,50'],
      ["Misto dell'orto pastellato", '', '€ 5,50', '', v1],
      ['Fagiolini fritti', 'Cajun style.', '€ 5,50'],
      ['Crocchette di cheddar e jalapeño', '', '€ 5,50', '', v1],
      ['Anelli di cipolla', 'Con pastella alla birra.', '€ 5,50', '', v1],
      ['Mozzarelle stick', 'Con panatura alla birra.', '€ 5,50', '', v1],
    ] },
    { titolo: 'Salse', voci: [
      ['Maionese, ketchup, salsa rosa, senape, salsa Blues, BBQ', 'Ognuna.', '€ 0,80'],
    ] },
  ] },
  { id: 'dolci', nome: 'Dolci', nota: 'Fatti da noi.', gruppi: [{ voci: [
    ['Mousse', 'Al cioccolato con lamponi freschi.', '€ 6,00'],
    ['Crema catalana', '', '€ 6,00'],
    ['Tiramisù', '', '€ 6,00'],
    ['Panna cotta', 'Con frutti di bosco.', '€ 6,00'],
    ['Panna cotta', 'Con cioccolato.', '€ 6,00'],
    ['Tortino', 'Al cioccolato e pere su crema al mascarpone.', '€ 6,00'],
    ['Cheesecake', 'Con salsa di fragole.', '€ 6,00'],
  ] }] },
  { id: 'cocktail', nome: 'Cocktail', gruppi: [
    { voci: [
      ['Sex on the beach', 'Vodka, vodka pesca, succo di mirtillo, succo di arancia, succo di ananas.', '€ 8,00'],
      ['Daiquiri', 'Rum bianco, sweet and sour.', '€ 8,00'],
      ['Mai Tai', 'Rum bianco, succo di lime, orzata, curaçao.', '€ 9,00'],
      ['Long Island Iced Tea', 'Rum bianco, gin, vodka, triple sec, tequila, sweet and sour, cola.', '€ 9,00'],
      ['Mojito', 'Rum bianco, lime fresco, foglie di menta, zucchero bianco, soda, ghiaccio intero.', '€ 8,00'],
      ['Caipiroska alla frutta', 'Fragole o frutti di bosco, vodka secca, zucchero bianco, lime.', '€ 8,00'],
      ['Moscow Mule', 'Vodka secca, succo di lime fresco, ginger beer.', '€ 8,00'],
      ['Gin tonic', "Con acqua tonica Fever-Tree Indian. Gin a scelta: Hendrick's, Malfy, Kapriol Pompelmo, Roku, Opificio di trasformazione alcolica, The Botanist, Brockmans, Bobby's, Gin Mare.", '€ 10,00'],
      ['Irish coffee', 'Caffè espresso lungo, zucchero bianco, whisky Jameson, panna.', '€ 8,00'],
      ['Baileys coffee', 'Caffè espresso lungo, zucchero bianco, Baileys, panna.', '€ 8,00'],
      ['Caffè del Blues', 'Caffè espresso, crema di cacao, panna, cacao.', '€ 4,00'],
    ] },
    { titolo: 'Analcolici', voci: [
      ['Mojito analcolico', 'Lime fresco, foglie di menta, zucchero bianco, ginger ale, ghiaccio intero.', '€ 7,00'],
      ['Oslo', "Succo di mirtillo, succo di lime, succo d'arancia, fragola, soda.", '€ 7,00'],
      ['San Francisco', "Succo d'arancia, succo di lime, succo d'ananas, succo di pompelmo, granatina, soda.", '€ 7,00'],
    ] },
  ] },
  { id: 'aperitivi', nome: 'Aperitivi e vini', gruppi: [
    { titolo: 'Aperitivi', voci: [
      ['Spritz Aperol', '', '€ 3,80'],
      ['Spritz Campari', '', '€ 4,00'],
      ['Americano', 'Bitter Fusetti, Vermouth "il Nostro", soda.', '€ 6,00'],
      ['Negroni', 'Bitter Fusetti, Vermouth "il Nostro", Gin Kapriol Dry.', '€ 7,50'],
      ['Hugo', 'Prosecco, soda, sciroppo di sambuco e menta.', '€ 4,00'],
    ] },
    { titolo: 'Vini', voci: [
      ['Prosecco Brut DOCG', 'Col Vetoraz, Valdobbiadene.', 'da € 3,50', 'Calice € 3,50 · bottiglia € 23,00'],
      ['Ribolla Gialla DOC', 'Specogna, Friuli.', 'da € 3,50', 'Calice € 3,50 · bottiglia € 23,00'],
      ['Cabernet Franc DOC', 'Specogna, Friuli.', 'da € 3,50', 'Calice € 3,50 · bottiglia € 23,00'],
    ] },
  ] },
  { id: 'bibite', nome: 'Bibite', gruppi: [{ voci: [
    ['Pepsi Cola', '', 'da € 3,00', '30 cl € 3,00 · 40 cl € 4,50'],
    ['Schweppes Lemon', '', 'da € 3,00', '30 cl € 3,00 · 40 cl € 4,50'],
    ['The Lipton', 'Limone e pesca.', 'da € 3,00', '30 cl € 3,00 · 40 cl € 4,50'],
    ['Lurisia', 'Aranciata, chinotto, acqua tonica.', '€ 3,50', '27,5 cl'],
    ['Cedrata Tassoni', '', '€ 3,00', '20 cl'],
    ['Coca-Cola', 'In bottiglia.', '€ 3,50', '33 cl'],
    ['Coca-Cola Zero', 'In bottiglia.', '€ 3,50', '33 cl'],
    ['Red Bull', '', '€ 3,50', '25 cl'],
    ['Acqua Surgiva', 'Naturale o frizzante.', '€ 2,50', '50 cl'],
    ['Succhi Kohl 100% succo', 'Mela di montagna e mirtillo.', '€ 3,50', '20 cl'],
  ] }] },
];

const foglie = n => n ? `<span class="sr">${n === 2 ? 'vegano' : 'vegetariano'}</span>` + '<svg class="ico" aria-hidden="true"><use href="#i-foglia"/></svg>'.repeat(n) : '';
const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function voceHTML([nome, desc, prezzo, extra = '', opz = {}]) {
  return `<li class="voce">
    <div class="voce-riga"><span class="voce-nome">${esc(nome)}${foglie(opz.v)}</span><span class="voce-prezzo">${prezzo}</span></div>
    ${desc ? `<p>${esc(desc)}</p>` : ''}
    ${extra ? `<p class="extra">${extra.replace(/€ /g, '€\u00a0')}</p>` : ''}
    ${opz.b ? `<p class="abbina"><svg class="ico" aria-hidden="true"><use href="#i-pinta"/></svg>Birra consigliata: ${esc(opz.b)}</p>` : ''}
  </li>`;
}

const schede = $('#schede'), corpo = $('#carta-corpo'), veg = $('#solo-veg');
let attiva = 'hamburger';

function vociVisibili(cat) {
  return cat.gruppi.map(g => ({ ...g, voci: veg.checked ? g.voci.filter(v => v[4]?.v) : g.voci })).filter(g => g.voci.length);
}

function disegnaSchede() {
  schede.innerHTML = MENU.map(c => {
    const vuota = veg.checked && !vociVisibili(c).length;
    return `<button class="scheda" role="tab" id="tab-${c.id}" data-id="${c.id}" aria-selected="${c.id === attiva}" aria-controls="carta-corpo" ${vuota ? 'disabled' : ''}>${c.nome}</button>`;
  }).join('');
}

function disegnaCorpo(anima) {
  const cat = MENU.find(c => c.id === attiva);
  const gruppi = vociVisibili(cat);
  corpo.setAttribute('aria-labelledby', `tab-${cat.id}`);
  corpo.innerHTML = `<h3 class="cat-titolo">${cat.nome}</h3>${cat.nota ? `<p class="cat-nota">${cat.nota}</p>` : ''}` +
    (gruppi.length ? gruppi.map(g => `<div class="gruppo">${g.titolo ? `<h4>${g.titolo}</h4>` : ''}<ul class="voci-menu">${g.voci.map(voceHTML).join('')}</ul></div>`).join('')
      : `<p class="vuoto">In questa sezione non ci sono piatti vegetariani. Ne trovi in <button type="button" data-vai="bruschette">Bruschette</button>, <button type="button" data-vai="insalatone">Insalatone</button> e <button type="button" data-vai="fritti">Fritti</button>.</p>`);
  if (anima && !ridotto) { corpo.classList.remove('cambia'); void corpo.offsetWidth; corpo.classList.add('cambia'); }
}

function scegli(id, scorri) {
  attiva = id;
  disegnaSchede();
  disegnaCorpo(true);
  const tab = $(`#tab-${id}`);
  tab?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: ridotto ? 'auto' : 'smooth' });
  if (scorri) {
    const y = $('#carta-barra').getBoundingClientRect().top + scrollY - parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--testata'));
    if (Math.abs(scrollY - y) > 4 && corpo.getBoundingClientRect().top < 0) scrollTo({ top: y, behavior: ridotto ? 'auto' : 'smooth' });
  }
}

schede.addEventListener('click', e => { const t = e.target.closest('.scheda'); if (t && !t.disabled) scegli(t.dataset.id, true); });
schede.addEventListener('keydown', e => {
  if (!['ArrowRight', 'ArrowLeft'].includes(e.key)) return;
  const tabs = $$('.scheda:not([disabled])', schede);
  const i = tabs.findIndex(t => t.dataset.id === attiva);
  const n = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
  scegli(n.dataset.id); $(`#tab-${n.dataset.id}`).focus();
});
corpo.addEventListener('click', e => { const t = e.target.closest('[data-vai]'); if (t) scegli(t.dataset.vai, true); });
veg.addEventListener('change', () => {
  if (veg.checked && !vociVisibili(MENU.find(c => c.id === attiva)).length) attiva = 'bruschette';
  disegnaSchede(); disegnaCorpo(true);
});
$$('[data-cat]').forEach(a => a.addEventListener('click', () => scegli(a.dataset.cat)));
disegnaSchede();
disegnaCorpo(false);

/* ---------- Testata, menu mobile, barra ---------- */
const testata = $('#testata'), btnMenu = $('#menu-btn'), menuMobile = $('#menu-mobile'), barra = $('.barra');
const hero = $('.hero');
function chiudiMenu() { menuMobile.hidden = true; btnMenu.setAttribute('aria-expanded', 'false'); document.body.style.overflow = ''; }
btnMenu.addEventListener('click', () => {
  const apri = menuMobile.hidden;
  menuMobile.hidden = !apri; btnMenu.setAttribute('aria-expanded', String(apri));
  document.body.style.overflow = apri ? 'hidden' : '';
  testata.classList.toggle('solida', apri || scrollY > 40);
});
menuMobile.addEventListener('click', e => { if (e.target.closest('a')) chiudiMenu(); });
addEventListener('keydown', e => { if (e.key === 'Escape' && !menuMobile.hidden) { chiudiMenu(); btnMenu.focus(); } });

let heroCtaVisibile = true;
new IntersectionObserver(([e]) => { heroCtaVisibile = e.isIntersecting; aggiornaBarra(); }).observe($('.hero-cta'));
const dove = $('#dove');
let doveVisibile = false;
new IntersectionObserver(([e]) => { doveVisibile = e.isIntersecting; aggiornaBarra(); }, { threshold: .25 }).observe(dove);
function aggiornaBarra() { barra.classList.toggle('su', !heroCtaVisibile && !doveVisibile); }
function suScroll() { if (menuMobile.hidden) testata.classList.toggle('solida', scrollY > 40); }
addEventListener('scroll', suScroll, { passive: true });
suScroll();

/* ---------- Comparse ---------- */
$$('.spina').forEach((el, i) => el.style.setProperty('--i', i));
const comparse = [
  ...$$('.intesta, .artigianali-testo, .artigianali-foto, .etnico-testo, .dolci, .locale-testo, .asporto-testo, .asporto-foto, .dove-testo, .carta-testa'),
  ...$$('.piatti .piatto, .etnico-foto .piatto, .citazioni blockquote, .anni li, .locale-griglia figure'),
];
comparse.forEach(el => el.classList.add('entra'));
$$('.piatti .piatto, .etnico-foto .piatto, .anni li').forEach((el, i, a) => el.style.setProperty('--i', i % 3));
const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px 18% 0px', threshold: .01 });
comparse.forEach(el => io.observe(el));
io.observe($('#spine'));

/* ---------- Aperto adesso? (ora di Roma) ---------- */
(function stato() {
  const p = Object.fromEntries(new Intl.DateTimeFormat('it-IT', { timeZone: 'Europe/Rome', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date()).map(x => [x.type, x.value]));
  const m = +p.hour * 60 + +p.minute;
  const el = $('#stato'), t = $('#stato-testo');
  if (m >= 18 * 60 + 30) { el.classList.add('aperto'); t.textContent = 'Aperti adesso, la cucina chiude a mezzanotte'; }
  else if (m < 60) { el.classList.add('aperto'); t.textContent = "Aperti fino all'una"; }
  else if (m >= 18 * 60) t.textContent = 'Apriamo alle 18:30, ordini d\'asporto già al telefono';
  else t.textContent = 'Stasera aperti dalle 18:30 all\'una';
})();

/* ---------- Mappa al tocco ---------- */
$('#mappa-apri').addEventListener('click', () => {
  const f = document.createElement('iframe');
  f.src = 'https://www.google.com/maps?q=45.76796,12.02750&z=16&output=embed';
  f.title = 'Mappa: Blues Pub, via Castellana 126, Montebelluna';
  f.loading = 'lazy'; f.referrerPolicy = 'no-referrer-when-downgrade';
  $('#mappa').replaceChildren(f);
});

$('#anno').textContent = new Date().getFullYear();

/* ---------- Pinta 3D: dopo il caricamento, solo con WebGL ---------- */
// su telefono la pinta occupa lo spazio fra la testata e il titolo, senza finirci sotto
const boxPinta = $('#pinta-box'), testoHero = $('.hero-testo');
function altezzaPinta() {
  if (matchMedia('(min-width: 900px)').matches) { boxPinta.style.height = ''; return; }
  const testataH = testata.offsetHeight;
  const libero = testoHero.offsetTop + 6 - testataH - 8;
  boxPinta.style.height = Math.round(Math.max(190, Math.min(innerHeight * 0.5, libero))) + 'px';
}
altezzaPinta();
addEventListener('resize', altezzaPinta);
document.fonts?.ready.then(altezzaPinta);

function haWebGL() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}
function avvia3D() {
  if (!haWebGL()) return;
  import('./3d.js').then(m => m.avvia({ hero, box: $('#pinta-box'), canvas: $('#pinta'), ridotto }))
    .catch(err => console.warn('Pinta 3D non disponibile:', err));
}
if (document.readyState === 'complete') setTimeout(avvia3D, 60);
else addEventListener('load', () => setTimeout(avvia3D, 60), { once: true });
