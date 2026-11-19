import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getProviders } from '../src/providers';
import { chooseTemplate } from '../src/demos/build';
import type { ContentFacts } from '../src/demos/content';
import {
  DESIGN_POLICY,
  DESIGN_POLICY_VERSION,
  DESIGN_BUDGET,
  buildDesignBrief,
  designMeta,
  normalizedFacts,
  referenceUrlAllowed,
} from '../src/demos/design-policy';
import { authorPraxisContent, praxisReviewResult, reviewPraxisDemo, PRAXIS_TOOL } from '../src/demos/praxis-author';
import { authorStudioContent } from '../src/demos/studio-author';
import '../src/demos/mock-handlers';

const facts: ContentFacts = {
  name: 'Testbetrieb Dachdeckerei',
  branchKey: 'dachdecker',
  branchLabel: 'Dachdeckerbetrieb',
  group: 'handwerk',
  city: 'Teststadt',
  street: 'Testweg',
  houseNumber: '1',
  postalCode: '12345',
  phone: '0231 0000000',
  hasOpeningHours: false,
  socialOnly: false,
};

/** Fängt die tatsächlich an den Anbieter gesendeten Anfragen ab (realer Aufrufpfad bis zum Provider). */
function capture() {
  const llm = getProviders().llm;
  const calls: { system?: string; prompt: string; toolName: string; purpose?: string }[] = [];
  const orig = llm.generateStructured.bind(llm);
  const spy = vi.spyOn(llm, 'generateStructured').mockImplementation(async (req) => {
    calls.push({ system: req.system, prompt: req.prompt, toolName: req.toolName, purpose: req.purpose });
    return orig(req);
  });
  return { calls, spy };
}

afterEach(() => vi.restoreAllMocks());

describe('Designrichtlinie: Bindung aller designrelevanten Modellaufrufe', () => {
  it('Praxis-Texte: Erstentwurf erhält Richtlinie, Betriebsdaten mit Status, Briefing und Referenzen', async () => {
    const { calls } = capture();
    const brief = buildDesignBrief(facts, { hasPhotos: true });
    const out = await authorPraxisContent(facts, brief, { leadId: undefined });
    expect(out.source).toBe('llm');
    const call = calls.find((c) => c.toolName === PRAXIS_TOOL)!;
    expect(call.system).toContain(DESIGN_POLICY_VERSION);
    expect(call.system!.startsWith(DESIGN_POLICY)).toBe(true);
    expect(call.prompt).toContain('BETRIEBSDATEN');
    expect(call.prompt).toContain('DESIGNBRIEFING');
    expect(call.prompt).toContain('[fehlend');
    expect(call.prompt).toContain('pilch-dachbau.de');
  });

  it('Korrektur/Retry: auch der zweite Versuch mit Feedback trägt die Richtlinie', async () => {
    const { calls } = capture();
    const brief = buildDesignBrief(facts, { hasPhotos: true });
    await authorPraxisContent(facts, brief, { feedback: ['hero_headline: zu allgemein'] });
    const call = calls.find((c) => c.toolName === PRAXIS_TOOL)!;
    expect(call.prompt).toContain('zu allgemein');
    expect(call.system).toContain(DESIGN_POLICY_VERSION);
  });

  it('Getrennte Bewertung: eigener Aufruf mit Kriterien, Briefing und Testergebnissen', async () => {
    const { calls } = capture();
    const brief = buildDesignBrief(facts, { hasPhotos: true });
    const content = (await authorPraxisContent(facts, brief)).content;
    const review = await reviewPraxisDemo({ facts, brief, content, testResults: ['axe: ok'] });
    const call = calls.find((c) => c.toolName === 'praxis_bewertung')!;
    expect(call.system).toContain(DESIGN_POLICY_VERSION);
    expect(call.system).toContain('unabhängiger Prüfer');
    expect(call.prompt).toContain('DESIGNBRIEFING');
    expect(call.prompt).toContain('axe: ok');
    // Testantwort ist als solche gekennzeichnet (Mock-Anbieter nur in Tests/ohne Schlüssel)
    expect(review.details).toContain('Testantwort (Mock)');
  });

  it('Freier Entwurf (andere Gruppen): Konzept- und Entwurfsaufruf tragen die Richtlinie', async () => {
    const { calls } = capture();
    await authorStudioContent({ ...facts, group: 'handwerk' }, { seed: 1 }).catch(() => undefined);
    expect(calls.length).toBeGreaterThanOrEqual(1);
    for (const c of calls) expect(c.system).toContain(DESIGN_POLICY_VERSION);
  });

  it('Kein designrelevanter Aufrufpfad umgeht designCall', () => {
    for (const f of ['studio-author.ts', 'business-design.ts', 'praxis-author.ts']) {
      const src = readFileSync(path.join(__dirname, '../src/demos', f), 'utf8');
      expect(src, f).not.toMatch(/\bllmStructured\s*</);
    }
    const qa = readFileSync(path.join(__dirname, '../src/render/demo-qa.ts'), 'utf8');
    expect(qa).toContain('reviewPraxisDemo(');
  });
});

