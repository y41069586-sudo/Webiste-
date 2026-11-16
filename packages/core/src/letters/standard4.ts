import type { LetterData, LetterStandard4 } from '@wbm/templates/letter-types';
import type { AppConfig } from '../config/settings';
import type { LeadSourceKind } from '../types';
import { dataSourceText } from './notices';
import { reviewedLetterDetails, type VerifiedLetterContext } from './personalization';

/**
 * Standardvorlage 4 (16.11.2026, Betreiber „Einbauen“ nach den Berichten „Oberes Drittel im Werbebrief“ und
 * „Brief Version 4 Gesamtanalyse“). Feste, geprüfte Texte statt KI-Formulierung:
 * - offen als unbeauftragter Entwurf benannt, mit echtem Grund („warum dieser Betrieb“),
 * - Kosten nicht nur im Kleingedruckten: „Übernahme kostenpflichtig, Preis vorher sichtbar“ steht im Betreff-Block,
 * - keine Preise, keine Zahlen außer Telefonnummer und Datum (beide als Platzhalter im Wahrheits-Check),
 * - Frist = tatsächlich gespeichertes „online bis“ (statedExpiresAt), keine erfundene Verknappung.
 */
export const STANDARD4_VERSION = 'seitenwerk-standard-4';

export interface Standard4Input {
  cfg: AppConfig;
  /** Firmenname aus der Anschrift (Brief an den Betrieb) */
  businessName: string;
  branchLabel?: string;
  industry?: string | null;
  personalization?: VerifiedLetterContext;
  /** Telefonnummer des Betriebs – nur, wenn sie wirklich im ausgelieferten Entwurf steht */
  recipientPhone?: string | null;
  /** Öffentlicher Firmeneintrag ohne verlinkte Website (Lead-Quelle) */
  listedWithoutWebsite?: boolean;
  mobileDataUri?: string | null;
  expiresLabel: string;
  /** „standard-5“ = Entwurf Version 8 (Name zuerst, dunkle Bühne, Kalenderblatt); Standard: Vorlage 4 */
  style?: 'standard-4' | 'standard-5';
}

/** „Müller“ allein wirkt im Betreff wie ein Personenname: einzelne Wörter bekommen die Branche davor. */
export function standard4DisplayName(businessName: string, branchLabel?: string): string {
  const name = businessName.trim();
  const label = branchLabel?.trim();
  if (!label || /\s/.test(name) || name.toLocaleLowerCase('de').includes(label.toLocaleLowerCase('de'))) return name;
  return `${label} ${name}`;
}

/** Ehrlicher Grund für den Brief, nur aus belegten Angaben; ohne Beleg kein Grund-Satz. */
export function standard4Reason(i: Pick<Standard4Input, 'personalization' | 'listedWithoutWebsite'>): string {
  let facts: ReturnType<typeof reviewedLetterDetails> = [];
  try {
    facts = i.personalization ? reviewedLetterDetails(i.personalization) : [];
  } catch {
    facts = []; // unvollständige Recherche belegt keinen „im Netz nicht gefunden“-Satz
  }
  if (facts.some((f) => f.kind === 'website_search' && f.text === 'not_found'))
    return 'Ich schreibe Ihnen, weil ich im Netz keine eigene Website von Ihnen gefunden habe.';
  if (i.listedWithoutWebsite)
    return 'Ich schreibe Ihnen, weil in öffentlichen Firmeneinträgen zu Ihrem Betrieb keine Website hinterlegt ist.';
  return '';
}

export const STANDARD4_STEPS: LetterStandard4['steps'] = [
  { title: 'Ansehen', text: 'Code scannen, Entwurf in Ruhe ansehen – ohne Kosten und Anmeldung.' },
  { title: 'Anpassen', text: 'Was nicht passt, ändere ich vor dem Kauf – auch das ohne Kosten.' },
  { title: 'Übernehmen', text: 'Kostenpflichtig, Preis sehen Sie vorher. Online erst nach Freigabe.' },
];

export const STANDARD4_CALM =
  '**Ansehen kostet nichts und verpflichtet zu nichts.** Wenn Sie die Website behalten möchten, ist die Übernahme kostenpflichtig. Preis und Bedingungen sehen Sie vorher.';

export const STANDARD4_WHY =
  '**Warum ich zuerst baue:** Eine Website beurteilt man am besten, wenn man sie sieht – in Ruhe und ohne Gespräch. Die Bilder sind Beispielbilder, bei Google ist der Entwurf nicht zu finden.';

export const STANDARD5_VERSION = 'seitenwerk-standard-5';

