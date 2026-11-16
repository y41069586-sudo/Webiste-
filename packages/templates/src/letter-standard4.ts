import { brandMarkHtml } from './brand';
import { HAND_FONT_WOFF2_BASE64 } from './hand-font';
import { boldMd, esc } from './html';
import { LETTER_GEOMETRY, embeddedFontCss, returnAddressLine, type LetterData, type LetterStandard4 } from './letter';

/**
 * Standardvorlage 4 (16.11.2026, Entwurf „Brief Version 6“ in reports/brief-v5, Betreiber „Einbauen“).
 * Aufbau nach den Recherchen „Oberes Drittel im Werbebrief“ und „Brief Version 4 Gesamtanalyse“:
 * - oberes Drittel: ruhiger Briefkopf einer Person, rechts neben der Anschrift der Betreff mit dem Betriebsnamen und
 *   sofort darunter „Ansehen kostet nichts … Übernahme kostenpflichtig“ (kein Kostenhinweis nur im Kleingedruckten),
 * - Bildbühne mit echtem Desktop- und Handy-Screenshot der Demo, daneben der QR-Kasten (QR ≥ 40 mm),
 * - drei Schritte Ansehen → Anpassen → Übernehmen, Begründung, „bis … online“, Kontakt, Unterschrift, P. S.
 * Nur für das Anschriftenfeld links (DIN 5008 / easyNova). Fensterzone 19–108,5 × 40–90 mm bleibt frei.
 */
