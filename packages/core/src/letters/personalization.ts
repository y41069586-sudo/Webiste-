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
  details: {
    text: string;
    source: string;
    verified: boolean;
    /** Explicit human-reviewed public observation; never inferred from a missing OSM website tag. */
    kind?: 'public_observation' | 'website_search';
    checkedAt?: string;
    checks?: ('name_city_search' | 'directory_links' | 'social_links')[];
  }[];
}
/** Reviewed facts only. Typical sector services never become business facts automatically. */
export function reviewedLetterDetails(context: VerifiedLetterContext) {
  const facts = context.details.filter((d) => d.verified && d.source.trim() && d.text.trim());
  if (
    facts.some(
      (d) =>
        d.text.length > 140 || /[\r\n{}*]|garantiert|versichern|verdoppel|verlieren|mehr (?:Umsatz|Kunden|Leads)/i.test(d.text),
    )
  )
    throw new Error('Betriebsangabe nicht als kurzer, sachlicher Briefbezug geeignet; prüfen.');
  for (const fact of facts.filter((d) => d.kind || d.checkedAt)) {
    const checked = new Date(fact.checkedAt ?? '').getTime();
    if (!Number.isFinite(checked) || checked > Date.now() || Date.now() - checked > 30 * 86400000)
      throw new Error('Recherchebefund benötigt einen aktuellen dokumentierten Prüftermin.');
    if (
      fact.kind === 'website_search' &&
      (fact.text !== 'not_found' ||
        !['name_city_search', 'directory_links', 'social_links'].every((method) =>
          fact.checks?.includes(method as 'name_city_search'),
        ))
    )
      throw new Error('Website-Recherche unvollständig oder eigene Website gefunden; Eignung manuell prüfen.');
  }
  return facts.slice(0, 3).map((d) => ({ ...d, text: d.text.trim().replace(/[.!]$/, ''), source: d.source.trim() }));
}
export function personalizedLetterCopy(context: VerifiedLetterContext, variant = 0) {
  const facts = reviewedLetterDetails(context);
  if (!facts.length) throw new Error('Für einen persönlichen Brief fehlt ein belegter Betriebsbezug.');
  const website = facts.find((d) => d.kind === 'website_search');
  const observation = facts.find((d) => d.kind === 'public_observation');
  const services = facts.filter((d) => !d.kind).slice(0, 2);
  const researchOpening = website
    ? 'Bei unserer Recherche haben wir keinen eigenen Webauftritt gefunden.'
    : observation
      ? `Bei unserer Recherche ist uns aufgefallen: ${observation.text}.`
      : undefined;
  const detail = services.map((d) => d.text).join(' und ');
  const openings = [
    `Der Entwurf zeigt ${detail} – übersichtlich am Computer und Smartphone.`,
    `Für ${context.businessName} haben wir ${detail} in der Vorschau aufgegriffen.`,
    `Die Vorschau zeigt, wie sich ${detail} für Interessierte übersichtlich darstellen lassen.`,
  ];
  return {
    subject: `Ein Website-Entwurf für ${context.businessName}`,
    researchOpening,
    intro: [
      researchOpening
        ? observation
          ? letterBranchBenefit(context.branchLabel)
          : detail
            ? `Ihr Entwurf zeigt ${detail} – mit einem klaren Kontaktweg.`
            : letterBranchBenefit(context.branchLabel)
        : openings[variant % openings.length]!,
      'Der unabhängige, nicht beauftragte Entwurf lässt sich kostenlos ansehen. Vor Veröffentlichung bestätigen Sie Inhalte und Funktionen.',
    ],
    sources: facts.map((d) => d.source),
    automatic: true,
  };
}

/** New campaign copy is a source-bound invitation, not a priced offer. */
export const PREVIEW_LETTER_VERSION = 'personal-preview-2';
export const PREVIEW_ORDER_NOTICE =
  'Unabhängiger, nicht beauftragter Entwurf. Eine spätere Umsetzung ist kostenpflichtig. Leistungen, Preise und Vertragsbedingungen stehen in der Vorschau – vor jeder Bestellung.';
