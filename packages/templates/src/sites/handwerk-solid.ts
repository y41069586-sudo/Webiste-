import { esc } from '../html';
import { icon } from '../icons';
import { localProfile } from '../partials/local-profile';
import { documentShell } from '../partials/shared';
import type { TemplateDef } from '../types';

/** Handwerk 1: kräftiger Hero in Hauptfarbe, Karten-Raster für Leistungen. */
export const handwerkSolid: TemplateDef = {
  id: 'handwerk-solid',
  group: 'handwerk',
  name: 'Solide',
  description: 'Kräftige Farbfläche, klare Karten, großer Anruf-Button',
  palettes: ['werkblau', 'anthrazit', 'waldgruen'],
  render({ parts: p, content: c, facts: f }) {
    const ph = p.photos(3);
    const body = `
<header class="bg-primary text-on-primary">
  <div class="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
    <a href="#inhalt" class="text-lg font-bold tracking-tight">${p.brand()}</a>
    <nav aria-label="Hauptnavigation" class="hidden md:block"><ul class="flex gap-6 text-sm font-medium">
      <li><a class="hover:underline" href="#leistungen">Leistungen</a></li>
      ${p.draft && p.industry === 'handwerk' ? '<li><a class="hover:underline" href="#ablauf">Ablauf</a></li>' : ''}
      <li><a class="hover:underline" href="#ueber-uns">Über uns</a></li>
      <li><a class="hover:underline" href="#oeffnungszeiten">Kontakt &amp; Anfahrt</a></li>
    </ul></nav>
    ${p.callHref ? `<a href="${esc(p.callHref)}" class="inline-flex min-h-11 items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-on-accent">${icon('phone', 'h-4 w-4')}<span>Anrufen</span></a>` : ''}
  </div>
</header>
<main id="inhalt">
  <section class="sw-premium-hero sw-business">
    <div class="sw-business-title">${c.hero_headline === f.name ? '' : `<p class="sw-hero-name">${esc(f.name)}</p>`}<p class="sw-kicker">${esc(f.branchLabel)} in ${esc(f.city)}</p><h1>${esc(c.hero_headline)}</h1><p class="sw-hero-copy">${esc(c.hero_subline)}</p><div class="sw-hero-actions"><a class="sw-hero-button" href="${esc(p.ctaHref)}">${esc(c.cta_text)} <span aria-hidden="true">→</span></a>${p.callHref ? `<a class="sw-hero-secondary" href="${esc(p.callHref)}">${icon('phone', 'h-4 w-4')}<span>${esc(p.phoneLabel)}</span></a>` : `<a class="sw-text-link" href="#leistungen">Leistungen ansehen</a>`}</div>${p.trustChips()}</div>
    <div class="sw-business-media">${localProfile({ facts: f, parts: p, content: c }, 'workshop')}</div>
  </section>

  <section id="leistungen" aria-labelledby="leistungen-titel" class="py-16 md:py-20">
    <div class="mx-auto max-w-6xl px-4">
      <div class="flex flex-wrap items-end justify-between gap-2">
        <h2 id="leistungen-titel" class="font-heading text-3xl font-bold md:text-4xl">Unsere Leistungen</h2>
        ${p.servicesNote()}
      </div>
      <div class="mt-8 grid items-stretch gap-6 ${ph[1] ? 'lg:grid-cols-5' : ''}">
        ${ph[1] ? p.figure(ph[1], 'sw-feature-img h-full w-full object-cover', 'sw-feature-figure lg:col-span-2') : ''}
        <ul class="grid content-start gap-5 ${ph[1] ? 'lg:col-span-3' : 'sm:grid-cols-2 lg:grid-cols-3'}">
          ${c.services
            .map(
              (s) => `<li class="sw-service-card rounded-2xl border border-line bg-surface p-6 shadow-sm">
            <span class="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-on-primary">${icon(s.icon, 'h-6 w-6')}</span>
            <h3 class="mt-4 text-xl font-semibold">${esc(s.title)}</h3>
            <p class="mt-2 text-muted">${esc(s.text)}</p>
          </li>`,
            )
            .join('')}
          <li class="rounded-2xl bg-primary p-6 text-on-primary">
            <p class="text-xl font-semibold">Ihr Vorhaben ist nicht dabei?</p>
            <p class="mt-2 opacity-90">Beschreiben Sie kurz, worum es geht – telefonisch oder per Nachricht.</p>
            <a class="mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg bg-surface px-5 py-2 font-semibold text-ink" href="${esc(p.ctaHref)}">${esc(c.cta_text)} <span aria-hidden="true">→</span></a>
          </li>
        </ul>
      </div>
    </div>
  ${p.exampleServices()}
  </section>

  ${p.process({ sectionClass: 'border-y border-line bg-surface-alt py-16 md:py-20', titleClass: 'font-heading text-3xl font-bold md:text-4xl', cardClass: 'rounded-2xl bg-surface p-6 shadow-sm ring-1 ring-line' })}

  <section id="ueber-uns" aria-labelledby="ueber-titel" class="py-16 md:py-20">
    <div class="mx-auto grid max-w-6xl items-center gap-10 px-4 md:grid-cols-5">
      <div class="md:col-span-3">
        <h2 id="ueber-titel" class="font-heading text-3xl font-bold md:text-4xl">Über uns</h2>
        <div class="mt-4 space-y-4 text-lg leading-relaxed">${p.about()}</div>
      </div>
      ${
        ph[2]
          ? p.figure(ph[2], 'sw-feature-img w-full object-cover', 'sw-feature-figure md:col-span-2')
          : `<div class="rounded-2xl bg-primary p-6 text-on-primary md:col-span-2">
        <p class="text-sm uppercase tracking-widest opacity-90">Ihr Betrieb vor Ort</p>
        <p class="mt-2 text-xl font-semibold">${esc(f.name)}</p>
        <p class="mt-3">${p.addressLines}</p>
        ${p.phoneLabel ? `<p class="mt-4"><a class="font-semibold underline underline-offset-4" href="${esc(p.callHref)}">${esc(p.phoneLabel)}</a></p>` : ''}
      </div>`
      }
    </div>
  </section>

  ${p.contactHub({
    sectionClass: 'bg-surface-alt py-16 md:py-20',
    titleClass: 'font-heading text-3xl font-bold md:text-4xl',
    cardClass: 'rounded-2xl bg-surface p-6 shadow-sm ring-1 ring-line',
    buttonClass: 'inline-flex min-h-12 items-center gap-2 rounded-lg bg-primary px-6 py-3 font-semibold text-on-primary',
    secondaryButtonClass: 'inline-flex min-h-11 items-center rounded-lg px-5 py-2 font-semibold text-primary ring-2 ring-primary',
  })}

  ${p.industrySections({
    sectionClass: 'bg-surface-alt py-16',
    cardClass: 'rounded-2xl bg-surface p-6 shadow-sm ring-1 ring-line',
    titleClass: 'font-heading text-3xl font-bold',
    buttonClass:
      'inline-flex min-h-12 items-center rounded-lg bg-primary px-6 py-3 font-semibold text-on-primary disabled:opacity-60',
    inputClass:
      'block w-full rounded-lg border border-line bg-surface px-3 py-2.5 focus:border-primary focus:outline-2 focus:outline-primary',
    altSectionClass: 'py-16',
    inHub: true,
  })}
  ${p.gallery()}
  ${p.contactSection({
    sectionClass: 'bg-surface-alt py-16',
    cardClass: 'rounded-2xl bg-surface p-6 shadow-sm ring-1 ring-line',
    titleClass: 'font-heading text-3xl font-bold',
    buttonClass:
      'inline-flex min-h-12 items-center rounded-lg bg-primary px-6 py-3 font-semibold text-on-primary disabled:opacity-60',
    inputClass:
      'block w-full rounded-lg border border-line bg-surface px-3 py-2.5 focus:border-primary focus:outline-2 focus:outline-primary',
  })}

  <section aria-labelledby="faq-titel" class="py-16 md:py-20">
    <div class="mx-auto max-w-3xl px-4">
      <h2 id="faq-titel" class="font-heading text-3xl font-bold md:text-4xl">Häufige Fragen</h2>
      <div class="mt-6 space-y-3">${p.faqList({
        itemClass: 'group rounded-xl border border-line p-4',
        summaryClass: 'cursor-pointer list-none text-lg font-semibold marker:hidden',
        answerClass: 'mt-3 text-muted',
      })}</div>
    </div>
  </section>
</main>
${p.footer({ className: 'bg-primary-dark text-on-primary', linkClass: 'underline underline-offset-4' })}`;
    return documentShell(p, 'bg-surface font-body text-ink antialiased', body);
  },
};
