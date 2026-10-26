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
  contactSection(opts: {
    sectionClass: string;
    cardClass: string;
    titleClass: string;
    buttonClass: string;
    inputClass: string;
  }): string;
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
  const card = (
    c: (typeof cards)[number],
  ) => `<li class="flex flex-col rounded-xl border border-[#d1d5db] bg-white p-5 text-[#111827] shadow-sm">
      <h3 class="text-base font-semibold">${esc(c.title)}</h3>
      <p class="mt-2 text-3xl font-bold tracking-tight">${esc(c.price)}</p><p class="mt-1 text-sm text-[#4b5563]">${esc(c.unit)}</p>
      <ul class="mt-3 flex-1 space-y-1.5 text-sm text-[#374151]">${c.points.map((p) => `<li class="flex gap-2"><span aria-hidden="true" class="text-[#047857]">✓</span><span>${esc(p)}</span></li>`).join('')}</ul>
      <a href="${esc(c.href)}" class="mt-4 inline-flex min-h-11 items-center justify-center rounded-md bg-[#111827] px-4 py-2 font-semibold text-white hover:bg-[#1f2937] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#111827]">${demo.offerVersion === 'v4' ? `Mit ${esc(c.title.replace('SeitenWerk ', ''))} übernehmen` : `${esc(c.title)} wählen`}</a>
    </li>`;
  const t = demo.trust;
  const trust = t
    ? `<div class="mt-10 flex flex-col gap-4 rounded-xl border border-[#d1d5db] bg-white p-5 text-[#111827] sm:flex-row sm:items-start">
      ${t.photoDataUri ? `<img src="${t.photoDataUri}" alt="${esc(t.name)}" width="96" height="96" class="h-24 w-24 shrink-0 rounded-full object-cover">` : ''}
      <div>
        <h3 class="text-base font-semibold">Wer hat diesen Entwurf gebaut?</h3>
        <p class="mt-1 font-medium">${esc(t.name) || 'Anbieterangaben noch nicht vollständig – Veröffentlichung gesperrt'}</p>
        ${t.intro ? `<p class="mt-2 text-sm text-[#374151]">${esc(t.intro)}</p>` : ''}
        <p class="mt-3 text-sm text-[#374151]">${t.email ? `<a class="underline" href="mailto:${esc(t.email)}">${esc(t.email)}</a>` : ''}${t.phone ? ` · ${esc(t.phone)}` : ''} · <a class="underline" href="${esc(t.imprintUrl)}">Impressum</a></p>
      </div>
    </div>`
    : '';
  return `<section id="uebernehmen" aria-labelledby="uebernehmen-titel" class="border-t border-[#dce2ed] bg-[#f3f4f6] py-12 text-[#111827]">
  <div class="mx-auto max-w-4xl px-4">
    <p class="text-sm font-medium text-[#4b5563]">${brandMarkHtml(24)} Angebot von ${esc(demo.sender.company)} – nicht Teil der Website</p>
    <h2 id="uebernehmen-titel" class="mt-1 text-2xl font-semibold tracking-tight">${demo.offerVersion === 'v4' ? 'Gefällt Ihnen Ihre neue Website?' : 'Diese Seite übernehmen'}</h2>${demo.offerVersion === 'v4' ? '<p class="mt-3 text-sm">Einrichtung, Ihre Inhalte und Fertigstellung dieses Entwurfs. Veröffentlichung erst nach Ihrer Freigabe. Wählen Sie dazu Ihren laufenden Tarif:</p>' : ''}
    ${cards.length ? `<ul class="mt-6 grid gap-4 ${cards.length > 1 ? 'sm:grid-cols-2' : ''}">${cards.map(card).join('')}</ul>` : ''}
    ${opts.review || demo.offerVersion === 'v4' ? `<details class="mt-5 rounded-xl border border-[#d1d5db] bg-white p-5 text-sm"><summary class="cursor-pointer font-semibold">Was Sie beauftragen – Ablauf und Leistungsgrenzen</summary><p class="mt-3">Sie übermitteln Ihre tatsächlichen Inhalte und Änderungswünsche. Wir stellen den Entwurf fertig, richten die vereinbarten technischen Leistungen ein und veröffentlichen erst nach Ihrer Freigabe.</p><ol class="mt-4 space-y-3"><li><strong>1. Online bestellen</strong><br>Tarif und Bedingungen prüfen.</li><li><strong>2. Inhalte ergänzen</strong><br>Firmenangaben, rechtliche Texte, eigene Bilder und Wünsche übermitteln.</li><li><strong>3. Prüfen und freigeben</strong><br>Website abstimmen. Erst nach bestätigtem Go-Live beginnt die Monatsgebühr.</li></ol><p class="mt-4">Zusatzseiten, größere Umbauten und Leistungen außerhalb des Tarifs benötigen ein gesondertes Angebot. Domainumfang, Kündigungsfrist und Übergabe sind in den verlinkten Vertragsbedingungen beschrieben.</p></details>` : ''}
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
    ${trust}
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
  const palette = getPalette(input.palette);
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
<style>${css}</style>
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
  const servicesNote = (cls = 'text-sm text-muted') =>
    isDemo
      ? `<p class="${cls}"><span aria-hidden="true">✎ </span>Beispiel-Leistungen – passen wir gemeinsam für Sie an.${priceHint}</p>`
      : priceHint
        ? `<p class="${cls}">${priceHint.trim()}</p>`
        : '';

  const hoursList = (opts: { rowClass?: string; labelClass?: string; mutedClass?: string } = {}) => {
    const muted = opts.mutedClass ?? 'text-muted';
    if (!facts.openingLines.length) {
      return `<p class="${muted}">Termine und Öffnungszeiten nach Vereinbarung${facts.phone ? ' – rufen Sie uns gern an' : ''}.</p>`;
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

  const contactSection = (o: {
    sectionClass: string;
    cardClass: string;
    titleClass: string;
    buttonClass: string;
    inputClass: string;
  }) => {
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
      <p class="mt-3 text-muted">${intro}</p>
      ${
        phoneLabel && !isDemo
          ? `<p class="mt-6 flex items-center gap-3"><span class="text-primary">${icon('phone', 'h-5 w-5')}</span><a class="font-semibold underline-offset-4 hover:underline" href="${esc(callHref)}">${esc(phoneLabel)}</a></p>`
          : ''
      }
      <p class="mt-3 flex items-start gap-3"><span class="mt-0.5 text-primary">${icon('pin', 'h-5 w-5')}</span><span>${isDemo && demo ? `${esc(demo.sender.street)}<br>${esc(demo.sender.postalCode)} ${esc(demo.sender.city)}` : addressLines}</span></p>
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
          <label for="f-phone" class="mb-1 block text-sm font-medium">Telefon <span class="font-normal text-muted">(optional)</span></label>
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
      return `${o.omitOffer ? '' : offerSection(demo)}<footer class="${o.className}">
  <div class="mx-auto grid max-w-6xl gap-6 px-4 py-10 md:grid-cols-3">
    <div><p class="font-semibold">${esc(facts.name)}</p><p class="mt-2 text-sm opacity-90">${addressLines}</p>${facts.googleReviewsUrl ? `<p class="mt-2 text-sm"><a class="${o.linkClass}" href="${esc(facts.googleReviewsUrl)}" rel="noopener noreferrer">Bewertungen auf Google</a></p>` : ''}</div>
    <div class="text-sm opacity-90"><p>Dies ist ein unverbindlicher Entwurf. ${esc(facts.name)} hat diese Seite nicht beauftragt.</p><p class="mt-2">Der Entwurf ist bis ${esc(demo.expiresLabel.replace(/^am\s+/, ''))} online und anschließend nicht mehr öffentlich erreichbar.</p></div>
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
    if (industry === 'handwerk') {
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
    out.push(requestPreview(o));
    return out.join('\n');
  };

  const seed = [...(demo?.slug ?? facts.name)].reduce((a, ch) => a + ch.charCodeAt(0), 0);
  const photos = (n: number) => {
    const own = (facts.photos ?? []).filter(() => !isDemo).map((ph) => ({ src: ph.src, alt: ph.alt, example: false }));
    if (own.length || !draft) return own.slice(0, n);
    return stockPhotos(facts.group, seed, facts.branchLabel)
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
    return `<figure class="${/\babsolute\b/.test(figClass) ? figClass : `relative ${figClass}`}"><img src="${esc(ph.src)}" alt="${esc(ph.alt)}" class="${imgClass}"${size}${position} loading="${priority ? 'eager' : 'lazy'}"${priority ? ' fetchpriority="high"' : ''} decoding="async">${ph.example ? `<figcaption class="absolute bottom-2 left-2 z-20 max-w-[calc(100%-1rem)] rounded bg-black/70 px-2 py-0.5 text-xs font-medium text-white">${/^KI-generiertes/.test(ph.alt) ? 'KI-generiertes Beispielbild' : 'Beispielfoto'}</figcaption>` : ''}</figure>`;
  };

  return {
    head,
    top: `${skip}${banner}`,
    industry,
    draft,
    photos,
    figure,
    industrySections,
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
        !isDemo && facts.logoSrc
          ? `<img src="${esc(facts.logoSrc)}" alt="" class="h-8 w-auto max-w-28 object-contain sm:h-10 sm:max-w-40" height="40">`
          : '';
      // Auf schmalen Bildschirmen nur das Logo (Name bleibt für Screenreader erhalten)
      return logo
        ? `<span class="inline-flex min-w-0 items-center gap-3">${logo}<span class="sr-only sm:not-sr-only">${esc(facts.name)}</span></span>`
        : esc(facts.name);
    },
    gallery: (o = {}) => {
      const photos = isDemo ? [] : (facts.photos ?? []);
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
