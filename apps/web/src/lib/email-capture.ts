import { appUrl, esc, OPTIN_CONSENT_TEXT } from '@wbm/core';

/**
 * „Link per E-Mail zuschicken“ (11.11.2026): reines HTML-Formular ohne Skript (die Demo-CSP erlaubt kein JavaScript,
 * form-action 'self'). Häkchen nicht vorausgewählt; Honeypot und Zeitfalle wie beim Frageformular.
 */
function fields(slug: string, id: string, button: string): string {
  return `<form method="post" action="/d/${esc(slug)}/merken" class="sw-optin-form">
<label for="${id}-email" class="sw-optin-label">Ihre E-Mail-Adresse</label>
<input id="${id}-email" name="email" type="email" autocomplete="email" required maxlength="200" class="sw-optin-input" placeholder="name@betrieb.de">
<div style="display:none" aria-hidden="true"><label for="${id}-website">Website</label><input id="${id}-website" name="website" type="text" tabindex="-1" autocomplete="off"></div>
<input type="hidden" name="ts" value="${Date.now()}">
<div class="sw-optin-check"><input id="${id}-consent" name="consent" type="checkbox" required><label for="${id}-consent">${esc(OPTIN_CONSENT_TEXT)} <a href="${esc(appUrl('/datenschutz'))}">Datenschutz</a></label></div>
<button type="submit" class="sw-optin-btn">${esc(button)}</button>
</form>`;
}

const STYLE = `<style>.sw-optin{margin:0;padding:32px 16px;background:#f1f5f9;font-family:system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;color:#0f172a}
.sw-optin-card{max-width:560px;margin:0 auto;padding:24px;border-radius:18px;background:#fff;border:1px solid #e2e8f0;box-sizing:border-box}
.sw-optin h2{margin:0 0 8px;font-size:22px;line-height:1.25;font-weight:700;color:#0f172a}
.sw-optin p{margin:0 0 14px;font-size:16px;line-height:1.5;color:#334155}
.sw-optin-form{margin:0}
.sw-optin-label{display:block;margin:0 0 6px;font-size:14px;font-weight:600;color:#0f172a}
.sw-optin-input{display:block;width:100%;min-height:48px;margin:0 0 12px;padding:10px 12px;border:1px solid #94a3b8;border-radius:10px;font:inherit;font-size:16px;color:#0f172a;background:#fff;box-sizing:border-box}
.sw-optin-check{display:flex;gap:10px;align-items:flex-start;margin:0 0 14px;font-size:14px;line-height:1.45;color:#334155}
.sw-optin-check input{flex:none;width:20px;height:20px;margin:2px 0 0}
.sw-optin-check a{color:#334155}
.sw-optin-btn{display:block;width:100%;min-height:50px;border:0;border-radius:12px;background:#0f172a;color:#fff;font:inherit;font-size:16px;font-weight:650;cursor:pointer}
.sw-optin-btn:focus-visible,.sw-optin-input:focus-visible{outline:3px solid #60a5fa;outline-offset:2px}
.sw-welcome details{margin:4px 0 12px;border:1px solid #e2e8f0;border-radius:14px;padding:12px 14px}
.sw-welcome summary{cursor:pointer;font-size:16px;font-weight:600;color:#0f172a;min-height:28px}
.sw-welcome details[open] summary{margin-bottom:10px}</style>`;

/** Eigener Abschnitt vor den Preisen. */
export function emailCaptureSection(slug: string, expiresLabel: string): string {
  return `${STYLE}<section id="link-per-email" class="sw-optin" aria-labelledby="sw-optin-title"><div class="sw-optin-card">
<h2 id="sw-optin-title">Link per E-Mail zuschicken</h2>
<p>Sie möchten den Entwurf später in Ruhe ansehen? Wir schicken Ihnen den Link. Der Entwurf ist bis ${esc(expiresLabel)} online.</p>
${fields(slug, 'sw-optin', 'Link zuschicken')}
</div></section>`;
}

/** Kompakte, aufklappbare Variante im Willkommenshinweis nach dem Scan. */
export function emailCaptureCompact(slug: string): string {
  return `<details><summary>Link per E-Mail zuschicken</summary>${fields(slug, 'sw-optin-w', 'Link zuschicken')}</details>`;
}

export const EMAIL_CAPTURE_STYLE = STYLE;
