import { hasTaxNumber } from './invoice';
import { esc } from './html';
import { embeddedFontCss, LETTER_GEOMETRY, type LetterSender } from './letter';

export interface ClaimLetterData {
  sender: LetterSender & { bankName: string; bankIban: string; bankBic: string; taxNumber: string };
  recipientLines: string[];
  dateLine: string;
  orderRef: string;
  /** z. B. „Website-Paket monatlich – beispiel.de“ */
  contract: string;
  minTermEnds: string;
  rates: { label: string; amount: string }[];
  total: string;
  dueDate: string;
}

/**
 * Forderungsbrief (offene Monatsraten bis zum Ende der Mindestlaufzeit). Sachlich, ohne Drohungen,
 * ohne Inkasso-Hinweise; wird nur nach Freigabe des Betreibers versendet.
 */
export function renderClaimLetterHtml(d: ClaimLetterData): string {
  const g = LETTER_GEOMETRY.left;
  const s = d.sender;
  return `<!DOCTYPE html>
<html lang="de"><head><meta charset="utf-8"><title>Offene Raten ${esc(d.orderRef)}</title>
<style>
${embeddedFontCss()}
@page{size:A4;margin:0}
*{box-sizing:border-box}
html,body{margin:0;padding:0}
body{font-family:'LetterSans',Arial,Helvetica,sans-serif;color:#1d232b;font-size:10pt;line-height:1.45}
.page{position:relative;width:210mm;height:297mm;overflow:hidden}
.head{position:absolute;left:25mm;right:20mm;top:13mm;border-bottom:0.4mm solid #1d4e89;padding-bottom:2.5mm;font-size:15pt;font-weight:700;color:#1d4e89}
.sender{position:absolute;left:${g.addressArea.x + 3}mm;top:${g.returnArea.y + 1.5}mm;font-size:6.5pt;color:#4a5565;white-space:nowrap}
.address{position:absolute;left:${g.addressArea.x + 3}mm;top:${g.addressArea.y + 0.5}mm;width:${g.addressArea.w - 6}mm;font-size:10pt;line-height:${LETTER_GEOMETRY.addressLineMm}mm;white-space:nowrap;overflow:hidden}
.meta{position:absolute;left:125mm;top:50mm;width:65mm;font-size:8.5pt;line-height:1.55}
.body{position:absolute;left:25mm;right:20mm;top:100mm}
h1{font-size:12pt;margin:0 0 4mm}
p{margin:0 0 2.5mm}
table{width:100%;border-collapse:collapse;margin:3mm 0;font-size:9.5pt}
td{padding:1.4mm 1mm;border-bottom:0.2mm solid #d9e0e8}
.num{text-align:right;white-space:nowrap}
.total td{font-weight:700;border-top:0.3mm solid #1d232b;border-bottom:none}
.foot{position:absolute;left:25mm;right:20mm;bottom:12mm;font-size:7pt;color:#4a5565;border-top:0.25mm solid #d9e0e8;padding-top:2mm}
</style></head>
<body><section class="page">
  <header class="head">${esc(s.company)}</header>
  <div class="sender">${esc(`${s.company} · ${s.street} · ${s.postalCode} ${s.city}`)}</div>
  <div class="address" id="anschrift">${d.recipientLines.map((l) => `<div>${esc(l)}</div>`).join('')}</div>
  <div class="meta"><div>${esc(s.name)}</div><div>Tel. ${esc(s.phone)}</div><div>${esc(s.email)}</div><div style="margin-top:3mm">${esc(d.dateLine)}</div><div>Vertrag ${esc(d.orderRef)}</div></div>
  <main class="body">
    <h1>Offene Raten aus Ihrem Vertrag „${esc(d.contract)}“</h1>
    <p>Guten Tag,</p>
    <p>leider konnten wir die monatlichen Raten trotz mehrerer Versuche und zwei Erinnerungen nicht einziehen. Ihre Website ist deshalb pausiert. Der Vertrag hat eine Mindestlaufzeit bis zum ${esc(d.minTermEnds)}. Folgende Raten sind bis dahin offen:</p>
    <table>${d.rates.map((r) => `<tr><td>${esc(r.label)}</td><td class="num">${esc(r.amount)}</td></tr>`).join('')}
      <tr class="total"><td>Summe</td><td class="num">${esc(d.total)}</td></tr></table>
    <p>Bitte überweisen Sie den Betrag bis zum ${esc(d.dueDate)} ${s.bankIban ? `auf das unten genannte Konto (Verwendungszweck: ${esc(d.orderRef)})` : `– die Zahlungsmöglichkeiten nennen wir Ihnen gern telefonisch oder per E-Mail (Verwendungszweck: ${esc(d.orderRef)})`}. Sobald die Zahlung eingegangen ist, schalten wir Ihre Website wieder frei.</p>
    <p>Gibt es einen Grund für den Zahlungsausfall oder möchten Sie eine Ratenlösung besprechen? Melden Sie sich gern – wir finden eine Lösung.</p>
    <p>Mit freundlichen Grüßen<br>${esc(s.name)}</p>
  </main>
  <footer class="foot">${esc(s.company)} · ${esc(s.street)} · ${esc(s.postalCode)} ${esc(s.city)} ${hasTaxNumber(s.taxNumber) ? ` · Steuernummer ${esc(s.taxNumber)}` : ''}${s.bankIban ? `${s.bankName ? ` · ${esc(s.bankName)}` : ''} · IBAN ${esc(s.bankIban)}${s.bankBic ? ` · BIC ${esc(s.bankBic)}` : ''}` : ''}</footer>
</section></body></html>`;
}