export function renderStandard4Html(d: LetterData, s: LetterStandard4): string {
  const g = LETTER_GEOMETRY.left;
  const addrX = g.addressArea.x + 3;
  const addrY = g.addressArea.y + 0.5;
  const retY = g.returnArea.y + 1.5;
  const retLength = returnAddressLine(d.sender).length;
  const retFont = retLength <= 60 ? 6.5 : retLength <= 72 ? 5.5 : 4.8;
  const compact = d.compact === true;
  const sender = d.sender;
  const contactLine = [sender.email, sender.website].filter((v) => v.trim()).join(' · ');

  return `<!DOCTYPE html>
<html lang="de"><head><meta charset="utf-8"><title>${esc(d.subject)}</title>
<style>
${embeddedFontCss()}
@font-face{font-family:'LetterHand';font-style:normal;font-weight:600;font-display:block;src:url(data:font/woff2;base64,${HAND_FONT_WOFF2_BASE64}) format('woff2')}
@page{size:A4;margin:0}
*{box-sizing:border-box;margin:0;padding:0}
:root{--navy:#1d4e89;--ink:#141b24;--text:#27303b;--muted:#5a6573;--line:#d9e0e8;--soft:#f2f5f9}
html,body{width:210mm}
body{font-family:'LetterSans',Arial,Helvetica,sans-serif;color:var(--text);font-size:10pt;line-height:${compact ? 1.34 : 1.4};-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{position:relative;width:210mm;height:297mm;overflow:hidden}
.abs{position:absolute}
.brand{left:20mm;top:11mm;display:flex;align-items:center;gap:2.2mm;font-weight:700;font-size:11pt;color:var(--navy)}
.lh{left:117mm;top:10.5mm;width:78mm;text-align:right;font-size:8.2pt;line-height:1.42;color:var(--muted)}
.lh strong{color:var(--ink);font-size:9.6pt}
.rule{left:117mm;top:29mm;width:78mm;height:0;border-top:0.3mm solid var(--line)}
.subj{left:117mm;top:33mm;width:78mm}
.subj .h{font-size:${compact ? 15 : 16}pt;font-weight:700;line-height:1.13;letter-spacing:-0.012em;color:var(--ink)}
.subj .h span{color:var(--navy)}
.subj .calm{font-size:8.6pt;line-height:1.4;margin-top:2.2mm}
.subj .calm strong{color:var(--ink)}
.subj .date{font-size:8.2pt;color:var(--muted);margin-top:2mm}
.retline{left:${addrX}mm;top:${retY}mm;width:${g.addressArea.w - 6}mm;font-size:${retFont}pt;line-height:3mm;color:var(--muted);white-space:nowrap;overflow:hidden;border-bottom:0.15mm solid #9aa3ae}
.address{left:${addrX}mm;top:${addrY}mm;width:${g.addressArea.w - 6}mm;font-size:10pt;line-height:${LETTER_GEOMETRY.addressLineMm}mm;white-space:nowrap;color:var(--ink)}
.address div{overflow:hidden;text-overflow:clip}
.body{left:20mm;right:15mm;top:93mm}
.greet{color:var(--ink)}
.lead{margin-top:1mm}
.lead strong{color:var(--ink)}
.stage{display:flex;gap:5mm;margin-top:${compact ? 2.4 : 3.2}mm;align-items:stretch}
.show{position:relative;flex:1 1 auto;background:var(--soft);border-radius:3.5mm;overflow:hidden}
.show .tag{position:absolute;left:4mm;top:3.2mm;font-size:6.8pt;font-weight:700;letter-spacing:0.07em;text-transform:uppercase;color:var(--muted);white-space:nowrap;overflow:hidden;right:4mm}
.laptop{position:absolute;left:${s.mobileDataUri ? 9 : 16}mm;top:10mm;width:${s.mobileDataUri ? 84 : 90}mm}
.laptop .screen{border:1.5mm solid #111820;border-bottom-width:2.1mm;border-radius:2.4mm 2.4mm 0 0;overflow:hidden;background:#111820;aspect-ratio:1.875}
.laptop .screen img{display:block;width:100%;height:100%;object-fit:cover;object-position:top center}
.laptop .base{height:3mm;margin:0 -5mm;background:linear-gradient(#dfe3e9,#b3bbc5);border-radius:0 0 3mm 3mm;position:relative}
.phone{position:absolute;left:86mm;top:9.5mm;width:22.5mm;border-radius:3.8mm;background:#111820;padding:1mm}
.phone .scr{border-radius:2.9mm;overflow:hidden;aspect-ratio:390/844}
.phone .scr img{display:block;width:100%;height:100%;object-fit:cover;object-position:top center}
.qrbox{flex:0 0 52mm;border:0.6mm solid var(--navy);border-radius:3.5mm;background:#fff;padding:2.4mm 3mm 2.2mm;display:flex;flex-direction:column;align-items:center;text-align:center}
.qrbox .go{font-size:11pt;font-weight:700;color:var(--navy)}
.qr{width:40mm;height:40mm;display:block;margin:1.2mm 0 1mm}
.qrbox .hint{font-size:7.4pt;line-height:1.28}
.qrbox .short{font-size:7.4pt;font-weight:700;color:var(--ink);margin-top:0.6mm;overflow-wrap:anywhere}
.steps{display:grid;grid-template-columns:repeat(3,1fr);gap:5mm;margin-top:${compact ? 2.6 : 3.4}mm}
.step{border-top:0.6mm solid var(--navy);padding-top:1.8mm}
.step .t{display:flex;align-items:center;gap:1.8mm;font-weight:700;color:var(--ink);font-size:10pt}
.step .n{width:5mm;height:5mm;border-radius:50%;background:var(--navy);color:#fff;font-size:7.5pt;line-height:5mm;text-align:center;flex:0 0 auto}
.step p{font-size:8.6pt;line-height:1.34;margin-top:0.8mm}
.txt{margin-top:${compact ? 2.4 : 3}mm}
.txt p+p{margin-top:${compact ? 1.4 : 1.8}mm}
.txt strong{color:var(--ink)}
.until{border-left:1mm solid var(--navy);background:var(--soft);border-radius:0 2mm 2mm 0;padding:1.8mm 3.5mm}
.until strong{color:var(--navy)}
.sign-row{display:flex;gap:6mm;margin-top:${compact ? 2 : 2.6}mm;align-items:flex-start}
.sign{flex:0 0 60mm}
.sign .hand{font-family:'LetterHand',cursive;font-weight:600;font-size:${compact ? 16 : 18}pt;color:var(--navy);line-height:0.95;display:block;margin:0.4mm 0 0.2mm}
.sign .typed{font-size:8.6pt;color:var(--muted);display:block}
.ps{flex:1;border-left:0.6mm solid var(--navy);padding-left:3.5mm;font-size:9.6pt}
.small{left:20mm;right:15mm;bottom:7mm;font-size:8pt;line-height:1.3;color:#3d4652;border-top:0.25mm solid var(--line);padding-top:1.6mm}
.small p+p{margin-top:0.8mm}
.small strong{color:var(--ink)}
</style></head>
<body>
<section class="page std4-page" aria-label="Seite 1">
  <div class="abs brand">${brandMarkHtml(23, true)}<span>${esc(sender.company)}</span></div>
  <div class="abs lh"><strong>${esc(sender.name)}</strong><br>${esc(s.senderTagline)}<br>${esc(sender.city)}<br>${esc(contactLine)}</div>
  <div class="abs rule"></div>
  <div class="abs subj">
    <div class="h">${esc(s.headlineBefore)} <span>${esc(s.displayName)}</span> ${esc(s.headlineAfter)}</div>
    <div class="calm">${boldMd(s.calm)}</div>
    <div class="date">${esc(d.dateLine)}</div>
  </div>
  <div class="abs retline" id="ruecksendeangabe">${esc(returnAddressLine(sender))}</div>
  <div class="abs address" id="anschrift">${d.recipientLines.map((l) => `<div>${esc(l)}</div>`).join('')}</div>
  <main class="abs body" id="brieftext">
    <h1 class="greet" style="font-size:10pt;font-weight:400;line-height:1.4">${esc(d.greeting)}</h1>
    ${d.intro.map((p) => `<p class="lead">${boldMd(p)}</p>`).join('')}
    <div class="stage">
      <div class="show">
        <div class="tag">${esc(s.tag)}</div>
        ${d.desktopScreenshotDataUri ? `<div class="laptop"><div class="screen"><img src="${esc(d.desktopScreenshotDataUri)}" alt="Entwurf am Computer"></div><div class="base"></div></div>` : ''}
        ${s.mobileDataUri ? `<div class="phone"><div class="scr"><img src="${esc(s.mobileDataUri)}" alt="Entwurf auf dem Handy"></div></div>` : ''}
      </div>
      <div class="qrbox">
        <div class="go">${esc(d.qrCaption)}</div>
        <img class="qr" src="${esc(d.qrDataUri)}" alt="QR-Code zum Entwurf">
        <div class="hint">${esc(s.qrHint)}</div>
        <div class="short">${esc(d.shortUrl)}</div>
      </div>
    </div>
    <div class="steps">${s.steps
      .map(
        (st, i) =>
          `<div class="step"><div class="t"><span class="n">${i + 1}</span>${esc(st.title)}</div><p>${boldMd(st.text)}</p></div>`,
      )
      .join('')}</div>
    <div class="txt">
      <p>${boldMd(d.offer)}</p>
      <p class="until">${boldMd(s.until)}</p>
      <p>${boldMd(d.noAction)}</p>
    </div>
    <div class="sign-row">
      <div class="sign">${esc(d.closing)}<span class="hand">${esc(d.signatureName)}</span><span class="typed">${esc(d.signatureName)} · ${esc(sender.company)}</span></div>
      ${d.postscript ? `<p class="ps">${boldMd(d.postscript)}</p>` : ''}
    </div>
  </main>
  <footer class="abs small" id="kleingedrucktes">
    ${d.footnotes?.length ? `<p id="fussnoten">${d.footnotes.map((f) => esc(f)).join(' ')}</p>` : ''}
    <p>${esc(s.legalPrefix)} ${boldMd(d.privacyNotice)}</p>
    <p>${boldMd(d.objectionNotice)}</p>
  </footer>
</section>
</body></html>`;
}
