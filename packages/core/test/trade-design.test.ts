import { describe, expect, it } from 'vitest';
import { PREMIUM_CRAFT, tradeDesignBrief, tradeDirection } from '../src/demos/trade-design';
import { studioImplementationBrief, studioPrompt } from '../src/demos/studio';
import type { ContentFacts } from '../src/demos/content';

const TRADES = [
  ['dachdecker', 'Dachdeckerbetrieb', 'dach', /Schiefer|Anthrazit/],
  ['elektriker', 'Elektrobetrieb', 'elektro', /Schaltlinie/],
  ['fliesenleger', 'Fliesenleger', 'fliesen', /Fugenraster/],
  ['sanitaer', 'Sanitärbetrieb', 'sanitaer', /Petrol|Blau/],
  ['heizung', 'Heizungs- und Klimatechnik', 'sanitaer', /Petrol|Blau/],
  ['maler', 'Malerbetrieb', 'maler', /Farbfächer|Pinselstrich/],
  ['gartenbau', 'Garten- und Landschaftsbau', 'gartenbau', /organische|Blattbogen/],
] as const;

describe('Gewerk-Richtungen für die KI-Gestaltung', () => {
  it('jedes Gewerk bekommt eine eigene, erkennbar andere Richtung', () => {
    for (const [key, label, id, re] of TRADES) {
      const d = tradeDirection(key, label);
      expect(d?.key, key).toBe(id);
      expect(JSON.stringify(d)).toMatch(re);
    }
    const keys = new Set(
      ['dachdecker', 'elektriker', 'fliesenleger', 'sanitaer', 'maler', 'gartenbau'].map((k) => tradeDirection(k, k)?.key),
    );
    expect(keys.size).toBe(6);
    expect(tradeDirection('friseur', 'Friseursalon')).toBeNull();
  });

  it('erfindet keine Betriebsangaben und verbietet erfundenes Vertrauen ausdrücklich', () => {
    for (const [key, label] of TRADES) {
      const text = tradeDesignBrief(key, label);
      expect(text).toMatch(/keine Betriebsangabe/);
      expect(text).not.toMatch(/\d+\s*Jahre|zertifiziert|Meisterbetrieb|Testsieger|Kundenstimmen? zeigen/i);
    }
    expect(PREMIUM_CRAFT).toMatch(/Keine Zertifikate, Jahreszahlen, Zahlen, Referenzen, Kundenstimmen oder Teamfotos erfinden/);
    // @keyframes lässt die CSS-Prüfung nicht zu: der Maßstab darf sie nicht verlangen
    expect(PREMIUM_CRAFT).toMatch(/kein @keyframes/);
  });

  it('Konzept- und Umsetzungs-Prompt tragen die Gewerk-Richtung und den Handwerksmaßstab', () => {
    const facts = {
      name: 'Dachdeckerei Beispiel',
      branchLabel: 'Dachdeckerbetrieb',
      branchKey: 'dachdecker',
      group: 'handwerk',
      city: 'Dortmund',
      postalCode: '44135',
      street: 'Weg',
      houseNumber: '1',
      phone: null,
      hasOpeningHours: false,
      socialOnly: false,
    } as ContentFacts;
    const concept = studioPrompt(facts);
    expect(concept).toMatch(/Gewerk-Charakter/);
    expect(concept).toMatch(/geneigte Kante/);
    const plan = {
      visitorTask: 'x'.repeat(30),
      first: {} as never,
      second: {} as never,
      selected: 'first',
      reason: 'y'.repeat(35),
      pageJourney: [],
      restraint: 'z'.repeat(30),
    } as never;
    const build = studioImplementationBrief(plan, { branchKey: 'dachdecker', branchLabel: 'Dachdeckerbetrieb' });
    expect(build).toMatch(/Gewerk-Charakter/);
    expect(build).toMatch(/Handwerklicher Maßstab/);
    expect(build).toMatch(/Prüfmaßstäbe der automatischen Prüfung/); // Prüfkriterien bleiben erhalten
    expect(studioImplementationBrief(plan)).not.toMatch(/Gewerk-Charakter/);
  });
});
