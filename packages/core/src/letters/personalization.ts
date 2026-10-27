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
  '**So geht es weiter:** Gefällt Ihnen der Entwurf, passe ich ihn mit Ihnen an; online geht er erst nach Ihrer Freigabe. Sonst ist nichts zu tun. Unabhängiger, nicht beauftragter Entwurf: ohne Bestellung keine Kosten, die Umsetzung ist kostenpflichtig – Preise und Vertragsbedingungen stehen vor jeder Bestellung in der Vorschau.';
const PROFILES: { key: string; branch: RegExp; focus?: RegExp; title: string; benefit: string; caption: string }[] = [
  {
    key: 'painter-renovation',
    branch: /maler|anstrich/i,
    focus: /renovier|sanier/i,
    title: 'Ihre Renovierungsarbeiten als eigene Website',
    benefit:
      'Wer renovieren möchte, sieht im Entwurf sofort, was Sie anbieten, wo Sie arbeiten und wie man Sie erreicht – direkt am Handy.',
    caption: 'Ihre Website-Vorschau ansehen',
  },
  {
    key: 'cleaning-commercial',
    branch: /reinig/i,
    focus: /büro|buero|gewerbe|treppenhaus|fenster/i,
    title: 'Ihre Gebäudereinigung als eigene Website',
    benefit:
      'Gewerbekunden sehen im Entwurf auf einen Blick, welche Bereiche Sie reinigen, wo Ihr Betrieb sitzt und wie sie ein Objekt anfragen.',
    caption: 'Ihre Website-Vorschau ansehen',
  },
  {
    key: 'tiling-renovation',
    branch: /fliesen/i,
    focus: /bad|renovier|sanier/i,
    title: 'Ihre Fliesenarbeiten als eigene Website',
    benefit:
      'Wer Bad oder Boden erneuern will, findet im Entwurf Ihre Leistungen, Ihren Standort und den direkten Weg zur Anfrage. Eigene Projektfotos lassen sich jederzeit ergänzen.',
    caption: 'Ihre Fliesen-Website ansehen',
  },
  {
    key: 'tiling',
    branch: /fliesen/i,
    title: 'Ihr Fliesenbetrieb mit eigener Website',
    benefit: 'Der Entwurf zeigt Ihre Fliesenarbeiten übersichtlich, mit Standort und Kontakt – am Computer genauso wie am Handy.',
    caption: 'Ihre Website-Vorschau ansehen',
  },
  {
    key: 'painter-material',
    branch: /maler|anstrich/i,
    focus: /kalk|lehm|mineral|farbberat/i,
    title: 'Ihre Farbideen als eigene Website',
    benefit:
      'Der Entwurf gibt Ihren Farb- und Materialleistungen eine ruhige, hochwertige Bühne – mit Standort und direktem Kontakt.',
    caption: 'Ihre Website-Vorschau ansehen',
  },
  {
    key: 'painter-stairway',
    branch: /maler|anstrich/i,
    focus: /treppen|fassad|außen/i,
    title: 'Ihre Malerarbeiten als eigene Website',
    benefit:
      'Interessierte sehen im Entwurf auf einen Blick, welche Arbeiten Sie übernehmen, wo Sie arbeiten und wie man Sie erreicht.',
    caption: 'Ihre Website-Vorschau ansehen',
  },
  {
    key: 'painter',
    branch: /maler|anstrich/i,
    title: 'So sieht Ihr Malerbetrieb im Netz aus',
    benefit:
      'Der Entwurf zeigt Ihre Leistungen, Ihren Standort und Ihre Kontaktwege auf einer Seite – gemacht für Kunden, die am Handy suchen.',
    caption: 'Ihre Maler-Website ansehen',
  },
  {
    key: 'electric-solar',
    branch: /elektro/i,
    focus: /photovoltaik|solaranlag|pv-anlag/i,
    title: 'Ihr Photovoltaik-Angebot als eigene Website',
    benefit: 'Wer eine Anlage plant, findet im Entwurf Ihr Angebot, Ihren Standort und den direkten Weg zur ersten Anfrage.',
    caption: 'Ihre Website-Vorschau ansehen',
  },
  {
    key: 'electric-renovation',
    branch: /elektro/i,
    focus: /umbau|sanier|modernisier/i,
    title: 'Ihre Elektroarbeiten als eigene Website',
    benefit: 'Wer umbaut oder modernisiert, sieht im Entwurf auf einen Blick, was Sie übernehmen und wie man Sie erreicht.',
    caption: 'Ihre Website-Vorschau ansehen',
  },
  {
    key: 'electric-light',
    branch: /elektro/i,
    focus: /licht|beleucht/i,
    title: 'Ihr Lichtangebot als eigene Website',
    benefit:
      'Der Entwurf stellt Ihr Angebot rund um Licht und Beleuchtung übersichtlich vor – mit Standort und direktem Kontakt.',
    caption: 'Ihre Website-Vorschau ansehen',
  },
  {
    key: 'electric',
    branch: /elektro/i,
    title: 'Ihr Elektrobetrieb mit eigener Website',
    benefit: 'Der Entwurf bündelt Ihre Leistungen, Ihren Standort und Ihre Kontaktwege auf einer übersichtlichen Seite.',
    caption: 'Ihre Website-Vorschau ansehen',
  },
  {
    key: 'plumbing',
    branch: /sanitär|sanitaer|heizung|installat/i,
    title: 'Ihr Installationsbetrieb mit eigener Website',
    benefit: 'Wer ein Anliegen hat, sieht im Entwurf sofort, was Sie anbieten, wo Ihr Betrieb sitzt und wie man Sie erreicht.',
    caption: 'Ihre Website-Vorschau ansehen',
  },
  {
    key: 'garden-care',
    branch: /garten|landschaft|gärtner|gaertner/i,
    focus: /pflege|schnitt/i,
    title: 'Ihre Gartenpflege als eigene Website',
    benefit: 'Wer Hilfe im Garten sucht, sieht im Entwurf Ihre Leistungen, Ihren Standort und den direkten Weg zur Anfrage.',
    caption: 'Ihre Garten-Website ansehen',
  },
  {
    key: 'garden',
    branch: /garten|landschaft|gärtner|gaertner/i,
    title: 'Ihr Gartenbetrieb mit eigener Website',
    benefit:
      'Der Entwurf stellt Ihre Arbeiten im Grünen übersichtlich vor – mit Standort, Kontakt und Platz für eigene Projektfotos.',
    caption: 'Ihre Website-Vorschau ansehen',
  },
  {
    key: 'cleaning',
    branch: /reinig/i,
    title: 'Ihr Reinigungsbetrieb mit eigener Website',
    benefit:
      'Der Entwurf zeigt, welche Reinigungsarbeiten Sie übernehmen und wie man Sie erreicht – übersichtlich am Computer und am Handy.',
    caption: 'Ihre Website-Vorschau ansehen',
  },
  {
    key: 'barber',
    branch: /barber|barbier/i,
    title: 'Ihr Barbershop mit eigener Website',
    benefit: 'Wer einen neuen Barbier sucht, sieht im Entwurf Ihr Angebot, Ihren Standort und den direkten Weg zum Termin.',
    caption: 'Ihre Website-Vorschau ansehen',
  },
  {
    key: 'hair-color',
    branch: /fris[öe]|friseur|haarsalon/i,
    focus: /farb|color|balayage|strähn/i,
    title: 'Ihre Farbangebote als eigene Website',
    benefit:
      'Wer über eine neue Haarfarbe nachdenkt, findet im Entwurf Ihr Angebot, Ihren Salon und den direkten Weg zur Terminanfrage.',
    caption: 'Ihre Salon-Website ansehen',
  },
  {
    key: 'hair',
    branch: /fris[öe]|friseur|haarsalon/i,
    title: 'Ihr Salon mit eigener Website',
    benefit:
      'Neue Kundinnen und Kunden sehen im Entwurf Ihr Angebot, Ihre Adresse und wie sie einen Termin anfragen – direkt am Handy.',
    caption: 'Ihre Salon-Website ansehen',
  },
  {
    key: 'nails',
    branch: /nagel|nail/i,
    title: 'Ihr Nagelstudio mit eigener Website',
    benefit: 'Der Entwurf zeigt Ihr Angebot, Ihren Standort und den Weg zur Terminanfrage – übersichtlich am Handy.',
    caption: 'Ihre Studio-Website ansehen',
  },
  {
    key: 'cosmetics',
    branch: /kosmetik|haut/i,
    title: 'Ihr Kosmetikstudio mit eigener Website',
    benefit: 'Der Entwurf stellt Ihr Angebot ruhig und übersichtlich vor – mit Adresse und direktem Weg zur Terminanfrage.',
    caption: 'Ihre Studio-Website ansehen',
  },
  {
    key: 'cafe',
    branch: /café|cafe|kaffee/i,
    title: 'Ihr Café mit eigener Website',
    benefit: 'Gäste sehen im Entwurf schon vor dem Besuch, was Sie anbieten und wo sie Sie finden – auch unterwegs am Handy.',
    caption: 'Ihre Café-Website ansehen',
  },
  {
    key: 'restaurant-takeaway',
    branch: /restaurant|bistro|gasthaus|trattoria|pizzeria/i,
    focus: /abhol|außer haus|mitnehm/i,
    title: 'Ihr Restaurant mit eigener Website',
    benefit: 'Gäste finden im Entwurf Ihr Angebot und die Anfahrt und können ihren Besuch oder die Abholung vorbereiten.',
    caption: 'Ihre Restaurant-Website ansehen',
  },
  {
    key: 'restaurant',
    branch: /restaurant|bistro|gasthaus|trattoria|pizzeria|gastronom/i,
    title: 'Ihr Restaurant mit eigener Website',
    benefit:
      'Gäste sehen im Entwurf vor dem Besuch Ihr Angebot und die Anfahrt – und finden direkt den Weg zur Reservierungsanfrage.',
    caption: 'Ihre Restaurant-Website ansehen',
  },
  {
    key: 'books',
    branch: /buch/i,
    title: 'Ihre Buchhandlung mit eigener Website',
    benefit: 'Leserinnen und Leser finden im Entwurf Ihr Angebot, Ihren Laden und den direkten Weg zu Ihnen.',
    caption: 'Ihre Website-Vorschau ansehen',
  },
  {
    key: 'flowers',
    branch: /blumen|florist/i,
    title: 'Ihr Blumengeschäft mit eigener Website',
    benefit: 'Der Entwurf zeigt Ihr Angebot, Ihren Laden und wie man einen Blumenwunsch bei Ihnen anfragt.',
    caption: 'Ihre Website-Vorschau ansehen',
  },
  {
    key: 'retail',
    branch: /handel|laden|boutique|mode|geschäft/i,
    title: 'Ihr Geschäft mit eigener Website',
    benefit: 'Der Entwurf stellt Ihr Sortiment vor, zeigt den Weg in Ihr Geschäft und beantwortet erste Fragen vor dem Besuch.',
    caption: 'Ihre Website-Vorschau ansehen',
  },
  {
    key: 'music',
    branch: /musik|klavier|instrument/i,
    title: 'Ihr Musikunterricht mit eigener Website',
    benefit: 'Interessierte sehen im Entwurf, was sie bei Ihnen lernen können, und finden direkt den Weg zur Anfrage.',
    caption: 'Ihre Website-Vorschau ansehen',
  },
  {
    key: 'yoga',
    branch: /yoga|pilates/i,
    title: 'Ihr Kursangebot mit eigener Website',
    benefit: 'Der Entwurf stellt Ihre Kurse übersichtlich vor und zeigt Interessierten den direkten Weg zur ersten Anfrage.',
    caption: 'Ihre Website-Vorschau ansehen',
  },
  {
    key: 'dance',
    branch: /tanz|ballett/i,
    title: 'Ihre Tanzschule mit eigener Website',
    benefit:
      'Der Entwurf stellt Ihr Tanzangebot übersichtlich vor und zeigt den direkten Weg zur Frage nach dem passenden Einstieg.',
    caption: 'Ihre Website-Vorschau ansehen',
  },
  {
    key: 'training',
    branch: /kurs|training|fitness/i,
    title: 'Ihr Trainingsangebot mit eigener Website',
    benefit: 'Der Entwurf zeigt Ihr Angebot auf einen Blick und den direkten Weg zur Anfrage für die Teilnahme.',
    caption: 'Ihre Website-Vorschau ansehen',
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
    title: 'Ihr Betrieb mit eigener Website',
    benefit:
      'Der Entwurf zeigt Ihr Angebot, Ihren Standort und Ihre Kontaktwege auf einer übersichtlichen Seite – gemacht fürs Handy.',
    caption: 'Ihre Website-Vorschau ansehen',
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
          ? `für Ihren Betrieb${place} habe ich eine eigene Website entworfen.`
          : 'ich habe für Ihren Betrieb eine eigene Website entworfen.';
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
    // Recherchehinweis im selben Absatz wie der Nutzen: ein Gedanke, und der Brief bleibt einseitig
    intro: [
      detail
        ? `**${detail}** – ${profile.benefit.replace(/^(Eine|Wer|Neue|Der)\b/, (s) => s.toLowerCase())}${research ? ` ${research}` : ''}`
        : `${personal} ${profile.benefit}`,
    ],
    scan: '**QR-Code scannen und kostenlos ansehen:** Ihre Website ist bereits online, aber nur über Ihren persönlichen Link erreichbar – ohne Anmeldung, ohne Verkaufsgespräch.',
    qrCaption: profile.caption,
    next: PREVIEW_ORDER_NOTICE,
    sources: [...selected, ...(website ? [website] : observation ? [observation] : [])].map((f) => ({
      text: f.text,
      source: f.source,
    })),
  };
}
