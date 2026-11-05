import { beforeEach, describe, expect, it, vi } from 'vitest';
const { generate } = vi.hoisted(() => ({ generate: vi.fn() }));
vi.mock('../src/services/llm', () => ({ llmStructured: generate, modelFor: () => 'mock' }));
vi.mock('../src/services/lead-research', () => ({
  leadResearch: async () => null,
  researchLetterFacts: () => [],
  assertAcquisitionEligible: async () => {},
}));
import { generateDemoContent } from '../src/demos/build';
import { MockLlm } from '../src/providers/llm/mock';
import { DEFAULT_CONFIG } from '../src/config/settings';
import { STUDIO_TOOL } from '../src/demos/studio';
import { DEMO_TOOL_NAME } from '../src/demos/content';

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
  });
  it('stops before authoring when the concept is malformed', async () => {
    generate.mockResolvedValueOnce({});
    await expect(generateDemoContent(lead, DEFAULT_CONFIG)).rejects.toThrow();
    expect(generate).toHaveBeenCalledTimes(1);
  });
  it('reuses the plan for one bounded correction and never returns a template fallback', async () => {
    generate.mockImplementation(async (req) => (req.toolName === STUDIO_TOOL ? mockResponse(req) : {}));
    await expect(generateDemoContent(lead, DEFAULT_CONFIG)).rejects.toThrow(/keine Ersatzvorlage/);
    expect(generate.mock.calls.map(([req]) => req.toolName)).toEqual([STUDIO_TOOL, DEMO_TOOL_NAME, DEMO_TOOL_NAME]);
  });
});
