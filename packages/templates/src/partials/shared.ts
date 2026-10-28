import { artPalette } from '../art-direction';
import { designFontCss } from '../design-fonts';
import { brandMarkHtml } from '../brand';
import { readSiteCss } from '../css';
import { esc, mapsLink, paragraphs } from '../html';
import { icon } from '../icons';
import { getPalette, paletteCssVars } from '../palettes';
import { stockPhotoDataUri, stockPhotos } from '../photos';
import type { BranchGroup, IndustryKey, RenderInput } from '../types';

export interface SharedParts {
  /** Vollständiges <head>-Element */
  head: string;
  /** Skip-Link + Demo-/Vorschau-Banner (leer im Live-/Screenshot-Modus) */
  top: string;
  isDemo: boolean;
  isLive: boolean;
  /** Hinweis „Beispiel-Leistungen“ (nur Demo) */
  servicesNote(cls?: string): string;
  callHref: string | null;
  phoneLabel: string | null;
  /** Primärer CTA-Link (Anrufen, sonst Kontaktformular) */
  ctaHref: string;
  /**
   * Kontaktformular. Im Entwurf geht es an den Ersteller und steht deshalb erst am Seitenende beim Angebot
   * (vom Footer gerendert); `keepInline` behält die Position (Designprüfung).
   */
  contactSection(opts: ContactSectionClasses): string;
  /** Faktenzeile im Hero: Ort, Kontaktweg, Route (keine Behauptungen über den Betrieb) */
  trustChips(): string;
  /** Firmenname groß über der Überschrift (leer, wenn die Überschrift schon der Name ist) */
  heroName(cls?: string): string;
  /** Weitere typische Leistungen als gekennzeichnete Beispiele (nur Entwurf, nur neben belegten Leistungen) */
  exampleServices(): string;
  /** Hero-Aktionen: Haupt-Button, Telefon (falls vorhanden) und Faktenzeile */
  heroActions(ctaText: string): string;
  /** Beispielablauf einer Anfrage (nur Entwurf, nur Branchen mit Anfrageablauf) */
  process(opts: { sectionClass: string; titleClass: string; cardClass: string }): string;
  /**
   * Gebündelter Bereich „Kontakt & Anfahrt“ (id `oeffnungszeiten`): Telefon bzw. Anfrage, Adresse mit Route,
   * Öffnungszeiten; im Entwurf zusätzlich Einzugsgebiet, Stellenbereich und Vorschau des Anfrageformulars.
   */
  contactHub(opts: ContactHubClasses): string;
  hoursList(opts?: { rowClass?: string; labelClass?: string; mutedClass?: string }): string;
  addressLines: string;
  mapsHref: string;
  faqList(opts: { itemClass: string; summaryClass: string; answerClass: string }): string;
  footer(opts: { className: string; linkClass: string; omitOffer?: boolean }): string;
  /** Inhalt von „Über uns“ als Absätze */
  about(cls?: string): string;
  jsonLd: string;
  /** Logo (falls vorhanden) + Firmenname für den Seitenkopf */
  brand(): string;
  /** Bildergalerie mit Kundenfotos (leer, wenn keine Fotos) */
  gallery(opts?: { sectionClass?: string; titleClass?: string }): string;
  /** Playbook-Branche des Betriebs */
  industry: IndustryKey;
  /** Entwurf (Demo/Screenshot): Platzhalter und Beispielfotos erlaubt */
  draft: boolean;
  /**
   * Fotos für die Gestaltung: Kundenfotos (Vorschau/Live) oder – nur im Entwurf – lizenzfreie
   * Beispielfotos der Gruppe. `example` = als „Beispielfoto“ kennzeichnen.
   */
  photos(
    n: number,
  ): { src: string; alt: string; example: boolean; width?: number; height?: number; focalPoint?: { x: number; y: number } }[];
  /** Bild mit Kennzeichnung „Beispielfoto“ (im Entwurf) */
  figure(
    photo: { src: string; alt: string; example: boolean; width?: number; height?: number; focalPoint?: { x: number; y: number } },
    imgClass: string,
    figClass?: string,
  ): string;
  /**
   * Branchen-Abschnitte (B3): Speisekarte, Einzugsgebiet, „Wir stellen ein“, Kursplan und Vorschau der
   * Anfrageformulare. Nur im Entwurf (Demo/Screenshot) – Platzhalter gehen nie live.
   */
  industrySections(opts: IndustrySectionClasses): string;
}

export interface IndustrySectionClasses {
  sectionClass: string;
  altSectionClass: string;
  titleClass: string;
  cardClass: string;
  inputClass: string;
  buttonClass: string;
  /** Einzugsgebiet, Stellenbereich und Anfrage-Vorschau stehen bereits im Kontaktbereich (contactHub) */
  inHub?: boolean;
}

export interface ContactSectionClasses {
  sectionClass: string;
  cardClass: string;
  titleClass: string;
  buttonClass: string;
  inputClass: string;
  mutedClass?: string;
  iconClass?: string;
  keepInline?: boolean;
  /** intern: Aufruf aus dem Footer (Entwurf, nach dem Angebot) */
  atEnd?: boolean;
}

export interface ContactHubClasses {
  sectionClass: string;
  titleClass: string;
  cardClass: string;
  buttonClass: string;
  secondaryButtonClass: string;
}

/** Anfrageformular je Branche (Live: Zusatzfeld „wunsch“ geht als eigene Zeile in die Mail an den Kunden) */
export const REQUEST_FORMS: Record<IndustryKey, { title: string; wish: string | null; button: string; intro: string }> = {
  gastronomie: {
    title: 'Reservierungsanfrage',
    wish: 'Datum, Uhrzeit und Personenzahl',
    button: 'Reservierung anfragen',
    intro: 'Fragen Sie Ihren Tisch an – wir bestätigen die Reservierung so bald wie möglich.',
  },
  beauty: {
    title: 'Terminanfrage',
    wish: 'Wunschtermin und Leistung',
    button: 'Termin anfragen',
    intro: 'Fragen Sie Ihren Wunschtermin an – auch außerhalb der Öffnungszeiten. Wir melden uns mit einer Bestätigung.',
  },
  einzelhandel: {
    title: 'Vorab reservieren',
    wish: 'Welchen Artikel möchten Sie reservieren?',
    button: 'Reservierung anfragen',
    intro: 'Fragen Sie an, ob ein Artikel vorrätig ist, und lassen Sie ihn für sich zurücklegen.',
  },
  kurse_training: {
    title: 'Probestunde anfragen',
    wish: 'Kurs und Wunschtermin',
    button: 'Probestunde anfragen',
    intro: 'Fragen Sie eine Probestunde an – ganz ohne Anruf. Wir melden uns mit einem Termin.',
  },
  handwerk: {
    title: 'Anfrage',
    wish: 'Worum geht es? (Leistung, Ort, Zeitraum)',
    button: 'Anfrage senden',
    intro: 'Beschreiben Sie kurz Ihr Vorhaben – wir melden uns mit einem Rückruf oder einem Termin vor Ort.',
  },
  dienstleistung: {
    title: 'Kontakt',
    wish: null,
    button: 'Nachricht senden',
    intro: 'Schreiben Sie uns – wir melden uns schnellstmöglich bei Ihnen.',
  },
};

