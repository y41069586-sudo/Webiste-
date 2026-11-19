// Generator: eine Datei pro Betrieb, Unterseiten als #/route (läuft als einzelne HTML-Datei).
import { writeFileSync, mkdirSync } from 'node:fs';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const ICON = {
  wrench: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/>',
  check: '<path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="9"/>',
  bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  truck: '<path d="M3 7h11v8H3zM14 10h4l3 3v2h-7"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>',
  shield: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z"/>',
  euro: '<path d="M17 6.5A7 7 0 1 0 17 17.5M4 10h10M4 14h10"/>',
  spray: '<path d="M9 9h6v12H9zM10 9V6h4v3M18 4h.01M20 6h.01M18 8h.01"/>',
  car: '<path d="M5 16V11l2-5h10l2 5v5M3 16h18v3H3z"/><circle cx="7.5" cy="16" r="1.5"/><circle cx="16.5" cy="16" r="1.5"/>',
  hand: '<path d="M7 11V5a1.5 1.5 0 0 1 3 0v5M10 10V4a1.5 1.5 0 0 1 3 0v6M13 10V5a1.5 1.5 0 0 1 3 0v6M16 11V8a1.5 1.5 0 0 1 3 0v6c0 4-3 7-7 7s-5-2-7-5l-2-3a1.5 1.5 0 0 1 2.5-1.5L7 14"/>',
  phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
  pin: '<path d="M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/>',
};
const icon = (n, cls = 'h-6 w-6') =>
  `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[n]}</svg>`;

