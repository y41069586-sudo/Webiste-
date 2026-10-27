import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { updateConfig } from '../src/config/service';
import { matchBusiness, phoneDigits, probeOwnWebsite } from '../src/leads/website-probe';
import { findLeads } from '../src/services/lead-finder';
import { resetDb } from './helpers';

const subject = {
  businessName: 'Malerbetrieb Kowalski',
  city: 'Dortmund',
  branch: 'maler',
  phone: '0231 123456',
  street: 'Kampstraße 5',
  postalCode: '44137',
};

/** Gefälschtes fetch: Domain → HTML; alles andere schlägt wie ein DNS-Fehler fehl. Kein echtes Netz. */
function fakeFetch(pages: Record<string, string>, calls: string[] = []) {
  return (async (input: string | URL | Request) => {
    const url = String(input);
    calls.push(url);
    const host = new URL(url).hostname;
    if (!(host in pages)) throw new TypeError('fetch failed');
    return new Response(pages[host], { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } });
  }) as typeof fetch;
}

describe('Website-Vorprüfung (ohne Netz)', () => {
  it('normalisiert Rufnummern national (+49, 0049, 0)', () => {
    expect(phoneDigits('0231 123456')).toBe('231123456');
    expect(phoneDigits('+49 (231) 12 34 56')).toBe('231123456');
    expect(phoneDigits('0049 231/123456')).toBe('231123456');
    expect(phoneDigits('123')).toBeNull();
    expect(phoneDigits(null)).toBeNull();
  });

  it('erkennt Telefon und Anschrift, aber nicht den Namen allein', () => {
    expect(matchBusiness('Rufen Sie an: +49 231 12 34 56', subject)).toEqual(['phone']);
    expect(matchBusiness('Kampstr. 5, 44137 Dortmund', subject)).toEqual(['address']);
    expect(matchBusiness('Malerbetrieb Kowalski – Ihr Maler in Dortmund', subject)).toEqual([]);
    expect(matchBusiness('Tel. 0231 999999, Kampstraße 7, 44139 Dortmund', subject)).toEqual([]);
  });

  it('meldet einen Fund nur bei belegter Übereinstimmung', async () => {
    const found = await probeOwnWebsite(subject, {
      fetchImpl: fakeFetch({ 'malerbetrieb-kowalski.de': '<h1>Willkommen</h1><p>Tel: 0231 / 123456</p>' }),
    });
    expect(found).toMatchObject({ result: 'found', url: 'https://malerbetrieb-kowalski.de/', matched: ['phone'] });

    // Gleichnamiger Betrieb mit anderer Nummer/Anschrift: kein Fund
    const other = await probeOwnWebsite(subject, {
      fetchImpl: fakeFetch({ 'malerbetrieb-kowalski.de': '<p>Malerbetrieb Kowalski, 80331 München, Tel 089 555555</p>' }),
    });
    expect(other.result).toBe('none');
  });

  it('Skripte zählen nicht, Fehler/Nicht-HTML werden übersprungen, höchstens 4 Abrufe, keine Wiederholung', async () => {
    const calls: string[] = [];
    const res = await probeOwnWebsite(subject, {
      fetchImpl: fakeFetch({ 'malerbetrieb-kowalski.de': '<script>var t="0231 123456"</script><p>Baustelle</p>' }, calls),
    });
    expect(res.result).toBe('none');
    expect(calls.length).toBeLessThanOrEqual(4);
    expect(new Set(calls).size).toBe(calls.length);
    expect(calls.every((u) => /^https:\/\/[a-z0-9-]+\.de\/$/.test(u))).toBe(true);
  });

  it('ruft ohne Telefon und vollständige Anschrift gar nichts ab', async () => {
    const calls: string[] = [];
    const res = await probeOwnWebsite({ ...subject, phone: null, street: null }, { fetchImpl: fakeFetch({}, calls) });
    expect(res.result).toBe('none');
    expect(calls).toEqual([]);
  });
});

describe('Lead-Finder: Vorprüfung nur mit Schalter und nie für Mock-Quellen', () => {
  beforeEach(resetDb);
  afterEach(() => vi.restoreAllMocks());

  it('Standard: Schalter aus, keine Abrufe', async () => {
    const spy = vi.spyOn(globalThis, 'fetch');
    const s = await findLeads({ actor: 'job:test', branches: ['maler'] });
    expect(s.websiteProbes).toBe(0);
    expect(spy).not.toHaveBeenCalled();
  });

  it('Schalter an: Mock-Quelle wird trotzdem nicht geprüft', async () => {
    await updateConfig({ targeting: { acquisition: { websiteProbe: true } } }, 'test');
    const spy = vi.spyOn(globalThis, 'fetch');
    const s = await findLeads({ actor: 'job:test', branches: ['maler'] });
    expect(s.websiteProbes).toBe(0);
    expect(spy).not.toHaveBeenCalled();
  });
});
