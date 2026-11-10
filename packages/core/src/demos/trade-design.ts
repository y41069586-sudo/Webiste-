/**
 * Gestalterische Leitplanken je Gewerk und gemeinsamer Handwerksmaßstab für die KI-Gestaltung (10.11.2026).
 *
 * Betreiberwunsch: Demos sollen sofort professionell wirken und je Gewerk erkennbar anders aussehen. Das sind
 * ausschließlich visuelle Richtungen (Charakter, Farbgewicht, Zierelement, Bildregie). Sie sagen nichts über den
 * Betrieb aus und liefern keine Inhalte: keine Zertifikate, Referenzen, Teams, Zahlen oder Kundenstimmen. Die KI
 * behält ihre Freiheit bei Komposition und Details; sie bekommt eine fachlich passende Ausgangsrichtung statt einer
 * Vorlage. CSS-Animationen mit @keyframes lässt der Prüfer nicht zu, erlaubt sind Übergänge (transition).
 */
export interface TradeDirection {
  key: string;
  character: string;
  palette: string;
  ornament: string;
  imagery: string;
  typography: string;
}

const DIRECTIONS: { match: RegExp; dir: TradeDirection }[] = [
  {
    match: /dachdeck|zimmer|bedachung/,
    dir: {
      key: 'dach',
      character: 'robust, kraftvoll, souverän; wirkt wie ein Betrieb, der auf dem Dach sicher arbeitet',
      palette:
        'dunkle Flächen (Schiefer, Anthrazit) mit einer warmen Signalfarbe (Kupfer oder Ziegelrot) als einzige Akzentfarbe',
      ornament: 'eine geneigte Kante (Dachneigung) als wiederkehrende Linie oder Schräge zwischen den Abschnitten',
      imagery: 'großformatige Bilder von Dächern und Himmel, dunkler Verlauf unter Text, Bild füllt den Einstieg',
      typography: 'wuchtige Display-Schrift (Archivo schwer), enge Zeilen, kräftige Überschriften',
    },
  },
  {
    match: /elektr|solar|photovolt/,
    dir: {
      key: 'elektro',
      character: 'präzise, technisch, modern; klare Ordnung wie ein sauberer Schaltplan',
      palette:
        'tiefes Marineblau oder Anthrazit mit einer Signalfarbe (Elektrogelb oder Cyan) als einzige Akzentfarbe, viel kühles Weiß',
      ornament: 'feine Schaltlinie mit kleinen Knotenpunkten als wiederkehrende Linie; dünne Rasterlinien',
      imagery: 'Nahaufnahmen von Technik und Licht, kühle Farbstimmung, saubere Ausschnitte',
      typography: 'Archivo in klarer, enger Ausprägung; kleine Beschriftungen in Versalien mit Abstand',
    },
  },
  {
    match: /fliese|boden|parkett|naturstein|stuck|putz/,
    dir: {
      key: 'fliesen',
      character: 'elegant, hochwertig, ruhig; die Oberfläche ist die Hauptdarstellerin',
      palette: 'helle Stein- und Greige-Töne mit viel Weißraum, eine gedeckte Akzentfarbe (Anthrazit oder Terrakotta)',
      ornament: 'ein feines Fugenraster (Quadrate) als wiederkehrendes Muster, sparsam eingesetzt',
      imagery: 'Texturen und Flächen, Bad und Boden, großzügige Ausschnitte, wenig Beschriftung auf dem Bild',
      typography: 'Serifenbetonte Display-Schrift (Bodoni oder Gloock) für Überschriften, ruhige Textschrift',
    },
  },
  {
    match: /sanit|heizung|klima|install|wasser|bad/,
    dir: {
      key: 'sanitaer',
      character: 'sauber, seriös, vertrauenswürdig; verlässlich und aufgeräumt',
      palette: 'Weiß mit tiefem Blau oder Petrol als einzige Akzentfarbe, ruhige helle Flächen',
      ornament: 'ein sanfter Wellen- oder Tropfenbogen als wiederkehrende Kante, zurückhaltend',
      imagery: 'helle Bäder, Rohre und Armaturen in klaren Ausschnitten, freundliche und neutrale Farbstimmung',
      typography: 'klare, gut lesbare Grotesk (Archivo), mittlere Gewichte, großzügige Abstände',
    },
  },
  {
    match: /maler|anstrich|lackier|tapezier/,
    dir: {
      key: 'maler',
      character: 'ästhetisch, farbig, lebendig; zeigt Sinn für Farbe und saubere Kanten',
      palette: 'ein harmonisches Farbpaar aus gedeckter Hauptfarbe und einer frischen Akzentfarbe auf hellem Grund',
      ornament: 'ein Farbfächer aus schmalen Streifen oder ein Pinselstrich-Balken als wiederkehrendes Element',
      imagery: 'Wände, Farbflächen und Räume, helle Innenaufnahmen, ruhige Ausschnitte',
      typography: 'große, markante Display-Schrift, luftige Zeilenabstände',
    },
  },
  {
    match: /garten|landschaft|gärtner|gaertner|baum/,
    dir: {
      key: 'gartenbau',
      character: 'großzügig, natürlich, hochwertig; viel Raum wie ein gepflegter Garten',
      palette: 'Naturgrün und Erdtöne mit hellem Grund, eine Akzentfarbe (Salbei oder warmes Ocker)',
      ornament: 'eine weiche, organische Kante oder ein Blattbogen als wiederkehrendes Element',
      imagery: 'großformatige Naturaufnahmen, Gärten und Beete, viel Bildfläche, wenig Beschriftung',
      typography: 'Serifenbetonte oder humanistische Überschriften, ruhige Textschrift',
    },
  },
];

