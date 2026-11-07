import { beforeEach, describe, expect, it, vi } from 'vitest';
const { generate } = vi.hoisted(() => ({ generate: vi.fn() }));
vi.mock('../src/services/llm', () => ({ llmStructured: generate, modelFor: () => 'mock' }));
vi.mock('../src/services/lead-research', () => ({
  leadResearch: async () => null,
  researchLetterFacts: () => [],
  assertAcquisitionEligible: async () => {},
}));
import { generateDemoContent } from '../src/demos/build';
import { authorStudioContent } from '../src/demos/studio-author';
import { MockLlm } from '../src/providers/llm/mock';
import { DEFAULT_CONFIG } from '../src/config/settings';
import { STUDIO_TOOL, STUDIO_CALL_OPTIONS } from '../src/demos/studio';
import { DEMO_TOOL_NAME, ensureVerifiedServiceInHero, tidyAuthoredDesign } from '../src/demos/content';

const lead = {
  id: '11111111-1111-4111-8111-111111111111',
  businessName: 'Fiktiver Elektrobetrieb',
  branch: 'elektriker',
  branchGroup: 'handwerk',
  city: 'Testort',
  street: 'Testweg',
  houseNumber: '1',
  postalCode: '12345',
  phone: null,
  openingHours: null,
  socialOnly: false,
} as Parameters<typeof generateDemoContent>[0];
const mockResponse = async (req: Parameters<MockLlm['generateStructured']>[0]) =>
  (await new MockLlm().generateStructured({ ...req, model: 'mock' })).data;

