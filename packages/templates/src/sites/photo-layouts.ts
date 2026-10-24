import { esc } from '../html';
import { icon } from '../icons';
import { documentShell, type SharedParts } from '../partials/shared';
import type { BranchGroup, IconKey, RenderContext, TemplateDef } from '../types';

/**
 * Drei Layout-Familien mit Fotos („Foto“, „Split“, „Magazin“) für Gastronomie, Einzelhandel und Kurse.
 * Fotos: im Entwurf lizenzfreie Beispielfotos (gekennzeichnet), live nur Fotos des Kunden; ohne Fotos
 * fällt jedes Layout auf eine Farbfläche mit Icon zurück.
 */
type PhotoGroup = Extract<BranchGroup, 'gastronomie' | 'einzelhandel' | 'kurse'>;

const COPY: Record<PhotoGroup, { offer: string; nav: string; icon: IconKey; tag: string }> = {
  gastronomie: { offer: 'Unser Angebot', nav: 'Angebot', icon: 'cup', tag: 'Gastronomie' },
  einzelhandel: { offer: 'Sortiment', nav: 'Sortiment', icon: 'bag', tag: 'Fachgeschäft' },
  kurse: { offer: 'Kurse & Angebot', nav: 'Kurse', icon: 'calendar', tag: 'Kurse & Training' },
};

const PALETTES: Record<PhotoGroup, string[]> = {
  gastronomie: ['espresso', 'olive', 'tomate'],
  einzelhandel: ['kiosk', 'flieder', 'sand'],
  kurse: ['energie', 'lagune', 'nacht'],
};

/** In der Gastronomie ersetzt im Entwurf die Speisekarte den allgemeinen Angebotsabschnitt. */
function showOffer(group: PhotoGroup, p: SharedParts): boolean {
  return !(group === 'gastronomie' && p.draft);
}

function fallbackArt(i: IconKey, cls: string): string {
  return `<div class="${cls} flex items-center justify-center bg-primary text-on-primary" aria-hidden="true">${icon(i, 'h-20 w-20')}</div>`;
}

function common(ctx: RenderContext) {
  const { parts: p } = ctx;
  return {
    form: {
      sectionClass: 'py-16',
      cardClass: 'rounded-2xl bg-surface-alt p-6 ring-1 ring-line',
      titleClass: 'font-heading text-3xl font-bold',
      buttonClass:
        'inline-flex min-h-12 items-center rounded-full bg-primary px-6 py-3 font-semibold text-on-primary disabled:opacity-60',
      inputClass: 'block w-full rounded-lg border border-line bg-surface px-3 py-2.5 focus:outline-2 focus:outline-primary',
    },
    faq: `<section aria-labelledby="faq-titel" class="border-t border-line py-16">
    <div class="mx-auto max-w-3xl px-4">
      <h2 id="faq-titel" class="font-heading text-3xl font-bold">Fragen &amp; Antworten</h2>
      <div class="mt-6 divide-y divide-line">${p.faqList({
        itemClass: 'py-4',
        summaryClass: 'cursor-pointer text-lg font-semibold',
        answerClass: 'mt-2 text-muted',
      })}</div>
    </div>
  </section>`,
    visit: `<section id="oeffnungszeiten" aria-labelledby="zeiten-titel" class="bg-surface-alt py-16">
    <div class="mx-auto grid max-w-6xl gap-10 px-4 md:grid-cols-2">
      <div>
        <h2 id="zeiten-titel" class="font-heading text-2xl font-bold">Öffnungszeiten</h2>
        <div class="mt-4 rounded-xl bg-surface p-5 ring-1 ring-line">${p.hoursList()}</div>
      </div>
      <div id="anfahrt">
        <h2 class="font-heading text-2xl font-bold">Anfahrt</h2>
        <div class="mt-4 rounded-xl bg-surface p-5 ring-1 ring-line">
          <p class="flex items-start gap-3 text-lg"><span class="mt-1 text-primary">${icon('pin', 'h-5 w-5')}</span><span>${p.addressLines}</span></p>
          <a class="mt-5 inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-4" href="${esc(p.mapsHref)}" rel="noopener" target="_blank">Route bei OpenStreetMap planen<span class="sr-only"> (neuer Tab)</span></a>
        </div>
      </div>
    </div>
  </section>`,
    footer: p.footer({ className: 'border-t border-line bg-surface-alt text-ink', linkClass: 'underline underline-offset-4' }),
  };
}

