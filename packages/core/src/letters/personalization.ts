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
