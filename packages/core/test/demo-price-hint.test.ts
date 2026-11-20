import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../src/config/settings';
import { demoOfferSectionHtml, demoOptions, demoPriceHint, demoToolbarText } from '../src/demos/offer-options';

/** Festpreis auf der Demo (Betreiber 20.11.2026): gleiche Werte wie im Kaufweg, in Leiste und Kaufblock. */
describe('Festpreis auf der Demo', () => {
  const cfg = structuredClone(DEFAULT_CONFIG);
  cfg.offers.activeVersion = 'v4';

  it('nennt Einmalpreis, Monatsgebühr und Kündbarkeit', () => {
    expect(demoPriceHint().replace(/\u00a0/g, ' ')).toBe('597 € einmalig, danach 19 € im Monat, monatlich kündbar');
    expect(demoToolbarText()).toContain('Online erst nach Ihrer Freigabe');
    const o = demoOptions('abcdefghijklmnopqrstuv', cfg);
    expect(o.priceHint).toBe(demoPriceHint());
    expect(o.toolbarNote).toBe(demoToolbarText());
  });

  it('Kaufblock enthält den Festpreis und die Freigabe-Zusage', () => {
    const html = demoOfferSectionHtml('abcdefghijklmnopqrstuv', cfg).replace(/\u00a0/g, ' ');
    expect(html).toContain('Festpreis: 597 € einmalig, danach 19 € im Monat, monatlich kündbar');
    expect(html).toContain('erst nach Ihrer Freigabe');
    expect(html).not.toContain('Tarif und Preis wählen Sie im nächsten Schritt');
  });

  it('Altangebot bleibt ohne Festpreis-Zeile', () => {
    const legacy = structuredClone(DEFAULT_CONFIG);
    legacy.offers.activeVersion = 'legacy';
    expect(demoOptions('abcdefghijklmnopqrstuv', legacy).priceHint).toBeUndefined();
  });
});
