import { esc } from './html';

/**
 * Neutrale Ersatzseite, solange eine Kundenseite pausiert ist (Zahlungsausfall, Garantie, Vertragsende).
 * Bewusst ohne Grund: Dritte sehen nur, dass die Seite vorübergehend nicht erreichbar ist.
 */
export function renderMaintenanceHtml(input: { company: string }): string {
  return `<!DOCTYPE html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${esc(input.company)} – vorübergehend nicht erreichbar</title>
<style>
:root{color-scheme:light dark}
body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;background:#f8fafc;color:#1e293b}
main{max-width:32rem;padding:2rem 1.5rem;text-align:center}
h1{font-size:1.5rem;margin:0 0 .75rem}
p{margin:0;line-height:1.6;color:#475569}
@media (prefers-color-scheme:dark){body{background:#0f172a;color:#e2e8f0}p{color:#94a3b8}}
</style></head>
<body><main><h1>${esc(input.company)}</h1><p>Diese Website ist vorübergehend nicht erreichbar. Bitte versuchen Sie es später erneut.</p></main></body></html>`;
}
