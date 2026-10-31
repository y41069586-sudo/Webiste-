/** Leichtgewichtige Typen der Demo-Anpassung (ohne Render-Abhängigkeiten, auch für die Verwaltung). */
export interface DemoRevisionPatch {
  hero_headline?: string;
  hero_subline?: string;
  about?: string;
  cta_text?: string;
  seo_description?: string;
  services?: { title: string; text: string }[];
  /** Neue Leistungstitel hat der Betrieb selbst genannt (z. B. im Wunsch) – gelten dann als bestätigt */
  servicesConfirmedByBusiness?: boolean;
  templateId?: string;
  palette?: string;
}

export interface DemoRevisionStatus {
  state: 'pending' | 'done' | 'blocked' | 'failed';
  at: string;
  revision?: number;
  violations?: string[];
  error?: string;
}

export const demoRevisionKey = (demoId: string) => `demo-revision:${demoId}`;
