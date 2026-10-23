import { readFileSync } from 'node:fs';
import { eq, sql } from 'drizzle-orm';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import {
  approvalBlocker,
  approveClaim,
  blockClaim,
  ClaimApprovalError,
  claimExpiry,
  claimsFilePath,
  expireClaims,
  loadClaimDefinitions,
  parseClaims,
  syncClaims,
  unblockClaim,
  usableClaims,
  type ClaimDefinition,
} from '../src/claims/library';
import { DEFAULT_CONFIG } from '../src/config/settings';
import { getDb } from '../src/db/client';
import { alerts, auditLog, claims, leads, playbooks as playbooksTable } from '../src/db/schema';
import { qualify } from '../src/leads/qualify';
import { classifyIndustry, exclusionFor, getPlaybooks, syncPlaybooks } from '../src/playbooks';
import type { RawPlace } from '../src/providers/types';
import { findLeads } from '../src/services/lead-finder';
import { INDUSTRIES } from '../src/types';
import { resetDb } from './helpers';

const NOW = new Date('2026-10-23T12:00:00Z');

async function resetClaims(): Promise<void> {
  await getDb().execute(sql`TRUNCATE claim_usages, claims CASCADE`);
}

function def(over: Partial<ClaimDefinition> = {}): ClaimDefinition {
  return {
    id: 'TEST_CLAIM',
    text_de: '50 % der Befragten finden Testsätze gut.',
    footnote_de: 'Testinstitut 2026, 1.000 Befragte',
    source_publisher: 'Testinstitut',
    source_title: 'Teststudie',
    source_url: 'https://example.org/studie',
    published_at: new Date('2026-01-15T00:00:00Z'),
    sample: 1000,
    population: 'Testpersonen',
    scope: 'DE',
    industries: ['handwerk'],
    source_type: 'external',
    blocked: false,
    check: { checked_at: new Date('2026-10-23T00:00:00Z'), result: 'ok', quote: '50 Prozent finden Testsätze gut.' },
    ...over,
  };
}

describe('Claims-Datei', () => {
  const list = loadClaimDefinitions();

  it('ist gültig und enthält den Startbestand aus B2 plus Ergänzungen', () => {
    const ids = list.map((c) => c.id);
    for (const id of [
      'GASTRO_WEBSITE_ERWARTET',
      'GASTRO_SPEISEKARTE_ONLINE',
      'GASTRO_RESERVIERUNG_ONLINE',
      'HANDWERK_OHNE_WEBSITE_AUSSORTIERT',
      'HANDWERK_DIGITAL_ATTRAKTIVER',
      'HANDWERK_EMPFEHLUNG_PLUS_WEBSITE',
      'HANDEL_INFO_VORHER',
      'HANDEL_RESERVIEREN',
      'TERMIN_ONLINE_GEWOHNT',
      'TERMIN_KEIN_TELEFONAT',
      'TERMIN_FLEXIBEL',
      'BEWERTUNG_45_STERNE_US',
      // Kurzformen aus B4 und neue Quellen aus L1
      'GASTRO_WEBSITE_ERWARTET_KURZ',
      'TERMIN_KEIN_TELEFONAT_KURZ',
      'TERMIN_BEHOERDE_ONLINE',
    ]) {
      expect(ids).toContain(id);
    }
  });

  it('jeder Claim ist geprüft, mit Zitat; Zahlen im Text stehen im Zitat der Quelle', () => {
    for (const c of list) {
      expect(c.check, c.id).toBeDefined();
      const textNumbers = c.text_de.match(/\d+(?:,\d+)?(?= ?%)/g) ?? [];
      for (const n of textNumbers) {
        // Zahl muss im Wortlaut der Quelle vorkommen (z. B. „53 Prozent“ / „31%“)
        expect(c.check!.quote, `${c.id}: ${n}`).toMatch(new RegExp(`\\b${n.replace(',', '[,.]')}\\b`));
      }
    }
  });

  it('US-Daten sind gesperrt und als USA gekennzeichnet', () => {
    const us = list.filter((c) => c.scope !== 'DE');
    expect(us.length).toBeGreaterThan(0);
    for (const c of us) {
      expect(c.blocked).toBe(true);
      expect(c.text_de).toContain('in den USA');
    }
  });

  it('Primärquellen: kein Ärzteblatt-Sekundärbericht mehr, Bitkom-Arzttermine vom 22.12.2025', () => {
    const t = list.find((c) => c.id === 'TERMIN_ONLINE_GEWOHNT')!;
    expect(t.source_url).toContain('bitkom.org');
    expect(t.published_at.toISOString().slice(0, 10)).toBe('2025-12-22');
    const flex = list.find((c) => c.id === 'TERMIN_FLEXIBEL')!;
    expect(flex.text_de).toContain('Randzeiten');
    expect(flex.text_de).not.toContain('Sprechzeiten');
  });

  it('erkennt doppelte IDs', () => {
    const raw = readFileSync(claimsFilePath(), 'utf8');
    const first = raw.slice(raw.indexOf('- id:'), raw.indexOf('- id:', raw.indexOf('- id:') + 1));
    expect(() => parseClaims(`${raw}\n${first}`)).toThrow(/doppelt/);
  });

  it('Ablauf = Veröffentlichung + 24 Monate', () => {
    expect(claimExpiry(new Date('2024-06-27T00:00:00Z')).toISOString().slice(0, 10)).toBe('2026-06-27');
  });
});

