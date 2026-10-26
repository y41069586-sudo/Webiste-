import { esc } from '../html';
import { localProfile } from '../partials/local-profile';
import { icon } from '../icons';
import { documentShell, type SharedParts } from '../partials/shared';
import type { BranchGroup, IconKey, RenderContext, TemplateDef } from '../types';

/**
 * Plakat: knallige Vollfläche in der Akzentfarbe, riesige Versal-Überschrift, große Form oder Foto,
 * Band mit den Leistungen in der Kontrastfarbe. Für alle Gruppen; mit Fotos (Entwurf: lizenzfreie
 * Beispielfotos, gekennzeichnet – der Aufkleber verdeckt die Kennzeichnung nie), sonst große Form mit Icon.
 */
const COPY: Record<BranchGroup, { offer: string; nav: string; icon: IconKey; tag: string }> = {
  handwerk: { offer: 'Leistungen', nav: 'Leistungen', icon: 'roller', tag: 'Handwerk' },
  beauty: { offer: 'Behandlungen', nav: 'Behandlungen', icon: 'sparkle', tag: 'Beauty' },
  gastronomie: { offer: 'Unser Angebot', nav: 'Angebot', icon: 'cup', tag: 'Gastronomie' },
  einzelhandel: { offer: 'Sortiment', nav: 'Sortiment', icon: 'bag', tag: 'Fachgeschäft' },
  kurse: { offer: 'Kurse & Angebot', nav: 'Kurse', icon: 'calendar', tag: 'Kurse & Training' },
};

const PALETTES: Record<BranchGroup, string[]> = {
  handwerk: ['signalgelb', 'mandarine', 'minze'],
  beauty: ['pink', 'lavendel', 'koralle'],
  gastronomie: ['paprika', 'senf', 'pistazie'],
  einzelhandel: ['limette', 'aprikose', 'flamingo'],
  kurse: ['tuerkis', 'sonne', 'neonrosa'],
};

/** In der Gastronomie ersetzt im Entwurf die Speisekarte den allgemeinen Angebotsabschnitt. */
function showOffer(group: BranchGroup, p: SharedParts): boolean {
  return !(group === 'gastronomie' && p.draft);
}

const BTN = 'inline-flex min-h-12 items-center gap-2 rounded-full bg-primary px-7 py-3 font-bold text-on-primary';

function heroMedia(ctx: RenderContext, group: BranchGroup): string {
  const { parts: p, facts: f } = ctx;
  const [photo] = p.photos(1);
  const sticker = (pos: string) =>
    `<p class="absolute ${pos} rounded-full bg-surface px-5 py-2 text-sm font-black uppercase tracking-wider text-ink shadow-lg ring-2 ring-ink">${esc(f.city)}</p>`;
  if (photo) {
    return `<div class="relative mx-auto w-full max-w-md">
        <div class="absolute inset-0 translate-x-4 translate-y-4 rounded-[2rem] bg-primary" aria-hidden="true"></div>
        ${p.figure(photo, 'aspect-[4/5] w-full rounded-[2rem] object-cover ring-4 ring-on-accent md:aspect-square', '')}
        ${sticker('-top-4 -right-2 rotate-6')}
      </div>`;
  }
  return `<div class="sw-plakat-profile"><p class="mb-4 text-sm font-bold uppercase">${esc(COPY[group].nav)}</p>${localProfile(ctx, 'studio')}</div>`;
}

