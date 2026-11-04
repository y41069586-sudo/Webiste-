import { describe, it, expect } from 'vitest';
import { checkAuthoredDesign, updateAuthoredCopy, type SiteContent } from '@wbm/templates';
import { buildDemoPrompt, validateDemoContent, DEMO_CONTENT_SCHEMA, type ContentFacts } from '../src/demos/content';
import { libraryContent } from '../src/demos/library';
import { revisionSchema, buildRevisionPrompt, mergeCustomerTexts, validateRevision } from '../src/sites/revision';
import { DEMO_TOOL_NAME } from '../src/demos/content';
import { MockLlm } from '../src/providers/llm/mock';
import '../src/demos/mock-handlers';
const facts: ContentFacts = {
  name: 'Fiktiver Elektrobetrieb',
  branchKey: 'elektriker',
  branchLabel: 'Elektroinstallation',
  group: 'handwerk',
  city: 'Testort',
  street: 'Testweg',
  houseNumber: '1',
  postalCode: '12345',
  phone: null,
  hasOpeningHours: false,
  socialOnly: false,
};
const content = (): SiteContent => {
  const c = libraryContent('elektriker', 'handwerk', { name: facts.name, stadt: facts.city, branche: facts.branchLabel }, 0);
  return {
    ...c,
    about: '',
    faq: [],
    design: {
      concept: 'Nur für den Test erstellter freier Satzspiegel.',
      displayFont: 'archivo',
      textFont: 'karla',
      colors: { background: '#ffffff', foreground: '#202020', accent: '#eeeeee', onAccent: '#202020' },
      html: `<div class="ad-page"><h1>${c.hero_headline}</h1><p>${c.hero_subline}</p><p>Beispiel-Leistungen</p><a href="#anfrage">${c.cta_text}</a></div>`,
      css: '.ad-page{padding:20px}',
    },
  };
};
describe('Freie Generierung und weitere Inhaltsbearbeitung', () => {
  it('uses only the explicitly selected mock provider for a cost-free test draft', async () => {
    const out = await new MockLlm().generateStructured<SiteContent>({
      toolName: DEMO_TOOL_NAME,
      toolDescription: 'Isolierter Entwurfstest',
      prompt: buildDemoPrompt(facts, 0),
      system: 'test',
      inputSchema: DEMO_CONTENT_SCHEMA,
      model: 'mock',
      maxTokens: 10000,
      purpose: 'demo_content',
    });
    expect(out.usage.outputTokens).toBe(0);
    expect(checkAuthoredDesign(out.data.design!)).toEqual([]);
    expect(validateDemoContent(out.data, facts)).toEqual([]);
  });
  it('requires real HTML/CSS in the generation schema, not a composition selector', () => {
    expect(DEMO_CONTENT_SCHEMA.required).toContain('design');
    const p = buildDemoPrompt(facts, 0);
    expect(p).toContain('Keine Branchenvorlage');
    expect(p).toContain('Du gestaltest die Betriebsseite selbst');
    expect(p).not.toContain('Schaltlinie');
  });
  it('checks unsupported claims in authored prose, not only the metadata fields', () => {
    const c = content();
    c.design!.html += '<p>Garantiert am selben Tag.</p>';
    expect(validateDemoContent(c, facts).some((v) => v.field === 'design' && v.rule === 'Garantien/Versprechen')).toBe(true);
  });
  it('requires an example disclosure when no services have been verified', () => {
    const c = content();
    c.design!.html = c.design!.html.replace('<p>Beispiel-Leistungen</p>', '');
    expect(validateDemoContent(c, facts).some((v) => v.rule === 'Beispiel-Kennzeichnung')).toBe(true);
  });
  it('updates exact authored copy, escapes user input, and preserves the independent layout', () => {
    const c = content();
    const n = mergeCustomerTexts(c, { headline: 'Neue Räume <script>x</script>' });
    expect(n.design!.css).toBe(c.design!.css);
    expect(n.design!.html).toContain('Neue Räume &lt;script&gt;');
    expect(n.design!.html).not.toContain('<script>');
    expect(n.design!.html).not.toContain(c.hero_headline);
  });
  it('replaces headlines split over elements, without retaining stale text', () => {
    const c = content();
    c.hero_headline = 'Elektro. Ganz nah.';
    c.design!.html = '<div><h1>Elektro.<br><span>Ganz nah.</span></h1></div>';
    const n = updateAuthoredCopy(c, { ...c, hero_headline: 'Ein neuer Titel' });
    expect(n.design!.html).toContain('<h1>Ein neuer Titel</h1>');
    expect(checkAuthoredDesign(n.design!)).toEqual([]);
  });
  it('blocks unmatched edits rather than claiming stale HTML was changed', () => {
    const c = content();
    c.design!.html = '<div><h1>Ein anderer Entwurf</h1></div>';
    expect(() => mergeCustomerTexts(c, { headline: 'Neuer Titel' })).toThrow(/zuordnen/);
    expect(() => mergeCustomerTexts(c, { about: 'Ein neuer Abschnitt' })).toThrow(/eigenen Platz/);
  });
  it('requires updated design in customer revision of authored drafts and keeps legacy schema compatible', () => {
    const c = content();
    expect(revisionSchema(c).properties.content.required).toContain('design');
    expect(revisionSchema({ ...c, design: undefined }).properties.content.required).not.toContain('design');
    expect(
      buildRevisionPrompt({
        businessName: facts.name,
        branchLabel: facts.branchLabel,
        city: facts.city,
        current: c,
        customer: {},
      }),
    ).toContain('kein veralteter Text im HTML');
  });
  it('does not force FAQ/history for thin-data customer pages and checks new design claims', () => {
    const c = content();
    expect(validateRevision(c, JSON.stringify(c), [facts.name, facts.city])).toEqual([]);
    c.design!.html += '<p>Ein garantiert kostenloser Notdienst.</p>';
    expect(validateRevision(c, '', []).some((v) => v.field === 'design')).toBe(true);
  });
});
