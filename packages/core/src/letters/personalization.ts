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
  // Bis zu drei Leistungsangaben plus je ein Recherchebefund (Website-Suche, Beobachtung) – kein Befund verdrängt den anderen
  const kept = [
    ...facts.filter((d) => !d.kind).slice(0, 3),
    ...(['website_search', 'public_observation'] as const).flatMap((k) => facts.filter((d) => d.kind === k).slice(0, 1)),
  ];
  return kept.map((d) => ({ ...d, text: d.text.trim().replace(/[.!]$/, ''), source: d.source.trim() }));
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
  '**Kein Verkaufsgespräch:** Ich rufe Sie nicht an. Gefällt Ihnen der Entwurf, passe ich ihn mit Ihnen an; online geht er erst nach Ihrer Freigabe. Sonst ist nichts zu tun. Unabhängiger, nicht beauftragter Entwurf: ohne Bestellung keine Kosten, die Umsetzung ist kostenpflichtig – Preise und Vertragsbedingungen stehen vor jeder Bestellung in der Vorschau.';

const PROFILES: { key: string; branch: RegExp; focus?: RegExp; title: string; benefit: string; caption: string }[] = [
  {
    key: 'painter-renovation',
    branch: /maler|anstrich/i,
    focus: /renovier|sanier/i,
    title: 'Ihre Website-Vorschau für Renovierungen ist online',
    benefit: 'wer in {ort} renovieren möchte, sieht dort sofort, was Sie anbieten – und erreicht Sie mit einem Fingertipp.',
    caption: 'Ihre Website-Vorschau ansehen',
  },
  {
    key: 'cleaning-commercial',
    branch: /reinig/i,
    focus: /büro|buero|gewerbe|treppenhaus|fenster/i,
    title: 'Ihre Website-Vorschau für Gebäudereinigung ist online',
    benefit:
      'Firmen und Verwaltungen in {ort} sehen dort auf einen Blick, welche Bereiche Sie reinigen – und fragen ihr Objekt direkt an.',
    caption: 'Ihre Website-Vorschau ansehen',
  },
  {
    key: 'tiling-renovation',
    branch: /fliesen/i,
    focus: /bad|renovier|sanier/i,
    title: 'Ihre Website-Vorschau für Bad und Boden ist online',
    benefit:
      'wer in {ort} Bad oder Boden erneuern will, sieht dort sofort, was Sie anbieten – und erreicht Sie mit einem Fingertipp.',
    caption: 'Ihre Fliesen-Website ansehen',
  },
  {
    key: 'tiling',
    branch: /fliesen/i,
    title: 'Ihre Website-Vorschau für Fliesenarbeiten ist online',
    benefit:
      'wer in {ort} einen Fliesenleger sucht, sieht dort Ihre Leistungen, Ihren Standort und erreicht Sie mit einem Fingertipp.',
    caption: 'Ihre Website-Vorschau ansehen',
  },
  {
    key: 'painter-material',
    branch: /maler|anstrich/i,
    focus: /kalk|lehm|mineral|farbberat/i,
    title: 'Ihre Website-Vorschau für Farbe und Material ist online',
    benefit: 'Ihre Farb- und Materialarbeiten bekommen dort eine ruhige, hochwertige Bühne – mit Standort und direktem Kontakt.',
    caption: 'Ihre Website-Vorschau ansehen',
  },
  {
    key: 'painter-stairway',
    branch: /maler|anstrich/i,
    focus: /treppen|fassad|außen/i,
    title: 'Ihre Website-Vorschau für Malerarbeiten ist online',
    benefit:
      'wer in {ort} einen Maler sucht, sieht dort sofort, welche Arbeiten Sie übernehmen – und erreicht Sie mit einem Fingertipp.',
    caption: 'Ihre Website-Vorschau ansehen',
  },
  {
    key: 'painter',
    branch: /maler|anstrich/i,
    title: 'Ihre Website-Vorschau für Ihren Malerbetrieb ist online',
    benefit: 'wer in {ort} einen Maler sucht, findet dort Ihre Leistungen, Ihren Standort und Ihre Nummer zum Antippen.',
    caption: 'Ihre Maler-Website ansehen',
  },
  {
    key: 'electric-solar',
    branch: /elektro/i,
    focus: /photovoltaik|solaranlag|pv-anlag/i,
    title: 'Ihre Website-Vorschau für Photovoltaik ist online',
    benefit: 'wer in {ort} eine Anlage plant, sieht dort Ihr Angebot und erreicht Sie mit einem Fingertipp.',
    caption: 'Ihre Website-Vorschau ansehen',
  },
  {
    key: 'electric-renovation',
    branch: /elektro/i,
    focus: /umbau|sanier|modernisier/i,
    title: 'Ihre Website-Vorschau für Elektroarbeiten ist online',
    benefit:
      'wer in {ort} umbaut oder modernisiert, sieht dort sofort, was Sie übernehmen – und erreicht Sie mit einem Fingertipp.',
    caption: 'Ihre Website-Vorschau ansehen',
  },
  {
    key: 'electric-light',
    branch: /elektro/i,
    focus: /licht|beleucht/i,
    title: 'Ihre Website-Vorschau für Licht und Beleuchtung ist online',
    benefit: 'Ihr Angebot rund um Licht und Beleuchtung steht dort übersichtlich – mit Standort und direktem Kontakt.',
    caption: 'Ihre Website-Vorschau ansehen',
  },
  {
    key: 'electric',
    branch: /elektro/i,
    title: 'Ihre Website-Vorschau für Ihren Elektrobetrieb ist online',
    benefit: 'wer in {ort} einen Elektriker sucht, findet dort Ihre Leistungen, Ihren Standort und Ihre Nummer zum Antippen.',
    caption: 'Ihre Website-Vorschau ansehen',
  },
  {
    key: 'plumbing',
    branch: /sanitär|sanitaer|heizung|installat/i,
    title: 'Ihre Website-Vorschau für Ihren Installationsbetrieb ist online',
    benefit: 'wer in {ort} Hilfe braucht, sieht dort sofort, was Sie anbieten – und erreicht Sie mit einem Fingertipp.',
    caption: 'Ihre Website-Vorschau ansehen',
  },
  {
    key: 'garden-care',
    branch: /garten|landschaft|gärtner|gaertner/i,
    focus: /pflege|schnitt/i,
    title: 'Ihre Website-Vorschau für Gartenpflege ist online',
    benefit: 'wer in {ort} Hilfe im Garten sucht, sieht dort Ihre Leistungen und erreicht Sie mit einem Fingertipp.',
    caption: 'Ihre Garten-Website ansehen',
  },
  {
    key: 'garden',
    branch: /garten|landschaft|gärtner|gaertner/i,
    title: 'Ihre Website-Vorschau für Ihren Gartenbetrieb ist online',
    benefit: 'Ihre Arbeiten im Grünen stehen dort übersichtlich – mit Standort, Kontakt und Platz für eigene Projektfotos.',
    caption: 'Ihre Website-Vorschau ansehen',
  },
  {
    key: 'cleaning',
    branch: /reinig/i,
    title: 'Ihre Website-Vorschau für Ihren Reinigungsbetrieb ist online',
    benefit: 'wer in {ort} eine Reinigung sucht, sieht dort sofort, was Sie übernehmen – und erreicht Sie mit einem Fingertipp.',
    caption: 'Ihre Website-Vorschau ansehen',
  },
  {
    key: 'barber',
    branch: /barber|barbier/i,
    title: 'Ihre Website-Vorschau für Ihren Barbershop ist online',
    benefit: 'wer in {ort} einen neuen Barbier sucht, sieht dort Ihr Angebot und findet direkt den Weg zum Termin.',
    caption: 'Ihre Website-Vorschau ansehen',
  },
  {
    key: 'hair-color',
    branch: /fris[öe]|friseur|haarsalon/i,
    focus: /farb|color|balayage|strähn/i,
    title: 'Ihre Website-Vorschau für Haarfarben ist online',
    benefit: 'wer in {ort} über eine neue Haarfarbe nachdenkt, findet dort Ihr Angebot und den direkten Weg zur Terminanfrage.',
    caption: 'Ihre Salon-Website ansehen',
  },
  {
    key: 'hair',
    branch: /fris[öe]|friseur|haarsalon/i,
    title: 'Ihre Website-Vorschau für Ihren Salon ist online',
    benefit: 'neue Kundinnen und Kunden in {ort} sehen dort Ihr Angebot und fragen ihren Termin direkt am Handy an.',
    caption: 'Ihre Salon-Website ansehen',
  },
  {
    key: 'nails',
    branch: /nagel|nail/i,
    title: 'Ihre Website-Vorschau für Ihr Nagelstudio ist online',
    benefit: 'wer in {ort} ein Nagelstudio sucht, sieht dort Ihr Angebot und fragt den Termin direkt am Handy an.',
    caption: 'Ihre Studio-Website ansehen',
  },
  {
    key: 'cosmetics',
    branch: /kosmetik|haut/i,
    title: 'Ihre Website-Vorschau für Ihr Kosmetikstudio ist online',
    benefit: 'Ihr Angebot steht dort ruhig und übersichtlich – mit Adresse und direktem Weg zur Terminanfrage.',
    caption: 'Ihre Studio-Website ansehen',
  },
  {
    key: 'cafe',
    branch: /café|cafe|kaffee/i,
    title: 'Ihre Website-Vorschau für Ihr Café ist online',
    benefit: 'Gäste in {ort} sehen dort schon vor dem Besuch, was Sie anbieten und wo sie Sie finden.',
    caption: 'Ihre Café-Website ansehen',
  },
  {
    key: 'restaurant-takeaway',
    branch: /restaurant|bistro|gasthaus|trattoria|pizzeria/i,
    focus: /abhol|außer haus|mitnehm/i,
    title: 'Ihre Website-Vorschau für Restaurant und Abholung ist online',
    benefit: 'Gäste in {ort} finden dort Ihr Angebot und die Anfahrt und können Besuch oder Abholung vorbereiten.',
    caption: 'Ihre Restaurant-Website ansehen',
  },
  {
    key: 'restaurant',
    branch: /restaurant|bistro|gasthaus|trattoria|pizzeria|gastronom/i,
    title: 'Ihre Website-Vorschau für Ihr Restaurant ist online',
    benefit: 'Gäste in {ort} sehen dort vor dem Besuch Ihr Angebot und finden direkt den Weg zur Reservierungsanfrage.',
    caption: 'Ihre Restaurant-Website ansehen',
  },
  {
    key: 'books',
    branch: /buch/i,
    title: 'Ihre Website-Vorschau für Ihre Buchhandlung ist online',
    benefit: 'Leserinnen und Leser in {ort} finden dort Ihr Angebot, Ihren Laden und den direkten Weg zu Ihnen.',
    caption: 'Ihre Website-Vorschau ansehen',
  },
  {
    key: 'flowers',
    branch: /blumen|florist/i,
    title: 'Ihre Website-Vorschau für Ihr Blumengeschäft ist online',
    benefit: 'wer in {ort} Blumen sucht, sieht dort Ihr Angebot und fragt seinen Wunsch direkt an.',
    caption: 'Ihre Website-Vorschau ansehen',
  },
  {
    key: 'retail',
    branch: /handel|laden|boutique|mode|geschäft/i,
    title: 'Ihre Website-Vorschau für Ihr Geschäft ist online',
    benefit: 'Kundschaft in {ort} sieht dort Ihr Sortiment und den Weg in Ihr Geschäft – schon vor dem Besuch.',
    caption: 'Ihre Website-Vorschau ansehen',
  },
  {
    key: 'music',
    branch: /musik|klavier|instrument/i,
    title: 'Ihre Website-Vorschau für Ihren Musikunterricht ist online',
    benefit: 'Interessierte in {ort} sehen dort, was sie bei Ihnen lernen können, und fragen direkt an.',
    caption: 'Ihre Website-Vorschau ansehen',
  },
  {
    key: 'yoga',
    branch: /yoga|pilates/i,
    title: 'Ihre Website-Vorschau für Ihre Kurse ist online',
    benefit: 'Interessierte in {ort} sehen dort Ihre Kurse und finden direkt den Weg zur ersten Anfrage.',
    caption: 'Ihre Website-Vorschau ansehen',
  },
  {
    key: 'dance',
    branch: /tanz|ballett/i,
    title: 'Ihre Website-Vorschau für Ihre Tanzschule ist online',
    benefit: 'Interessierte in {ort} sehen dort Ihr Tanzangebot und fragen den passenden Einstieg direkt an.',
    caption: 'Ihre Website-Vorschau ansehen',
  },
  {
    key: 'training',
    branch: /kurs|training|fitness/i,
    title: 'Ihre Website-Vorschau für Ihr Training ist online',
    benefit: 'Interessierte in {ort} sehen dort Ihr Angebot auf einen Blick und fragen die Teilnahme direkt an.',
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
    title: 'Ihre Website-Vorschau ist online',
    benefit: 'Wer in {ort} nach Ihnen sucht, findet dort Ihr Angebot, Ihren Standort und Ihre Nummer zum Antippen.',
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
    ? 'Bei unserer dokumentierten Suche haben wir keinen eigenen Webauftritt von Ihnen gefunden.'
    : undefined;
  // Persönlicher Aufhänger nur aus einem belegten, aktuellen Recherchebefund – nie erfunden
  const noticed = observation && sequence === 1 ? `mir ist aufgefallen: ${observation.text}.` : undefined;
  const opening =
    sequence === 3
      ? 'hier ist der überarbeitete, weiterhin unverbindliche Website-Entwurf für Ihren Betrieb.'
      : sequence === 2
        ? 'hier finden Sie die Vorschau für Ihren Betrieb noch einmal – zum Ansehen, wann es für Sie passt.'
        : noticed
          ? `${noticed} Deshalb habe ich für Ihren Betrieb${place} eine eigene Website gebaut – mit Ihrem Namen, Ihrer Adresse und Ihren Kontaktdaten.`
          : variant === 'B'
            ? `für Ihren Betrieb${place} habe ich eine eigene Website gebaut – mit Ihrem Namen, Ihrer Adresse und Ihren Kontaktdaten.`
            : 'ich habe für Ihren Betrieb eine eigene Website gebaut – mit Ihrem Namen, Ihrer Adresse und Ihren Kontaktdaten.';
  const personal = detail
    ? variant === 'B'
      ? `Gerade bei Themen wie ${detail} ist ein klarer Überblick hilfreich.`
      : `${detail} – diese Angaben zu Ihrem Betrieb stehen im Mittelpunkt dieser Website-Idee.`
    : (research ?? `Der Entwurf greift die Branche ${context.branchLabel} und Ihren Standort auf.`);
  const headline = context.businessName.length < 58 ? `${context.businessName}: ${profile.title}` : profile.title;
  // Lokaler Bezug im Nutzen-Satz („wer in Dortmund …“); ohne kurzen Ortsnamen neutral
  const benefit = profile.benefit.replace(' in {ort}', place).replace(/^(Eine|Wer|Neue|Der)\b/, (w) => w.toLowerCase());
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
        ? `**${detail}** – ${benefit}${research ? ` ${research}` : ''}`
        : `${personal} ${benefit.charAt(0).toUpperCase()}${benefit.slice(1)}`,
    ],
    scan: '**QR-Code mit der Handykamera scannen und kostenlos ansehen:** Ihre Website ist schon online, aber nur über Ihren persönlichen Link erreichbar. Ein Blick dauert keine Minute.',
    qrCaption: profile.caption,
    next: PREVIEW_ORDER_NOTICE,
    /** Geprüfter Recherchehinweis (Website-Suche) – auch für KI-Fassungen unverändert angehängt */
    research,
    /** Belegter Befund für den persönlichen Einstieg (nur Brief 1) */
    observation: observation && sequence === 1 ? { text: observation.text, source: observation.source } : undefined,
    sources: [...selected, ...(website ? [website] : []), ...(noticed && observation ? [observation] : [])].map((f) => ({
      text: f.text,
      source: f.source,
    })),
  };
}
