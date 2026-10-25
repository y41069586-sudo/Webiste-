import { esc } from '../html';
import { icon } from '../icons';
import { localProfile } from '../partials/local-profile';
import { documentShell } from '../partials/shared';
import type { TemplateDef } from '../types';

/** Handwerk 2: hell und aufgeräumt, geteilter Hero, Leistungen als Liste. */
export const handwerkKlar: TemplateDef = {
  id: 'handwerk-klar',
  group: 'handwerk',
  name: 'Klar',
  description: 'Hell, viel Weißraum, Leistungen als zweispaltige Liste',
  palettes: ['werkblau', 'anthrazit', 'waldgruen'],
  render({ parts: p, content: c, facts: f }) {
    const body = `
<header class="border-b border-line bg-surface">
  <div class="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
    <a href="#inhalt" class="flex items-center gap-2 text-lg font-bold"><span class="inline-flex h-9 w-9 items-center justify-center rounded-md bg-primary text-on-primary">${icon(c.services[0]?.icon ?? 'house', 'h-5 w-5')}</span>${p.brand()}</a>
    <nav aria-label="Hauptnavigation" class="hidden md:block"><ul class="flex gap-6 text-sm text-muted">
      <li><a class="hover:text-ink" href="#leistungen">Leistungen</a></li>
      <li><a class="hover:text-ink" href="#ueber-uns">Über uns</a></li>
      <li><a class="hover:text-ink" href="#oeffnungszeiten">Öffnungszeiten</a></li>
      <li><a class="hover:text-ink" href="#frage">Kontakt</a></li>
    </ul></nav>
    <a href="#frage" class="inline-flex min-h-11 items-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-on-primary">Anfrage</a>
  </div>
</header>
<main id="inhalt">
  <section class="py-14 md:py-20">
    <div class="mx-auto grid max-w-6xl items-center gap-12 px-4 md:grid-cols-5">
      <div class="md:col-span-3">
        <h1 class="font-heading text-4xl font-bold leading-tight text-ink md:text-5xl">${esc(c.hero_headline)}</h1>
        <p class="mt-5 max-w-2xl text-lg text-muted">${esc(c.hero_subline)}</p>
        <div class="mt-8 flex flex-wrap items-center gap-4">
          <a href="${esc(p.ctaHref)}" class="inline-flex min-h-12 items-center gap-2 rounded-full bg-primary px-6 py-3 font-semibold text-on-primary">${icon(p.callHref ? 'phone' : 'chat', 'h-5 w-5')}${esc(c.cta_text)}</a>
          ${p.phoneLabel ? `<span class="text-muted">oder direkt: <a class="font-semibold text-ink underline-offset-4 hover:underline" href="${esc(p.callHref)}">${esc(p.phoneLabel)}</a></span>` : ''}
        </div>
        <ul class="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
          <li class="flex items-center gap-2"><span class="text-primary">${icon('pin', 'h-4 w-4')}</span>${esc(f.city)}</li>
          <li class="flex items-center gap-2"><span class="text-primary">${icon('wrench', 'h-4 w-4')}</span>${esc(f.branchLabel)}</li>
        </ul>
      </div>
      <div class="md:col-span-2">${localProfile({ facts: f, parts: p, content: c }, 'workshop')}</div>
    </div>
  </section>

  <section id="leistungen" aria-labelledby="leistungen-titel" class="border-y border-line bg-surface-alt py-16">
    <div class="mx-auto max-w-6xl px-4">
      <h2 id="leistungen-titel" class="font-heading text-3xl font-bold">Leistungen</h2>
      ${p.servicesNote('mt-2 text-sm text-muted')}
      <ul class="mt-8 grid gap-x-10 gap-y-8 md:grid-cols-2">
        ${c.services
          .map(
            (s) => `<li class="flex gap-4">
          <span class="mt-1 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface text-primary ring-1 ring-line">${icon(s.icon, 'h-5 w-5')}</span>
          <div><h3 class="text-lg font-semibold">${esc(s.title)}</h3><p class="mt-1 text-muted">${esc(s.text)}</p></div>
        </li>`,
          )
          .join('')}
      </ul>
    </div>
  </section>

  <section id="ueber-uns" aria-labelledby="ueber-titel" class="py-16">
    <div class="mx-auto max-w-3xl px-4">
      <h2 id="ueber-titel" class="font-heading text-3xl font-bold">Über uns</h2>
      <div class="mt-5 space-y-4 text-lg leading-relaxed text-ink">${p.about()}</div>
    </div>
  </section>

  <section id="oeffnungszeiten" aria-labelledby="zeiten-titel" class="bg-surface-alt py-16">
    <div class="mx-auto grid max-w-6xl gap-10 px-4 md:grid-cols-2">
      <div>
        <h2 id="zeiten-titel" class="font-heading text-2xl font-bold">Öffnungszeiten</h2>
        <div class="mt-4 rounded-xl bg-surface p-5 ring-1 ring-line">${p.hoursList()}</div>
      </div>
      <div>
        <h2 class="font-heading text-2xl font-bold">So finden Sie uns</h2>
        <div class="mt-4 rounded-xl bg-surface p-5 ring-1 ring-line">
          <p class="flex items-start gap-3 text-lg"><span class="mt-1 text-primary">${icon('pin', 'h-5 w-5')}</span><span>${p.addressLines}</span></p>
          <a class="mt-5 inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-4" href="${esc(p.mapsHref)}" rel="noopener" target="_blank">Route bei OpenStreetMap planen<span class="sr-only"> (neuer Tab)</span></a>
        </div>
      </div>
    </div>
  </section>

  ${p.industrySections({
    sectionClass: 'py-16',
    cardClass: 'rounded-2xl bg-surface-alt p-6 ring-1 ring-line',
    titleClass: 'font-heading text-3xl font-bold',
    buttonClass:
      'inline-flex min-h-12 items-center rounded-full bg-primary px-6 py-3 font-semibold text-on-primary disabled:opacity-60',
    inputClass: 'block w-full rounded-lg border border-line bg-surface px-3 py-2.5 focus:outline-2 focus:outline-primary',
    altSectionClass: 'bg-surface-alt py-16',
  })}
  ${p.gallery()}
  ${p.contactSection({
    sectionClass: 'py-16',
    cardClass: 'rounded-2xl bg-surface-alt p-6 ring-1 ring-line',
    titleClass: 'font-heading text-3xl font-bold',
    buttonClass:
      'inline-flex min-h-12 items-center rounded-full bg-primary px-6 py-3 font-semibold text-on-primary disabled:opacity-60',
    inputClass: 'block w-full rounded-lg border border-line bg-surface px-3 py-2.5 focus:outline-2 focus:outline-primary',
  })}

  <section aria-labelledby="faq-titel" class="border-t border-line py-16">
    <div class="mx-auto max-w-3xl px-4">
      <h2 id="faq-titel" class="font-heading text-3xl font-bold">Fragen &amp; Antworten</h2>
      <div class="mt-6 divide-y divide-line">${p.faqList({
        itemClass: 'py-4',
        summaryClass: 'cursor-pointer text-lg font-semibold',
        answerClass: 'mt-2 text-muted',
      })}</div>
    </div>
  </section>
</main>
${p.footer({ className: 'border-t border-line bg-surface-alt text-ink', linkClass: 'underline underline-offset-4' })}`;
    return documentShell(p, 'bg-surface font-body text-ink antialiased', body);
  },
};