function header(ctx: RenderContext, group: PhotoGroup, variant: 'light' | 'center'): string {
  const { parts: p } = ctx;
  const c = COPY[group];
  const links = [
    showOffer(group, p) ? `<li><a class="hover:text-ink" href="#leistungen">${esc(c.nav)}</a></li>` : '',
    p.draft && group === 'gastronomie' ? '<li><a class="hover:text-ink" href="#speisekarte">Speisekarte</a></li>' : '',
    '<li><a class="hover:text-ink" href="#ueber-uns">Über uns</a></li>',
    '<li><a class="hover:text-ink" href="#oeffnungszeiten">Öffnungszeiten</a></li>',
    '<li><a class="hover:text-ink" href="#frage">Kontakt</a></li>',
  ].join('');
  const nav = `<nav aria-label="Hauptnavigation" class="hidden md:block"><ul class="flex gap-6 text-sm text-muted">${links}</ul></nav>`;
  if (variant === 'center') {
    return `<header class="border-b border-line bg-surface">
  <div class="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 py-5">
    <a href="#inhalt" class="font-heading text-2xl font-bold tracking-tight">${p.brand()}</a>
    ${nav}
  </div>
</header>`;
  }
  return `<header class="border-b border-line bg-surface">
  <div class="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
    <a href="#inhalt" class="flex items-center gap-2 text-lg font-bold"><span class="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary text-on-primary">${icon(c.icon, 'h-5 w-5')}</span>${p.brand()}</a>
    ${nav}
    <a href="#frage" class="inline-flex min-h-11 items-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-on-primary">Kontakt</a>
  </div>
</header>`;
}

function offerCards(ctx: RenderContext, group: PhotoGroup, style: 'cards' | 'list' | 'columns'): string {
  const { parts: p, content: c } = ctx;
  if (!showOffer(group, p)) return '';
  const items = c.services
    .map((s) => {
      if (style === 'list')
        return `<li class="flex gap-4 border-b border-line py-5"><span class="mt-1 text-primary">${icon(s.icon, 'h-6 w-6')}</span><div><h3 class="text-lg font-semibold">${esc(s.title)}</h3><p class="mt-1 text-muted">${esc(s.text)}</p></div></li>`;
      return `<li class="rounded-2xl bg-surface p-6 ring-1 ring-line"><span class="inline-flex h-11 w-11 items-center justify-center rounded-full bg-surface-alt text-primary">${icon(s.icon, 'h-5 w-5')}</span><h3 class="mt-4 text-lg font-semibold">${esc(s.title)}</h3><p class="mt-2 text-muted">${esc(s.text)}</p></li>`;
    })
    .join('');
  const grid =
    style === 'list' ? 'mt-6' : style === 'columns' ? 'mt-8 grid gap-6 md:grid-cols-3' : 'mt-8 grid gap-6 sm:grid-cols-2';
  return `<section id="leistungen" aria-labelledby="angebot-titel" class="${style === 'list' ? 'py-16' : 'bg-surface-alt py-16'}">
    <div class="mx-auto max-w-6xl px-4">
      <h2 id="angebot-titel" class="font-heading text-3xl font-bold">${esc(COPY[group].offer)}</h2>
      ${p.servicesNote('mt-2 text-sm text-muted')}
      <ul class="${grid}">${items}</ul>
    </div>
  </section>`;
}

function about(ctx: RenderContext, cls = 'py-16'): string {
  return `<section id="ueber-uns" aria-labelledby="ueber-titel" class="${cls}">
    <div class="mx-auto max-w-3xl px-4">
      <h2 id="ueber-titel" class="font-heading text-3xl font-bold">Über uns</h2>
      <div class="mt-5 space-y-4 text-lg leading-relaxed">${ctx.parts.about()}</div>
    </div>
  </section>`;
}

