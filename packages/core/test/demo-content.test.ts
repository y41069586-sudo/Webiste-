import { describe, expect, it } from 'vitest';
import { CONTENT_LIBRARY, libraryContent } from '../src/demos/library';
import {
  validateDemoContent,
  normalizeContent,
  verifiedServiceFallback,
  buildQaPrompt,
  type ContentFacts,
} from '../src/demos/content';

const facts: ContentFacts = {
  name: 'Malermeister Kowalski GmbH',
  branchLabel: 'Malerbetrieb',
  branchKey: 'maler',
  group: 'handwerk',
  city: 'Dortmund',
  postalCode: '44137',
  street: 'Kampstraße',
  houseNumber: '5',
  phone: '0231 123456',
  hasOpeningHours: true,
  socialOnly: false,
};

describe('Inhaltsregeln', () => {
  it('requires a verified service above the fold without inventing a specialty', () => {
    const f = { ...facts, verifiedServices: ['Tapezierarbeiten', 'Bodenverlegung'] };
    const generic = libraryContent('maler', 'handwerk', { name: f.name, stadt: f.city, branche: f.branchLabel }, 0);
    expect(validateDemoContent(generic, f).some((v) => v.rule === 'Betriebsbezug')).toBe(true);
    const repaired = verifiedServiceFallback(generic, f);
    expect(repaired.hero_headline).toContain('Tapezierarbeiten');
    expect(repaired.hero_subline).toContain('Bodenverlegung');
    expect(validateDemoContent(repaired, f)).toEqual([]);
    expect(repaired.services[0]!.text).not.toBe(repaired.services[1]!.text);
    expect(buildQaPrompt(f, repaired)).toContain('"leistungen":["Tapezierarbeiten","Bodenverlegung"]');
  });
  it('alle Fallback-Texte aller Branchen bestehen die Regeln', () => {
    for (const key of Object.keys(CONTENT_LIBRARY)) {
      const group = ['nagelstudio', 'kosmetikstudio'].includes(key) ? 'beauty' : 'handwerk';
      for (let seed = 0; seed < 6; seed++) {
        const c = libraryContent(key, group, { name: facts.name, stadt: 'Dortmund', branche: 'Testbranche' }, seed);
        expect(validateDemoContent(c, { ...facts, branchKey: key, group }), `${key}/${seed}`).toEqual([]);
      }
    }
  });

  const base = libraryContent('maler', 'handwerk', { name: facts.name, stadt: 'Dortmund', branche: 'Malerbetrieb' }, 0);
  const bad = (patch: Record<string, unknown>) =>
    validateDemoContent({ ...base, ...patch } as typeof base, facts).map((v) => v.rule);

  it('erkennt erfundene Fakten, Zahlen, Bewertungen, Preise, Platzhalter', () => {
    expect(
      bad({ about: 'Seit 1998 sind wir Ihr Familienbetrieb in Dortmund und freuen uns auf Ihren Besuch bei uns im Laden.' }),
    ).toEqual(expect.arrayContaining(['Zahlen', 'erfundene Historie']));
    expect(
      bad({ hero_subline: 'Über hundert zufriedene Kunden und fünf Sterne Bewertung sprechen für uns, sagen alle.' }),
    ).toContain('Bewertungen/Testimonials');
    expect(
      bad({ hero_subline: 'Innenanstrich ab neunzig Euro pro Raum – jetzt besonders günstig bei uns erhältlich.' }),
    ).toContain('Preise/Rabatte');
    expect(bad({ hero_headline: 'Lorem ipsum dolor sit amet' })).toContain('Platzhalter');
    expect(bad({ hero_subline: 'Wir sind ein zertifizierter Meisterbetrieb mit ausgezeichneter Qualität für Sie.' })).toContain(
      'Auszeichnungen/Zertifikate',
    );
    expect(bad({ hero_subline: 'Unser Notdienst ist rund um die Uhr für Sie da, auch am Wochenende für Sie da.' })).toContain(
      'Garantien/Versprechen',
    );
    expect(
      bad({
        about: 'Inhaberin Frau Schmidt und ihre Mitarbeiterinnen freuen sich auf Sie. Kommen Sie gern vorbei, wir beraten Sie.',
      }),
    ).toContain('Personen/Team');
    expect(bad({ hero_headline: 'The best painter in town' })).toEqual(expect.arrayContaining(['Englisch']));
  });

  it('Firmenname mit „Meister“ ist erlaubt (Fakt aus den Lead-Daten)', () => {
    expect(bad({ hero_subline: `${facts.name} ist Ihr Ansprechpartner für saubere Malerarbeiten in Dortmund.` })).toEqual([]);
  });

  it('prüft Anzahl und Länge', () => {
    expect(bad({ services: base.services.slice(0, 2) })).toContain('Anzahl');
    expect(bad({ hero_headline: 'Kurz' })).toContain('Länge');
  });

  it('normalisiert Leerraum und Satzzeichen', () => {
    const n = normalizeContent({
      ...base,
      hero_headline: '  Frische  Farbe für Sie . ',
      about: 'Absatz eins .\n\n\n\nAbsatz zwei',
    });
    expect(n.hero_headline).toBe('Frische Farbe für Sie');
    expect(n.about).toBe('Absatz eins.\n\nAbsatz zwei');
  });
});

describe('Template-Rotation', () => {
  it('verteilt gleichmäßig über Templates und Paletten', async () => {
    const { chooseTemplate } = await import('../src/demos/build');
    const usage: Record<string, number> = {};
    for (let i = 0; i < 9; i++) {
      const c = chooseTemplate({ id: `00000000-0000-0000-0000-00000000000${i}`, branchGroup: 'beauty' }, [], usage);
      usage[`${c.templateId}/${c.palette}`] = (usage[`${c.templateId}/${c.palette}`] ?? 0) + 1;
    }
    expect(Object.keys(usage)).toHaveLength(9);
    expect(Object.values(usage).every((n) => n === 1)).toBe(true);
  });
});
