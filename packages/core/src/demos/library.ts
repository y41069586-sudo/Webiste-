import type { BranchGroup, IconKey, SiteContent } from '@wbm/templates/types';

/**
 * Geprüfte Fallback-Texte je Branche (ohne Zahlen, ohne erfundene Fakten, Sie-Form).
 * Verwendet vom Mock-LLM und als Rückfall, wenn die KI-Ausgabe die Regeln zweimal verletzt.
 * Platzhalter: {name} {stadt} {branche}
 */
interface LibraryEntry {
  headlines: string[];
  sublines: string[];
  services: { title: string; text: string; icon: IconKey }[];
  about: string[];
  cta: string[];
  faq: { q: string; a: string }[];
}

export const CONTENT_LIBRARY: Record<string, LibraryEntry> = {
  nagelstudio: {
    headlines: ['Gepflegte Nägel, die Freude machen', 'Ihr Nagelstudio in {stadt}', 'Zeit für schöne Hände'],
    sublines: [
      'Maniküre, Modellage und Nageldesign in entspannter Atmosphäre – bei {name} in {stadt}.',
      'Ob natürlich oder auffällig: Wir nehmen uns Zeit für Ihre Wünsche und Ihre Nägel.',
    ],
    services: [
      {
        title: 'Maniküre',
        text: 'Pflege für Hände und Nägel: Formen, Nagelhaut pflegen und auf Wunsch lackieren.',
        icon: 'hand',
      },
      { title: 'Gel-Modellage', text: 'Haltbare Nägel in der Form und Länge, die zu Ihnen passt.', icon: 'nail' },
      { title: 'Auffüllen', text: 'Regelmäßige Pflege, damit Ihre Modellage lange schön bleibt.', icon: 'sparkle' },
      { title: 'Nageldesign', text: 'Von dezent bis kreativ – wir setzen Ihre Ideen um.', icon: 'flower' },
      { title: 'Gel-Lack', text: 'Glänzende Farbe, die länger hält als klassischer Nagellack.', icon: 'drop' },
      { title: 'Pediküre', text: 'Gepflegte Füße für ein gutes Gefühl bei jedem Schritt.', icon: 'heart' },
    ],
    about: [
      'Bei {name} dreht sich alles um gepflegte, schöne Nägel. Wir nehmen uns Zeit für Sie, beraten Sie gern zu Formen und Farben und arbeiten mit Sorgfalt.\n\nKommen Sie vorbei oder vereinbaren Sie einen Termin – wir freuen uns auf Sie.',
    ],
    cta: ['Termin vereinbaren', 'Jetzt Termin anfragen'],
    faq: [
      {
        q: 'Brauche ich einen Termin?',
        a: 'Am besten vereinbaren Sie vorab einen Termin. So können wir uns in Ruhe Zeit für Sie nehmen.',
      },
      {
        q: 'Wie lange hält eine Gel-Modellage?',
        a: 'Das hängt vom Nagelwachstum ab. Mit regelmäßigem Auffüllen bleibt die Modellage dauerhaft schön – wir beraten Sie gern.',
      },
      {
        q: 'Kann ich meine eigenen Designideen mitbringen?',
        a: 'Sehr gern. Bringen Sie Bilder oder Ideen mit, wir besprechen gemeinsam, was sich umsetzen lässt.',
      },
      {
        q: 'Wie pflege ich meine Nägel zu Hause?',
        a: 'Regelmäßiges Eincremen von Händen und Nagelhaut hilft. Weitere Tipps geben wir Ihnen gern bei Ihrem Besuch.',
      },
    ],
  },
  kosmetikstudio: {
    headlines: ['Zeit für Ihre Haut', 'Kosmetik mit Ruhe und Sorgfalt', 'Ihr Kosmetikstudio in {stadt}'],
    sublines: [
      'Gesichtsbehandlungen und Pflege, abgestimmt auf Ihre Haut – bei {name} in {stadt}.',
      'Entspannen Sie sich und lassen Sie sich verwöhnen. Wir beraten Sie persönlich.',
    ],
    services: [
      { title: 'Gesichtsbehandlung', text: 'Reinigung und Pflege, abgestimmt auf Ihren Hauttyp.', icon: 'face' },
      { title: 'Augenbrauen und Wimpern', text: 'Formen und Färben für einen gepflegten, natürlichen Ausdruck.', icon: 'eye' },
      { title: 'Hautberatung', text: 'Wir schauen uns Ihre Haut an und empfehlen eine passende Pflege.', icon: 'leaf' },
      { title: 'Pflegende Masken', text: 'Feuchtigkeit und Frische für Ihre Haut.', icon: 'drop' },
      { title: 'Entspannende Massagen', text: 'Kleine Auszeit für Gesicht, Nacken und Dekolleté.', icon: 'hand' },
      { title: 'Make-up', text: 'Für besondere Anlässe oder einfach für Sie.', icon: 'sparkle' },
    ],
    about: [
      'Bei {name} steht Ihr Wohlbefinden im Mittelpunkt. Wir nehmen uns Zeit für eine persönliche Beratung und wählen die Behandlung, die zu Ihrer Haut passt.\n\nGönnen Sie sich eine Auszeit vom Alltag – wir freuen uns auf Ihren Besuch.',
    ],
    cta: ['Termin vereinbaren', 'Jetzt Termin anfragen'],
    faq: [
      {
        q: 'Welche Behandlung passt zu meiner Haut?',
        a: 'Das besprechen wir gemeinsam vor der Behandlung. Wir schauen uns Ihre Haut an und beraten Sie persönlich.',
      },
      {
        q: 'Muss ich mich auf die Behandlung vorbereiten?',
        a: 'Eine besondere Vorbereitung ist meist nicht nötig. Kommen Sie am besten ungeschminkt, wenn eine Gesichtsbehandlung geplant ist.',
      },
      {
        q: 'Kann ich einen Gutschein verschenken?',
        a: 'Fragen Sie uns gern nach Gutscheinen – wir beraten Sie zu den Möglichkeiten.',
      },
      { q: 'Wie vereinbare ich einen Termin?', a: 'Rufen Sie uns an oder schreiben Sie uns über das Kontaktformular.' },
    ],
  },
  maler: {
    headlines: ['Saubere Malerarbeiten in {stadt}', 'Frische Farbe für Ihre Räume', 'Ihr Malerbetrieb in {stadt}'],
    sublines: [
      'Innenanstrich, Fassade und Tapezierarbeiten – sorgfältig geplant und ordentlich ausgeführt.',
      'Wir bringen Farbe in Ihre Wohnung, Ihr Haus oder Ihre Geschäftsräume.',
    ],
    services: [
      { title: 'Innenanstrich', text: 'Wände und Decken in Wohnungen, Büros und Treppenhäusern.', icon: 'roller' },
      { title: 'Fassadenanstrich', text: 'Schutz und ein frisches Erscheinungsbild für Ihre Außenwände.', icon: 'house' },
      { title: 'Tapezierarbeiten', text: 'Vom Entfernen alter Tapeten bis zur neuen Wandgestaltung.', icon: 'wall' },
      { title: 'Lackierarbeiten', text: 'Türen, Fenster, Geländer und Heizkörper wie neu.', icon: 'brush' },
      { title: 'Spachtel- und Putzarbeiten', text: 'Glatte Untergründe als Basis für ein sauberes Ergebnis.', icon: 'spray' },
      { title: 'Renovierung', text: 'Wir machen Räume wieder bezugsfertig.', icon: 'ladder' },
    ],
    about: [
      '{name} ist Ihr Ansprechpartner für Malerarbeiten in {stadt}. Uns ist wichtig, dass Sie sich auf eine saubere und zuverlässige Ausführung verlassen können.\n\nSprechen Sie uns an – wir besprechen Ihr Vorhaben gern persönlich.',
    ],
    cta: ['Jetzt anrufen', 'Angebot anfragen'],
    faq: [
      {
        q: 'Arbeiten Sie auch in bewohnten Räumen?',
        a: 'Ja. Möbel und Böden werden abgedeckt, damit Ihre Räume geschützt bleiben.',
      },
      {
        q: 'Wie bekomme ich ein Angebot?',
        a: 'Rufen Sie uns an oder schreiben Sie uns über das Kontaktformular. Wir melden uns bei Ihnen.',
      },
      { q: 'Übernehmen Sie auch kleinere Aufträge?', a: 'Sprechen Sie uns gern an – wir klären gemeinsam, was möglich ist.' },
      { q: 'Helfen Sie bei der Farbauswahl?', a: 'Gern beraten wir Sie zu Farben und Oberflächen, die zu Ihren Räumen passen.' },
    ],
  },
  elektriker: {
    headlines: ['Elektroarbeiten in {stadt}', 'Sicherer Strom für Ihr Zuhause', 'Ihr Elektriker in {stadt}'],
    sublines: [
      'Installation, Reparatur und Prüfung – zuverlässig und fachgerecht ausgeführt.',
      'Von der Steckdose bis zur Beleuchtung: Wir kümmern uns um Ihre Elektrik.',
    ],
    services: [
      { title: 'Elektroinstallation', text: 'Neue Leitungen, Steckdosen und Schalter für Neubau und Renovierung.', icon: 'plug' },
      { title: 'Reparaturen', text: 'Wir finden die Ursache von Störungen und beheben sie.', icon: 'wrench' },
      { title: 'Beleuchtung', text: 'Planung und Montage von Leuchten innen und außen.', icon: 'bulb' },
      { title: 'Sicherungsverteilung', text: 'Erneuerung und Erweiterung von Unterverteilungen.', icon: 'bolt' },
      { title: 'Netzwerk und Daten', text: 'Verkabelung für Internet und Telefon in Haus und Büro.', icon: 'network' },
      { title: 'Elektro-Prüfung', text: 'Überprüfung Ihrer Anlage für mehr Sicherheit.', icon: 'shield' },
    ],
    about: [
      '{name} kümmert sich um Elektroarbeiten in {stadt}. Wir arbeiten sorgfältig und erklären Ihnen verständlich, was zu tun ist.\n\nRufen Sie uns an oder schreiben Sie uns – wir besprechen Ihr Anliegen gern.',
    ],
    cta: ['Jetzt anrufen', 'Anfrage senden'],
    faq: [
      {
        q: 'Kommen Sie auch für kleine Reparaturen?',
        a: 'Sprechen Sie uns an – wir klären gemeinsam, wie wir Ihnen helfen können.',
      },
      {
        q: 'Was soll ich tun, wenn die Sicherung immer wieder auslöst?',
        a: 'Schalten Sie das betroffene Gerät ab und lassen Sie die Ursache von einer Fachkraft prüfen.',
      },
      { q: 'Wie bekomme ich ein Angebot?', a: 'Rufen Sie uns an oder nutzen Sie das Kontaktformular. Wir melden uns bei Ihnen.' },
      {
        q: 'Arbeiten Sie für Privat- und Geschäftskunden?',
        a: 'Sprechen Sie uns gern an, wir besprechen Ihr Vorhaben persönlich.',
      },
    ],
  },
  restaurant: {
    headlines: ['Gut essen in {stadt}', 'Willkommen bei {name}', 'Zeit für einen schönen Abend'],
    sublines: [
      'Frisch gekocht und mit Freude serviert – bei {name} in {stadt}.',
      'Ob Mittagspause oder Abendessen: Bei uns nehmen Sie sich Zeit für gutes Essen.',
    ],
    services: [
      { title: 'Mittagstisch', text: 'Wechselnde Gerichte für die Mittagspause.', icon: 'plate' },
      { title: 'Abendkarte', text: 'Gerichte für einen entspannten Abend mit Familie und Freunden.', icon: 'glass' },
      { title: 'Vorspeisen und Salate', text: 'Leichte Gerichte zum Teilen oder als Auftakt.', icon: 'leaf' },
      { title: 'Desserts', text: 'Süßes zum Abschluss.', icon: 'heart' },
      { title: 'Getränke', text: 'Kalte und warme Getränke passend zum Essen.', icon: 'cup' },
      {
        title: 'Feiern und Gruppen',
        text: 'Sprechen Sie uns an, wenn Sie mit einer größeren Gruppe kommen möchten.',
        icon: 'calendar',
      },
    ],
    about: [
      'Bei {name} in {stadt} steht gutes Essen im Mittelpunkt. Wir freuen uns, wenn Sie sich bei uns wohlfühlen und gern wiederkommen.\n\nReservieren Sie Ihren Tisch oder kommen Sie einfach vorbei.',
    ],
    cta: ['Tisch reservieren', 'Jetzt anfragen'],
    faq: [
      { q: 'Kann ich einen Tisch reservieren?', a: 'Gern – rufen Sie uns an oder nutzen Sie die Reservierungsanfrage.' },
      { q: 'Gibt es vegetarische Gerichte?', a: 'Fragen Sie uns gern, wir beraten Sie zu unserer aktuellen Karte.' },
      { q: 'Können wir mit einer Gruppe kommen?', a: 'Sprechen Sie uns an, wir besprechen die Möglichkeiten gemeinsam.' },
    ],
  },
  cafe: {
    headlines: ['Ihr Café in {stadt}', 'Zeit für eine Pause', 'Willkommen bei {name}'],
    sublines: [
      'Kaffee, Kuchen und eine ruhige Ecke für Ihre Pause – bei {name} in {stadt}.',
      'Kommen Sie vorbei und genießen Sie Ihre Auszeit bei uns.',
    ],
    services: [
      { title: 'Kaffeespezialitäten', text: 'Von klassisch bis mit Milchschaum.', icon: 'cup' },
      { title: 'Kuchen und Torten', text: 'Süßes für den Nachmittag.', icon: 'heart' },
      { title: 'Frühstück', text: 'Ein guter Start in den Tag.', icon: 'bread' },
      { title: 'Kleine Gerichte', text: 'Herzhaftes für zwischendurch.', icon: 'plate' },
      { title: 'Zum Mitnehmen', text: 'Kaffee und Gebäck für unterwegs.', icon: 'leaf' },
    ],
    about: [
      '{name} ist ein Ort zum Ankommen und Durchatmen in {stadt}. Bei uns können Sie in Ruhe Kaffee trinken, sich verabreden oder einfach eine Pause machen.\n\nWir freuen uns auf Ihren Besuch.',
    ],
    cta: ['Tisch anfragen', 'Jetzt anfragen'],
    faq: [
      { q: 'Kann ich einen Tisch reservieren?', a: 'Gern – nutzen Sie die Reservierungsanfrage oder rufen Sie uns an.' },
      { q: 'Gibt es Kaffee zum Mitnehmen?', a: 'Fragen Sie uns gern vor Ort.' },
      { q: 'Kann ich Kuchen vorbestellen?', a: 'Sprechen Sie uns an – wir klären gemeinsam, was möglich ist.' },
    ],
  },
  blumenladen: {
    headlines: ['Blumen für jeden Anlass', 'Ihr Blumenladen in {stadt}', 'Frische Blumen bei {name}'],
    sublines: [
      'Sträuße, Pflanzen und Gestecke – mit Liebe zusammengestellt bei {name} in {stadt}.',
      'Ob Geburtstag, Dankeschön oder einfach so: Wir finden die passenden Blumen.',
    ],
    services: [
      { title: 'Sträuße', text: 'Gebunden nach Ihren Wünschen und der Saison.', icon: 'flower' },
      { title: 'Topfpflanzen', text: 'Grün für Wohnung, Balkon und Büro.', icon: 'leaf' },
      { title: 'Gestecke', text: 'Für Feiern, Tische und besondere Momente.', icon: 'sparkle' },
      { title: 'Geschenke', text: 'Kleine Aufmerksamkeiten passend zu den Blumen.', icon: 'gift' },
      { title: 'Vorbestellung', text: 'Fragen Sie Ihren Strauß vorab an und holen Sie ihn ab.', icon: 'calendar' },
    ],
    about: [
      'Bei {name} in {stadt} dreht sich alles um Blumen und Pflanzen. Wir beraten Sie gern und stellen Sträuße zusammen, die zu Ihrem Anlass passen.\n\nSchauen Sie vorbei oder fragen Sie Ihren Strauß vorab an.',
    ],
    cta: ['Strauß anfragen', 'Jetzt anfragen'],
    faq: [
      { q: 'Kann ich einen Strauß vorbestellen?', a: 'Gern – nutzen Sie das Anfrageformular oder rufen Sie uns an.' },
      { q: 'Beraten Sie mich zur Pflege?', a: 'Ja, wir erklären Ihnen gern, wie Ihre Blumen lange schön bleiben.' },
      { q: 'Gibt es Blumen für besondere Anlässe?', a: 'Sprechen Sie uns an, wir besprechen Ihre Wünsche gemeinsam.' },
    ],
  },
  modegeschaeft: {
    headlines: ['Mode für jeden Tag', 'Ihr Modegeschäft in {stadt}', 'Neues entdecken bei {name}'],
    sublines: [
      'Ausgewählte Mode und persönliche Beratung – bei {name} in {stadt}.',
      'Kommen Sie vorbei, stöbern Sie in Ruhe und lassen Sie sich beraten.',
    ],
    services: [
      { title: 'Damenmode', text: 'Kleidung für Alltag und besondere Anlässe.', icon: 'tag' },
      { title: 'Herrenmode', text: 'Von lässig bis elegant.', icon: 'bag' },
      { title: 'Accessoires', text: 'Taschen, Schals und kleine Begleiter.', icon: 'sparkle' },
      { title: 'Persönliche Beratung', text: 'Fragen zu Auswahl und Möglichkeiten vorab klären.', icon: 'chat' },
      { title: 'Vorab reservieren', text: 'Fragen Sie an, ob Ihr Wunschteil vorrätig ist.', icon: 'calendar' },
    ],
    about: [
      '{name} ist ein Modegeschäft in {stadt}. Wir freuen uns, wenn Sie bei uns stöbern und etwas Passendes finden.\n\nKommen Sie vorbei oder fragen Sie einen Artikel vorab an.',
    ],
    cta: ['Artikel anfragen', 'Jetzt anfragen'],
    faq: [
      { q: 'Kann ich einen Artikel zurücklegen lassen?', a: 'Gern – nutzen Sie die Anfrage oder rufen Sie uns an.' },
      { q: 'Beraten Sie auch zu Größen und Passform?', a: 'Ja, sprechen Sie uns im Geschäft gern an.' },
      { q: 'Gibt es Gutscheine?', a: 'Fragen Sie uns gern, wir beraten Sie vor Ort.' },
    ],
  },
  yogastudio: {
    headlines: ['Yoga in {stadt}', 'Zeit für Bewegung und Ruhe', 'Willkommen bei {name}'],
    sublines: [
      'Kurse für Einsteiger und Geübte – in ruhiger Atmosphäre bei {name} in {stadt}.',
      'Finden Sie Ihren Kurs und fragen Sie eine Probestunde an.',
    ],
    services: [
      { title: 'Kurse für Einsteiger', text: 'Ein ruhiger Einstieg in die Grundlagen.', icon: 'mat' },
      { title: 'Kurse für Geübte', text: 'Für alle, die ihre Praxis vertiefen möchten.', icon: 'leaf' },
      { title: 'Entspannung', text: 'Ruhige Stunden zum Abschalten.', icon: 'heart' },
      { title: 'Probestunde', text: 'Lernen Sie uns unverbindlich kennen.', icon: 'calendar' },
      { title: 'Einzelstunden', text: 'Auf Anfrage abgestimmt auf Ihre Wünsche.', icon: 'chat' },
    ],
    about: [
      'Bei {name} in {stadt} finden Sie Zeit für Bewegung und Ruhe. Unsere Kurse sind für unterschiedliche Erfahrungen gedacht.\n\nFragen Sie eine Probestunde an – wir melden uns mit einem Termin.',
    ],
    cta: ['Probestunde anfragen', 'Jetzt anfragen'],
    faq: [
      { q: 'Brauche ich Vorerfahrung?', a: 'Nein, es gibt Kurse für Einsteiger. Fragen Sie uns gern.' },
      { q: 'Was soll ich mitbringen?', a: 'Bequeme Kleidung genügt. Alles Weitere besprechen wir bei der Anfrage.' },
      { q: 'Kann ich eine Probestunde machen?', a: 'Gern – nutzen Sie die Anfrage zur Probestunde.' },
    ],
  },
  tanzschule: {
    headlines: ['Tanzen lernen in {stadt}', 'Willkommen bei {name}', 'Gemeinsam in Bewegung'],
    sublines: [
      'Kurse für Paare, Kinder und Erwachsene – bei {name} in {stadt}.',
      'Finden Sie den passenden Kurs und fragen Sie eine Probestunde an.',
    ],
    services: [
      { title: 'Kurse für Paare', text: 'Gemeinsam die Grundlagen lernen.', icon: 'music' },
      { title: 'Kinder und Jugendliche', text: 'Bewegung und Spaß in der Gruppe.', icon: 'heart' },
      { title: 'Kurse für Erwachsene', text: 'Für Einsteiger und Fortgeschrittene.', icon: 'sparkle' },
      { title: 'Probestunde', text: 'Lernen Sie uns unverbindlich kennen.', icon: 'calendar' },
      { title: 'Vorbereitung auf Feiern', text: 'Auf Anfrage für besondere Anlässe.', icon: 'chat' },
    ],
    about: [
      '{name} ist Ihre Tanzschule in {stadt}. Bei uns steht die Freude an der Bewegung im Vordergrund.\n\nFragen Sie eine Probestunde an – wir melden uns mit einem Termin.',
    ],
    cta: ['Probestunde anfragen', 'Jetzt anfragen'],
    faq: [
      { q: 'Kann ich ohne Partner kommen?', a: 'Sprechen Sie uns an, wir finden gemeinsam den passenden Kurs.' },
      { q: 'Gibt es Kurse für Einsteiger?', a: 'Ja, fragen Sie uns gern nach dem passenden Einstieg.' },
      { q: 'Kann ich eine Probestunde machen?', a: 'Gern – nutzen Sie die Anfrage zur Probestunde.' },
    ],
  },
};

