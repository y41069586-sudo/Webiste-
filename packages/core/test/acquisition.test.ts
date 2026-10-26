import { expect, it } from 'vitest';
import {
  ACQUISITION_POLICY,
  assessAcquisition,
  campaignBranches,
  campaignRank,
  preferredCampaignTier,
  researchContentHash,
  researchIdentity,
  acquisitionPolicySchema,
  type LeadResearch,
  type ResearchSubject,
} from '../src/leads/acquisition';
import { DEFAULT_CONFIG } from '../src/config/settings';
import { businessPhoneKey } from '../src/leads/normalize';
import { previewInvitationCopy } from '../src/letters/personalization';
import { researchLetterFacts } from '../src/services/lead-research';
const now = new Date('2026-10-26T12:00:00Z');
const day = '2026-10-25T12:00:00Z';
function fixture(branch = 'maler') {
  const lead: ResearchSubject = {
    businessName: 'Fiktiver Renovierungsbetrieb',
    branch,
    city: 'Teststadt',
    phone: '+49 30 12345678',
    street: 'Testweg',
    houseNumber: '1',
    postalCode: '12345',
  };
  const signal = (kind: LeadResearch['signals'][number]['kind'], text: string) => ({
    kind,
    text,
    source: 'review:fictional-source',
    observedAt: day,
    verified: true as const,
  });
  const evidence: LeadResearch = {
    version: 1,
    identityHash: researchIdentity(lead),
    checkedAt: day,
    lawfulUseConfirmed: true,
    website: {
      result: 'not_found',
      checkedAt: day,
      source: 'review:fictional-search',
      methods: ['name_city', 'phone', 'directory_links', 'profile_links'],
    },
    signals: [
      signal('operational', 'Aktivität im fiktiven Testprofil bestätigt'),
      signal('address', 'Zustellanschrift im Testprofil bestätigt'),
      signal('independent', 'Eigenständiger Testbetrieb'),
      signal(branch === 'reinigung' ? 'business_clients' : 'private_clients', 'Kundengruppe bestätigt'),
      signal(
        'service',
        branch === 'reinigung' ? 'Büroreinigung' : branch === 'fliesenleger' ? 'Badsanierung' : 'Renovierungsanstriche',
      ),
      signal('service_advertising', 'Aktuelle Leistungswerbung im Testprofil'),
    ],
  };
  return { lead, evidence, signal };
}
it('uses the explicitly ordered target sectors, keeping the same templates and inactive choices respected', () => {
  expect(
    ['maler', 'reinigung', 'fliesenleger', 'gartenbau', 'bodenleger', 'parkettleger', 'entruempelung'].map((b) =>
      campaignRank(b),
    ),
  ).toEqual([1, 2, 3, 4, 4, 4, 4]);
  expect(campaignRank('restaurant')).toBeNull();
  expect(campaignBranches(DEFAULT_CONFIG.targeting.branches, ACQUISITION_POLICY).map((b) => b.key)).toEqual([
    'maler',
    'reinigung',
    'fliesenleger',
    'gartenbau',
    'bodenleger',
    'parkettleger',
    'entruempelung',
  ]);
  expect(
    campaignBranches(
      [{ ...DEFAULT_CONFIG.targeting.branches.find((b) => b.key === 'maler')!, active: false }],
      ACQUISITION_POLICY,
    ),
  ).toEqual([]);
});
it('requires independent activity, a full website search, customer focus and an actual acquisition signal', () => {
  for (const branch of ['maler', 'reinigung', 'fliesenleger']) {
    const { lead, evidence } = fixture(branch);
    expect(assessAcquisition(lead, evidence, ACQUISITION_POLICY, now).state).toBe('ready');
    for (const kind of ['operational', 'independent', 'address', 'service_advertising', 'service']) {
      expect(
        assessAcquisition(
          lead,
          { ...evidence, signals: evidence.signals.filter((s) => s.kind !== kind) },
          ACQUISITION_POLICY,
          now,
        ).state,
      ).toBe('review');
    }
  }
});
it('never treats an empty website field or a social profile URL as a complete absence check', () => {
  const { lead, evidence } = fixture();
  expect(assessAcquisition(lead, null, ACQUISITION_POLICY, now).state).toBe('review');
  for (const method of ['phone', 'name_city', 'directory_links', 'profile_links']) {
    const copy = structuredClone(evidence);
    copy.website.methods = copy.website.methods.filter((m) => m !== method);
    expect(assessAcquisition(lead, copy, ACQUISITION_POLICY, now).websiteVerified).toBe(false);
  }
  const noPhone = { ...lead, phone: null };
  expect(
    assessAcquisition(noPhone, { ...evidence, identityHash: researchIdentity(noPhone) }, ACQUISITION_POLICY, now).state,
  ).toBe('review');
});
it('ratings and work photos are quality evidence, not spare capacity or acquisition intent', () => {
  const { lead, evidence, signal } = fixture();
  evidence.signals = evidence.signals.filter((s) => s.kind !== 'service_advertising');
  evidence.signals.push(signal('recent_reviews', 'Aktuelle Rückmeldungen'), signal('work_photos', 'Aktuelle Arbeitsbilder'));
  const a = assessAcquisition(lead, evidence, ACQUISITION_POLICY, now);
  expect(a.state).toBe('review');
  expect(a.demand).toEqual([]);
  expect(a.reasons.find((r) => r.criterion === 'quality_images')?.points).toBe(3);
  evidence.signals.push(signal('active_profile', 'Aktive Leistungspräsentation im Profil'));
  expect(assessAcquisition(lead, evidence, ACQUISITION_POLICY, now).state).toBe('ready');
});
it('closed, subcontract-only, owned websites and busy businesses without growth are excluded', () => {
  for (const kind of ['closed', 'subcontract_only', 'fully_booked'] as const) {
    const { lead, evidence, signal } = fixture();
    evidence.signals.push(signal(kind, 'Ausdrücklich bestätigter Ausschluss im Testprofil'));
    const a = assessAcquisition(lead, evidence, ACQUISITION_POLICY, now);
    expect(a.state).toBe('excluded');
    expect(a.score).toBe(0);
  }
  const { lead, evidence } = fixture();
  evidence.website.result = 'found';
  expect(assessAcquisition(lead, evidence, ACQUISITION_POLICY, now).state).toBe('excluded');
  const good = fixture();
  expect(
    assessAcquisition({ ...good.lead, businessStatus: 'CLOSED_PERMANENTLY' }, good.evidence, ACQUISITION_POLICY, now).state,
  ).toBe('excluded');
  expect(assessAcquisition({ ...good.lead, hasWebsite: true }, good.evidence, ACQUISITION_POLICY, now).state).toBe('excluded');
});
it('busy plus expansion is a review conflict, not invented availability', () => {
  const { lead, evidence, signal } = fixture();
  evidence.signals.push(signal('fully_booked', 'Derzeit ausgelastet'), signal('expansion', 'Bestätigte Erweiterung'));
  const a = assessAcquisition(lead, evidence, ACQUISITION_POLICY, now);
  expect(a.state).toBe('review');
  expect(a.missing.join()).toContain('keine freien Kapazitäten');
});
it('prefers the 6–36 month full-time test segment only from a proven start date', () => {
  const { lead, evidence, signal } = fixture();
  evidence.signals.push(
    { ...signal('business_start', 'Geschäftstätigkeit seit dem belegten Datum'), occurredOn: '2025-10-25' },
    signal('full_time', 'Vollerwerb bestätigt'),
  );
  const a = assessAcquisition(lead, evidence, ACQUISITION_POLICY, now);
  expect(a.months).toBe(12);
  expect(a.youngFullTime).toBe(true);
  evidence.signals = evidence.signals.filter((s) => s.kind !== 'full_time');
  expect(assessAcquisition(lead, evidence, ACQUISITION_POLICY, now).youngFullTime).toBe(false);
  evidence.signals = evidence.signals.filter((s) => s.kind !== 'business_start');
  evidence.signals.push({ ...signal('listing_start', 'Neuer Verzeichniseintrag'), occurredOn: '2026-01-01' });
  expect(assessAcquisition(lead, evidence, ACQUISITION_POLICY, now).months).toBeNull();
});
it('does not exclude a suitable older or very young business; takeovers/growth receive a documented bonus', () => {
  for (const occurredOn of ['2001-01-01', '2026-09-01']) {
    const { lead, evidence, signal } = fixture();
    evidence.signals.push({ ...signal('business_start', 'Belegter Beginn'), occurredOn }, signal('full_time', 'Vollerwerb'));
    const a = assessAcquisition(lead, evidence, ACQUISITION_POLICY, now);
    expect(a.state).toBe('ready');
    expect(a.youngFullTime).toBe(false);
    evidence.signals.push(signal('takeover', 'Bestätigte Betriebsübernahme'));
    expect(
      assessAcquisition(lead, evidence, ACQUISITION_POLICY, now).reasons.find((r) => r.criterion === 'lifecycle')?.points,
    ).toBe(5);
  }
});
it('invalidates stale evidence, old intent, changed identity and incomplete addresses', () => {
  const { lead, evidence } = fixture();
  expect(assessAcquisition({ ...lead, phone: '03099999999' }, evidence, ACQUISITION_POLICY, now).state).toBe('review');
  evidence.website.checkedAt = '2025-01-01T00:00:00Z';
  expect(assessAcquisition(lead, evidence, ACQUISITION_POLICY, now).websiteVerified).toBe(false);
  const copy = fixture();
  copy.evidence.signals.find((s) => s.kind === 'service_advertising')!.observedAt = '2026-01-01T00:00:00Z';
  expect(assessAcquisition(copy.lead, copy.evidence, ACQUISITION_POLICY, now).state).toBe('review');
  const missing = { ...copy.lead, postalCode: '' };
  copy.evidence.identityHash = researchIdentity(missing);
  expect(assessAcquisition(missing, copy.evidence, ACQUISITION_POLICY, now).state).toBe('review');
});
it('phone duplicate comparison recognizes national and international notation without making a call', () => {
  expect(businessPhoneKey('+49 30 12345678')).toBe(businessPhoneKey('030 12345678'));
  expect(businessPhoneKey('0049 30 12345678')).toBe(businessPhoneKey('03012345678'));
  expect(businessPhoneKey('123')).toBeNull();
});
it('uses fact focus for branch-specific letters without asserting quality or lead guarantees', () => {
  const c = {
    businessName: 'Fiktiver Testbetrieb',
    city: 'Teststadt',
    branchLabel: 'Malerbetrieb',
    details: [{ text: 'Renovierungsanstriche', source: 'review:fixture', verified: true }],
  };
  expect(previewInvitationCopy(c).profile).toBe('painter-renovation');
  expect(
    previewInvitationCopy({ ...c, branchLabel: 'Gebäudereinigung', details: [{ ...c.details[0]!, text: 'Büroreinigung' }] })
      .profile,
  ).toBe('cleaning-commercial');
  expect(
    previewInvitationCopy({ ...c, branchLabel: 'Fliesenleger', details: [{ ...c.details[0]!, text: 'Badsanierung' }] }).profile,
  ).toBe('tiling-renovation');
  expect(researchLetterFacts(null)).toEqual([]);
});
it('validates lifecycle policy boundaries', () => {
  expect(acquisitionPolicySchema.safeParse({ ...ACQUISITION_POLICY, youngMinMonths: 40, youngMaxMonths: 6 }).success).toBe(false);
});
it('prioritizes the best available sector before a higher-scoring secondary lead', () => {
  expect(
    preferredCampaignTier(
      [
        { branch: 'gartenbau', score: 100 },
        { branch: 'reinigung', score: 90 },
        { branch: 'maler', score: 85 },
      ],
      ACQUISITION_POLICY,
    ),
  ).toEqual([{ branch: 'maler', score: 85 }]);
  expect(preferredCampaignTier([{ branch: 'fliesenleger' }, { branch: 'reinigung' }], ACQUISITION_POLICY)).toEqual([
    { branch: 'reinigung' },
  ]);
});
it('preserves unchanged demo content when only intent/date evidence is reviewed again', () => {
  const { evidence, signal } = fixture();
  const next = {
    ...evidence,
    checkedAt: '2026-10-26T12:00:00Z',
    signals: [...evidence.signals, signal('expansion', 'Erweiterung bestätigt')],
  };
  expect(researchContentHash(next)).toBe(researchContentHash(evidence));
  next.signals = next.signals.map((s) => (s.kind === 'service' ? { ...s, text: 'Fassadensanierung' } : s));
  expect(researchContentHash(next)).not.toBe(researchContentHash(evidence));
});
