/** Branch context describes what a preview could show, never an unverified company service. */
export function letterBranchBenefit(branchLabel: string): string {
  const profiles: [RegExp, string][] = [
    [/maler|anstrich/i, 'So könnten Interessierte Ihre Malerleistungen kennenlernen und eine Angebotsanfrage stellen.'],
    [
      /fris[öe]|friseur|haarsalon/i,
      'So könnten neue Interessierte Ihre Leistungen, Öffnungszeiten und den Weg zur Terminanfrage finden.',
    ],
    [
      /garten|landschaft|gärtner|gaertner/i,
      'So könnten Sie Ihre Gartenleistungen zeigen und Interessierten den Weg zur ersten Projektanfrage erleichtern.',
    ],
    [/reinig/i, 'So könnten Interessierte geeignete Reinigungsbereiche finden und den gewünschten Umfang schriftlich anfragen.'],
    [
      /sanitär|sanitaer|heizung|installat/i,
      'So könnten Interessierte die bestätigten technischen Leistungen überblicken und ihr Vorhaben gezielt anfragen.',
    ],
    [/elektro|elektriker/i, 'So könnten Interessierte Ihre Leistungen überblicken und ihr Vorhaben schriftlich beschreiben.'],
    [
      /barber|barbier/i,
      'So könnten Interessierte Ihre Leistungen rund um Haar und Bart finden und einen Terminwunsch formulieren.',
    ],
    [/kosmetik|nagel|nail/i, 'So könnten Interessierte Ihr Angebot kennenlernen und einen Terminwunsch formulieren.'],
    [
      /buch|handel|laden|boutique|blumen|mode/i,
      'So könnten Interessierte Ihr Sortiment kennenlernen und ihren Besuch oder eine Anfrage vorbereiten.',
    ],
    [
      /kurs|training|yoga|tanz|musik|fitness/i,
      'So könnten Interessierte Ihr Angebot überblicken und Fragen zur Teilnahme stellen.',
    ],
    [
      /restaurant|café|cafe|bistro|gastronom/i,
      'So könnten Gäste Ihr Angebot, Öffnungszeiten und die Anfahrt auf einen Blick finden.',
    ],
  ];
  return (
    profiles.find(([pattern]) => pattern.test(branchLabel))?.[1] ??
    'So könnten Interessierte Ihre Leistungen, den Standort und die Kontaktmöglichkeiten übersichtlich finden.'
  );
}

export interface VerifiedLetterContext {
  businessName: string;
  city: string;
  branchLabel: string;
  /** Confirmed business facts only, with an auditable source reference. */
  details: { text: string; source: string; verified: boolean }[];
}
/** Reviewed facts only. Typical sector services never become business facts automatically. */
export function reviewedLetterDetails(context: VerifiedLetterContext) {
  const facts = context.details.filter((d) => d.verified && d.source.trim() && d.text.trim());
  if (facts.some((d) => d.text.length > 140 || /[\r\n{}*]|garantiert|verdoppel|verlieren|mehr Umsatz/i.test(d.text)))
    throw new Error('Betriebsangabe nicht als kurzer, sachlicher Briefbezug geeignet; prüfen.');
  return facts.slice(0, 2).map((d) => ({ ...d, text: d.text.trim().replace(/[.!]$/, ''), source: d.source.trim() }));
}
export function personalizedLetterCopy(context: VerifiedLetterContext, variant = 0) {
  const facts = reviewedLetterDetails(context);
  if (!facts.length) throw new Error('Für einen persönlichen Brief fehlt ein belegter Betriebsbezug.');
  const detail = facts.map((d) => d.text).join(' und ');
  const openings = [
    `Im Mittelpunkt: ${detail} – für Ihren Betrieb in ${context.city}.`,
    `Für ${context.businessName} haben wir ${detail} in der Vorschau aufgegriffen.`,
    `Die Vorschau zeigt, wie sich ${detail} für Interessierte übersichtlich darstellen lassen.`,
  ];
  return {
    subject: `Ein Website-Entwurf für ${context.businessName}`,
    intro: [
      openings[variant % openings.length]!,
      'Der unabhängige, nicht beauftragte Entwurf lässt sich kostenlos ansehen. Vor Veröffentlichung bestätigen Sie Inhalte und Funktionen.',
    ],
    sources: facts.map((d) => d.source),
    automatic: true,
  };
}
