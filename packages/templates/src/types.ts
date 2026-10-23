/** Eingabedaten für alle Website-Templates (ohne Abhängigkeit zu @wbm/core). */

export type BranchGroup = 'handwerk' | 'beauty';

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
  | 'flower';

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

export interface DemoOptions {
  slug: string;
  priceLabel: string;
  checkoutUrl: string;
  questionUrl: string;
  optOutUrl: string;
  sender: SenderInfo;
  expiresLabel: string;
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
