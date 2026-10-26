import { expect, it } from 'vitest';
import { libraryContent } from '../src/demos/library';
import { validateDemoContent, buildDemoPrompt, type ContentFacts } from '../src/demos/content';
const facts: ContentFacts = {
  name: 'Fiktiver Testbetrieb',
  branchLabel: 'Barbershop',
  branchKey: 'barber',
  group: 'beauty',
  city: 'Testort',
  postalCode: '12345',
  street: 'Testweg',
  houseNumber: '1',
  phone: null,
  hasOpeningHours: false,
  socialOnly: false,
};
it('uses branch-appropriate fallback categories instead of unrelated default services', () => {
  for (const [branch, label, group, expected, excluded] of [
    ['barber', 'Barbershop', 'beauty', 'Bartkonturen', 'Gesichtsbehandlung'],
    ['buchladen', 'Buchhandlung', 'einzelhandel', 'Titel anfragen', 'Blumen'],
    ['musikschule', 'Musikschule', 'kurse', 'Unterrichtsangebote', 'Yoga'],
    ['fitnessstudio', 'Trainingsstudio', 'kurse', 'Trainingsangebote', 'Yoga'],
  ] as const) {
    const c = libraryContent(branch, group, { name: facts.name, stadt: 'Testort', branche: label }, 0);
    expect(c.services.map((s) => s.title).join()).toContain(expected);
    expect(c.services.map((s) => s.title).join()).not.toContain(excluded);
    expect(validateDemoContent(c, { ...facts, branchKey: branch, branchLabel: label, group })).toEqual([]);
  }
});
it('keeps unknown activities neutral and never fills them with painter services', () => {
  const c = libraryContent('unknown', 'handwerk', { name: facts.name, stadt: 'Testort', branche: 'Fachbetrieb' }, 1);
  expect(c.services.map((s) => s.title)).toEqual(['Angebot', 'Anfrage', 'Standort']);
  expect(c.hero_headline).toBe('Fachbetrieb in Testort');
});
it('instructs the model to describe confirmed activity and location without inferring a specialty from a name', () => {
  expect(buildDemoPrompt(facts, 0)).toContain('Firmenname: Fiktiver Testbetrieb');
});
it('selects a stable fitting composition before usage rotation', async () => {
  const { chooseTemplate } = await import('../src/demos/build');
  const ids = new Set<string>();
  for (let i = 0; i < 100; i++) {
    const lead = { id: `fictional-rotation-${i}`, branchGroup: 'handwerk' as const, branch: 'maler' };
    const first = chooseTemplate(lead);
    expect(chooseTemplate(lead)).toEqual(first);
    ids.add(first.templateId);
  }
  expect([...ids]).toEqual(['handwerk-klar']);
  const { industryDirection } = await import('@wbm/templates');
  const lead = { id: 'same-business', branchGroup: 'handwerk' as const, branch: 'maler' };
  expect(chooseTemplate(lead, [], {}, { ...industryDirection('handwerk', 'maler'), composition: 'business' }).templateId).toBe(
    'handwerk-solid',
  );
  expect(chooseTemplate(lead, ['handwerk-klar']).templateId).not.toBe('handwerk-klar');
  expect(chooseTemplate(lead, ['handwerk-klar', 'handwerk-solid', 'handwerk-werkstatt']).templateId).toBe('handwerk-plakat');
});
it('captures lazy images below the fold without waiting for a visitor to scroll', async () => {
  const { takeScreenshots } = await import('../src/render/screenshots');
  const { closeBrowser } = await import('../src/render/browser');
  try {
    const shots = await takeScreenshots(
      '<!doctype html><html lang="de"><title>Fiktiver Test</title><h1>Testbild</h1><div style="height:2000px"></div><img loading="lazy" alt="Test" width="1" height="1" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=="></html>',
    );
    expect(shots.desktop.length).toBeGreaterThan(100);
    expect(shots.mobile.length).toBeGreaterThan(100);
  } finally {
    await closeBrowser();
  }
}, 15000);
it('blocks missing business identity and broken internal navigation', async () => {
  const { browserChecks } = await import('../src/render/qa');
  const { closeBrowser } = await import('../src/render/browser');
  try {
    const checks = await browserChecks({
      html: '<!doctype html><html lang="de"><head><title>Test</title></head><body><main><h1>Fiktive Vorschau</h1><a href="#nicht-vorhanden">Kontakt</a></main></body></html>',
      expectedFacts: { name: 'Anderer Betrieb', city: 'Anderer Ort' },
    });
    const structure = checks.filter((c) => c.name.startsWith('struktur-'));
    expect(structure).toHaveLength(2);
    expect(structure.every((c) => !c.passed)).toBe(true);
  } finally {
    await closeBrowser();
  }
});