describe('Claims-Abgleich und Freigabe', () => {
  beforeEach(async () => {
    await resetDb();
    await resetClaims();
  });
  afterAll(async () => {
    // echte Bibliothek wiederherstellen
    await resetClaims();
    await syncClaims(getDb());
  });

  it('echte Bibliothek: Startstatus, abgelaufene Gastro-Quelle gesperrt und gemeldet', async () => {
    const db = getDb();
    const s = await syncClaims(db, { now: NOW });
    expect(s.created).toBe(loadClaimDefinitions().length);
    const rows = await db.select().from(claims);
    const byId = new Map(rows.map((r) => [r.id, r]));
    expect(byId.get('GASTRO_SPEISEKARTE_ONLINE')).toMatchObject({ status: 'blocked', blockedReason: 'expired' });
    expect(byId.get('BEWERTUNG_45_STERNE_US')).toMatchObject({ status: 'blocked', blockedReason: 'yaml' });
    expect(byId.get('HANDWERK_DIGITAL_ATTRAKTIVER')).toMatchObject({ status: 'needs_verification', blockedReason: null });
    // nichts ist ohne Betreiber-OK freigegeben
    expect(rows.filter((r) => r.status === 'approved')).toHaveLength(0);
    const al = await db.select().from(alerts);
    expect(al.some((a) => a.code === 'claim_expired:GASTRO_SPEISEKARTE_ONLINE')).toBe(true);
    expect(al.find((a) => a.code === 'claim_expired:GASTRO_SPEISEKARTE_ONLINE')!.message).toContain('neuere Studie suchen');
    // idempotent
    const again = await syncClaims(db, { now: NOW });
    expect(again.created).toBe(0);
    expect(again.blocked).toBe(0);
  });

  it('Freigabe nur nach bestandener Prüfung, nicht für abgelaufene, US- oder Sekundärquellen', async () => {
    const db = getDb();
    await syncClaims(db, { now: NOW });
    await approveClaim(db, 'HANDWERK_DIGITAL_ATTRAKTIVER', 'admin:test', NOW);
    const row = await db.query.claims.findFirst({ where: eq(claims.id, 'HANDWERK_DIGITAL_ATTRAKTIVER') });
    expect(row).toMatchObject({ status: 'approved', verifiedBy: 'admin:test' });
    await expect(approveClaim(db, 'GASTRO_SPEISEKARTE_ONLINE', 'admin:test', NOW)).rejects.toThrow(/24 Monate/);
    await expect(approveClaim(db, 'BEWERTUNG_45_STERNE_US', 'admin:test', NOW)).rejects.toThrow(ClaimApprovalError);
    await expect(approveClaim(db, 'GASTRO_ONLINE_SUCHE', 'admin:test', NOW)).rejects.toThrow(/Primärquelle/);
    const audits = await db.select().from(auditLog).where(eq(auditLog.entity, 'claim'));
    expect(audits.some((a) => a.action === 'approved' && a.entityId === 'HANDWERK_DIGITAL_ATTRAKTIVER')).toBe(true);
  });

  it('nutzbare Claims: nur freigegeben, DE, nicht abgelaufen, passende Branche', async () => {
    const db = getDb();
    await syncClaims(db, { now: NOW });
    expect(await usableClaims(db, { industry: 'handwerk', now: NOW })).toHaveLength(0);
    await approveClaim(db, 'HANDWERK_DIGITAL_ATTRAKTIVER', 'admin:test', NOW);
    await approveClaim(db, 'TERMIN_FLEXIBEL', 'admin:test', NOW);
    expect((await usableClaims(db, { industry: 'handwerk', now: NOW })).map((c) => c.id)).toEqual([
      'HANDWERK_DIGITAL_ATTRAKTIVER',
    ]);
    expect((await usableClaims(db, { industry: 'beauty', now: NOW })).map((c) => c.id)).toEqual(['TERMIN_FLEXIBEL']);
    // nach Ablauf nicht mehr nutzbar, auch bevor der Job lief
    expect(await usableClaims(db, { industry: 'handwerk', now: new Date('2027-07-01T00:00:00Z') })).toHaveLength(0);
  });

  it('geänderter Text setzt eine Freigabe zurück; entfernte Claims werden gesperrt', async () => {
    const db = getDb();
    await syncClaims(db, { definitions: [def(), def({ id: 'TEST_ZWEI' })], now: NOW });
    await approveClaim(db, 'TEST_CLAIM', 'admin:test', NOW);
    const s = await syncClaims(db, {
      definitions: [def({ text_de: '51 % der Befragten finden Testsätze gut.' })],
      now: NOW,
    });
    expect(s.resetToVerification).toBe(1);
    expect(s.removed).toBe(1);
    const a = await db.query.claims.findFirst({ where: eq(claims.id, 'TEST_CLAIM') });
    expect(a).toMatchObject({ status: 'needs_verification', verifiedBy: null });
    const b = await db.query.claims.findFirst({ where: eq(claims.id, 'TEST_ZWEI') });
    expect(b).toMatchObject({ status: 'blocked', blockedReason: 'removed' });
  });

  it('Ablauf-Job sperrt freigegebene Claims und meldet „Quelle veraltet“', async () => {
    const db = getDb();
    await syncClaims(db, { definitions: [def()], now: NOW });
    await approveClaim(db, 'TEST_CLAIM', 'admin:test', NOW);
    expect(await expireClaims(db, NOW)).toEqual([]);
    const later = new Date('2028-01-16T00:00:00Z');
    expect(await expireClaims(db, later)).toEqual(['TEST_CLAIM']);
    const row = await db.query.claims.findFirst({ where: eq(claims.id, 'TEST_CLAIM') });
    expect(row).toMatchObject({ status: 'blocked', blockedReason: 'expired' });
    const al = await db.select().from(alerts);
    expect(al.map((x) => x.code)).toContain('claim_expired:TEST_CLAIM');
  });

  it('manuelle Sperre und Entsperren', async () => {
    const db = getDb();
    await syncClaims(db, { definitions: [def()], now: NOW });
    await approveClaim(db, 'TEST_CLAIM', 'admin:test', NOW);
    await blockClaim(db, 'TEST_CLAIM', 'admin:test', NOW);
    // Abgleich hebt eine manuelle Sperre nicht auf
    await syncClaims(db, { definitions: [def({ footnote_de: 'Testinstitut 2026, 1.000 Befragte, online' })], now: NOW });
    expect((await db.query.claims.findFirst({ where: eq(claims.id, 'TEST_CLAIM') }))!.status).toBe('blocked');
    await unblockClaim(db, 'TEST_CLAIM', 'admin:test', NOW);
    expect((await db.query.claims.findFirst({ where: eq(claims.id, 'TEST_CLAIM') }))!.status).toBe('needs_verification');
  });

  it('approvalBlocker: eigene Daten erst nach Berechnung', () => {
    expect(
      approvalBlocker({
        status: 'needs_verification',
        blockedReason: null,
        scope: 'DE',
        expiresAt: new Date('2030-01-01'),
        checkResult: 'ok',
        sourceType: 'own_data',
      }),
    ).toMatch(/Eigene Daten/);
  });
});

