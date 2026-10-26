import { brandMarkHtml } from './brand';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { boldMd, esc } from './html';

/**
 * Brief-Layout (A4, DIN 5008 Form B, Fensterumschlag links) nach den Vorgaben von Pingen:
 * Anschriftenfeld x 22 mm / y 60 mm, 85,5 × 25,5 mm; Zone x 20–109,5 mm / y 40–87,5 mm
 * sonst frei (Frankierung/Vermerke); 5 mm Rand; unten links 15 mm frei.
 * Quelle: help.pingen.com → Layout requirements (geprüft 23.10.2026).
 */
export const LETTER_GEOMETRY = {
  pageWidthMm: 210,
  pageHeightMm: 297,
  left: {
    addressArea: { x: 22, y: 60, w: 85.5, h: 25.5 },
    keepFree: { x: 20, y: 40, w: 89.5, h: 47.5 },
  },
  right: {
    addressArea: { x: 118, y: 60, w: 85.5, h: 25.5 },
    keepFree: { x: 116, y: 40, w: 89.5, h: 47.5 },
  },
  edgeMarginMm: 5,
  bottomLeftCornerMm: 15,
} as const;

export interface LetterSender {
  name: string;
  company: string;
  street: string;
  postalCode: string;
  city: string;
  email: string;
  phone: string;
  website: string;
}

export interface LetterData {
  /** Presentation of the existing V4 offer; monetary labels come from core's central source. */
  offerSummary?: {
    setup: string;
    basis: string;
    care: string;
    tax: string;
    scope: string;
    conditions: string;
    guarantee: string;
  };
  /** Explicit opt-in for the pending visual review; labels come from the V4 offer source. */
  reviewOffer?: { setup: string; basis: string; care: string; scope: string; conditions: string };
  sender: LetterSender;
  /** Anschriftzeilen ohne Leerzeilen, letzte Zeile „PLZ Ort“ */
  recipientLines: string[];
  dateLine: string;
  subject: string;
  greeting: string;
  /** Absätze vor dem Bild (Rating-Satz + Aufhänger, Einleitung) */
  intro: string[];
  compositeDataUri: string | null;
  /** Exact stored demo hero for the large preview layout; absent keeps the legacy layout. */
  desktopScreenshotDataUri?: string | null;
  qrDataUri: string;
  qrCaption: string;
  /** Kurz-URL zum Abtippen, ohne Protokoll */
  shortUrl: string;
  /** Angebot (mit **fett**) */
  offer: string;
  noAction: string;
  closing: string;
  signatureName: string;
  privacyNotice: string;
  objectionNotice: string;
  /** Quellenangaben zu Statistiken (B1.3), z. B. „¹ Bitkom Research 2025, …“, zuletzt „Quellen: …/quellen“ */
  footnotes?: string[];
  addressPosition: 'left' | 'right';
  /** Optionale Seite 2 mit großen Screenshots */
  screenshotPage?: { desktopDataUri: string; mobileDataUri: string } | null;
}

let fontCss: string | undefined;

/** Inter (SIL OFL 1.1) als eingebettete Schrift – identische PDFs auf jedem Server. */
export function embeddedFontCss(): string {
  if (fontCss === undefined) {
    const require = createRequire(import.meta.url);
    const dir = path.join(path.dirname(require.resolve('@fontsource/inter/package.json')), 'files');
    const face = (weight: number) => {
      const b64 = readFileSync(path.join(dir, `inter-latin-${weight}-normal.woff2`)).toString('base64');
      return `@font-face{font-family:'LetterSans';font-style:normal;font-weight:${weight};font-display:block;src:url(data:font/woff2;base64,${b64}) format('woff2')}`;
    };
    fontCss = [400, 600, 700].map(face).join('\n');
  }
  return fontCss;
}

