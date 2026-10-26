import { esc } from '../html';
import { icon } from '../icons';
import { localProfile } from '../partials/local-profile';
import { documentShell } from '../partials/shared';
import type { TemplateDef } from '../types';

/** Beauty 1: elegant, Serifen, zentrierter Hero, feine Linien. */
export const beautyElegant: TemplateDef = {
  id: 'beauty-elegant',
  group: 'beauty',
  name: 'Elegant',
  description: 'Serifenschrift, zentriert, feine Linien, ruhige Flächen',
  palettes: ['rose', 'noir', 'salbei'],
  render({ parts: p, content: c, facts: f }) {
    const serviceLabel = /fris[öe]|friseur|haarsalon|barber|barbier/i.test(f.branchLabel) ? 'Leistungen' : 'Behandlungen';
    const body = `
<header class="border-b border-line bg-surface">
  <div class="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 py-5 md:flex-row md:justify-between">
    <a href="#inhalt" class="font-heading text-2xl italic tracking-wide">${p.brand()}</a>
    <nav aria-label="Hauptnavigation"><ul class="flex flex-wrap justify-center gap-x-6 gap-y-1 text-sm uppercase tracking-widest text-muted">
      <li><a class="hover:text-ink" href="#leistungen">${serviceLabel}</a></li>
      <li><a class="hover:text-ink" href="#ueber-uns">Über uns</a></li>
      <li><a class="hover:text-ink" href="#oeffnungszeiten">Zeiten</a></li>
      <li><a class="hover:text-ink" href="${p.draft ? '#oeffnungszeiten' : '#frage'}">Kontakt</a></li>
    </ul></nav>
  </div>
</header>
<main id="inhalt">
  <section class="sw-premium-hero sw-beauty-editorial">
    <div class="sw-beauty-title"><p class="sw-kicker">${esc(f.branchLabel)} · ${esc(f.city)}</p><h1>${esc(c.hero_headline)}</h1><p class="sw-hero-copy">${esc(c.hero_subline)}</p><a class="sw-hero-button" href="${esc(p.ctaHref)}">${esc(c.cta_text)}</a></div>
    <div class="sw-beauty-media">${localProfile({ facts: f, parts: p, content: c }, 'studio')}</div>
  </section>

  <section id="leistungen" aria-labelledby="leistungen-titel" class="py-16 md:py-20">
    <div class="mx-auto max-w-4xl px-4">
      <div class="text-center">
        <h2 id="leistungen-titel" class="font-heading text-4xl">${serviceLabel}</h2>
        ${p.servicesNote('mt-3 text-sm text-muted')}
      </div>
      <ul class="mt-10 divide-y divide-line border-y border-line">
        ${c.services
          .map(
            (s) => `<li class="grid gap-2 py-6 md:grid-cols-[3rem_1fr] md:gap-6">
          <span class="text-primary">${icon(s.icon, 'h-8 w-8')}</span>
          <div><h3 class="font-heading text-2xl">${esc(s.title)}</h3><p class="mt-2 text-muted">${esc(s.text)}</p></div>
        </li>`,
          )
          .join('')}
      </ul>
    </div>
  </section>

  <section id="ueber-uns" aria-labelledby="ueber-titel" class="bg-primary py-16 text-on-primary md:py-20">
    <div class="mx-auto max-w-3xl px-4 text-center">
      <h2 id="ueber-titel" class="font-heading text-4xl">Über uns</h2>
      <div class="mt-6 space-y-4 text-lg leading-relaxed opacity-95">${p.about()}</div>
    </div>
  </section>

  <section id="oeffnungszeiten" aria-labelledby="zeiten-titel" class="py-16">
    <div class="mx-auto grid max-w-5xl gap-10 px-4 md:grid-cols-2">
      <div>
        <h2 id="zeiten-titel" class="font-heading text-3xl">Öffnungszeiten</h2>
        <div class="mt-5">${p.hoursList()}</div>
      </div>
      <div>
        <h2 class="font-heading text-3xl">Anfahrt</h2>
        <p class="mt-5 text-lg">${p.addressLines}</p>
        ${p.phoneLabel ? `<p class="mt-3"><a class="underline underline-offset-4" href="${esc(p.callHref)}">${esc(p.phoneLabel)}</a></p>` : ''}
        <a class="mt-6 inline-flex min-h-11 items-center rounded-full border border-primary px-5 py-2 text-sm font-semibold uppercase tracking-widest text-primary" href="${esc(p.mapsHref)}" rel="noopener" target="_blank">Route planen<span class="sr-only"> (OpenStreetMap, neuer Tab)</span></a>
      </div>
    </div>
  </section>

  ${p.industrySections({
    sectionClass: 'bg-surface-alt py-16',
    cardClass: 'rounded-2xl bg-surface p-6 ring-1 ring-line',
    titleClass: 'font-heading text-4xl',
    buttonClass:
      'inline-flex min-h-12 items-center rounded-full bg-primary px-7 py-3 text-sm font-semibold uppercase tracking-widest text-on-primary disabled:opacity-60',
    inputClass: 'block w-full rounded-lg border border-line bg-surface px-3 py-2.5 focus:outline-2 focus:outline-primary',
    altSectionClass: 'py-16',
  })}
  ${p.gallery()}
  ${p.contactSection({
    sectionClass: 'bg-surface-alt py-16',
    cardClass: 'rounded-2xl bg-surface p-6 ring-1 ring-line',
    titleClass: 'font-heading text-4xl',
    buttonClass:
      'inline-flex min-h-12 items-center rounded-full bg-primary px-7 py-3 text-sm font-semibold uppercase tracking-widest text-on-primary disabled:opacity-60',
    inputClass: 'block w-full rounded-lg border border-line bg-surface px-3 py-2.5 focus:outline-2 focus:outline-primary',
  })}

  <section aria-labelledby="faq-titel" class="py-16">
    <div class="mx-auto max-w-3xl px-4">
      <h2 id="faq-titel" class="text-center font-heading text-4xl">Gut zu wissen</h2>
      <div class="mt-8 divide-y divide-line border-y border-line">${p.faqList({
        itemClass: 'py-5',
        summaryClass: 'cursor-pointer font-heading text-xl',
        answerClass: 'mt-3 text-muted',
      })}</div>
    </div>
  </section>
</main>
${p.footer({ className: 'bg-primary-dark text-on-primary', linkClass: 'underline underline-offset-4' })}`;
    return documentShell(p, 'bg-surface font-body text-ink antialiased', body);
  },
};