const MONTHS = ['JAN', 'FEB', 'MÄR', 'APR', 'MAI', 'JUN', 'JUL', 'AUG', 'SEP', 'OKT', 'NOV', 'DEZ'];
const MONTH_NAMES = [
  'Januar',
  'Februar',
  'März',
  'April',
  'Mai',
  'Juni',
  'Juli',
  'August',
  'September',
  'Oktober',
  'November',
  'Dezember',
];

/** Kalenderblatt aus „17. Dezember 2026“; ohne erkennbares Datum kein Blatt. */
export function calendarLeaf(expiresLabel: string): { month: string; day: string } | undefined {
  const m = /^(\d{1,2})\.\s+([A-Za-zÄÖÜäöü]+)/.exec(expiresLabel.trim());
  const idx = m ? MONTH_NAMES.indexOf(m[2]!) : -1;
  return m && idx >= 0 ? { day: m[1]!, month: MONTHS[idx]! } : undefined;
}

/** „17. Dezember 2026“ → „17. Dezember“ (im Jahr des Briefs eindeutig). */
function shortDate(expiresLabel: string): string {
  return expiresLabel.replace(/\s+\d{4}$/, '').trim();
}

/** Vorlage 5 (Entwurf Version 8): Einstieg mit dem Grund, Name zuerst im Betreff, Kalenderblatt. */
function applyStandard5(data: LetterData, i: Standard4Input): void {
  applyStandard4(data, { ...i, style: 'standard-4' });
  const s = data.standard4!;
  const phone = i.recipientPhone?.trim();
  const reason = standard4Reason(i);
  const who = `mit Ihrem Namen, Ihrer Adresse${phone ? ` und Ihrer Telefonnummer **${phone}**` : ''}`;
  const opening = reason.includes('im Netz')
    ? 'ich habe im Netz keine eigene Website von Ihnen gefunden. Also habe ich eine gebaut,'
    : reason
      ? 'in öffentlichen Firmeneinträgen ist zu Ihrem Betrieb keine Website hinterlegt. Also habe ich eine gebaut,'
      : 'ich habe für Ihren Betrieb eine Website gebaut,';
  data.subject = `${s.displayName}, ich habe Ihre Website schon gebaut – als Entwurf.`;
  data.intro = [`${opening} ohne Auftrag und bevor Sie mich kennen: ${who}. **Sie ist online und wartet nur auf Ihren Blick.**`];
  data.qrCaption = 'Hier scannen';
  data.offer = '';
  data.postscript =
    '**P. S.** Wenn Sie nicht scannen, erfahren Sie nie, wie Ihr Betrieb im Internet aussehen könnte. **Ein Blick dauert eine Minute.**';
  const leaf = calendarLeaf(i.expiresLabel);
  data.standard4 = {
    ...s,
    style: 'standard-5',
    headlineBefore: '',
    headlineAfter: 'ich habe Ihre Website schon gebaut – als Entwurf.',
    subline: 'Ein Scan, und Sie sehen sie.',
    tag: 'Entwurf · Ausschnitt der Startseite',
    qrHint: 'Handykamera draufhalten. Eine Minute.',
    until: `**Ihr Entwurf ist bis ${shortDate(i.expiresLabel)} online.** Danach nehme ich ihn vom Netz – mit allem, was ich für Sie gebaut habe. Die Bilder darin sind Beispielbilder, bei Google ist er nicht zu finden.`,
    ...(leaf ? { leaf } : {}),
  };
  data.copyEvidence = {
    ...data.copyEvidence!,
    version: STANDARD5_VERSION,
    profile: 'standard-5',
    reviewReasons: ['Standardvorlage 5: feste Texte; Entwurf, Screenshots und Anschrift vor der Freigabe ansehen.'],
  };
}

