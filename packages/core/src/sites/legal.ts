import type { ImpressumData } from '../db/schema';
import { esc, markdownToHtml, plainTextToHtml } from '../util/html';

/**
 * Impressum nach § 5 DDG aus den Angaben des Kunden. Wir formulieren keine eigenen
 * Rechtstexte – nur die strukturierte Darstellung der Pflichtangaben.
 */
export function impressumHtml(i: ImpressumData): string {
  const name =
    i.legalForm && !['Einzelunternehmen', 'Sonstige'].includes(i.legalForm) && !i.company.includes(i.legalForm)
      ? `${i.company} ${i.legalForm}`
      : i.company;
  const rows: string[] = [];
  rows.push(`<h2>Angaben gemäß § 5 DDG</h2><p>${esc(name)}<br>${esc(i.street)}<br>${esc(i.postalCode)} ${esc(i.city)}</p>`);
  const repLabel =
    i.legalForm && /GmbH|UG/.test(i.legalForm) ? 'Vertreten durch die Geschäftsführung' : 'Inhaber bzw. vertreten durch';
  rows.push(`<p>${esc(repLabel)}: ${esc(i.owner)}</p>`);
  rows.push(
    `<h2>Kontakt</h2><p>Telefon: <a href="tel:${esc(i.phone.replace(/[^\d+]/g, ''))}">${esc(i.phone)}</a><br>E-Mail: <a href="mailto:${esc(i.email)}">${esc(i.email)}</a></p>`,
  );
  if (i.register || i.registerNumber)
    rows.push(
      `<h2>Registereintrag</h2><p>Registergericht: ${esc(i.register ?? '')}<br>Registernummer: ${esc(i.registerNumber ?? '')}</p>`,
    );
  if (i.vatId) rows.push(`<h2>Umsatzsteuer-ID</h2><p>Umsatzsteuer-Identifikationsnummer gemäß § 27a UStG: ${esc(i.vatId)}</p>`);
  if (i.chamber || i.professionalTitle) {
    rows.push(
      `<h2>Berufsrechtliche Angaben</h2><p>${i.professionalTitle ? `Berufsbezeichnung: ${esc(i.professionalTitle)}<br>` : ''}${i.chamber ? `Zuständige Kammer: ${esc(i.chamber)}` : ''}</p>`,
    );
  }
  if (i.supervisoryAuthority) rows.push(`<h2>Aufsichtsbehörde</h2><p>${esc(i.supervisoryAuthority)}</p>`);
  if (i.responsibleForContent) rows.push(`<h2>Verantwortlich für den Inhalt</h2><p>${esc(i.responsibleForContent)}</p>`);
  return rows.join('\n');
}

/**
 * Vom Kunden eingefügte Datenschutzerklärung darstellen. Markdown-Überschriften werden erkannt,
 * sonst Absätze; HTML-Eingaben werden nie ungefiltert übernommen.
 */
export function privacyHtml(text: string): string {
  const t = text.replace(/\r\n/g, '\n').trim();
  return /^#{1,3}\s/m.test(t) ? markdownToHtml(t) : plainTextToHtml(t);
}
