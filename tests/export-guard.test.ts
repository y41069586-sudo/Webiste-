import { test } from 'node:test';
import assert from 'node:assert/strict';
// @ts-expect-error – reines ESM-Skript ohne Typdeklaration
import { checkPublicPage, visibleText } from '../apps/web/scripts/export-guard.mjs';

const page = (body: string) => `<html><head><script>var x="example.com 590 €"</script></head><body>${body}</body></html>`;

test('aktueller Stand mit echten Angaben ist veröffentlichbar', () => {
  const html = page(
    '<h1>Preise</h1><p>597&nbsp;€ einmalig, danach 19 €/Monat oder Care+ 99 €/Monat.</p><p>Erika Beispiel, Beispielweg 1</p>',
  );
  assert.deepEqual(checkPublicPage('/preise', html), []);
});

test('Skripte zählen nicht als sichtbarer Text', () => {
  assert.ok(!visibleText(page('<p>ok</p>')).includes('example.com'));
});

test('alter Export mit Platzhaltern und 590/49 wird gesperrt', () => {
  const html = page(
    '<h1>Offene Preise</h1><p>590 € einmalig oder 49 €/Monat</p><a href="mailto:hallo@example.com">hallo@example.com</a><p>Vorname Nachname, Musterstraße 1, 0231 000000</p>',
  );
  const findings = checkPublicPage('/preise', html);
  for (const part of ['example.com', 'Vorname Nachname', 'Musterstraße 1', '0231 000000', '590 €', '49 €/Monat', '597 € fehlt'])
    assert.ok(
      findings.some((f: string) => f.includes(part)),
      `fehlt: ${part}`,
    );
});

test('interne TODO-Vermerke aus Rechtstextentwürfen sperren den Export', () => {
  const f = checkPublicPage('/impressum', page('<h1>Impressum</h1><p>TODO: USt-IdNr. prüfen</p>'));
  assert.ok(f.some((x: string) => x.includes('TODO')));
});

test('597 € ist nur auf der Preisseite Pflicht', () => {
  assert.deepEqual(checkPublicPage('/kontakt', page('<h1>Kontakt</h1><p>Schreiben Sie uns.</p>')), []);
});
