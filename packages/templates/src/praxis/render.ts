import type { RenderContext, TemplateDef } from '../types';
import { esc } from '../html';
import { icon } from '../icons';
import { documentShell } from '../partials/shared';
import { kitFontCss, kitFontFamily } from '../kits/fonts';
import { purgeCss } from '../kits/purge';
import { locationText, locationPurpose } from '../authored/location';
import {
  PRAXIS_DIRECTIONS,
  praxisAccentFor,
  praxisKeyOf,
  praxisTemplateId,
  type PraxisDirection,
  type PraxisDirectionKey,
} from './directions';

/**
 * Praxis-Vorlage (Designrichtlinie 2026-11-19): feste, sorgfältig gebaute Komposition je Gestaltungsrichtung,
 * Texte vom Modell (geprüft), Bilder nur lizenzierte, gewerkpassende Symbolbilder oder freigegebene Kundenfotos.
 * Ohne JavaScript (Demo-CSP): Menü über details/summary, Einblendung über CSS scroll-driven animations mit
 * sofort sichtbarem Inhalt als Rückfall. Betriebs-CTAs und SeitenWerk-Angebot bleiben getrennt (Angebot nur im
 * gemeinsamen Footer/Leiste der Demo).
 */
type Photo = ReturnType<RenderContext['parts']['photos']>[number];

const STEPS: Record<PraxisDirection['request'], [string, string][]> = {
  rueckruf: [
    ['Anliegen nennen', 'Kurz anrufen oder Rückruf anfragen und beschreiben, worum es geht.'],
    ['Termin abstimmen', 'Gemeinsam klären, wann jemand vorbeikommen kann.'],
    ['Erledigen lassen', 'Die Arbeit wird wie besprochen ausgeführt.'],
  ],
  besichtigung: [
    ['Anfrage mit Eckdaten', 'Was soll gemacht werden, wo, und bis wann ungefähr?'],
    ['Besichtigung vereinbaren', 'Vor Ort lässt sich der Umfang genau einschätzen.'],
    ['Angebot', 'Sie erhalten ein Angebot zur besprochenen Leistung.'],
    ['Ausführung', 'Die Arbeiten beginnen zum abgestimmten Termin.'],
  ],
  beratung: [
    ['Raum und Wunsch beschreiben', 'Welche Fläche, welcher Raum, welche Vorstellung?'],
    ['Beratung abstimmen', 'Material, Farbe oder Format gemeinsam festlegen.'],
    ['Angebot und Termin', 'Umfang und Zeitpunkt werden schriftlich festgehalten.'],
  ],
  gartenprojekt: [
    ['Garten beschreiben', 'Fläche, Wunsch und Zustand kurz schildern, gern mit Fotos.'],
    ['Vor-Ort-Termin', 'Gemeinsam im Garten ansehen, was möglich ist.'],
    ['Planung und Angebot', 'Vorschlag mit Umfang der Arbeiten.'],
    ['Umsetzung', 'Ausführung zur abgestimmten Zeit.'],
  ],
};

const REQUEST_TITLE: Record<PraxisDirection['request'], string> = {
  rueckruf: 'Rückruf oder Anfrage',
  besichtigung: 'Besichtigung anfragen',
  beratung: 'Beratung anfragen',
  gartenprojekt: 'Gartenprojekt besprechen',
};

function img(ph: Photo, cls: string, priority: boolean, draft: boolean): string {
  const p = ph.focalPoint;
  const pos =
    p && Number.isFinite(p.x) && Number.isFinite(p.y)
      ? ` style="object-position:${Math.min(100, Math.max(0, p.x))}% ${Math.min(100, Math.max(0, p.y))}%"`
      : '';
  const size = ph.width && ph.height ? ` width="${ph.width}" height="${ph.height}"` : ' width="1600" height="1067"';
  const label =
    draft && ph.example ? '<figcaption class="pw-tag">Symbolbild, keine Aufnahme des Betriebs</figcaption>' : '';
  return `<figure class="pw-fig ${cls}"><img src="${esc(ph.src)}" alt="${esc(ph.alt)}"${size}${pos} loading="${priority ? 'eager' : 'lazy'}"${priority ? ' fetchpriority="high"' : ''} decoding="async">${label}</figure>`;
}

