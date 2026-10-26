import { esc } from '../html';
import { documentShell, offerSection } from '../partials/shared';
import { stockPhotos, stockPhotoDataUri } from '../photos';
import type { RenderContext } from '../types';

/** Explicit local review only. Existing template IDs and default rendering remain intact. */
export function renderMalerDesignReview(ctx: RenderContext): string {
  const { facts: f, content: c, parts: p } = ctx;
  const concepts: Record<string, 'editorial' | 'business' | 'bold'> = {
    'handwerk-klar': 'editorial',
    'handwerk-solid': 'business',
    'handwerk-werkstatt': 'bold',
  };
  const concept = concepts[ctx.templateId];
  if (!concept || f.group !== 'handwerk' || !/maler/i.test(f.branchLabel) || !['demo', 'screenshot'].includes(ctx.mode))
    throw new Error('Designprüfung nur für ausdrücklich gewählte Maler-Entwürfe.');
  const photos = stockPhotos('handwerk', 0, 'Malerbetrieb', { includeReview: true });
  const image = (role: string, cls = '') => {
    const photo = photos.find((x) => x.file.includes(role));
    return photo
      ? p.figure({ src: stockPhotoDataUri(photo), alt: photo.alt, example: true }, 'rw-img', `rw-image ${cls}`)
      : `<div class="rw-no-image">Bildmotiv noch nicht zur Verwendung freigegeben</div>`;
  };
  const arrow = `<svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 13 13 3M3 3h10v10"/></svg>`;
  const title = `<p class="rw-eyebrow">${esc(f.branchLabel)} · ${esc(f.city)}</p><h1>${esc(c.hero_headline)}</h1><p class="rw-intro">${esc(c.hero_subline)}</p>`;
  const button = `<a class="rw-button" href="#kontakt">${esc(c.cta_text)} <span aria-hidden="true">${arrow}</span></a>`;
  const header = `<header class="rw-header"><a class="rw-brand" href="#inhalt">${p.brand()}</a><nav aria-label="Hauptnavigation"><a href="#leistungen">Leistungen</a><a href="#betrieb">Betrieb</a><a href="#kontakt">Kontakt</a></nav></header>`;
  const service = (i: number) => {
    const s = c.services[i]!;
    return `<span class="rw-number">0${i + 1}</span><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p>`;
  };
  const note = p.servicesNote('rw-note');
  const facts = `<section id="betrieb" class="rw-facts"><div><p class="rw-eyebrow">Der Betrieb</p><h2>${esc(f.name)}<br>in ${esc(f.city)}</h2><div class="rw-copy">${p.about()}</div></div><div id="kontakt"><p class="rw-eyebrow">Standort &amp; Kontakt</p><p class="rw-address">${p.addressLines}</p>${p.phoneLabel ? `<a class="rw-phone" href="${esc(p.callHref)}">${esc(p.phoneLabel)}</a>` : ''}<h3>Öffnungszeiten</h3>${p.hoursList()}<a class="rw-route" href="${esc(p.mapsHref)}" target="_blank" rel="noopener noreferrer">Anfahrt bei OpenStreetMap ${arrow}</a></div></section>`;
  const faq = `<section class="rw-faq"><h2>Vor Ihrer Anfrage</h2>${p.faqList({ itemClass: 'rw-question', summaryClass: 'rw-summary', answerClass: 'rw-answer' })}</section>`;
  let business = '';
  if (concept === 'editorial')
    business = `<section class="rw-hero" data-review-hero><div class="rw-editorial-heading">${title}${button}</div><div class="rw-editorial-images">${image('maler-werkzeuge', 'rw-wide')}${image('maler-raum', 'rw-detail')}<p class="rw-image-note">Farbe. Material. Raum.<br>Illustrative Bildauswahl für diesen Entwurf.</p></div></section><section id="leistungen" class="rw-editorial-services"><div class="rw-section-heading"><p class="rw-eyebrow">Leistungsübersicht</p><h2>Was möchten Sie<br>verändern?</h2>${note}</div><div>${c.services.map((_, i) => `<article class="rw-service-line">${service(i)}</article>`).join('')}</div></section>${facts}${faq}`;
  if (concept === 'business')
    business = `<section class="rw-hero" data-review-hero><div class="rw-business-visual">${image('maler-arbeit')}<div class="rw-business-title">${title}${button}</div></div><div class="rw-business-strip"><span>${esc(f.branchLabel)}</span><span>${esc(f.city)}</span><a href="#kontakt">Kontakt &amp; Anfahrt ${arrow}</a></div></section><section id="leistungen" class="rw-business-services"><div class="rw-section-heading"><p class="rw-eyebrow">Ihr Vorhaben</p><h2>Die passende Leistung.<br>Der direkte Kontakt.</h2>${note}</div><div class="rw-business-service-list">${c.services.map((_, i) => `<article>${service(i)}<a href="#kontakt">Kontakt zum Vorhaben ${arrow}</a></article>`).join('')}</div></section>${faq}${facts}`;
  if (concept === 'bold')
    business = `<section class="rw-hero" data-review-hero><div class="rw-bold-title">${title}${button}</div><div class="rw-materials">${image('maler-werkzeuge')}${image('maler-raum')}${image('maler-arbeit')}</div></section><section id="leistungen" class="rw-bold-services"><div class="rw-section-heading"><p class="rw-eyebrow">Farbe trifft Handwerk</p><h2>Aus einer Idee<br>wird ein Vorhaben.</h2>${note}</div>${c.services.map((_, i) => `<article class="rw-service-band"><div>${service(i)}</div><a class="rw-round-link" href="#kontakt" aria-label="${esc(c.services[i]!.title)}: Kontakt ansehen">${arrow}</a></article>`).join('')}</section>${facts}${faq}`;
  const question = p
    .contactSection({
      sectionClass: 'rw-provider-question py-10',
      cardClass: 'rounded-xl border border-line p-5',
      titleClass: 'text-2xl font-semibold',
      buttonClass: 'rw-button',
      inputClass: 'block w-full rounded-lg border border-line bg-white px-3 py-3',
    })
    .replace(
      p.addressLines,
      ctx.demo
        ? `${esc(ctx.demo.sender.street)}<br>${esc(ctx.demo.sender.postalCode)} ${esc(ctx.demo.sender.city)}`
        : 'Anbieterangaben fehlen – Veröffentlichung gesperrt',
    );
  const footer = p.footer({ className: 'rw-footer', linkClass: 'underline', omitOffer: true });
  const offer = ctx.demo ? offerSection(ctx.demo, { review: true }) : '';
  const css = `
.rw{--rw-paper:#f7f6f2;--rw-ink:#1e2725;--rw-muted:#505d59;--rw-line:#d4d9d3;color:var(--rw-ink);background:var(--rw-paper);font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6}
.rw *{box-sizing:border-box}.rw main h1,.rw main h2,.rw main h3,.rw main p,.rw main figure{margin:0}.rw main h1,.rw main h2{line-height:1.08;letter-spacing:-.035em}.rw h1{font-size:clamp(36px,5vw,64px);max-width:19ch}.rw main h2{font-size:clamp(28px,3.5vw,44px)}.rw main a,.rw-header a{color:inherit}.rw-header,.rw main,.rw-provider-question{max-width:1200px;margin:auto}.rw-header{display:flex;justify-content:space-between;align-items:center;gap:24px;padding:24px;border-bottom:1px solid var(--rw-line)}.rw-brand{font-size:17px;font-weight:700;max-width:440px;text-decoration:none;line-height:1.3}.rw-header nav{display:flex;gap:24px;font-size:14px}.rw-header nav a{padding:10px 0;text-decoration:none}.rw-eyebrow{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;margin-bottom:18px!important}.rw-intro{font-size:18px;line-height:1.6;max-width:49ch;margin-top:24px!important;color:var(--rw-muted)}.rw-button{display:inline-flex;align-items:center;justify-content:space-between;gap:30px;min-height:48px;padding:14px 23px;background:#204e43;color:white!important;border:1px solid transparent;text-decoration:none;font-size:15px;font-weight:700;margin-top:26px}.rw-button span{font-size:20px}.rw-image{position:relative;overflow:hidden;background:#e5e8e2}.rw-img{display:block;width:100%;height:100%;object-fit:cover}.rw-image figcaption{position:absolute;bottom:8px;left:8px;font-size:10px;line-height:1.3;background:#172b27;color:white;padding:3px 6px;max-width:calc(100% - 16px)}.rw-note,.rw-image-note{color:var(--rw-muted);font-size:13px;line-height:1.5;margin-top:18px!important}.rw-section-heading{padding-bottom:32px}.rw-number{display:block;font-size:12px;letter-spacing:.08em;font-weight:700;margin-bottom:14px;color:var(--rw-muted)}.rw main h3{font-size:21px;line-height:1.25;margin-bottom:12px}.rw article p{color:var(--rw-muted);max-width:44ch}.rw-facts{display:grid;grid-template-columns:1.3fr 1fr;gap:100px;padding:70px 24px;border-top:1px solid var(--rw-line)}.rw-copy{margin-top:25px;max-width:54ch}.rw-copy p+p{margin-top:16px}.rw-address{font-size:20px}.rw-phone{display:inline-block;font-size:22px;margin:18px 0}.rw-facts h3{margin-top:22px}.rw-route{display:inline-block;margin-top:20px}.rw-faq{padding:55px 24px 65px;border-top:1px solid var(--rw-line)}.rw-faq h2{margin-bottom:28px}.rw-question{border-top:1px solid var(--rw-line);padding:18px 0}.rw-summary{font-weight:600;cursor:pointer;min-height:30px}.rw-answer{padding-top:16px;max-width:70ch}.rw-provider-question{display:none;border-top:3px solid #204e43;background:#fff}.rw-provider-question:target{display:block}.rw-provider-question .rw-button{background:#264be6}.rw-footer{background:#edf0ed;color:#1e2725}.rw-no-image{padding:40px;border:1px solid var(--rw-line)}
/* Editorial: offset image sequence, serif headings, open service rows. */
.rw-editorial h1,.rw-editorial h2{font-family:Georgia,'Times New Roman',serif;font-weight:400}.rw-editorial .rw-hero{padding:42px 24px 60px}.rw-editorial-heading{position:relative;padding-right:240px}.rw-editorial-heading .rw-button{position:absolute;right:0;bottom:0}.rw-editorial-images{display:grid;grid-template-columns:1.65fr 1fr;gap:28px;position:relative;margin-top:36px;padding-right:100px}.rw-editorial-images .rw-wide{height:270px}.rw-editorial-images .rw-detail{height:210px;margin-top:60px}.rw-editorial-images .rw-image-note{position:absolute;right:-10px;top:0;writing-mode:vertical-rl}.rw-editorial-services{display:grid;grid-template-columns:.9fr 1.4fr;gap:80px;padding:65px 24px}.rw-service-line{display:grid;grid-template-columns:40px 1fr;gap:0 20px;border-top:1px solid var(--rw-line);padding:24px 0}.rw-service-line .rw-number{grid-row:1/3}.rw-service-line p{grid-column:2}
/* Business: photographic stage, opaque offer panel, compact service catalogue. */
.rw-business{background:#fff}.rw-business .rw-hero{padding:26px 24px 0}.rw-business-visual{position:relative;min-height:520px;display:flex;align-items:center;padding:32px}.rw-business-visual>.rw-image{position:absolute;inset:0}.rw-business-title{position:relative;background:#fff;padding:35px;max-width:560px;border-left:5px solid #204e43}.rw-business h1{font-size:clamp(36px,4vw,53px)}.rw-business-strip{display:flex;justify-content:space-between;gap:20px;padding:20px 0;border-bottom:1px solid var(--rw-line);font-size:14px;font-weight:700}.rw-business-services{padding:65px 24px}.rw-business-service-list{display:grid;grid-template-columns:repeat(3,1fr);border-top:1px solid var(--rw-line);border-left:1px solid var(--rw-line)}.rw-business-service-list article{padding:30px;border-right:1px solid var(--rw-line);border-bottom:1px solid var(--rw-line)}.rw-business-service-list article a{display:inline-block;margin-top:25px;font-size:14px;font-weight:700}.rw-business .rw-facts{background:#edf1ef}
/* Creative: graphic masthead and triptych, alternating horizontal bands. */
.rw-bold .rw-header{border-bottom:2px solid #1e2725}.rw-bold .rw-hero{padding:38px 24px 0}.rw-bold-title{display:grid;grid-template-columns:1.5fr 1fr;gap:0 60px;align-items:end}.rw-bold-title .rw-eyebrow{grid-column:1/-1}.rw-bold-title h1{font-weight:900;max-width:17ch}.rw-bold-title .rw-intro{margin-top:0!important}.rw-bold-title .rw-button{grid-column:2;justify-self:start}.rw-materials{display:grid;grid-template-columns:1fr 1.35fr .8fr;gap:14px;margin-top:34px;align-items:end}.rw-materials .rw-image{height:230px}.rw-materials .rw-image:nth-child(2){height:270px}.rw-bold-services{padding:70px 24px}.rw-service-band{display:flex;align-items:center;justify-content:space-between;gap:28px;padding:32px 28px;border-top:2px solid #1e2725}.rw-service-band:nth-child(odd){background:#e5e9e2}.rw-service-band>div{display:grid;grid-template-columns:45px 1fr 1.2fr;gap:25px;align-items:start;flex:1}.rw-service-band h3{font-size:26px}.rw-round-link{display:grid;place-items:center;width:48px;height:48px;border:1px solid #1e2725;border-radius:50%;font-size:25px;text-decoration:none;flex-shrink:0}
@media(max-width:700px){.rw-header{padding:19px 20px;gap:12px;align-items:flex-start}.rw-brand{font-size:15px;max-width:220px}.rw-header nav{gap:12px;font-size:13px;flex-wrap:wrap;justify-content:flex-end}.rw-header nav a:not(:last-child){display:none}.rw h1{font-size:40px;max-width:17ch}.rw-intro{font-size:17px;margin-top:18px!important}.rw-eyebrow{font-size:11px;margin-bottom:16px!important}.rw-button{margin-top:22px}.rw-facts{grid-template-columns:1fr;gap:36px;padding:45px 20px}.rw-faq{padding:40px 20px}.rw-editorial .rw-hero{padding:30px 20px 32px}.rw-editorial-heading{padding:0}.rw-editorial-heading .rw-button{position:static}.rw-editorial-images{padding-right:0;gap:12px;margin-top:28px;grid-template-columns:1.3fr .85fr}.rw-editorial-images .rw-wide{height:220px}.rw-editorial-images .rw-detail{height:170px;margin-top:50px}.rw-editorial-images .rw-image-note{position:static;writing-mode:horizontal-tb;grid-column:1/-1;margin-top:0!important}.rw-editorial-services{grid-template-columns:1fr;gap:0;padding:38px 20px}.rw-business .rw-hero{padding:0}.rw-business-visual{display:flex;flex-direction:column;padding:0;min-height:0}.rw-business-visual>.rw-image{position:relative;width:100%;height:245px;order:2}.rw-business-title{padding:30px 20px;border-left:0;max-width:none;width:100%}.rw-business h1{font-size:38px}.rw-business-strip{padding:18px 20px;font-size:12px;flex-wrap:wrap}.rw-business-services{padding:38px 20px}.rw-business-service-list{grid-template-columns:1fr}.rw-business-service-list article{padding:25px}.rw-business-service-list article .rw-number{float:none;margin-bottom:10px}.rw-bold .rw-hero{padding:30px 20px 0}.rw-bold-title{display:block}.rw-bold-title h1{font-size:40px}.rw-bold-title .rw-intro{margin-top:18px!important}.rw-materials{gap:8px;grid-template-columns:1fr 1fr;margin-top:28px}.rw-materials .rw-image{height:160px}.rw-materials .rw-image:nth-child(2){height:200px}.rw-materials .rw-image:nth-child(3){display:none}.rw-bold-services{padding:42px 20px}.rw-service-band{padding:25px 0;align-items:flex-start}.rw-service-band>div{display:block}.rw-service-band h3{font-size:25px}.rw-service-band .rw-number{margin-bottom:10px}.rw-service-band p{font-size:16px}.rw-round-link{margin-top:24px}}
`;
  return documentShell(p, `rw rw-${concept}`, `${header}<main id="inhalt">${business}</main>${footer}${offer}${question}`)
    .replace('Diese Website übernehmen', 'Website-Angebot ansehen')
    .replace('Unverbindlicher Website-Entwurf', 'Fiktiver Testbetrieb · Unverbindlicher Website-Entwurf')
    .replace('</head>', `<style>${css}</style></head>`);
}