export function renderLetterHtml(d: LetterData): string {
  const estimatedHeight =
    Math.ceil(d.subject.length / 72) * 5.4 +
    Math.ceil(d.intro.join(' ').length / 105) * 4.7 +
    11 +
    53 +
    Math.max(53, Math.ceil((d.offer.length + d.noAction.length) / 68) * 4.7 + 12);
  const premium = Boolean(d.desktopScreenshotDataUri && estimatedHeight <= 150);
  const right = d.addressPosition === 'right';
  const g = right ? LETTER_GEOMETRY.right : LETTER_GEOMETRY.left;
  // Anschrift 3 mm eingerückt im Feld, oben 1 mm Luft
  const addrX = g.addressArea.x + 3;
  const addrY = g.addressArea.y + 1;
  const infoX = right ? 25 : 125;
  const page2 = d.screenshotPage
    ? `<section class="page" aria-label="Seite 2">
  <div class="p2">
    <h2>So sieht Ihre neue Website aus</h2>
    <p class="muted">Ihr Entwurf am Computer und auf dem Handy. Eigene Inhalte und Freigabe folgen vor der Veröffentlichung.</p>
    <div class="shots">
      <img class="desk" src="${d.screenshotPage.desktopDataUri}" alt="Ansicht am Computer">
      <img class="mob" src="${d.screenshotPage.mobileDataUri}" alt="Ansicht auf dem Handy">
    </div>
    <div class="qrrow"><img class="qr" src="${d.qrDataUri}" alt="QR-Code zum Entwurf"><div><strong>${esc(d.qrCaption)}</strong><br><span class="muted">${esc(d.shortUrl)}</span></div></div>
  </div>
</section>`
    : '';

  return `<!DOCTYPE html>
<html lang="de"><head><meta charset="utf-8"><title>${esc(d.subject)}</title>
<style>
${embeddedFontCss()}
@page{size:A4;margin:0}
*{box-sizing:border-box}
html,body{margin:0;padding:0}
body{font-family:'LetterSans',Arial,Helvetica,sans-serif;color:#1d232b;font-size:9.6pt;line-height:1.38;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{position:relative;width:210mm;height:297mm;overflow:hidden;page-break-after:always;break-after:page}
.page:last-child{page-break-after:auto;break-after:auto}
.head{position:absolute;left:25mm;right:20mm;top:13mm;display:flex;justify-content:space-between;align-items:flex-end;border-bottom:0.4mm solid #1d4e89;padding-bottom:2.5mm}
.brand{font-size:15pt;font-weight:700;letter-spacing:-0.01em;color:#1d4e89}
.tag{font-size:8.5pt;color:#4a5565;margin-top:0.5mm}
.web{font-size:8.5pt;color:#4a5565;text-align:right}
.address{position:absolute;left:${addrX}mm;top:${addrY}mm;width:${g.addressArea.w - 6}mm;font-size:10pt;line-height:4.55mm;white-space:nowrap}
.address div{overflow:hidden;text-overflow:clip}
.info{position:absolute;left:${infoX}mm;top:50mm;width:65mm;font-size:8.5pt;line-height:1.45;color:#3b4350}
.info .k{color:#6b7280}
.info .date{margin-top:3mm;color:#1d232b}
.body{position:absolute;left:25mm;right:20mm;top:91mm}
.subject{font-size:11.5pt;font-weight:700;margin:0 0 3mm;line-height:1.3}
.body p{margin:0 0 1mm}
.visual{display:flex;gap:6mm;align-items:center;margin:2mm 0 2mm}
.composite{width:96mm;max-height:51mm;object-fit:contain;object-position:left center;height:auto;display:block;border-radius:1.5mm}
.qrbox{flex:1;text-align:center;font-size:9pt}
/* QR-Code mindestens 4 × 4 cm (gut scanbar, auch bei schwachem Licht) */
.qr{width:41mm;height:41mm;display:block;margin:0 auto 1.5mm}
.qrbox strong{display:block;font-size:9.5pt;line-height:1.3}
.short{font-size:7.5pt;color:#4a5565;word-break:break-all}
.premium .intro{margin-bottom:3mm}
.premium .hero-shot{display:block;width:165mm;height:50mm;object-fit:cover;object-position:top;border:0.25mm solid #d9e0e8;border-radius:1mm;margin:0 0 3mm}
.premium .offer-row{display:flex;align-items:flex-start;gap:6mm}
.premium .offer-copy{flex:1;min-width:0}
.premium .qrbox{flex:0 0 45mm}
.premium .subject{font-size:12pt}
.review-letter .intro{font-size:10.5pt;margin:2mm 0 3mm}.review-letter .visual{align-items:flex-start;margin:3mm 0}.review-letter .hero-complete{display:block;width:118mm;height:auto;max-height:67mm;object-fit:contain;object-position:top left;border:0.2mm solid #d9e0e8}.review-letter .qrbox{width:41mm;flex:0 0 41mm}.review-letter .qrbox strong{font-size:9pt}.review-prices{display:grid;grid-template-columns:1fr 1fr 1fr;border-top:0.3mm solid #1d4e89;border-bottom:0.3mm solid #d9e0e8;padding:3mm 0;gap:4mm;margin:2mm 0}.review-prices strong{font-size:10pt;display:block;line-height:1.25}.review-prices span{font-size:8.5pt;display:block}.review-conditions{font-size:9pt;line-height:1.45;margin:1.5mm 0!important}.sign{margin-top:3mm}
.sign .name{font-weight:600}
.small{position:absolute;left:25mm;right:20mm;bottom:16mm;font-size:7pt;line-height:1.38;color:#4a5565;border-top:0.25mm solid #d9e0e8;padding-top:2mm}
.small p{margin:0 0 1.2mm}
.small strong{color:#1d232b}
.small .fn{color:#1d232b}
.v4-letter{top:90mm}.v4-letter .intro{margin:1mm 0;font-size:9.6pt;line-height:1.4}
.v4-letter .subject{margin-bottom:1.5mm}.v4-letter .intro p{margin:0}.v4-letter .intro p+p{margin-top:0.7mm}.v4-letter .visual{gap:6mm;margin:1mm 0;align-items:center}
.v4-letter .composite{width:114mm;max-height:65mm;object-fit:contain;border-radius:0}
.v4-letter .qrbox{flex:0 0 45mm;min-width:0}.v4-letter .qrbox strong{font-size:9pt}.v4-letter .short{font-size:8pt;color:#24364a;word-break:normal;overflow-wrap:anywhere}
.offer-summary{margin:2mm 0;border-top:0.3mm solid #1d4e89;padding-top:2mm}
.offer-prices{display:flex;gap:4mm;font-size:9.4pt;line-height:1.4}.offer-prices strong{font-weight:600}.offer-summary p{font-size:8.5pt;line-height:1.35;margin:1mm 0}.offer-summary .tax{font-size:8pt}
.v4-letter .no-action{font-size:9pt;line-height:1.4}.v4-letter .sign{margin-top:0}
.v4-page .small{font-size:8pt;color:#344054;line-height:1.32}
.p2{position:absolute;left:25mm;right:20mm;top:25mm}
.p2 h2{font-size:15pt;margin:0 0 2mm;color:#1d4e89}
.muted{color:#4a5565}
.shots{display:flex;gap:8mm;align-items:flex-start;margin-top:8mm}
.shots .desk{width:118mm;border:0.3mm solid #d9e0e8;border-radius:1.5mm}
.shots .mob{width:38mm;border:0.3mm solid #d9e0e8;border-radius:3mm}
.qrrow{display:flex;gap:6mm;align-items:center;margin-top:10mm;font-size:10pt}
.qrrow .qr{margin:0;width:41mm;height:41mm}
</style></head>
<body>
<section class="page ${d.offerSummary ? 'v4-page' : ''}" aria-label="Seite 1">
  <header class="head">
    <div><div class="brand" style="display:flex;align-items:center;gap:8px">${brandMarkHtml(26, true)}<span>${esc(d.sender.company)}</span></div><div class="tag">Websites für lokale Betriebe</div></div>
    <div class="web">${esc(d.sender.website)}</div>
  </header>
  <div class="address" id="anschrift">${d.recipientLines.map((l) => `<div>${esc(l)}</div>`).join('')}</div>
  <div class="info">
    <div>${esc(d.sender.name)}</div>
    <div>${esc(d.sender.street)}</div>
    <div>${esc(d.sender.postalCode)} ${esc(d.sender.city)}</div>
    <div><span class="k">Tel.</span> ${esc(d.sender.phone)}</div>
    <div><span class="k">E-Mail</span> ${esc(d.sender.email)}</div>
    <div class="date">${esc(d.dateLine)}</div>
  </div>
  <main class="body ${d.offerSummary && !d.reviewOffer ? 'v4-letter' : ''} ${d.reviewOffer ? 'review-letter' : ''} ${premium ? 'premium' : ''}" id="brieftext">
    <h1 class="subject">${esc(d.subject)}</h1>
    <p>${esc(d.greeting)}</p>
    ${
      d.reviewOffer
        ? `<p class="intro">${d.intro.map((p) => boldMd(p)).join(' ')}</p>
    <div class="visual"><img class="hero-complete" src="${esc(d.compositeDataUri ?? d.desktopScreenshotDataUri ?? '')}" alt="Vollständiger Hero des persönlichen Website-Entwurfs"><div class="qrbox"><img class="qr" src="${d.qrDataUri}" alt="QR-Code zum Entwurf"><strong>Entwurf kostenlos ansehen</strong><span class="short">${esc(d.shortUrl)}</span></div></div>
    <div class="review-prices"><div><span>Einrichtung · einmalig</span><strong>${esc(d.reviewOffer.setup)}</strong></div><div><span>Basis · monatlich</span><strong>${esc(d.reviewOffer.basis)}</strong></div><div><span>Care+ · monatlich insgesamt</span><strong>${esc(d.reviewOffer.care)}</strong></div></div>
    <p class="review-conditions">${esc(d.reviewOffer.conditions)}</p><p>${esc(d.reviewOffer.scope)}</p>
    <p class="review-conditions">Rückfragen gern per E-Mail oder WhatsApp. Der Entwurf ist unverbindlich.</p><div class="sign">${esc(d.closing)}<br><strong>${esc(d.signatureName)}</strong></div>`
        : d.offerSummary
          ? `<div class="intro">${
              d.intro.length > 1
                ? `<p>${d.intro
                    .slice(0, -1)
                    .map((p) => boldMd(p))
                    .join(' ')}</p>`
                : ''
            }<p>${boldMd(d.intro.at(-1) ?? '')}</p></div>
    <div class="visual">
      ${d.compositeDataUri ? `<img class="composite" src="${esc(d.compositeDataUri)}" alt="Echte Desktop- und Smartphone-Ansicht desselben Website-Entwurfs">` : ''}
      <div class="qrbox"><img class="qr" src="${d.qrDataUri}" alt="QR-Code zum persönlichen Entwurf"><strong>${esc(d.qrCaption)}</strong><span class="short">${esc(d.shortUrl)}</span></div>
    </div>
    <section class="offer-summary" aria-label="Kosten bei späterer Beauftragung">
      <div class="offer-prices"><div><strong>${esc(d.offerSummary.setup)} einmalig</strong> · Einrichtung</div><div>+ <strong>Basis ${esc(d.offerSummary.basis)}/Monat</strong> oder <strong>Care+ insgesamt ${esc(d.offerSummary.care)}/Monat</strong></div></div>
      <p>${esc(d.offerSummary.conditions)} ${esc(d.offerSummary.scope)}</p>
      ${d.offerSummary.guarantee ? `<p>${esc(d.offerSummary.guarantee)}</p>` : ''}<p class="tax">${esc(d.offerSummary.tax)}</p>
    </section>
    <p class="no-action">${boldMd(d.noAction)}</p><div class="sign">${esc(d.closing)} · <strong>${esc(d.signatureName)}</strong></div>`
          : premium
            ? `
    <p class="intro">${d.intro.map((p) => boldMd(p)).join(' ')}</p>
    <img class="hero-shot" src="${esc(d.desktopScreenshotDataUri!)}" alt="Persönlicher Website-Entwurf: tatsächlich gerenderter Hero-Bereich für ${esc(d.recipientLines.join(' '))}">
    <div class="offer-row"><div class="offer-copy">
      <p>${boldMd(d.offer)}</p><p>${boldMd(d.noAction)}</p>
      <div class="sign"><div>${esc(d.closing)}</div><div class="name">${esc(d.signatureName)}</div></div>
    </div><div class="qrbox"><img class="qr" src="${d.qrDataUri}" alt="QR-Code zum persönlichen Entwurf"><strong>${esc(d.qrCaption)}</strong><span class="short">${esc(d.shortUrl)}</span></div></div>
    `
            : `
    ${d.intro.map((p) => `<p>${boldMd(p)}</p>`).join('\n    ')}
    <div class="visual">
      ${d.compositeDataUri ? `<img class="composite" src="${d.compositeDataUri}" alt="Ihre neue Website am Computer und auf dem Handy">` : ''}
      <div class="qrbox"><img class="qr" src="${d.qrDataUri}" alt="QR-Code zum Entwurf"><strong>${esc(d.qrCaption)}</strong><span class="short">${esc(d.shortUrl)}</span></div>
    </div>
    <p>${boldMd(d.offer)}</p>
    <p>${boldMd(d.noAction)}</p>
    <div class="sign"><div>${esc(d.closing)}</div><div class="name">${esc(d.signatureName)}</div></div>
    `
    }
  </main>
  <footer class="small" id="kleingedrucktes">
    ${d.footnotes?.length ? `<p class="fn" id="fussnoten">${d.footnotes.map((f) => esc(f)).join(' ')}</p>` : ''}
    <p>${boldMd(d.privacyNotice)}</p>
    <p>${boldMd(d.objectionNotice)}</p>
  </footer>
</section>
${page2}
</body></html>`;
}