const PROFILES: { key: string; branch: RegExp; focus?: RegExp; title: string; benefit: string; caption: string }[] = [
  {
    key: 'painter-material',
    branch: /maler|anstrich/i,
    focus: /kalk|lehm|mineral|farbberat/i,
    title: 'Ihre Farbideen als Website-Entwurf',
    benefit:
      'Eine Website könnte Interessierten einen ersten Eindruck Ihrer Gestaltung geben und die Vorbereitung einer passenden Anfrage erleichtern.',
    caption: 'Entdecken Sie die Website-Idee für Ihren Betrieb',
  },
  {
    key: 'painter-stairway',
    branch: /maler|anstrich/i,
    focus: /treppen|fassad|außen/i,
    title: 'Ein Website-Entwurf für Ihre Malerarbeiten',
    benefit:
      'Interessierte könnten sich vor einer Anfrage über passende Arbeiten orientieren und ihr Vorhaben genauer beschreiben.',
    caption: 'Sehen Sie sich Ihren Maler-Entwurf an',
  },
  {
    key: 'painter',
    branch: /maler|anstrich/i,
    title: 'So könnten Ihre Malerleistungen online wirken',
    benefit:
      'Eine übersichtliche Leistungsdarstellung könnte zeigen, worum es bei einer Anfrage geht – vom ersten Eindruck bis zum Kontakt.',
    caption: 'Ihre Website-Idee am Handy und Computer ansehen',
  },
  {
    key: 'electric-solar',
    branch: /elektro/i,
    focus: /photovoltaik|solaranlag|pv-anlag/i,
    title: 'Ihr Photovoltaik-Angebot als Website-Idee',
    benefit:
      'Wer sich für eine Anlage interessiert, könnte Ihr Angebot vorab kennenlernen und sein Vorhaben für eine erste Anfrage beschreiben.',
    caption: 'Ihr Angebot als Website-Entwurf entdecken',
  },
  {
    key: 'electric-renovation',
    branch: /elektro/i,
    focus: /umbau|sanier|modernisier/i,
    title: 'Ihre Elektroarbeiten übersichtlich im Web',
    benefit:
      'Wer einen Umbau plant, könnte sich vorab über Ihr Angebot informieren und die erste Projektanfrage gezielter vorbereiten.',
    caption: 'Öffnen Sie Ihren persönlichen Website-Entwurf',
  },
  {
    key: 'electric-light',
    branch: /elektro/i,
    focus: /licht|beleucht/i,
    title: 'Ein digitaler Einblick in Ihr Elektroangebot',
    benefit:
      'Interessierte könnten sich zunächst zu ihrem Vorhaben orientieren und anschließend eine konkrete Frage an Ihren Betrieb richten.',
    caption: 'So könnte Ihr Betrieb online aussehen',
  },
  {
    key: 'electric',
    branch: /elektro/i,
    title: 'Ihr Elektroangebot als konkrete Website-Idee',
    benefit:
      'Eine Website könnte Leistungen und Kontakt an einer Stelle bündeln, damit Interessierte ihr Anliegen leichter zuordnen können.',
    caption: 'Ihre persönliche Vorschau kostenlos ansehen',
  },
  {
    key: 'plumbing',
    branch: /sanitär|sanitaer|heizung|installat/i,
    title: 'Eine Website-Idee für Ihre nächsten Anfragen',
    benefit:
      'Interessierte könnten ihr Vorhaben mit Ihrem Angebot abgleichen und die wichtigsten Angaben für eine erste Anfrage zusammentragen.',
    caption: 'Entdecken Sie den Entwurf für Ihren Betrieb',
  },
  {
    key: 'garden-care',
    branch: /garten|landschaft|gärtner|gaertner/i,
    focus: /pflege|schnitt/i,
    title: 'Ihr Gartenangebot bekommt eine Website-Idee',
    benefit:
      'Wer Unterstützung im Garten sucht, könnte passende Leistungen überblicken und den gewünschten Umfang vor der ersten Anfrage beschreiben.',
    caption: 'Ihre persönliche Garten-Website-Idee ansehen',
  },
  {
    key: 'garden',
    branch: /garten|landschaft|gärtner|gaertner/i,
    title: 'Raum für Ihre Gartenideen – als Website-Entwurf',
    benefit:
      'Eine Website könnte Ihr Angebot anschaulich gliedern und Interessierten den Einstieg in eine Projektanfrage erleichtern.',
    caption: 'Schauen Sie in Ihren Website-Entwurf',
  },
  {
    key: 'cleaning',
    branch: /reinig/i,
    title: 'Eine Website-Idee für Ihr Reinigungsangebot',
    benefit:
      'Interessierte könnten prüfen, ob Ihr Angebot zu den gesuchten Reinigungsarbeiten passt, und den gewünschten Umfang schriftlich anfragen.',
    caption: 'Ihre persönliche Vorschau öffnen',
  },
  {
    key: 'barber',
    branch: /barber|barbier/i,
    title: 'Ein erster Eindruck für Haar und Bart',
    benefit: 'Eine Website könnte Ihr Angebot vor dem Besuch zeigen und den Weg zu einer unverbindlichen Terminanfrage erklären.',
    caption: 'Entdecken Sie Ihren digitalen Auftritt',
  },
  {
    key: 'hair-color',
    branch: /fris[öe]|friseur|haarsalon/i,
    focus: /farb|color|balayage|strähn/i,
    title: 'Ihre Farbangebote als Website-Idee entdecken',
    benefit:
      'Eine Website könnte vor dem Salonbesuch Orientierung geben: Welche Farbangebote gibt es, und wie lässt sich ein Wunsch vorab besprechen?',
    caption: 'Die Website-Idee für Ihren Salon ansehen',
  },
  {
    key: 'hair',
    branch: /fris[öe]|friseur|haarsalon/i,
    title: 'Ihr Salon – schon als Website-Idee vorbereitet',
    benefit:
      'Neue Interessierte könnten Leistungen und Kontaktdaten vor dem Besuch überblicken und ihren Terminwunsch passend formulieren.',
    caption: 'So könnte Ihr Salon online wirken',
  },
  {
    key: 'nails',
    branch: /nagel|nail/i,
    title: 'Eine Website-Idee rund um Ihr Nagelangebot',
    benefit:
      'Interessierte könnten sich vor einer Terminanfrage über Ihr Angebot orientieren und den gewünschten Termin besser vorbereiten.',
    caption: 'Öffnen Sie die Vorschau für Ihr Studio',
  },
  {
    key: 'cosmetics',
    branch: /kosmetik|haut/i,
    title: 'Ihr Studio aus einer neuen Perspektive',
    benefit:
      'Eine Website könnte Ihr Angebot ruhig und übersichtlich vorstellen, damit Interessierte vor einer Anfrage eine erste Orientierung erhalten.',
    caption: 'Ihr Studio als Website-Entwurf ansehen',
  },
  {
    key: 'cafe',
    branch: /café|cafe|kaffee/i,
    title: 'Ein erster Eindruck vor dem Cafébesuch',
    benefit:
      'Gäste könnten sich vor dem Besuch über Ihr Angebot und den Standort orientieren – auch unterwegs auf dem Smartphone.',
    caption: 'Entdecken Sie die Website-Idee für Ihr Café',
  },
  {
    key: 'restaurant-takeaway',
    branch: /restaurant|bistro|gasthaus|trattoria|pizzeria/i,
    focus: /abhol|außer haus|mitnehm/i,
    title: 'Ihr Angebot vor dem Besuch entdecken',
    benefit: 'Eine übersichtliche Website könnte Gästen helfen, den Besuch oder eine Anfrage zur Abholung vorzubereiten.',
    caption: 'Ein Blick in Ihren Restaurant-Entwurf',
  },
  {
    key: 'restaurant',
    branch: /restaurant|bistro|gasthaus|trattoria|pizzeria|gastronom/i,
    title: 'Ein Vorgeschmack auf Ihren Webauftritt',
    benefit:
      'Gäste könnten Ihr Angebot und die Anfahrt vor dem Besuch überblicken und eine Reservierungsanfrage gezielt vorbereiten.',
    caption: 'Ihre Restaurant-Vorschau kostenlos ansehen',
  },
  {
    key: 'books',
    branch: /buch/i,
    title: 'Eine digitale Bühne für Ihr Buchangebot',
    benefit: 'Interessierte könnten Ihr Angebot kennenlernen und eine Buchanfrage oder den Besuch im Geschäft vorbereiten.',
    caption: 'Entdecken Sie Ihren Buchhandlungs-Entwurf',
  },
  {
    key: 'flowers',
    branch: /blumen|florist/i,
    title: 'Ihr Blumenangebot als Website-Idee',
    benefit:
      'Interessierte könnten sich vor dem Besuch einen Überblick verschaffen und ihren Blumenwunsch für eine Anfrage zusammenstellen.',
    caption: 'Ihre persönliche Website-Idee ansehen',
  },
  {
    key: 'retail',
    branch: /handel|laden|boutique|mode|geschäft/i,
    title: 'Ein digitaler Einblick in Ihr Geschäft',
    benefit: 'Eine Website könnte Ihr Sortiment vorstellen, den Weg ins Geschäft zeigen und Fragen vor einem Besuch erleichtern.',
    caption: 'Schauen Sie in den Entwurf für Ihr Geschäft',
  },
  {
    key: 'music',
    branch: /musik|klavier|instrument/i,
    title: 'Ihr Unterrichtsangebot als Website-Entwurf',
    benefit:
      'Interessierte könnten sich über den Unterricht orientieren und vor einer Anfrage beschreiben, was sie lernen möchten.',
    caption: 'Entdecken Sie Ihren Unterrichts-Entwurf',
  },
  {
    key: 'yoga',
    branch: /yoga|pilates/i,
    title: 'Eine Website-Idee für den Einstieg in Ihr Angebot',
    benefit: 'Interessierte könnten passende Angebote kennenlernen und vor einer Anfrage ihre Fragen zur Teilnahme klären.',
    caption: 'Ihre Kurs-Website-Idee kostenlos ansehen',
  },
  {
    key: 'dance',
    branch: /tanz|ballett/i,
    title: 'Der erste Schritt zu Ihrem Website-Entwurf',
    benefit: 'Interessierte könnten sich zu Ihrem Tanzangebot orientieren und eine Frage zum passenden Einstieg vorbereiten.',
    caption: 'Ihr Tanzangebot als Website-Idee entdecken',
  },
  {
    key: 'training',
    branch: /kurs|training|fitness/i,
    title: 'Ihr Angebot auf einen Blick – als Website-Idee',
    benefit:
      'Interessierte könnten das Angebot überblicken und ihre Ziele oder Fragen vor einer Anfrage zur Teilnahme formulieren.',
    caption: 'Öffnen Sie Ihre persönliche Kurs-Vorschau',
  },
];

