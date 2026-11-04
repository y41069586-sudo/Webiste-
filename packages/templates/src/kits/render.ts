import { esc } from '../html';
import { documentShell } from '../partials/shared';
import type { RenderContext } from '../types';
import { kitFontCss, kitFontFamily } from './fonts';
import type { Kit, KitColors } from './kits';

/**
 * Rendert eine Seite nach Gestaltungs-Kit. Jedes Kit hat einen EIGENEN Seitenaufbau (Hero, Raster, Reihenfolge,
 * Signatur) – nicht dieselbe Vorlage in anderen Farben. Gemeinsam sind nur die Inhaltsbausteine und die Regeln:
 * Branchenreihenfolge, Beispiel-Kennzeichnung im Entwurf (§ 5 UWG), kein JavaScript.
 */
export function renderKit(ctx: RenderContext, kit: Kit): string {
  const b = blocks(ctx, kit);
  const layouts: Record<string, () => string> = {
    'kit-maler': () => layoutMaler(b),
    'kit-fliesen': () => layoutFliesen(b),
    'kit-elektro': () => layoutElektro(b),
    'kit-reinigung': () => layoutReinigung(b),
    'kit-beauty': () => layoutBeauty(b),
    'kit-gastro': () => layoutGastro(b),
  };
  const main = (layouts[kit.id] ?? layouts['kit-maler']!)();
  const p = ctx.parts;
  const footer = p.footer({ className: 'k-footer', linkClass: 'k-link' });
  const body = `${main}${footer}${b.bar}`;
  const colors: KitColors = kit.variants[ctx.palette] ?? Object.values(kit.variants)[0]!;
  return documentShell(p, `k ${kit.id}`, body).replace(
    '</head>',
    `<style>${kitFontCss([kit.display, kit.text])}${baseCss(kit, colors)}${LAYOUT_CSS[kit.id] ?? ''}</style></head>`,
  );
}

type Blocks = ReturnType<typeof blocks>;

