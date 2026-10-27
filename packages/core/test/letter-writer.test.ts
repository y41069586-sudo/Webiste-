import { expect, it } from 'vitest';
import { composeLetter } from '../src/letters/compose';
import {
  writePreviewInvitation,
  invitationDraftIssues,
  demoReadingText,
  LETTER_WRITER_TOOL,
  LETTER_REVIEW_TOOL,
  type InvitationDraft,
} from '../src/letters/writer';
import { DEFAULT_CONFIG, deepMerge } from '../src/config/settings';
import { v4LetterVariant } from '../src/letters/conversion-v4';
import type { VerifiedLetterContext } from '../src/letters/personalization';

const context: VerifiedLetterContext = {
  businessName: 'Elektro Testlicht',
  city: 'Testort',
  branchLabel: 'Elektrobetrieb',
  details: [{ text: 'Photovoltaik', verified: true, source: 'fixture:reviewed-service' }],
};
const draft: InvitationDraft = {
  subject: 'Elektro Testlicht: Ihr Angebot als Website-Idee',
  opening:
    'Wer eine Anlage plant, möchte zunächst den passenden Betrieb kennenlernen. Dafür ist dieser persönliche Website-Entwurf vorbereitet.',
  benefit: 'Photovoltaik steht im Entwurf im Mittelpunkt. Interessierte könnten Ihr Angebot vor einer Anfrage in Ruhe ansehen.',
  qrCaption: 'Ihren Website-Entwurf kostenlos ansehen',
  factIds: ['F1'],
};
const demoHtml = '<h1>Elektro Testlicht</h1><p>Photovoltaik</p><a href="#kontakt">Anfrage</a>';
const packet = { context, sequence: 1 as const, demoHtml };

