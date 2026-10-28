import { esc } from '../html';
import { icon } from '../icons';
import { localProfile } from '../partials/local-profile';
import { documentShell } from '../partials/shared';
import type { TemplateDef } from '../types';

/** Beauty 2: weich, abgerundete Karten, organische Formen. */
export const beautySoft: TemplateDef = {
  id: 'beauty-soft',
  group: 'beauty',
  name: 'Sanft',
  description: 'Abgerundete Karten, Pastellflächen, organische Formen',
  palettes: ['salbei', 'rose', 'noir'],
  render({ parts: p, content: c, facts: f }) {
    const body = `
<header class="bg-surface">
  <div class="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-5">
    <a href="#inhalt" class="font-heading text-xl font-semibold">${p.brand()}</a>
    <a href="${esc(p.ctaHref)}" class="inline-flex min-h-11 items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-on-accent">${icon(p.callHref ? 'phone' : 'calendar', 'h-4 w-4')}Termin</a>
  </div>
</header>
<main id="inhalt">
  <section class="px-4 pb-12">
    <div class="mx-auto grid max-w-6xl items-center gap-10 rounded-[2.5rem] bg-surface-alt px-6 py-12 md:grid-cols-2 md:px-12 md:py-16">
      <div>
        ${p.heroName()}
        <p class="inline-flex rounded-full bg-surface px-3 py-1 text-sm text-muted">${esc(f.branchLabel)} in ${esc(f.city)}</p>
        <h1 class="mt-4 font-heading text-4xl font-semibold leading-tight md:text-5xl">${esc(c.hero_headline)}</h1>
        <p class="mt-5 text-lg text-muted">${esc(c.hero_subline)}</p>
        <div class="mt-8 flex flex-wrap gap-3">
          <a href="${esc(p.ctaHref)}" class="inline-flex min-h-12 items-center rounded-full bg-primary px-6 py-3 font-semibold text-on-primary">${esc(c.cta_text)}</a>
          ${p.callHref ? `<a href="${esc(p.callHref)}" class="inline-flex min-h-12 items-center gap-2 rounded-full bg-surface px-6 py-3 font-semibold text-ink ring-1 ring-line">${icon('phone', 'h-4 w-4')}${esc(p.phoneLabel)}</a>` : '<a href="#leistungen" class="inline-flex min-h-12 items-center rounded-full bg-surface px-6 py-3 font-semibold text-ink ring-1 ring-line">Angebot ansehen</a>'}
        </div>
        ${p.trustChips()}
      </div>
      <div>${localProfile({ facts: f, parts: p, content: c }, 'studio')}</div>
    </div>
  </section>

  <section id="leistungen" aria-labelledby="leistungen-titel" class="py-12">
    <div class="mx-auto max-w-6xl px-4">
      <h2 id="leistungen-titel" class="font-heading text-3xl font-semibold">Unser Angebot</h2>
      ${p.servicesNote('mt-2 text-sm text-muted')}
      <ul class="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        ${c.services
          .map(
            (s) => `<li class="rounded-3xl bg-surface-alt p-6">
          <span class="inline-flex h-14 w-14 items-center justify-center rounded-full bg-surface text-primary">${icon(s.icon, 'h-7 w-7')}</span>
          <h3 class="mt-4 text-lg font-semibold">${esc(s.title)}</h3>
          <p class="mt-2 text-muted">${esc(s.text)}</p>
        </li>`,
          )
          .join('')}
      </ul>
    </div>
  ${p.exampleServices()}
  </section>

  ${p.process({ sectionClass: 'py-12', titleClass: 'font-heading text-3xl font-semibold', cardClass: 'rounded-3xl bg-surface-alt p-6' })}

  <section id="ueber-uns" aria-labelledby="ueber-titel" class="py-12">
    <div class="mx-auto max-w-6xl px-4">
      <div class="rounded-[2.5rem] bg-primary px-6 py-12 text-on-primary md:px-12">
        <h2 id="ueber-titel" class="font-heading text-3xl font-semibold">Schön, dass Sie da sind</h2>
        <div class="mt-5 max-w-3xl space-y-4 text-lg leading-relaxed">${p.about()}</div>
      </div>
    </div>
  </section>

  ${p.contactHub({
    sectionClass: 'py-12',
    titleClass: 'font-heading text-3xl font-semibold',
    cardClass: 'rounded-3xl bg-surface-alt p-6',
    buttonClass: 'inline-flex min-h-12 items-center gap-2 rounded-full bg-primary px-6 py-3 font-semibold text-on-primary',
    secondaryButtonClass:
      'inline-flex min-h-11 items-center rounded-full bg-surface px-5 py-2 font-semibold text-primary ring-1 ring-line',
  })}

  ${p.industrySections({
    sectionClass: 'py-12',
    cardClass: 'rounded-3xl bg-surface-alt p-6',
    titleClass: 'font-heading text-3xl font-semibold',
    buttonClass:
      'inline-flex min-h-12 items-center rounded-full bg-primary px-6 py-3 font-semibold text-on-primary disabled:opacity-60',
    inputClass: 'block w-full rounded-2xl border border-line bg-surface px-4 py-2.5 focus:outline-2 focus:outline-primary',
    altSectionClass: 'bg-surface-alt py-16',
    inHub: true,
  })}
  ${p.gallery()}
  ${p.contactSection({
    sectionClass: 'py-12',
    cardClass: 'rounded-3xl bg-surface-alt p-6',
    titleClass: 'font-heading text-3xl font-semibold',
    buttonClass:
      'inline-flex min-h-12 items-center rounded-full bg-primary px-6 py-3 font-semibold text-on-primary disabled:opacity-60',
    inputClass: 'block w-full rounded-2xl border border-line bg-surface px-4 py-2.5 focus:outline-2 focus:outline-primary',
  })}

  <section aria-labelledby="faq-titel" class="py-12">
    <div class="mx-auto max-w-3xl px-4">
      <h2 id="faq-titel" class="font-heading text-3xl font-semibold">Häufige Fragen</h2>
      <div class="mt-6 space-y-3">${p.faqList({
        itemClass: 'rounded-3xl bg-surface-alt px-5 py-4',
        summaryClass: 'cursor-pointer font-semibold',
        answerClass: 'mt-2 text-muted',
      })}</div>
    </div>
  </section>
</main>
${p.footer({ className: 'mt-12 bg-surface-alt text-ink', linkClass: 'underline underline-offset-4' })}`;
    return documentShell(p, 'bg-surface font-body text-ink antialiased', body);
  },
};
