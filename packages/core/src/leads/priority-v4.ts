import type { RawPlace } from '../providers/types';
export interface PriorityReason {
  criterion: string;
  points: number;
  verified: boolean;
  detail: string;
}
export function priorityV4(
  place: RawPlace,
  flags: {
    completeAddress: boolean;
    hasWebsite: boolean;
    socialOnly: boolean;
    branchWeight: number;
    excluded?: boolean;
    websiteAbsentVerified?: boolean;
    demoSuitable?: boolean;
    addressVerified?: boolean;
    independentVerified?: boolean;
  },
  thresholds = { goodMin: 75, reviewMin: 40 },
) {
  const reason = (criterion: string, verified: boolean, points: number, yes: string, no: string): PriorityReason => ({
    criterion,
    verified,
    points: verified ? points : 0,
    detail: verified ? yes : no,
  });
  const reasons = [
    reason('identity', Boolean(place.name?.trim()), 15, 'Firmenname in der Quelle vorhanden', 'Firmenname fehlt'),
    reason(
      'postal_address',
      flags.completeAddress && Boolean(flags.addressVerified),
      25,
      'Anschriftfelder vollständig; Zustellbarkeit und Ortszuordnung prüfen',
      'Anschrift unvollständig',
    ),
    reason(
      'operational',
      place.source !== 'osm' && place.businessStatus === 'OPERATIONAL',
      10,
      'Quelle meldet aktiven Betrieb',
      'Betriebsstatus nicht bestätigt',
    ),
    reason(
      'branch',
      flags.branchWeight > 0,
      10,
      'Branche in der Auswahl berücksichtigt; Leistungen noch bestätigen',
      'Branchenpassung nicht bestätigt',
    ),
    reason(
      'phone',
      Boolean(place.phone),
      5,
      'Geschäftliche Kontaktnummer vorhanden, keine Kaltanrufe',
      'Keine Telefonnummer in der Quelle',
    ),
    reason('social_only', flags.socialOnly, 5, 'Social-/Portalpräsenz vorhanden', 'Keine bestätigte Social-Präsenz'),
    reason(
      'website',
      Boolean(flags.websiteAbsentVerified) && !flags.hasWebsite,
      20,
      'Fehlen einer eigenen Website gesondert bestätigt',
      flags.hasWebsite
        ? 'Eigene Website vorhanden; ausgeschlossen'
        : 'Keine Website in der Quelle ist kein Nachweis; manuell prüfen',
    ),
    reason(
      'demo_suitability',
      Boolean(flags.demoSuitable),
      10,
      'Eignung für eine geprüfte Demo bestätigt',
      'Demo-Eignung noch nicht gesondert bestätigt',
    ),
  ];
  const score =
    flags.excluded || flags.hasWebsite
      ? 0
      : Math.max(
          0,
          Math.min(
            100,
            reasons.reduce((sum, r) => sum + r.points, 0),
          ),
        );
  const category =
    score >= thresholds.goodMin && flags.independentVerified
      ? 'good_fit'
      : score >= thresholds.reviewMin
        ? 'manual_review'
        : 'unsuitable';
  reasons.push({
    criterion: 'suitability',
    points: 0,
    verified: false,
    detail:
      category === 'good_fit'
        ? 'Gute Eignung nach belegten Signalen; keine Versandfreigabe'
        : category === 'manual_review'
          ? 'Manuelle Prüfung notwendig; keine Versandfreigabe'
          : 'Nicht geeignet nach aktuellem Prüfstand',
  });
  return { score, category, reasons };
}
