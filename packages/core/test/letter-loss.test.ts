import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { approveClaim, syncClaims } from '../src/claims/library';
import { getDb } from '../src/db/client';
import { claims } from '../src/db/schema';
import { LOSS_CLAIMS, lossClaimRendering, lossSubject, pickLossClaim } from '../src/letters/loss';
import { previewInvitationCopy, type VerifiedLetterContext } from '../src/letters/personalization';
import { checkLetterTruth } from '../src/letters/truth-check';
import { invitationDraftIssues, writePreviewInvitation } from '../src/letters/writer';
import { getPlaybook } from '../src/playbooks';
import { stopBoss } from '../src/queue';
import { resetDb } from './helpers';

const checkedAt = new Date().toISOString();
const website = {
  kind: 'website_search' as const,
  text: 'not_found',
  source: 'fixture:search',
  verified: true,
  checkedAt,
  checks: ['name_city_search', 'directory_links', 'social_links'] as ('name_city_search' | 'directory_links' | 'social_links')[],
};
const ctx: VerifiedLetterContext = {
  businessName: 'Malerei Beispiel',
  city: 'Dortmund',
  branchLabel: 'Malerbetrieb',
  details: [website, { text: 'Fassadenanstrich', source: 'fixture:osm', verified: true }],
};