/** Uses only reviewed details as facts. A sector profile describes a possible use, never a promise. */
export function previewInvitationCopy(context: VerifiedLetterContext, sequence: 1 | 2 | 3 = 1, variant = 'A') {
  const facts = reviewedLetterDetails(context).filter(
    (f) => !/€|\beuro\b|\beur\b|\bpreis|\btarif|\d\s*%|\d+\s*[,.]-|\bab\s+\d/i.test(f.text),
  );
  // Price facts belong to the demo/offer. Never let a reviewed price leak into this invitation.
  const usable = facts.filter((f) => !f.kind && !/€|\beuro\b|\beur\b|\bpreis|\btarif|\bmonat\b|\d\s*%/i.test(f.text));
  const allDetail = usable.map((f) => f.text).join(' ');
  const profile = PROFILES.find((p) => p.branch.test(context.branchLabel) && (!p.focus || p.focus.test(allDetail))) ?? {
    key: 'general',
    title: 'Eine Website-Idee speziell für Ihren Betrieb',
    benefit: 'Interessierte könnten Ihr Angebot, den Standort und den passenden Kontakt auf einen Blick finden.',
    caption: 'Ihre persönliche Website-Vorschau kostenlos ansehen',
  };
  const selected: typeof usable = [];
  for (const fact of usable) {
    if (selected.length === 2) break;
    if (selected.length && selected.map((f) => f.text).join(' und ').length + fact.text.length > 180) continue;
    selected.push(fact);
  }
  const observation = facts.find((f) => f.kind === 'public_observation');
  const website = facts.find((f) => f.kind === 'website_search');
  const serviceFacts = selected.filter(
    (f) => !/^(?:Anfragen|Terminanfragen|Reservierungsanfragen|Kursanfragen|Termine nach|Abholung|Besuch vor Ort)/i.test(f.text),
  );
  const detail = (serviceFacts.length ? serviceFacts : selected).map((f) => f.text).join(' und ');
  const place = context.city.length <= 32 ? ` in ${context.city}` : '';
  const research = website
    ? 'Bei unserer dokumentierten Suche haben wir keinen eigenen Webauftritt gefunden.'
    : observation
      ? `In Ihrem öffentlichen Eintrag ist uns aufgefallen: ${observation.text}.`
      : undefined;
  const opening =
    sequence === 3
      ? 'hier ist der überarbeitete, weiterhin unverbindliche Website-Entwurf für Ihren Betrieb.'
      : sequence === 2
        ? 'hier finden Sie die Vorschau für Ihren Betrieb noch einmal – zum Ansehen, wann es für Sie passt.'
        : variant === 'B'
          ? `für Ihren Betrieb${place} habe ich einen eigenen Website-Entwurf vorbereitet.`
          : `für ${context.businessName} habe ich einen eigenen Website-Entwurf vorbereitet.`;
  const personal = detail
    ? variant === 'B'
      ? `Gerade bei Themen wie ${detail} ist ein klarer Überblick hilfreich.`
      : `${detail} – diese Angaben zu Ihrem Betrieb stehen im Mittelpunkt dieser Website-Idee.`
    : (research ?? `Der Entwurf greift die Branche ${context.branchLabel} und Ihren Standort auf.`);
  const headline = context.businessName.length < 58 ? `${context.businessName}: ${profile.title}` : profile.title;
  return {
    version: PREVIEW_LETTER_VERSION,
    level: (selected.length || observation || website ? 'verified' : 'basic') as 'verified' | 'basic',
    profile: profile.key,
    subject:
      sequence === 3
        ? `Der überarbeitete Website-Entwurf für ${context.businessName}`
        : sequence === 2
          ? `Ihre persönliche Website-Vorschau zum Wiederansehen`
          : headline,
    opening,
    intro: [
      detail
        ? `**${detail}** – ${profile.benefit.replace(/^(Eine|Wer|Neue)\b/, (s) => s.toLowerCase())}`
        : `${personal} ${profile.benefit}`,
      ...(research && detail ? [research] : []),
    ],
    scan: 'QR-Code scannen, Vorschau kostenlos ansehen – ohne Anmeldung oder Verkaufsgespräch.',
    qrCaption: profile.caption,
    next: PREVIEW_ORDER_NOTICE,
    sources: [...selected, ...(website ? [website] : observation ? [observation] : [])].map((f) => ({
      text: f.text,
      source: f.source,
    })),
  };
}