/** Füllt die Felder der Vorlage 4 in `data` (Fließtext bleibt in den geprüften Standardfeldern). */
export function applyStandard4(data: LetterData, i: Standard4Input): void {
  if (i.style === 'standard-5') return applyStandard5(data, i);
  const sourceName = i.personalization?.businessName ?? i.businessName;
  const displayName = standard4DisplayName(sourceName, i.branchLabel ?? i.personalization?.branchLabel);
  const phone = i.recipientPhone?.trim();
  const reason = standard4Reason(i);
  const email = i.cfg.sender.email.trim();
  data.subject = `Ich habe für ${displayName} schon eine Website gebaut – als Entwurf zum Ansehen.`;
  data.greeting = `Guten Tag an das Team von ${displayName},`;
  data.intro = [
    [
      `ich habe ohne Auftrag einen Entwurf für Ihre Website gebaut – mit Ihrem Namen, Ihrer Adresse${phone ? ` und Ihrer Telefonnummer **${phone}**` : ''}.`,
      reason,
      '**Ansehen geht in einer Minute mit dem Code rechts.**',
    ]
      .filter(Boolean)
      .join(' '),
  ];
  data.qrCaption = 'Entwurf ansehen';
  data.offer = STANDARD4_WHY;
  data.noAction = `Niemand ruft Sie an, niemand kommt vorbei. Fragen gern per E-Mail${email ? ` an ${email}` : ''}.`;
  data.postscript = `**P. S.** Ansehen dauert eine Minute. Der Entwurf ist bis ${i.expiresLabel} online – danach ist er weg.`;
  data.closing = 'Freundliche Grüße';
  data.previewInvitation = true;
  data.standard4 = {
    displayName,
    headlineBefore: 'Ich habe für',
    headlineAfter: 'schon eine Website gebaut – als Entwurf zum Ansehen.',
    calm: STANDARD4_CALM,
    tag: `Entwurf · Startseite ${displayName}`,
    mobileDataUri: i.mobileDataUri ?? null,
    qrHint: 'Handykamera auf den Code halten.',
    steps: STANDARD4_STEPS,
    until: `**Der Entwurf ist bis ${i.expiresLabel} online.** Danach nehme ich ihn vom Netz. Wenn Sie nichts tun, entstehen Ihnen keine Kosten.`,
    senderTagline: i.industry === 'handwerk' ? 'Websites für Handwerksbetriebe' : 'Websites für lokale Betriebe',
    legalPrefix: 'Unverbindlicher, nicht beauftragter Entwurf.',
  };
  data.copyEvidence = {
    version: STANDARD4_VERSION,
    level: reason ? 'verified' : 'basic',
    profile: 'standard-4',
    usedFacts: reason
      ? [
          {
            text: reason,
            source: reason.includes('im Netz') ? 'Website-Recherche' : 'Öffentlicher Firmeneintrag ohne Website',
          },
        ]
      : [],
    engine: 'fixture',
    attempts: 0,
    reviewReasons: ['Standardvorlage 4: feste Texte; Entwurf, Screenshots und Anschrift vor der Freigabe ansehen.'],
  };
}

/** Feste, freigegebene Vorlagentexte (für die KI-Prüfung als [[VORLAGE]] markiert). */
export function standard4FixedTexts(data: LetterData): string[] {
  const s = data.standard4;
  if (!s) return [];
  return [
    data.subject,
    data.greeting,
    ...data.intro,
    data.offer,
    data.noAction,
    data.postscript ?? '',
    s.calm,
    s.until,
    s.subline ?? '',
    ...s.steps.map((st) => st.text),
  ].filter(Boolean);
}

/** Widerspruch in einfacher Sprache (ohne „Sperrhash“); Inhalt wie objectionNoticeText. */
export function standard4ObjectionNotice(optOutEmail: string): string {
  return `**Widerspruch (Art. 21 DSGVO):** Sie können dieser Werbung jederzeit widersprechen – per E-Mail an ${optOutEmail} oder mit „Kein Interesse“ in der Vorschau. Dann bekommen Sie keine Post mehr von uns, und wir löschen Ihre Daten bis auf einen Sperrvermerk.`;
}

/**
 * Art.-14-Hinweis in knapper Form: dieselben Pflichtangaben wie privacyNoticeText (Verantwortliche, Kontakt, Quelle,
 * Zweck, Rechtsgrundlage mit berechtigtem Interesse, Empfänger, Speicherdauer, Rechte, Beschwerde, Link), kürzer formuliert.
 */
export function standard4PrivacyNotice(
  cfg: AppConfig,
  source: LeadSourceKind,
  privacyUrl: string,
  sourceReference?: string,
): string {
  const s = cfg.sender;
  return (
    `**Datenschutz (Art. 14 DSGVO):** Verantwortlich: ${s.name}, ${s.company}, ${s.street}, ${s.postalCode} ${s.city}, ${s.email}. ` +
    `Ihre Firmenanschrift stammt aus ${dataSourceText(source, sourceReference)} und wird für diese Briefwerbung genutzt ` +
    `(höchstens ${cfg.letter.maxLettersPerLead} Briefe; Art. 6 Abs. 1 lit. f DSGVO, berechtigtes Interesse an Direktwerbung). ` +
    `Empfänger: Druck- und Versanddienstleister, Hosting-Anbieter. Ohne Reaktion löschen wir die Daten spätestens ` +
    `${cfg.timing.leadRetentionMonths} Monate nach dem letzten Brief. Sie haben das Recht auf Auskunft, Berichtigung, Löschung, ` +
    `Einschränkung und Beschwerde bei einer Aufsichtsbehörde. Mehr: ${privacyUrl.replace(/^https?:\/\//, '')}`
  );
}
