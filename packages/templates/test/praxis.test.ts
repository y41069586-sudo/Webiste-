import { describe, expect, it } from 'vitest';
import { renderSite, slopFindingsForPage, PRAXIS_TEMPLATES, praxisDirectionFor } from '../src';
import { demoInput, sampleFacts } from './fixtures';

const live = (id: string) => ({
  ...demoInput(id, 'anthrazit'),
  mode: 'live' as const,
  demo: undefined,
  live: { formAction: '/api/forms/x', imprintPath: 'impressum.html', privacyPath: 'datenschutz.html', canonicalUrl: 'https://x.de/' },
});

describe('Praxis-Vorlage (Designrichtlinie 2026-11-19)', () => {
  for (const t of PRAXIS_TEMPLATES) {
    it(`${t.id}: Struktur, Kennzeichnung, keine KI-Muster`, () => {
      const html = renderSite(demoInput(t.id, 'anthrazit'));
      expect(html.match(/<h1[\s>]/g)).toHaveLength(1);
      expect(html).toContain('id="anfrage"');
      expect(html).toContain('class="pw-menu"'); // mobile Navigation ohne JavaScript
      expect(html).toContain('Vorschau:</strong> Im Entwurf wird nichts versendet');
      expect(html).toContain('<fieldset disabled>');
      expect(html).not.toMatch(/Platzhalter|lorem|\{\{/i);
      expect(html).not.toMatch(/backdrop-filter|linear-gradient\(|background-clip:\s*text/);
      // Gedankenstriche stammen aus den Testtexten der Fixtures, nicht aus der Vorlage
      expect(slopFindingsForPage(html).filter((f) => f.rule !== 'gedankenstriche')).toEqual([]);
      // Bewegung nur mit reduzierter-Bewegung-Abfrage und sichtbarem Rückfall
      expect(html).toContain('prefers-reduced-motion:no-preference');
      // SeitenWerk-Angebot nur in der getrennten Leiste/Footer, nicht im Betriebsinhalt
      const main = html.match(/<main id="inhalt">([\s\S]*?)<\/main>/)![1]!.replace(/data:[^"]+/g, '');
      expect(main).not.toMatch(/SeitenWerk|Website übernehmen|597/);
    });
  }

  it('Symbolbilder sind sichtbar gekennzeichnet', () => {
    const html = renderSite(demoInput('praxis-raeume', 'anthrazit'));
    expect(html).toContain('Symbolbild, keine Aufnahme des Betriebs');
  });

  it('Live: echtes Formular statt Vorschau, keine Symbolbilder', () => {
    const html = renderSite(live('praxis-service'));
    expect(html).not.toContain('<fieldset disabled>');
    expect(html).not.toContain('Symbolbild');
  });

  it('Richtungen unterscheiden sich in Komposition und Hauptaktion', () => {
    const a = renderSite(demoInput('praxis-projekt', 'anthrazit'));
    const b = renderSite(demoInput('praxis-raeume', 'anthrazit'));
    const c = renderSite(demoInput('praxis-garten', 'anthrazit'));
    expect(a).toContain('pw-hero-full');
    expect(b).toContain('pw-hero-edit');
    expect(c).toContain('pw-hero-wide');
    expect(a).toContain('Besichtigung anfragen');
    expect(b).toContain('Beratung anfragen');
    expect(c).toContain('Gartenprojekt besprechen');
  });

  it('Ohne Telefon keine Anruf-Aktion; Rückruf nur mit Telefonfeld', () => {
    const input = demoInput('praxis-service', 'anthrazit');
    const html = renderSite({ ...input, facts: { ...sampleFacts, phone: null, phoneHref: null } });
    expect(html).not.toContain('Anrufen:');
    expect(html).toContain('Anfrage senden');
  });

  it('Gewerk-Zuordnung', () => {
    expect(praxisDirectionFor('Dachdeckerbetrieb')).toBe('projekt');
    expect(praxisDirectionFor('Elektriker')).toBe('service');
    expect(praxisDirectionFor('Fliesenleger')).toBe('raeume');
    expect(praxisDirectionFor('Garten- und Landschaftsbau')).toBe('garten');
  });
});