/** Inhaltsbausteine (Text, Buttons, Formulare) – ohne Layout. */
function blocks(ctx: RenderContext, kit: Kit) {
  const { facts: f, content: c, parts: p } = ctx;
  const draft = p.draft;
  const photos = p.photos(3);
  const call = p.callHref && p.phoneLabel ? { href: p.callHref, label: p.phoneLabel } : null;
  // Eine Überschrift, die nur „Gewerk in Stadt“ wiederholt, ersetzt der Firmenname (die Zeile darüber sagt es schon)
  const raw = c.hero_headline.trim();
  const generic =
    !raw ||
    raw.toLocaleLowerCase('de').includes(f.branchLabel.toLocaleLowerCase('de')) ||
    raw.toLocaleLowerCase('de') === `${f.branchLabel} in ${f.city}`.toLocaleLowerCase('de');
  const headline = generic ? f.name : raw;
  const services = c.services.slice(0, 6);

  const img = (i: number, cls: string, sizes: string, label = true) => {
    const ph = photos[i];
    if (!ph) return '';
    const size = ph.width && ph.height ? ` width="${ph.width}" height="${ph.height}"` : '';
    const pos = ph.focalPoint ? ` style="object-position:${ph.focalPoint.x}% ${ph.focalPoint.y}%"` : '';
    return `<figure class="k-fig ${cls}"><img src="${esc(ph.src)}" alt="${esc(ph.alt)}"${size}${pos} sizes="${sizes}" ${i === 0 ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">${ph.example && label ? '<figcaption>Symbolbild</figcaption>' : ''}</figure>`;
  };

  const anfrage =
    kit.primary === 'appointment' ? 'Termin anfragen' : kit.primary === 'reserve' ? 'Tisch reservieren' : 'Anfrage mit Fotos';
  const btnCall = call ? `<a class="k-btn k-btn-primary" href="${esc(call.href)}">${esc(call.label)} anrufen</a>` : '';
  const btnAnfrage = (primary: boolean) =>
    `<a class="k-btn ${primary ? 'k-btn-primary' : 'k-btn-ghost'}" href="#anfrage">${anfrage}</a>`;
  const ctas =
    kit.primary === 'call'
      ? `<div class="k-ctas">${btnCall || btnAnfrage(true)}${call ? btnAnfrage(false) : ''}</div>`
      : kit.primary === 'reserve'
        ? `<div class="k-ctas">${btnAnfrage(true)}<a class="k-btn k-btn-ghost" href="#speisekarte">Speisekarte</a></div>`
        : `<div class="k-ctas">${btnAnfrage(true)}${call ? `<a class="k-btn k-btn-ghost" href="${esc(call.href)}">Anrufen</a>` : ''}</div>`;

  const hours = f.openingLines.length
    ? f.openingLines.map((l) => `<div><dt>${esc(l.label)}</dt><dd>${esc(l.value)}</dd></div>`).join('')
    : '<div><dt>Öffnungszeiten</dt><dd>noch nicht bestätigt</dd></div>';
  const facts = `<dl class="k-facts">${f.openingLines[0] ? `<div><dt>Geöffnet</dt><dd>${esc(f.openingLines[0].label)} ${esc(f.openingLines[0].value)}</dd></div>` : ''}<div><dt>Adresse</dt><dd>${p.addressLines}</dd></div>${call ? `<div><dt>Telefon</dt><dd><a href="${esc(call.href)}">${esc(call.label)}</a></dd></div>` : ''}</dl>`;
  const owner = draft
    ? `<div class="k-owner"><div class="k-owner-slot" aria-hidden="true">${esc(initials(f.name))}</div><p><b>Hier steht Ihr Foto.</b> Kunden wollen sehen, wer kommt. Wir setzen es nach der Übernahme ein.</p></div>`
    : '';
  const kicker = `<p class="k-kicker">${esc(f.branchLabel)} in ${esc(f.city)}</p>`;
  const longest = Math.max(...headline.split(/\s+/).map((w) => w.length));
  const h1Cls = longest > 12 || headline.length > 26 ? 'k-h1 k-h1-long' : 'k-h1';
  const h1 = `<h1 class="${h1Cls}">${esc(headline)}</h1>`;
  const lead = c.hero_subline ? `<p class="k-lead">${esc(c.hero_subline)}</p>` : '';
  const note = draft ? p.servicesNote('k-note') : '';
  const head = (id: string, title: string, extra = '') => `<div class="k-sec-head"><h2 id="${id}">${title}</h2>${extra}</div>`;

  const list = `<ul class="k-list">${services.map((s) => `<li><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p></li>`).join('')}</ul>`;
  const tiles = `<ul class="k-tiles">${services.map((s) => `<li><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p></li>`).join('')}</ul>`;
  const prices = `<ul class="k-prices">${services.map((s) => `<li><div class="k-pname"><h3>${esc(s.title)}</h3><span class="k-dots" aria-hidden="true"></span><span class="k-pval">${draft ? 'Preis folgt' : 'auf Anfrage'}</span></div><p>${esc(s.text)}</p></li>`).join('')}</ul>${draft ? '<p class="k-note">Ihre Preisliste mit Dauer je Behandlung tragen wir nach der Übernahme ein. Online ist sie Pflicht (§ 12 PAngV).</p>' : ''}`;
  const karte = `<div class="k-karte"><div class="k-karte-in"><p class="k-karte-title">${draft ? 'Beispiel-Speisekarte' : 'Karte'}</p>${services.map((s) => `<div class="k-karte-row"><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p></div>`).join('')}</div>${draft ? '<p class="k-note">Hier steht Ihre Speisekarte als echte Seite, nicht als PDF: Gerichte, Preise, Allergene und vegetarische Angebote. Wir übernehmen sie aus Ihrer aktuellen Karte.</p>' : ''}</div>`;

  const steps: [string, string][] | null =
    kit.group !== 'handwerk' || !draft
      ? null
      : kit.id === 'kit-reinigung'
        ? [
            ['Anfrage', 'Anruf oder Formular, mit Fläche und gewünschtem Rhythmus.'],
            ['Besichtigung', 'Vor Ort klären, was regelmäßig und was einmalig anfällt.'],
            ['Angebot', 'Schriftlich, mit Turnus und festem Preis pro Einsatz.'],
            ['Start', 'Zum vereinbarten Termin.'],
          ]
        : [
            ['Anfrage', 'Anruf oder Formular, gern mit Fotos.'],
            ['Rückruf', 'Umfang und Terminwunsch kurz besprechen.'],
            ['Besichtigung', 'Vor Ort ansehen und genau aufnehmen.'],
            ['Angebot', 'Schriftlich, vor Beginn der Arbeiten.'],
          ];
  const stepsHtml = (cls = 'k-steps') =>
    steps
      ? `<ol class="${cls}">${steps.map(([t, d]) => `<li><h3>${t}</h3><p>${d}</p></li>`).join('')}</ol><p class="k-note">Beispielablauf, wir passen ihn an Ihren Betrieb an.</p>`
      : '';

  const turnus = (() => {
    if (!services.length) return '';
    const plan = [
      [1, 0, 1, 0, 1, 0],
      [0, 1, 0, 0, 1, 0],
      [0, 0, 0, 0, 0, 1],
    ];
    return `<table class="k-turnus"><caption class="sr-only">Beispiel-Wochenplan</caption><thead><tr><th scope="col">Beispielplan</th>${['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'].map((d) => `<th scope="col">${d}</th>`).join('')}</tr></thead><tbody>${services
      .slice(0, 3)
      .map(
        (s, i) =>
          `<tr><th scope="row">${esc(s.title)}</th>${plan[i]!.map((d) => `<td class="${d ? 'k-on' : 'k-off'}"><span class="sr-only">${d ? 'ja' : 'nein'}</span></td>`).join('')}</tr>`,
      )
      .join('')}</tbody></table>`;
  })();

  const frames = draft
    ? `<div class="k-frames">${['Vorher / nachher', 'Projekt', 'Projekt', 'Detail'].map((t) => `<div class="k-frame">${t}</div>`).join('')}</div>`
    : '';
  const projekte =
    draft && kit.group === 'handwerk'
      ? `<section id="projekte" class="k-sec" aria-labelledby="k-p"><div class="k-wrap">${head('k-p', 'Ihre Projekte', '<p class="k-note">Vorher und nachher wirkt stärker als jeder Text. Dieser Platz ist für Fotos Ihrer eigenen Arbeiten vorgesehen.</p>')}${frames}</div></section>`
      : '';
  const aboutText = `${p.about('k-p')}${draft ? '<p class="k-note">Hier ergänzen wir Ihre belegten Angaben, zum Beispiel Meisterbrief, Ausbildung oder Gründungsjahr. Wir schreiben nur, was stimmt.</p>' : ''}`;
  const faq = c.faq.length
    ? `<div class="k-faq">${p.faqList({ itemClass: 'k-q', summaryClass: 'k-qs', answerClass: 'k-qa' })}</div>`
    : '';

  const fields =
    kit.group === 'beauty'
      ? `<label>Behandlung<select name="behandlung">${services.map((s) => `<option>${esc(s.title)}</option>`).join('')}<option>Etwas anderes</option></select></label><div class="k-two"><label>Wunschtag<input type="text" name="tag" placeholder="z. B. Donnerstag"></label><label>Uhrzeit<select name="zeit"><option>Vormittags</option><option>Nachmittags</option><option>Abends</option></select></label></div>`
      : kit.group === 'gastronomie'
        ? `<div class="k-two"><label>Datum<input type="text" name="datum" placeholder="z. B. Samstag, 14.11."></label><label>Uhrzeit<input type="text" name="uhrzeit" placeholder="z. B. 19 Uhr"></label></div><label>Personen<select name="personen"><option>2</option><option>3</option><option>4</option><option>5–6</option><option>mehr</option></select></label>`
        : `<fieldset class="k-chips"><legend>Was soll gemacht werden?</legend>${services
            .slice(0, 5)
            .map((s) => `<label><input type="checkbox" name="art[]" value="${esc(s.title)}"> ${esc(s.title)}</label>`)
            .join(
              '',
            )}</fieldset><div class="k-two"><label>Umfang<input type="text" name="umfang" placeholder="z. B. 2 Zimmer, 40 m²"></label><label>Wann?<select name="zeitraum"><option>So bald wie möglich</option><option>In 2–4 Wochen</option><option>In 1–3 Monaten</option><option>Noch offen</option></select></label></div><label>Fotos <small>optional</small><input type="file" name="fotos" accept="image/*" multiple></label>`;
  const formNote =
    kit.group === 'beauty'
      ? 'Terminanfrage, keine verbindliche Buchung. Sie bekommen eine Bestätigung.'
      : kit.group === 'gastronomie'
        ? 'Reservierungsanfrage. Sie bekommen eine Bestätigung.'
        : 'Je genauer, desto schneller kommt Ihr Angebot.';
  const form = draft
    ? `<form class="k-form" action="#" method="post" onsubmit="return false" aria-describedby="k-form-hint">${fields}<div class="k-two"><label>Name<input type="text" name="name" autocomplete="name"></label><label>Telefon<input name="tel" type="tel" autocomplete="tel"></label></div><button class="k-btn k-btn-primary" type="submit">${kit.group === 'beauty' ? 'Termin anfragen' : kit.group === 'gastronomie' ? 'Reservierung anfragen' : 'Anfrage senden'}</button><p id="k-form-hint" class="k-note">Vorschau: So erreichen Ihre Kunden Sie. Im Entwurf verschickt das Formular nichts.</p></form>`
    : p.contactSection({
        sectionClass: 'k-live-form',
        cardClass: 'k-live-card',
        titleClass: 'k-live-title',
        buttonClass: 'k-btn k-btn-primary',
        inputClass: 'k-input',
        mutedClass: 'k-note',
        iconClass: 'k-ico',
        keepInline: true,
      });
  const kontaktTitle =
    kit.group === 'gastronomie'
      ? 'Reservieren und Anfahrt'
      : kit.group === 'beauty'
        ? 'Termin und Anfahrt'
        : 'Anfrage und Kontakt';
  const kontaktInfo = `<div id="oeffnungszeiten" class="k-kinfo"><h2 id="k-k">${kontaktTitle}</h2><p class="k-lead">${formNote}</p>${call ? `<p class="k-bigtel"><a href="${esc(call.href)}">${esc(call.label)}</a></p>` : ''}<p class="k-addr">${p.addressLines}<br><a href="${esc(p.mapsHref)}" target="_blank" rel="noopener noreferrer">Route planen</a></p><h3 class="k-hours-t">Öffnungszeiten</h3><dl class="k-hours">${hours}</dl></div>`;
  const kontakt = `<section id="anfrage" class="k-sec k-kontakt" aria-labelledby="k-k"><div class="k-wrap k-kontakt-in">${kontaktInfo}${form}</div></section>`;

  const header = (cls = '') =>
    `<header class="k-head ${cls}"><div class="k-wrap k-head-in"><a class="k-mark" href="#inhalt">${esc(f.name)}<small>${esc(f.branchLabel)} · ${esc(f.city)}</small></a>${call ? `<a class="k-head-tel" href="${esc(call.href)}">${esc(call.label)}</a>` : ''}</div></header>`;
  const bar =
    !p.isDemo && (call || kit.primary !== 'call')
      ? `<nav class="k-bar" aria-label="Schnellkontakt">${call ? `<a class="k-btn k-btn-primary" href="${esc(call.href)}">Anrufen</a>` : ''}<a class="k-btn k-btn-ghost" href="${kit.primary === 'reserve' ? '#speisekarte' : '#anfrage'}">${kit.primary === 'reserve' ? 'Speisekarte' : kit.primary === 'appointment' ? 'Termin' : 'Anfrage'}</a></nav>`
      : '';

  return {
    f,
    c,
    p,
    kit,
    draft,
    call,
    headline,
    h1Cls,
    services,
    img,
    ctas,
    facts,
    owner,
    kicker,
    h1,
    lead,
    note,
    head,
    list,
    tiles,
    prices,
    karte,
    stepsHtml,
    turnus,
    projekte,
    aboutText,
    faq,
    kontakt,
    header,
    bar,
  };
}