describe('Brief „Kunden, die Sie gerade verlieren könnten“', () => {
  it('nur Erstbrief, nur mit dokumentierter Websuche – sonst bleibt der neutrale Text', () => {
    const loss = previewInvitationCopy(ctx, 1, 'A', { loss: true });
    expect(loss.loss).toBe(true);
    expect(loss.subject).toBe(lossSubject('Malerei Beispiel'));
    expect(loss.opening).toMatch(/womöglich/);
    expect(loss.opening).toContain('keinen eigenen Webauftritt');
    expect(`${loss.subject} ${loss.opening} ${loss.intro.join(' ')}`).not.toMatch(/\d|Umsatz|garantiert/);
    expect(previewInvitationCopy(ctx, 1, 'A').loss).toBe(false);
    expect(previewInvitationCopy(ctx, 2, 'A', { loss: true }).loss).toBe(false);
    expect(previewInvitationCopy({ ...ctx, details: ctx.details.slice(1) }, 1, 'A', { loss: true }).loss).toBe(false);
  });

  it('jede vorgesehene Aussage ist im Playbook ihrer Branche erlaubt', () => {
    for (const [industry, ids] of Object.entries(LOSS_CLAIMS))
      for (const id of ids!) expect(getPlaybook(industry as never).allowed_claims, `${industry}/${id}`).toContain(id);
  });

  it('KI-Regeln: Verlust nur als Möglichkeit, ohne eigenes „verlieren“, Brücke mit „Deshalb habe ich“', () => {
    const facts = [{ id: 'F1', text: 'Fassadenanstrich' }];
    const good = {
      subject: 'Malerei Beispiel: Ihr Entwurf ist bereit',
      opening: 'wer in Dortmund einen Maler sucht und online nichts Eigenes von Ihnen findet, fragt womöglich beim nächsten an.',
      benefit: 'Deshalb habe ich für Sie eine eigene Website gebaut, auf der Interessierte Ihren Fassadenanstrich sehen.',
      qrCaption: 'Ihren Entwurf kostenlos ansehen',
      factIds: ['F1'],
    };
    expect(invitationDraftIssues(good, ctx, facts, undefined, true)).toEqual([]);
    expect(
      invitationDraftIssues({ ...good, opening: good.opening.replace('womöglich ', '') }, ctx, facts, undefined, true),
    ).toEqual(expect.arrayContaining([expect.stringMatching(/Möglichkeit/)]));
    expect(
      invitationDraftIssues({ ...good, opening: `${good.opening} Sie verlieren Kunden.` }, ctx, facts, undefined, true).join(),
    ).toMatch(/verlieren/);
    expect(
      invitationDraftIssues(
        { ...good, benefit: good.benefit.replace('Deshalb habe ich', 'Ich habe') },
        ctx,
        facts,
        undefined,
        true,
      ).join(),
    ).toMatch(/Deshalb habe ich/);
  });

  it('KI-Fassung: fester Betreff, Recherchesatz wörtlich vom System', async () => {
    const draft = {
      subject: 'Malerei Beispiel: Ihr Entwurf ist bereit',
      opening: 'wer in Dortmund einen Maler sucht und online nichts Eigenes von Ihnen findet, fragt womöglich beim nächsten an.',
      benefit: 'Deshalb habe ich für Sie eine eigene Website gebaut, auf der Interessierte Ihren Fassadenanstrich sehen.',
      qrCaption: 'Ihren Entwurf kostenlos ansehen',
      factIds: ['F1'],
    };
    let n = 0;
    const call = (async () => (n++ === 0 ? draft : { passed: true, issues: [] })) as never;
    const out = await writePreviewInvitation(
      { context: ctx, sequence: 1, demoHtml: '<h1>Malerei Beispiel</h1><p>Fassadenanstrich</p>', loss: true },
      { call, mock: false },
    );
    expect(out.engine).toBe('llm');
    expect(out.copy.loss).toBe(true);
    expect(out.copy.subject).toBe(lossSubject('Malerei Beispiel'));
    expect(out.copy.opening).toMatch(/womöglich beim nächsten an\. Bei unserer dokumentierten Suche/);
    expect(out.copy.intro).toEqual([draft.benefit]);
  });

  it('Wahrheits-Check: Zahl nur aus freigegebener Aussage mit Fußnote und Quellenseite', () => {
    const claim = {
      id: 'HANDWERK_OHNE_WEBSITE_AUSSORTIERT',
      textDe:
        'Für 40 % der Menschen in Deutschland ist das Fehlen einer Website ein Ausschlusskriterium bei der Wahl eines Handwerksbetriebs.',
      footnoteDe: 'Bitkom Research 2025, 1.004 Befragte ab 16 Jahren, repräsentativ',
      status: 'approved',
      scope: 'DE',
      expiresAt: new Date(Date.now() + 86400000 * 300),
      industries: ['handwerk'],
    };
    const r = lossClaimRendering(claim, 'seitenwerk.world/quellen');
    const letter = {
      subject: lossSubject('Malerei Beispiel'),
      greeting: 'Guten Tag,',
      intro: ['wer sucht, fragt womöglich woanders an.', `${r.span.text} Deshalb habe ich eine Website gebaut.`],
      offer: '',
      noAction: '',
      qrCaption: 'Ansehen',
      closing: 'Viele Grüße',
      footnotes: r.footnotes,
    };
    const input = {
      letter,
      claimSpans: [r.span],
      claims: [claim],
      allowedClaimIds: getPlaybook('handwerk').allowed_claims,
      industry: 'handwerk' as const,
      placeholderValues: [],
      sourcesLabel: 'seitenwerk.world/quellen',
    };
    expect(checkLetterTruth(input).violations).toEqual([]);
    expect(checkLetterTruth({ ...input, claims: [{ ...claim, status: 'needs_verification' }] }).passed).toBe(false);
    expect(checkLetterTruth({ ...input, letter: { ...letter, footnotes: [] } }).passed).toBe(false);
  });
});

describe('Beleg-Auswahl aus der Datenbank', () => {
  beforeAll(async () => {
    await resetDb();
    await syncClaims(getDb());
  });
  afterAll(stopBoss);

  it('ohne Freigabe durch den Betreiber kein Verlustbrief; nach Freigabe genau diese Aussage', async () => {
    const db = getDb();
    expect(await pickLossClaim(db, 'handwerk')).toBeNull();
    await approveClaim(db, 'HANDWERK_OHNE_WEBSITE_AUSSORTIERT', 'admin:test');
    expect((await pickLossClaim(db, 'handwerk'))?.id).toBe('HANDWERK_OHNE_WEBSITE_AUSSORTIERT');
    expect(await pickLossClaim(db, 'dienstleistung')).toBeNull();
    expect(await pickLossClaim(db, null)).toBeNull();
    await db.update(claims).set({ status: 'needs_verification' }).where(eq(claims.id, 'HANDWERK_OHNE_WEBSITE_AUSSORTIERT'));
    expect(await pickLossClaim(db, 'handwerk')).toBeNull();
  });
});
