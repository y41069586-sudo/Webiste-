/** Eingabedaten für alle Website-Templates (ohne Abhängigkeit zu @wbm/core). */

/** Template-Gruppe (Design-Familie); Gastronomie, Einzelhandel und Kurse seit L2 */
export type BranchGroup = 'handwerk' | 'beauty' | 'gastronomie' | 'einzelhandel' | 'kurse';

/** Playbook-Branche (Update 2, B3) – steuert branchenspezifische Abschnitte und Formulare */
export type IndustryKey = 'gastronomie' | 'handwerk' | 'beauty' | 'einzelhandel' | 'kurse_training' | 'dienstleistung';

export type IconKey =
  | 'brush'
  | 'roller'
  | 'ladder'
  | 'house'
  | 'wall'
  | 'spray'
  | 'bolt'
  | 'plug'
  | 'bulb'
  | 'wrench'
  | 'shield'
  | 'solar'
  | 'charger'
  | 'network'
  | 'nail'
  | 'sparkle'
  | 'hand'
  | 'face'
  | 'leaf'
  | 'drop'
  | 'heart'
  | 'calendar'
  | 'check'
  | 'clock'
  | 'phone'
  | 'pin'
  | 'mail'
  | 'chat'
  | 'eye'
  | 'flower'
  | 'cup'
  | 'plate'
  | 'bread'
  | 'glass'
  | 'bag'
  | 'tag'
  | 'gift'
  | 'book'
  | 'dumbbell'
  | 'music'
  | 'car'
  | 'mat';

export interface ServiceItem {
  title: string;
  text: string;
  icon: IconKey;
}

export interface FaqItem {
  q: string;
  a: string;
}

/** Vom Sprachmodell erzeugte (bzw. vom Kunden angepasste) Texte. */
export interface SiteContent {
  hero_headline: string;
  hero_subline: string;
  services: ServiceItem[];
  about: string;
  cta_text: string;
  seo_title: string;
  seo_description: string;
  faq: FaqItem[];
}

export interface OpeningLine {
  label: string;
  value: string;
}

/** Fakten aus den Lead- bzw. Kundendaten – niemals erfunden. */
export interface BusinessFacts {
  name: string;
  branchLabel: string;
  group: BranchGroup;
  /** Playbook-Branche; ohne Angabe die Gruppe */
  industry?: IndustryKey;
  street: string;
  houseNumber: string;
  postalCode: string;
  city: string;
  phone?: string | null;
  phoneHref?: string | null;
  email?: string | null;
  openingLines: OpeningLine[];
  /** Externe Links (z. B. Instagram), nur wenn vom Kunden bestätigt */
  socialLinks?: { label: string; href: string }[];
  /** Logo des Kunden (nur Live/Vorschau; nie in Demos) */
  logoSrc?: string | null;
  /** Fotos des Kunden (nur Live/Vorschau; nie in Demos) */
  photos?: { src: string; alt: string }[];
  /** Nur Link „Bewertungen auf Google“ aus der place_id – nie Inhalte von Google */
  googleReviewsUrl?: string | null;
}

export interface SenderInfo {
  name: string;
  company: string;
  street: string;
  postalCode: string;
  city: string;
  email: string;
  phone: string;
  imprintUrl: string;
  privacyUrl: string;
}

export type SiteMode = 'demo' | 'screenshot' | 'preview' | 'live';

export interface OfferCard {
  title: string;
  /** z. B. „590 €“ */
  price: string;
  /** z. B. „einmalig“ bzw. „pro Monat“ */
  unit: string;
  points: string[];
  href: string;
}

export interface TrustInfo {
  name: string;
  /** Zwei Sätze vom Betreiber – nie erfundene Referenzen */
  intro: string;
  /** Eingebettetes Foto (data:-URI), sonst ohne Foto */
  photoDataUri?: string | null;
  email: string;
  phone: string;
  imprintUrl: string;
}

export interface DemoOptions {
  slug: string;
  /** Einmalpreis (Kurzform) – für Altdaten/Fallback */
  priceLabel: string;
  checkoutUrl: string;
  questionUrl: string;
  optOutUrl: string;
  sender: SenderInfo;
  expiresLabel: string;
  /** Zwei gleichwertige Preiskarten (ohne Vorauswahl), erreichbar über „Seite übernehmen“ */
  offers?: OfferCard[];
  /** Satz zur Zufriedenheitsgarantie (falls aktiv) */
  guaranteeNote?: string | null;
  /** wa.me-Link mit vorausgefülltem Text; fehlt = Frageformular statt WhatsApp */
  whatsappUrl?: string | null;
  /** Vertrauensblock „Wer hat diesen Entwurf gebaut?“ */
  trust?: TrustInfo | null;
}

export interface LiveOptions {
  formAction: string;
  imprintPath: string;
  privacyPath: string;
  canonicalUrl?: string;
}

export interface RenderInput {
  templateId: string;
  palette: string;
  mode: SiteMode;
  content: SiteContent;
  facts: BusinessFacts;
  demo?: DemoOptions;
  live?: LiveOptions;
  /** Zeitstempel für die Spam-Zeitfalle des Formulars */
  renderedAt?: number;
}

export interface TemplateDef {
  id: string;
  group: BranchGroup;
  name: string;
  description: string;
  palettes: string[];
  render(ctx: RenderContext): string;
}

export interface RenderContext extends RenderInput {
  /** HTML-Bausteine, die in jedem Template gleich sind */
  parts: import('./partials/shared').SharedParts;
}
