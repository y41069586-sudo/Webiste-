/**
 * Brieftext-Varianten. Platzhalter in geschweiften Klammern werden deterministisch
 * ersetzt (kein LLM nötig – nur die markierten Felder werden personalisiert):
 *   {firmenname} {rating} {rating_count} {domain_vorschlag} {ablaufdatum} {absender_name}
 *   {preise} (beide Optionen inkl. Mindestlaufzeit) {preis} {preis_monat} {mindestlaufzeit}
 *   {preis_pflege} {garantie_satz} {hosting_monate} {ablauf_tage}
 * Ab Baustein L2 kommen die Texte aus den Branchen-Playbooks (Slot-Templates mit Wahrheits-Check).
 */
export interface LetterVariantContent {
  subject: string;
  greeting: string;
  /** Nur wenn USE_RATING_IN_LETTER=true und Bewertungsdaten vorhanden */
  ratingSentence: string;
  /** Satz direkt nach der (optionalen) Rating-Zeile */
  hook: string;
  intro: string[];
  /** Absatz nach dem Screenshot, mit Domain-Beispiel */
  offerWithDomain: string;
  /** Absatz nach dem Screenshot, ohne Domain-Beispiel */
  offerWithoutDomain: string;
  noAction: string;
  closing: string;
  qrCaption: string;
}

const QR_CAPTION = 'Scannen und Ihre fertige Website ansehen – online bis {ablaufdatum}';

export const LETTER_VARIANT_A: LetterVariantContent = {
  subject: 'Ihre neue Website ist schon fertig',
  greeting: 'Guten Tag, liebes Team von {firmenname},',
  ratingSentence:
    'Ihre Kundinnen und Kunden sind begeistert – das sieht man an {rating_count} Bewertungen mit durchschnittlich {rating} Sternen.',
  hook: 'Wer Sie online sucht, findet bisher aber keine eigene Website von Ihnen.',
  intro: [
    'Deshalb habe ich Ihnen eine gebaut. Sie ist fertig – mit Ihren Leistungen, Öffnungszeiten, Anfahrt und einem Kontaktformular, optimiert fürs Handy.',
  ],
  offerWithDomain:
    'Wenn sie Ihnen gefällt, gehört sie Ihnen – für {preise}, jeweils mit eigener Domain (z. B. **{domain_vorschlag}**) und Hosting. Änderungswünsche setze ich gern um. {garantie_satz}',
  offerWithoutDomain:
    'Wenn sie Ihnen gefällt, gehört sie Ihnen – für {preise}, jeweils mit eigener Domain und Hosting. Änderungswünsche setze ich gern um. {garantie_satz}',
  noAction: 'Wenn nicht, müssen Sie nichts tun. Der Entwurf ist bis {ablaufdatum} online und wird danach automatisch gelöscht.',
  closing: 'Viele Grüße',
  qrCaption: QR_CAPTION,
};

export const LETTER_VARIANT_B: LetterVariantContent = {
  subject: 'Ein Website-Entwurf für {firmenname}',
  greeting: 'Guten Tag, liebes Team von {firmenname},',
  ratingSentence:
    'Mit {rating_count} Bewertungen und durchschnittlich {rating} Sternen haben Sie sich einen sehr guten Ruf erarbeitet.',
  hook: 'Eine eigene Website, auf der Kundinnen und Kunden alles Wichtige auf einen Blick finden, haben Sie bisher aber nicht.',
  intro: [
    'Ich habe Ihnen deshalb einen fertigen Entwurf gebaut: Leistungen, Öffnungszeiten, Anfahrt und Kontaktformular – übersichtlich und fürs Handy optimiert.',
  ],
  offerWithDomain:
    'Gefällt er Ihnen, übernehmen Sie ihn für {preise} – jeweils mit eigener Domain (z. B. **{domain_vorschlag}**) und Hosting. {garantie_satz}',
  offerWithoutDomain:
    'Gefällt er Ihnen, übernehmen Sie ihn für {preise} – jeweils mit eigener Domain und Hosting. {garantie_satz}',
  noAction:
    'Kein Interesse? Dann müssen Sie nichts tun – der Entwurf ist bis {ablaufdatum} online und wird danach automatisch gelöscht.',
  closing: 'Viele Grüße',
  qrCaption: QR_CAPTION,
};

