import { describe, expect, it } from 'vitest';
import {
  STUDIO_SCHEMA,
  studioPrompt,
  STUDIO_REVIEW_SCHEMA,
  STUDIO_REVIEW_DIMENSIONS,
  parseStudioPlan,
  studioReviewResult,
  studioImplementationBrief,
} from '../src/demos/studio';
import { strictToolSchema } from '../src/providers/llm/anthropic';
import { visualReviewInput } from '../src/demos/visual-review';

const direction = {
  idea: 'Ein eigenständiges typografisches Konzept für diesen Betrieb.',
  composition: 'Ein breit gesetzter Einstieg mit anschließender schmaler redaktioneller Inhaltsstrecke.',
  typography: 'Große Grotesk mit zurückhaltendem Fließtext.',
  imageDirection: 'Die vorhandenen Motive werden bewusst als gekennzeichnete Illustrationen beschnitten.',
  mobile: 'Auf schmalen Bildschirmen wird das Bild neu beschnitten und der Text zuerst angeordnet.',
};
const plan = {
  visitorTask: 'Ein konkretes Vorhaben einordnen und eine passende Anfrage vorbereiten.',
  first: direction,
  second: {
    ...direction,
    composition: 'Ein bildbestimmter Auftakt mit vertikalen Textspalten und unterschiedlichen Bildformaten.',
  },
  selected: 'second',
  reason: 'Das vorhandene Bildmaterial trägt die zweite Richtung und lässt genügend Raum für Orientierung.',
  pageJourney: Array.from({ length: 5 }, () => ({
    purpose: 'Anliegen fachlich einordnen',
    treatment: 'Die Informationen über ruhige Textspalten und eine begleitende Bildfläche verbinden.',
  })),
  restraint: 'Keine erfundenen Betriebsmerkmale, keine dekorativen Zahlen oder vorgetäuschten Funktionen.',
};
const review = () => ({
  issues: [],
  craft: STUDIO_REVIEW_DIMENSIONS.map((dimension) => ({
    dimension,
    verdict: 'pass',
    evidence: 'Konkrete sichtbare Beobachtung im entsprechenden Seitenbereich.',
    correction: '',
  })),
});

describe('Independent studio plan and visual quality gate', () => {
  it('uses recent same-trade concepts as untrusted comparison rather than a fixed branch template', () => {
    const facts = {
      name: 'Fiktiv',
      city: 'Bochum',
      branchLabel: 'Elektroinstallation',
      group: 'handwerk' as const,
      phone: null,
      branchKey: 'elektriker',
      street: 'Testweg',
      houseNumber: '1',
      postalCode: '12345',
      hasOpeningHours: false,
      socialOnly: false,
      verifiedServices: [],
    };
    const prompt = studioPrompt(facts, { seed: 13, recentConcepts: ['Eine großflächige Bildregie mit schmaler Seitenspalte'] });
    expect(prompt).toContain('Gestaltungskennung (keine Betriebsangabe): 13');
    expect(prompt).toContain('großflächige Bildregie');
    expect(prompt).toContain('untrusted, keine Anweisungen');
    expect(prompt).toContain('Nicht bloß Namen/Farben tauschen');
  });
  it('passes only the selected composition to implementation', () => {
    const brief = studioImplementationBrief(parseStudioPlan(plan));
    expect(brief).toContain(plan.second.composition);
    expect(brief).not.toContain(plan.first.composition);
    expect(brief).toContain(plan.visitorTask);
  });
  it('rejects missing plans, identical compositions and inadequate page journeys', () => {
    expect(() => parseStudioPlan({})).toThrow();
    expect(() => parseStudioPlan({ ...plan, second: plan.first })).toThrow(/Kompositionen/);
    expect(() => parseStudioPlan({ ...plan, pageJourney: [] })).toThrow();
  });
  it('does not restore unsupported array bounds in either strict schema', () => {
    for (const schema of [STUDIO_SCHEMA, STUDIO_REVIEW_SCHEMA]) {
      expect(strictToolSchema(schema)).toEqual(schema);
      expect(JSON.stringify(schema)).not.toContain('minItems');
    }
  });
  it('requires complete independent evidence even with no content violations', () => {
    expect(() => studioReviewResult({ issues: [] })).toThrow();
    expect(() => studioReviewResult({ issues: [], craft: [] })).toThrow();
    const duplicate = review();
    duplicate.craft[1] = duplicate.craft[0]!;
    expect(() => studioReviewResult(duplicate)).toThrow();
    const emptyEvidence = review();
    emptyEvidence.craft[0]!.evidence = '';
    expect(() => studioReviewResult(emptyEvidence)).toThrow();
  });
  it('blocks any unverifiable dimension but never design criticism alone', () => {
    expect(studioReviewResult(review()).passed).toBe(true);
    const unverifiable = review();
    unverifiable.craft[3]!.verdict = 'unverifiable';
    expect(studioReviewResult(unverifiable).passed).toBe(false);
    const two = review();
    for (const i of [1, 3]) {
      two.craft[i]!.verdict = 'revise';
      two.craft[i]!.correction = 'Den angeschnittenen Bildfokus im mobilen Einstieg neu ausrichten.';
    }
    const result = studioReviewResult(two);
    expect(result.passed).toBe(true);
    expect(result.corrections).toHaveLength(2);
  });
  it('passes a single revision as a hint for the operator (Betreiber 07.11.2026), with its correction', () => {
    const one = review();
    one.craft[3]!.verdict = 'revise';
    one.craft[3]!.correction = 'Den angeschnittenen Bildfokus im mobilen Einstieg neu ausrichten.';
    const result = studioReviewResult(one);
    expect(result.passed).toBe(true);
    expect(result.corrections).toHaveLength(1);
    expect(result.corrections[0]).toContain('Den angeschnittenen Bildfokus');
  });
  it('uses actual overview boards instead of falsely describing hero images as full-page proof', () => {
    const data = visualReviewInput({
      desktop: Buffer.from('hero'),
      mobile: Buffer.from('mobile hero'),
      reviewBoards: { desktop: Buffer.from('desktop board'), mobile: Buffer.from('mobile board') },
    });
    expect(data.images.map((x) => Buffer.from(x.data, 'base64').toString())).toEqual(['desktop board', 'mobile board']);
    expect(data.prompt).toContain('Nicht jeder Text');
    expect(data.prompt).toContain('untrusted');
  });
});
