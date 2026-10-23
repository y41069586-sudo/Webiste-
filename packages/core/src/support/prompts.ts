import type { AppConfig } from '../config/settings';
import { registerMockStructured } from '../providers/llm/mock';
import { SUPPORT_CLASSES, type SupportClass } from '../types';
import { formatEuro, formatEuroShort } from '../util/time';

export const CLASSIFY_TOOL = 'support_klassifizierung';
export const REPLY_TOOL = 'support_antwort';

export const CLASSIFY_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['class', 'confidence', 'reason', 'company_name'],
  properties: {
    class: { type: 'string', enum: [...SUPPORT_CLASSES] },
    confidence: { type: 'number', description: '0 bis 1' },
    reason: { type: 'string', description: 'Ein Satz Begründung (ohne personenbezogene Daten).' },
    company_name: { type: 'string', description: 'Firmenname, falls die Nachricht ihn nennt (sonst leer).' },
  },
} as const;

export const CLASSIFY_SYSTEM = `Du ordnest eingehende Nachrichten an einen kleinen Website-Dienstleister einer Klasse zu. Der Dienstleister schreibt lokale Betriebe per Brief an, zeigt ihnen einen Website-Entwurf und verkauft ein Website-Paket.

Klassen:
- frage: Fragen zum Angebot, zum Entwurf, zum Ablauf, zur Website oder Domain.
- aenderungswunsch: Ein Kunde möchte etwas an seiner (Vorschau-)Website ändern lassen (Texte, Zeiten, Bilder, Farben).
- beschwerde: Unzufriedenheit, Vorwürfe, Drohungen, Hinweise auf rechtliche Schritte, Ärger über den Brief.
- opt_out: Die Person möchte keine weitere Post/Werbung, widerspricht der Datennutzung (Art. 21 DSGVO) oder verlangt Löschung.
- rechnung: Fragen zu Rechnung, Zahlung, Erstattung, Kündigung, Verlängerung.
- spam: Werbung, automatische Antworten (Abwesenheitsnotiz, Zustellfehler), Phishing, Inhalte ohne Bezug.

Im Zweifel zwischen opt_out und einer anderen Klasse: opt_out. Im Zweifel zwischen beschwerde und frage: beschwerde.`;

export const REPLY_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['reply', 'needs_human', 'reason'],
  properties: {
    reply: { type: 'string', description: 'Antwort-E-Mail (Fließtext ohne Betreff, beginnt mit der Anrede, endet ohne Grußformel und ohne Signatur).' },
    needs_human: { type: 'boolean', description: 'true, wenn die Antwort Zusagen, Ausnahmen, rechtliche Einschätzungen oder Informationen erfordert, die nicht im Kontext stehen.' },
    reason: { type: 'string', description: 'Kurz: warum needs_human (oder leer).' },
  },
} as const;

