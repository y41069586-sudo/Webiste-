import { esc } from '../html';
import { icon } from '../icons';
import { blobArt } from '../partials/art';
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
    const firstIcon = c.services[0]?.icon ?? 'house';
    const body = `
<header class="bg-primary text-on-primary">
  <div class="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
    <a href="#inhalt" class="text-lg font-bold tracking-tight">${p.brand()}</a>
    <nav aria-label="Hauptnavigation" class="hidden md:block"><ul class="flex gap-6 text-sm font-medium">
      <li><a class="hover:underline" href="#leistungen">Leistungen</a></li>
      <li><a class="hover:underline" href="#ueber-uns">Über uns</a></li>
      <li><a class="hover:underline" href="#oeffnungszeiten">Öffnungszeiten</a></li>
      <li><a class="hover:underline" href="#frage">Kontakt</a></li>
    </ul></nav>
    ${p.callHref ? `<a href="${esc(p.callHref)}" class="inline-flex min-h-11 items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-on-accent">${icon('phone', 'h-4 w-4')}<span>Anrufen</span></a>` : ''}
  </div>
</header>
<main id="inhalt">
  <section class="bg-primary pb-16 pt-8 text-on-primary md:pb-24 md:pt-16">
    <div class="mx-auto grid max-w-6xl items-center gap-10 px-4 md:grid-cols-2">
      <div>
        <p class="text-sm font-semibold uppercase tracking-widest opacity-90">${esc(f.branchLabel)} in ${esc(f.city)}</p>
        <h1 class="mt-3 font-heading text-4xl font-extrabold leading-tight md:text-5xl">${esc(c.hero_headline)}</h1>
        <p class="mt-5 max-w-xl text-lg opacity-95">${esc(c.hero_subline)}</p>
        <div class="mt-8 flex flex-wrap gap-3">
          <a href="${esc(p.ctaHref)}" class="inline-flex min-h-12 items-center gap-2 rounded-lg bg-accent px-6 py-3 font-semibold text-on-accent shadow-sm">${icon(p.callHref ? 'phone' : 'chat', 'h-5 w-5')}${esc(c.cta_text)}</a>
          <a href="#frage" class="inline-flex min-h-12 items-center rounded-lg border-2 border-on-primary/70 px-6 py-3 font-semibold">Anfrage senden</a>
        </div>
      </div>
      <div class="hidden md:block">${blobArt(firstIcon)}</div>
    </div>
  </section>

  <section id="leistungen" aria-labelledby="leistungen-titel" class="-mt-10 pb-16 md:-mt-14">
    <div class="mx-auto max-w-6xl px-4">
      <div class="rounded-2xl bg-surface p-6 shadow-xl ring-1 ring-line md:p-10">
        <div class="flex flex-wrap items-end justify-between gap-2">
          <h2 id="leistungen-titel" class="font-heading text-3xl font-bold">Unsere Leistungen</h2>
          ${p.servicesNote()}
        </div>
        <ul class="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          ${c.services
            .map(
              (s) => `<li class="rounded-xl border border-line p-5">
            <span class="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-on-primary">${icon(s.icon)}</span>
            <h3 class="mt-4 text-lg font-semibold">${esc(s.title)}</h3>
            <p class="mt-2 text-muted">${esc(s.text)}</p>
          </li>`,
            )
            .join('')}
        </ul>
      </div>
    </div>
  </section>

  <section id="ueber-uns" aria-labelledby="ueber-titel" class="bg-surface-alt py-16">
    <div class="mx-auto grid max-w-6xl gap-10 px-4 md:grid-cols-3">
      <div class="md:col-span-2">
        <h2 id="ueber-titel" class="font-heading text-3xl font-bold">Über uns</h2>
        <div class="mt-4 space-y-4 text-lg leading-relaxed">${p.about()}</div>
      </div>
      <div class="rounded-xl bg-primary p-6 text-on-primary">
        <p class="text-sm uppercase tracking-widest opacity-90">Ihr Betrieb vor Ort</p>
        <p class="mt-2 text-xl font-semibold">${esc(f.name)}</p>
        <p class="mt-3">${p.addressLines}</p>
        ${p.phoneLabel ? `<p class="mt-4"><a class="font-semibold underline underline-offset-4" href="${esc(p.callHref)}">${esc(p.phoneLabel)}</a></p>` : ''}
      </div>
    </div>
  </section>

  <section id="oeffnungszeiten" aria-labelledby="zeiten-titel" class="py-16">
    <div class="mx-auto grid max-w-6xl gap-8 px-4 md:grid-cols-2">
      <div class="rounded-xl border border-line p-6">
        <h2 id="zeiten-titel" class="flex items-center gap-3 font-heading text-2xl font-bold"><span class="text-primary">${icon('clock')}</span>Öffnungszeiten</h2>
        <div class="mt-4">${p.hoursList()}</div>
      </div>
      <div class="rounded-xl border border-line p-6">
        <h2 class="flex items-center gap-3 font-heading text-2xl font-bold"><span class="text-primary">${icon('pin')}</span>Anfahrt</h2>
        <p class="mt-4 text-lg">${p.addressLines}</p>
        <a class="mt-6 inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-5 py-2 font-semibold text-on-primary" href="${esc(p.mapsHref)}" rel="noopener" target="_blank">Route planen<span class="sr-only"> (öffnet OpenStreetMap in neuem Tab)</span></a>
      </div>
    </div>
  </section>

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

  <section aria-labelledby="faq-titel" class="py-16">
    <div class="mx-auto max-w-3xl px-4">
      <h2 id="faq-titel" class="font-heading text-3xl font-bold">Häufige Fragen</h2>
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
