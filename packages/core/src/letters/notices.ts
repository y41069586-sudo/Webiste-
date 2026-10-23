import type { AppConfig } from '../config/settings';
import type { LeadSourceKind } from '../types';

/** Woher stammen die Daten? (Art. 14 Abs. 2 lit. f DSGVO) */
export function dataSourceText(source: LeadSourceKind): string {
  switch (source) {
    case 'osm':
      return 'öffentlich zugänglichen Firmeneinträgen (OpenStreetMap, © OpenStreetMap-Mitwirkende, ODbL)';
    case 'google_places':
      return 'öffentlich zugänglichen Firmeneinträgen im Internet';
    default:
      return 'öffentlich zugänglichen Firmeneinträgen';
  }
}

/** Kurzfassung der Informationen nach Art. 14 DSGVO für den Brief. */
export function privacyNoticeText(cfg: AppConfig, source: LeadSourceKind, privacyUrl: string): string {
  const s = cfg.sender;
  return (
    `**Datenschutzhinweis (Art. 14 DSGVO):** Verantwortlich: ${s.company}, ${s.name}, ${s.street}, ${s.postalCode} ${s.city}, ${s.email}. ` +
    `Ihre Firmenanschrift stammt aus ${dataSourceText(source)}. Wir verwenden sie, um Ihnen einmalig dieses Angebot zu senden ` +
    `(Rechtsgrundlage: berechtigtes Interesse an Direktwerbung, Art. 6 Abs. 1 lit. f DSGVO). Empfänger sind unser Druck- und ` +
    `Versanddienstleister sowie unser Hosting-Anbieter. Reagieren Sie nicht, löschen wir Ihre Daten spätestens ` +
    `${cfg.timing.leadRetentionMonths} Monate nach diesem Brief. Sie haben das Recht auf Auskunft, Berichtigung, Löschung, ` +
    `Einschränkung und Beschwerde bei einer Datenschutz-Aufsichtsbehörde. Vollständige Informationen: ${privacyUrl}`
  );
}

/** Widerspruchshinweis nach Art. 21 DSGVO (hervorgehoben). */
export function objectionNoticeText(optOutEmail: string): string {
  return (
    `**Widerspruch (Art. 21 DSGVO):** Kein Interesse? Scannen Sie den Code und tippen Sie auf „Kein Interesse“ oder schreiben Sie an ` +
    `${optOutEmail}. Wir löschen Ihre Daten dann sofort und schreiben Ihnen nie wieder.`
  );
}