it('uses the budgeted writer and a separate grounding review, with traceable business facts', async () => {
  const requests: { toolName: string; prompt: string }[] = [];
  const result = await writePreviewInvitation(packet, {
    mock: false,
    call: async <T>(r: { toolName: string; prompt: string }) => {
      requests.push(r);
      return (r.toolName === LETTER_WRITER_TOOL ? draft : { passed: true, issues: [] }) as T;
    },
  });
  expect(requests.map((r) => r.toolName)).toEqual([LETTER_WRITER_TOOL, LETTER_REVIEW_TOOL]);
  expect(JSON.parse(requests[0]!.prompt).facts).toEqual([{ id: 'F1', text: 'Photovoltaik' }]);
  expect(result.copy.subject).toBe(draft.subject);
  expect(result.copy.intro).toEqual([draft.benefit]);
  expect(result.copy.sources).toEqual([{ text: 'Photovoltaik', source: 'fixture:reviewed-service' }]);
  expect(result).toMatchObject({ engine: 'llm', attempts: 1, reviewReasons: [] });
});
it('rejects a false demo feature reported by the grounding review and repairs once', async () => {
  let attempts = 0;
  const prompts: string[] = [];
  const result = await writePreviewInvitation(packet, {
    mock: false,
    call: async <T>(r: { toolName: string; prompt: string }) => {
      prompts.push(r.prompt);
      if (r.toolName === LETTER_WRITER_TOOL) {
        attempts++;
        return (attempts === 1 ? { ...draft, benefit: draft.benefit + ' Ihr Online-Shop nimmt Aufträge an.' } : draft) as T;
      }
      return (
        attempts === 1
          ? { passed: false, issues: ['Online-Shop ist weder belegt noch in der Demo vorhanden.'] }
          : { passed: true, issues: [] }
      ) as T;
    },
  });
  expect(result.engine).toBe('llm');
  expect(result.attempts).toBe(2);
  expect(prompts[2]).toContain('Online-Shop');
  expect(result.copy.intro.join()).not.toContain('Online-Shop');
});
it('does not accept a letter promising an actual source service that the saved demo omits', async () => {
  const r = await writePreviewInvitation(
    { ...packet, demoHtml: '<h1>Elektro Testlicht</h1><p>Nur allgemeine Informationen.</p>' },
    {
      mock: false,
      call: async <T>(request: { toolName: string }) =>
        (request.toolName === LETTER_WRITER_TOOL ? draft : { passed: true, issues: [] }) as T,
    },
  );
  expect(r.engine).toBe('fallback');
  expect(r.reviewReasons.join(' ')).toContain('gespeicherten Demo');
});
it('bounds retries, ignores malformed reviews and leaves a human-review fallback', async () => {
  let n = 0;
  const result = await writePreviewInvitation(packet, {
    mock: false,
    call: async <T>(r: { toolName: string }) => {
      n++;
      return (r.toolName === LETTER_WRITER_TOOL ? draft : { passed: true }) as T;
    },
  });
  expect(n).toBe(4);
  expect(result).toMatchObject({ engine: 'fallback', attempts: 2 });
  expect(result.reviewReasons.join()).toMatch(/Prüfung|prüfen/);
});
it('does not call any paid provider in mock mode or for a fact-poor business', async () => {
  let n = 0;
  const deps = {
    mock: true,
    call: async <T>() => {
      n++;
      return draft as T;
    },
  };
  const mock = await writePreviewInvitation(packet, deps);
  const basic = await writePreviewInvitation({ ...packet, context: { ...context, details: [] } }, { ...deps, mock: false });
  expect(n).toBe(0);
  expect(mock.engine).toBe('fallback');
  expect(basic.copy.level).toBe('basic');
  expect(basic.reviewReasons.join()).toContain('Detailangaben');
});
it('does not retry provider/budget failure and never stores raw provider errors', async () => {
  let n = 0;
  const r = await writePreviewInvitation(packet, {
    mock: false,
    call: async () => {
      n++;
      throw new Error('private-provider-detail');
    },
  });
  expect(n).toBe(1);
  expect(r.engine).toBe('fallback');
  expect(JSON.stringify(r)).not.toContain('private-provider-detail');
});
it('blocks wrong company documents and strips executable content from the reading packet', async () => {
  const r = await writePreviewInvitation(
    { ...packet, demoHtml: '<h1>Andere Firma</h1>' },
    {
      mock: false,
      call: async () => {
        throw Error('Must not be called');
      },
    },
  );
  expect(r.attempts).toBe(0);
  expect(r.engine).toBe('fallback');
  expect(demoReadingText('<style>evil</style><script>evil()</script><h1>Mira&#39;s &amp; Ort</h1>')).toBe("Mira's & Ort");
});
it('rejects generic or priced copy, unknown references, missing fact use and markup', () => {
  const facts = [{ id: 'F1', text: 'Photovoltaik' }];
  for (const bad of [
    { ...draft, benefit: 'Ihre Zufriedenheit ist unsere Leidenschaft. Photovoltaik ist unsere Stärke.' },
    { ...draft, benefit: draft.benefit + ' Für nur 597 €.' },
    { ...draft, factIds: ['F9'] },
    { ...draft, factIds: [] },
    { ...draft, benefit: 'Leistungen und Kontakt für Interessierte an einem Ort.' },
    { ...draft, subject: '<b>Elektro Testlicht</b>' },
    { ...draft, opening: 'Bei unserer Recherche haben wir keine eigene Website gefunden.' },
  ])
    expect(invitationDraftIssues(bad, context, facts).length).toBeGreaterThan(0);
});
it('changes the semantic focus for photovoltaic specialists versus installations and salon color versus barber', async () => {
  const solar = await writePreviewInvitation(packet, { mock: true, call: async <T>() => draft as T });
  const classic = await writePreviewInvitation(
    {
      ...packet,
      context: {
        ...context,
        details: [{ ...context.details[0]!, text: 'Elektroinstallation' }],
      },
    },
    { mock: true, call: async <T>() => draft as T },
  );
  expect(solar.copy.profile).toBe('electric-solar');
  expect(classic.copy.profile).toBe('electric');
  expect(solar.copy.subject).not.toBe(classic.copy.subject);
});
it('refuses using the same authored text for a different source packet in composition', async () => {
  const written = await writePreviewInvitation(packet, { mock: true, call: async <T>() => draft as T });
  const changed = { ...context, details: [{ ...context.details[0]!, text: 'Elektroinstallation' }] };
  expect(() =>
    composeLetter({
      cfg: deepMerge(DEFAULT_CONFIG, { offers: { activeVersion: 'v4' } }),
      recipient: {
        businessName: context.businessName,
        street: 'Testweg',
        houseNumber: '1',
        postalCode: '12345',
        city: context.city,
      },
      branchLabel: context.branchLabel,
      personalization: changed,
      invitationCopy: written,
      variant: v4LetterVariant('handwerk', 'A'),
      domain: null,
      rating: null,
      compositeDataUri: null,
      qrDataUri: '',
      shortUrl: '',
      dateLine: '',
      privacyNotice: 'Art. 14',
      objectionNotice: 'Art. 21',
      priceLabel: '597 €',
      expiresLabel: '',
    }),
  ).toThrow(/Faktenpaket/);
});