function faviconDataUri(letter: string, color: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="${color}"/><text x="16" y="22" font-family="Arial,sans-serif" font-size="18" font-weight="700" text-anchor="middle" fill="#fff">${letter}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/**
 * „Seite übernehmen“: zwei gleichwertige Preiskarten (keine Vorauswahl, keine versteckten Kosten) und
 * Vertrauensblock des Erstellers. Eigenes, neutrales Design – deutlich vom Entwurf des Betriebs abgesetzt.
 */
export function offerSection(demo: NonNullable<RenderInput['demo']>, opts: { review?: boolean } = {}): string {
  const cards = demo.offers ?? [];
  if (!cards.length && !demo.trust) return '';
  const v4 = demo.offerVersion === 'v4';
  const button = (c: (typeof cards)[number]) =>
    `<a href="${esc(c.href)}" class="mt-4 inline-flex min-h-11 items-center justify-center rounded-md bg-[#111827] px-4 py-2 font-semibold text-white hover:bg-[#1f2937] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#111827]">${demo.offerVersion === 'v4' ? `Mit ${esc(c.title.replace('SeitenWerk ', ''))} übernehmen` : `${esc(c.title)} wählen`}</a>`;
  const points = (list: string[]) =>
    `<ul class="mt-3 flex-1 space-y-1.5 text-sm text-[#374151]">${list.map((p) => `<li class="flex gap-2"><span aria-hidden="true" class="text-[#047857]">✓</span><span>${esc(p)}</span></li>`).join('')}</ul>`;
  // V4: Einrichtung ist bei beiden Tarifen gleich – groß steht der Monatsbetrag, der den Unterschied macht
  const card = (c: (typeof cards)[number]) =>
    c.monthly
      ? `<li class="flex flex-col rounded-xl border border-[#d1d5db] bg-white p-5 text-[#111827] shadow-sm">
      <h3 class="text-base font-semibold">${esc(c.title)}</h3>
      <p class="mt-2"><span class="text-3xl font-bold tracking-tight">${esc(c.monthly)}</span> <span class="text-sm text-[#4b5563]">pro Monat ab Go-Live</span></p>
      <p class="mt-1 text-sm text-[#4b5563]">zzgl. ${esc(c.price)} ${esc(c.unit)} für die Einrichtung</p>
      ${points(c.points.filter((p) => !p.startsWith('+ ')))}
      ${button(c)}
    </li>`
      : `<li class="flex flex-col rounded-xl border border-[#d1d5db] bg-white p-5 text-[#111827] shadow-sm">
      <h3 class="text-base font-semibold">${esc(c.title)}</h3>
      <p class="mt-2 text-3xl font-bold tracking-tight">${esc(c.price)}</p><p class="mt-1 text-sm text-[#4b5563]">${esc(c.unit)}</p>
      ${points(c.points)}
      ${button(c)}
    </li>`;
  const t = demo.trust;
  const initials = (t?.name ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');
  const trust = t
    ? `<div class="mt-6 flex flex-col gap-4 rounded-xl border border-[#d1d5db] bg-white p-5 text-[#111827] sm:flex-row sm:items-start">
      ${
        t.photoDataUri
          ? `<img src="${t.photoDataUri}" alt="${esc(t.name)}" width="96" height="96" class="h-24 w-24 shrink-0 rounded-full object-cover">`
          : initials
            ? `<span aria-hidden="true" class="inline-flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#1f4fd8] text-xl font-semibold text-white">${esc(initials)}</span>`
            : ''
      }
      <div>
        <h3 class="text-base font-semibold">Wer hat diesen Entwurf gebaut?</h3>
        <p class="mt-1 font-medium">${esc(t.name) || 'Anbieterangaben noch nicht vollständig – Veröffentlichung gesperrt'}</p>
        ${t.intro ? `<p class="mt-2 text-sm text-[#374151]">${esc(t.intro)}</p>` : ''}
        <p class="mt-3 text-sm text-[#374151]">${t.email ? `<a class="underline" href="mailto:${esc(t.email)}">${esc(t.email)}</a>` : ''}${t.phone ? ` · <a class="underline" href="tel:${esc(t.phone.replace(/[^+\d]/g, ''))}">${esc(t.phone)}</a>` : ''} · <a class="underline" href="${esc(t.imprintUrl)}">Impressum</a></p>
      </div>
    </div>`
    : '';
  return `<section id="uebernehmen" aria-labelledby="uebernehmen-titel" class="border-t border-[#dce2ed] bg-[#f3f4f6] py-12 text-[#111827]">
  <div class="mx-auto max-w-4xl px-4">
    <p class="text-sm font-medium text-[#4b5563]">${brandMarkHtml(24)} Angebot von ${esc(demo.sender.name) || 'TODO: vollständiger Anbietername'}, ${esc(demo.sender.company)} – nicht Teil der Website</p>
    <h2 id="uebernehmen-titel" class="mt-1 text-2xl font-semibold tracking-tight">${v4 ? 'Gefällt Ihnen Ihre neue Website?' : 'Diese Seite übernehmen'}</h2>${
      v4
        ? `<p class="mt-3">Fertigstellung einmalig ${esc(demo.priceLabel)}, danach ${cards[0]?.monthly ? `ab ${esc(cards[0].monthly)} im Monat` : 'Ihr Monatstarif'}. Online geht die Website erst nach Ihrer Freigabe – die Monatsgebühr beginnt erst mit dem Go-Live.</p>`
        : ''
    }
    ${cards.length ? `<ul class="mt-6 grid gap-4 ${cards.length > 1 ? 'sm:grid-cols-2' : ''}">${cards.map(card).join('')}</ul>` : ''}
    ${
      v4
        ? `<ol class="mt-5 grid gap-3 text-sm sm:grid-cols-3">${[
            ['Tarif wählen', 'Bedingungen in Ruhe prüfen und online bestellen.'],
            ['Inhalte ergänzen', 'Ihre Angaben, Texte und Wünsche – wir stellen den Entwurf fertig.'],
            ['Prüfen und freigeben', 'Erst nach Ihrer Freigabe geht die Website online.'],
          ]
            .map(
              ([title, text], i) =>
                `<li class="flex gap-3 rounded-xl border border-[#d1d5db] bg-white p-4"><span aria-hidden="true" class="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#111827] text-xs font-bold text-white">${i + 1}</span><span><strong class="block">${title}</strong><span class="text-[#374151]">${text}</span></span></li>`,
            )
            .join('')}</ol>`
        : ''
    }
    ${v4 ? trust : ''}
    ${
      opts.review || v4
        ? `<details class="mt-5 rounded-xl border border-[#d1d5db] bg-white p-5 text-sm"><summary class="cursor-pointer font-semibold">Was Sie beauftragen – Ablauf und Leistungsgrenzen</summary>${
            v4
              ? `<ul class="mt-3 space-y-3"><li><strong>Wir stellen den Entwurf fertig.</strong> Mit Ihren bestätigten Angaben, Texten, berechtigten Bildern und den vereinbarten Anpassungen.</li><li><strong>Sie behalten die Freigabe.</strong> Sie prüfen Ihre Inhalte und die fertige Vorschau, bevor wir die Website veröffentlichen.</li><li><strong>Wir richten die Website technisch ein.</strong> Der gewählte Monatstarif übernimmt anschließend Hosting, SSL und den vereinbarten Betreuungsumfang.</li></ul><p class="mt-4">Die Monatsgebühr beginnt erst nach bestätigtem Go-Live. Care+ enthält Basis vollständig. Zusatzfunktionen, größere Umbauten und Domains außerhalb des vereinbarten Umfangs benötigen Ihre gesonderte Zustimmung.</p>`
              : ''
          }<p class="mt-3">Sie übermitteln Ihre tatsächlichen Inhalte und Änderungswünsche. Wir stellen den Entwurf fertig, richten die vereinbarten technischen Leistungen ein und veröffentlichen erst nach Ihrer Freigabe.</p><ol class="mt-4 space-y-3"><li><strong>1. Online bestellen</strong><br>Tarif und Bedingungen prüfen.</li><li><strong>2. Inhalte ergänzen</strong><br>Firmenangaben, rechtliche Texte, eigene Bilder und Wünsche übermitteln.</li><li><strong>3. Prüfen und freigeben</strong><br>Website abstimmen. Erst nach bestätigtem Go-Live beginnt die Monatsgebühr.</li></ol><p class="mt-4">Zusatzseiten, größere Umbauten und Leistungen außerhalb des Tarifs benötigen ein gesondertes Angebot. Domainumfang, Kündigungsfrist und Übergabe sind in den verlinkten Vertragsbedingungen beschrieben.</p></details>`
        : ''
    }
    ${demo.guaranteeNote ? `<p class="mt-4 text-sm text-[#374151]">${esc(demo.guaranteeNote)}</p>` : ''}
    ${
      demo.offerVersion === 'v4'
        ? `<details class="mt-6 rounded-xl border border-[#d1d5db] bg-white p-5"><summary class="cursor-pointer text-lg font-semibold">Ihre Fragen zur Übernahme</summary>${[
            [
              'Was passiert nach dem Kauf?',
              'Nach der Einmalzahlung ergänzen Sie Ihre Angaben. Wir stimmen die Anpassungen mit Ihnen ab; die Veröffentlichung erfolgt erst nach Ihrer Freigabe.',
            ],
            [
              'Wann geht die Website online?',
              'Den Termin vereinbaren wir mit Ihnen, sobald Inhalte, Domain, rechtliche Angaben und Ihre Freigabe vorliegen.',
            ],
            [
              'Was ist im Einmalpreis enthalten?',
              'Erstellung, vereinbarte Anpassung, technische Einrichtung, Standard-Domain im Kostenrahmen und bis zu zwei Änderungsrunden.',
            ],
            [
              'Warum gibt es eine Monatsgebühr?',
              'Für laufendes Hosting, SSL, technische Bereitstellung und den gewählten Betreuungsumfang. Sie beginnt nicht durch den QR-Scan.',
            ],
            [
              'Was unterscheidet Basis und Care+?',
              'Care+ enthält das Basis-Hosting vollständig sowie erweiterten Support und bis zu 60 Minuten kleine Inhaltsänderungen pro Monat. Keine doppelte Monatsgebühr.',
            ],
            [
              'Kann ich den Tarif wechseln?',
              'Sie können einen Wechsel anfragen. Er benötigt Ihre Bestätigung und wird zum vereinbarten Periodenende vorbereitet. Es wird kein zweites Abo stillschweigend angelegt.',
            ],
            [
              'Kann ich kündigen oder wechseln?',
              'Neue Monatstarife haben keine zwölfmonatige Mindestbindung. Kündigungsfrist und Übergabe stehen vor Abschluss transparent in den Vertragsbedingungen.',
            ],
            [
              'Was passiert mit meiner Domain?',
              'Sie wird auf Ihren Betrieb registriert. Für einen Anbieterwechsel erhalten Sie einen verfügbaren Auth-Code; Kosten des neuen Anbieters sind gesondert.',
            ],
            [
              'Kann ich Bilder und Texte ändern?',
              'Vor der Veröffentlichung sind zwei vereinbarte Änderungsrunden vorgesehen. Danach richtet sich die Betreuung nach Ihrem Tarif.',
            ],
            [
              'Welche Änderungen umfasst Care+?',
              'Bis zu 60 Minuten kleine vereinbarte Inhaltsänderungen im Monat. Größere Umbauten erfordern ein gesondertes Angebot; ungenutzte Minuten werden nicht übertragen.',
            ],
            [
              'Was passiert, wenn ich nicht zufrieden bin?',
              'Bitte melden Sie sich bei uns. Gesetzliche Rechte bleiben erhalten; eine zusätzliche Garantie gilt nur im konkret vereinbarten und technisch abgesicherten Umfang.',
            ],
          ]
            .map(
              ([question, answer]) =>
                `<details class="mt-3 rounded-lg border border-[#d1d5db] bg-white p-4"><summary class="cursor-pointer font-semibold">${esc(question)}</summary><p class="mt-3 text-sm">${esc(answer)}</p></details>`,
            )
            .join('')}</details>`
        : ''
    }
    ${demo.offerVersion === 'v4' ? '' : trust}
    <div class="mt-6 flex flex-wrap gap-4 text-sm">${demo.whatsappUrl ? `<a href="${esc(demo.whatsappUrl)}" target="_blank" rel="noopener noreferrer" class="underline">Frage per WhatsApp</a>` : ''}${demo.sender.email ? `<a href="mailto:${esc(demo.sender.email)}" class="underline">Frage per E-Mail</a>` : ''}<a href="#frage" class="underline">Frageformular zu diesem Entwurf</a></div>
    <form method="post" action="${esc(demo.optOutUrl)}" class="sw-demo-optout"><button type="submit" class="min-h-11 underline">Kein Interesse – Entwurf und Werbung abbestellen</button></form>
  </div>
</section>`;
}

const GROUP_INDUSTRY: Record<BranchGroup, IndustryKey> = {
  handwerk: 'handwerk',
  beauty: 'beauty',
  gastronomie: 'gastronomie',
  einzelhandel: 'einzelhandel',
  kurse: 'kurse_training',
};

const SCHEMA_TYPE: Record<BranchGroup, string> = {
  handwerk: 'HomeAndConstructionBusiness',
  beauty: 'BeautySalon',
  gastronomie: 'Restaurant',
  einzelhandel: 'Store',
  kurse: 'SportsActivityLocation',
};

export function buildParts(input: RenderInput): SharedParts {
  const { mode, content, facts, demo, live } = input;
  const industry: IndustryKey = facts.industry ?? GROUP_INDUSTRY[facts.group];
  const request = REQUEST_FORMS[industry];
  const palette = input.artDirection ? artPalette(input.palette, input.artDirection) : getPalette(input.palette);
  const isDemo = mode === 'demo';
  const isLive = mode === 'live';
  const noindex = mode !== 'live';
  const css = readSiteCss();
  const letter = esc(facts.name.trim().charAt(0).toUpperCase() || 'W');

  const jsonLd = isLive
    ? `<script type="application/ld+json">${JSON.stringify({
        '@context': 'https://schema.org',
        '@type': SCHEMA_TYPE[facts.group],
        name: facts.name,
        address: {
          '@type': 'PostalAddress',
          streetAddress: `${facts.street} ${facts.houseNumber}`,
          postalCode: facts.postalCode,
          addressLocality: facts.city,
          addressCountry: 'DE',
        },
        ...(facts.phone ? { telephone: facts.phone } : {}),
        ...(live?.canonicalUrl ? { url: live.canonicalUrl } : {}),
      }).replace(/</g, '\\u003c')}</script>`
    : '';

  const head = `<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(content.seo_title)}</title>
<meta name="description" content="${esc(content.seo_description)}">
${noindex ? '<meta name="robots" content="noindex, nofollow, noarchive">' : '<meta name="robots" content="index, follow">'}
${isLive && live?.canonicalUrl ? `<link rel="canonical" href="${esc(live.canonicalUrl)}">` : ''}
<meta name="theme-color" content="${palette.primary}">
<meta name="format-detection" content="telephone=no">
<link rel="icon" href="${faviconDataUri(letter, palette.primary)}">
${isLive ? `<meta property="og:title" content="${esc(content.seo_title)}"><meta property="og:description" content="${esc(content.seo_description)}"><meta property="og:type" content="website">` : ''}
<style>${input.artDirection ? designFontCss(input.artDirection.typography) : ''}${css}</style>
<style>:root{${paletteCssVars(palette)}}</style>
${jsonLd}
</head>`;

  const skip = `<a href="#inhalt" class="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded focus:bg-white focus:px-3 focus:py-2 focus:text-ink focus:shadow">Zum Inhalt springen</a>`;

  let banner = '';
  if (isDemo && demo) {
    banner =
      `<aside class="sw-demo-context" aria-label="Hinweis zum Entwurf"><strong>Unverbindlicher Website-Entwurf</strong> von ${esc(demo.sender.company)} für ${esc(facts.name)}. Dies ist nicht die offizielle Website des Betriebs.</aside>
+<aside class="sw-demo-toolbar" aria-label="Website übernehmen"><div class="sw-demo-toolbar-inner">
+  <span class="sw-provider-mark">${brandMarkHtml(24)}</span><p class="sw-demo-toolbar-title text-sm"><strong>Ihr Entwurf.</strong> In Ruhe ansehen, direkt übernehmen.</p>
+  <div class="sw-demo-actions"><a href="${demo.offers?.length ? '#uebernehmen' : esc(demo.checkoutUrl)}" class="sw-demo-buy">Diese Website übernehmen</a><a href="#frage" class="sw-demo-ask">Fragen</a></div>
+</div></aside>`.replace(/^\+/gm, '');
  } else if (mode === 'preview') {
    banner = `<aside class="sticky top-0 z-50 bg-[#1e3a8a] px-4 py-2 text-center text-sm text-white" aria-label="Vorschau">Vorschau – diese Seite ist noch nicht veröffentlicht.</aside>`;
  }

  const callHref = facts.phoneHref ?? null;
  const phoneLabel = facts.phone ?? null;
  const ctaHref = mode === 'demo' || mode === 'screenshot' ? '#oeffnungszeiten' : '#frage';
  const mapsHref = mapsLink(facts.street, facts.houseNumber, facts.postalCode, facts.city);
  const addressLines = `${esc(facts.street)} ${esc(facts.houseNumber)}<br>${esc(facts.postalCode)} ${esc(facts.city)}`;

  const priceHint = industry === 'beauty' ? ' Preise auf Anfrage.' : '';
  const servicesVerified =
    content.services.length > 0 && content.services.every((s) => facts.verifiedServices?.includes(s.title));
  const someVerified = content.services.some((s) => facts.verifiedServices?.includes(s.title));
  const servicesNote = (cls = 'text-sm text-muted') =>
    isDemo
      ? `<p class="${cls}">${servicesVerified ? 'Leistungsübersicht aus geprüften Betriebsangaben. Vor Veröffentlichung vom Betrieb zu bestätigen.' : `<span aria-hidden="true">✎ </span>${someVerified ? 'Erste Leistung aus Ihren Angaben, weitere als ' : ''}Beispiel-Leistungen – passen wir gemeinsam für Sie an.${priceHint}`}</p>`
      : priceHint
        ? `<p class="${cls}">${priceHint.trim()}</p>`
        : '';

  const hoursList = (opts: { rowClass?: string; labelClass?: string; mutedClass?: string } = {}) => {
    const muted = opts.mutedClass ?? 'text-muted';
    if (!facts.openingLines.length) {
      return `<p class="${muted}">Öffnungszeiten sind noch nicht bestätigt. Bitte nutzen Sie die angegebenen Kontaktmöglichkeiten.</p>`;
    }
    return `<dl class="divide-y divide-line">${facts.openingLines
      .map(
        (l) =>
          `<div class="flex flex-wrap justify-between gap-x-4 gap-y-1 py-2 ${opts.rowClass ?? ''}"><dt class="font-medium ${opts.labelClass ?? ''}">${esc(l.label)}</dt><dd class="${muted}">${esc(l.value)}</dd></div>`,
      )
      .join('')}</dl>`;
  };

  const faqList = (o: { itemClass: string; summaryClass: string; answerClass: string }) =>
    content.faq
      .map(
        (f) =>
          `<details class="${o.itemClass}"><summary class="${o.summaryClass}">${esc(f.q)}</summary><div class="${o.answerClass}">${paragraphs(f.a)}</div></details>`,
      )
      .join('');

  const contactSection = (o: ContactSectionClasses) => {
    // Fragen zum Entwurf gehen an den Ersteller: nicht mitten in der Website des Betriebs, sondern beim Angebot
    if (isDemo && demo && !o.keepInline && !o.atEnd) return '';
    const muted = o.mutedClass ?? 'text-muted';
    const iconCls = o.iconClass ?? 'text-primary';
    const ts = String(input.renderedAt ?? Date.now());
    let title = 'Kontakt';
    let intro = `Schreiben Sie uns – wir melden uns schnellstmöglich bei Ihnen.`;
    let action = '#';
    let privacyHref = '#';
    let disabled = false;
    if (isDemo && demo) {
      title = 'Frage zu diesem Entwurf';
      intro = `Ihre Nachricht geht an ${esc(demo.sender.company)}, den Ersteller dieses Entwurfs – nicht an ${esc(facts.name)}.`;
      action = demo.questionUrl;
      privacyHref = demo.sender.privacyUrl;
    } else if (isLive && live) {
      action = live.formAction;
      privacyHref = live.privacyPath;
      title = request.title;
      intro = request.intro;
    } else {
      disabled = true;
      if (mode === 'preview') intro = 'Das Formular wird mit der Veröffentlichung aktiviert.';
    }
    const dis = disabled ? ' disabled' : '';
    return `<section id="frage" aria-labelledby="frage-titel" class="${o.sectionClass}">
  <div class="mx-auto grid max-w-6xl gap-8 px-4 md:grid-cols-5">
    <div class="md:col-span-2">
      <h2 id="frage-titel" class="${o.titleClass}">${title}</h2>
      <p class="mt-3 ${muted}">${intro}</p>
      ${
        phoneLabel && !isDemo
          ? `<p class="mt-6 flex items-center gap-3"><span class="${iconCls}">${icon('phone', 'h-5 w-5')}</span><a class="font-semibold underline-offset-4 hover:underline" href="${esc(callHref)}">${esc(phoneLabel)}</a></p>`
          : ''
      }
      <p class="mt-3 flex items-start gap-3"><span class="mt-0.5 ${iconCls}">${icon('pin', 'h-5 w-5')}</span><span>${isDemo && demo ? `${esc(demo.sender.street)}<br>${esc(demo.sender.postalCode)} ${esc(demo.sender.city)}` : addressLines}</span></p>
    </div>
    <form class="${o.cardClass} md:col-span-3" method="post" action="${esc(action)}" accept-charset="utf-8">
      <div class="grid gap-4 sm:grid-cols-2">
        <div>
          <label for="f-name" class="mb-1 block text-sm font-medium">Name</label>
          <input id="f-name" name="name" type="text" autocomplete="name" required maxlength="120" class="${o.inputClass}"${dis}>
        </div>
        <div>
          <label for="f-email" class="mb-1 block text-sm font-medium">E-Mail</label>
          <input id="f-email" name="email" type="email" autocomplete="email" required maxlength="200" class="${o.inputClass}"${dis}>
        </div>
        <div class="sm:col-span-2">
          <label for="f-phone" class="mb-1 block text-sm font-medium">Telefon <span class="font-normal ${muted}">(optional)</span></label>
          <input id="f-phone" name="phone" type="tel" autocomplete="tel" maxlength="40" class="${o.inputClass}"${dis}>
        </div>
        ${
          !isDemo && request.wish
            ? `<div class="sm:col-span-2">
          <label for="f-wish" class="mb-1 block text-sm font-medium">${esc(request.wish)}</label>
          <input id="f-wish" name="wunsch" type="text" maxlength="300" class="${o.inputClass}"${dis}>
          <input type="hidden" name="anliegen" value="${esc(request.title)}">
        </div>`
            : ''
        }
        <div class="sm:col-span-2">
          <label for="f-msg" class="mb-1 block text-sm font-medium">Nachricht</label>
          <textarea id="f-msg" name="message" rows="5" required maxlength="4000" class="${o.inputClass}"${dis}></textarea>
        </div>
        <div class="hidden" aria-hidden="true">
          <label for="f-website">Website</label>
          <input id="f-website" name="website" type="text" tabindex="-1" autocomplete="off">
        </div>
        <input type="hidden" name="ts" value="${esc(ts)}">
        <div class="sm:col-span-2 flex items-start gap-2 text-sm">
          <input id="f-consent" name="consent" type="checkbox" required class="mt-1 h-4 w-4"${dis}>
          <label for="f-consent">Ich bin einverstanden, dass meine Angaben zur Beantwortung meiner Anfrage verarbeitet werden. Hinweise in der <a class="underline" href="${esc(privacyHref)}">Datenschutzerklärung</a>.</label>
        </div>
      </div>
      <button type="submit" class="${o.buttonClass} mt-5"${dis}>${isDemo ? 'Nachricht senden' : esc(request.button)}</button>
    </form>
  </div>
</section>`;
  };

  const footer = (o: { className: string; linkClass: string; omitOffer?: boolean }) => {
    const year = new Date().getFullYear();
    if (isDemo && demo) {
      const question = o.omitOffer
        ? ''
        : contactSection({
            atEnd: true,
            sectionClass: 'bg-[#f3f4f6] pb-14 pt-2 text-[#111827]',
            cardClass: 'rounded-xl border border-[#d1d5db] bg-white p-5 text-[#111827]',
            titleClass: 'text-2xl font-semibold tracking-tight',
            buttonClass:
              'inline-flex min-h-11 items-center justify-center rounded-md bg-[#111827] px-5 py-2 font-semibold text-white hover:bg-[#1f2937]',
            inputClass: 'block w-full rounded-md border border-[#6b7280] bg-white px-3 py-2.5 text-[#111827]',
            mutedClass: 'text-[#4b5563]',
            iconClass: 'text-[#111827]',
          });
      return `${o.omitOffer ? '' : offerSection(demo)}${question}<footer class="${o.className}">
  <div class="mx-auto grid max-w-6xl gap-6 px-4 py-10 md:grid-cols-3">
    <div><p class="font-semibold">${esc(facts.name)}</p><p class="mt-2 text-sm opacity-90">${addressLines}</p>${facts.googleReviewsUrl ? `<p class="mt-2 text-sm"><a class="${o.linkClass}" href="${esc(facts.googleReviewsUrl)}" rel="noopener noreferrer">Bewertungen auf Google</a></p>` : ''}</div>
    <div class="text-sm opacity-90">${photos(1).some((ph) => ph.example) ? '<p class="mb-3">Bildwelt zur Gestaltung: lizenzierte Beispielfotos, keine Aufnahmen des Betriebs.</p>' : ''}<p>Dies ist ein unverbindlicher Entwurf. ${esc(facts.name)} hat diese Seite nicht beauftragt.</p><p class="mt-2">Der Entwurf ist bis ${esc(demo.expiresLabel.replace(/^am\s+/, ''))} online und anschließend nicht mehr öffentlich erreichbar.</p></div>
    <div class="text-sm"><p class="opacity-90">Entwurf erstellt von ${esc(demo.sender.company)}</p>
      <ul class="mt-2 space-y-1"><li><a class="${o.linkClass}" href="${esc(demo.sender.imprintUrl)}">Impressum (Ersteller)</a></li><li><a class="${o.linkClass}" href="${esc(demo.sender.privacyUrl)}">Datenschutz (Ersteller)</a></li></ul>
    </div>
  </div>
</footer>`;
    }
    const imprint = live?.imprintPath ?? 'impressum.html';
    const privacy = live?.privacyPath ?? 'datenschutz.html';
    return `<footer class="${o.className}">
  <div class="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 md:flex-row md:items-center md:justify-between">
    <div><p class="font-semibold">${esc(facts.name)}</p><p class="mt-1 text-sm opacity-90">${esc(facts.street)} ${esc(facts.houseNumber)}, ${esc(facts.postalCode)} ${esc(facts.city)}</p></div>
    <nav aria-label="Rechtliches"><ul class="flex gap-4 text-sm"><li><a class="${o.linkClass}" href="${esc(imprint)}">Impressum</a></li><li><a class="${o.linkClass}" href="${esc(privacy)}">Datenschutz</a></li></ul></nav>
    <p class="text-sm opacity-80">© ${year} ${esc(facts.name)}</p>
  </div>
</footer>`;
  };

  const draft = mode === 'demo' || mode === 'screenshot';
  const example = (text: string) => `<p class="mt-2 text-sm text-muted"><span aria-hidden="true">✎ </span>${text}</p>`;

  /** Vorschau eines Anfrageformulars (im Entwurf nicht aktiv – Fragen gehen dort an den Ersteller) */
  const requestPreview = (o: IndustrySectionClasses) => {
    if (!request.wish) return '';
    // Bild eines Formulars statt echter Felder: keine doppelten Beschriftungen neben dem Frageformular
    const field = (label: string, tall = false) =>
      `<div><span class="mb-1 block text-sm font-medium">${esc(label)}</span><span class="block w-full rounded-lg border border-line bg-surface ${tall ? 'h-20' : 'h-11'}"></span></div>`;
    return `<section id="anfrage" aria-labelledby="anfrage-titel" class="${o.altSectionClass}">
  <div class="mx-auto grid max-w-6xl gap-8 px-4 md:grid-cols-5">
    <div class="md:col-span-2">
      <h2 id="anfrage-titel" class="${o.titleClass}">${esc(request.title)}</h2>
      <p class="mt-3 text-muted">${esc(request.intro)}</p>
      ${example(`Vorschau: Formular mit Name, E-Mail, „${esc(request.wish)}“ und Nachricht. Im Entwurf noch nicht aktiv – nach dem Start kommen Anfragen direkt per E-Mail zu Ihnen.`)}
    </div>
    <details class="${o.cardClass} md:col-span-3"><summary class="cursor-pointer font-semibold">Formular-Vorschau ansehen</summary>
      <div class="mt-4 grid gap-4 sm:grid-cols-2" aria-hidden="true">
        ${field('Name')}
        ${field('E-Mail')}
        <div class="sm:col-span-2">${field(request.wish)}</div>
        <div class="sm:col-span-2">${field('Nachricht', true)}</div>
        <div class="sm:col-span-2"><span class="${o.buttonClass}">${esc(request.button)}</span></div>
      </div>
    </details>
  </div>
</section>`;
  };

  const industrySections = (o: IndustrySectionClasses): string => {
    if (!draft) return '';
    const out: string[] = [];
    if (industry === 'gastronomie') {
      out.push(`<section id="speisekarte" aria-labelledby="speisekarte-titel" class="${o.sectionClass}">
  <div class="mx-auto max-w-6xl px-4">
    <h2 id="speisekarte-titel" class="${o.titleClass}">Speisekarte</h2>
    ${example('Beispiel-Speisekarte: Ihre echten Gerichte und Preise trage ich für Sie ein.')}
    <ul class="mt-8 grid gap-6 md:grid-cols-2">${content.services
      .map(
        (s) => `<li class="${o.cardClass}">
      <h3 class="text-lg font-semibold">${esc(s.title)}</h3>
      <p class="mt-1 text-muted">${esc(s.text)}</p>

    </li>`,
      )
      .join('')}</ul>
  </div>
</section>`);
    }
    if (industry === 'handwerk' && !o.inHub) {
      out.push(`<section id="einzugsgebiet" aria-labelledby="gebiet-titel" class="${o.sectionClass}">
  <div class="mx-auto grid max-w-6xl gap-8 px-4 md:grid-cols-2">
    <div>
      <h2 id="gebiet-titel" class="${o.titleClass}">Einzugsgebiet</h2>
      <p class="mt-3 text-lg">${esc(facts.city)}</p>
      ${example('Erfasster Standort. Das tatsächliche Einzugsgebiet wird vor Veröffentlichung abgestimmt.')}
    </div>
    <details class="${o.cardClass}"><summary class="cursor-pointer font-semibold">Optional: Stellenbereich als Vorschau</summary>
      <h2 id="jobs-titel" class="mt-4 text-lg font-semibold">Wir stellen ein</h2>
      <p class="mt-3">Hier stellen Sie offene Stellen und Ausbildungsplätze vor, zum Beispiel für Gesellinnen und Gesellen oder Auszubildende (m/w/d). Bewerbungen kommen direkt per Formular zu Ihnen.</p>
      ${example('Gestaltungsbeispiel, keine tatsächliche Stellenausschreibung des Betriebs.')}
    </details>
  </div>
</section>`);
    }
    if (industry === 'kurse_training') {
      out.push(`<section id="kursplan" aria-labelledby="kursplan-titel" class="${o.sectionClass}">
  <div class="mx-auto max-w-6xl px-4">
    <h2 id="kursplan-titel" class="${o.titleClass}">Kursplan</h2>
    ${example('Kursbeispiele zur Gestaltung. Verbindliche Tage und Zeiten werden vor Veröffentlichung ergänzt.')}
    <div class="mt-6"><table class="w-full text-left">
      <thead><tr class="border-b border-line text-sm text-muted"><th scope="col" class="py-2 pr-4 font-medium">Kurs</th><th scope="col" class="py-2 pr-4 font-medium">Tag</th><th scope="col" class="py-2 font-medium">Uhrzeit</th></tr></thead>
      <tbody>${content.services
        .map(
          (s) =>
            `<tr class="border-b border-line"><th scope="row" class="py-3 pr-4 font-semibold">${esc(s.title)}</th><td class="py-3 pr-4 text-muted">wird abgestimmt</td><td class="py-3 text-muted">wird abgestimmt</td></tr>`,
        )
        .join('')}</tbody>
    </table></div>
  </div>
</section>`);
    }
    if (!o.inHub) out.push(requestPreview(o));
    return out.join('\n');
  };

  const trustChips = () =>
    `<ul class="sw-chips">
      <li>${icon('pin', 'h-4 w-4')}<span>${esc(facts.branchLabel)} in ${esc(facts.city)}</span></li>
      <li>${icon(callHref ? 'phone' : 'chat', 'h-4 w-4')}<span>${callHref ? 'Telefonisch erreichbar' : 'Anfrage per Nachricht'}</span></li>
      <li><a href="${esc(mapsHref)}" rel="noopener" target="_blank">${icon('house', 'h-4 w-4')}<span>Route planen<span class="sr-only"> (OpenStreetMap, neuer Tab)</span></span></a></li>
    </ul>`;

  /** Ablauf einer Anfrage je Branche – im Entwurf als Beispiel gekennzeichnet, wird vor Veröffentlichung abgestimmt */
  const process = (o: { sectionClass: string; titleClass: string; cardClass: string }) => {
    if (!draft) return '';
    const by = callHref ? 'per Anruf oder Nachricht' : 'per Nachricht';
    const flows: Record<IndustryKey, { title: string; steps: [string, string][] }> = {
      handwerk: {
        title: 'So läuft Ihre Anfrage ab',
        steps: [
          [
            'Vorhaben schildern',
            callHref
              ? 'Rufen Sie an oder beschreiben Sie kurz, worum es geht – am besten mit Ort und Wunschzeitraum.'
              : 'Beschreiben Sie kurz, worum es geht – am besten mit Ort und Wunschzeitraum.',
          ],
          ['Rückmeldung erhalten', 'Sie bekommen eine Rückmeldung, bei Bedarf mit einem Termin zur Besichtigung vor Ort.'],
          ['Gemeinsam festlegen', 'Umfang, Termin und Ausführung stimmen Sie gemeinsam ab, bevor die Arbeit beginnt.'],
        ],
      },
      beauty: {
        title: 'So kommen Sie zu Ihrem Termin',
        steps: [
          ['Wunschtermin anfragen', `Nennen Sie Leistung und Wunschzeit – ${by}.`],
          ['Bestätigung erhalten', 'Sie bekommen eine Rückmeldung mit Ihrem Termin.'],
          ['Entspannt vorbeikommen', `Zum vereinbarten Termin sind Sie in ${esc(facts.city)} herzlich willkommen.`],
        ],
      },
      gastronomie: {
        title: 'So reservieren Sie',
        steps: [
          ['Tisch anfragen', `Datum, Uhrzeit und Personenzahl – ${by}.`],
          ['Bestätigung erhalten', 'Sie bekommen eine Rückmeldung zu Ihrer Reservierung.'],
          ['Genießen', `Wir freuen uns auf Ihren Besuch in ${esc(facts.city)}.`],
        ],
      },
      einzelhandel: {
        title: 'So einfach geht’s',
        steps: [
          ['Artikel anfragen', `Fragen Sie nach Ihrem Wunschartikel – ${by}.`],
          ['Rückmeldung erhalten', 'Sie erfahren, ob er vorrätig ist, und können ihn zurücklegen lassen.'],
          ['Im Geschäft abholen', `Holen Sie Ihren Artikel bei uns in ${esc(facts.city)} ab.`],
        ],
      },
      kurse_training: {
        title: 'So starten Sie',
        steps: [
          ['Probestunde anfragen', `Nennen Sie Kurs und Wunschtermin – ${by}.`],
          ['Termin abstimmen', 'Sie bekommen eine Rückmeldung mit einem passenden Einstieg.'],
          ['Ausprobieren', 'In der Probestunde lernen Sie Angebot und Ablauf kennen.'],
        ],
      },
      dienstleistung: {
        title: 'So läuft Ihre Anfrage ab',
        steps: [
          ['Anliegen schildern', `Beschreiben Sie kurz, worum es geht – ${by}.`],
          ['Rückmeldung erhalten', 'Sie bekommen eine Rückmeldung mit den nächsten Schritten.'],
          ['Gemeinsam festlegen', 'Umfang und Termin stimmen Sie gemeinsam ab.'],
        ],
      },
    };
    const flow = flows[industry];
    return `<section id="ablauf" aria-labelledby="ablauf-titel" class="${o.sectionClass}">
  <div class="mx-auto max-w-6xl px-4">
    <h2 id="ablauf-titel" class="${o.titleClass}">${flow.title}</h2>
    ${example('Beispielablauf – stimmen wir vor der Veröffentlichung mit Ihnen ab.')}
    <ol class="mt-8 grid gap-5 md:grid-cols-3">${flow.steps
      .map(
        ([title, text], i) =>
          `<li class="sw-step ${o.cardClass}"><span class="sw-step-no" aria-hidden="true">${i + 1}</span><h3 class="mt-4 text-lg font-semibold">${title}</h3><p class="mt-2 text-muted">${text}</p></li>`,
      )
      .join('')}</ol>
  </div>
</section>`;
  };

  const heroActions = (ctaText: string) =>
    `<div class="sw-hero-actions"><a class="sw-hero-button" href="${esc(ctaHref)}">${esc(ctaText)} <span aria-hidden="true">→</span></a>${
      callHref
        ? `<a class="sw-hero-secondary" href="${esc(callHref)}">${icon('phone', 'h-4 w-4')}<span>${esc(phoneLabel)}</span></a>`
        : ''
    }</div>${trustChips()}`;

  const exampleServices = () => {
    const list = draft ? (facts.exampleServices ?? []).slice(0, 4) : [];
    if (!list.length) return '';
    return `<div class="mx-auto mt-8 max-w-6xl px-4"><div class="sw-examples"><p class="text-sm font-semibold">Weitere typische Leistungen</p>${example('Beispiele für Ihre Website – welche Leistungen erscheinen, legen Sie fest.')}<ul class="sw-example-list">${list
      .map((s) => `<li>${icon(s.icon, 'h-4 w-4')}<span>${esc(s.title)}</span></li>`)
      .join('')}</ul></div></div>`;
  };

  const heroName = (cls = '') =>
    content.hero_headline.trim() === facts.name.trim() ? '' : `<p class="sw-hero-name ${cls}">${esc(facts.name)}</p>`;

  const contactHub = (o: ContactHubClasses) => {
    const card = (ico: string, title: string, body: string) =>
      `<div class="sw-hub-card ${o.cardClass}"><h3 class="flex items-center gap-3 text-lg font-semibold"><span class="sw-hub-icon">${icon(ico, 'h-5 w-5')}</span>${title}</h3>${body}</div>`;
    const reach = callHref
      ? card(
          'phone',
          'Anrufen',
          `<p class="mt-3 text-muted">Ein Fingertipp genügt – direkt vom Handy.</p><a class="${o.buttonClass} mt-5" href="${esc(callHref)}">${icon('phone', 'h-5 w-5')}<span>${esc(phoneLabel)}</span></a>`,
        )
      : card(
          'chat',
          esc(request.title),
          `<p class="mt-3 text-muted">${esc(request.intro)}</p>${draft ? example('Im Entwurf noch nicht aktiv – nach dem Start kommen Anfragen direkt per E-Mail zu Ihnen.') : `<a class="${o.buttonClass} mt-5" href="#frage">${esc(request.button)}</a>`}`,
        );
    const address = card(
      'pin',
      'Adresse',
      `<p class="mt-3 text-lg">${addressLines}</p><a class="${o.secondaryButtonClass} mt-5" href="${esc(mapsHref)}" rel="noopener" target="_blank">Route planen<span class="sr-only"> (öffnet OpenStreetMap in neuem Tab)</span></a>`,
    );
    const hours = card(
      'clock',
      'Öffnungszeiten',
      facts.openingLines.length
        ? `<div class="mt-3">${hoursList()}</div>`
        : draft
          ? example('Öffnungszeiten sind noch nicht bestätigt – wir tragen sie vor der Veröffentlichung ein.')
          : '<p class="mt-3 text-muted">Bitte nutzen Sie die angegebenen Kontaktmöglichkeiten.</p>',
    );
    const area =
      draft && industry === 'handwerk'
        ? `<div id="einzugsgebiet" class="sw-hub-row mt-5 grid gap-5 md:grid-cols-2">
      <div class="${o.cardClass}"><h3 id="gebiet-titel" class="text-lg font-semibold">Einzugsgebiet</h3><p class="mt-2 text-lg">${esc(facts.city)} und Umgebung</p>${example('Erfasster Standort. Das tatsächliche Einzugsgebiet wird vor Veröffentlichung abgestimmt.')}</div>
      <details class="${o.cardClass}"><summary class="cursor-pointer text-lg font-semibold">Optional: Stellenbereich als Vorschau</summary>
        <h4 id="jobs-titel" class="mt-4 font-semibold">Wir stellen ein</h4>
        <p class="mt-2">Hier stellen Sie offene Stellen und Ausbildungsplätze vor, zum Beispiel für Gesellinnen und Gesellen oder Auszubildende (m/w/d). Bewerbungen kommen direkt per Formular zu Ihnen.</p>
        ${example('Gestaltungsbeispiel, keine tatsächliche Stellenausschreibung des Betriebs.')}
      </details>
    </div>`
        : '';
    const field = (label: string, tall = false) =>
      `<div><span class="mb-1 block text-sm font-medium">${esc(label)}</span><span class="block w-full rounded-lg border border-line bg-surface ${tall ? 'h-20' : 'h-11'}"></span></div>`;
    const requestMock =
      draft && request.wish
        ? `<div id="anfrage" class="sw-hub-row mt-5 grid items-start gap-6 ${o.cardClass} md:grid-cols-5">
      <div class="md:col-span-2">
        <h3 id="anfrage-titel" class="text-xl font-semibold">${esc(request.title)}: direkt über die Website</h3>
        <p class="mt-3 text-muted">${esc(request.intro)}</p>
        ${example(`Vorschau: Formular mit Name, E-Mail, „${esc(request.wish)}“ und Nachricht. Im Entwurf noch nicht aktiv – nach dem Start kommen Anfragen direkt per E-Mail zu Ihnen.`)}
      </div>
      <div class="sw-form-mock grid gap-4 sm:grid-cols-2 md:col-span-3" aria-hidden="true">
        ${field('Name')}
        ${field('E-Mail')}
        <div class="sm:col-span-2">${field(request.wish)}</div>
        <div class="sm:col-span-2">${field('Nachricht', true)}</div>
        <div class="sm:col-span-2"><span class="${o.buttonClass}">${esc(request.button)}</span></div>
      </div>
    </div>`
        : '';
    return `<section id="oeffnungszeiten" aria-labelledby="kontakt-titel" class="${o.sectionClass}">
  <div class="mx-auto max-w-6xl px-4">
    <h2 id="kontakt-titel" class="${o.titleClass}">Kontakt &amp; Anfahrt</h2>
    <p class="mt-2 max-w-2xl text-lg text-muted">So erreichen Sie ${esc(facts.name)} in ${esc(facts.city)}.</p>
    <div class="mt-8 grid gap-5 md:grid-cols-3">${reach}${address}${hours}</div>
    ${area}
    ${requestMock}
  </div>
</section>`;
  };

  const seed = [...(demo?.slug ?? facts.name)].reduce((a, ch) => a + ch.charCodeAt(0), 0);
  const photos = (n: number) => {
    const own = (facts.photos ?? [])
      .filter((ph) => !draft || ph.rightsConfirmed)
      .map((ph) => ({ src: ph.src, alt: ph.alt, example: ph.origin === 'example', focalPoint: ph.focalPoint }));
    if (own.length || !draft) return own.slice(0, n);
    return stockPhotos(facts.group, seed, [facts.branchLabel, ...(facts.verifiedServices ?? [])].join(' '), {
      mood: input.artDirection?.imageMood,
    })
      .slice(0, n)
      .map((ph) => ({
        src: stockPhotoDataUri(ph),
        alt: ph.alt,
        example: true,
        width: ph.width,
        height: ph.height,
        focalPoint: ph.focalPoint,
      }));
  };
  let priorityImageUsed = false;
  const figure = (
    ph: { src: string; alt: string; example: boolean; width?: number; height?: number; focalPoint?: { x: number; y: number } },
    imgClass: string,
    figClass = '',
  ) => {
    const priority = !priorityImageUsed;
    priorityImageUsed = true;
    const point = ph.focalPoint;
    const position =
      point && Number.isFinite(point.x) && Number.isFinite(point.y)
        ? ` style="object-position:${Math.min(100, Math.max(0, point.x))}% ${Math.min(100, Math.max(0, point.y))}%"`
        : '';
    const size = ph.width && ph.height ? ` width="${ph.width}" height="${ph.height}"` : '';
    return `<figure class="${/\babsolute\b/.test(figClass) ? figClass : `relative ${figClass}`}"><img src="${esc(ph.src)}" alt="${esc(ph.alt)}" class="${imgClass}"${size}${position} loading="${priority ? 'eager' : 'lazy'}"${priority ? ' fetchpriority="high"' : ''} decoding="async">${ph.example ? (/^KI-generiertes/.test(ph.alt) ? '<figcaption class="absolute bottom-2 left-2 z-20 rounded bg-black/70 px-2 py-1 text-xs text-white">KI-generiertes Beispielbild</figcaption>' : '<figcaption class="sr-only">Lizenziertes Beispielfoto zur Gestaltung, keine Aufnahme des Betriebs.</figcaption>') : ''}</figure>`;
  };

  return {
    head,
    top: `${skip}${banner}`,
    industry,
    draft,
    photos,
    figure,
    industrySections,
    trustChips,
    heroName,
    heroActions,
    exampleServices,
    process,
    contactHub,
    isDemo,
    isLive,
    servicesNote,
    callHref,
    phoneLabel,
    ctaHref,
    contactSection,
    hoursList,
    addressLines,
    mapsHref,
    faqList,
    footer,
    about: (cls = '') => paragraphs(content.about, cls),
    jsonLd,
    brand: () => {
      // Kundenlogo/-fotos gibt es nur nach dem Onboarding – Demos zeigen nie Material des Betriebs
      const logo =
        (!draft || facts.logoRightsConfirmed) && facts.logoSrc
          ? `<img src="${esc(facts.logoSrc)}" alt="" class="h-8 w-auto max-w-28 object-contain sm:h-10 sm:max-w-40" height="40">`
          : '';
      // Auf schmalen Bildschirmen nur das Logo (Name bleibt für Screenreader erhalten)
      return logo
        ? `<span class="inline-flex min-w-0 items-center gap-3">${logo}<span class="sr-only sm:not-sr-only">${esc(facts.name)}</span></span>`
        : esc(facts.name);
    },
    gallery: (o = {}) => {
      const photos = (facts.photos ?? []).filter((ph) => !draft || (ph.rightsConfirmed && ph.origin === 'business'));
      if (!photos.length) return '';
      return `<section id="einblicke" aria-labelledby="einblicke-titel" class="${o.sectionClass ?? 'py-16 md:py-20'}">
  <div class="mx-auto max-w-6xl px-4">
    <h2 id="einblicke-titel" class="${o.titleClass ?? 'text-2xl font-bold md:text-3xl'}">Einblicke</h2>
    <ul class="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">${photos
      .map(
        (ph) =>
          `<li><img src="${esc(ph.src)}" alt="${esc(ph.alt)}" loading="lazy" class="aspect-[4/3] w-full rounded-lg object-cover" width="600" height="450"></li>`,
      )
      .join('')}</ul>
  </div>
</section>`;
    },
  };
}

/** Gemeinsamer Dokumentrahmen. */
export function documentShell(parts: SharedParts, bodyClass: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="de">
${parts.head}
<body class="${bodyClass}">
${parts.top}
${body}
</body>
</html>`;
}
