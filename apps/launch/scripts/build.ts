/**
 * Baut die eigenständige Launch-Seite nach dist/ (statisch, für Netlify mit Netlify Forms).
 * Preise kommen aus offers-v4.ts, Anbieter- und Rechtsangaben aus der öffentlichen Supabase-Konfiguration
 * (seitenwerk-site-config) und legalDrafts() – nichts davon ist hier hart codiert. Jede Seite durchläuft die
 * Exportsperre der Firmenwebsite (Platzhalter, TODO, Legacy-Preise); bei Befunden wird nichts geschrieben.
 * Aufruf: pnpm --filter @wbm/launch build   (SITE_INDEXABLE=true erlaubt Indexierung; Standard: noindex)
 */
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import {
  appConfigSchema,
  DEFAULT_CONFIG,
  deepMerge,
  formatEuroShort,
  markdownToHtml,
  publicOperatorSettings,
  V4_PRICES,
  type AppConfig,
} from '@wbm/core';
import { OPERATOR_PROFILE } from '../../../packages/core/src/config/operator';
import project from '../../../supabase/project.json';
import { legalDrafts } from '../../web/src/lib/legal-drafts';
// @ts-expect-error – reines ESM-Modul ohne Typen
import { checkPublicPage } from '../../web/scripts/export-guard.mjs';

const root = path.resolve(import.meta.dirname, '..');
const src = path.join(root, 'src');
const dist = path.join(root, 'dist');
const indexable = process.env.SITE_INDEXABLE === 'true';
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

