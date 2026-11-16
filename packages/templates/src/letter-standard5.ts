import { brandMarkHtml } from './brand';
import { HAND_FONT_WOFF2_BASE64 } from './hand-font';
import { boldMd, esc } from './html';
import { LETTER_GEOMETRY, embeddedFontCss, returnAddressLine, type LetterData, type LetterStandard4 } from './letter';

/**
 * Standardvorlage 5 (16.11.2026, Entwurf „Brief Version 8“ in reports/brief-v5, Betreiber „Version 8 einbauen“).
 * Wie Vorlage 4 (Fensterzone, Pflichttexte, Kostenhinweis oben), aber: Name des Betriebs zuerst im Betreff,
 * Einstieg mit dem belegten Grund, dunkle Bildbühne mit Pfeil zum QR-Code, Frist mit Kalenderblatt.
 * Nur Anschriftenfeld links (DIN 5008 / easyNova).
 */
export function renderStandard5Html(d: LetterData, s: LetterStandard4): string {
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
:root{--navy:#1d4e89;--ink:#141b24;--text:#27303b;--muted:#5a6573;--line:#d9e0e8;--red:#b8452f}
html,body{width:210mm}
body{font-family:'LetterSans',Arial,Helvetica,sans-serif;color:var(--text);font-size:10pt;line-height:${compact ? 1.33 : 1.38};-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{position:relative;width:210mm;height:297mm;overflow:hidden}
.abs{position:absolute}
.brand{left:20mm;top:11mm;display:flex;align-items:center;gap:2.2mm;font-weight:700;font-size:11pt;color:var(--navy)}
.lh{left:117mm;top:10.5mm;width:78mm;text-align:right;font-size:8.2pt;line-height:1.42;color:var(--muted)}
.lh strong{color:var(--ink);font-size:9.6pt}
.rule{left:117mm;top:25.5mm;width:78mm;height:0;border-top:0.3mm solid var(--line)}
.subj{left:117mm;top:29mm;width:78mm}
.subj .h{font-size:${compact ? 15.5 : 16.5}pt;font-weight:700;line-height:1.1;letter-spacing:-0.015em;color:var(--ink)}
.subj .h span{color:var(--navy)}
.subj .h2{font-size:11pt;font-weight:600;color:var(--navy);margin-top:1.6mm;line-height:1.2}
.subj .calm{font-size:8.5pt;line-height:1.38;margin-top:2mm}
.subj .calm strong{color:var(--ink)}
.subj .date{font-size:8.2pt;color:var(--muted);margin-top:1.8mm}
.retline{left:${addrX}mm;top:${retY}mm;width:${g.addressArea.w - 6}mm;font-size:${retFont}pt;line-height:3mm;color:var(--muted);white-space:nowrap;overflow:hidden;border-bottom:0.15mm solid #9aa3ae}
.address{left:${addrX}mm;top:${addrY}mm;width:${g.addressArea.w - 6}mm;font-size:10pt;line-height:${LETTER_GEOMETRY.addressLineMm}mm;white-space:nowrap;color:var(--ink)}
.address div{overflow:hidden;text-overflow:clip}
.body{left:20mm;right:15mm;top:93mm}
.greet{color:var(--ink);font-size:10pt;font-weight:400;line-height:inherit}
.lead{margin-top:1mm}
.lead strong{color:var(--ink)}
.stage{position:relative;margin-top:${compact ? 2.6 : 3.4}mm;height:68.5mm;border-radius:3.5mm;overflow:hidden;background:#12305a}
.stage .tag{position:absolute;left:6mm;top:4.2mm;font-size:6.6pt;font-weight:600;letter-spacing:0.09em;text-transform:uppercase;color:#9fb6d6}
.laptop{position:absolute;left:9mm;top:12mm;width:${s.mobileDataUri ? 86 : 92}mm}
.laptop .screen{position:relative;background:#1b1f24;border-radius:2.6mm 2.6mm 0.6mm 0.6mm;padding:1.6mm 1.6mm 2mm;box-shadow:0 0 0 0.25mm #4a5361 inset}
.laptop .screen::before{content:'';position:absolute;top:0.55mm;left:50%;width:1mm;height:1mm;margin-left:-0.5mm;border-radius:50%;background:#3a414b}
.laptop .view{overflow:hidden;border-radius:0.6mm;aspect-ratio:2;background:#fff}
.laptop .view img{display:block;width:100%;height:100%;object-fit:cover;object-position:50% 6%}
.laptop .base{position:relative;height:3.2mm;margin:0 -6mm;background:linear-gradient(#f1f3f6 0%,#c9cfd7 55%,#9aa3ae 100%);border-radius:0.4mm 0.4mm 4mm 4mm;box-shadow:0 1.6mm 3mm rgba(0,0,0,0.35)}
.laptop .base::after{content:'';position:absolute;left:50%;top:0;width:15mm;height:1mm;margin-left:-7.5mm;background:#aab2bc;border-radius:0 0 1.4mm 1.4mm}
.phone{position:absolute;left:82mm;top:19mm;width:21mm;border-radius:3.6mm;background:#1b1f24;padding:0.9mm;box-shadow:0 0 0 0.25mm #4a5361 inset,0 2mm 4mm rgba(0,0,0,0.45)}
.phone .scr{border-radius:2.8mm;overflow:hidden;aspect-ratio:390/760}
.phone .scr img{display:block;width:100%;height:100%;object-fit:cover;object-position:top center}
.arrow{position:absolute;left:107mm;top:30mm;width:9mm;height:9mm}
.qrbox{position:absolute;right:3.5mm;top:3.5mm;bottom:3.5mm;width:52mm;background:#fff;border-radius:3mm;padding:2.6mm 3mm 2mm;display:flex;flex-direction:column;align-items:center;text-align:center}
.qrbox .go{font-size:12pt;font-weight:700;color:var(--navy);line-height:1.1}
.qr{width:40.5mm;height:40.5mm;display:block;margin:1.3mm 0 1mm}
.qrbox .hint{font-size:7.3pt;line-height:1.25;white-space:nowrap}
.qrbox .short{font-size:7.4pt;font-weight:700;color:var(--ink);margin-top:0.5mm;overflow-wrap:anywhere}
.steps{display:grid;grid-template-columns:repeat(3,1fr);gap:6mm;margin-top:${compact ? 3 : 4}mm}
.step{border-top:0.3mm solid var(--line);padding-top:2mm}
.step .t{display:flex;align-items:center;gap:1.8mm;font-weight:700;color:var(--ink);font-size:10pt}
.step .n{width:5mm;height:5mm;border-radius:50%;background:var(--navy);color:#fff;font-size:7.5pt;line-height:5mm;text-align:center;flex:0 0 auto}
.step p{font-size:8.6pt;line-height:1.34;margin-top:0.8mm}
.until{display:flex;gap:3.5mm;align-items:center;margin-top:${compact ? 2.6 : 3.4}mm;border-top:0.25mm solid var(--line);border-bottom:0.25mm solid var(--line);padding:${compact ? 1.8 : 2.4}mm 0}
.leaf{flex:0 0 12.5mm;border-radius:1.6mm;overflow:hidden;border:0.35mm solid var(--red);background:#fff;text-align:center}
.leaf .m{background:var(--red);color:#fff;font-size:6pt;font-weight:700;letter-spacing:0.08em;padding:0.5mm 0}
.leaf .d{font-size:15pt;font-weight:700;color:var(--ink);line-height:1.12;padding-bottom:0.4mm}
.until p{font-size:9.8pt;line-height:1.36}
.until strong{color:var(--ink)}
.txt{margin-top:${compact ? 2.2 : 3}mm;font-size:9.6pt}
.sign-row{display:flex;gap:6mm;margin-top:${compact ? 2 : 2.6}mm;align-items:flex-start}
.sign{flex:0 0 56mm}
.sign .hand{font-family:'LetterHand',cursive;font-weight:600;font-size:${compact ? 15.5 : 17}pt;color:var(--navy);line-height:0.95;display:block;margin:0.4mm 0 0.2mm}
.sign .typed{font-size:8.6pt;color:var(--muted);display:block}
.ps{flex:1;border-left:0.3mm solid var(--line);padding-left:3.5mm;font-size:9.6pt}
.ps strong{color:var(--ink)}
.small{left:20mm;right:15mm;bottom:7mm;font-size:8pt;line-height:1.3;color:#3d4652;border-top:0.25mm solid var(--line);padding-top:1.6mm}
.small p+p{margin-top:0.8mm}
.small strong{color:var(--ink)}
</style></head>
<body>
<section class="page std4-page std5-page" aria-label="Seite 1">
  <div class="abs brand">${brandMarkHtml(23, true)}<span>${esc(sender.company)}</span></div>
  <div class="abs lh"><strong>${esc(sender.name)}</strong><br>${esc(s.senderTagline)} · ${esc(sender.city)}<br>${esc(contactLine)}</div>
  <div class="abs rule"></div>
  <div class="abs subj">
    <div class="h"><span>${esc(s.displayName)},</span> ${esc(s.headlineAfter)}</div>
    ${s.subline ? `<div class="h2">${esc(s.subline)}</div>` : ''}
    <div class="calm">${boldMd(s.calm)}</div>
    <div class="date">${esc(d.dateLine)}</div>
  </div>
  <div class="abs retline" id="ruecksendeangabe">${esc(returnAddressLine(sender))}</div>
  <div class="abs address" id="anschrift">${d.recipientLines.map((l) => `<div>${esc(l)}</div>`).join('')}</div>
  <main class="abs body" id="brieftext">
    <h1 class="greet">${esc(d.greeting)}</h1>
    ${d.intro.map((p) => `<p class="lead">${boldMd(p)}</p>`).join('')}
    <div class="stage">
      <div class="tag">${esc(s.tag)}</div>
      ${d.desktopScreenshotDataUri ? `<div class="laptop"><div class="screen"><div class="view"><img src="${esc(d.desktopScreenshotDataUri)}" alt="Entwurf am Computer"></div></div><div class="base"></div></div>` : ''}
      ${s.mobileDataUri ? `<div class="phone"><div class="scr"><img src="${esc(s.mobileDataUri)}" alt="Entwurf auf dem Handy"></div></div>` : ''}
      <svg class="arrow" viewBox="0 0 40 40" aria-hidden="true"><path d="M4 20h26M21 9l11 11-11 11" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>
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
    <div class="until">
      ${s.leaf ? `<div class="leaf"><div class="m">${esc(s.leaf.month)}</div><div class="d">${esc(s.leaf.day)}</div></div>` : ''}
      <p>${boldMd(s.until)}</p>
    </div>
    ${d.offer ? `<p class="txt">${boldMd(d.offer)}</p>` : ''}
    <p class="txt">${boldMd(d.noAction)}</p>
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