/** Zweite Sendung: kein Scan 12 Tage nach (geschätzter) Zustellung – kurz, großes Bild, neues Ablaufdatum. */
export const LETTER_FOLLOWUP_A: LetterVariantContent = {
  subject: 'Ihre Website ist nur noch kurz online',
  greeting: 'Guten Tag, liebes Team von {firmenname},',
  ratingSentence: '',
  hook: 'vor kurzem habe ich Ihnen eine fertige Website geschickt. Sie ist nur noch bis {ablaufdatum} online.',
  intro: [],
  offerWithDomain:
    'Ein Scan genügt, um sie anzusehen. Sie gehört Ihnen für {preise} – mit eigener Domain (z. B. **{domain_vorschlag}**) und Hosting. {garantie_satz}',
  offerWithoutDomain:
    'Ein Scan genügt, um sie anzusehen. Sie gehört Ihnen für {preise} – mit eigener Domain und Hosting. {garantie_satz}',
  noAction: 'Wenn Sie nichts tun, wird der Entwurf danach automatisch gelöscht.',
  closing: 'Viele Grüße',
  qrCaption: QR_CAPTION,
};

/** Dritte Sendung: heißer Lead ohne Kauf – erst nachdem die Demo tatsächlich überarbeitet wurde. */
export const LETTER_FOLLOWUP_IMPROVED: LetterVariantContent = {
  subject: 'Wir haben Ihre Website verbessert',
  greeting: 'Guten Tag, liebes Team von {firmenname},',
  ratingSentence: '',
  hook: 'vor einiger Zeit habe ich Ihnen einen Website-Entwurf geschickt. Inzwischen habe ich ihn überarbeitet und verbessert.',
  intro: ['Der Code führt direkt zur neuen Version.'],
  offerWithDomain:
    'Sie gehört Ihnen für {preise} – mit eigener Domain (z. B. **{domain_vorschlag}**) und Hosting. {garantie_satz}',
  offerWithoutDomain: 'Sie gehört Ihnen für {preise} – mit eigener Domain und Hosting. {garantie_satz}',
  noAction:
    'Passt sie nicht, müssen Sie nichts tun. Die Seite ist bis {ablaufdatum} online und wird danach automatisch gelöscht. Dies ist mein letzter Brief an Sie.',
  closing: 'Viele Grüße',
  qrCaption: QR_CAPTION,
};

/** V4 copy tests keep identical financial conditions; no unsupported statistics. */
export const LETTER_VARIANT_C: LetterVariantContent = {
  ...LETTER_VARIANT_B,
  subject: 'So könnte die Website von {firmenname} aussehen',
  ratingSentence: '',
  hook: 'für Ihren Betrieb in {ort} habe ich einen unverbindlichen Website-Entwurf vorbereitet.',
  intro: [
    'Zeigen Sie Leistungen und Kontaktmöglichkeiten an einem Ort. Die Vorschau können Sie kostenlos und ohne Registrierung ansehen.',
  ],
  qrCaption: 'Ihre Website-Vorschau kostenlos ansehen',
};

export const DEFAULT_LETTER_VARIANTS: { name: string; sequence: 1 | 2 | 3; content: LetterVariantContent }[] = [
  { name: 'A – Standard', sequence: 1, content: LETTER_VARIANT_A },
  { name: 'B – Ruf & Entwurf', sequence: 1, content: LETTER_VARIANT_B },
  { name: 'F1 – Follow-up kurz', sequence: 2, content: LETTER_FOLLOWUP_A },
  { name: 'F2 – Seite verbessert', sequence: 3, content: LETTER_FOLLOWUP_IMPROVED },
];

/** Review candidates only: never add or activate extra experiment arms implicitly during seeding. */
export const V4_LETTER_CANDIDATES = [LETTER_VARIANT_A, LETTER_VARIANT_B, LETTER_VARIANT_C] as const;