async function loadConfig(): Promise<AppConfig> {
  const fallback = deepMerge(DEFAULT_CONFIG, { sender: OPERATOR_PROFILE });
  const url = process.env.SUPABASE_URL || project.url;
  const response = await fetch(`${url}/functions/v1/seitenwerk-site-config`, { signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(`Website-Einstellungen nicht ladbar (HTTP ${response.status}).`);
  const data = await response.json();
  return publicOperatorSettings(
    appConfigSchema.parse(deepMerge(deepMerge(fallback, data), { offers: { activeVersion: 'v4' } })),
    DEFAULT_CONFIG.sender,
  );
}

const cfg = await loadConfig();
const s = cfg.sender;
const V = {
  SETUP: formatEuroShort(V4_PRICES.setupCents),
  BASIS: formatEuroShort(V4_PRICES.basisCents),
  CARE: formatEuroShort(V4_PRICES.carePlusCents),
  DOMAIN_MAX: formatEuroShort(cfg.checkout.maxDomainPriceCents),
  DEMO_DAYS: String(cfg.timing.demoExpiryDays),
  ROUNDS: String(cfg.onboarding.includedChangeRounds),
  EMAIL: esc(s.email),
  YEAR: String(new Date().getFullYear()),
  VERSION: Date.now().toString(36),
  ROBOTS: indexable ? '' : '<meta name="robots" content="noindex, nofollow" />',
  GUARANTEE: cfg.guarantee.enabled ? ` Mit ${cfg.guarantee.days} Tagen freiwilliger Einrichtungsgarantie ab Go-Live.` : '',
};

/* ---------- Bausteine ---------- */

const FAQ: [string, string][] = [
  [
    'Was kostet der Entwurf?',
    'Nichts. Wir bauen den Entwurf, bevor Sie etwas bezahlen, und brauchen dafür keine Zahlungsdaten. Gefällt er Ihnen nicht, müssen Sie nichts tun.',
  ],
  [
    'Was kostet die Website, wenn ich sie übernehme?',
    `Einmalig ${V.SETUP} für Einrichtung und Anpassung. Danach ${V.BASIS} im Monat (Basis) oder insgesamt ${V.CARE} im Monat (Care+, mit bis zu 60 Minuten kleinen Änderungen). Eine verfügbare .de-Domain bis ${V.DOMAIN_MAX} im Jahr ist enthalten.`,
  ],
  [
    'Ab wann zahle ich die Monatsgebühr – und wie lange?',
    'Die Monatsgebühr beginnt erst, wenn Ihre Website nach Ihrer Freigabe tatsächlich online ist. Es gibt keine Mindestlaufzeit; Sie können monatlich zum Ende des Abrechnungszeitraums kündigen.',
  ],
  [
    'Woher haben Sie die Angaben zu meinem Betrieb?',
    'Aus öffentlich zugänglichen Angaben, zum Beispiel OpenStreetMap oder Ihren eigenen Profilen, und aus dem, was Sie uns im Formular nennen. Ein Mensch prüft jede Angabe. Wir erfinden nichts: keine Bewertungen, keine Referenzen, keine Kundenstimmen. Beispielleistungen sind als Beispiel gekennzeichnet.',
  ],
  [
    'Was muss ich vorbereiten?',
    'Für den Entwurf: nichts. Wenn Sie ihn übernehmen, ergänzen Sie in einem Formular Ihre Pflichtangaben für das Impressum und Ihre Datenschutzerklärung und prüfen alle Texte. Eigene Fotos können Sie jederzeit mitschicken.',
  ],
  [
    'Kann ich vor dem Start noch etwas ändern?',
    `Ja. Vor der Veröffentlichung sind ${V.ROUNDS} Änderungsrunden enthalten, und online geht die Seite erst nach Ihrer ausdrücklichen Freigabe. Laufende Text- und Bildänderungen danach sind in Care+ mit bis zu 60 Minuten pro Monat enthalten.`,
  ],
  [
    'Gehört die Domain mir?',
    'Ja. Die Domain wird auf Sie als Inhaber registriert. Wenn Sie kündigen, bekommen Sie den Auth-Code für den Umzug und auf Wunsch die Website-Dateien als Archiv.',
  ],
  [
    'Ist mein Entwurf öffentlich zu finden?',
    `Nein. Der Entwurf ist für Suchmaschinen gesperrt und nur über Ihren persönlichen Link erreichbar. Übernehmen Sie ihn nicht, wird er nach ${V.DEMO_DAYS} Tagen gelöscht.`,
  ],
  [
    'Für welche Betriebe ist das gedacht?',
    'Für lokale Betriebe und Selbstständige, vor allem Handwerk, Beauty, Gastronomie, Einzelhandel, Kurse und Dienstleistungen. Gesundheitsberufe und Rechtsberatung nehmen wir derzeit nicht an, weil dort besondere Werberegeln gelten.',
  ],
  [
    'Ich möchte nicht kontaktiert werden. Was nun?',
    'Nutzen Sie die Seite <a href="/entfernen/">Betrieb entfernen</a>. Wir löschen einen vorhandenen Entwurf und nehmen Ihren Betrieb aus unserer Recherche – ohne Begründung.',
  ],
];

const faqHtml = FAQ.map(
  ([q, a], i) =>
    `<details${i === 0 ? ' open' : ''}><summary>${esc(q)}</summary><div class="answer"><p>${a.includes('<a ') ? a : esc(a)}</p></div></details>`,
).join('\n');

const done = `<div class="done-art" aria-hidden="true">
  <div class="rf-rays"></div>
  <div class="rf-sun"></div>
  <svg class="rf-path" viewBox="0 0 220 150"><path d="M24 140 C 70 132, 120 78, 186 30" /></svg>
  <svg class="rf-plane" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M22 2 11 13" /><path d="M22 2 15 22l-4-9-9-4Z" fill="#fff" /></svg>
  <span class="rf-stamp">EINGEGANGEN</span>
  <span><i class="rf-spark"></i><i class="rf-spark"></i><i class="rf-spark"></i><i class="rf-spark"></i></span>
</div>
<p class="k">ANFRAGE EINGEGANGEN</p>
<h3>Danke<em>!</em></h3>
<p>Wir prüfen Ihre Angaben und bauen den Entwurf. Sobald er fertig ist, schicken wir Ihnen den Link an Ihre E-Mail-Adresse.</p>
<p class="note">Keine Nachricht gefunden? Bitte auch im Spam-Ordner nachsehen. Fragen gern an ${V.EMAIL}.</p>`;

const footer = `<footer>
  <div class="wrap">
    <div class="foot-grid">
      <div>
        <a class="brand" href="/"><img src="/img/mark.png" alt="" width="32" height="32" />SeitenWerk</a>
        <p>Website-Entwürfe für lokale Betriebe. Erst ansehen, dann entscheiden.</p>
      </div>
      <div>
        <h4>SEITE</h4>
        <ul>
          <li><a href="/#ablauf">So funktioniert’s</a></li>
          <li><a href="/#beispiele">Beispiele</a></li>
          <li><a href="/#preise">Preise</a></li>
          <li><a href="/#fragen">Fragen</a></li>
          <li><a href="/#anfrage">Entwurf anfragen</a></li>
        </ul>
      </div>
      <div>
        <h4>RECHTLICHES</h4>
        <ul>
          <li><a href="/impressum/">Impressum</a></li>
          <li><a href="/datenschutz/">Datenschutz</a></li>
          <li><a href="/agb/">Vertragsbedingungen</a></li>
          <li><a href="/entfernen/">Betrieb entfernen</a></li>
          <li><a href="mailto:${V.EMAIL}">${V.EMAIL}</a></li>
        </ul>
      </div>
    </div>
    <div class="foot-bottom">
      <span>© ${V.YEAR} ${esc(s.company || 'SeitenWerk')}</span>
      <span class="sig">Alle gezeigten Betriebe „… Muster“ sind erfunden.</span>
    </div>
  </div>
</footer>`;

function fill(html: string, vars: Record<string, string>) {
  const out = html.replace(/\{\{([A-Z_]+)\}\}/g, (m, k: string) => {
    if (!(k in vars)) throw new Error(`Unbekannter Platzhalter ${m}`);
    return vars[k]!;
  });
  return out;
}

function subpage(title: string, description: string, body: string) {
  return `<!doctype html>
<html lang="de">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${esc(title)} – SeitenWerk</title>
    <meta name="description" content="${esc(description)}" />
    ${V.ROBOTS}
    <link rel="icon" href="/img/favicon.png" />
    <link rel="stylesheet" href="/styles.css?v=${V.VERSION}" />
    <script>document.documentElement.classList.add('js');</script>
  </head>
  <body data-mail="${V.EMAIL}">
    <a class="skip" href="#inhalt">Zum Inhalt springen</a>
    <header class="topnav">
      <div class="wrap">
        <a class="brand" href="/"><img src="/img/mark.png" alt="" width="32" height="32" />SeitenWerk</a>
        <nav class="nav-links" aria-label="Hauptnavigation">
          <a href="/#ablauf">So funktioniert’s</a>
          <a href="/#preise">Preise</a>
          <a href="/#fragen">Fragen</a>
          <a class="btn btn-ghost" href="/#anfrage">Entwurf anfragen</a>
        </nav>
      </div>
    </header>
    <main id="inhalt">
${body}
    </main>
    ${footer}
    <script src="/app.js?v=${V.VERSION}" defer></script>
  </body>
</html>
`;
}

function legalPage(markdown: string) {
  // Erste Überschrift wird Seitenkopf, der Rest der Fließtext
  const [, h1 = '', rest = markdown] = markdown.match(/^# (.+)\n([\s\S]*)$/) ?? [];
  return `<section class="subhead"><div class="wrap"><p class="eyebrow">Rechtliches</p><h1>${esc(h1)}</h1></div></section>
<section class="legal"><div class="wrap">${markdownToHtml(rest)}</div></section>`;
}

/* ---------- Rechtstexte ---------- */

const legal = legalDrafts(cfg);
const formsPrivacy = `## 15. Anfrage- und Entfernen-Formular dieser Seite

Wenn Sie über diese Seite einen kostenlosen Entwurf anfragen, verarbeiten wir den Namen Ihres Betriebs, den Ort, Ihre E-Mail-Adresse, Ihre Bestätigung zu Unternehmereigenschaft und Datenschutzhinweis sowie den Zeitpunkt der Anfrage. Zweck ist, den angefragten Entwurf zu erstellen und Ihnen den Link zu schicken. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (Maßnahmen auf Ihre Anfrage). Ihre E-Mail-Adresse nutzen wir nur für diese Anfrage und die zugehörige Kommunikation, nicht für Newsletter.

Über das Entfernen-Formular verarbeiten wir Betriebsname, Ort sowie freiwillig einen Code aus Brief oder Link und eine E-Mail-Adresse für die Bestätigung. Zweck ist, einen vorhandenen Entwurf zu löschen und Ihren Betrieb von weiterer Ansprache auszunehmen (Art. 6 Abs. 1 lit. c und f DSGVO). Dauerhaft behalten wir dafür nur einen nicht umkehrbaren Prüfwert, keine Kontaktdaten.

Die Formulare werden über die Formularfunktion von Netlify, Inc., USA, entgegengenommen und dort gespeichert; wir erhalten eine Benachrichtigung per E-Mail. Netlify verarbeitet dabei auch technische Daten wie IP-Adresse und Browserkennung und kann Eingaben zur Spamerkennung durch den Dienst Akismet (Automattic Inc., USA) prüfen lassen. Zu Übermittlungen in die USA siehe Ziffer 2 und Ziffer 14.

Kommt kein Vertrag zustande, löschen wir Anfragen spätestens sechs Monate nach Zusendung des Entwurfs, Entfernen-Anfragen nach Erledigung, soweit keine gesetzlichen Pflichten oder die Abwehr von Ansprüchen entgegenstehen. Ein Entwurf ist für Suchmaschinen gesperrt und wird nach ${V.DEMO_DAYS} Tagen gelöscht, wenn Sie ihn nicht übernehmen.

## 16. Aktualisierung`;
if (!legal.privacyMarkdown.includes('## 15. Aktualisierung'))
  throw new Error('Datenschutz-Gliederung hat sich geändert – Formularabschnitt neu einordnen.');
const privacy = legal.privacyMarkdown.replace('## 15. Aktualisierung', formsPrivacy);

/* ---------- Seiten zusammensetzen ---------- */

const pages: Record<string, string> = {
  '/': fill(readFileSync(path.join(src, 'index.html'), 'utf8'), {
    ...V,
    FAQ: faqHtml,
    DONE: done,
    FOOTER: footer,
  }),
  '/entfernen/': subpage(
    'Betrieb entfernen',
    'Kein Interesse? Hier entfernen wir Ihren Betrieb und einen vorhandenen Entwurf.',
    readFileSync(path.join(src, 'entfernen.html'), 'utf8'),
  ),
  '/danke/': subpage(
    'Danke',
    'Ihre Anfrage ist eingegangen.',
    `<section class="subhead"><div class="wrap"><p class="eyebrow">Eingegangen</p><h1>Danke<em>!</em></h1><p>Ihre Nachricht ist bei uns angekommen. Wir melden uns per E-Mail, sobald es etwas Neues gibt.</p><p><a class="btn btn-primary" href="/">Zurück zur Startseite</a></p></div></section>`,
  ),
  '/impressum/': subpage('Impressum', 'Anbieterkennzeichnung', legalPage(legal.impressumMarkdown)),
  '/datenschutz/': subpage('Datenschutz', 'Datenschutzerklärung', legalPage(privacy)),
  '/agb/': subpage('Vertragsbedingungen', 'Vertragsbedingungen für Unternehmer', legalPage(legal.termsMarkdown)),
};
const notFound = subpage(
  'Seite nicht gefunden',
  'Diese Seite gibt es nicht.',
  `<section class="subhead"><div class="wrap"><p class="eyebrow">404</p><h1>Diese Seite gibt es <em>nicht</em><span class="dot">.</span></h1><p>Vielleicht ein Tippfehler im Link. Ein abgelaufener Entwurf wird nach ${V.DEMO_DAYS} Tagen gelöscht.</p><p><a class="btn btn-primary" href="/">Zur Startseite</a></p></div></section>`,
);

const findings: string[] = [];
for (const [route, html] of Object.entries({ ...pages, '/404': notFound })) {
  findings.push(...checkPublicPage(route, html));
  if (/\{\{[A-Z_]+\}\}/.test(html)) findings.push(`${route}: unersetzter Platzhalter`);
}
if (!/597\s€/.test(pages['/']!.replace(/ /g, ' '))) findings.push('/: aktuelle Einrichtung 597 € fehlt');
if (findings.length) {
  console.error(`Export gesperrt – ${findings.length} Befund(e):\n  ${findings.join('\n  ')}`);
  process.exit(1);
}

/* ---------- Schreiben ---------- */

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });
for (const [route, html] of Object.entries(pages)) {
  const dir = path.join(dist, route);
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, 'index.html'), html);
}
writeFileSync(path.join(dist, '404.html'), notFound);
cpSync(path.join(src, 'styles.css'), path.join(dist, 'styles.css'));
cpSync(path.join(src, 'app.js'), path.join(dist, 'app.js'));
cpSync(path.join(src, 'img'), path.join(dist, 'img'), { recursive: true });

