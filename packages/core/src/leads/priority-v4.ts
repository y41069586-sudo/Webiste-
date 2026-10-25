import type { RawPlace } from '../providers/types';
export interface PriorityReason {
  criterion: string;
  points: number;
  verified: boolean;
  detail: string;
}
export function priorityV4(
  place: RawPlace,
  flags: { completeAddress: boolean; hasWebsite: boolean; socialOnly: boolean; branchWeight: number },
) {
  const reasons: PriorityReason[] = [
    {
      criterion: 'postal_address',
      points: flags.completeAddress ? 4 : 0,
      verified: flags.completeAddress,
      detail: flags.completeAddress
        ? 'Vollständige Anschrift in der Quelle; Zustellbarkeit noch zu prüfen'
        : 'Postanschrift unvollständig',
    },
    {
      criterion: 'website',
      points: flags.hasWebsite ? -100 : 0,
      verified: flags.hasWebsite,
      detail: flags.hasWebsite ? 'Eigene Website in der Quelle' : 'Keine eigene Website in der Quelle; manuell zu bestätigen',
    },
    {
      criterion: 'operational',
      points: place.businessStatus === 'OPERATIONAL' ? 3 : 0,
      verified: place.businessStatus === 'OPERATIONAL',
      detail:
        place.businessStatus === 'OPERATIONAL'
          ? 'Quelle meldet geöffneten Betrieb'
          : 'Betriebsstatus unbekannt oder nicht geöffnet',
    },
    {
      criterion: 'social_only',
      points: flags.socialOnly ? 2 : 0,
      verified: flags.socialOnly,
      detail: flags.socialOnly ? 'Social-/Portaladresse statt eigener Website vorhanden' : 'Kein bestätigtes Social-Signal',
    },
    {
      criterion: 'phone',
      points: place.phone ? 1 : 0,
      verified: Boolean(place.phone),
      detail: 'Telefonangabe als Vollständigkeitssignal, keine Kaltanrufe',
    },
  ];
  return { score: Math.round(reasons.reduce((sum, r) => sum + r.points, 0) * flags.branchWeight * 100) / 100, reasons };
}
