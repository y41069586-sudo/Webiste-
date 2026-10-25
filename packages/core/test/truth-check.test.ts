import { eq, sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { approveClaim, blockClaim, loadClaimDefinitions, sourcesPageClaims, syncClaims } from '../src/claims/library';
import { updateConfig } from '../src/config/service';
import { DEFAULT_CONFIG } from '../src/config/settings';
import { getDb } from '../src/db/client';
import { claimUsages, leads, letters, variants } from '../src/db/schema';
import { renderSlots, SLOT_VARIANTS, type LetterSlots } from '../src/letters/slots';
import { checkLetterTruth, type ClaimForCheck } from '../src/letters/truth-check';
import { DEFAULT_LETTER_VARIANTS } from '../src/letters/variants';
import { getProviders } from '../src/providers';
import {
  buildDemo,
  closeBrowser,
  generateLetter,
  htmlToPdf,
  pdfTextItems,
  qaDemo,
  renderLetterPreview,
  validateLetterDom,
  validateLetterPdf,
} from '../src/render';
import { approveDemo, publishDemo } from '../src/services/demo-review';
import { findLeads } from '../src/services/lead-finder';
import { approveLetter, eligibleLetterVariants } from '../src/services/letters';
import { sendLetter } from '../src/services/sending';
import { runTruthCheck } from '../src/services/truth-check';
import { stopBoss } from '../src/queue';
import { resetDb, resetVariants } from './helpers';

const FUTURE = new Date('2030-01-01T00:00:00Z');

/** Claims aus der Bibliothek, für Muster als freigegeben und gültig betrachtet */
function approvedClaims(): ClaimForCheck[] {
  return loadClaimDefinitions()
    .filter((c) => c.scope === 'DE')
    .map((c) => ({
      id: c.id,
      textDe: c.text_de,
      footnoteDe: c.footnote_de,
      status: 'approved',
      scope: c.scope,
      expiresAt: FUTURE,
      industries: c.industries,
    }));
}

const RECIPIENT = {
  businessName: "Mira's Kosmetikinstitut, Wellness- und Gesundheitszentrum",
  street: 'Hörder Semerteichstraße',
  houseNumber: '183a',
  postalCode: '44263',
  city: 'Dortmund',
};

function preview(slots: LetterSlots | null, industry: Parameters<typeof renderLetterPreview>[0]['industry'], over = {}) {
  return renderLetterPreview({
    cfg: DEFAULT_CONFIG,
    industry,
    slots,
    content: slots ? undefined : DEFAULT_LETTER_VARIANTS[0]!.content,
    recipient: RECIPIENT,
    domain: 'miras-kosmetikinstitut-dortmund.de',
    claims: approvedClaims(),
    compositeDataUri: `data:image/svg+xml;base64,${Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1800" height="1080"><rect width="1800" height="1080" fill="#ccc"/></svg>').toString('base64')}`,
    sourcesLabel: 'seitenwerk.world/quellen',
    shortUrl: 'seitenwerk.world/k7m2xq',
    qrUrl: 'https://seitenwerk.world/q/ABCDEFGHJKLMNPQRSTUVWXYZ',
    expiresLabel: '23. November 2026',
    dateLine: 'Dortmund, 23. Oktober 2026',
    privacyUrl: 'https://seitenwerk.world/datenschutz',
    optOutEmail: 'widerspruch@seitenwerk.world',
    ...over,
  });
}

const BASE_SLOTS: LetterSlots = {
  subject: 'Ihre neue Website ist schon fertig',
  opening: 'wer Sie online sucht, findet bisher keine eigene Website.',
  benefit: 'Deshalb habe ich Ihnen eine gebaut.',
  offer: 'Gefällt sie Ihnen, gehört sie Ihnen: {preise}, inklusive {eigene_domain} und Hosting. {garantie_satz}',
  risk_reversal: 'Wenn nicht, müssen Sie nichts tun. Der Entwurf ist bis **{ablaufdatum}** online.',
  qr_label: 'Scannen und Ihre fertige Website ansehen – online bis {ablaufdatum}',
};

describe('Wahrheits-Check (Regeln)', () => {
  it('neutraler Brief und alle Startvarianten bestehen (Claims als freigegeben angenommen)', async () => {
    expect((await preview(null, 'dienstleistung')).truth.violations).toEqual([]);
    for (const v of SLOT_VARIANTS) {
      const p = await preview(v.slots, v.industry);
      expect(p.truth.violations, v.name).toEqual([]);
      expect(p.truth.passed).toBe(true);
    }
  });

  it('Abnahme: „5-mal mehr Umsatz“ wird blockiert', async () => {
    const p = await preview({ ...BASE_SLOTS, benefit: 'Mit einer Website machen Sie 5-mal mehr Umsatz.' }, 'handwerk');
    expect(p.truth.passed).toBe(false);
    const rules = p.truth.violations.map((v) => v.rule);
    expect(rules).toContain('blocklist');
    expect(rules).toContain('number');
    expect(p.truth.violations.map((v) => v.detail).join(' ')).toMatch(/5-mal|mehr Umsatz/);
  });

  it('freie Zahlen, Faktor-Wörter, Druckwörter, Rechnungs-Look und „kostenlos“', async () => {
    const bad = async (benefit: string) => (await preview({ ...BASE_SLOTS, benefit }, 'beauty')).truth;
    expect((await bad('Probestunde auch abends um 23 Uhr.')).violations.some((v) => v.rule === 'number')).toBe(true);
    expect((await bad('Damit verdoppeln Sie Ihre Anfragen.')).passed).toBe(false);
    expect((await bad('Jetzt sofort handeln.')).passed).toBe(false);
    expect((await bad('Die Rechnung kommt später.')).passed).toBe(false);
    expect((await bad('Die Einrichtung ist kostenlos.')).passed).toBe(false);
    expect((await bad('Sie können sie kostenlos ansehen.')).passed).toBe(true);
    expect((await bad('Schauen Sie mal rein!!')).passed).toBe(false);
    expect((await bad('Nachweislich besser.')).passed).toBe(false);
  });

  it('Claims: nur freigegeben, gültig, deutsch, für die Branche erlaubt; höchstens 2 Statistiken', async () => {
    const claims = approvedClaims();
    const withClaim = { ...BASE_SLOTS, claim_slot_1: '{CLAIM:HANDWERK_DIGITAL_ATTRAKTIVER}' };
    const mod = (id: string, patch: Partial<ClaimForCheck>) => claims.map((c) => (c.id === id ? { ...c, ...patch } : c));
    expect((await preview(withClaim, 'handwerk')).truth.passed).toBe(true);
    const notApproved = await preview(withClaim, 'handwerk', {
      claims: mod('HANDWERK_DIGITAL_ATTRAKTIVER', { status: 'needs_verification' }),
    });
    expect(notApproved.truth.violations.map((v) => v.detail).join()).toMatch(/nicht freigegeben/);
    const expired = await preview(withClaim, 'handwerk', {
      claims: mod('HANDWERK_DIGITAL_ATTRAKTIVER', { expiresAt: new Date('2020-01-01') }),
    });
    expect(expired.truth.violations.map((v) => v.detail).join()).toMatch(/abgelaufen/);
    // Handwerk-Claim im Beauty-Brief
    const wrongIndustry = await preview(withClaim, 'beauty');
    expect(wrongIndustry.truth.violations.map((v) => v.detail).join()).toMatch(/nicht für Branche beauty|nicht erlaubt/);
    const misplaced = await preview({ ...BASE_SLOTS, benefit: '{CLAIM:HANDWERK_EMPFEHLUNG_PLUS_WEBSITE}' }, 'handwerk');
    expect(misplaced.truth.violations.map((v) => v.rule)).toContain('placeholder');
    const ids = ['HANDWERK_DIGITAL_ATTRAKTIVER', 'HANDWERK_OHNE_WEBSITE_AUSSORTIERT', 'HANDWERK_EMPFEHLUNG_PLUS_WEBSITE'];
    const picked = claims.filter((c) => ids.includes(c.id));
    const three = {
      truth: checkLetterTruth({
        letter: {
          subject: 's',
          greeting: 'g',
          intro: picked.map((c) => c.textDe),
          offer: '',
          noAction: '',
          qrCaption: '',
          closing: '',
          footnotes: [...new Set(picked.map((c) => c.footnoteDe))].concat('Quellen: q/quellen'),
        },
        claimSpans: picked.map((c) => ({ id: c.id, text: c.textDe })),
        claims: picked,
        allowedClaimIds: ids,
        industry: 'handwerk',
        placeholderValues: [],
        sourcesLabel: 'q/quellen',
      }),
    };
    expect(three.truth.violations.map((v) => v.rule)).toContain('statistics');
  });

  it('Fußnote je Claim und Verweis auf die Quellenseite; verfälschter Claim-Text fällt auf', () => {
    const c = approvedClaims().find((x) => x.id === 'HANDWERK_DIGITAL_ATTRAKTIVER')!;
    const r = renderSlots({ ...BASE_SLOTS, claim_slot_1: `{CLAIM:${c.id}}` }, new Map([[c.id, c]]), 'seitenwerk.world/quellen');
    expect(r.footnotes[0]).toMatch(/^¹ Bitkom Research 2025/);
    expect(r.footnotes.at(-1)).toBe('Quellen: seitenwerk.world/quellen');
    const letter = {
      subject: 's',
      greeting: 'Guten Tag,',
      intro: [r.content.hook],
      offer: '',
      noAction: '',
      qrCaption: '',
      closing: '',
    };
    const base = {
      letter,
      claimSpans: r.claimSpans,
      claims: [c],
      allowedClaimIds: [c.id],
      industry: 'handwerk' as const,
      placeholderValues: [],
      sourcesLabel: 'seitenwerk.world/quellen',
    };
    expect(checkLetterTruth({ ...base, letter: { ...letter, footnotes: r.footnotes } }).passed).toBe(true);
    const noFootnote = checkLetterTruth(base);
    expect(noFootnote.violations.map((v) => v.rule)).toContain('footnote');
    const tampered = checkLetterTruth({
      ...base,
      letter: { ...letter, footnotes: r.footnotes },
      claimSpans: [{ id: c.id, text: '65 % finden, dass digitale Angebote Handwerksbetriebe attraktiver machen.¹' }],
    });
    expect(tampered.passed).toBe(false);
  });

  it('LLM-Prüfung blockiert Wirkungsaussagen ohne Zahl (Mock)', async () => {
    const p = await preview({ ...BASE_SLOTS, benefit: 'So gewinnen Sie mehr Kunden für Ihren Betrieb.' }, 'handwerk');
    expect(p.truth.passed).toBe(true); // Regeln greifen nicht …
    const full = await runTruthCheck(p.truthInput, { checkSourcesPage: false });
    expect(full.passed).toBe(false); // … aber die LLM-Prüfung
    expect(full.llm?.unbackedEffectClaim).toBe(true);
    const clean = await runTruthCheck((await preview(BASE_SLOTS, 'handwerk')).truthInput, { checkSourcesPage: false });
    expect(clean.passed).toBe(true);
    expect(clean.sourcesPage).toBe('skipped');
  });
});

describe('Slot-Briefe passen im ungünstigsten Fall auf eine Seite', () => {
  afterAll(closeBrowser);
  it('alle Startvarianten mit langem Namen, Domain und Fußnoten', async () => {
    for (const v of SLOT_VARIANTS) {
      const p = await preview(v.slots, v.industry);
      const dom = await validateLetterDom(p.html, 'left');
      expect(dom, `${v.name}: ${JSON.stringify(dom)}`).toEqual([]);
      const pdf = await htmlToPdf(p.html);
      if (process.env.LETTER_SAMPLE_DIR)
        (await import('node:fs')).writeFileSync(`${process.env.LETTER_SAMPLE_DIR}/${v.name}.pdf`, pdf);
      const check = await validateLetterPdf(pdf, { recipientLines: p.data.recipientLines, position: 'left', expectedPages: 1 });
      expect(check.issues, `${v.name}: ${JSON.stringify(check.issues)}`).toEqual([]);
      const text = (await pdfTextItems(pdf)).items.map((i) => i.str).join(' ');
      if (v.slots.claim_slot_1) expect(text, v.name).toContain('seitenwerk.world/quellen');
      // Wörter Fließtext (ohne Pflichthinweise): höchstens ca. 200 (B4)
      const words = [p.data.subject, ...p.data.intro, p.data.offer, p.data.noAction].join(' ').split(/\s+/).length;
      expect(words, v.name).toBeLessThanOrEqual(200);
    }
  }, 180_000);
});

describe('Slot-Briefe im echten Ablauf', () => {
  let leadId: string;
  beforeAll(async () => {
    await resetDb();
    await resetVariants();
    await getDb().execute(sql`TRUNCATE claim_usages, claims CASCADE`);
    await syncClaims(getDb());
    await findLeads({ actor: 'job:test', branches: ['maler'] });
    const lead = (await getDb().select().from(leads).where(eq(leads.status, 'qualified')).limit(1))[0]!;
    leadId = lead.id;
    expect(lead.industry).toBe('handwerk');
    const demoId = await buildDemo(leadId, { actor: 'job:test' });
    await qaDemo(demoId, 'job:test', { lighthouse: false });
    await approveDemo(demoId, 'admin:test');
    await publishDemo(demoId, 'admin:test');
  }, 120_000);
  afterAll(async () => {
    await getDb().update(variants).set({ weight: 1 });
    await closeBrowser();
    await stopBoss();
  });

  it('ohne freigegebene Claims ist HANDWERK_A nicht wählbar (Rückfall auf Varianten ohne Statistik)', async () => {
    const names = (await eligibleLetterVariants(getDb(), 1, { industry: 'handwerk' })).map((r) => r.row.name);
    expect(names).toContain('A – Standard');
    expect(names).toContain('HANDWERK_B');
    expect(names).not.toContain('HANDWERK_A');
    expect(names).not.toContain('B – Ruf & Entwurf'); // pausiert (B10: 50/50 gegen die Kontrolle)
    expect(names).not.toContain('BEAUTY_A');
  });

  it('mit freigegebenem Claim: Brief mit Fußnote, Wahrheits-Check bestanden, Nutzung protokolliert, Quellenseite', async () => {
    const db = getDb();
    await approveClaim(db, 'HANDWERK_OHNE_WEBSITE_AUSSORTIERT', 'admin:test');
    await db.update(variants).set({ weight: 0 });
    await db.update(variants).set({ weight: 1 }).where(eq(variants.name, 'HANDWERK_A'));
    const res = await generateLetter(leadId, 1, { actor: 'job:test', regenerate: true });
    expect(res.issues).toEqual([]);
    expect(res.truthCheck?.passed, JSON.stringify(res.truthCheck?.violations)).toBe(true);
    expect(res.truthCheck?.claims).toEqual(['HANDWERK_OHNE_WEBSITE_AUSSORTIERT']);
    const letter = (await db.query.letters.findFirst({ where: eq(letters.id, res.letterId) }))!;
    expect(letter.industry).toBe('handwerk');
    const text = (await pdfTextItems((await getProviders().storage.get(letter.pdfStorageKey!))!)).items
      .map((i) => i.str)
      .join(' ');
    expect(text).toContain('Ausschlusskriterium');
    expect(text).toMatch(/¹ Bitkom Research 2025/);
    const usage = await db.select().from(claimUsages).where(eq(claimUsages.letterId, letter.id));
    expect(usage.map((u) => u.claimId)).toEqual(['HANDWERK_OHNE_WEBSITE_AUSSORTIERT']);
    expect((await sourcesPageClaims(db)).map((c) => c.id)).toContain('HANDWERK_OHNE_WEBSITE_AUSSORTIERT');
    // Freigabe möglich; wird der Claim danach gesperrt, geht der Brief nicht raus
    expect(await approveLetter(letter.id, 'admin:test')).toBe(true);
    await blockClaim(db, 'HANDWERK_OHNE_WEBSITE_AUSSORTIERT', 'admin:test');
    const sent = await sendLetter(letter.id, 'admin:test');
    expect(sent.state).toBe('skipped');
    expect((await db.query.letters.findFirst({ where: eq(letters.id, letter.id) }))!.statusReason).toMatch(
      /Claim inzwischen gesperrt/,
    );
  }, 120_000);

  it('Abnahme: absichtlich falscher Testbrief wird blockiert und lässt sich nicht freigeben', async () => {
    const db = getDb();
    await db.update(variants).set({ weight: 0 });
    await db
      .insert(variants)
      .values({
        kind: 'letter',
        name: 'TEST_FALSCH',
        sequence: 1,
        industry: 'handwerk',
        slotsJson: { ...BASE_SLOTS, benefit: 'Mit dieser Website machen Sie 5-mal mehr Umsatz.' } as unknown as Record<
          string,
          string
        >,
        content: {},
        weight: 1,
      })
      .onConflictDoNothing();
    await updateConfig({ letter: { maxStatistics: 2 } }, 'test');
    const res = await generateLetter(leadId, 1, { actor: 'job:test', regenerate: true });
    expect(res.status).toBe('failed');
    expect(res.truthCheck?.passed).toBe(false);
    const letter = (await db.query.letters.findFirst({ where: eq(letters.id, res.letterId) }))!;
    expect(letter.statusReason).toMatch(/wahrheits_check/);
    expect(await approveLetter(letter.id, 'admin:test')).toBe(false);
    await db.delete(variants).where(eq(variants.name, 'TEST_FALSCH'));
  }, 120_000);
});
