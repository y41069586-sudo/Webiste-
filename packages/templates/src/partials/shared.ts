import { readSiteCss } from '../css';
import { esc, mapsLink, paragraphs } from '../html';
import { icon } from '../icons';
import { getPalette, paletteCssVars } from '../palettes';
import type { RenderInput } from '../types';

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
  contactSection(opts: { sectionClass: string; cardClass: string; titleClass: string; buttonClass: string; inputClass: string }): string;
  hoursList(opts?: { rowClass?: string; labelClass?: string; mutedClass?: string }): string;
  addressLines: string;
  mapsHref: string;
  faqList(opts: { itemClass: string; summaryClass: string; answerClass: string }): string;
  footer(opts: { className: string; linkClass: string }): string;
  /** Inhalt von „Über uns“ als Absätze */
  about(cls?: string): string;
  jsonLd: string;
  /** Logo (falls vorhanden) + Firmenname für den Seitenkopf */
  brand(): string;
  /** Bildergalerie mit Kundenfotos (leer, wenn keine Fotos) */
  gallery(opts?: { sectionClass?: string; titleClass?: string }): string;
}

function faviconDataUri(letter: string, color: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="${color}"/><text x="16" y="22" font-family="Arial,sans-serif" font-size="18" font-weight="700" text-anchor="middle" fill="#fff">${letter}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export function buildParts(input: RenderInput): SharedParts {
  const { mode, content, facts, demo, live } = input;
  const palette = getPalette(input.palette);
  const isDemo = mode === 'demo';
  const isLive = mode === 'live';
  const noindex = mode !== 'live';
  const css = readSiteCss();
  const letter = esc(facts.name.trim().charAt(0).toUpperCase() || 'W');

  const jsonLd = isLive
    ? `<script type="application/ld+json">${JSON.stringify({
        '@context': 'https://schema.org',
        '@type': facts.group === 'beauty' ? 'BeautySalon' : 'HomeAndConstructionBusiness',
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
    banner = `<aside class="sticky top-0 z-50 border-b border-black/10 bg-[#111827] text-white shadow-md" aria-label="Hinweis zum Entwurf">
  <div class="mx-auto flex max-w-6xl flex-col gap-1.5 px-3 py-2 text-xs sm:gap-2 sm:px-4 sm:py-2.5 sm:text-sm md:flex-row md:items-center md:justify-between">
    <p class="leading-snug"><strong class="font-semibold">Unverbindlicher Entwurf</strong> von ${esc(demo.sender.company)} für ${esc(facts.name)}. Nicht öffentlich.</p>
    <div class="flex flex-wrap items-center gap-1.5 sm:gap-2">
      <a href="${esc(demo.checkoutUrl)}" class="inline-flex min-h-10 items-center rounded-md bg-[#fbbf24] px-2.5 py-1.5 sm:px-3 font-semibold text-[#111827] hover:bg-[#f59e0b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">Für ${esc(demo.priceLabel)} übernehmen</a>
      <a href="#frage" class="inline-flex min-h-10 items-center rounded-md border border-white/40 px-2.5 py-1.5 sm:px-3 font-medium text-white hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">Frage stellen</a>
      <form method="post" action="${esc(demo.optOutUrl)}" class="inline">
        <button type="submit" class="inline-flex min-h-10 items-center rounded-md px-2 py-1.5 sm:px-3 font-medium text-white underline underline-offset-2 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">Kein Interesse</button>
      </form>
    </div>
  </div>
</aside>`;
  } else if (mode === 'preview') {
    banner = `<aside class="sticky top-0 z-50 bg-[#1e3a8a] px-4 py-2 text-center text-sm text-white" aria-label="Vorschau">Vorschau – diese Seite ist noch nicht veröffentlicht.</aside>`;
  }

  const callHref = facts.phoneHref ?? null;
  const phoneLabel = facts.phone ?? null;
  const ctaHref = callHref ?? '#frage';
  const mapsHref = mapsLink(facts.street, facts.houseNumber, facts.postalCode, facts.city);
  const addressLines = `${esc(facts.street)} ${esc(facts.houseNumber)}<br>${esc(facts.postalCode)} ${esc(facts.city)}`;

  const servicesNote = (cls = 'text-sm text-muted') =>
    isDemo ? `<p class="${cls}"><span aria-hidden="true">✎ </span>Beispiel-Leistungen – passen wir gemeinsam für Sie an.</p>` : '';

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

  const contactSection = (o: { sectionClass: string; cardClass: string; titleClass: string; buttonClass: string; inputClass: string }) => {
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
      <p class="mt-3 flex items-start gap-3"><span class="mt-0.5 text-primary">${icon('pin', 'h-5 w-5')}</span><span>${addressLines}</span></p>
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
      <button type="submit" class="${o.buttonClass} mt-5"${dis}>Nachricht senden</button>
    </form>
  </div>
</section>`;
  };

  const footer = (o: { className: string; linkClass: string }) => {
    const year = new Date().getFullYear();
    if (isDemo && demo) {
      return `<footer class="${o.className}">
  <div class="mx-auto grid max-w-6xl gap-6 px-4 py-10 md:grid-cols-3">
    <div><p class="font-semibold">${esc(facts.name)}</p><p class="mt-2 text-sm opacity-90">${addressLines}</p></div>
    <div class="text-sm opacity-90"><p>Dies ist ein unverbindlicher Entwurf. ${esc(facts.name)} hat diese Seite nicht beauftragt.</p><p class="mt-2">Der Entwurf wird ${esc(demo.expiresLabel)} automatisch gelöscht.</p></div>
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

  return {
    head,
    top: `${skip}${banner}`,
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
      const logo = !isDemo && facts.logoSrc ? `<img src="${esc(facts.logoSrc)}" alt="" class="h-8 w-auto max-w-28 object-contain sm:h-10 sm:max-w-40" height="40">` : '';
      // Auf schmalen Bildschirmen nur das Logo (Name bleibt für Screenreader erhalten)
      return logo ? `<span class="inline-flex min-w-0 items-center gap-3">${logo}<span class="sr-only sm:not-sr-only">${esc(facts.name)}</span></span>` : esc(facts.name);
    },
    gallery: (o = {}) => {
      const photos = isDemo ? [] : (facts.photos ?? []);
      if (!photos.length) return '';
      return `<section id="einblicke" aria-labelledby="einblicke-titel" class="${o.sectionClass ?? 'py-16 md:py-20'}">
  <div class="mx-auto max-w-6xl px-4">
    <h2 id="einblicke-titel" class="${o.titleClass ?? 'text-2xl font-bold md:text-3xl'}">Einblicke</h2>
    <ul class="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">${photos
      .map((ph) => `<li><img src="${esc(ph.src)}" alt="${esc(ph.alt)}" loading="lazy" class="aspect-[4/3] w-full rounded-lg object-cover" width="600" height="450"></li>`)
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