export function replySystemPrompt(cfg: AppConfig): string {
  const p = cfg.pricing;
  return `Du schreibst Antwort-E-Mails im Namen von ${cfg.sender.name} (${cfg.sender.company}), einem kleinen Website-Dienstleister in ${cfg.sender.city}. Ton: freundlich, kurz, konkret, Sie-Form, Deutsch.

DAS ANGEBOT (nur das darfst du zusagen):
- ${p.packageName}: ${formatEuroShort(p.packageCents)} einmalig ${cfg.tax.kleinunternehmer ? '(Kleinunternehmer, keine Umsatzsteuer)' : 'inkl. Umsatzsteuer'}.
- Enthalten: ${p.packageDescription}
- Nach ${p.hostingMonthsIncluded} Monaten optional „${p.subscriptionName}“ für ${formatEuro(p.subscriptionCents)} pro Monat${p.subscriptionEnabled ? ' (online buchbar)' : ' (auf Anfrage)'}; ohne Verlängerung läuft das Hosting aus, die Domain gehört dem Kunden.
- Ablauf: Entwurf ansehen → online bestellen → Angaben eintragen (Impressum, Datenschutzerklärung, Leistungen, Öffnungszeiten, Logo/Fotos) → Vorschau → bis zu ${cfg.onboarding.includedChangeRounds} Änderungsrunden → Freigabe → Domain wird auf den Kunden registriert → Website geht online.
- Bestellungen nur von Unternehmern (B2B). Zahlung online.
- Rechtstexte (Impressum, Datenschutzerklärung) liefert der Kunde selbst; wir geben keine Rechtsberatung.

REGELN:
1. Keine Zusagen außerhalb des Angebots: keine Rabatte, Sonderpreise, Termine/Fristen, Zusatzleistungen (Shop, Online-Buchung, SEO-Garantien, weitere Seiten), keine Erstattungszusagen. Falls gefragt: sagen, dass sich ${cfg.sender.name} persönlich meldet, und needs_human = true.
2. Erfinde nichts. Nutze nur den Kontext unten. Fehlt eine Information: needs_human = true.
3. Keine rechtlichen Einschätzungen, keine Aussagen zu Bewertungen oder Datenquellen über das hinaus, was im Kontext steht.
4. Bei Beschwerden: Verständnis zeigen, nichts zurückweisen, nichts zusagen; needs_human = true.
5. Keine Links erfinden. Nenne keine Links außer denen im Kontext.
6. Maximal 150 Wörter. Keine Grußformel, keine Signatur (wird automatisch ergänzt).`;
}

export const OPT_OUT_RE =
  /\b(abmelden|abbestellen|austragen|widerspr(uch|eche|echen)|keine\s+(weitere[nr]?\s+)?(post|briefe?|werbung|zuschriften|schreiben|kontaktaufnahme)|nicht\s+mehr\s+(kontaktieren|anschreiben|schreiben|zuschicken)|(daten|adresse)\s+(sofort\s+)?l(ö|oe)schen|l(ö|oe)schen\s+sie\s+(meine|unsere)|unsubscribe|art\.?\s*21)\b/i;

/** Automatische Nachrichten (Abwesenheit, Unzustellbar) erkennen – nie automatisch beantworten. */
export function isAutomated(from: string, subject: string, headers: Record<string, string> = {}): boolean {
  const h = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v.toLowerCase()]));
  if (h['auto-submitted'] && h['auto-submitted'] !== 'no') return true;
  if (h['x-autoreply'] || h['x-autorespond'] || h['precedence'] === 'bulk' || h['precedence'] === 'auto_reply') return true;
  if (/mailer-daemon|postmaster|no-?reply|donotreply/i.test(from)) return true;
  return /^(automatische antwort|abwesenheit|out of office|autoreply|auto:|undeliver|unzustellbar|delivery status notification)/i.test(subject.trim());
}

// ---------------------------------------------------------------------------
// Mock-Antworten (ohne API-Key, Tests)
// ---------------------------------------------------------------------------
registerMockStructured(CLASSIFY_TOOL, (req) => {
  const text = req.prompt.toLowerCase();
  let cls: SupportClass = 'frage';
  if (OPT_OUT_RE.test(text)) cls = 'opt_out';
  else if (/unverschämt|anwalt|beschwer|frechheit|abmahn/.test(text)) cls = 'beschwerde';
  else if (/rechnung|erstatt|zahlung|kündig/.test(text)) cls = 'rechnung';
  else if (/ändern|änderung|bitte statt|öffnungszeit/.test(text)) cls = 'aenderungswunsch';
  else if (/viagra|krypto|seo-angebot|backlinks/.test(text)) cls = 'spam';
  return { class: cls, confidence: 0.9, reason: 'Mock-Klassifizierung', company_name: '' };
});

registerMockStructured(REPLY_TOOL, (req) => {
  const human = /rabatt|günstiger|anwalt|frist|bis wann/i.test(req.prompt);
  return {
    reply: 'vielen Dank für Ihre Nachricht. Gern beantworte ich Ihre Frage: Das Website-Paket enthält Ihre Website, die eigene Domain und das Hosting für 12 Monate.',
    needs_human: human,
    reason: human ? 'Zusage außerhalb des Angebots angefragt' : '',
  };
});
