import { expect, it } from 'vitest';
import { dataSourceText, privacyNoticeText } from '../src/letters/notices';
import { DEFAULT_CONFIG } from '../src/config/settings';
it('identifies the actual reviewed public ad instead of falsely attributing it to OpenStreetMap', () => {
  const text = privacyNoticeText(
    DEFAULT_CONFIG,
    'public_profile',
    'https://example.test/privacy',
    'https://www.kleinanzeigen.de/s-anzeige/fixture/1234567890-239-1',
  );
  expect(text).toContain('Kleinanzeigen (Anzeigen-ID 1234567890)');
  expect(text).not.toContain('OpenStreetMap');
  expect(text).toContain('Art. 14');
});
it('refuses missing, sensitive, unreviewed and incorrectly identified profile sources', () => {
  for (const url of [
    undefined,
    'https://www.kleinanzeigen.de/s-foo',
    'https://www.kleinanzeigen.de/s-anzeige/x/123-239-1?secret=x',
    'http://www.kleinanzeigen.de/s-anzeige/x/123-239-1',
    'https://maps.google.com/place/123',
    'https://www.kleinanzeigen.de.attacker.test/s-anzeige/x/123-239-1',
  ])
    expect(() => dataSourceText('public_profile', url)).toThrow();
});