const sec = (id: string, labelId: string, inner: string, cls = '') =>
  `<section id="${id}" class="k-sec ${cls}" aria-labelledby="${labelId}"><div class="k-wrap">${inner}</div></section>`;

/** Maler „Farbfächer“: Schrift trägt die Seite, Bild hoch rechts, Farbfächer als Trenner. */
function layoutMaler(b: Blocks): string {
  const swatches: [string, string, string, string][] = [
    ['#F2F0EA', 'Kalkweiß', 'ruhig, für Altbau', ''],
    ['#D9CFBF', 'Leinen', 'warm, für Flure', ''],
    ['#9DA88F', 'Salbei', 'Schlafzimmer', ''],
    ['#C8963E', 'Ocker', 'Akzentwand', ''],
    ['#566C7C', 'Taubenblau', 'Bad, Küche', '#fff'],
    ['#9B4A36', 'Ziegel', 'Sockel', '#fff'],
    ['#2E3236', 'Graphit', 'Türen, Rahmen', '#fff'],
  ];
  const faecher = `<div class="k-wrap k-sig"><ul class="k-faecher" aria-label="Beispiel-Farbtöne">${swatches.map(([bg, n, t, col]) => `<li style="background:${bg}${col ? `;color:${col}` : ''}"><b>${n}</b>${t}</li>`).join('')}</ul><p class="k-note">Beispiel-Farbtöne.</p></div>`;
  return `${b.header()}<main id="inhalt"><section class="k-hero" aria-label="Start"><div class="k-wrap k-hero-in"><div class="k-hero-text">${b.kicker}${b.h1}${b.lead}${b.ctas}${b.facts}${b.owner}</div>${b.img(0, 'k-hero-fig', '(min-width: 900px) 42vw, 100vw')}</div></section>${faecher}
${sec('leistungen', 'k-l', `${b.head('k-l', 'Was wir für Sie machen', b.note)}${b.list}`)}
${b.stepsHtml() ? sec('ablauf', 'k-a', `<div class="k-split"><div><h2 id="k-a">So läuft Ihr Auftrag</h2>${b.stepsHtml()}</div>${b.img(1, 'k-side-fig', '(min-width: 900px) 40vw, 100vw')}</div>`) : ''}
${b.projekte}${sec('ueber-uns', 'k-b', `<div class="k-split"><h2 id="k-b">Aus ${esc(b.f.city)}</h2><div>${b.aboutText}</div></div>`)}
${b.faq ? sec('fragen', 'k-f', `${b.head('k-f', 'Häufige Fragen')}${b.faq}`) : ''}${b.kontakt}</main>`;
}

