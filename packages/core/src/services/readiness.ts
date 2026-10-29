import type { AppConfig } from '../config/settings';
import { DEFAULT_CONFIG } from '../config/settings';
import { getEnv } from '../config/env';

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
  if (!cfg.tax.operatorConfirmed)
    out.push({ key: 'tax.operatorConfirmed', label: 'Steuerstatus und Preis-/Rechnungsangaben vom Betreiber bestätigt' });
  const placeholder = (v: string, def: string) =>
    !v.trim() || v.trim() === def || /platzhalter|example\.(com|de)|muster/i.test(v);
  if (placeholder(s.name, d.name)) out.push({ key: 'sender.name', label: 'Absender: Name' });
  if (placeholder(s.company, d.company)) out.push({ key: 'sender.company', label: 'Absender: Firmenname' });
  if (placeholder(s.street, d.street)) out.push({ key: 'sender.street', label: 'Absender: Anschrift' });
  if (placeholder(s.email, d.email)) out.push({ key: 'sender.email', label: 'Absender: E-Mail' });
  if (placeholder(s.phone, d.phone)) out.push({ key: 'sender.phone', label: 'Absender: Telefon' });
  if (placeholder(s.website, d.website)) out.push({ key: 'sender.website', label: 'Absender: Website' });
  if (!s.whatsappNumber.trim()) out.push({ key: 'sender.whatsappNumber', label: 'WhatsApp-Nummer' });
  if (!s.intro.trim()) out.push({ key: 'sender.intro', label: 'Kurzvorstellung (2 Sätze)' });
  if (!s.bankIban.trim()) out.push({ key: 'sender.bankIban', label: 'Bankverbindung (Rechnungen, Forderungsbriefe)' });
  // Widerspruchsadresse im Brief (Art. 21 DSGVO) – nie der Platzhalter aus der Vorgabe
  const env = getEnv();
  if (env.NODE_ENV === 'production' && /@example\.|^$/i.test(env.OPTOUT_EMAIL.trim()))
    out.push({ key: 'env.OPTOUT_EMAIL', label: 'Widerspruchs-E-Mail (OPTOUT_EMAIL) für den Hinweis im Brief' });
  if (!cfg.legal.impressumMarkdown.trim()) out.push({ key: 'legal.impressumMarkdown', label: 'Impressum' });
  if (!cfg.legal.privacyMarkdown.trim()) out.push({ key: 'legal.privacyMarkdown', label: 'Datenschutzerklärung' });
  if (!cfg.legal.termsMarkdown.trim()) out.push({ key: 'legal.termsMarkdown', label: 'AGB (siehe docs/agb-anforderungen.md)' });
  return out;
}

/** Nur für Rechnungen und den Live-Checkout nötig – Briefversand hängt nicht daran (Betreiberentscheidung 28.10.2026) */
const SALES_ONLY = new Set(['tax.operatorConfirmed', 'sender.bankIban', 'legal.termsMarkdown']);

/**
 * Was vor echten Briefen an Leads fehlt: Absenderangaben (Brief, Art.-14-Hinweis), Impressum und
 * Datenschutzerklärung. Steuer-/Rechnungsangaben und AGB sperren weiterhin nur den Verkauf.
 */
export function letterBlockers(cfg: AppConfig): GoLiveBlocker[] {
  return goLiveBlockers(cfg).filter((b) => !SALES_ONLY.has(b.key));
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