function plakatLayout(group: BranchGroup): TemplateDef {
  return {
    id: `${group}-plakat`,
    group,
    name: 'Plakat',
    description: 'Knallige Vollfläche, große Versalien, Band mit den Leistungen',
    palettes: PALETTES[group],
    render(ctx) {
      const { parts: p, content: c, facts: f } = ctx;
      const k = COPY[group];
      const offer = showOffer(group, p);
      const links = [
        offer ? `<li><a class="hover:underline" href="#leistungen">${esc(k.nav)}</a></li>` : '',
        p.draft && group === 'gastronomie' ? '<li><a class="hover:underline" href="#speisekarte">Speisekarte</a></li>' : '',
        '<li><a class="hover:underline" href="#ueber-uns">Über uns</a></li>',
        '<li><a class="hover:underline" href="#oeffnungszeiten">Öffnungszeiten</a></li>',
      ].join('');
      const ticker = c.services.map((s) => esc(s.title));
      const form = {
        sectionClass: 'py-16',
        cardClass: 'rounded-3xl bg-surface-alt p-6 ring-2 ring-ink',
        titleClass: 'font-heading text-[1.75rem] font-black uppercase tracking-tight [overflow-wrap:anywhere] sm:text-4xl',
        buttonClass: `${BTN} disabled:opacity-60`,
        inputClass: 'block w-full rounded-xl border-2 border-ink bg-surface px-3 py-2.5 focus:outline-2 focus:outline-primary',
      };
      const body = `<header class="bg-accent text-on-accent">
  <div class="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-5">
    <a href="#inhalt" class="font-heading text-xl font-black uppercase tracking-tight">${p.brand()}</a>
    <nav aria-label="Hauptnavigation" class="hidden md:block"><ul class="flex gap-6 text-sm font-bold">${links}</ul></nav>
    <a href="${p.draft ? '#oeffnungszeiten' : '#frage'}" class="inline-flex min-h-11 items-center rounded-full bg-primary px-5 py-2 text-sm font-bold text-on-primary">Kontakt</a>
  </div>
</header>
<main id="inhalt">
  <section class="overflow-hidden bg-accent text-on-accent">
    <div class="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-8 pb-16 md:grid-cols-12 md:pt-12 md:pb-20">
      <div class="min-w-0 md:col-span-7">
        <p class="inline-flex rounded-full border-2 border-on-accent px-4 py-1 text-xs font-bold uppercase tracking-widest">${esc(k.tag)} · ${esc(f.city)}</p>
        <h1 class="mt-6 font-heading text-[2rem] font-black uppercase leading-[0.95] tracking-tight [overflow-wrap:anywhere] sm:text-5xl md:text-6xl xl:text-7xl">${esc(c.hero_headline)}</h1>
        <p class="mt-6 max-w-lg text-lg font-medium">${esc(c.hero_subline)}</p>
        <div class="mt-8 flex flex-wrap items-center gap-4">
          <a href="${esc(p.ctaHref)}" class="${BTN}">${icon(p.callHref ? 'phone' : 'chat', 'h-5 w-5')}${esc(c.cta_text)}</a>
          ${p.phoneLabel ? `<span class="font-semibold">oder direkt: <a class="underline underline-offset-4" href="${esc(p.callHref)}">${esc(p.phoneLabel)}</a></span>` : ''}
        </div>
      </div>
      <div class="md:col-span-5">${heroMedia(ctx, group)}</div>
    </div>
    <div class="border-y-2 border-on-accent bg-primary text-on-primary" aria-hidden="true">
      <p class="mx-auto flex max-w-6xl flex-wrap justify-center gap-x-4 gap-y-1 px-4 py-3 text-sm font-black uppercase tracking-widest">${ticker
        .map((t, i) => `${i ? '<span>✱</span>' : ''}<span>${t}</span>`)
        .join('')}</p>
    </div>
  </section>

  ${
    offer
      ? `<section id="leistungen" aria-labelledby="leistungen-titel" class="py-16">
    <div class="mx-auto max-w-6xl px-4">
      <div class="flex flex-wrap items-end justify-between gap-2">
        <h2 id="leistungen-titel" class="font-heading text-[1.75rem] font-black uppercase tracking-tight [overflow-wrap:anywhere] sm:text-4xl">${esc(k.offer)}</h2>
        ${p.servicesNote()}
      </div>
      <ul class="mt-8 grid gap-5 md:grid-cols-3">${c.services
        .map(
          (s) => `<li class="rounded-3xl bg-surface p-6 ring-2 ring-ink">
          <span class="inline-flex h-12 w-12 items-center justify-center rounded-full bg-accent text-on-accent">${icon(s.icon, 'h-6 w-6')}</span>
          <h3 class="mt-5 text-xl font-bold">${esc(s.title)}</h3><p class="mt-2 text-muted">${esc(s.text)}</p>
        </li>`,
        )
        .join('')}</ul>
    </div>
  </section>`
      : ''
  }

  <section id="ueber-uns" aria-labelledby="ueber-titel" class="bg-surface-alt py-16">
    <div class="mx-auto grid max-w-6xl gap-10 px-4 md:grid-cols-3">
      <h2 id="ueber-titel" class="font-heading text-[1.75rem] font-black uppercase tracking-tight [overflow-wrap:anywhere] sm:text-4xl">Über uns</h2>
      <div class="space-y-4 text-lg leading-relaxed md:col-span-2">${p.about()}</div>
    </div>
  </section>

  <section id="oeffnungszeiten" aria-labelledby="zeiten-titel" class="bg-primary py-16 text-on-primary">
    <div class="mx-auto grid max-w-6xl gap-10 px-4 md:grid-cols-2">
      <div>
        <h2 id="zeiten-titel" class="font-heading text-[1.75rem] font-black uppercase tracking-tight [overflow-wrap:anywhere] sm:text-4xl">Öffnungszeiten</h2>
        <div class="mt-6 [&_dl]:divide-on-primary/20">${p.hoursList({ mutedClass: 'text-on-primary opacity-90' })}</div>
      </div>
      <div>
        <h2 class="font-heading text-[1.75rem] font-black uppercase tracking-tight [overflow-wrap:anywhere] sm:text-4xl">Anfahrt</h2>
        <p class="mt-6 text-lg">${p.addressLines}</p>
        <a class="mt-6 inline-flex min-h-11 items-center rounded-full border-2 border-on-primary px-5 py-2 font-bold" href="${esc(p.mapsHref)}" rel="noopener" target="_blank">Route planen<span class="sr-only"> (OpenStreetMap, neuer Tab)</span></a>
      </div>
    </div>
  </section>

  ${p.industrySections({ ...form, altSectionClass: 'bg-surface-alt py-16' })}
  ${p.gallery()}
  ${p.contactSection(form)}

  <section aria-labelledby="faq-titel" class="bg-surface-alt py-16">
    <div class="mx-auto max-w-3xl px-4">
      <h2 id="faq-titel" class="font-heading text-[1.75rem] font-black uppercase tracking-tight [overflow-wrap:anywhere] sm:text-4xl">Fragen</h2>
      <div class="mt-6 space-y-3">${p.faqList({
        itemClass: 'rounded-2xl bg-surface p-5 ring-2 ring-ink',
        summaryClass: 'cursor-pointer text-lg font-bold',
        answerClass: 'mt-2 text-muted',
      })}</div>
    </div>
  </section>
</main>
${p.footer({ className: 'bg-primary-dark text-on-primary', linkClass: 'underline underline-offset-4' })}`;
      return documentShell(p, 'bg-surface font-body text-ink antialiased', body);
    },
  };
}

const GROUPS: BranchGroup[] = ['handwerk', 'beauty', 'gastronomie', 'einzelhandel', 'kurse'];

export const PLAKAT_TEMPLATES: TemplateDef[] = GROUPS.map(plakatLayout);