export function tradeDirection(branchKey: string, branchLabel: string): TradeDirection | null {
  const hay = `${branchKey} ${branchLabel}`.toLowerCase();
  return DIRECTIONS.find((d) => d.match.test(hay))?.dir ?? null;
}

/** Gemeinsamer Handwerksmaßstab für alle Demos: nur Gestaltung, keine Inhalte. */
export const PREMIUM_CRAFT = [
  'Handwerklicher Maßstab (gilt für jede Demo):',
  '- Typografie: eine klare Größenskala mit clamp() für Name und Überschriften, Textgröße mindestens 16 px, Zeilenlänge höchstens etwa 65 Zeichen, nur zwei Schriftgewichte je Familie.',
  '- Rhythmus: Abstände aus einer festen Stufenfolge (zum Beispiel 8, 16, 24, 40, 64, 96 px), gleiche Abschnittsabstände, ein gemeinsamer Inhaltsraster mit max-width.',
  '- Einstieg: Bild füllt den Einstieg, der Name ist das größte Element, darunter eine Zeile Tätigkeit mit Ort, höchstens zwei klare Schaltflächen. Starker Kontrast, dunkler Verlauf unter hellem Text.',
  '- Leistungskacheln: gleiche Proportionen, einheitlicher Bildausschnitt (aspect-ratio), klare Überschrift, ein kurzer Satz; sanfter Hover- und Fokuszustand per transition (Anheben, Farbwechsel), kein @keyframes.',
  '- Schaltflächen: mindestens 48 px hoch, deutlicher Fokusring, Hover- und Aktivzustand, eine Hauptschaltfläche in der Akzentfarbe.',
  '- Vertrauen nur aus belegten Angaben: Adresse, Telefonnummer, Öffnungszeiten und Ort in einem ruhigen Kontaktband. Keine Zertifikate, Jahreszahlen, Zahlen, Referenzen, Kundenstimmen oder Teamfotos erfinden.',
  '- Zierelement: genau eines, wiederkehrend, in allen Abschnitten gleich ausgeführt. Kein Icon-Set, keine Emoji, keine Stockfoto-Collage.',
  '- Mobil: Einstieg als Vollbild-Foto mit Text, Kacheln einspaltig, Tippflächen mindestens 48 px, kein horizontales Scrollen.',
].join('\n');

/** Ausgangsrichtung für das Gewerk als Textblock (leer, wenn das Gewerk keine eigene Richtung hat). */
export function tradeDesignBrief(branchKey: string, branchLabel: string): string {
  const d = tradeDirection(branchKey, branchLabel);
  const trade = d
    ? [
        `Gewerk-Charakter (visuelle Ausgangsrichtung, keine Betriebsangabe; du darfst sie begründet verfeinern, nicht ignorieren):`,
        `- Charakter: ${d.character}`,
        `- Farbwelt: ${d.palette}`,
        `- Zierelement: ${d.ornament}`,
        `- Bildregie: ${d.imagery}`,
        `- Schrift: ${d.typography}`,
      ].join('\n')
    : '';
  return [trade, PREMIUM_CRAFT].filter(Boolean).join('\n');
}
