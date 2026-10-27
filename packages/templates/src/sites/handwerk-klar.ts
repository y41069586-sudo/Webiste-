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
  description: 'Hell, viel Weißraum, Leistungen mit Bild, Ablauf und gebündeltem Kontakt',
  palettes: ['werkblau', 'anthrazit', 'waldgruen'],
  render({ parts: p, content: c, facts: f }) {
    const ph = p.photos(4);
    const contact = p.draft ? '#oeffnungszeiten' : '#frage';
    const body = `
<header class="border-b border-line bg-surface">
  <div class="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
    <a href="#inhalt" class="flex items-center gap-2 text-lg font-bold">${p.brand()}</a>
    <nav aria-label="Hauptnavigation" class="hidden md:block"><ul class="flex gap-6 text-sm text-muted">
      <li><a class="hover:text-ink" href="#leistungen">Leistungen</a></li>
      ${p.draft && p.industry === 'handwerk' ? '<li><a class="hover:text-ink" href="#ablauf">Ablauf</a></li>' : ''}
      <li><a class="hover:text-ink" href="#ueber-uns">Über uns</a></li>
      <li><a class="hover:text-ink" href="#oeffnungszeiten">Kontakt &amp; Anfahrt</a></li>
    </ul></nav>
    ${
      p.callHref
        ? `<a href="${esc(p.callHref)}" class="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-on-primary">${icon('phone', 'h-4 w-4')}<span>Anrufen</span></a>`
        : `<a href="${contact}" class="inline-flex min-h-11 items-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-on-primary">Anfrage</a>`
    }
  </div>
</header>
<main id="inhalt">
  <section class="sw-premium-hero sw-editorial">
    <div class="sw-hero-heading"><p class="sw-kicker">${esc(f.branchLabel)} · ${esc(f.city)}</p><h1>${esc(c.hero_headline)}</h1><div class="sw-hero-intro"><p>${esc(c.hero_subline)}</p><div class="sw-hero-actions"><a class="sw-hero-button" href="${esc(p.ctaHref)}">${esc(c.cta_text)} <span aria-hidden="true">→</span></a>${p.callHref ? `<a class="sw-hero-secondary" href="${esc(p.callHref)}">${icon('phone', 'h-4 w-4')}<span>${esc(p.phoneLabel)}</span></a>` : ''}</div>${p.trustChips()}</div></div>
    <div class="sw-editorial-media">${localProfile({ facts: f, parts: p, content: c }, 'workshop')}</div>
  </section>

  <section id="leistungen" aria-labelledby="leistungen-titel" class="border-y border-line bg-surface-alt py-16 md:py-20">
    <div class="mx-auto grid max-w-6xl items-center gap-10 px-4 ${ph[2] ? 'md:grid-cols-2' : ''}">
      <div>
        <h2 id="leistungen-titel" class="font-heading text-3xl font-bold md:text-4xl">Leistungen</h2>
        ${p.servicesNote('mt-2 text-sm text-muted')}
        <ul class="mt-8 grid gap-5 ${ph[2] ? '' : 'md:grid-cols-2'}">
          ${c.services
            .map(
              (s) => `<li class="sw-service-card flex gap-4 rounded-2xl bg-surface p-5 ring-1 ring-line">
            <span class="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary">${icon(s.icon, 'h-5 w-5')}</span>
            <div><h3 class="text-lg font-semibold">${esc(s.title)}</h3><p class="mt-1 text-muted">${esc(s.text)}</p></div>
          </li>`,
            )
            .join('')}
        </ul>
        <a class="mt-8 inline-flex min-h-11 items-center gap-2 font-semibold text-primary underline underline-offset-4" href="${esc(p.ctaHref)}">Ihr Vorhaben anfragen <span aria-hidden="true">→</span></a>
      </div>
      ${ph[2] ? p.figure(ph[2], 'sw-feature-img w-full object-cover', 'sw-feature-figure') : ''}
    </div>
  </section>

  ${p.process({ sectionClass: 'py-16 md:py-20', titleClass: 'font-heading text-3xl font-bold md:text-4xl', cardClass: 'rounded-2xl bg-surface-alt p-6 ring-1 ring-line' })}

  <section id="ueber-uns" aria-labelledby="ueber-titel" class="${p.draft && p.industry === 'handwerk' ? 'border-t border-line bg-surface-alt' : ''} py-16 md:py-20">
    <div class="mx-auto grid max-w-6xl items-center gap-10 px-4 ${ph[3] ? 'md:grid-cols-2' : 'max-w-3xl'}">
      ${ph[3] ? p.figure(ph[3], 'sw-feature-img w-full object-cover', 'sw-feature-figure') : ''}
      <div>
        <h2 id="ueber-titel" class="font-heading text-3xl font-bold md:text-4xl">Über uns</h2>
        <div class="mt-5 space-y-4 text-lg leading-relaxed text-ink">${p.about()}</div>
      </div>
    </div>
  </section>

  ${p.contactHub({
    sectionClass: 'border-t border-line py-16 md:py-20',
    titleClass: 'font-heading text-3xl font-bold md:text-4xl',
    cardClass: 'rounded-2xl bg-surface-alt p-6 ring-1 ring-line',
    buttonClass: 'inline-flex min-h-12 items-center gap-2 rounded-full bg-primary px-6 py-3 font-semibold text-on-primary',
    secondaryButtonClass:
      'inline-flex min-h-11 items-center rounded-full px-5 py-2 font-semibold text-primary ring-2 ring-primary',
  })}

  ${p.industrySections({
    sectionClass: 'py-16',
    cardClass: 'rounded-2xl bg-surface-alt p-6 ring-1 ring-line',
    titleClass: 'font-heading text-3xl font-bold',
    buttonClass:
      'inline-flex min-h-12 items-center rounded-full bg-primary px-6 py-3 font-semibold text-on-primary disabled:opacity-60',
    inputClass: 'block w-full rounded-lg border border-line bg-surface px-3 py-2.5 focus:outline-2 focus:outline-primary',
    altSectionClass: 'bg-surface-alt py-16',
    inHub: true,
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

  <section aria-labelledby="faq-titel" class="border-t border-line bg-surface-alt py-16 md:py-20">
    <div class="mx-auto max-w-3xl px-4">
      <h2 id="faq-titel" class="font-heading text-3xl font-bold md:text-4xl">Fragen &amp; Antworten</h2>
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
