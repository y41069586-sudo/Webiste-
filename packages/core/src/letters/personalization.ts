/** Branch context describes what a preview could show, never an unverified company service. */
export function letterBranchBenefit(branchLabel: string): string {
  const profiles: [RegExp, string][] = [
    [
      /maler|anstrich/i,
      'So könnten Interessierte Ihre bestätigten Malerleistungen kennenlernen und eine Angebotsanfrage stellen.',
    ],
    [
      /fris[öe]|friseur|haarsalon/i,
      'So könnten neue Interessierte Ihre bestätigten Leistungen, Öffnungszeiten und den Weg zur Terminanfrage finden.',
    ],
    [
      /garten|landschaft|gärtner|gaertner/i,
      'So könnten Sie Ihre bestätigten Gartenleistungen zeigen und Interessierten den Weg zur ersten Projektanfrage erleichtern.',
    ],
    [/reinig/i, 'So könnten Interessierte geeignete Reinigungsbereiche finden und den gewünschten Umfang schriftlich anfragen.'],
    [
      /sanitär|sanitaer|heizung|installat/i,
      'So könnten Interessierte die bestätigten technischen Leistungen überblicken und ihr Vorhaben gezielt anfragen.',
    ],
    [
      /restaurant|café|cafe|gastronom/i,
      'So könnten Gäste Ihr bestätigtes Angebot, Öffnungszeiten und die Anfahrt auf einen Blick finden.',
    ],
  ];
  return (
    profiles.find(([pattern]) => pattern.test(branchLabel))?.[1] ??
    'So könnten Interessierte Ihre bestätigten Leistungen, den Standort und die Kontaktmöglichkeiten übersichtlich finden.'
  );
}

export interface VerifiedLetterContext {
  businessName: string;
  city: string;
  branchLabel: string;
  /** Confirmed business facts only, with an auditable source reference. */
  details: { text: string; source: string; verified: boolean }[];
}
/** Deterministic copy from reviewed facts; never turn typical branch services into facts. */
export function personalizedLetterCopy(context: VerifiedLetterContext, variant = 0) {
  const facts = context.details.filter((d) => d.verified && d.source.trim() && d.text.trim()).slice(0, 2);
  if (!facts.length) throw new Error('Für einen persönlichen Brief fehlt ein belegter Betriebsbezug.');
  const detail = facts.map((d) => d.text.replace(/[.!]$/, '')).join('; ');
  const openings = [
    `Für ${context.businessName} in ${context.city} steht in diesem Entwurf Folgendes im Mittelpunkt: ${detail}.`,
    `Bei der Vorschau für ${context.businessName} haben wir diese Angaben berücksichtigt: ${detail}.`,
    `Der Entwurf für Ihren Betrieb in ${context.city} greift konkret auf: ${detail}.`,
  ];
  return {
    subject: `${context.businessName}: ${facts[0]!.text.replace(/[.!]$/, '')}`,
    intro: [
      openings[variant % openings.length]!,
      'Der QR-Code öffnet Ihren unabhängigen, nicht beauftragten Website-Entwurf kostenlos und ohne Anmeldung. Ihre Inhalte stimmen wir vor einer Veröffentlichung mit Ihnen ab.',
    ],
    sources: facts.map((d) => d.source),
    automatic: true,
  };
}