const req = createRequire(path.join(root, 'package.json'));
const pkgDir = (name: string) => path.dirname(req.resolve(`${name}/package.json`));
const FONTS: [string, string, string][] = [
  ['@fontsource-variable/fraunces', 'fraunces-latin-full-normal.woff2', 'fraunces-normal.woff2'],
  ['@fontsource-variable/fraunces', 'fraunces-latin-full-italic.woff2', 'fraunces-italic.woff2'],
  ['@fontsource/hanken-grotesk', 'hanken-grotesk-latin-400-normal.woff2', 'hanken-400.woff2'],
  ['@fontsource/hanken-grotesk', 'hanken-grotesk-latin-600-normal.woff2', 'hanken-600.woff2'],
  ['@fontsource/hanken-grotesk', 'hanken-grotesk-latin-700-normal.woff2', 'hanken-700.woff2'],
  ['@fontsource/jetbrains-mono', 'jetbrains-mono-latin-500-normal.woff2', 'jetbrains-500.woff2'],
];
mkdirSync(path.join(dist, 'fonts'), { recursive: true });
for (const [pkg, file, target] of FONTS) cpSync(path.join(pkgDir(pkg), 'files', file), path.join(dist, 'fonts', target));
for (const pkg of new Set(FONTS.map(([p]) => p))) {
  const license = path.join(pkgDir(pkg), 'LICENSE');
  if (existsSync(license)) cpSync(license, path.join(dist, 'fonts', `${pkg.split('/')[1]}-OFL.txt`));
}

// Alte Pfade der früheren Firmenwebsite auf seitenwerk.world auf die passenden Abschnitte umleiten
writeFileSync(
  path.join(dist, '_redirects'),
  [
    '/preise /#preise 301',
    '/beispiele /#beispiele 301',
    '/so-funktionierts /#ablauf 301',
    '/kontakt /#anfrage 301',
    '/garantie /agb/ 301',
    '/quellen / 301',
  ].join('\n') + '\n',
);
writeFileSync(path.join(dist, 'robots.txt'), indexable ? 'User-agent: *\nAllow: /\n' : 'User-agent: *\nDisallow: /\n');
writeFileSync(
  path.join(dist, '_headers'),
  `/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  X-Frame-Options: DENY
  Permissions-Policy: camera=(), microphone=(), geolocation=()
${indexable ? '' : '  X-Robots-Tag: noindex, nofollow\n'}/fonts/*
  Cache-Control: public, max-age=31536000, immutable
/img/*
  Cache-Control: public, max-age=604800
`,
);
console.log(
  `Launch-Seite gebaut: ${Object.keys(pages).length} Seiten + 404 → ${path.relative(process.cwd(), dist)} (${indexable ? 'indexierbar' : 'noindex'})`,
);