/** Fliesen „Fugenraster“: Foto über die ganze Breite, Text als Fliese darüber, alles im Fugenraster. */
function layoutFliesen(b: Blocks): string {
  return `${b.header('k-head-wide')}<main id="inhalt"><section class="k-hero" aria-label="Start">${b.img(0, 'k-hero-fig', '100vw')}<div class="k-wrap"><div class="k-tile-hero">${b.kicker}${b.h1}${b.lead}${b.ctas}</div><div class="k-tilefacts">${b.facts}</div>${b.owner}</div></section>
${sec('leistungen', 'k-l', `${b.head('k-l', 'Leistungen', b.note)}${b.tiles}`)}
${b.stepsHtml() ? sec('ablauf', 'k-a', `${b.head('k-a', 'Vom ersten Anruf bis zur fertigen Fuge')}${b.stepsHtml('k-steps k-steps-row')}`) : ''}
${b.projekte}${sec('ueber-uns', 'k-b', `<div class="k-split">${b.img(1, 'k-side-fig', '(min-width: 900px) 40vw, 100vw')}<div><h2 id="k-b">Der Betrieb</h2>${b.aboutText}</div></div>`)}
${b.faq ? sec('fragen', 'k-f', `${b.head('k-f', 'Fragen vor dem Termin')}${b.faq}`) : ''}${b.kontakt}</main>`;
}

/** Elektro „Schaltlinie“: dunkel, feste Seitenleiste mit Kontakt, Inhalt hängt an einer durchlaufenden Leitung. */
function layoutElektro(b: Blocks): string {
  const node = (id: string, label: string, inner: string) =>
    `<section id="${id}" class="k-node" aria-labelledby="${id}-t"><h2 id="${id}-t">${label}</h2>${inner}</section>`;
  return `<main id="inhalt" class="k-board"><aside class="k-panel" aria-label="Kontakt"><a class="k-mark" href="#inhalt">${esc(b.f.name)}<small>${esc(b.f.branchLabel)} · ${esc(b.f.city)}</small></a>${b.call ? `<a class="k-paneltel" href="${esc(b.call.href)}">${esc(b.call.label)}</a>` : ''}${b.ctas}${b.facts}</aside><div class="k-line">
<section class="k-hero" aria-label="Start">${b.img(0, 'k-hero-fig', '(min-width: 900px) 60vw, 100vw')}${b.kicker}${b.h1}${b.lead}${b.owner}</section>
${node('leistungen', 'Leistungen', `${b.note}${b.list}`)}
${b.stepsHtml() ? node('ablauf', 'Ablauf', b.stepsHtml('k-steps k-schalt')) : ''}
${b.draft ? node('projekte', 'Ihre Projekte', `<p class="k-note">Platz für Fotos Ihrer eigenen Arbeiten.</p>${'<div class="k-frames">' + ['Verteiler', 'Installation', 'Projekt'].map((t) => `<div class="k-frame">${t}</div>`).join('') + '</div>'}`) : ''}
${node('ueber-uns', 'Der Betrieb', b.aboutText)}
${b.faq ? node('fragen', 'Häufige Fragen', b.faq) : ''}
</div></main>${b.kontakt}`;
}

/** Reinigung „Turnus“: hell und ruhig, der Wochenplan ist das Hauptmotiv, Foto als breites Band. */
function layoutReinigung(b: Blocks): string {
  return `${b.header()}<main id="inhalt"><section class="k-hero" aria-label="Start"><div class="k-wrap k-hero-in"><div class="k-hero-text">${b.kicker}${b.h1}${b.lead}${b.ctas}${b.facts}</div>${b.draft && b.turnus ? `<div class="k-plan">${b.turnus}<p class="k-note">Beispiel für einen Reinigungsplan. Ihre echten Rhythmen tragen wir nach der Übernahme ein.</p></div>` : b.img(0, 'k-hero-fig', '(min-width: 900px) 45vw, 100vw')}</div></section>
${b.draft ? b.img(0, 'k-band', '100vw') : ''}
${sec('leistungen', 'k-l', `${b.head('k-l', 'Was regelmäßig sauber wird', b.note)}${b.list}`, 'k-sec-cols')}
${b.stepsHtml() ? sec('ablauf', 'k-a', `${b.head('k-a', 'So beginnt die Zusammenarbeit')}${b.stepsHtml('k-steps k-steps-row')}`) : ''}
${sec('ueber-uns', 'k-b', `<div class="k-split"><div><h2 id="k-b">Ihr Ansprechpartner</h2>${b.owner}</div><div>${b.aboutText}</div></div>`)}
${b.faq ? sec('fragen', 'k-f', `${b.head('k-f', 'Häufige Fragen')}${b.faq}`) : ''}${b.kontakt}</main>`;
}