/** Additional specialties share the existing truthful fallback contract; services remain labelled examples. */
const SPECIALTIES: { match: RegExp; headline: string; services: { title: string; text: string; icon: IconKey }[] }[] = [
  {
    match: /fris[öe]|friseur|haarsalon/i,
    headline: 'Ihr Friseursalon in {stadt}',
    services: [
      {
        title: 'Schnitt & Styling',
        text: 'Platz für die tatsächlich angebotenen Schnitte und Styling-Leistungen.',
        icon: 'sparkle',
      },
      {
        title: 'Farbe & Pflege',
        text: 'Mögliche Übersicht zu Farb- und Pflegeangeboten; Umfang mit dem Salon abstimmen.',
        icon: 'drop',
      },
      { title: 'Terminwünsche', text: 'Eine Anfrage senden; der Salon bestätigt den gewünschten Termin.', icon: 'calendar' },
    ],
  },
  {
    match: /garten|landschaft|gaertner|gärtner/i,
    headline: 'Gartenideen für Ihr Zuhause',
    services: [
      { title: 'Gartengestaltung', text: 'Eine mögliche Übersicht für Gestaltung und Bepflanzung.', icon: 'leaf' },
      { title: 'Pflegearbeiten', text: 'Hier lassen sich die bestätigten Pflegeleistungen darstellen.', icon: 'flower' },
      { title: 'Ihr Vorhaben', text: 'Wünsche und Standort beschreiben und den möglichen Umfang anfragen.', icon: 'chat' },
    ],
  },
  {
    match: /reinig|gebäudeservice|gebaeudeservice/i,
    headline: 'Reinigung anfragen. Umfang klar abstimmen.',
    services: [
      { title: 'Räume & Gebäude', text: 'Platz für die vom Betrieb bestätigten Reinigungsbereiche.', icon: 'house' },
      {
        title: 'Regelmäßige Reinigung',
        text: 'Mögliche Einsatzzeiten und Umfang werden persönlich bestätigt.',
        icon: 'calendar',
      },
      {
        title: 'Individuelle Anfrage',
        text: 'Objekt und Reinigungsbedarf für eine konkrete Rückmeldung beschreiben.',
        icon: 'chat',
      },
    ],
  },
  {
    match: /sanitär|sanitaer|heizung|installat/i,
    headline: 'Ihr Anliegen rund um Haus und Technik',
    services: [
      {
        title: 'Technische Leistungen',
        text: 'Hier stehen nach Abstimmung die tatsächlich angebotenen Arbeiten.',
        icon: 'wrench',
      },
      { title: 'Wartung & Reparatur', text: 'Mögliche Aufgaben darstellen; keine ungeprüfte Notdienstzusage.', icon: 'house' },
      {
        title: 'Projekt anfragen',
        text: 'Das Vorhaben und vorhandene Unterlagen für eine Rückmeldung übermitteln.',
        icon: 'chat',
      },
    ],
  },
];