describe('Playbooks', () => {
  const list = getPlaybooks();
  const claimDefs = new Map(loadClaimDefinitions().map((c) => [c.id, c]));

  it('6 Branchen, genau ein Fallback (Dienstleistung, ohne Statistik)', () => {
    expect(list.map((p) => p.id).sort()).toEqual([...INDUSTRIES].sort());
    const fb = list.filter((p) => p.fallback);
    expect(fb.map((p) => p.id)).toEqual(['dienstleistung']);
    expect(fb[0]!.allowed_claims).toEqual([]);
  });

  it('erlaubte Claims existieren, sind deutsch und passen zur Branche', () => {
    for (const p of list) {
      for (const id of p.allowed_claims) {
        const c = claimDefs.get(id);
        expect(c, `${p.id}: ${id}`).toBeDefined();
        expect(c!.scope).toBe('DE');
        expect(c!.industries, `${p.id}: ${id}`).toContain(p.id);
      }
    }
  });

  it('Demo-Schwerpunkte zeigen den Aufhänger (B3)', () => {
    const sections = Object.fromEntries(list.map((p) => [p.id, p.demo_sections]));
    expect(sections.gastronomie).toContain('speisekarte');
    expect(sections.gastronomie).toContain('reservierungsanfrage');
    expect(sections.handwerk).toEqual(
      expect.arrayContaining(['leistungen', 'einzugsgebiet', 'anfrageformular', 'wir_stellen_ein']),
    );
    expect(sections.beauty).toContain('terminanfrage');
    expect(sections.einzelhandel).toContain('vorab_reservieren');
    expect(sections.kurse_training).toContain('probetermin_anfrage');
  });

  it('ordnet OSM- und Google-Treffer der richtigen Branche zu', () => {
    const osm = (tags: Record<string, string>, name = 'Testbetrieb'): RawPlace => ({
      source: 'osm',
      sourceId: 'node/1',
      name,
      osmTags: tags,
    });
    const g = (types: string[], name = 'Testbetrieb'): RawPlace => ({
      source: 'google_places',
      sourceId: 'x',
      name,
      primaryType: types[0],
      types,
    });
    expect(classifyIndustry(osm({ amenity: 'restaurant' }))).toBe('gastronomie');
    expect(classifyIndustry(osm({ amenity: 'cafe;bakery' }))).toBe('gastronomie');
    expect(classifyIndustry(osm({ shop: 'bakery' }))).toBe('gastronomie');
    expect(classifyIndustry(osm({ craft: 'painter' }))).toBe('handwerk');
    expect(classifyIndustry(osm({ shop: 'hairdresser' }))).toBe('beauty');
    expect(classifyIndustry(osm({ shop: 'florist' }))).toBe('einzelhandel');
    expect(classifyIndustry(osm({ leisure: 'fitness_centre' }))).toBe('kurse_training');
    expect(classifyIndustry(osm({ amenity: 'driving_school' }))).toBe('kurse_training');
    expect(classifyIndustry(osm({ craft: 'photographer' }))).toBe('dienstleistung');
    expect(classifyIndustry(osm({ shop: 'unbekannt' }))).toBe('dienstleistung');
    expect(classifyIndustry(g(['italian_restaurant', 'restaurant']))).toBe('gastronomie');
    expect(classifyIndustry(g(['nail_salon']))).toBe('beauty');
    expect(classifyIndustry(g(['yoga_studio']))).toBe('kurse_training');
    // Suchbranche als Rückfall
    expect(classifyIndustry(osm({}), { group: 'handwerk' })).toBe('handwerk');
    expect(classifyIndustry(osm({}), { group: 'beauty', industry: 'kurse_training' })).toBe('kurse_training');
  });

  it('schließt Gesundheit und Recht aus (Typen, Tags, Namen)', () => {
    const p = (over: Partial<RawPlace>): RawPlace => ({ source: 'osm', sourceId: 'n/1', name: 'Betrieb', ...over });
    expect(exclusionFor(p({ osmTags: { healthcare: 'physiotherapist' } }))?.kind).toBe('osm_tag');
    expect(exclusionFor(p({ osmTags: { amenity: 'pharmacy' } }))).not.toBeNull();
    expect(exclusionFor(p({ osmTags: { office: 'lawyer' } }))).not.toBeNull();
    expect(exclusionFor(p({ osmTags: { shop: 'optician' } }))).not.toBeNull();
    expect(exclusionFor(p({ source: 'google_places', types: ['physiotherapist'] }))?.kind).toBe('google_type');
    expect(exclusionFor(p({ source: 'google_places', types: ['dental_clinic'] }))).not.toBeNull();
    expect(exclusionFor(p({ source: 'google_places', types: ['accounting'] }))).not.toBeNull();
    expect(exclusionFor(p({ name: 'Praxis für Physiotherapie Weber' }))?.kind).toBe('name');
    expect(exclusionFor(p({ name: 'Heilpraktikerin Sonnenschein' }))).not.toBeNull();
    expect(exclusionFor(p({ name: 'Medizinische Fußpflege Krause' }))).not.toBeNull();
    expect(exclusionFor(p({ name: 'Rechtsanwälte Schulz & Partner' }))).not.toBeNull();
    expect(exclusionFor(p({ name: 'Steuerberatung Yildiz' }))).not.toBeNull();
    // keine Fehlalarme bei normalen Zielbranchen
    expect(exclusionFor(p({ name: 'Kosmetik Hautnah', osmTags: { shop: 'beauty' } }))).toBeNull();
    expect(
      exclusionFor(p({ source: 'google_places', name: 'Studio Zeitlos', types: ['beauty_salon', 'skin_care_clinic'] })),
    ).toBeNull();
    expect(exclusionFor(p({ name: 'Malerbetrieb Kowalski', osmTags: { craft: 'painter' } }))).toBeNull();
    expect(exclusionFor(p({ name: 'Café Pause', osmTags: { amenity: 'cafe' } }))).toBeNull();
  });

  it('Qualifizierung lehnt ausgeschlossene Branchen mit eigenem Grund ab', () => {
    const r = qualify({
      place: {
        source: 'osm',
        sourceId: 'n/1',
        name: 'Physio am Markt',
        street: 'Markt',
        houseNumber: '1',
        postalCode: '44137',
        city: 'Dortmund',
      },
      branch: DEFAULT_CONFIG.targeting.branches[0]!,
      city: 'Dortmund',
      cfg: DEFAULT_CONFIG,
      isSuppressed: false,
      recentlyContacted: false,
      chainByFrequency: false,
      excludedIndustry: true,
    });
    expect(r.qualified).toBe(false);
    expect(r.reasons).toEqual(['excluded_industry']);
  });

  it('Lead-Finder speichert die Branche je Lead; Tabelle playbooks wird gespiegelt', async () => {
    await resetDb();
    await findLeads({ actor: 'job:test' });
    const rows = await getDb().select({ industry: leads.industry, group: leads.branchGroup }).from(leads);
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) expect(r.industry).toBe(r.group);
    expect(await syncPlaybooks(getDb())).toBe(6);
    const pb = await getDb().select().from(playbooksTable);
    expect(pb.find((p) => p.id === 'handwerk')!.allowedClaimIds).toContain('HANDWERK_OHNE_WEBSITE_AUSSORTIERT');
  });
});
