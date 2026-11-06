import { esc } from '@wbm/core';

/**
 * Willkommenshinweis nach dem Scan (06.11.2026, Betreiber: „da können Sachen nicht stimmen … sie sollen ganz sicher
 * wissen, dass es noch änderbar ist“). Reines HTML: <dialog open> schließt per <form method="dialog"> ohne Skript
 * (die Demo-CSP erlaubt kein JavaScript), nichts wird im Browser gespeichert. Nur bei ?start=1 (QR/Kurz-URL).
 */
export function welcomeDialog(businessName: string, slug: string, expiresLabel: string, komplett = false): string {
  return `<style>dialog.sw-welcome[open]{position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;width:100%;height:100%;max-width:none;max-height:none;margin:0;padding:16px;border:0;background:rgba(15,23,42,.6);box-sizing:border-box;font-family:system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;color:#0f172a}
.sw-welcome-card{width:100%;max-width:460px;max-height:calc(100dvh - 32px);overflow:auto;background:#fff;border-radius:20px;padding:28px 24px 22px;box-shadow:0 24px 60px rgba(15,23,42,.35);box-sizing:border-box;text-align:left}
.sw-welcome-eyebrow{margin:0 0 6px;font-size:13px;font-weight:600;letter-spacing:.02em;color:#475569}
.sw-welcome h2{margin:0 0 12px;font-size:23px;line-height:1.25;font-weight:700;letter-spacing:-.01em;color:#0f172a}
.sw-welcome p{margin:0 0 12px;font-size:16px;line-height:1.5;color:#334155}
.sw-welcome ul{margin:0 0 14px;padding:0;list-style:none}
.sw-welcome li{position:relative;margin:0 0 8px;padding-left:30px;font-size:16px;line-height:1.4;color:#0f172a}
.sw-welcome li::before{content:"✓";position:absolute;left:0;top:0;width:21px;height:21px;border-radius:50%;background:#dcfce7;color:#15803d;font-size:13px;font-weight:700;line-height:21px;text-align:center}
.sw-welcome-btn{display:block;width:100%;min-height:52px;margin:6px 0 10px;border:0;border-radius:14px;background:#0f172a;color:#fff;font:inherit;font-size:17px;font-weight:650;cursor:pointer}
.sw-welcome-btn:focus-visible{outline:3px solid #60a5fa;outline-offset:2px}
.sw-welcome-small{margin:0!important;font-size:13px!important;color:#64748b!important;text-align:center}
.sw-welcome-small a{color:#64748b}</style>
<dialog open class="sw-welcome" aria-labelledby="sw-welcome-title"><div class="sw-welcome-card">
<p class="sw-welcome-eyebrow">Schön, dass Sie reinschauen</p>
<h2 id="sw-welcome-title">Ihr Website-Entwurf für ${esc(businessName)}</h2>
<p>Wir haben ihn ohne Gespräch mit Ihnen vorbereitet, nur aus öffentlich auffindbaren Angaben. Deshalb kann noch nicht alles stimmen. Das ist kein Problem – Sie können alles ändern:</p>
<ul><li>Name, Kontakt und Öffnungszeiten</li><li>Leistungen, Texte und Fotos</li><li>Farben und Gestaltung nach Ihren Wünschen</li></ul>
<p><strong>Vor der Bestellung</strong> tragen Sie Ihre richtigen Angaben selbst ein und schreiben Ihre Wünsche dazu – kostenlos und unverbindlich. Online geht die Seite erst nach Ihrer Freigabe.${komplett ? ' Im Tarif Komplett zahlen Sie sogar erst, wenn Ihre Website online ist.' : ''}</p>
<form method="dialog"><button class="sw-welcome-btn" type="submit" autofocus>Entwurf ansehen</button></form>
<p class="sw-welcome-small">Unverbindlich · online bis ${esc(expiresLabel)} · <a href="/d/${esc(slug)}/kein-interesse">Kein Interesse</a></p>
</div></dialog>`;
}