/** Beauty „Preisliste“: Magazin-Aufbau, Foto randlos über die halbe Seite, Preisliste als schmale Salonkarte. */
function layoutBeauty(b: Blocks): string {
  return `${b.header('k-head-center')}<main id="inhalt"><section class="k-hero" aria-label="Start">${b.img(0, 'k-hero-fig', '(min-width: 900px) 50vw, 100vw')}<div class="k-hero-text">${b.kicker}<h1 class="${b.f.name.length > 22 ? 'k-h1 k-h1-long' : 'k-h1'}">${esc(b.f.name)}</h1>${b.headline !== b.f.name ? `<p class="k-claim">${esc(b.headline)}</p>` : ''}${b.lead}${b.ctas}${b.facts}</div></section>
<section id="leistungen" class="k-sec" aria-labelledby="k-l"><div class="k-narrow"><h2 id="k-l" class="k-center">Behandlungen</h2>${b.note}${b.prices}</div></section>
${b.img(1, 'k-band', '100vw')}
${sec('ueber-uns', 'k-b', `<div class="k-split"><h2 id="k-b">Über das Studio</h2><div>${b.aboutText}</div></div>`)}
${b.faq ? sec('fragen', 'k-f', `<div class="k-narrow"><h2 id="k-f" class="k-center">Vor dem ersten Termin</h2>${b.faq}</div>`) : ''}${b.kontakt}</main>`;
}

/** Gastro „Karte“: Foto randlos, Name groß darunter, Speisekarte wie eine gedruckte Karte. */
function layoutGastro(b: Blocks): string {
  return `${b.header('k-head-over')}<main id="inhalt"><section class="k-hero" aria-label="Start">${b.img(0, 'k-hero-fig', '100vw')}<div class="k-wrap k-hero-band"><div><h1 class="${b.f.name.length > 22 ? 'k-h1 k-h1-long' : 'k-h1'}">${esc(b.f.name)}</h1>${b.kicker}${b.headline !== b.f.name ? `<p class="k-claim">${esc(b.headline)}</p>` : ''}${b.lead}${b.ctas}</div>${b.facts}</div></section>
<section id="speisekarte" class="k-sec" aria-labelledby="k-l"><div class="k-narrow"><h2 id="k-l" class="k-center">Auf der Karte</h2>${b.note}${b.karte}</div></section>
${b.img(1, 'k-band', '100vw')}
${b.kontakt}
${sec('ueber-uns', 'k-b', `<div class="k-split"><h2 id="k-b">Über uns</h2><div>${b.aboutText}</div></div>`)}
${b.faq ? sec('fragen', 'k-f', `<div class="k-narrow"><h2 id="k-f" class="k-center">Gut zu wissen</h2>${b.faq}</div>`) : ''}</main>`;
}

function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter((w) => /^[A-Za-zÄÖÜäöü]/.test(w))
      .slice(0, 2)
      .map((w) => w[0]!.toUpperCase())
      .join('') || '•'
  );
}

