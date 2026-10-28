import { esc } from '../html';
import { icon } from '../icons';
import { localProfile } from '../partials/local-profile';
import { documentShell } from '../partials/shared';
import type { TemplateDef } from '../types';

/** Beauty 3: modern, große Typografie, asymmetrisch, Akzentstreifen. */
export const beautyModern: TemplateDef = {
  id: 'beauty-modern',
  group: 'beauty',
  name: 'Modern',
  description: 'Große Typografie, asymmetrische Flächen, horizontale Karten',
  palettes: ['noir', 'rose', 'salbei'],
  render({ parts: p, content: c, facts: f }) {
    const body = `
<header class="bg-surface">
  <div class="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-5">
    <a href="#inhalt" class="text-lg font-bold uppercase tracking-[0.2em]">${p.brand()}</a>
    <nav aria-label="Hauptnavigation" class="hidden md:block"><ul class="flex gap-6 text-sm font-medium">
      <li><a class="hover:underline" href="#leistungen">Leistungen</a></li>
      <li><a class="hover:underline" href="#ueber-uns">Studio</a></li>
      <li><a class="hover:underline" href="#oeffnungszeiten">Zeiten</a></li>
      <li><a class="hover:underline" href="${p.draft ? '#oeffnungszeiten' : '#frage'}">Kontakt</a></li>
    </ul></nav>
  </div>
</header>
<main id="inhalt">
  <section class="sw-premium-hero sw-beauty-graphic">
    <div class="sw-graphic-title">${p.heroName()}<p class="sw-kicker">${esc(f.branchLabel)} · ${esc(f.city)}</p><h1>${esc(c.hero_headline)}</h1><div><p class="sw-hero-copy">${esc(c.hero_subline)}</p>${p.heroActions(c.cta_text)}</div></div>
    <div class="sw-graphic-media">${localProfile({ facts: f, parts: p, content: c }, 'studio')}</div>
  </section>

  <section id="leistungen" aria-labelledby="leistungen-titel" class="bg-surface-alt py-16">
    <div class="mx-auto max-w-6xl px-4">
      <div class="flex flex-wrap items-end justify-between gap-2">
        <h2 id="leistungen-titel" class="font-heading text-4xl">Leistungen</h2>
        ${p.servicesNote()}
      </div>
      <ul class="mt-8 space-y-4">
        ${c.services
          .map(
            (s, i) => `<li class="grid items-center gap-4 bg-surface p-5 ring-1 ring-line md:grid-cols-[4rem_1fr_3rem]">
          <span class="font-heading text-3xl text-primary" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span>
          <div><h3 class="text-xl font-semibold">${esc(s.title)}</h3><p class="mt-1 text-muted">${esc(s.text)}</p></div>
          <span class="hidden text-primary md:block">${icon(s.icon, 'h-8 w-8')}</span>
        </li>`,
          )
          .join('')}
      </ul>
    </div>
  ${p.exampleServices()}
  </section>

  ${p.process({ sectionClass: 'py-16', titleClass: 'font-heading text-4xl', cardClass: 'bg-surface-alt p-6 ring-1 ring-line' })}

  <section id="ueber-uns" aria-labelledby="ueber-titel" class="py-16">
    <div class="mx-auto grid max-w-6xl gap-10 px-4 md:grid-cols-3">
      <h2 id="ueber-titel" class="font-heading text-4xl">Das Studio</h2>
      <div class="space-y-4 text-lg leading-relaxed md:col-span-2">${p.about()}</div>
    </div>
  </section>

  ${p.contactHub({
    sectionClass: 'bg-surface-alt py-16',
    titleClass: 'font-heading text-4xl',
    cardClass: 'bg-surface p-6 ring-1 ring-line',
    buttonClass: 'inline-flex min-h-12 items-center gap-2 bg-primary px-6 py-3 font-semibold text-on-primary',
    secondaryButtonClass: 'inline-flex min-h-11 items-center px-5 py-2 font-semibold text-primary ring-2 ring-primary',
  })}

  ${p.industrySections({
    sectionClass: 'py-16',
    cardClass: 'bg-surface-alt p-6 ring-1 ring-line',
    titleClass: 'font-heading text-4xl',
    buttonClass: 'inline-flex min-h-12 items-center bg-primary px-7 py-3 font-semibold text-on-primary disabled:opacity-60',
    inputClass: 'block w-full border border-line bg-surface px-3 py-2.5 focus:outline-2 focus:outline-primary',
    altSectionClass: 'bg-surface-alt py-16',
    inHub: true,
  })}
  ${p.gallery()}
  ${p.contactSection({
    sectionClass: 'py-16',
    cardClass: 'bg-surface-alt p-6 ring-1 ring-line',
    titleClass: 'font-heading text-4xl',
    buttonClass: 'inline-flex min-h-12 items-center bg-primary px-7 py-3 font-semibold text-on-primary disabled:opacity-60',
    inputClass: 'block w-full border border-line bg-surface px-3 py-2.5 focus:outline-2 focus:outline-primary',
  })}

  <section aria-labelledby="faq-titel" class="bg-surface-alt py-16">
    <div class="mx-auto max-w-3xl px-4">
      <h2 id="faq-titel" class="font-heading text-4xl">FAQ</h2>
      <div class="mt-6 space-y-2">${p.faqList({
        itemClass: 'bg-surface p-5 ring-1 ring-line',
        summaryClass: 'cursor-pointer text-lg font-semibold',
        answerClass: 'mt-2 text-muted',
      })}</div>
    </div>
  </section>
</main>
${p.footer({ className: 'bg-primary-dark text-on-primary', linkClass: 'underline underline-offset-4' })}`;
    return documentShell(p, 'bg-surface font-body text-ink antialiased', body);
  },
};
