/** Static review artifact only; no application/deployment. */
import { readFileSync, writeFileSync, cpSync, mkdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
const root = 'data/exports/task3-checkout';
const { results } = JSON.parse(readFileSync(`${root}/after/journeys.json`, 'utf8'));
if (results.length !== 10) throw Error('Ten completed journeys required');
const esc = (s) => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
const image = (file, title) =>
  `<figure><a href="${file}"><img loading="lazy" src="${file}" alt="${esc(title)}"></a><figcaption>${esc(title)}</figcaption></figure>`;
const html = `<!DOCTYPE html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SeitenWerk – Aufgabe3</title><style>body{font:16px/1.6 system-ui;color:#102039;background:#f2f5fa;margin:0}main{max-width:1240px;margin:auto;padding:24px}section{background:white;padding:24px;margin:24px 0;border-radius:16px}h1{line-height:1.15}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px}figure{margin:0;min-width:0}img{width:100%;height:400px;object-fit:cover;object-position:top;border:1px solid #cbd5e1;border-radius:8px}a{color:#064dab}figcaption{font-size:14px}p{max-width:78ch}.note{padding:16px;background:#fff3d0;border-radius:10px}</style><main><h1>SeitenWerk: Vertrauen und Kaufstrecke</h1><p class="note">Ausschließlich fiktive lokale Testbetriebe. Alle Zahlungen, E-Mails, Abos und Veröffentlichungen wurden mit Mock-Anbietern simuliert. Keine echte Stripe-Testzahlung; keine reale Anbieterabnahme.</p><p>597 € Einrichtung + Basis 19 €/Monat oder Care+ insgesamt 99 €/Monat. Monatsstart erst nach bestätigtem Go-Live. Recht und Steuerstatus weiter offen.</p><section><h2>Mobiler Einstieg und echte Drosselmessung</h2><div class="grid">${['demo', 'preise', 'checkout-mock'].map((t) => image(`after/performance-${t}.jpg`, t)).join('')}</div><p><a href="after/mobile-performance.json">Messwerte und Grenzen</a></p></section>${results.map((r) => `<section><h2>${esc(r.id)} · ${esc(r.name)}</h2><p>Tarif ${esc(r.plan)} · QR-Routing, 320–430 px / 1440 px, Zahlungssimulation, Rechnungsnummer, Wiederaufruf und Onboarding geprüft.</p><div class="grid">${image(`after/${r.id}-demo-390.jpg`, 'Demo – mobil')}${image(`after/${r.id}-demo-1440.jpg`, 'Demo – Desktop')}${image(`after/${r.id}-angebot-390.jpg`, 'Angebot – feste Leiste nur für diese Ganzaufnahme ausgeblendet')}${image(`after/${r.id}-checkout-390.jpg`, 'Simulierter Checkout')}${image(`after/${r.id}-bestaetigung.jpg`, 'Bestätigung nach simulierter Zahlung')}${image(`after/${r.id}-onboarding.jpg`, 'Onboarding – vollständige Aufnahme')}</div></section>`).join('')}<section><h2>Fehlerzustände und Überblick</h2><p><a href="uebersicht-mobile.jpg">Alle zehn mobilen Demos</a> · <a href="uebersicht-angebote.jpg">Alle zehn Angebote</a> · <a href="after/ledger-check.json">Einmalige Bestell-/Rechnungszuordnung</a></p><div class="grid">${image('after/zahlung-ausstehend-320.jpg', 'Noch ausstehende Zahlung')}${image('after/bestellung-processing-320.jpg', 'Keine zweite Bestellung bei Processing')}${image('after/zahlung-fehlgeschlagen-430.jpg', 'Fehlgeschlagene Zahlung – Wiederholung möglich')}</div></section><section><h2>Ausgangsstand</h2><p>Vorher-Aufnahmen aus gespeicherten Aufgabe2-Demos. Die Nachher-Fälle sind neu über die echte lokale App erzeugte fiktive Profile. Kein pixelidentischer A/B-Versuch.</p><div class="grid">${image('before/02-angebot.jpg', 'Vorher: Angebotsbereich der gespeicherten Maler-Demo')}${image('after/01-angebot-390.jpg', 'Nachher: neuer Maler-Testfall und klarer Aufbau')}</div></section><section><h2>Logo im Druck</h2><div class="grid">${image('brand-print/testbrief-logo.png', 'Testbrief mit vorhandener Laptop-/Handy-Komposition')}${image('brand-print/simulierte-rechnung.png', 'Rechnung aus lokaler Mock-Bestellung')}</div><p><a href="brand-print/testbrief-logo.pdf">Brief-PDF</a> · <a href="brand-print/simulierte-rechnung.pdf">Simulierte Rechnung</a></p></section><p><a href="after/journeys.json">Zehn dokumentierte Fälle</a></p></main></html>`;
writeFileSync(`${root}/index.html`, html);
cpSync('docs/task3-checkout/README.md', `${root}/pruefbericht.md`);
cpSync('docs/task3-checkout/evidence/test-results.txt', `${root}/test-results.txt`);
cpSync('docs/task3-checkout/stripe-readonly.json', `${root}/stripe-readonly.json`);
const evidence = 'docs/task3-checkout/evidence';
mkdirSync(evidence, { recursive: true });
for (const file of [
  'after/journeys.json',
  'after/mobile-performance.json',
  'after/01-angebot-390.jpg',
  'after/performance-demo.jpg',
  'after/performance-checkout-mock.jpg',
  'after/01-abbruch.jpg',
  'after/zahlung-ausstehend-320.jpg',
  'after/bestellung-processing-320.jpg',
  'after/zahlung-fehlgeschlagen-430.jpg',
  'after/ledger-check.json',
  'brand-print/testbrief-logo.pdf',
  'brand-print/testbrief-logo.png',
  'brand-print/simulierte-rechnung.pdf',
  'brand-print/simulierte-rechnung.png',
  'brand-print/letter-checks.json',
])
  if (existsSync(`${root}/${file}`)) cpSync(`${root}/${file}`, `${evidence}/${path.basename(file)}`);
execFileSync('python3', [
  '-c',
  `import os,zipfile\nroot='${root}'\nwith zipfile.ZipFile('data/exports/seitenwerk-aufgabe3-kaufstrecke.zip','w',zipfile.ZIP_DEFLATED) as z:\n for base,dirs,files in os.walk(root):\n  for name in files:\n   if name.endswith(('.jpg','.png','.pdf','.json','.html','.md','.txt')): z.write(os.path.join(base,name),os.path.relpath(os.path.join(base,name),root))`,
]);
console.log('Gallery, evidence and ZIP complete: ten fictional local mock journeys.');