/** Gemeinsame Grundregeln (Farbrollen, Schriftpaar, Formulare, FAQ) – Layout kommt je Kit dazu. */
function baseCss(kit: Kit, k: KitColors): string {
  const display = `'${kitFontFamily(kit.display)}',Georgia,serif`;
  const text = `'${kitFontFamily(kit.text)}',system-ui,sans-serif`;
  const stretch = kit.stretch ? `font-stretch:${kit.stretch}%;` : '';
  const r = `${kit.radius}px`;
  return `
body.k{margin:0;background:${k.base};color:${k.ink};font:400 1.0625rem/1.6 ${text};--k-base:${k.base};--k-surface:${k.surface};--k-ink:${k.ink};--k-muted:${k.muted};--k-line:${k.line};--k-accent:${k.accent};--k-on:${k.onAccent};--k-r:${r};--k-display:${display};--k-text:${text};--k-weight:${kit.weight}}
.k *{box-sizing:border-box}.k main img{display:block;max-width:100%;height:auto}.k main a,.k-head a{color:inherit}
.k :focus-visible{outline:3px solid var(--k-accent);outline-offset:3px}
.k-wrap{max-width:1180px;margin:0 auto;padding:0 20px}
.k main h1,.k main h2,.k main h3,.k main p,.k main figure,.k main dl,.k main dd{margin:0}
.k main h1,.k main h2,.k-mark{font-family:${display};font-weight:${kit.weight};${stretch}line-height:${kit.leading};letter-spacing:-.01em;overflow-wrap:break-word;hyphens:auto}
.k main h2{font-size:clamp(2rem,5.5vw,3.4rem)}
.k main h3{font-family:${display};${kit.stretch ? `font-stretch:${Math.min(100, kit.stretch + 16)}%;` : ''}font-weight:${Math.min(800, kit.weight)};font-size:1.3rem;line-height:1.15}
.k-h1{font-size:clamp(2.7rem,10vw,6.4rem)}.k main .k-h1-long{font-size:clamp(2.1rem,7.4vw,4.4rem)!important}
.k .sw-demo-buy{white-space:nowrap}.k .sw-demo-toolbar,.k .sw-demo-context{font-size:15px}
.k-note{color:var(--k-muted);font-size:.9rem;margin-top:10px!important;max-width:44em}
.k-kicker{color:var(--k-muted);font-size:1rem;margin-bottom:14px!important}
.k-lead{font-size:1.14rem;max-width:34em;margin-top:18px!important}
.k-claim{font-size:1.25rem;font-weight:700;margin-top:14px!important}
.k-btn{display:inline-flex;align-items:center;justify-content:center;min-height:52px;padding:0 22px;border-radius:${r};font:700 1.02rem/1.1 ${text};text-decoration:none;border:2px solid var(--k-ink);cursor:pointer;text-align:center}
.k-btn-primary{background:var(--k-accent);border-color:var(--k-accent);color:var(--k-on)!important}
.k-btn-ghost{background:transparent;color:var(--k-ink)}
.k-ctas{display:flex;flex-wrap:wrap;gap:10px;margin-top:24px}
.k-head-in{display:flex;align-items:center;justify-content:space-between;gap:16px;padding-top:18px;padding-bottom:18px;border-bottom:1px solid var(--k-line)}
.k-mark{font-size:1.45rem;line-height:1.15!important;text-decoration:none;max-width:70%;display:block}
.k-mark small{display:block;font:400 .8rem/1.35 ${text};color:var(--k-muted);margin-top:3px;letter-spacing:0}
.k-head-tel{font-weight:700;text-decoration:none;white-space:nowrap}
.k-facts{display:grid;gap:12px 22px;margin-top:24px!important;padding-top:18px;border-top:1px solid var(--k-line);font-size:.95rem}
.k-facts dt,.k-hours dt{font-size:.82rem;font-weight:700;color:var(--k-muted)}
.k-owner{display:flex;gap:14px;align-items:center;margin-top:22px;padding:14px;border:1px dashed var(--k-muted);border-radius:${r};max-width:440px}
.k-owner-slot{flex:0 0 60px;height:60px;border-radius:50%;background:var(--k-surface);display:grid;place-items:center;font:800 1.2rem/1 ${display};color:var(--k-muted)}
.k-owner p{font-size:.92rem;line-height:1.45}
.k-fig{position:relative;margin:0}.k-fig img{width:100%;object-fit:cover}
.k-fig figcaption{position:absolute;left:10px;top:10px;background:rgba(0,0,0,.72);color:#fff;font-size:.75rem;padding:3px 7px;border-radius:2px}
.k-band img{width:100%;aspect-ratio:16/9;object-fit:cover;margin-top:72px}
.k-sec{padding-top:72px}.k-sec-head{display:grid;gap:6px;margin-bottom:26px}
.k-split{display:grid;gap:24px;grid-template-columns:minmax(0,1fr)}
.k-narrow{max-width:760px;margin:0 auto;padding:0 20px}.k-center{text-align:center;margin-bottom:22px!important}
.k-p{margin-bottom:12px!important;max-width:40em}
.k-list{list-style:none;margin:0;padding:0;border-top:2px solid var(--k-ink)}
.k-list li{padding:18px 0;border-bottom:1px solid var(--k-line)}.k-list p{color:var(--k-muted);margin-top:6px!important;max-width:42em}
.k-steps{list-style:none;margin:22px 0 0;padding:0;counter-reset:s}
.k-steps li{counter-increment:s;display:grid;grid-template-columns:52px minmax(0,1fr);gap:2px 14px;padding:16px 0;border-bottom:1px solid var(--k-line)}
.k-steps li::before{content:counter(s);grid-row:span 2;font:${kit.weight} 2.4rem/1 ${display};${stretch}color:var(--k-accent)}
.k-steps p{color:var(--k-muted)}
.k-frames{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.k-frame{aspect-ratio:4/3;border:1px dashed var(--k-muted);border-radius:${r};display:flex;align-items:flex-end;padding:10px;font-size:.85rem;color:var(--k-muted)}
.k-faq{max-width:820px;border-top:1px solid var(--k-line)}
.k-q{border-bottom:1px solid var(--k-line)}.k-qs{cursor:pointer;list-style:none;padding:18px 36px 18px 0;font-weight:700;position:relative}
.k-qs::-webkit-details-marker{display:none}.k-qs::after{content:"+";position:absolute;right:4px;top:12px;font:400 1.6rem/1 ${display};color:var(--k-accent)}
.k-q[open] .k-qs::after{content:"–"}.k-qa{padding:0 0 18px;color:var(--k-muted);max-width:44em}
.k-kontakt{margin-top:72px;padding:56px 0 64px;background:var(--k-surface)}
.k-kontakt-in{display:grid;gap:36px;grid-template-columns:minmax(0,1fr)}
.k-bigtel{font:${kit.weight} clamp(1.8rem,6vw,2.6rem)/1.1 ${display};${stretch}margin-top:18px!important}.k-bigtel a{text-decoration:none}
.k-addr{margin-top:14px!important}.k-hours-t{margin-top:24px!important;margin-bottom:6px!important}
.k-hours div{display:flex;justify-content:space-between;gap:16px;padding:6px 0;border-bottom:1px solid var(--k-line)}.k-hours dt{color:var(--k-ink)}
.k-form{display:grid;gap:16px;background:var(--k-base);padding:22px;border-radius:${r};border:1px solid var(--k-line)}
.k-form label{display:grid;gap:6px;font-weight:700;font-size:.95rem}.k-form small{font-weight:400;color:var(--k-muted)}
.k-form input,.k-form select,.k-input{font:400 1rem/1.4 ${text};color:#1b1e21;background:#fbfaf7;border:1px solid #858b90;border-radius:${r};padding:12px;min-height:48px;width:100%}
.k-two{display:grid;gap:16px}
.k-chips{border:0;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:8px}.k-chips legend{font-weight:700;margin-bottom:8px}
.k-chips label{display:inline-flex;align-items:center;gap:8px;font-weight:400;border:1px solid var(--k-muted);border-radius:${r};padding:10px 12px;min-height:44px;cursor:pointer}
.k-chips input{width:auto;min-height:auto;accent-color:var(--k-accent)}
.k-bar{position:fixed;left:0;right:0;bottom:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(0,1fr));gap:8px;padding:10px 12px calc(10px + env(safe-area-inset-bottom));background:var(--k-base);border-top:1px solid var(--k-line);z-index:40}
.k-bar .k-btn{min-height:48px}body.k:has(.k-bar){padding-bottom:76px}
.k-live-form{margin:0}.k-live-card{background:var(--k-base);padding:22px;border-radius:${r}}.k-live-title{font:${kit.weight} 1.6rem/1.1 ${display}}
@media (min-width:900px){
  body.k{font-size:1.1rem}
  .k-facts{grid-template-columns:repeat(3,minmax(0,1fr))}
  .k-sec{padding-top:110px}.k-sec-head{grid-template-columns:minmax(0,1fr) minmax(0,1fr);align-items:end;gap:40px;margin-bottom:38px}
  .k-split{grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:56px;align-items:start}
  .k-frames{grid-template-columns:repeat(4,minmax(0,1fr))}
  .k-kontakt-in{grid-template-columns:minmax(0,.85fr) minmax(0,1.15fr);gap:64px}
  .k-two{grid-template-columns:1fr 1fr}
  .k-bar{display:none}body.k:has(.k-bar){padding-bottom:0}
}
@media (max-width:599px){.k-head-tel{display:none}.k-mark{max-width:100%}}
`;
}

