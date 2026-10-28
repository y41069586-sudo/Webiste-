import { brandMarkHtml } from './brand';
import { esc } from './html';
import { embeddedFontCss, LETTER_GEOMETRY } from './letter';

export interface InvoiceSeller {
  name: string;
  company: string;
  street: string;
  postalCode: string;
  city: string;
  email: string;
  phone: string;
  website: string;
  taxNumber: string;
  vatId: string;
  bankName: string;
  bankIban: string;
  bankBic: string;
}

export interface InvoiceBuyer {
  company: string;
  name: string;
  street: string;
  postalCode: string;
  city: string;
  country: string;
}

export interface InvoiceLine {
  quantity: number;
  title: string;
  description: string;
  /** bereits formatiert, z. B. „590,00 €“ */
  unitPrice: string;
  total: string;
}

export interface InvoiceData {
  kind: 'invoice' | 'cancellation';
  number: string;
  /** Bei Stornorechnung: Nummer der ursprünglichen Rechnung */
  originalNumber?: string;
  originalDate?: string;
  issueDate: string;
  /** Leistungszeitpunkt bzw. -zeitraum oder Datum der Vereinnahmung (§ 14 Abs. 4 Nr. 6 UStG) */
  serviceDate: string;
  orderRef: string;
  seller: InvoiceSeller;
  buyer: InvoiceBuyer;
  lines: InvoiceLine[];
  net: string;
  vatLabel: string | null;
  vat: string | null;
  gross: string;
  /** z. B. „Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.“ */
  taxNote: string | null;
  paymentNote: string;
}

/** Rechnung bzw. Stornorechnung als A4-HTML (Anschrift im DIN-5008-Fenster, wie der Brief). */
/** Steuernummer nur angeben, wenn tatsächlich erteilt (leer oder Platzhalter 000/000/00000 → weglassen) */
export function hasTaxNumber(taxNumber: string): boolean {
  const t = taxNumber.trim();
  return Boolean(t) && !/^0+\/0+\/0+$/.test(t);
}

