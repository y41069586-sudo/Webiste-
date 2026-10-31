import type { AppConfig } from '../config/settings';
import type { LeadSourceKind } from '../types';

/** Woher stammen die Daten? (Art. 14 Abs. 2 lit. f DSGVO) */
export function dataSourceText(source: LeadSourceKind, sourceReference?: string): string {
  switch (source) {
    case 'osm':
      return 'öffentlich zugänglichen Firmeneinträgen (OpenStreetMap, © OpenStreetMap-Mitwirkende, ODbL)';
    case 'google_places':
      return 'öffentlich zugänglichen Firmeneinträgen bei Google Places';
    case 'mock':
      return 'fiktiven Testdaten';
    case 'public_profile': {
      if (!sourceReference) throw new Error('Konkrete öffentliche Profilquelle fehlt.');
      const u = new URL(sourceReference);
      if (u.protocol !== 'https:' || u.username || u.password || u.search || u.hash) throw new Error('Ungeeignete Profilquelle.');
      if (/(^|\.)kleinanzeigen\.de$/.test(u.hostname)) {
        const id = /\/(\d+)-\d+-\d+$/.exec(u.pathname)?.[1];
        if (!id) throw new Error('Konkrete Anzeigenquelle fehlt.');
        return `dem öffentlich zugänglichen Geschäftsprofil auf Kleinanzeigen (Anzeigen-ID ${id})`;
      }
      throw new Error('Profilquelle benötigt eine gesonderte Quellenprüfung.');
    }
    default:
      return 'öffentlich zugänglichen Firmeneinträgen';
  }
}

/** Kurzfassung der Informationen nach Art. 14 DSGVO für den Brief. */
export function privacyNoticeText(cfg: AppConfig, source: LeadSourceKind, privacyUrl: string, sourceReference?: string): string {
  const s = cfg.sender;
  return (
    `**Datenschutzhinweis (Art. 14 DSGVO):** Verantwortlich: ${s.company}, ${s.name}, ${s.street}, ${s.postalCode} ${s.city}, ${s.email}. ` +
    `Ihre Firmenanschrift stammt aus ${dataSourceText(source, sourceReference)}. Wir verwenden sie für dieses postalische Angebot ` +
    `(höchstens ${cfg.letter.maxLettersPerLead} Briefe insgesamt, jederzeit widersprechbar; Rechtsgrundlage: berechtigtes Interesse an Direktwerbung, Art. 6 Abs. 1 lit. f DSGVO). Empfänger sind unser Druck- und ` +
    `Versanddienstleister sowie unser Hosting-Anbieter. Reagieren Sie nicht, löschen wir Ihre Daten spätestens ` +
    `${cfg.timing.leadRetentionMonths} Monate nach dem letzten Brief. Sie haben das Recht auf Auskunft, Berichtigung, Löschung, ` +
    `Einschränkung und Beschwerde bei einer Datenschutz-Aufsichtsbehörde. Vollständige Informationen: ${privacyUrl}`
  );
}

/** Widerspruchshinweis nach Art. 21 DSGVO (hervorgehoben). */
export function objectionNoticeText(optOutEmail: string): string {
  return (
    `**Widerspruch (Art. 21 DSGVO):** Kein Interesse? Scannen Sie den Code und tippen Sie auf „Kein Interesse“ oder schreiben Sie an ` +
    `${optOutEmail}. Weitere Werbung wird gesperrt, Akquisedaten werden gelöscht. Ein Sperrhash und gesetzlich aufzubewahrende Unterlagen bleiben erhalten.`
  );
}