function renderPraxis(ctx: RenderContext, key: PraxisDirectionKey): string {
  const d = PRAXIS_DIRECTIONS[key];
  const f = ctx.facts,
    c = ctx.content,
    p = ctx.parts;
  const draft = p.draft;
  const photos = p.photos(4);
  const hero = photos[0];
  const gallery = photos.slice(1, 4);
  const call = p.callHref && p.callHref.startsWith('tel:') && p.phoneLabel ? { href: p.callHref, label: p.phoneLabel } : null;
  const where = locationPurpose(f) === 'customer-site' ? `${f.branchLabel} in ${f.city}` : `${f.branchLabel} · ${f.city}`;
  const arrow = '<span class="pw-arrow" aria-hidden="true">→</span>';
  const primary =
    d.request === 'rueckruf' && call
      ? `<a class="pw-btn pw-btn-main" href="${esc(call.href)}">Anrufen: ${esc(call.label)}</a><a class="pw-btn pw-btn-alt" href="#anfrage">${d.primaryLabel}${arrow}</a>`
      : `<a class="pw-btn pw-btn-main" href="#anfrage">${d.request === 'rueckruf' ? 'Anfrage senden' : d.primaryLabel}${arrow}</a>${call ? `<a class="pw-btn pw-btn-alt" href="${esc(call.href)}">Anrufen</a>` : ''}`;

  const nav = [
    ['#leistungen', 'Leistungen'],
    ...(d.order.includes('bilder') && gallery.length ? [['#einblicke', 'Einblicke']] : []),
    ['#ablauf', 'Ablauf'],
    ...(c.faq.length ? [['#fragen', 'Fragen']] : []),
    ['#anfrage', 'Kontakt'],
  ] as [string, string][];
  const navLinks = nav.map(([h, l]) => `<a href="${h}">${l}</a>`).join('');
  const logo = (!draft || f.logoRightsConfirmed) && f.logoSrc ? `<img class="pw-logo" src="${esc(f.logoSrc)}" alt="" height="40">` : '';
  const header = `<header class="pw-head"><div class="pw-wrap pw-head-in"><a class="pw-brand" href="#start">${logo}<span class="pw-brand-t"><span>${esc(f.name)}</span><small>${esc(where)}</small></span></a><nav class="pw-nav" aria-label="Seitennavigation">${navLinks}</nav>${call ? `<a class="pw-headcall" href="${esc(call.href)}">${esc(call.label)}</a>` : ''}<details class="pw-menu"><summary aria-label="Menü öffnen"><svg class="pw-burger" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false"><path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg><span>Menü</span></summary><nav aria-label="Menü">${navLinks}${call ? `<a href="${esc(call.href)}">Anrufen: ${esc(call.label)}</a>` : ''}</nav></details></div></header>`;

  const heroText = `<p class="pw-kicker">${esc(where)}</p><h1>${esc(c.hero_headline)}</h1><p class="pw-sub">${esc(c.hero_subline)}</p><div class="pw-actions">${primary}</div>`;
  let heroHtml: string;
  if (key === 'projekt' && hero) {
    heroHtml = `<section id="start" class="pw-hero pw-hero-full">${img(hero, 'pw-hero-img', true, draft)}<div class="pw-shade" aria-hidden="true"></div><div class="pw-wrap pw-hero-copy">${heroText}</div></section>`;
  } else if (key === 'garten' && hero) {
    heroHtml = `<section id="start" class="pw-hero pw-hero-wide">${img(hero, 'pw-wide-img', true, draft)}<div class="pw-wrap pw-wide-copy"><div><p class="pw-kicker">${esc(where)}</p><h1>${esc(c.hero_headline)}</h1></div><div><p class="pw-sub">${esc(c.hero_subline)}</p><div class="pw-actions">${primary}</div></div></div></section>`;
  } else if (key === 'raeume' && hero) {
    heroHtml = `<section id="start" class="pw-hero pw-hero-edit"><div class="pw-wrap pw-edit-grid"><div class="pw-edit-copy">${heroText}</div>${img(hero, 'pw-edit-img', true, draft)}</div></section>`;
  } else {
    heroHtml = `<section id="start" class="pw-hero pw-hero-split${hero ? '' : ' pw-noimg'}"><div class="pw-wrap pw-split-grid"><div>${heroText}</div>${hero ? img(hero, 'pw-split-img', true, draft) : ''}</div></section>`;
  }

  const hours = p.hoursList({ rowClass: 'pw-hrow', labelClass: 'pw-hlabel', mutedClass: 'pw-muted' });
  const kontaktband = `<section class="pw-band" aria-label="Kontakt auf einen Blick"><div class="pw-wrap pw-band-grid"><div><h2 class="pw-h3">Telefon</h2>${call ? `<p><a class="pw-strong" href="${esc(call.href)}">${esc(call.label)}</a></p>` : '<p>Bitte über das Formular anfragen.</p>'}</div><div><h2 class="pw-h3">${locationPurpose(f) === 'customer-site' ? 'Einsatzort' : 'Adresse'}</h2><p>${esc(locationText(f, draft))}</p></div><div><h2 class="pw-h3">Öffnungszeiten</h2>${hours ? `<div class="pw-hours">${hours}</div>` : '<p>Bitte telefonisch erfragen.</p>'}</div></div></section>`;

  const services = c.services
    .map(
      (s) =>
        `<li class="pw-svc"><span class="pw-ico">${icon(s.icon, 'pw-svg')}</span><div><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p></div></li>`,
    )
    .join('');
  const leistungen = `<section id="leistungen" class="pw-sec rv"><div class="pw-wrap"><div class="pw-head2"><h2>Leistungen</h2>${p.servicesNote('pw-note')}</div><ul class="pw-svcs pw-svcs-${key}">${services}</ul>${p.exampleServices()}</div></section>`;
  const steps = STEPS[d.request];
  const ablauf = `<section id="ablauf" class="pw-sec pw-alt rv"><div class="pw-wrap"><h2>${d.request === 'rueckruf' ? 'So einfach geht es' : 'So läuft es ab'}</h2><ol class="pw-steps">${steps.map(([t, x]) => `<li><h3>${t}</h3><p>${x}</p></li>`).join('')}</ol>${draft ? '<p class="pw-note">Beispielablauf. Er wird an die tatsächliche Arbeitsweise des Betriebs angepasst.</p>' : ''}</div></section>`;
  const bilder = gallery.length
    ? `<section id="einblicke" class="pw-sec rv"><div class="pw-wrap"><h2>${key === 'raeume' ? 'Material und Oberfläche' : key === 'garten' ? 'Außenräume' : 'Einblicke'}</h2><div class="pw-gal pw-gal-${gallery.length}">${gallery.map((g) => img(g, 'pw-gal-img', false, draft)).join('')}</div></div></section>`
    : '';
  const fragen = c.faq.length
    ? `<section id="fragen" class="pw-sec rv"><div class="pw-wrap pw-narrow"><h2>Häufige Fragen</h2><div class="pw-faq">${p.faqList({ itemClass: 'pw-q', summaryClass: 'pw-qs', answerClass: 'pw-qa' })}</div></div></section>`
    : '';
  const ueber = c.about.trim()
    ? `<section id="ueber" class="pw-sec pw-alt rv"><div class="pw-wrap pw-narrow"><h2>Über den Betrieb</h2>${p.about('pw-p')}</div></section>`
    : '';
  const blocks: Record<PraxisDirection['order'][number], string> = {
    kontaktband,
    leistungen,
    ablauf,
    bilder,
    fragen,
    ueber,
  };

  const req = d.request;
  // Ein Formularaufbau für Demo (gesperrte Vorschau) und Live-Seite (echtes Ziel). Nur nötige Angaben:
  // Rückruf = Name + Telefon; geplante Arbeit = Name + eine Kontaktmöglichkeit (E-Mail ODER Telefon, serverseitig geprüft).
  const live = p.liveForm;
  const need = (on: boolean) => (live && on ? ' required' : '');
  const field = (id: string, label: string, input: string, hint = '') =>
    `<div class="pw-field"><label for="pf-${id}">${label}${hint ? ` <small>${hint}</small>` : ''}</label>${input}</div>`;
  const svcOptions = c.services.map((s) => `<option>${esc(s.title)}</option>`).join('');
  const fields =
    req === 'rueckruf'
      ? field('name', 'Name', `<input id="pf-name" type="text" name="name" autocomplete="name" maxlength="120"${need(true)}>`) +
        field('phone', 'Telefon', `<input id="pf-phone" type="tel" name="phone" autocomplete="tel" inputmode="tel" maxlength="40"${need(true)}>`) +
        field('wunsch', 'Wann passt ein Rückruf?', '<input id="pf-wunsch" type="text" name="wunsch" maxlength="300" placeholder="z. B. werktags ab 16 Uhr">', 'optional, kein fester Termin') +
        field('message', 'Worum geht es?', '<textarea id="pf-message" name="message" rows="3" maxlength="4000"></textarea>', 'optional')
      : field('leistung', 'Leistung', `<select id="pf-leistung" name="leistung"><option value="">Bitte wählen</option>${svcOptions}<option>Etwas anderes</option></select>`) +
        field('plz', 'PLZ des Einsatzorts', '<input id="pf-plz" type="text" name="plz" inputmode="numeric" autocomplete="postal-code" maxlength="10">') +
        field('name', 'Name', `<input id="pf-name" type="text" name="name" autocomplete="name" maxlength="120"${need(true)}>`) +
        `<div class="pw-pair">${field('email', 'E-Mail', '<input id="pf-email" type="email" name="email" autocomplete="email" maxlength="200">')}${field('phone', 'Telefon', '<input id="pf-phone" type="tel" name="phone" autocomplete="tel" inputmode="tel" maxlength="40">')}</div><p class="pw-hint">E-Mail oder Telefon genügt.</p>` +
        (req === 'besichtigung' || req === 'gartenprojekt'
          ? field('wunsch', 'Wunschzeitraum für einen Termin', '<input id="pf-wunsch" type="text" name="wunsch" maxlength="300" placeholder="z. B. ab Mitte nächsten Monats">', 'optional, wird abgestimmt')
          : '') +
        field('message', 'Kurze Beschreibung', `<textarea id="pf-message" name="message" rows="4" maxlength="4000"${need(true)}></textarea>`);
  const submit = req === 'rueckruf' ? 'Rückruf anfragen' : 'Anfrage senden';
  const form = live
    ? `<form id="frage" class="pw-form" method="post" action="${esc(live.action)}" accept-charset="utf-8"><fieldset><legend class="sr-only">${REQUEST_TITLE[req]}</legend>${fields}<input type="hidden" name="anliegen" value="${esc(d.primaryLabel)}"><div class="pw-hp" aria-hidden="true"><label for="pf-website">Website</label><input id="pf-website" name="website" type="text" tabindex="-1" autocomplete="off"></div><div class="pw-consent"><input id="pf-consent" name="consent" type="checkbox" required><label for="pf-consent">Ich bin einverstanden, dass meine Angaben zur Beantwortung meiner Anfrage verarbeitet werden. Hinweise in der <a href="${esc(live.privacyPath)}">Datenschutzerklärung</a>.</label></div><button class="pw-btn pw-btn-main" type="submit">${submit}</button><p class="pw-hint">Das ist eine Anfrage, keine feste Buchung. Der Betrieb meldet sich zur Abstimmung.</p></fieldset></form>`
    : `<form class="pw-form" action="#" method="post" onsubmit="return false" aria-describedby="pw-form-note"><p id="pw-form-note" class="pw-preview"><strong>Vorschau:</strong> Im Entwurf wird nichts versendet und kein Termin reserviert. Nach der Übernahme kommen Anfragen direkt beim Betrieb an.</p><fieldset disabled><legend class="sr-only">${REQUEST_TITLE[req]} (Vorschau)</legend>${fields}<button class="pw-btn pw-btn-main" type="submit">${submit}</button></fieldset></form>`;
  const booking = p.bookingHref
    ? `<div class="pw-book"><h3 class="pw-h3">Lieber gleich eine Zeit wählen?</h3><p>Sie sehen freie Termine und fragen einen davon an. ${esc(f.name)} bestätigt per E-Mail.${draft ? ' <em>(Im Entwurf als Vorschau.)</em>' : ''}</p><a class="pw-btn pw-btn-book" href="${esc(p.bookingHref)}">Freie Termine ansehen${arrow}</a></div>`
    : '';
  const kontakt = `<section id="anfrage" class="pw-sec pw-contact"><div class="pw-wrap pw-contact-grid"><div><h2>${REQUEST_TITLE[req]}</h2><p class="pw-lead">Ihre Anfrage geht direkt an ${esc(f.name)}. Danach meldet sich der Betrieb bei Ihnen, um Details und einen Termin abzustimmen.</p>${call ? `<p class="pw-bigtel"><a href="${esc(call.href)}">${esc(call.label)}</a></p>` : ''}<p>${p.addressLines}<br><a href="${esc(p.mapsHref)}" target="_blank" rel="noopener noreferrer">Route planen</a></p>${hours ? `<h3 class="pw-h3">Öffnungszeiten</h3><div class="pw-hours">${hours}</div>` : ''}${booking}</div>${form}</div></section>`;

  const body = `${header}<main id="inhalt">${heroHtml}${d.order.map((k) => blocks[k]).join('')}${kontakt}</main>${p.footer({ className: 'pw-footer', linkClass: 'underline' })}`;
  const k = { ...d.colors, accent: praxisAccentFor(f.name, d) };
  const css = praxisCss(d, k);
  const shell = documentShell(p, `pw pw-${key}`, body);
  const html = shell.replace('</head>', `<style>${kitFontCss([d.display, d.text])}${css}</style></head>`);
  // Gemeinsames Utility-CSS (Footer, Banner, Angebot) auf genutzte Klassen kürzen; eigenes CSS bleibt vollständig
  return html.replace(/<style>([\s\S]*?)<\/style>/, (_m, s: string) => `<style>${purgeCss(s, html)}</style>`);
}

