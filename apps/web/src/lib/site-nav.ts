/** Navigation der Firmen-Website (ohne Abhängigkeiten – wird auch im Browser geladen). */
export const SITE_NAV = [
  { href: '/so-funktionierts', label: 'So funktioniert’s' },
  { href: '/preise', label: 'Preise' },
  { href: '/beispiele', label: 'Beispiele' },
  { href: '/ueber-mich', label: 'Über mich' },
  { href: '/kontakt', label: 'Kontakt' },
];

/** Markenname der Firmen-Website: Firmenname aus den Einstellungen, solange dort der Platzhalter steht „Seitenwerk“. */
export function brandName(company: string): string {
  return !company.trim() || /platzhalter/i.test(company) ? 'Seitenwerk' : company;
}