/** Eigener Seitenaufbau je Kit. */
const LAYOUT_CSS: Record<string, string> = {
  'kit-maler': `
.kit-maler .k-hero-in{display:grid;gap:28px;padding-top:28px;grid-template-columns:minmax(0,1fr)}
.kit-maler .k-h1{font-size:clamp(3rem,12vw,7rem);line-height:.86}
.kit-maler .k-hero-fig img{aspect-ratio:4/5;border-radius:var(--k-r)}
.kit-maler .k-side-fig img{aspect-ratio:3/2;border-radius:var(--k-r)}
.kit-maler .k-sig{margin-top:44px}
.k-faecher{margin:0;padding:0;list-style:none;display:grid;grid-template-columns:repeat(auto-fit,minmax(84px,1fr))}
.k-faecher li{min-height:120px;padding:12px;display:flex;flex-direction:column;justify-content:flex-end;font-size:.8rem;line-height:1.3;color:#1b1e21;transform-origin:bottom left}
.k-faecher li b{font:800 1rem/1.1 var(--k-display);font-stretch:85%}
@media (prefers-reduced-motion:no-preference){.k-faecher li{animation:k-auf .7s cubic-bezier(.2,.7,.2,1) both}.k-faecher li:nth-child(2){animation-delay:.05s}.k-faecher li:nth-child(3){animation-delay:.1s}.k-faecher li:nth-child(4){animation-delay:.15s}.k-faecher li:nth-child(5){animation-delay:.2s}.k-faecher li:nth-child(6){animation-delay:.25s}.k-faecher li:nth-child(7){animation-delay:.3s}@keyframes k-auf{from{transform:rotate(-7deg) translateY(16px);opacity:0}to{transform:none;opacity:1}}}
@media (min-width:900px){.kit-maler .k-hero-in{grid-template-columns:minmax(0,1.15fr) minmax(0,.85fr);gap:56px;padding-top:48px}.kit-maler .k-hero-fig{position:sticky;top:24px}.k-faecher li{min-height:190px}}
`,
  'kit-fliesen': `
.kit-fliesen .k-head-wide .k-mark{font-stretch:118%}
.kit-fliesen .k-hero-fig img{aspect-ratio:4/3;max-height:70vh}
.kit-fliesen .k-tile-hero{position:relative;background:var(--k-base);padding:26px 0 0;border-bottom:3px solid var(--k-line)}
.kit-fliesen .k-h1{font-size:clamp(2.3rem,8vw,5.2rem);line-height:.98}
.kit-fliesen .k-tilefacts .k-facts{border-top:0;padding:3px;gap:3px;background:var(--k-line);margin-top:0!important}
.kit-fliesen .k-tilefacts .k-facts>div{background:var(--k-base);padding:16px}
.k-tiles{list-style:none;margin:0;padding:3px;display:grid;grid-template-columns:minmax(0,1fr);gap:3px;background:var(--k-line)}
.k-tiles li{background:var(--k-base);padding:22px;min-height:170px;display:flex;flex-direction:column;justify-content:flex-end}
.k-tiles p{color:var(--k-muted);margin-top:8px!important}
.kit-fliesen .k-steps-row{border-top:3px solid var(--k-line)}
.kit-fliesen .k-side-fig img{aspect-ratio:1/1}
@media (min-width:900px){
 .kit-fliesen .k-hero-fig img{aspect-ratio:21/9;max-height:none}
 .kit-fliesen .k-tile-hero{max-width:760px;padding:40px 44px 34px;border:3px solid var(--k-line);border-bottom:0}
 .kit-fliesen .k-hero-fig+.k-wrap .k-tile-hero{margin-top:-140px}
 .k-tiles{grid-template-columns:repeat(3,minmax(0,1fr))}.k-tiles li{min-height:230px}
 .kit-fliesen .k-steps-row{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:3px;background:var(--k-line);padding:3px}
 .kit-fliesen .k-steps-row li{background:var(--k-base);padding:22px;border:0;grid-template-columns:1fr}
 .kit-fliesen .k-steps-row li::before{grid-row:auto;margin-bottom:10px}
}
`,
  'kit-elektro': `
.k-board{display:grid;grid-template-columns:minmax(0,1fr);max-width:1240px;margin:0 auto}
.k-panel{padding:22px 20px;border-bottom:1px solid var(--k-line)}
.k-panel .k-mark{display:block;font-size:1.6rem}
.k-paneltel{display:block;margin-top:18px;font:var(--k-weight) clamp(1.8rem,5vw,2.4rem)/1.05 var(--k-display);text-decoration:none;color:var(--k-accent)!important}
.k-panel .k-facts{grid-template-columns:1fr!important}
.k-line{position:relative;padding:28px 20px 0 44px}
.k-line::before{content:"";position:absolute;left:20px;top:0;bottom:0;width:2px;background:var(--k-accent)}
.kit-elektro .k-hero-fig img{aspect-ratio:16/10;border-radius:var(--k-r)}
.kit-elektro .k-hero .k-kicker{margin-top:28px!important}
.kit-elektro .k-h1{font-size:clamp(2.4rem,7vw,4.8rem)}
.k-node{position:relative;padding-top:72px}
.k-node>h2{position:relative}
.k-node>h2::before{content:"";position:absolute;left:-31px;top:.35em;width:14px;height:14px;border-radius:50%;background:var(--k-base);border:3px solid var(--k-accent)}
.k-node>h2{margin-bottom:22px!important}
.k-schalt li::before{color:var(--k-accent)}
@media (min-width:900px){
 .k-board{grid-template-columns:minmax(0,340px) minmax(0,1fr)}
 .k-panel{position:sticky;top:0;align-self:start;height:100vh;overflow:auto;border-bottom:0;border-right:1px solid var(--k-line);padding:34px 28px}
 .k-line{padding:40px 40px 0 72px}.k-line::before{left:40px}.k-node>h2::before{left:-39px}
}
`,
  'kit-reinigung': `
.kit-reinigung .k-hero-in{display:grid;gap:32px;padding-top:32px;grid-template-columns:minmax(0,1fr)}
.kit-reinigung .k-h1{font-size:clamp(2.4rem,8vw,5rem)}
.k-plan{background:var(--k-surface);border-radius:var(--k-r);padding:20px}
.k-turnus{width:100%;border-collapse:collapse;table-layout:fixed;font-size:.92rem}
.k-turnus th,.k-turnus td{border-bottom:1px solid var(--k-line);padding:10px 2px;text-align:center}
.k-turnus th[scope=row],.k-turnus thead th:first-child{text-align:left;width:38%;font-weight:700;padding-right:8px;overflow-wrap:anywhere;hyphens:auto}
.k-turnus thead th{font-size:.8rem;color:var(--k-muted)}
.k-on::before{content:"";display:block;width:22px;height:22px;border-radius:50%;background:var(--k-accent);margin:auto}
.k-off::before{content:"";display:block;width:8px;height:8px;border-radius:50%;background:var(--k-line);margin:auto}
.kit-reinigung .k-band img{aspect-ratio:21/8}.kit-reinigung .k-hero-fig img{aspect-ratio:4/3;border-radius:var(--k-r)}
.kit-reinigung .k-list{border-top:0}
.kit-reinigung .k-steps-row li::before{color:var(--k-accent)}
@media (min-width:900px){
 .kit-reinigung .k-hero-in{grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:56px;align-items:center;padding-top:56px}
 .k-plan{padding:28px}
 .kit-reinigung .k-sec-cols .k-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 48px}
 .kit-reinigung .k-steps-row{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:32px}
 .kit-reinigung .k-steps-row li{border-bottom:0;border-top:2px solid var(--k-accent);grid-template-columns:1fr;padding-top:18px}
 .kit-reinigung .k-steps-row li::before{grid-row:auto;font-size:1.6rem;margin-bottom:8px}
}
`,
  'kit-beauty': `
.k-head-center .k-head-in{justify-content:center;flex-direction:column;gap:4px;text-align:center}
.k-head-center .k-mark{max-width:none;font-size:1.7rem}
.kit-beauty .k-hero{display:grid;grid-template-columns:minmax(0,1fr)}
.kit-beauty .k-hero-fig img{aspect-ratio:4/3}
.kit-beauty .k-hero-text{padding:34px 20px 0}
.kit-beauty .k-h1{font-size:clamp(3rem,11vw,6.6rem);font-weight:500}
.k-prices{list-style:none;margin:20px 0 0;padding:0;border-top:1px solid var(--k-ink)}
.k-prices li{padding:18px 0;border-bottom:1px solid var(--k-line)}
.k-pname{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 10px}.k-pname h3{flex:0 1 auto;font-weight:500!important;font-size:1.45rem!important}
.k-dots{flex:1;border-bottom:1px dotted var(--k-muted);transform:translateY(-5px);min-width:20px}
.k-pval{font-weight:700;font-size:.95rem}.k-prices p{color:var(--k-muted);margin-top:4px!important;max-width:40em}
.kit-beauty .k-band img{aspect-ratio:21/9}
@media (min-width:900px){
 .kit-beauty .k-hero{grid-template-columns:minmax(0,1fr) minmax(0,1fr);align-items:center;min-height:calc(100vh - 120px)}
 .kit-beauty .k-hero-fig img{aspect-ratio:auto;height:calc(100vh - 120px);max-height:860px}
 .kit-beauty .k-hero-text{padding:40px 56px}
 .kit-beauty .k-facts{grid-template-columns:repeat(2,minmax(0,1fr))}
}
`,
  'kit-gastro': `
.k-head-over .k-head-in{border-bottom:0}
.kit-gastro .k-hero-fig img{aspect-ratio:4/3}
.k-hero-band{display:grid;gap:24px;padding-top:28px;grid-template-columns:minmax(0,1fr)}
.kit-gastro .k-h1{font-size:clamp(3rem,12vw,7.2rem);line-height:.95}
.kit-gastro .k-kicker{margin-top:12px!important}
.k-karte{border:1px solid var(--k-ink);padding:6px}
.k-karte-in{border:1px solid var(--k-ink);padding:26px 22px}
.k-karte-title{font:400 1.6rem/1 var(--k-display);text-align:center;margin-bottom:10px!important}
.k-karte-row{padding:14px 0;border-bottom:1px dotted var(--k-muted)}.k-karte-row:last-child{border-bottom:0}.k-karte-row p{color:var(--k-muted);margin-top:4px!important}
.k-karte .k-note{padding:10px 14px 6px}
.kit-gastro .k-band img{aspect-ratio:21/9}
.kit-gastro .k-kontakt{margin-top:0}
@media (min-width:900px){
 .kit-gastro .k-hero-fig img{aspect-ratio:auto;height:54vh;min-height:380px}
 .k-hero-band{grid-template-columns:minmax(0,1.3fr) minmax(0,.7fr);gap:56px;align-items:start;padding-top:40px}
 .k-hero-band .k-facts{grid-template-columns:1fr;border-top:0;border-left:1px solid var(--k-line);padding:0 0 0 28px;margin-top:8px!important}
 .k-karte-in{padding:40px 48px}
}
`,
};