function page(b) {
  const P = b.palette;
  const stars = `<span class="text-amber-300" aria-hidden="true">★★★★★</span>`;
  const proof = `${stars} <strong class="text-white">${b.rating}</strong> bei ${b.reviews} Google-Bewertungen`;
  const navItems = [
    ['home', 'Start'],
    ['ueber-uns', 'Über uns'],
    ['arbeiten', 'Arbeiten'],
    ['leistungen', 'Leistungen'],
    ['bewertungen', 'Bewertungen'],
    ['kontakt', 'Kontakt'],
  ];
  const btn = (href, label, primary = true) =>
    `<a href="${href}" class="btn ${primary ? 'btn-primary' : 'btn-ghost'}">${label}<span class="btn-arrow" aria-hidden="true">→</span></a>`;
  const select = (id, label, opts) =>
    `<label class="block"><span class="lbl">${label}</span><select name="${id}" class="fld"><option value="">Bitte wählen</option>${opts.map((o) => `<option>${esc(o)}</option>`).join('')}</select></label>`;
  const form = (id) => `
  <form class="demo-form space-y-3" data-form="${id}" novalidate>
    <div class="grid gap-3 sm:grid-cols-2">
      <label class="block"><span class="lbl">Name</span><input name="name" class="fld" placeholder="Ihr Name" autocomplete="name"></label>
      <label class="block"><span class="lbl">Telefon</span><input name="tel" class="fld" placeholder="Für Rückruf" autocomplete="tel"></label>
    </div>
    <label class="block"><span class="lbl">E-Mail</span><input name="mail" type="email" class="fld" placeholder="name@beispiel.de" autocomplete="email"></label>
    <div class="grid gap-3 sm:grid-cols-3">
      ${select('art', 'Anliegen', b.form.types)}
      ${select('budget', 'Kostenrahmen', b.form.budgets)}
      ${select('wann', 'Wann?', b.form.timelines)}
    </div>
    <label class="block"><span class="lbl">Nachricht</span><textarea name="msg" rows="3" class="fld" placeholder="${esc(b.form.placeholder)}"></textarea></label>
    <button type="submit" class="btn btn-primary w-full justify-center">Anfrage senden<span class="btn-arrow" aria-hidden="true">→</span></button>
    <p class="form-note hidden rounded-lg bg-white/10 p-3 text-sm text-white" role="status">Das ist ein Entwurf – Anfragen werden noch nicht versendet. Bitte rufen Sie direkt an: ${esc(b.phone)}</p>
  </form>`;

  const sectionHead = (eyebrow, title, text, light = false) => `
    <p class="reveal text-sm font-semibold uppercase tracking-[.18em] ${light ? 'text-white/70' : 'accent-text'}">${eyebrow}</p>
    <h2 class="reveal mt-3 font-display text-3xl font-semibold leading-tight tracking-tight sm:text-4xl ${light ? 'text-white' : 'text-ink'}">${title}</h2>
    ${text ? `<p class="reveal mt-4 max-w-2xl text-lg ${light ? 'text-white/75' : 'text-slate-600'}">${text}</p>` : ''}`;

  const placeholderTile = (t, i) => `
    <figure class="reveal tile group relative overflow-hidden rounded-2xl ${i === 0 ? 'sm:col-span-2 sm:row-span-2' : ''}">
      <div class="tile-bg absolute inset-0" style="--h:${(i * 37) % 360}"></div>
      <div class="relative flex h-full min-h-[180px] flex-col justify-end p-5 ${i === 0 ? 'sm:min-h-[380px]' : ''}">
        <span class="mb-auto inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 text-white backdrop-blur">${icon(t.icon)}</span>
        <figcaption class="text-white"><strong class="block font-display text-lg">${esc(t.title)}</strong><span class="text-sm text-white/75">Platzhalter – hier kommen Ihre eigenen Fotos</span></figcaption>
      </div>
    </figure>`;

  const home = `
  <section id="home" class="hero relative isolate overflow-hidden">
    <div class="hero-bg absolute inset-0 -z-10" role="img" aria-label="Platzhalter für ein Foto der Werkstatt"></div>
    <div class="mx-auto grid max-w-7xl gap-10 px-5 pb-16 pt-32 lg:grid-cols-[1.1fr_.9fr] lg:items-center lg:pb-24 lg:pt-40">
      <div>
        <p class="load-up inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-white/85 backdrop-blur-md">${icon('pin', 'h-4 w-4')} ${esc(b.preHeadline)}</p>
        <h1 class="load-up font-display mt-5 text-4xl font-semibold leading-[1.05] tracking-tight text-white sm:text-6xl" style="--d:.08s">${b.headline}</h1>
        <p class="load-up mt-5 max-w-xl text-lg text-white/80" style="--d:.16s">${esc(b.subheadline)}</p>
        <div class="load-up mt-8 flex flex-wrap gap-3" style="--d:.24s">${btn('#/kontakt', b.ctaLabel)}${btn('#/arbeiten', 'Unsere Arbeit ansehen', false)}</div>
        <div class="load-up mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-white/75" style="--d:.32s">
          <span class="inline-flex items-center gap-2">${proof}</span>
          ${b.proofExtra.map((p) => `<span class="inline-flex items-center gap-2">${icon('check', 'h-4 w-4 accent-text')} ${esc(p)}</span>`).join('')}
        </div>
      </div>
      <div class="load-up rounded-3xl border border-white/15 bg-white/5 p-5 shadow-2xl backdrop-blur-md sm:p-7" style="--d:.2s">
        <p class="font-display text-xl font-semibold text-white">${esc(b.formTitle)}</p>
        <p class="mb-4 mt-1 text-sm text-white/70">Wir melden uns schnellstmöglich zurück.</p>
        ${form('hero')}
      </div>
    </div>
  </section>

  <section id="leistungen" class="bg-white py-20 sm:py-28">
    <div class="mx-auto max-w-7xl px-5">
      ${sectionHead('Leistungen', esc(b.servicesTitle), esc(b.servicesText))}
      <div class="mt-12 grid gap-5 md:grid-cols-3">
        ${b.pillars
          .map(
            (p, i) => `
        <article class="reveal card group" style="--d:${i * 0.08}s">
          <span class="icon-badge">${icon(p.icon)}</span>
          <h3 class="mt-5 font-display text-xl font-semibold text-ink">${esc(p.title)}</h3>
          <p class="mt-2 text-slate-600">${esc(p.text)}</p>
        </article>`,
          )
          .join('')}
      </div>
      <div class="reveal mt-10">${btn('#/leistungen', 'Alle Leistungen ansehen')}</div>
    </div>
  </section>

  <section id="arbeiten" class="bg-slate-50 py-20 sm:py-28">
    <div class="mx-auto max-w-7xl px-5">
      ${sectionHead('Unsere Arbeit', 'Einblicke in die Werkstatt', 'Hier zeigen wir später echte Fotos aus dem Alltag – Sie liefern die Bilder, wir setzen sie in Szene.')}
      <div class="mt-12 grid auto-rows-fr gap-4 sm:grid-cols-3">${b.portfolio.slice(0, 5).map(placeholderTile).join('')}</div>
      <div class="reveal mt-10">${btn('#/arbeiten', 'Mehr Arbeiten ansehen')}</div>
    </div>
  </section>

  <section id="ueber-uns" class="bg-white py-20 sm:py-28">
    <div class="mx-auto grid max-w-7xl items-center gap-12 px-5 lg:grid-cols-2">
      <div class="reveal relative">
        <div class="about-img aspect-[4/5] w-full rounded-3xl" role="img" aria-label="Platzhalter für ein Teamfoto"></div>
        <div class="absolute -bottom-6 left-6 right-6 rounded-2xl bg-ink p-5 text-white shadow-xl sm:left-auto sm:w-72">
          <p class="font-display text-4xl font-semibold">${b.rating}<span class="text-amber-300"> ★</span></p>
          <p class="text-sm text-white/75">aus ${b.reviews} Google-Bewertungen</p>
        </div>
      </div>
      <div>
        ${sectionHead('Warum ' + esc(b.short), esc(b.whyTitle), esc(b.whyText))}
        <ul class="mt-8 space-y-5">
          ${b.why
            .map(
              (w, i) => `<li class="reveal flex gap-4" style="--d:${i * 0.08}s"><span class="icon-badge shrink-0">${icon(w.icon)}</span><span><strong class="block font-display text-lg text-ink">${esc(w.title)}</strong><span class="text-slate-600">${esc(w.text)}</span></span></li>`,
            )
            .join('')}
        </ul>
        <div class="reveal mt-10">${btn('#/bewertungen', 'Was Kunden sagen')}</div>
      </div>
    </div>
  </section>

  <section id="bewertungen" class="bg-ink py-20 text-white sm:py-24">
    <div class="mx-auto max-w-7xl px-5">
      ${sectionHead('Bewertungen', `${b.rating} von 5 Sternen bei ${b.reviews} Google-Bewertungen`, 'Das heben Kundinnen und Kunden in ihren Bewertungen besonders hervor:', true)}
      <div class="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        ${b.praise.map((p, i) => `<div class="reveal rounded-2xl border border-white/10 bg-white/5 p-5" style="--d:${i * 0.06}s">${icon(p.icon, 'h-6 w-6 accent-text')}<p class="mt-3 font-medium">${esc(p.text)}</p></div>`).join('')}
      </div>
      <p class="reveal mt-4 text-xs text-white/50">Zusammenfassung öffentlicher Google-Bewertungen, Stand ${b.asOf}. Keine wörtlichen Zitate.</p>
      <div class="reveal mt-8">${btn('#/bewertungen', 'Zu den Bewertungen')}</div>
    </div>
  </section>

  <section id="kontakt" class="bg-white py-20 sm:py-28">
    <div class="mx-auto grid max-w-7xl gap-10 px-5 lg:grid-cols-2">
      <div>
        ${sectionHead('Kontakt', esc(b.contactTitle), esc(b.contactText))}
        <ul class="reveal mt-8 space-y-4 text-lg">
          <li class="flex items-center gap-3">${icon('phone', 'h-5 w-5 accent-text')}<a class="font-semibold text-ink hover:underline" href="tel:${b.phone.replace(/[^+\d]/g, '')}">${esc(b.phone)}</a></li>
          <li class="flex items-center gap-3">${icon('pin', 'h-5 w-5 accent-text')}<span class="text-slate-700">${esc(b.address)}</span></li>
          <li class="flex items-center gap-3">${icon('clock', 'h-5 w-5 accent-text')}<span class="text-slate-700">${esc(b.hours)}</span></li>
        </ul>
        <div class="reveal mt-8">${btn('#/kontakt', 'Zur Kontaktseite')}</div>
      </div>
      <div class="reveal map-ph flex min-h-[280px] items-end rounded-3xl p-6"><p class="rounded-xl bg-white/90 px-4 py-3 text-sm text-slate-700 shadow">${icon('pin', 'mr-1 inline h-4 w-4 accent-text')} ${esc(b.address)} · Kartenansicht folgt</p></div>
    </div>
  </section>

  <section class="final-cta relative overflow-hidden py-20 sm:py-28">
    <div class="mx-auto max-w-4xl px-5 text-center">
      <h2 class="reveal font-display text-3xl font-semibold leading-tight tracking-tight text-white sm:text-5xl">${b.finalHeadline}</h2>
      <p class="reveal mx-auto mt-4 max-w-xl text-lg text-white/85">${esc(b.finalText)}</p>
      <div class="reveal mt-8 flex flex-wrap justify-center gap-3">${btn('#/kontakt', b.ctaLabel)}<a href="tel:${b.phone.replace(/[^+\d]/g, '')}" class="btn btn-ghost">${icon('phone', 'h-4 w-4')} ${esc(b.phone)}</a></div>
    </div>
  </section>`;

  const subHero = (eyebrow, title, text) => `
  <section class="sub-hero relative isolate overflow-hidden">
    <div class="hero-bg absolute inset-0 -z-10"></div>
    <div class="mx-auto max-w-7xl px-5 pb-14 pt-32 sm:pb-20 sm:pt-40">
      <a href="#home" class="load-up inline-flex items-center gap-2 text-sm text-white/70 hover:text-white">← Zur Startseite</a>
      <p class="load-up mt-6 text-sm font-semibold uppercase tracking-[.18em] text-white/70" style="--d:.05s">${eyebrow}</p>
      <h1 class="load-up font-display mt-3 text-4xl font-semibold tracking-tight text-white sm:text-5xl" style="--d:.1s">${title}</h1>
      ${text ? `<p class="load-up mt-4 max-w-2xl text-lg text-white/80" style="--d:.15s">${text}</p>` : ''}
    </div>
  </section>`;

  const pages = {
    leistungen: `${subHero('Leistungen', esc(b.servicesTitle), esc(b.servicesText))}
    <section class="bg-white py-16 sm:py-24"><div class="mx-auto max-w-7xl px-5">
      <div class="grid gap-5 md:grid-cols-2 lg:grid-cols-3">${b.serviceList
        .map(
          (s, i) => `<article class="reveal card" style="--d:${(i % 3) * 0.06}s"><span class="icon-badge">${icon(s.icon)}</span><h2 class="mt-5 font-display text-xl font-semibold text-ink">${esc(s.title)}</h2><p class="mt-2 text-slate-600">${esc(s.text)}</p></article>`,
        )
        .join('')}</div>
      <p class="reveal mt-6 text-sm text-slate-500">${esc(b.serviceNote)}</p>
      <h2 class="reveal mt-16 font-display text-2xl font-semibold text-ink">So läuft es ab</h2>
      <ol class="mt-6 grid gap-4 md:grid-cols-4">${b.process
        .map(
          (s, i) => `<li class="reveal rounded-2xl border border-slate-200 p-5" style="--d:${i * 0.06}s"><span class="step-num">${i + 1}</span><strong class="mt-3 block font-display text-lg text-ink">${esc(s[0])}</strong><span class="text-slate-600">${esc(s[1])}</span></li>`,
        )
        .join('')}</ol>
      <div class="reveal mt-10">${btn('#/kontakt', b.ctaLabel)}</div>
    </div></section>`,
    arbeiten: `${subHero('Unsere Arbeit', 'Einblicke in die Werkstatt', 'Platzhalter: Hier erscheinen Ihre eigenen Fotos – vorher/nachher, Werkstatt, Team.')}
    <section class="bg-slate-50 py-16 sm:py-24"><div class="mx-auto max-w-7xl px-5">
      <div class="grid auto-rows-fr gap-4 sm:grid-cols-3">${b.portfolio.map(placeholderTile).join('')}</div>
      <div class="reveal mt-10">${btn('#/kontakt', b.ctaLabel)}</div>
    </div></section>`,
    bewertungen: `${subHero('Bewertungen', `${b.rating} ★ bei ${b.reviews} Google-Bewertungen`, 'Was Kundinnen und Kunden in ihren Bewertungen immer wieder hervorheben.')}
    <section class="bg-white py-16 sm:py-24"><div class="mx-auto max-w-5xl px-5">
      <div class="grid gap-4 sm:grid-cols-2">${b.praise
        .map((p, i) => `<div class="reveal card" style="--d:${i * 0.06}s"><span class="icon-badge">${icon(p.icon)}</span><p class="mt-4 font-display text-lg text-ink">${esc(p.text)}</p></div>`)
        .join('')}</div>
      <p class="reveal mt-6 text-sm text-slate-500">Zusammenfassung öffentlicher Google-Bewertungen, Stand ${b.asOf}. In der fertigen Website können ausgewählte Bewertungen mit Ihrer Zustimmung eingebunden werden.</p>
      <div class="reveal mt-10">${btn('#/kontakt', b.ctaLabel)}</div>
    </div></section>`,
    kontakt: `${subHero('Kontakt', esc(b.contactTitle), esc(b.contactText))}
    <section class="bg-ink py-16 sm:py-24"><div class="mx-auto grid max-w-7xl gap-10 px-5 lg:grid-cols-[.8fr_1.2fr]">
      <ul class="reveal space-y-5 text-lg text-white">
        <li class="flex items-center gap-3">${icon('phone', 'h-5 w-5 accent-text')}<a class="font-semibold hover:underline" href="tel:${b.phone.replace(/[^+\d]/g, '')}">${esc(b.phone)}</a></li>
        <li class="flex items-center gap-3">${icon('pin', 'h-5 w-5 accent-text')}<span>${esc(b.address)}</span></li>
        <li class="flex items-center gap-3">${icon('clock', 'h-5 w-5 accent-text')}<span>${esc(b.hours)}</span></li>
        <li class="text-base text-white/70">Einsatzgebiet: ${esc(b.area)}</li>
      </ul>
      <div class="reveal rounded-3xl border border-white/15 bg-white/5 p-6 backdrop-blur-md">${form('kontakt')}</div>
    </div></section>`,
    datenschutz: `${subHero('Rechtliches', 'Datenschutzerklärung', 'Kurz und verständlich: welche Daten wir verarbeiten und warum.')}
    <section class="bg-white py-16 sm:py-24"><div class="mx-auto max-w-3xl px-5 text-slate-700">
      <p class="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">Platzhalter-Text für den Entwurf. Vor der Veröffentlichung wird er durch Ihre geprüfte Datenschutzerklärung ersetzt.</p>
      ${[
        ['Verantwortlicher', [`${b.name}, ${b.address}`, `Telefon: ${b.phone}`]],
        ['Welche Daten wir erheben', ['Angaben aus dem Kontaktformular (Name, E-Mail, Telefon, Anliegen, Nachricht)', 'Technisch notwendige Server-Logdaten (z. B. Zeitpunkt, Browsertyp), ohne Profilbildung']],
        ['Wofür wir sie nutzen', ['Bearbeitung Ihrer Anfrage und Terminabsprache', 'Sicherer und stabiler Betrieb der Website']],
        ['Wie lange wir sie speichern', ['Anfragen: bis zur Erledigung, danach Löschung, soweit keine gesetzliche Aufbewahrungspflicht besteht', 'Server-Logs: höchstens 14 Tage']],
        ['Weitergabe an Dritte', ['Keine Weitergabe zu Werbezwecken', 'Nur an technische Dienstleister (Hosting, E-Mail) auf Grundlage eines Auftragsverarbeitungsvertrags']],
        ['Sicherheit', ['Verschlüsselte Übertragung (HTTPS)', 'Zugriff nur für berechtigte Personen']],
        ['Ihre Rechte', ['Auskunft, Berichtigung, Löschung und Einschränkung der Verarbeitung', 'Widerspruch und Datenübertragbarkeit', 'Beschwerde bei einer Datenschutz-Aufsichtsbehörde']],
      ]
        .map(
          ([h, items]) => `<h2 class="mt-10 font-display text-xl font-semibold text-ink">${h}</h2><ul class="mt-3 list-disc space-y-1.5 pl-5">${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`,
        )
        .join('')}
      <p class="mt-10 text-sm text-slate-500">Zuletzt aktualisiert: ${b.asOf}.</p>
    </div></section>`,
  };

  const year = 2026;
  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${esc(b.name)} – ${esc(b.titleTail)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Sora:wght@500;600;700&display=swap" rel="stylesheet">
<script src="https://cdn.tailwindcss.com/3.4.16"></script>
<script>tailwind.config={theme:{extend:{fontFamily:{sans:['Inter','system-ui','sans-serif'],display:['Sora','Inter','sans-serif']},colors:{ink:'${P.ink}'}}}}</script>
<style>
:root{--a1:${P.a1};--a2:${P.a2};--ink:${P.ink}}
html{scroll-behavior:smooth}body{font-family:Inter,system-ui,sans-serif;background:#fff;color:#0f172a;-webkit-font-smoothing:antialiased}
.accent-text{color:var(--a1)}
.btn{display:inline-flex;align-items:center;gap:.5rem;padding:.85rem 1.35rem;border-radius:999px;font-weight:600;transition:transform .2s ease,box-shadow .2s ease,background .2s ease}
.btn-primary{color:#fff;background:linear-gradient(135deg,var(--a1),var(--a2));box-shadow:0 10px 30px -10px var(--a1)}
.btn-primary:hover{transform:translateY(-2px);box-shadow:0 16px 36px -10px var(--a1)}
.btn-ghost{color:#fff;border:1px solid rgba(255,255,255,.3);background:rgba(255,255,255,.06);backdrop-filter:blur(8px)}
.btn-ghost:hover{background:rgba(255,255,255,.14);transform:translateY(-2px)}
section:not(.hero):not(.sub-hero):not(.final-cta):not(#bewertungen) .btn-ghost{color:var(--ink);border-color:#cbd5e1}
.btn-arrow{transition:transform .2s ease}.btn:hover .btn-arrow{transform:translateX(4px)}
.lbl{display:block;margin-bottom:.3rem;font-size:.78rem;font-weight:500;color:rgba(255,255,255,.75)}
.fld{width:100%;border-radius:.8rem;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.08);padding:.7rem .85rem;color:#fff;outline:none;transition:border .2s,background .2s}
.fld::placeholder{color:rgba(255,255,255,.45)}.fld:focus{border-color:var(--a1);background:rgba(255,255,255,.12)}
.fld option{color:#0f172a}
.hero-bg{background:radial-gradient(1200px 600px at 85% 10%,color-mix(in srgb,var(--a1) 45%,transparent),transparent 60%),radial-gradient(900px 500px at 0% 100%,color-mix(in srgb,var(--a2) 35%,transparent),transparent 60%),linear-gradient(160deg,${P.heroFrom},${P.ink} 65%)}
.hero-bg::after{content:"";position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.05) 1px,transparent 1px);background-size:56px 56px;mask-image:linear-gradient(to bottom,#000,transparent 85%)}
.card{border-radius:1.4rem;border:1px solid #e2e8f0;padding:1.75rem;background:#fff;transition:transform .25s ease,box-shadow .25s ease,border-color .25s}
.card:hover{transform:translateY(-4px);box-shadow:0 24px 50px -24px rgba(15,23,42,.35);border-color:color-mix(in srgb,var(--a1) 40%,#e2e8f0)}
.icon-badge{display:inline-flex;height:3rem;width:3rem;align-items:center;justify-content:center;border-radius:1rem;color:#fff;background:linear-gradient(135deg,var(--a1),var(--a2))}
.step-num{display:inline-flex;height:2rem;width:2rem;align-items:center;justify-content:center;border-radius:999px;background:var(--ink);color:#fff;font-weight:600;font-size:.9rem}
.tile-bg{background:linear-gradient(150deg,color-mix(in srgb,var(--a1) 70%,#000),var(--ink));transition:transform .6s ease}
.tile-bg::before{content:"";position:absolute;inset:0;background:radial-gradient(400px 200px at calc(var(--h)*1%/3.6) 0%,rgba(255,255,255,.22),transparent 60%)}
.tile:hover .tile-bg{transform:scale(1.06)}
.about-img{background:radial-gradient(500px 300px at 30% 20%,color-mix(in srgb,var(--a1) 40%,transparent),transparent),linear-gradient(170deg,#334155,var(--ink))}
.map-ph{background:linear-gradient(rgba(255,255,255,.6) 1px,transparent 1px) 0 0/40px 40px,linear-gradient(90deg,rgba(255,255,255,.6) 1px,transparent 1px) 0 0/40px 40px,linear-gradient(135deg,#e2e8f0,#cbd5e1)}
.final-cta{background:linear-gradient(120deg,var(--a2),var(--a1))}
.final-cta .btn-ghost{background:rgba(0,0,0,.22);border-color:rgba(255,255,255,.55)}
.final-cta .btn-primary{background:#fff;color:var(--ink);box-shadow:0 12px 30px -12px rgba(0,0,0,.4)}
/* Animationen */
@keyframes up{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:none}}
.load-up{opacity:0;animation:up .8s cubic-bezier(.2,.7,.2,1) forwards;animation-delay:var(--d,0s)}
.reveal{opacity:0;transform:translateY(24px);transition:opacity .8s cubic-bezier(.2,.7,.2,1),transform .8s cubic-bezier(.2,.7,.2,1);transition-delay:var(--d,0s)}
.reveal.in{opacity:1;transform:none}
.view{animation:fadeView .45s ease}@keyframes fadeView{from{opacity:0}to{opacity:1}}
/* Navigation */
.nav{transition:background .3s,backdrop-filter .3s,box-shadow .3s}
.nav.scrolled{background:color-mix(in srgb,var(--ink) 72%,transparent);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);box-shadow:0 8px 30px -12px rgba(0,0,0,.4)}
.navlink{position:relative;color:rgba(255,255,255,.8);transition:color .2s}.navlink:hover{color:#fff}
.navlink::after{content:"";position:absolute;left:0;right:0;bottom:-6px;height:2px;border-radius:2px;background:linear-gradient(90deg,var(--a1),var(--a2));transform:scaleX(0);transition:transform .25s}.navlink:hover::after{transform:scaleX(1)}
.tray{transform:translateX(100%);transition:transform .45s cubic-bezier(.7,0,.2,1)}
.tray.open{transform:none}
.tray a{opacity:0;transform:translateY(-14px);transition:opacity .35s,transform .35s}
.tray.open a{opacity:1;transform:none}
.scrim{opacity:0;pointer-events:none;transition:opacity .35s}.scrim.open{opacity:1;pointer-events:auto}
.burger span{display:block;height:2px;width:22px;background:#fff;border-radius:2px;transition:transform .3s,opacity .3s}
.burger.x span:nth-child(1){transform:translateY(6px) rotate(45deg)}.burger.x span:nth-child(2){opacity:0}.burger.x span:nth-child(3){transform:translateY(-6px) rotate(-45deg)}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}.load-up,.reveal{opacity:1;transform:none}}
</style>
</head>
<body>
<header class="fixed inset-x-0 top-0 z-50">
  <div class="truncate bg-slate-950 px-4 py-1.5 text-center text-[11px] text-white/80 sm:text-xs">Unverbindlicher Entwurf von SeitenWerk – nicht vom Betrieb beauftragt</div>
  <div class="nav" id="nav"><div class="mx-auto flex h-16 max-w-7xl items-center justify-between px-5">
    <a href="#home" class="flex items-center gap-2.5 font-display text-lg font-semibold text-white" aria-label="${esc(b.name)} – Startseite">
      <span class="inline-flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold" style="background:linear-gradient(135deg,var(--a1),var(--a2))">${esc(b.logo)}</span>
      <span>${esc(b.navName)}</span>
    </a>
    <nav class="hidden items-center gap-7 text-sm lg:flex" aria-label="Hauptnavigation">
      ${navItems.map(([id, l]) => `<a class="navlink" href="#${id}">${l}</a>`).join('')}
      <a href="#/kontakt" class="btn btn-primary !py-2.5 text-sm">${esc(b.ctaShort)}</a>
    </nav>
    <button id="burger" class="burger flex flex-col gap-1 p-2 lg:hidden" aria-label="Menü öffnen" aria-expanded="false" aria-controls="tray"><span></span><span></span><span></span></button>
  </div></div>
</header>
<div id="scrim" class="scrim fixed inset-0 z-[70] bg-slate-950/50 lg:hidden"></div>
<aside id="tray" class="tray fixed inset-y-0 right-0 z-[80] flex w-[82%] max-w-sm flex-col bg-ink px-7 pb-8 pt-6 lg:hidden" aria-label="Menü">
  <div class="flex items-center justify-between"><span class="font-display text-lg font-semibold text-white">${esc(b.navName)}</span>
  <button id="close" class="burger x flex flex-col gap-1 p-2" aria-label="Menü schließen"><span></span><span></span><span></span></button></div>
  <nav class="mt-10 flex flex-col gap-1">
    ${navItems.map(([id, l], i) => `<a href="#${id}" class="trayl border-b border-white/10 py-4 font-display text-2xl text-white" style="transition-delay:${0.12 + i * 0.05}s">${l}</a>`).join('')}
  </nav>
  <a href="#/kontakt" class="trayl btn btn-primary mt-auto justify-center" style="transition-delay:.45s">${esc(b.ctaLabel)}</a>
  <a href="tel:${b.phone.replace(/[^+\d]/g, '')}" class="trayl mt-4 text-center text-white/75" style="transition-delay:.5s">${esc(b.phone)}</a>
</aside>

<main id="app">
  <div data-view="home">${home}</div>
  ${Object.entries(pages)
    .map(([k, v]) => `<div data-view="${k}" hidden>${v}</div>`)
    .join('\n')}
</main>

<footer class="bg-slate-950 text-white/75">
  <div class="mx-auto grid max-w-7xl gap-10 px-5 py-14 md:grid-cols-4">
    <div class="md:col-span-2">
      <p class="flex items-center gap-2.5 font-display text-lg font-semibold text-white"><span class="inline-flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold" style="background:linear-gradient(135deg,var(--a1),var(--a2))">${esc(b.logo)}</span>${esc(b.name)}</p>
      <p class="mt-3 max-w-sm">${esc(b.tagline)}</p>
      ${b.social ? `<p class="mt-4 text-sm"><a class="hover:text-white" href="${b.social.href}" rel="noopener" target="_blank">${esc(b.social.label)}</a></p>` : ''}
    </div>
    <div><p class="font-semibold text-white">Schnellzugriff</p><ul class="mt-3 space-y-2 text-sm">
      <li><a class="hover:text-white" href="#/leistungen">Leistungen</a></li><li><a class="hover:text-white" href="#/arbeiten">Unsere Arbeit</a></li><li><a class="hover:text-white" href="#/bewertungen">Bewertungen</a></li><li><a class="hover:text-white" href="#/kontakt">Kontakt</a></li><li><a class="hover:text-white" href="#/datenschutz">Datenschutz</a></li><li><span class="text-white/40">Impressum (folgt)</span></li></ul></div>
    <div><p class="font-semibold text-white">Kontakt</p><ul class="mt-3 space-y-2 text-sm">
      <li><a class="hover:text-white" href="tel:${b.phone.replace(/[^+\d]/g, '')}">${esc(b.phone)}</a></li><li>${esc(b.address)}</li><li>Einsatzgebiet: ${esc(b.area)}</li></ul></div>
  </div>
  <div class="border-t border-white/10 px-5 py-5 text-center text-sm">© ${year} ${esc(b.name)}</div>
</footer>

<script>
(function(){
  var nav=document.getElementById('nav'),tray=document.getElementById('tray'),scrim=document.getElementById('scrim'),burger=document.getElementById('burger');
  function onScroll(){nav.classList.toggle('scrolled',window.scrollY>20)}window.addEventListener('scroll',onScroll,{passive:true});onScroll();
  function setTray(o){tray.classList.toggle('open',o);scrim.classList.toggle('open',o);burger.classList.toggle('x',o);burger.setAttribute('aria-expanded',o);document.body.style.overflow=o?'hidden':''}
  burger.onclick=function(){setTray(true)};document.getElementById('close').onclick=function(){setTray(false)};scrim.onclick=function(){setTray(false)};
  tray.querySelectorAll('a').forEach(function(a){a.addEventListener('click',function(){setTray(false)})});
  var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}})},{threshold:.12});
  function observe(root){root.querySelectorAll('.reveal:not(.in)').forEach(function(el){io.observe(el)})}
  function show(view){document.querySelectorAll('[data-view]').forEach(function(v){var on=v.dataset.view===view;v.hidden=!on;if(on){v.classList.remove('view');void v.offsetWidth;v.classList.add('view');v.querySelectorAll('.load-up').forEach(function(x){x.style.animation='none';void x.offsetWidth;x.style.animation=''});observe(v)}})}
  function route(){var h=location.hash||'#home';if(h.indexOf('#/')===0){var v=h.slice(2);if(!document.querySelector('[data-view="'+v+'"]'))v='home';show(v);window.scrollTo({top:0,behavior:'instant'})}else{var cur=document.querySelector('[data-view]:not([hidden])');if(!cur||cur.dataset.view!=='home')show('home');var t=document.getElementById(h.slice(1));if(t)setTimeout(function(){t.scrollIntoView({behavior:'smooth'})},cur&&cur.dataset.view!=='home'?60:0)}}
  window.addEventListener('hashchange',route);route();
  document.querySelectorAll('.demo-form').forEach(function(f){f.addEventListener('submit',function(e){e.preventDefault();f.querySelector('.form-note').classList.remove('hidden')})});
})();
</script>
</body>
</html>`;
}

const common = { asOf: 'November 2026' };
const businesses = {
  'ok-car-service-bei-lali': {
    ...common,
    name: 'OK Car Service Bei Lali',
    navName: 'Bei Lali',
    short: 'Bei Lali',
    logo: 'OK',
    titleTail: 'Autowerkstatt in Dortmund',
    palette: { a1: '#ff6a1a', a2: '#e5262f', ink: '#11151c', heroFrom: '#2a1610' },
    preHeadline: 'Autowerkstatt · Güntherstraße, Dortmund',
    headline: 'Ihr Auto in <span style="background:linear-gradient(90deg,#ff8a3d,#ff4d4d);-webkit-background-clip:text;background-clip:text;color:transparent">guten Händen</span> – schnell, ehrlich, fair.',
    subheadline: 'Reparatur, Wartung und schnelle Hilfe – auch kurzfristig. Bei Lali in Dortmund erklärt man Ihnen, was Ihr Auto wirklich braucht.',
    ctaLabel: 'Termin anfragen',
    ctaShort: 'Termin anfragen',
    proofExtra: ['Kurzfristige Termine', 'Faire Preise'],
    formTitle: 'Termin oder Angebot anfragen',
    form: {
      types: ['Reparatur', 'Inspektion / Wartung', 'Fehlerdiagnose', 'Reifen', 'Sonstiges'],
      budgets: ['Bitte Kostenvoranschlag', 'bis 250 €', '250–750 €', 'über 750 €'],
      timelines: ['So schnell wie möglich', 'Diese Woche', 'Nächste Woche', 'Flexibel'],
      placeholder: 'Fahrzeug, Baujahr und was Ihnen auffällt …',
    },
    rating: '4,9',
    reviews: 212,
    servicesTitle: 'Rund ums Auto – alles aus einer Hand',
    servicesText: 'Ob Geräusch, Warnleuchte oder fällige Inspektion: Wir schauen genau hin und sagen Ihnen vorher, was es kostet.',
    pillars: [
      { icon: 'wrench', title: 'Reparatur & Diagnose', text: 'Fehler finden statt raten: sorgfältige Reparaturen, verständlich erklärt.' },
      { icon: 'check', title: 'Wartung & Inspektion', text: 'Regelmäßige Pflege, damit Ihr Auto zuverlässig bleibt.' },
      { icon: 'bolt', title: 'Schnelle Hilfe', text: 'Kurzfristige Termine – oft auch spontan, wenn es eilt.' },
    ],
    serviceList: [
      { icon: 'wrench', title: 'Reparaturen', text: 'Mechanik, Bremsen, Fahrwerk – fachgerecht und sauber ausgeführt.' },
      { icon: 'check', title: 'Inspektion & Wartung', text: 'Ölwechsel, Filter, Durchsicht nach Herstellervorgaben.' },
      { icon: 'bolt', title: 'Fehlerdiagnose', text: 'Warnleuchte an? Wir lesen den Fehler aus und erklären ihn.' },
      { icon: 'car', title: 'Reifenservice', text: 'Wechsel, Einlagerung und Prüfung.' },
      { icon: 'shield', title: 'Vorbereitung HU', text: 'Durchsicht vor der Hauptuntersuchung.' },
      { icon: 'euro', title: 'Kostenvoranschlag', text: 'Sie wissen vorher, was auf Sie zukommt.' },
    ],
    serviceNote: 'Beispielhafte Leistungen für den Entwurf – der genaue Umfang wird mit dem Betrieb abgestimmt.',
    process: [
      ['Anfragen', 'Anrufen oder Formular ausfüllen.'],
      ['Termin', 'Oft schon kurzfristig möglich.'],
      ['Diagnose & Preis', 'Wir erklären, was nötig ist – und was es kostet.'],
      ['Abholen', 'Ihr Auto ist fertig und geprüft.'],
    ],
    portfolio: [
      { icon: 'wrench', title: 'Werkstatt' },
      { icon: 'car', title: 'Vorher / Nachher' },
      { icon: 'check', title: 'Inspektion' },
      { icon: 'bolt', title: 'Diagnose' },
      { icon: 'hand', title: 'Das Team' },
      { icon: 'shield', title: 'Bremsen & Fahrwerk' },
    ],
    whyTitle: 'Eine Werkstatt, der Dortmund vertraut',
    whyText: `212 Google-Bewertungen mit 4,9 Sternen sprechen eine klare Sprache.`,
    why: [
      { icon: 'wrench', title: 'Sorgfältige Arbeit', text: 'Reparaturen und Wartungen werden gründlich und fachgerecht erledigt.' },
      { icon: 'hand', title: 'Freundlich & hilfsbereit', text: 'Sie werden ernst genommen – und bekommen ehrliche Antworten.' },
      { icon: 'euro', title: 'Faire Preise', text: 'Gutes Preis-Leistungs-Verhältnis ohne Überraschungen.' },
    ],
    praise: [
      { icon: 'wrench', text: 'Fachgerechte, sorgfältige Reparaturen und Wartungen' },
      { icon: 'hand', text: 'Freundlicher, hilfsbereiter Service' },
      { icon: 'euro', text: 'Faires Preis-Leistungs-Verhältnis' },
      { icon: 'bolt', text: 'Schnell – auch bei spontanen Besuchen' },
    ],
    contactTitle: 'Kurz anrufen oder Anfrage senden',
    contactText: 'Beschreiben Sie kurz Ihr Anliegen – wir melden uns mit einem Termin.',
    phone: '0231 1763965',
    address: 'Güntherstr. 75, 44143 Dortmund',
    hours: 'Öffnungszeiten bitte telefonisch erfragen',
    area: 'Dortmund und Umgebung',
    finalHeadline: 'Ihr Auto macht Zicken? <br class="hidden sm:block">Wir kümmern uns.',
    finalText: 'Termin anfragen, vorbeikommen, entspannt weiterfahren.',
    tagline: 'Ihre freie Autowerkstatt in Dortmund – sorgfältig, freundlich, fair.',
    social: { href: 'https://www.tiktok.com/@beilali6693', label: 'TikTok: @beilali6693' },
  },
  'kfz-john': {
    ...common,
    name: 'Kfz John',
    navName: 'Kfz John',
    short: 'Kfz John',
    logo: 'KJ',
    titleTail: 'Meisterwerkstatt & Abschleppdienst in Dortmund',
    palette: { a1: '#f5b400', a2: '#ff7a00', ink: '#0b1324', heroFrom: '#14233f' },
    preHeadline: 'Seit 1976 in Dortmund-Lichtendorf',
    headline: 'Liegen geblieben? <span style="background:linear-gradient(90deg,#ffd23f,#ff8a00);-webkit-background-clip:text;background-clip:text;color:transparent">Wir sind da.</span>',
    subheadline: 'Kfz-Meisterwerkstatt, Pannen- und Abschleppdienst und Transporte – seit 1976 und in zweiter Generation für Sie in Dortmund.',
    ctaLabel: 'Hilfe anfragen',
    ctaShort: 'Anfragen',
    proofExtra: ['Seit 1976', 'Meisterbetrieb in 2. Generation'],
    formTitle: 'Werkstatt-Termin oder Hilfe anfragen',
    form: {
      types: ['Panne / Abschleppen', 'Werkstatt-Termin', 'Lackierung', 'Fahrzeugtransport', 'Sonstiges'],
      budgets: ['Bitte Kostenvoranschlag', 'bis 300 €', '300–1.000 €', 'über 1.000 €'],
      timelines: ['Sofort – Notfall', 'Heute', 'Diese Woche', 'Flexibel'],
      placeholder: 'Wo stehen Sie, welches Fahrzeug, was ist passiert?',
    },
    rating: '4,8',
    reviews: 346,
    servicesTitle: 'Werkstatt, Pannenhilfe, Transport',
    servicesText: 'Alles, was Ihr Fahrzeug braucht – vom Abschleppen bis zur fertigen Reparatur, aus einer Hand.',
    pillars: [
      { icon: 'wrench', title: 'Meisterwerkstatt', text: 'Reparatur und Wartung in der eigenen Kfz-Meisterwerkstatt.' },
      { icon: 'truck', title: 'Pannen- & Abschleppdienst', text: 'Schnelle Hilfe vor Ort, wenn Ihr Fahrzeug liegen bleibt.' },
      { icon: 'car', title: 'Transporte', text: 'Sicherer Transport Ihres Fahrzeugs dorthin, wo es hin muss.' },
    ],
    serviceList: [
      { icon: 'truck', title: 'Abschleppdienst', text: 'Wir holen Ihr Fahrzeug sicher ab – direkt in unsere Werkstatt.' },
      { icon: 'bolt', title: 'Pannenhilfe', text: 'Starthilfe und Hilfe vor Ort, wenn möglich direkt an der Straße.' },
      { icon: 'wrench', title: 'Reparatur & Wartung', text: 'Kfz-Meisterwerkstatt für Reparaturen, Inspektion und Wartung.' },
      { icon: 'spray', title: 'Lackierung', text: 'Lackschäden fachgerecht beheben.' },
      { icon: 'car', title: 'Fahrzeugtransporte', text: 'Überführung und Transport von Fahrzeugen.' },
      { icon: 'shield', title: 'Abwicklung', text: 'Klare, transparente Abläufe – Sie wissen immer, woran Sie sind.' },
    ],
    serviceNote: 'Leistungen laut eigenen und öffentlichen Angaben; der genaue Umfang wird mit dem Betrieb abgestimmt.',
    process: [
      ['Anrufen', '02304 41211 – wir nehmen Ihre Lage auf.'],
      ['Hilfe vor Ort', 'Pannenhilfe oder Abschleppen.'],
      ['Werkstatt', 'Diagnose und Reparatur im Meisterbetrieb.'],
      ['Weiterfahren', 'Fahrzeug fertig – und Sie wieder mobil.'],
    ],
    portfolio: [
      { icon: 'truck', title: 'Abschleppwagen' },
      { icon: 'wrench', title: 'Meisterwerkstatt' },
      { icon: 'spray', title: 'Lackierung' },
      { icon: 'car', title: 'Transporte' },
      { icon: 'hand', title: 'Das Team' },
      { icon: 'clock', title: 'Seit 1976' },
    ],
    whyTitle: 'Familienbetrieb mit fast 50 Jahren Erfahrung',
    whyText: 'Seit 1976 am Standort Dortmund-Lichtendorf, heute in zweiter Generation geführt – und von 346 Google-Bewertungen mit 4,8 Sternen bestätigt.',
    why: [
      { icon: 'clock', title: 'Erfahrung seit 1976', text: 'Ein Standort, eine Familie, fast fünf Jahrzehnte Kfz-Handwerk.' },
      { icon: 'bolt', title: 'Schnell vor Ort', text: 'Wenn es darauf ankommt, sind wir zügig bei Ihnen.' },
      { icon: 'shield', title: 'Klar & transparent', text: 'Verständliche Abwicklung ohne böse Überraschungen.' },
    ],
    praise: [
      { icon: 'bolt', text: 'Schnelle Hilfe vor Ort' },
      { icon: 'hand', text: 'Freundliches, hilfsbereites Team' },
      { icon: 'shield', text: 'Klare, transparente Abwicklung' },
      { icon: 'car', text: 'Sorgfältig – mit Extras wie Ersatzwagen oder Taxi' },
    ],
    contactTitle: 'Panne? Einfach anrufen.',
    contactText: 'Für Werkstatt-Termine und Anfragen nutzen Sie gern auch das Formular.',
    phone: '02304 41211',
    address: 'Römerstraße 60, 44289 Dortmund',
    hours: 'Zeiten bitte telefonisch erfragen',
    area: 'Dortmund und Umgebung',
    finalHeadline: 'Fast 50 Jahre Erfahrung. <br class="hidden sm:block">Ein Anruf genügt.',
    finalText: 'Ob Panne, Reparatur oder Transport – wir kümmern uns.',
    tagline: 'Kfz-Meisterwerkstatt, Pannen- und Abschleppdienst in Dortmund-Lichtendorf – seit 1976.',
  },
};

const out = process.argv[2];
for (const [slug, b] of Object.entries(businesses)) {
  mkdirSync(out, { recursive: true });
  writeFileSync(`${out}/${slug}.html`, page(b));
  console.log('ok', slug);
}
