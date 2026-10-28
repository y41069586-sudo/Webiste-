import { describe, expect, it } from 'vitest';
import { previewInvitationCopy, type VerifiedLetterContext } from '../src/letters/personalization';
import { invitationDraftIssues, writePreviewInvitation, LETTER_WRITER_TOOL, type InvitationDraft } from '../src/letters/writer';
import { researchLetterFacts } from '../src/services/lead-research';
import type { LeadResearch } from '../src/leads/acquisition';

const now = new Date().toISOString();
const observation = {
  kind: 'public_observation' as const,
  text: 'Sie bieten seit Kurzem auch Fassadenarbeiten an',
  source: 'https://www.instagram.com/fiktiv/',
  verified: true,
  checkedAt: now,
};
const website = {
  kind: 'website_search' as const,
  text: 'not_found',
  source: 'fixture:search',
  verified: true,
  checkedAt: now,
  checks: ['name_city_search', 'directory_links', 'social_links'] as ('name_city_search' | 'directory_links' | 'social_links')[],
};
const context: VerifiedLetterContext = {
  businessName: 'Malerbetrieb Fiktiv',
  city: 'Testort',
  branchLabel: 'Malerbetrieb',
  details: [{ text: 'Innenanstrich', source: 'fixture:service', verified: true }, observation, website],
};

describe('Persönlicher Einstieg aus belegter Beobachtung', () => {
  it('beginnt Brief 1 mit der belegten Beobachtung und behält den Recherchehinweis', () => {
    const copy = previewInvitationCopy(context, 1);
    expect(copy.opening).toMatch(/^mir ist aufgefallen: Sie bieten seit Kurzem auch Fassadenarbeiten an\. Deshalb habe ich/);
    expect(copy.research).toContain('keinen eigenen Webauftritt');
    expect(copy.sources.map((s) => s.text)).toContain(observation.text);
  });
  it('ohne Beobachtung kein persönlicher Befund, in Folgebriefen ebenfalls nicht', () => {
    const plain = previewInvitationCopy({ ...context, details: [context.details[0]!] }, 1);
    expect(JSON.stringify(plain)).not.toMatch(/aufgefallen/);
    expect(previewInvitationCopy(context, 2).opening).not.toMatch(/aufgefallen/);
  });
  it('übernimmt aus der Recherche nur aktuelle, geeignete Befunde – keine freien Termine, keine alten Ereignisse', () => {
    const research = (signals: LeadResearch['signals']): LeadResearch => ({
      version: 1,
      identityHash: 'x',
      checkedAt: now,
      lawfulUseConfirmed: true,
      website: { result: 'not_found', checkedAt: now, methods: [], source: 'https://example.org/suche' },
      signals,
    });
    const sig = (kind: LeadResearch['signals'][number]['kind'], text: string, occurredOn?: string) => ({
      kind,
      text,
      source: 'https://example.org/quelle',
      observedAt: now,
      verified: true as const,
      ...(occurredOn ? { occurredOn } : {}),
    });
    expect(researchLetterFacts(research([sig('new_offer', 'Sie bieten neu Fassadenarbeiten an')])).at(-1)).toMatchObject({
      kind: 'public_observation',
      text: 'Sie bieten neu Fassadenarbeiten an',
    });
    expect(researchLetterFacts(research([sig('available_dates', 'Freie Termine im November')]))).toEqual([]);
    expect(researchLetterFacts(research([sig('takeover', 'Sie haben den Betrieb übernommen', '2019-01-01')]))).toEqual([]);
  });
});

describe('KI-Fassung des persönlichen Einstiegs', () => {
  const draft: InvitationDraft = {
    subject: 'Malerbetrieb Fiktiv: Ihre Website-Vorschau ist online',
    opening: 'Deshalb habe ich für Ihren Betrieb eine eigene Website gebaut – mit Ihrem Namen und Ihrer Adresse.',
    benefit: 'Wer in Testort einen Innenanstrich plant, sieht im Entwurf sofort Ihr Angebot und ruft direkt an.',
    qrCaption: 'Ihre Website-Vorschau kostenlos ansehen',
    factIds: ['F1'],
    observation: 'Mir ist aufgefallen, dass Sie seit Kurzem auch Fassadenarbeiten anbieten.',
  };
  const facts = [{ id: 'F1', text: 'Innenanstrich' }];
  it('akzeptiert eine sachliche Umformulierung mit allen Kernbegriffen', () => {
    expect(invitationDraftIssues(draft, context, facts, observation)).toEqual([]);
  });
  it('lehnt erfundene, bewertende oder fehlende Beobachtungen ab', () => {
    expect(
      invitationDraftIssues(
        { ...draft, observation: 'Mir ist aufgefallen, dass Sie tolle Arbeiten zeigen.' },
        context,
        facts,
        observation,
      ).join(),
    ).toMatch(/Kernbegriffen|bewerten/);
    expect(invitationDraftIssues({ ...draft, observation: undefined }, context, facts, observation).join()).toMatch(
      /Mir ist aufgefallen/,
    );
    expect(invitationDraftIssues(draft, context, facts).join()).toMatch(/Ohne belegte Beobachtung/);
  });
  it('setzt den geprüften Satz vor den Einstieg und hängt den Recherchehinweis wieder an', async () => {
    const result = await writePreviewInvitation(
      { context, sequence: 1, demoHtml: '<h1>Malerbetrieb Fiktiv</h1><p>Innenanstrich</p>' },
      {
        mock: false,
        call: async <T>(r: { toolName: string; prompt: string }) => {
          if (r.toolName === LETTER_WRITER_TOOL) {
            expect(JSON.parse(r.prompt).observation).toEqual({ text: observation.text });
            return draft as T;
          }
          return { passed: true, issues: [] } as T;
        },
      },
    );
    expect(result.engine).toBe('llm');
    expect(result.copy.opening).toMatch(/^mir ist aufgefallen, dass Sie seit Kurzem auch Fassadenarbeiten anbieten\. Deshalb/);
    expect(result.copy.intro.join(' ')).toContain('keinen eigenen Webauftritt');
  });
});
