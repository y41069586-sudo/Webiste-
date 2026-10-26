import { esc } from '../html';
import { icon } from '../icons';
import { localProfile } from '../partials/local-profile';
import { documentShell } from '../partials/shared';
import type { TemplateDef } from '../types';

/** Handwerk 3: dunkles Kopfband, Karten mit Akzentkante, mobiler Anruf-Button. */
export const handwerkWerkstatt: TemplateDef = {
  id: 'handwerk-werkstatt',
  group: 'handwerk',
  name: 'Werkstatt',
  description: 'Dunkles Kopfband, Akzentkanten, fester Anruf-Button auf dem Handy',
  palettes: ['anthrazit', 'werkblau', 'waldgruen'],
  render({ parts: p, content: c, facts: f }) {
    const body = `
<header class="bg-primary-dark text-on-primary">
  <div class="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
    <a href="#inhalt" class="font-heading text-lg font-bold uppercase tracking-wide">${p.brand()}</a>
    ${p.phoneLabel ? `<a href="${esc(p.callHref)}" class="hidden items-center gap-2 text-sm font-semibold md:inline-flex">${icon('phone', 'h-4 w-4')}${esc(p.phoneLabel)}</a>` : ''}
  </div>
</header>
<main id="inhalt">
  <section class="sw-premium-hero sw-workshop">
    <div class="sw-workshop-title"><div><p class="sw-kicker">${esc(f.branchLabel)} · ${esc(f.city)}</p><h1>${esc(c.hero_headline)}</h1></div><div><p class="sw-hero-copy">${esc(c.hero_subline)}</p><a class="sw-hero-button" href="${esc(p.ctaHref)}">${esc(c.cta_text)} <span aria-hidden="true">→</span></a></div></div>
    <div class="sw-workshop-media">${localProfile({ facts: f, parts: p, content: c }, 'workshop')}</div>
  </section>

  <section id="leistungen" aria-labelledby="leistungen-titel" class="py-16">
    <div class="mx-auto max-w-6xl px-4">
      <h2 id="leistungen-titel" class="font-heading text-3xl font-black uppercase tracking-wide">Was wir für Sie tun</h2>
      ${p.servicesNote('mt-2 text-sm text-muted')}
      <ul class="mt-8 grid gap-5 md:grid-cols-2">
        ${c.services
          .map(
            (s) => `<li class="flex gap-4 border-l-4 border-accent bg-surface-alt p-5">
          <span class="text-primary">${icon(s.icon, 'h-8 w-8')}</span>
          <div><h3 class="text-lg font-bold">${esc(s.title)}</h3><p class="mt-1 text-muted">${esc(s.text)}</p></div>
        </li>`,
          )
          .join('')}
      </ul>
    </div>
  </section>

  <section id="ueber-uns" aria-labelledby="ueber-titel" class="bg-surface-alt py-16">
    <div class="mx-auto grid max-w-6xl gap-10 px-4 md:grid-cols-2">
      <div>
        <h2 id="ueber-titel" class="font-heading text-3xl font-black uppercase tracking-wide">Über uns</h2>
        <div class="mt-5 space-y-4 text-lg leading-relaxed">${p.about()}</div>
      </div>
      <div id="oeffnungszeiten" class="bg-surface p-6 shadow-sm">
        <h2 class="flex items-center gap-2 font-heading text-xl font-bold uppercase"><span class="text-primary">${icon('clock', 'h-5 w-5')}</span>Öffnungszeiten</h2>
        <div class="mt-3">${p.hoursList()}</div>
        <h2 class="mt-8 flex items-center gap-2 font-heading text-xl font-bold uppercase"><span class="text-primary">${icon('pin', 'h-5 w-5')}</span>Anfahrt</h2>
        <p class="mt-3">${p.addressLines}</p>
        <a class="mt-4 inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-4" href="${esc(p.mapsHref)}" rel="noopener" target="_blank">Route planen<span class="sr-only"> (OpenStreetMap, neuer Tab)</span></a>
      </div>
    </div>
  </section>

  ${p.industrySections({
    sectionClass: 'py-16',
    cardClass: 'border-t-4 border-primary bg-surface-alt p-6',
    titleClass: 'font-heading text-3xl font-black uppercase tracking-wide',
    buttonClass:
      'inline-flex min-h-12 items-center bg-primary px-6 py-3 font-bold uppercase tracking-wide text-on-primary disabled:opacity-60',
    inputClass: 'block w-full border border-line bg-surface px-3 py-2.5 focus:outline-2 focus:outline-primary',
    altSectionClass: 'bg-surface-alt py-16',
  })}
  ${p.gallery()}
  ${p.contactSection({
    sectionClass: 'py-16',
    cardClass: 'border-t-4 border-primary bg-surface-alt p-6',
    titleClass: 'font-heading text-3xl font-black uppercase tracking-wide',
    buttonClass:
      'inline-flex min-h-12 items-center bg-primary px-6 py-3 font-bold uppercase tracking-wide text-on-primary disabled:opacity-60',
    inputClass: 'block w-full border border-line bg-surface px-3 py-2.5 focus:outline-2 focus:outline-primary',
  })}

  <section aria-labelledby="faq-titel" class="bg-surface-alt py-16">
    <div class="mx-auto max-w-3xl px-4">
      <h2 id="faq-titel" class="font-heading text-3xl font-black uppercase tracking-wide">Häufige Fragen</h2>
      <div class="mt-6 space-y-3">${p.faqList({
        itemClass: 'bg-surface p-4',
        summaryClass: 'cursor-pointer font-bold',
        answerClass: 'mt-2 text-muted',
      })}</div>
    </div>
  </section>
</main>
${p.callHref && !p.draft ? `<a href="${esc(p.callHref)}" class="fixed inset-x-4 bottom-4 z-40 flex min-h-12 items-center justify-center gap-2 bg-accent font-bold uppercase tracking-wide text-on-accent shadow-lg md:hidden">${icon('phone', 'h-5 w-5')}Jetzt anrufen</a>` : ''}
${p.footer({ className: `bg-primary-dark text-on-primary ${p.callHref ? 'pb-20 md:pb-0' : ''}`, linkClass: 'underline underline-offset-4' })}`;
    return documentShell(p, 'bg-surface font-body text-ink antialiased', body);
  },
};