const GENERIC: Record<BranchGroup, LibraryEntry> = {
  handwerk: CONTENT_LIBRARY.maler!,
  beauty: CONTENT_LIBRARY.kosmetikstudio!,
  gastronomie: CONTENT_LIBRARY.restaurant!,
  einzelhandel: CONTENT_LIBRARY.blumenladen!,
  kurse: CONTENT_LIBRARY.yogastudio!,
};

function fill(s: string, vars: Record<string, string>): string {
  return s.replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? '');
}

function pick<T>(arr: T[], seed: number, offset = 0): T {
  return arr[(seed + offset) % arr.length]!;
}

/** Deterministischer Fallback-Inhalt (seed = Hash der Lead-ID). */
export function libraryContent(
  branch: string,
  group: BranchGroup,
  vars: { name: string; stadt: string; branche: string },
  seed: number,
): SiteContent {
  const specialty = SPECIALTIES.find((entry) => entry.match.test(`${branch} ${vars.branche}`));
  const lib = specialty
    ? { ...GENERIC[group], headlines: [specialty.headline], services: specialty.services }
    : (CONTENT_LIBRARY[branch] ?? GENERIC[group]);
  const v = { name: vars.name, stadt: vars.stadt, branche: vars.branche };
  const services = lib.services.slice(0, 4 + (seed % 3)).map((s) => ({ ...s, title: fill(s.title, v), text: fill(s.text, v) }));
  const focus: Record<BranchGroup, string> = {
    handwerk: 'Arbeiten am Haus beginnen mit einer konkreten Frage. Hier finden Sie den Kontakt für Ihr Vorhaben.',
    beauty: 'Behandlungen kennenlernen und einen Termin anfragen. Die Übersicht führt Sie zum passenden Kontakt.',
    gastronomie: 'Ein Blick auf Angebot, Öffnungszeiten und Anfahrt hilft bei der Planung Ihres Besuchs.',
    einzelhandel: 'Sortiment entdecken, einen Artikel anfragen und den Weg ins Geschäft finden.',
    kurse: 'Kursarten überblicken und eine passende Stunde anfragen. Termine werden vor einer Buchung bestätigt.',
  };
  const faq: SiteContent['faq'] = [
    {
      q:
        group === 'handwerk'
          ? 'Wie beschreibe ich mein Vorhaben?'
          : group === 'beauty'
            ? 'Wie frage ich einen Termin an?'
            : group === 'gastronomie'
              ? 'Wie frage ich einen Besuch an?'
              : group === 'einzelhandel'
                ? 'Wie frage ich einen Artikel an?'
                : 'Wie frage ich eine Probestunde an?',
      a: 'Beschreiben Sie Ihren Wunsch und nennen Sie mögliche Zeiten. Eine Anfrage ist noch keine verbindliche Zusage oder Buchung.',
    },
    {
      q: 'Welche Angaben sind bereits bestätigt?',
      a: 'Name, Anschrift und vorhandene Kontaktdaten stammen aus den erfassten Betriebsangaben. Die Angebotsbereiche zeigen eine mögliche Gestaltung und werden vor Veröffentlichung mit dem Betrieb abgestimmt.',
    },
    {
      q: 'Wo finde ich den Standort?',
      a: 'Die Anschrift und der Link zur Anfahrt stehen im Kontaktbereich. Aktuelle Öffnungszeiten werden angezeigt, soweit sie in den erfassten Angaben vorhanden sind.',
    },
  ];
  return {
    hero_headline: fill(pick(lib.headlines, seed), v),
    hero_subline: specialty
      ? `${vars.branche} in ${vars.stadt}: Leistungen kennenlernen und Ihren Wunsch direkt anfragen.`
      : focus[group],
    services,
    about: `${vars.name} ist als ${vars.branche} in ${vars.stadt} erfasst. Anschrift und Kontakt finden Sie auf dieser Seite.\n\nDie dargestellten Angebotsbereiche zeigen, wie sich die Website aufbauen lässt. Vor der Veröffentlichung werden Leistungen, Texte und Bilder mit dem Betrieb abgestimmt.`,
    cta_text: group === 'beauty' ? 'Termin anfragen' : group === 'kurse' ? 'Kurs anfragen' : 'Anfrage stellen',
    seo_title: `${vars.name} – ${vars.branche} in ${vars.stadt}`.slice(0, 65),
    seo_description: `${vars.branche} in ${vars.stadt}. ${focus[group]}`.slice(0, 158),
    faq,
  };
}