export function renderInvoiceHtml(d: InvoiceData): string {
  const g = LETTER_GEOMETRY.left;
  const title = d.kind === 'cancellation' ? 'Stornorechnung' : 'Rechnung';
  const buyerLines = [
    d.buyer.company,
    d.buyer.name && d.buyer.name !== d.buyer.company ? d.buyer.name : '',
    d.buyer.street,
    `${d.buyer.postalCode} ${d.buyer.city}`,
    d.buyer.country !== 'DE' ? d.buyer.country : '',
  ]
    .map((l) => l.trim())
    .filter(Boolean);
  const sellerLine = `${d.seller.company} · ${d.seller.street} · ${d.seller.postalCode} ${d.seller.city}`;
  const bank = d.seller.bankIban
    ? `${d.seller.bankName ? `<div>${esc(d.seller.bankName)}</div>` : ''}<div>IBAN ${esc(d.seller.bankIban)}</div>${d.seller.bankBic ? `<div>BIC ${esc(d.seller.bankBic)}</div>` : ''}`
    : '';
  return `<!DOCTYPE html>
<html lang="de"><head><meta charset="utf-8"><title>${esc(title)} ${esc(d.number)}</title>
<style>
${embeddedFontCss()}
@page{size:A4;margin:0}
*{box-sizing:border-box}
html,body{margin:0;padding:0}
body{font-family:'LetterSans',Arial,Helvetica,sans-serif;color:#1d232b;font-size:9.5pt;line-height:1.4}
.page{position:relative;width:210mm;height:297mm;overflow:hidden}
.head{position:absolute;left:25mm;right:20mm;top:13mm;display:flex;justify-content:space-between;align-items:flex-end;border-bottom:0.4mm solid #1d4e89;padding-bottom:2.5mm}
.brand{font-size:15pt;font-weight:700;color:#1d4e89}
.web{font-size:8.5pt;color:#4a5565}
.sender{position:absolute;left:${g.addressArea.x + 3}mm;top:${g.returnArea.y + 1.5}mm;font-size:6.5pt;color:#4a5565;white-space:nowrap}
.address{position:absolute;left:${g.addressArea.x + 3}mm;top:${g.addressArea.y + 0.5}mm;width:${g.addressArea.w - 6}mm;font-size:10pt;line-height:${LETTER_GEOMETRY.addressLineMm}mm;white-space:nowrap;overflow:hidden}
.meta{position:absolute;left:125mm;top:50mm;width:65mm;font-size:8.5pt;line-height:1.55}
.meta .k{color:#6b7280;display:inline-block;width:27mm}
.body{position:absolute;left:25mm;right:20mm;top:100mm}
h1{font-size:13pt;margin:0 0 5mm}
table{width:100%;border-collapse:collapse;font-size:9pt}
th{text-align:left;font-weight:600;border-bottom:0.3mm solid #1d232b;padding:1.5mm 1mm}
td{vertical-align:top;padding:2mm 1mm;border-bottom:0.2mm solid #d9e0e8}
.num{text-align:right;white-space:nowrap}
.desc{color:#4a5565;font-size:8.5pt;margin-top:0.8mm}
.sum{margin-top:3mm;margin-left:auto;width:75mm;font-size:9.5pt}
.sum div{display:flex;justify-content:space-between;padding:0.8mm 1mm}
.sum .total{font-weight:700;border-top:0.3mm solid #1d232b;margin-top:1mm;padding-top:1.6mm}
.notes{margin-top:7mm}
.notes p{margin:0 0 2mm}
.foot{position:absolute;left:25mm;right:20mm;bottom:12mm;display:flex;gap:6mm;font-size:7pt;color:#4a5565;border-top:0.25mm solid #d9e0e8;padding-top:2mm}
.foot div{flex:1}
</style></head>
<body>
<section class="page">
  <header class="head"><div class="brand" style="display:flex;align-items:center;gap:8px">${brandMarkHtml(26, true)}<span>${esc(d.seller.company)}</span></div><div class="web">${esc(d.seller.website)}</div></header>
  <div class="sender">${esc(sellerLine)}</div>
  <div class="address" id="anschrift">${buyerLines.map((l) => `<div>${esc(l)}</div>`).join('')}</div>
  <div class="meta">
    <div><span class="k">${esc(title)}snr.</span> ${esc(d.number)}</div>
    <div><span class="k">Datum</span> ${esc(d.issueDate)}</div>
    ${d.originalNumber ? `<div><span class="k">Zu Rechnung</span> ${esc(d.originalNumber)}${d.originalDate ? ` vom ${esc(d.originalDate)}` : ''}</div>` : ''}
    <div><span class="k">Bestellung</span> ${esc(d.orderRef)}</div>
    ${hasTaxNumber(d.seller.taxNumber) ? `<div><span class="k">Steuernummer</span> ${esc(d.seller.taxNumber)}</div>` : ''}
    ${d.seller.vatId ? `<div><span class="k">USt-IdNr.</span> ${esc(d.seller.vatId)}</div>` : ''}
  </div>
  <main class="body">
    <h1>${esc(title)} ${esc(d.number)}</h1>
    <table>
      <thead><tr><th style="width:12mm">Menge</th><th>Leistung</th><th class="num" style="width:26mm">Einzelpreis</th><th class="num" style="width:26mm">Gesamt</th></tr></thead>
      <tbody>
        ${d.lines
          .map(
            (l) =>
              `<tr><td>${l.quantity}</td><td><div>${esc(l.title)}</div><div class="desc">${esc(l.description)}</div></td><td class="num">${esc(l.unitPrice)}</td><td class="num">${esc(l.total)}</td></tr>`,
          )
          .join('')}
      </tbody>
    </table>
    <div class="sum">
      ${d.vat ? `<div><span>Nettobetrag</span><span>${esc(d.net)}</span></div><div><span>${esc(d.vatLabel ?? 'Umsatzsteuer')}</span><span>${esc(d.vat)}</span></div>` : ''}
      <div class="total"><span>${d.kind === 'cancellation' ? 'Gutschrift' : 'Rechnungsbetrag'}</span><span>${esc(d.gross)}</span></div>
    </div>
    <div class="notes">
      <p><strong>Leistungszeitpunkt:</strong> ${esc(d.serviceDate)}</p>
      ${d.taxNote ? `<p>${esc(d.taxNote)}</p>` : ''}
      <p>${esc(d.paymentNote)}</p>
    </div>
  </main>
  <footer class="foot">
    <div><div>${esc(d.seller.company)}</div><div>${esc(d.seller.name)}</div><div>${esc(d.seller.street)}</div><div>${esc(d.seller.postalCode)} ${esc(d.seller.city)}</div></div>
    <div><div>Tel. ${esc(d.seller.phone)}</div><div>${esc(d.seller.email)}</div><div>${esc(d.seller.website)}</div></div>
    <div>${hasTaxNumber(d.seller.taxNumber) ? `<div>Steuernummer ${esc(d.seller.taxNumber)}</div>` : ''}${d.seller.vatId ? `<div>USt-IdNr. ${esc(d.seller.vatId)}</div>` : ''}${bank}</div>
  </footer>
</section>
</body></html>`;
}