function tail(ctx: RenderContext): string {
  const k = common(ctx);
  const p = ctx.parts;
  return `${k.visit}
  ${p.industrySections({ ...k.form, altSectionClass: 'bg-surface-alt py-16' })}
  ${p.gallery()}
  ${p.contactSection(k.form)}
  ${k.faq}
</main>
${k.footer}`;
}

function heroCta(ctx: RenderContext, light = false): string {
  const { parts: p, content: c } = ctx;
  const btn = light ? 'bg-surface text-ink hover:opacity-90' : 'bg-primary text-on-primary';
  return `<div class="mt-8 flex flex-wrap items-center gap-4">
          <a href="${esc(p.ctaHref)}" class="inline-flex min-h-12 items-center gap-2 rounded-full px-6 py-3 font-semibold ${btn}">${icon(p.callHref ? 'phone' : 'chat', 'h-5 w-5')}${esc(c.cta_text)}</a>
          ${p.phoneLabel ? `<span class="${light ? 'text-white' : 'text-muted'}">oder direkt: <a class="font-semibold underline-offset-4 hover:underline" href="${esc(p.callHref)}">${esc(p.phoneLabel)}</a></span>` : ''}
        </div>`;
}

/** Foto: großes Bild als Hero mit dunkler Fläche für den Text, Fotoleiste, Karten. */
function fotoLayout(group: PhotoGroup): TemplateDef {
  return {
    id: `${group}-foto`,
    group,
    name: 'Foto',
    description: 'Großes Foto im Kopf, Angebot als Karten, Fotoleiste',
    palettes: PALETTES[group],
    render(ctx) {
      const { parts: p, content: c, facts: f } = ctx;
      const [hero, ...more] = p.photos(4);
      const heroMedia = hero
        ? p.figure(hero, 'h-full w-full object-cover', 'absolute inset-0 h-full w-full')
        : fallbackArt(COPY[group].icon, 'absolute inset-0 h-full w-full');
      const strip = more.length
        ? `<section aria-label="Eindrücke" class="py-12"><ul class="mx-auto grid max-w-6xl gap-4 px-4 sm:grid-cols-3">${more
            .map((ph) => `<li>${p.figure(ph, 'aspect-[4/3] w-full rounded-2xl object-cover')}</li>`)
            .join('')}</ul></section>`
        : '';
      const body = `${header(ctx, group, 'light')}
<main id="inhalt">
  <section class="relative isolate overflow-hidden">
    ${heroMedia}
    <div class="relative z-10 bg-black/65 md:bg-transparent md:bg-gradient-to-r md:from-black/80 md:via-black/60 md:to-black/20">
      <div class="mx-auto max-w-6xl px-4 py-24 md:py-32">
        <p class="text-sm font-semibold uppercase tracking-widest text-white">${esc(COPY[group].tag)} in ${esc(f.city)}</p>
        <h1 class="mt-3 max-w-2xl font-heading text-4xl font-bold leading-tight text-white md:text-5xl">${esc(c.hero_headline)}</h1>
        <p class="mt-5 max-w-xl text-lg text-white">${esc(c.hero_subline)}</p>
        ${heroCta(ctx, true)}
      </div>
    </div>
  </section>
  ${offerCards(ctx, group, 'cards')}
  ${strip}
  ${about(ctx)}
  ${tail(ctx)}`;
      return documentShell(p, 'bg-surface font-body text-ink antialiased', body);
    },
  };
}

