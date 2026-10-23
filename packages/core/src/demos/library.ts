import type { IconKey, SiteContent } from '@wbm/templates';

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
      { title: 'Maniküre', text: 'Pflege für Hände und Nägel: Formen, Nagelhaut pflegen und auf Wunsch lackieren.', icon: 'hand' },
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
      { q: 'Brauche ich einen Termin?', a: 'Am besten vereinbaren Sie vorab einen Termin. So können wir uns in Ruhe Zeit für Sie nehmen.' },
      { q: 'Wie lange hält eine Gel-Modellage?', a: 'Das hängt vom Nagelwachstum ab. Mit regelmäßigem Auffüllen bleibt die Modellage dauerhaft schön – wir beraten Sie gern.' },
      { q: 'Kann ich meine eigenen Designideen mitbringen?', a: 'Sehr gern. Bringen Sie Bilder oder Ideen mit, wir besprechen gemeinsam, was sich umsetzen lässt.' },
      { q: 'Wie pflege ich meine Nägel zu Hause?', a: 'Regelmäßiges Eincremen von Händen und Nagelhaut hilft. Weitere Tipps geben wir Ihnen gern bei Ihrem Besuch.' },
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
      { q: 'Welche Behandlung passt zu meiner Haut?', a: 'Das besprechen wir gemeinsam vor der Behandlung. Wir schauen uns Ihre Haut an und beraten Sie persönlich.' },
      { q: 'Muss ich mich auf die Behandlung vorbereiten?', a: 'Eine besondere Vorbereitung ist meist nicht nötig. Kommen Sie am besten ungeschminkt, wenn eine Gesichtsbehandlung geplant ist.' },
      { q: 'Kann ich einen Gutschein verschenken?', a: 'Fragen Sie uns gern nach Gutscheinen – wir beraten Sie zu den Möglichkeiten.' },
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
      { q: 'Arbeiten Sie auch in bewohnten Räumen?', a: 'Ja. Möbel und Böden werden abgedeckt, damit Ihre Räume geschützt bleiben.' },
      { q: 'Wie bekomme ich ein Angebot?', a: 'Rufen Sie uns an oder schreiben Sie uns über das Kontaktformular. Wir melden uns bei Ihnen.' },
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
      { q: 'Kommen Sie auch für kleine Reparaturen?', a: 'Sprechen Sie uns an – wir klären gemeinsam, wie wir Ihnen helfen können.' },
      { q: 'Was soll ich tun, wenn die Sicherung immer wieder auslöst?', a: 'Schalten Sie das betroffene Gerät ab und lassen Sie die Ursache von einer Fachkraft prüfen.' },
      { q: 'Wie bekomme ich ein Angebot?', a: 'Rufen Sie uns an oder nutzen Sie das Kontaktformular. Wir melden uns bei Ihnen.' },
      { q: 'Arbeiten Sie für Privat- und Geschäftskunden?', a: 'Sprechen Sie uns gern an, wir besprechen Ihr Vorhaben persönlich.' },
    ],
  },
};

const GENERIC: Record<'handwerk' | 'beauty', LibraryEntry> = {
  handwerk: CONTENT_LIBRARY.maler!,
  beauty: CONTENT_LIBRARY.kosmetikstudio!,
};

function fill(s: string, vars: Record<string, string>): string {
  return s.replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? '');
}

function pick<T>(arr: T[], seed: number, offset = 0): T {
  return arr[(seed + offset) % arr.length]!;
}

/** Deterministischer Fallback-Inhalt (seed = Hash der Lead-ID). */
export function libraryContent(branch: string, group: 'handwerk' | 'beauty', vars: { name: string; stadt: string; branche: string }, seed: number): SiteContent {
  const lib = CONTENT_LIBRARY[branch] ?? GENERIC[group];
  const v = { name: vars.name, stadt: vars.stadt, branche: vars.branche };
  const services = lib.services.slice(0, 4 + (seed % 3)).map((s) => ({ ...s, title: fill(s.title, v), text: fill(s.text, v) }));
  return {
    hero_headline: fill(pick(lib.headlines, seed), v),
    hero_subline: fill(pick(lib.sublines, seed, 1), v),
    services,
    about: fill(pick(lib.about, seed), v),
    cta_text: pick(lib.cta, seed),
    seo_title: `${vars.name} – ${vars.branche} in ${vars.stadt}`.slice(0, 65),
    seo_description: fill(pick(lib.sublines, seed), v).slice(0, 158),
    faq: lib.faq.slice(0, 3 + (seed % 2)).map((f) => ({ q: fill(f.q, v), a: fill(f.a, v) })),
  };
}