function praxisCss(d: PraxisDirection, k: PraxisDirection['colors']): string {
  const display = `'${kitFontFamily(d.display)}',system-ui,sans-serif`;
  const text = `'${kitFontFamily(d.text)}',system-ui,sans-serif`;
  return `
.pw{--bg:${k.base};--sf:${k.surface};--ink:${k.ink};--mu:${k.muted};--ln:${k.line};--ac:${k.accent};--on:${k.onAccent};
--t-fast:160ms;--t-menu:220ms;--t-reveal:420ms;--ease:cubic-bezier(.2,.7,.2,1);
--s1:8px;--s2:16px;--s3:24px;--s4:40px;--s5:64px;--s6:96px;--r:4px;
background:var(--bg);color:var(--ink);font-family:${text};font-size:17px;line-height:1.6}
html{scroll-behavior:smooth;scroll-padding-top:84px}
.pw *{box-sizing:border-box}
html body.pw h1,html body.pw h2,html body.pw h3{font-family:${display};font-weight:${d.weight};${d.stretch ? `font-stretch:${d.stretch}%;` : ''}line-height:1.08;margin:0;color:var(--ink);letter-spacing:-.01em;hyphens:auto;overflow-wrap:break-word}
html body.pw h1{font-size:clamp(1.75rem,1.1rem + 3.6vw,3.9rem);max-width:18ch;text-wrap:balance}
html body.pw h2{font-size:clamp(1.55rem,1.1rem + 1.6vw,2.4rem);margin-bottom:var(--s3);text-wrap:balance}
html body.pw h3,html body.pw .pw-h3{font-size:1.12rem;line-height:1.3;margin:0 0 6px;font-family:${display};font-weight:${Math.min(d.weight, 800)}}
:where(.pw) p{margin:0 0 var(--s2)}
:where(.pw) a{color:inherit}
.pw a:focus-visible,.pw summary:focus-visible,.pw button:focus-visible{outline:3px solid var(--ac);outline-offset:3px}
.pw-wrap{width:min(1180px,100% - 2*clamp(16px,4vw,40px));margin-inline:auto}
.pw-narrow{max-width:760px}
.pw-muted,.pw-note{color:var(--mu);font-size:.92rem}
.pw-head{position:sticky;top:0;z-index:30;background:var(--bg);border-bottom:1px solid var(--ln)}
.pw-head-in{display:flex;align-items:center;gap:var(--s3);min-height:68px}
.pw-brand{display:flex;flex-direction:column;text-decoration:none;font-family:${display};font-weight:${Math.min(d.weight, 800)};font-size:1.08rem;line-height:1.2;margin-right:auto;min-width:0}
.pw-brand{flex-direction:row;align-items:center;gap:12px}
.pw-brand-t{display:flex;flex-direction:column;min-width:0}
.pw-brand-t>span{overflow-wrap:anywhere}
.pw-logo{height:40px;width:auto;max-width:120px;object-fit:contain;flex:none}
.pw-brand small{font-family:${text};font-weight:400;font-size:.82rem;color:var(--mu)}
.pw-nav{display:flex;gap:var(--s3);font-size:.95rem}
.pw-nav a,.pw-menu nav a{text-decoration:none;padding:10px 0;transition:color var(--t-fast) var(--ease)}
.pw-nav a:hover{color:var(--ac)}
.pw-headcall{font-weight:700;text-decoration:none;white-space:nowrap;padding:10px 14px;border:1.5px solid var(--ink);border-radius:var(--r);transition:background var(--t-fast) var(--ease),color var(--t-fast) var(--ease)}
.pw-headcall:hover{background:var(--ink);color:var(--bg)}
.pw-menu{display:none;position:relative}
.pw-menu summary{list-style:none;cursor:pointer;display:flex;align-items:center;gap:10px;min-height:44px;padding:0 4px;font-weight:600}
.pw-menu summary::-webkit-details-marker{display:none}
html body.pw .pw-menu summary::after,html body.pw .pw-menu summary::before{content:none;display:none}
.pw-menu summary span{white-space:nowrap}
.pw-burger{flex:none}
.pw-menu nav{position:absolute;right:0;top:calc(100% + 12px);width:min(86vw,320px);background:var(--bg);border:1px solid var(--ln);border-radius:var(--r);padding:var(--s1) var(--s3);display:flex;flex-direction:column}
.pw-menu nav a{border-bottom:1px solid var(--ln);min-height:48px;display:flex;align-items:center}
.pw-menu nav a:last-child{border-bottom:0}
.pw-kicker{color:var(--mu);font-weight:600;margin-bottom:var(--s2)}
.pw-sub{font-size:clamp(1.05rem,1rem + .3vw,1.2rem);max-width:56ch;color:var(--mu);margin-top:var(--s2)}
.pw-actions{display:flex;flex-wrap:wrap;gap:12px;margin-top:var(--s3)}
.pw-btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;min-height:48px;padding:12px 22px;border-radius:var(--r);font-weight:700;text-decoration:none;border:1.5px solid var(--ink);transition:background var(--t-fast) var(--ease),color var(--t-fast) var(--ease),border-color var(--t-fast) var(--ease);cursor:pointer;font:inherit;font-weight:700}
.pw-btn-main{background:var(--ac);border-color:var(--ac);color:var(--on)}
.pw-btn-main:hover{background:var(--ink);border-color:var(--ink);color:var(--bg)}
.pw-btn-alt{background:transparent;color:var(--ink)}
.pw-btn-alt:hover{background:var(--ink);color:var(--bg)}
.pw-arrow{display:inline-block;transition:transform var(--t-fast) var(--ease)}
.pw-btn:hover .pw-arrow{transform:translateX(3px)}
.pw-fig{position:relative;margin:0;overflow:hidden;background:var(--sf)}
.pw-fig img{display:block;width:100%;height:100%;object-fit:cover;transition:transform var(--t-reveal) var(--ease)}
.pw-tag{position:absolute;left:8px;bottom:8px;background:rgba(15,17,20,.78);color:#fff;font-size:12px;line-height:1.3;padding:4px 8px;border-radius:2px}
.pw-hero{position:relative}
.pw-hero-split{padding:var(--s5) 0 var(--s5)}
.pw-split-grid{display:grid;grid-template-columns:1.05fr .95fr;gap:var(--s5);align-items:center}
.pw-noimg .pw-split-grid{grid-template-columns:1fr}
.pw-split-img{aspect-ratio:4/3;border-radius:var(--r)}
.pw-hero-full{min-height:min(82vh,760px);display:flex;align-items:flex-end;color:#fff;isolation:isolate}
.pw-hero-full .pw-fig{position:absolute;inset:0;z-index:-2}
.pw-shade{position:absolute;inset:0;z-index:-1;background:rgba(12,13,15,.58)}
.pw-hero-copy{padding:var(--s6) 0 var(--s5)}
html body.pw .pw-hero-full h1,.pw-hero-full .pw-sub,.pw-hero-full .pw-kicker{color:#fff}
.pw-hero-full .pw-sub{color:rgba(255,255,255,.88)}
.pw-hero-full .pw-btn-alt{color:#fff;border-color:#fff}
.pw-hero-full .pw-btn-alt:hover{background:#fff;color:var(--ink)}
.pw-hero-full .pw-tag{left:auto;right:8px;top:8px;bottom:auto}
.pw-hero-edit{padding:var(--s5) 0}
.pw-edit-grid{display:grid;grid-template-columns:1.2fr .8fr;gap:var(--s5);align-items:end}
html body.pw .pw-edit-copy h1{font-size:clamp(1.9rem,1.1rem + 4.4vw,4.6rem);max-width:14ch}
.pw-edit-img{aspect-ratio:4/5;border-radius:var(--r)}
.pw-wide-img{aspect-ratio:21/8;max-height:560px;width:100%}
.pw-wide-copy{display:grid;grid-template-columns:1fr 1fr;gap:var(--s5);padding:var(--s4) 0 var(--s5);align-items:end}
.pw-band{background:var(--sf);border-block:1px solid var(--ln)}
.pw-band-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:var(--s4);padding:var(--s4) 0}
.pw-band p{margin:0}
.pw-strong{font-size:1.3rem;font-weight:700;text-decoration:none}
.pw-sec{padding:var(--s6) 0}
.pw-alt{background:var(--sf)}
.pw-head2{display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:var(--s2);margin-bottom:var(--s3)}
html body.pw .pw-head2 h2{margin:0}
.pw-svcs{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(2,1fr);column-gap:var(--s5)}
.pw-svc{display:flex;gap:var(--s2);padding:var(--s3) 0;border-top:1px solid var(--ln)}
.pw-svc p{margin:0;color:var(--mu)}
.pw-ico{flex:none;width:28px;height:28px;color:var(--ac);margin-top:2px}
.pw-svg{width:28px;height:28px}
.pw-svcs-raeume{grid-template-columns:1fr}
.pw-svcs-raeume .pw-svc{display:grid;grid-template-columns:28px minmax(0,1fr);padding:var(--s3) 0}
html body.pw .pw-svcs-raeume h3{font-size:1.45rem}
.pw-steps{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:var(--s3);counter-reset:s}
.pw-steps li{counter-increment:s;border-top:2px solid var(--ink);padding-top:var(--s2)}
.pw-steps li::before{content:counter(s);display:block;font-family:${display};font-weight:700;color:var(--ac);margin-bottom:6px}
.pw-steps p{color:var(--mu);margin:0}
.pw-gal{display:grid;gap:var(--s2)}
.pw-gal-3{grid-template-columns:2fr 1fr;grid-template-rows:1fr 1fr}
.pw-gal-3 .pw-fig:first-child{grid-row:span 2}
.pw-gal-2{grid-template-columns:3fr 2fr}
.pw-gal-1 .pw-gal-img{aspect-ratio:21/9;min-height:0;width:100%}
.pw-gal-img{min-height:240px;border-radius:var(--r)}
.pw-gal .pw-fig:hover img{transform:scale(1.025)}
.pw-q{border-top:1px solid var(--ln)}
.pw-qs{cursor:pointer;padding:18px 0;font-weight:700;list-style-position:outside;min-height:44px}
.pw-qa{color:var(--mu);padding-bottom:var(--s2)}
.pw-contact{background:var(--ink);color:var(--bg)}
html body.pw .pw-contact h2,html body.pw .pw-contact h3,html body.pw .pw-contact .pw-h3{color:var(--bg)}
.pw-contact a{color:var(--bg)}
.pw-contact-grid{display:grid;grid-template-columns:.9fr 1.1fr;gap:var(--s5);align-items:start}
.pw-lead{opacity:.88;max-width:46ch}
.pw-bigtel a{font-family:${display};font-size:clamp(1.5rem,1.2rem + 1.2vw,2rem);font-weight:${Math.min(d.weight, 800)};text-decoration:none}
.pw-hours dl{margin:0}.pw-hours dd{margin:0}
html body.pw .pw-contact .pw-muted,html body.pw .pw-contact .pw-hlabel{color:rgba(255,255,255,.82)}
.pw-form{background:var(--bg);color:var(--ink);padding:var(--s4);border-radius:var(--r)}
.pw-book{margin-top:var(--s4);padding-top:var(--s3);border-top:1px solid rgba(255,255,255,.28)}
.pw-book p{opacity:.88}
html body.pw .pw-contact .pw-btn-book{background:var(--bg);border-color:var(--bg);color:var(--ink)}
html body.pw .pw-contact .pw-btn-book:hover{background:transparent;color:var(--bg)}
.pw-form fieldset{border:0;margin:0;padding:0;display:grid;gap:var(--s2)}
.pw-preview{background:var(--sf);border-left:3px solid var(--ac);padding:12px 14px;font-size:.92rem;margin-bottom:var(--s3)}
.pw-field{display:grid;gap:6px;font-weight:600;font-size:.95rem}
.pw-pair{display:grid;grid-template-columns:1fr 1fr;gap:var(--s2)}
.pw-hint{font-size:.9rem;color:var(--mu);margin:-4px 0 0}
.pw-hp{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}
.pw-consent{display:grid;grid-template-columns:24px 1fr;gap:10px;align-items:start;font-size:.92rem}
.pw-consent input{width:22px;height:22px;margin:2px 0 0;accent-color:var(--ac)}
html body.pw .pw-form a{color:var(--ink);text-decoration:underline}
.pw-field small{font-weight:400;color:var(--mu)}
.pw-field input,.pw-field select,.pw-field textarea{font:inherit;font-weight:400;color:var(--ink);background:#fff;border:1.5px solid var(--ln);border-radius:var(--r);padding:12px 14px;min-height:48px;width:100%}
.pw-form .pw-btn{width:100%;margin-top:var(--s1)}
@media (max-width:900px){
.pw-nav,.pw-headcall{display:none}.pw-menu{display:block}
.pw-split-grid,.pw-edit-grid,.pw-wide-copy,.pw-contact-grid{grid-template-columns:1fr;gap:var(--s4)}
.pw-split-img{aspect-ratio:16/10}.pw-edit-img{aspect-ratio:16/10}
.pw-brand{font-size:.98rem}
.pw-wide-img{aspect-ratio:16/10}
.pw-hero-full{min-height:min(68svh,600px)}
.pw-hero-copy{padding:var(--s5) 0 var(--s4)}
.pw-band-grid{grid-template-columns:1fr;gap:var(--s3)}
.pw-svcs{grid-template-columns:1fr}
.pw-sec{padding:var(--s5) 0}
.pw-gal-3,.pw-gal-2{grid-template-columns:1fr;grid-template-rows:auto}.pw-gal-3 .pw-fig:first-child{grid-row:auto}
.pw-form{padding:var(--s3)}
.pw-pair{grid-template-columns:1fr}
}
@media (prefers-reduced-motion:no-preference){@supports (animation-timeline:view()){.rv{animation:pw-in linear both;animation-timeline:view();animation-range:entry 0% entry 35%}}}
@keyframes pw-in{from{transform:translateY(12px)}to{transform:none}}
@media (prefers-reduced-motion:reduce){.pw *,.pw *::before,.pw *::after{transition:none!important}html{scroll-behavior:auto}}
`;
}

export const PRAXIS_TEMPLATES: TemplateDef[] = (['service', 'projekt', 'raeume', 'garten'] as const).map((key) => ({
  id: praxisTemplateId(key),
  group: 'handwerk',
  name: `Praxis: ${PRAXIS_DIRECTIONS[key].name}`,
  description: `Feste Komposition „${PRAXIS_DIRECTIONS[key].name}“ (${PRAXIS_DIRECTIONS[key].fits}); Texte geprüft vom Modell.`,
  palettes: ['anthrazit'],
  render: (ctx: RenderContext) => renderPraxis(ctx, praxisKeyOf(praxisTemplateId(key))),
}));
