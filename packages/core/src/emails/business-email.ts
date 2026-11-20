import type { SiteTheme } from '@wbm/templates';
import { appUrl } from '../config/env';
import { esc } from '../util/html';
import type { EmailContent } from './templates';

/**
 * E-Mails im Design des Betriebs (Betreiber, 20.11.2026): Terminanfragen, Bestätigungen, Absagen und weitergeleitete
 * Kontaktanfragen sehen aus wie die Website des Betriebs – gleiche Farben, Akzentfarbe und Schriften
 * (siteThemeFor aus der Vorlage). Nur Inline-Styles und Tabellen; die Website-Schriften werden als Webfont angeboten
 * (Apple Mail, iOS), sonst greift eine ähnliche Systemschrift. Kein Tracking-Pixel.
 */
export type BusinessEmailBlock =
  | string
  | { button: { href: string; label: string; secondary?: boolean } }
  | { box: string }
  | { details: [label: string, value: string][] }
  | { small: string };

export interface BusinessEmailInput {
  /** Design des Betriebs (siteThemeFor) */
  theme: SiteTheme;
  company: string;
  subject: string;
  heading?: string;
  preheader?: string;
  /** „Guten Tag Frau …,“ – leer = ohne Anrede */
  greeting?: string | null;
  blocks: BusinessEmailBlock[];
  /** Gruß mit Firmenname am Ende (Mails an Kunden des Betriebs) */
  signature?: boolean;
  footer: string;
}

export function renderBusinessEmail(input: BusinessEmailInput): EmailContent {
  const t = input.theme;
  const display = t.displayCss.replace(/"/g, "'");
  const text = t.textCss.replace(/"/g, "'");
  const fonts = t.faces
    .map(
      (f) =>
        `@font-face{font-family:'${f.family}';src:url(${appUrl(`/fonts/kits/${f.file}`)}) format('woff2');font-weight:${f.weight};${f.stretch ? `font-stretch:${f.stretch};` : ''}}`,
    )
    .join('');
  const p = (s: string) =>
    `<p style="margin:0 0 16px;font-family:${text};font-size:16px;line-height:1.6;color:${t.ink}">${esc(s).replace(/\n/g, '<br>')}</p>`;
  const html: string[] = [];
  const plain: string[] = [];
  if (input.heading) plain.push(input.heading, '');
  if (input.greeting) {
    html.push(p(input.greeting));
    plain.push(input.greeting, '');
  }
  for (const b of input.blocks) {
    if (typeof b === 'string') {
      html.push(p(b));
      plain.push(b, '');
    } else if ('button' in b) {
      const sec = b.button.secondary;
      html.push(
        `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 20px"><tr><td style="border-radius:6px;background:${sec ? t.base : t.accent};border:1.5px solid ${sec ? t.ink : t.accent}"><a href="${esc(b.button.href)}" style="display:inline-block;padding:14px 24px;font-family:${text};font-size:16px;font-weight:700;color:${sec ? t.ink : t.onAccent};text-decoration:none;border-radius:6px">${esc(b.button.label)}</a></td></tr></table>`,
      );
      plain.push(`${b.button.label}:`, b.button.href, '');
    } else if ('box' in b) {
      html.push(
        `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:4px 0 20px"><tr><td style="background:${t.surface};border-left:4px solid ${t.accent};padding:14px 16px;font-family:${text};font-size:15px;line-height:1.55;color:${t.ink}">${esc(b.box).replace(/\n/g, '<br>')}</td></tr></table>`,
      );
      plain.push(b.box, '');
    } else if ('details' in b) {
      html.push(
        `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:4px 0 20px;border-top:1px solid ${t.line}">${b.details
          .map(
            ([k, v]) =>
              `<tr><td valign="top" style="padding:10px 12px 10px 0;width:34%;border-bottom:1px solid ${t.line};font-family:${text};font-size:14px;font-weight:700;color:${t.ink}">${esc(k)}</td><td valign="top" style="padding:10px 0;border-bottom:1px solid ${t.line};font-family:${text};font-size:15px;line-height:1.5;color:${t.ink}">${esc(v).replace(/\n/g, '<br>')}</td></tr>`,
          )
          .join('')}</table>`,
      );
      plain.push(...b.details.map(([k, v]) => `${k}: ${v}`), '');
    } else {
      html.push(`<p style="margin:0 0 12px;font-family:${text};font-size:13px;line-height:1.5;color:${t.muted}">${esc(b.small)}</p>`);
      plain.push(b.small, '');
    }
  }
  if (input.signature) {
    html.push(p(`Viele Grüße\n${input.company}`));
    plain.push('Viele Grüße', input.company, '');
  }
  plain.push('--', input.footer);
  const page = `<!DOCTYPE html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><title>${esc(input.subject)}</title><style>${fonts}</style></head>
<body style="margin:0;padding:0;background:${t.surface};-webkit-text-size-adjust:100%">
${input.preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${esc(input.preheader)}</div>` : ''}
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${t.surface}"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;background:${t.base};border:1px solid ${t.line}">
<tr><td style="height:6px;line-height:6px;font-size:0;background:${t.accent}">&nbsp;</td></tr>
<tr><td style="padding:22px 28px 18px;border-bottom:1px solid ${t.line};font-family:${display};font-size:21px;font-weight:${Math.min(t.weight, 800)};${t.stretch ? `font-stretch:${t.stretch}%;` : ''}letter-spacing:-0.2px;color:${t.ink}">${esc(input.company)}</td></tr>
<tr><td style="padding:28px 28px 24px">
${input.heading ? `<h1 style="margin:0 0 18px;font-family:${display};font-size:26px;line-height:1.15;font-weight:${Math.min(t.weight, 800)};${t.stretch ? `font-stretch:${t.stretch}%;` : ''}color:${t.ink}">${esc(input.heading)}</h1>` : ''}
${html.join('\n')}
</td></tr>
<tr><td style="padding:16px 28px 22px;border-top:1px solid ${t.line};font-family:${text};font-size:12px;line-height:1.5;color:${t.muted}">${esc(input.footer)}</td></tr>
</table>
</td></tr></table>
</body></html>`;
  return { subject: input.subject, text: plain.join('\n'), html: page };
}