describe('Studio generation orchestration without database or paid provider', () => {
  beforeEach(() => {
    generate.mockReset();
    generate.mockImplementation(mockResponse);
  });
  it('plans first, authors second and retains the selected plan for audit', async () => {
    const result = await generateDemoContent(lead, DEFAULT_CONFIG);
    expect(generate.mock.calls.map(([req]) => req.toolName)).toEqual([STUDIO_TOOL, DEMO_TOOL_NAME]);
    expect(result.studioPlan?.selected).toBe('first');
    expect(result.source).toBe('llm');
    expect(generate.mock.calls[1]![0].prompt).toContain(result.studioPlan!.first.composition);
    expect(generate.mock.calls[1]![0].prompt).not.toContain(result.studioPlan!.second.composition);
    expect(generate.mock.calls.every(([req]) => req.tier === 'creative')).toBe(true);
    expect(generate.mock.calls[0]![0]).toMatchObject(STUDIO_CALL_OPTIONS.concept);
    expect(generate.mock.calls[1]![0]).toMatchObject(STUDIO_CALL_OPTIONS.author);
  });
  it('stops before authoring when the concept is malformed', async () => {
    generate.mockResolvedValueOnce({});
    await expect(generateDemoContent(lead, DEFAULT_CONFIG)).rejects.toThrow();
    expect(generate).toHaveBeenCalledTimes(1);
  });
  it('supports a fictional preview with no production lead identity', async () => {
    const result = await authorStudioContent({
      name: 'Fiktiver Elektrobetrieb',
      branchLabel: 'Elektroinstallation',
      branchKey: 'elektriker',
      group: 'handwerk',
      city: 'Testort',
      street: 'Testweg',
      houseNumber: '1',
      postalCode: '12345',
      phone: null,
      hasOpeningHours: false,
      socialOnly: false,
    });
    expect(result.content.design).toBeDefined();
    expect(generate.mock.calls).toHaveLength(2);
    expect(generate.mock.calls.every(([req]) => req.leadId === undefined)).toBe(true);
  });
  it('reuses the plan for one bounded correction and never returns a template fallback', async () => {
    generate.mockImplementation(async (req) => (req.toolName === STUDIO_TOOL ? mockResponse(req) : {}));
    await expect(generateDemoContent(lead, DEFAULT_CONFIG)).rejects.toThrow(/keine Ersatzvorlage/);
    expect(generate.mock.calls.map(([req]) => req.toolName)).toEqual([STUDIO_TOOL, DEMO_TOOL_NAME, DEMO_TOOL_NAME]);
  });
  it('technischer Selbsttest: Befunde führen zu genau einer Nachbesserung mit den Befunden', async () => {
    const precheck = vi
      .fn()
      .mockResolvedValueOnce([
        { field: 'browser.axe-mobil', rule: 'Technische Prüfung nicht bestanden', detail: 'color-contrast – .ad-kicker' },
      ])
      .mockResolvedValueOnce([]);
    const result = await generateDemoContent(lead, DEFAULT_CONFIG, undefined, undefined, [], [], undefined, undefined, precheck);
    expect(generate.mock.calls.map(([req]) => req.toolName)).toEqual([STUDIO_TOOL, DEMO_TOOL_NAME, DEMO_TOOL_NAME]);
    expect(generate.mock.calls[2]![0].prompt).toContain('color-contrast – .ad-kicker');
    expect(precheck).toHaveBeenCalledTimes(2);
    expect(result.attempts).toBe(2);
    expect(result.precheckOpen).toBeUndefined();
  });
  it('technischer Selbsttest: nach der Nachbesserung offene Befunde blockieren nicht (Endprüfung entscheidet)', async () => {
    const open = [{ field: 'browser.layout-klein', rule: 'Technische Prüfung nicht bestanden', detail: 'offscreen: H3' }];
    const precheck = vi.fn().mockResolvedValue(open);
    const result = await generateDemoContent(lead, DEFAULT_CONFIG, undefined, undefined, [], [], undefined, undefined, precheck);
    expect(generate.mock.calls).toHaveLength(3);
    expect(result.content.design).toBeDefined();
    expect(result.precheckOpen).toEqual(open);
  });
  it('gleicht !important und nicht erlaubte Blockelemente vor der Prüfung an', () => {
    const tidy = tidyAuthoredDesign({
      html: '<aside class="x"><main><address>{{street}}</address></main></aside><p>Aside bleibt Text</p>',
      css: '.x{color:#111 !important;margin:0!IMPORTANT}',
    });
    expect(tidy.html).toBe('<div class="x"><div><div>{{street}}</div></div></div><p>Aside bleibt Text</p>');
    expect(tidy.css).toBe('.x{color:#111;margin:0}');
  });
  it('leert Text in CSS-content und lässt leere Werte stehen', () => {
    const tidy = tidyAuthoredDesign({
      html: '<p>x</p>',
      css: '.a::before{content:"→"}.b::after{content: \'01\'}.c::after{content:""}',
    });
    expect(tidy.css).toBe('.a::before{content:""}.b::after{content:""}.c::after{content:""}');
  });
  it('stellt einen bestätigten Leistungstitel in die Unterzeile, wenn er im Einstieg fehlt', () => {
    const base = {
      hero_headline: 'Kim Thanh',
      hero_subline: 'Ruhige Termine in Dortmund nach Absprache.',
    } as Parameters<typeof ensureVerifiedServiceInHero>[0];
    const out = ensureVerifiedServiceInHero(base, { verifiedServices: ['Maniküre'], city: 'Dortmund' });
    expect(out.hero_subline).toBe('Maniküre in Dortmund. Ruhige Termine in Dortmund nach Absprache.');
    expect(ensureVerifiedServiceInHero(out, { verifiedServices: ['Maniküre'], city: 'Dortmund' })).toBe(out);
    expect(ensureVerifiedServiceInHero(base, { verifiedServices: [], city: 'Dortmund' })).toBe(base);
    const long = { ...base, hero_subline: 'x'.repeat(175) };
    expect(ensureVerifiedServiceInHero(long, { verifiedServices: ['Maniküre'], city: 'Dortmund' }).hero_subline).toBe(
      'Maniküre in Dortmund.',
    );
  });
});
