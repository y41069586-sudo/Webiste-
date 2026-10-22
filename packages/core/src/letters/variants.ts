/**
 * Brieftext-Varianten. Platzhalter in geschweiften Klammern werden deterministisch
 * ersetzt (kein LLM nötig – nur die markierten Felder werden personalisiert):
 *   {firmenname} {rating} {rating_count} {preis} {domain_vorschlag} {ablauf_tage}
 *   {hosting_monate} {absender_name}
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
    'Scannen Sie den Code und sehen Sie sie sich an. Wenn sie Ihnen gefällt, gehört sie Ihnen für einmalig **{preis}** – inklusive eigener Domain (z. B. **{domain_vorschlag}**) und {hosting_monate} Monaten Hosting. Änderungswünsche setze ich gern um.',
  offerWithoutDomain:
    'Scannen Sie den Code und sehen Sie sie sich an. Wenn sie Ihnen gefällt, gehört sie Ihnen für einmalig **{preis}** – inklusive eigener Domain und {hosting_monate} Monaten Hosting. Änderungswünsche setze ich gern um.',
  noAction: 'Wenn nicht, müssen Sie nichts tun. Der Entwurf wird nach {ablauf_tage} Tagen automatisch gelöscht.',
  closing: 'Viele Grüße',
  qrCaption: 'Entwurf ansehen',
};

export const LETTER_VARIANT_B: LetterVariantContent = {
  subject: 'Ein Website-Entwurf für {firmenname}',
  greeting: 'Guten Tag, liebes Team von {firmenname},',
  ratingSentence: 'Mit {rating_count} Bewertungen und durchschnittlich {rating} Sternen haben Sie sich einen sehr guten Ruf erarbeitet.',
  hook: 'Eine eigene Website, auf der Kundinnen und Kunden alles Wichtige auf einen Blick finden, haben Sie bisher aber nicht.',
  intro: [
    'Ich habe Ihnen deshalb einen fertigen Entwurf gebaut: Leistungen, Öffnungszeiten, Anfahrt und Kontaktformular – übersichtlich und fürs Handy optimiert.',
  ],
  offerWithDomain:
    'Mit dem Code unten sehen Sie den Entwurf sofort. Gefällt er Ihnen, übernehmen Sie ihn für einmalig **{preis}** – inklusive eigener Domain (z. B. **{domain_vorschlag}**) und {hosting_monate} Monaten Hosting. Anpassungen sind inklusive.',
  offerWithoutDomain:
    'Mit dem Code unten sehen Sie den Entwurf sofort. Gefällt er Ihnen, übernehmen Sie ihn für einmalig **{preis}** – inklusive eigener Domain und {hosting_monate} Monaten Hosting. Anpassungen sind inklusive.',
  noAction: 'Kein Interesse? Dann müssen Sie nichts tun – der Entwurf wird nach {ablauf_tage} Tagen automatisch gelöscht.',
  closing: 'Viele Grüße',
  qrCaption: 'Entwurf ansehen',
};

/** Zweiter, kürzerer Brief (Follow-up, maximal einmal). */
export const LETTER_FOLLOWUP_A: LetterVariantContent = {
  subject: 'Ihr Website-Entwurf ist noch online',
  greeting: 'Guten Tag, liebes Team von {firmenname},',
  ratingSentence: '',
  hook: 'vor kurzem habe ich Ihnen einen fertigen Website-Entwurf geschickt. Er ist noch für kurze Zeit online.',
  intro: [],
  offerWithDomain:
    'Ein Scan genügt, um ihn anzusehen. Für einmalig **{preis}** gehört die Seite Ihnen – inklusive Domain (z. B. **{domain_vorschlag}**) und {hosting_monate} Monaten Hosting.',
  offerWithoutDomain:
    'Ein Scan genügt, um ihn anzusehen. Für einmalig **{preis}** gehört die Seite Ihnen – inklusive eigener Domain und {hosting_monate} Monaten Hosting.',
  noAction: 'Dies ist mein letzter Brief an Sie. Wenn Sie nichts tun, wird der Entwurf automatisch gelöscht.',
  closing: 'Viele Grüße',
  qrCaption: 'Entwurf ansehen',
};

export const DEFAULT_LETTER_VARIANTS: { name: string; sequence: 1 | 2; content: LetterVariantContent }[] = [
  { name: 'A – Standard', sequence: 1, content: LETTER_VARIANT_A },
  { name: 'B – Ruf & Entwurf', sequence: 1, content: LETTER_VARIANT_B },
  { name: 'F1 – Follow-up kurz', sequence: 2, content: LETTER_FOLLOWUP_A },
];
