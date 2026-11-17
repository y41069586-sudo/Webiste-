import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { updateConfig } from '../src/config/service';
import { matchBusiness, phoneDigits, probeDomains, probeOwnWebsite } from '../src/leads/website-probe';
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

  it('Skripte zählen nicht, Fehler/Nicht-HTML werden übersprungen, höchstens 6 Startseiten, keine Wiederholung', async () => {
    const calls: string[] = [];
    const res = await probeOwnWebsite(subject, {
      fetchImpl: fakeFetch({ 'malerbetrieb-kowalski.de': '<script>var t="0231 123456"</script><p>Baustelle</p>' }, calls),
    });
    expect(res.result).toBe('none');
    expect(calls.length).toBeLessThanOrEqual(6);
    expect(new Set(calls).size).toBe(calls.length);
    expect(calls.every((u) => /^https:\/\/[a-z0-9-]+\.de\/$/.test(u))).toBe(true);
  });

  it('prüft die geschäftliche E-Mail-Domain zuerst und meldet eine echte Seite dort als „möglich“', async () => {
    const calls: string[] = [];
    const text = '<h1>Willkommen</h1>' + '<p>Wir streichen, tapezieren und renovieren seit Jahren.</p>'.repeat(5);
    const res = await probeOwnWebsite(
      { ...subject, emailDomain: 'kowalski-farbe.com' },
      {
        fetchImpl: fakeFetch({ 'kowalski-farbe.com': text }, calls),
      },
    );
    expect(calls[0]).toBe('https://kowalski-farbe.com/');
    expect(res).toMatchObject({ result: 'possible', url: 'https://kowalski-farbe.com/' });
    // Geparkte Domain ist kein Hinweis
    const parked = await probeOwnWebsite(
      { ...subject, emailDomain: 'kowalski-farbe.com' },
      {
        fetchImpl: fakeFetch({ 'kowalski-farbe.com': '<p>This domain may be for sale.</p>' + 'x '.repeat(200) }),
      },
    );
    expect(parked.result).toBe('none');
  });

  it('Namens-Domain mit Firmenname und Stadt ist „möglich“, Name allein nicht', async () => {
    const page = (city: string) =>
      `<title>Malerbetrieb Kowalski</title><p>Ihr Malerbetrieb Kowalski in ${city}. ` +
      'Wir freuen uns auf Ihre Anfrage. '.repeat(10) +
      '</p>';
    const possible = await probeOwnWebsite(subject, { fetchImpl: fakeFetch({ 'malerbetrieb-kowalski.de': page('Dortmund') }) });
    expect(possible.result).toBe('possible');
    const elsewhere = await probeOwnWebsite(subject, { fetchImpl: fakeFetch({ 'malerbetrieb-kowalski.de': page('München') }) });
    expect(elsewhere.result).toBe('none');
  });

  it('ruft ohne Telefon und vollständige Anschrift gar nichts ab', async () => {
    const calls: string[] = [];
    const res = await probeOwnWebsite({ ...subject, phone: null, street: null }, { fetchImpl: fakeFetch({}, calls) });
    expect(res.result).toBe('none');
    expect(calls).toEqual([]);
  });
});

describe('Lead-Finder: Vorprüfung mit Schalter und nie für Mock-Quellen', () => {
  beforeEach(resetDb);
  afterEach(() => vi.restoreAllMocks());

  it('Standard: Schalter an, aber Mock-Quelle wird nie geprüft', async () => {
    const spy = vi.spyOn(globalThis, 'fetch');
    const s = await findLeads({ actor: 'job:test', branches: ['maler'] });
    expect(s.websiteProbes).toBe(0);
    expect(spy).not.toHaveBeenCalled();
  });

  it('Schalter aus: keine Abrufe', async () => {
    await updateConfig({ targeting: { acquisition: { websiteProbe: false } } }, 'test');
    const spy = vi.spyOn(globalThis, 'fetch');
    const s = await findLeads({ actor: 'job:test', branches: ['maler'] });
    expect(s.websiteProbes).toBe(0);
    expect(spy).not.toHaveBeenCalled();
  });

  it('17.11.2026: findet die Website auch unter Gewerk-/Stadt-Varianten und über das Impressum', async () => {
    const d = probeDomains({ businessName: 'Dachdeckerei Müller GmbH', city: 'Göttingen', branch: 'dachdecker' });
    expect(d.length).toBeGreaterThan(15);
    expect(d).toEqual(
      expect.arrayContaining([
        'mueller-dach.de',
        'dach-mueller.de',
        'muellergoettingen.de',
        'muller-dach.de',
        'dachdeckerei-muller.de',
      ]),
    );
    expect(d).toContain(new URL('https://müller.de').hostname);
    expect(d.some((x) => x.includes('gmbh'))).toBe(false);
    expect(d.some((x) => x.startsWith('xn--'))).toBe(true);
    expect(d.some((x) => x.endsWith('.com'))).toBe(true);
    // Startseite ohne Kontaktdaten, Impressum mit Telefonnummer → Fund
    const calls: string[] = [];
    const home = '<h1>Ihr Dach in guten Händen</h1>' + '<p>Wir decken Dächer, reparieren und beraten.</p>'.repeat(6);
    const fetchImpl = (async (input: string | URL | Request) => {
      const url = String(input);
      calls.push(url);
      if (url === 'https://mueller-dach.de/') return new Response(home, { headers: { 'content-type': 'text/html' } });
      if (url === 'https://mueller-dach.de/impressum')
        return new Response('<p>Impressum – Tel. 0551 793785</p>', { headers: { 'content-type': 'text/html' } });
      throw new TypeError('fetch failed');
    }) as typeof fetch;
    const res = await probeOwnWebsite(
      { businessName: 'Dachdeckerei Müller GmbH', city: 'Göttingen', branch: 'dachdecker', phone: '0551 793785' },
      { fetchImpl, resolveImpl: async (dom) => dom === 'mueller-dach.de' },
    );
    expect(res).toMatchObject({ result: 'found', url: 'https://mueller-dach.de/', matched: ['phone'] });
    // DNS-Vorfilter: nur die existierende Domain wurde abgerufen
    expect(calls).toEqual(['https://mueller-dach.de/', 'https://mueller-dach.de/impressum']);
  });
});