describe('Briefing, Fakten, Bewertung', () => {
  it('Richtung je Gewerk und Metadaten pro Demo', () => {
    const ids = ['dachdecker', 'elektriker', 'sanitaer', 'maler', 'fliesenleger', 'gartenbau'].map(
      (branch) => chooseTemplate({ id: 'x', branchGroup: 'handwerk', branch }).templateId,
    );
    expect(ids).toEqual(['praxis-projekt', 'praxis-service', 'praxis-service', 'praxis-raeume', 'praxis-raeume', 'praxis-garten']);
    expect(chooseTemplate({ id: 'x', branchGroup: 'beauty', branch: 'kosmetikstudio' }).templateId).toBe('authored-beauty');
    const meta = designMeta(buildDesignBrief(facts));
    expect(meta.policyVersion).toBe(DESIGN_POLICY_VERSION);
    expect(meta.templateVersion).toBe('praxis-1');
    expect(meta.model).toBeTruthy();
  });

  it('Fehlende Belege sind markiert; Bewertungen nie bestätigt', () => {
    const f = normalizedFacts({ ...facts, phone: null });
    expect(f.find((x) => x.field === 'Telefon')?.status).toBe('fehlend');
    expect(f.find((x) => x.field === 'Bewertungen')?.status).toBe('fehlend');
    const b = buildDesignBrief({ ...facts, phone: null });
    expect(b.missing.join(' ')).toContain('Bewertungen');
    expect(b.references.every((r) => r.seen === false)).toBe(true);
  });

  it('Bewertung: Schwelle 85, Sperrgründe und fehlende Kriterien blockieren', () => {
    const full = (pts: number[]) => ({
      scores: ['passung', 'anfrageweg', 'fakten', 'gestaltung', 'mobil', 'technik'].map((key, i) => ({ key, points: pts[i], evidence: 'x' })),
      blockers: [],
      issues: [],
      corrections: [],
    });
    expect(praxisReviewResult(full([18, 18, 18, 17, 9, 9])).passed).toBe(true); // 89
    expect(praxisReviewResult(full([16, 16, 16, 16, 8, 8])).passed).toBe(false); // 80
    expect(praxisReviewResult({ ...full([20, 20, 20, 20, 10, 10]), blockers: ['falsches_branchenbild'] }).passed).toBe(false);
    expect(praxisReviewResult({ scores: [], blockers: [] }).blockers).toContain('fehlende_visuelle_pruefung');
    expect(DESIGN_BUDGET.maxCorrections).toBe(2);
  });

  it('Referenzabruf nur von kuratierten Domains', () => {
    expect(referenceUrlAllowed('https://pilch-dachbau.de/leistungen')).toBe(true);
    expect(referenceUrlAllowed('https://evil.example/')).toBe(false);
    expect(referenceUrlAllowed('http://pilch-dachbau.de/')).toBe(false);
  });
});
