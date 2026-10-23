import type { AppConfig } from '../config/settings';
import { DEFAULT_CONFIG } from '../config/settings';

export interface GoLiveBlocker {
  key: string;
  label: string;
}

/**
 * Was vor dem Livegang (echte Briefe, echte Zahlungen) fehlt. Solange etwas fehlt, verweigern
 * Brief-Freischaltung, echter Briefversand an Leads und der Live-Checkout den Betrieb.
 */
export function goLiveBlockers(cfg: AppConfig): GoLiveBlocker[] {
  const s = cfg.sender;
  const d = DEFAULT_CONFIG.sender;
  const out: GoLiveBlocker[] = [];
  const placeholder = (v: string, def: string) =>
    !v.trim() || v.trim() === def || /platzhalter|example\.(com|de)|muster/i.test(v);
  if (placeholder(s.name, d.name)) out.push({ key: 'sender.name', label: 'Absender: Name' });
  if (placeholder(s.company, d.company)) out.push({ key: 'sender.company', label: 'Absender: Firmenname' });
  if (placeholder(s.street, d.street)) out.push({ key: 'sender.street', label: 'Absender: Anschrift' });
  if (placeholder(s.email, d.email)) out.push({ key: 'sender.email', label: 'Absender: E-Mail' });
  if (placeholder(s.phone, d.phone)) out.push({ key: 'sender.phone', label: 'Absender: Telefon' });
  if (placeholder(s.website, d.website)) out.push({ key: 'sender.website', label: 'Absender: Website' });
  if (!s.taxNumber.trim() || /^0+\/0+\/0+$/.test(s.taxNumber.trim()))
    out.push({ key: 'sender.taxNumber', label: 'Steuernummer' });
  if (!s.whatsappNumber.trim()) out.push({ key: 'sender.whatsappNumber', label: 'WhatsApp-Nummer' });
  if (!s.photoUrl.trim()) out.push({ key: 'sender.photoUrl', label: 'Foto für den Vertrauensblock' });
  if (!s.intro.trim()) out.push({ key: 'sender.intro', label: 'Kurzvorstellung (2 Sätze)' });
  if (!s.bankIban.trim()) out.push({ key: 'sender.bankIban', label: 'Bankverbindung (Rechnungen, Forderungsbriefe)' });
  if (!cfg.legal.impressumMarkdown.trim()) out.push({ key: 'legal.impressumMarkdown', label: 'Impressum' });
  if (!cfg.legal.privacyMarkdown.trim()) out.push({ key: 'legal.privacyMarkdown', label: 'Datenschutzerklärung' });
  if (!cfg.legal.termsMarkdown.trim()) out.push({ key: 'legal.termsMarkdown', label: 'AGB (siehe docs/agb-anforderungen.md)' });
  return out;
}

export class GoLiveBlockedError extends Error {
  constructor(public readonly blockers: GoLiveBlocker[]) {
    super(`Livegang gesperrt – es fehlt: ${blockers.map((b) => b.label).join(', ')}`);
    this.name = 'GoLiveBlockedError';
  }
}

export function assertGoLiveReady(cfg: AppConfig): void {
  const b = goLiveBlockers(cfg);
  if (b.length) throw new GoLiveBlockedError(b);
}