/** Split: Text links, Foto rechts; Angebot als Liste; Foto neben „Über uns“. */
function splitLayout(group: PhotoGroup): TemplateDef {
  return {
    id: `${group}-split`,
    group,
    name: 'Split',
    description: 'Geteilter Kopf mit Foto, Angebot als Liste, Foto neben „Über uns“',
    palettes: [...PALETTES[group].slice(1), PALETTES[group][0]!],
    render(ctx) {
      const { parts: p, content: c, facts: f } = ctx;
      const [hero, second] = p.photos(2);
      const media = (ph: typeof hero, cls: string) =>
        ph ? p.figure(ph, `${cls} w-full object-cover`) : fallbackArt(COPY[group].icon, `${cls} w-full`);
      const body = `${header(ctx, group, 'light')}
<main id="inhalt">
  <section class="py-14 md:py-20">
    <div class="mx-auto grid max-w-6xl items-center gap-12 px-4 md:grid-cols-2">
      <div>
        <p class="text-sm font-semibold uppercase tracking-widest text-primary">${esc(COPY[group].tag)} · ${esc(f.city)}</p>
        <h1 class="mt-3 font-heading text-4xl font-bold leading-tight md:text-5xl">${esc(c.hero_headline)}</h1>
        <p class="mt-5 max-w-xl text-lg text-muted">${esc(c.hero_subline)}</p>
        ${heroCta(ctx)}
      </div>
      ${media(hero, 'aspect-[4/3] rounded-3xl')}
    </div>
  </section>
  ${offerCards(ctx, group, 'list')}
  <section id="ueber-uns" aria-labelledby="ueber-titel" class="bg-surface-alt py-16">
    <div class="mx-auto grid max-w-6xl items-center gap-10 px-4 md:grid-cols-2">
      ${media(second, 'aspect-[4/3] rounded-3xl')}
      <div>
        <h2 id="ueber-titel" class="font-heading text-3xl font-bold">Über uns</h2>
        <div class="mt-5 space-y-4 text-lg leading-relaxed">${p.about()}</div>
      </div>
    </div>
  </section>
  ${tail(ctx)}`;
      return documentShell(p, 'bg-surface font-body text-ink antialiased', body);
    },
  };
}

/** Magazin: zentrierter Kopf, breites Foto, Angebot in drei Spalten, zwei Fotos im Raster. */
function magazinLayout(group: PhotoGroup): TemplateDef {
  return {
    id: `${group}-magazin`,
    group,
    name: 'Magazin',
    description: 'Zentrierter Kopf, breites Foto, Angebot in drei Spalten',
    palettes: [PALETTES[group][2]!, PALETTES[group][0]!, PALETTES[group][1]!],
    render(ctx) {
      const { parts: p, content: c, facts: f } = ctx;
      const [wide, a, b] = p.photos(3);
      const pair = [a, b].filter((x): x is NonNullable<typeof x> => Boolean(x));
      const body = `${header(ctx, group, 'center')}
<main id="inhalt">
  <section class="pt-14 text-center md:pt-20">
    <div class="mx-auto max-w-3xl px-4">
      <p class="text-sm font-semibold uppercase tracking-widest text-primary">${esc(f.branchLabel)} in ${esc(f.city)}</p>
      <h1 class="mt-3 font-heading text-4xl font-bold leading-tight md:text-6xl">${esc(c.hero_headline)}</h1>
      <p class="mx-auto mt-5 max-w-2xl text-lg text-muted">${esc(c.hero_subline)}</p>
      <div class="flex justify-center">${heroCta(ctx)}</div>
    </div>
    <div class="mx-auto mt-12 max-w-6xl px-4">${
      wide
        ? p.figure(wide, 'aspect-[16/7] w-full rounded-3xl object-cover')
        : fallbackArt(COPY[group].icon, 'aspect-[16/7] w-full rounded-3xl')
    }</div>
  </section>
  ${offerCards(ctx, group, 'columns')}
  ${about(ctx)}
  ${
    pair.length
      ? `<section aria-label="Eindrücke" class="pb-16"><ul class="mx-auto grid max-w-6xl gap-6 px-4 md:grid-cols-2">${pair
          .map((ph) => `<li>${p.figure(ph, 'aspect-[4/3] w-full rounded-3xl object-cover')}</li>`)
          .join('')}</ul></section>`
      : ''
  }
  ${tail(ctx)}`;
      return documentShell(p, 'bg-surface font-body text-ink antialiased', body);
    },
  };
}

const GROUPS: PhotoGroup[] = ['gastronomie', 'einzelhandel', 'kurse'];

export const PHOTO_TEMPLATES: TemplateDef[] = GROUPS.flatMap((g) => [fotoLayout(g), splitLayout(g), magazinLayout(g)]);
