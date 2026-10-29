import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { getDb } from '../src/db/client';
import { demos, leads, letters } from '../src/db/schema';
import { buildDemo, closeBrowser, generateLetter, pdfTextItems, qaDemo, validateLetterPdf } from '../src/render';
import { findLeads } from '../src/services/lead-finder';
import { approveDemo, publishDemo } from '../src/services/demo-review';
import { approveLetter, rejectLetter } from '../src/services/letters';
import { updateConfig } from '../src/config/service';
import { getProviders } from '../src/providers';
import { stopBoss } from '../src/queue';
import { domainCandidates, isValidDeLabel } from '../src/letters/domain';
import { lowerFirstWord, recipientLines } from '../src/letters/compose';
import { resetDb } from './helpers';

describe('Domain-Vorschlag', () => {
  it('löst Umlaute auf, entfernt Rechtsform und Sonderzeichen, ergänzt Branche/Ort', () => {
    const c = domainCandidates('Malerbetrieb Müller & Söhne GmbH', { city: 'Dortmund', branch: 'maler' });
    expect(c[0]).toBe('malerbetrieb-mueller-soehne.de');
    expect(c).toContain('malerbetrieb-mueller-soehne-dortmund.de');
    for (const d of c) expect(isValidDeLabel(d.replace(/\.de$/, ''))).toBe(true);
    const n = domainCandidates("Kim's Nails", { city: 'Dortmund', branch: 'nagelstudio' });
    expect(n).toContain('kims-nails.de');
    expect(
      domainCandidates("Mira's Kosmetikinstitut, Wellness- und Gesundheitszentrum", {
        city: 'Dortmund',
        branch: 'kosmetikstudio',
      }),
    ).toContain('miras-kosmetikinstitut.de');
    expect(n.every((d) => d.length <= 40)).toBe(true);
  });
  it('ungültige Labels werden verworfen', () => {
    expect(isValidDeLabel('-abc')).toBe(false);
    expect(isValidDeLabel('ab--c')).toBe(false);
    expect(isValidDeLabel('abc')).toBe(true);
  });
});

describe('Anschrift & Text', () => {
  it('„An das Team von …“, letzte Zeile PLZ Ort, max. 45 Zeichen je Zeile', () => {
    expect(
      recipientLines({
        businessName: 'Nails by Mira',
        street: 'Kampstraße',
        houseNumber: '5',
        postalCode: '44137',
        city: 'Dortmund',
      }),
    ).toEqual(['An das Team von Nails by Mira', 'Kampstraße 5', '44137 Dortmund']);
    const long = recipientLines({
      businessName: "Mira's Kosmetikinstitut, Wellness- und Gesundheitszentrum",
      street: 'Kampstraße',
      houseNumber: '5',
      postalCode: '44137',
      city: 'Dortmund',
    });
    expect(long[0]).toBe('An das Team von');
    expect(long.length).toBeLessThanOrEqual(5);
    expect(long.every((l) => l.length <= 45)).toBe(true);
    expect(long[long.length - 1]).toBe('44137 Dortmund');
  });
  it('Text nach der Anrede beginnt klein (außer Höflichkeitsform)', () => {
    expect(lowerFirstWord('Wer Sie online sucht, findet …')).toBe('wer Sie online sucht, findet …');
    expect(lowerFirstWord('Ihre Kundinnen sind begeistert.')).toBe('Ihre Kundinnen sind begeistert.');
  });
});

describe('Brief-PDF (echter Browser)', () => {
  let leadId: string;
  beforeAll(async () => {
    await resetDb();
    await findLeads({ actor: 'job:test' });
    const lead = (await getDb().select().from(leads).where(eq(leads.status, 'qualified')).limit(1))[0]!;
    leadId = lead.id;
    const demoId = await buildDemo(leadId, { actor: 'job:test' });
    await qaDemo(demoId, 'job:test', { lighthouse: false });
    await approveDemo(demoId, 'admin:test', {
      manual: true,
      review: {
        facts: true,
        desktop: true,
        mobile: true,
        images: true,
        text: true,
        qualityScores: { design: 90, industry: 90, personalization: 90, images: 90, mobile: 90 },
      },
    });
    await publishDemo(demoId, 'admin:test');
  }, 120_000);
  afterAll(async () => {
    await closeBrowser();
    await stopBoss();
  });

  it('erzeugt einen einseitigen Brief, Anschrift exakt im easyNova-Anschriftenfeld unter der Freimachung', async () => {
    const res = await generateLetter(leadId, 1, { actor: 'job:test' });
    expect(res.issues, JSON.stringify(res.issues)).toEqual([]);
    expect(res.status).toBe('generated');
    expect(res.pages).toBe(1);
    const letter = await getDb().query.letters.findFirst({ where: eq(letters.id, res.letterId) });
    const pdf = (await getProviders().storage.get(letter!.pdfStorageKey!))!;
    const lead = await getDb().query.leads.findFirst({ where: eq(leads.id, leadId) });
    expect(lead?.status).toBe('letter_generated');
    const check = await validateLetterPdf(pdf, {
      recipientLines: recipientLines({
        businessName: lead!.businessName,
        street: lead!.street!,
        houseNumber: lead!.houseNumber!,
        postalCode: lead!.postalCode!,
        city: lead!.city,
      }),
      position: 'left',
      expectedPages: 1,
    });
    expect(check.issues).toEqual([]);
    // Anschrift beginnt rechts von 22 mm und unterhalb von 60 mm, endet vor 85,5 mm
    // easyNova: Anschrift unterhalb der Freimachung (52–68 mm), innerhalb 19–108 × 52–90 mm
    expect(check.addressBox!.x1).toBeGreaterThanOrEqual(20);
    expect(check.addressBox!.y1).toBeGreaterThanOrEqual(68);
    expect(check.addressBox!.y2).toBeLessThanOrEqual(90);
    expect(check.addressBox!.x2).toBeLessThanOrEqual(108);
    const text = (await pdfTextItems(pdf)).items.map((i) => i.str).join(' ');
    expect(text).toMatch(/Ihre neue Website ist schon fertig|Ein Website-Entwurf für/);
    expect(text).toContain('590 €');
    // Beide Preisoptionen, Mindestlaufzeit direkt daneben, Garantie, „online bis …“, Kurz-URL
    expect(text).toMatch(/49\s€ pro Monat/);
    expect(text).toContain('12 Monate Mindestlaufzeit');
    // Keine Garantie mehr (Standard seit 29.10.2026)
    expect(text).not.toContain('Geld zurück');
    expect(text).toMatch(/online bis \d{1,2}\. \p{L}+ \d{4}/u);
    expect(text).not.toMatch(/nach \d+ Tagen automatisch gelöscht/);
    const l = (await getDb().query.leads.findFirst({ where: eq(leads.id, lead!.id) }))!;
    expect(l.shortCode).toMatch(/^[a-hjkmnp-z2-9]{6}$/);
    expect(text.replace(/\s+/g, '')).toContain(`/${l.shortCode}`);
    expect(text).toContain('Art. 14 DSGVO');
    expect(text).toContain('Art. 21 DSGVO');
    expect(text).toContain('Kein Interesse');
    // Darf nicht wie eine Rechnung aussehen
    expect(text).not.toMatch(/Rechnung|IBAN|BIC|Überweisung|Zahlungsfrist|fällig|Kontonummer|zahlbar/i);
  }, 60_000);

  it('Bewertungszeile nur mit USE_RATING_IN_LETTER; zweite Seite mit Screenshots optional', async () => {
    await updateConfig({ switches: { useRatingInLetter: true }, letter: { includeScreenshotPage: true } }, 'test');
    const res = await generateLetter(leadId, 1, { actor: 'job:test', regenerate: true });
    expect(res.issues).toEqual([]);
    expect(res.pages).toBe(2);
    const letter = await getDb().query.letters.findFirst({ where: eq(letters.id, res.letterId) });
    await updateConfig({ switches: { useRatingInLetter: false }, letter: { includeScreenshotPage: false } }, 'test');
    const text = (await pdfTextItems((await getProviders().storage.get(letter!.pdfStorageKey!))!)).items
      .map((i) => i.str)
      .join(' ');
    expect(text).toMatch(/Bewertungen (mit durchschnittlich|und durchschnittlich)/);
  }, 60_000);

  it('Freigabe setzt Lead auf letter_approved; Ablehnen mit Neu-Erzeugen setzt zurück', async () => {
    const res = await generateLetter(leadId, 1, { actor: 'job:test', regenerate: true });
    expect(await approveLetter(res.letterId, 'admin:test')).toBe(false);
    expect(
      await approveLetter(res.letterId, 'admin:test', {
        personalization: 90,
        industry: 90,
        text: 90,
        visual: 90,
        screenshot: 90,
      }),
    ).toBe(true);
    expect((await getDb().query.leads.findFirst({ where: eq(leads.id, leadId) }))?.status).toBe('letter_approved');
    await rejectLetter(res.letterId, 'admin:test', 'Tippfehler', false);
    expect((await getDb().query.leads.findFirst({ where: eq(leads.id, leadId) }))?.status).toBe('demo_published');
  }, 60_000);

  it('Testbrief an die eigene Adresse ändert den Lead nicht', async () => {
    await updateConfig(
      {
        letter: {
          testRecipient: { name: 'Max Muster', street: 'Teststraße', houseNumber: '1', postalCode: '44135', city: 'Dortmund' },
        },
      },
      'test',
    );
    const before = await getDb().query.leads.findFirst({ where: eq(leads.id, leadId) });
    const res = await generateLetter(leadId, 1, { actor: 'admin:test', test: true });
    expect(res.issues).toEqual([]);
    const letter = await getDb().query.letters.findFirst({ where: eq(letters.id, res.letterId) });
    expect(letter?.isTest).toBe(true);
    expect(letter?.sequence).toBe(0);
    expect((await getDb().query.leads.findFirst({ where: eq(leads.id, leadId) }))?.status).toBe(before?.status);
    void demos;
  }, 60_000);
});

describe('Alle Briefvarianten passen im ungünstigsten Fall auf eine Seite', () => {
  afterAll(closeBrowser);
  it('langer Name, Bewertung, Domain, alle Varianten', async () => {
    const { DEFAULT_LETTER_VARIANTS } = await import('../src/letters/variants');
    const { composeLetter } = await import('../src/letters/compose');
    const { renderLetterHtml } = await import('@wbm/templates');
    const { htmlToPdf, validateLetterDom } = await import('../src/render');
    const { DEFAULT_CONFIG } = await import('../src/config/settings');
    const { privacyNoticeText, objectionNoticeText } = await import('../src/letters/notices');
    const { qrDataUri } = await import('../src/render/letter');
    // Platzhalterbild im Seitenverhältnis des Komposits (1800×1080)
    const svg = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="1800" height="1080"><rect width="1800" height="1080" fill="#ccc"/></svg>',
    );
    for (const v of DEFAULT_LETTER_VARIANTS) {
      const recipient = {
        businessName: "Mira's Kosmetikinstitut, Wellness- und Gesundheitszentrum",
        street: 'Hörder Semerteichstraße',
        houseNumber: '183a',
        postalCode: '44263',
        city: 'Dortmund',
      };
      const data = composeLetter({
        variant: v.content,
        cfg: { ...DEFAULT_CONFIG, offers: { ...DEFAULT_CONFIG.offers, activeVersion: 'legacy' } },
        recipient,
        domain: 'miras-kosmetikinstitut-dortmund.de',
        rating: { rating: 4.9, count: 213 },
        compositeDataUri: `data:image/svg+xml;base64,${svg.toString('base64')}`,
        qrDataUri: await qrDataUri('https://go.example-websites.de/q/ABCDEFGHJKLMNPQRSTUVWXYZ'),
        shortUrl: 'go.example-websites.de/k7m2xq',
        expiresLabel: '23. November 2026',
        dateLine: 'Dortmund, 23. Oktober 2026',
        privacyNotice: privacyNoticeText(DEFAULT_CONFIG, 'osm', 'https://app.example-websites.de/datenschutz'),
        objectionNotice: objectionNoticeText('widerspruch@example-websites.de'),
        priceLabel: '590 €',
      });
      const html = renderLetterHtml(data);
      const dom = await validateLetterDom(html, 'left');
      expect(dom, `${v.name}: ${JSON.stringify(dom)}`).toEqual([]);
      const pdf = await htmlToPdf(html);
      if (process.env.LETTER_SAMPLE_DIR)
        (await import('node:fs')).writeFileSync(`${process.env.LETTER_SAMPLE_DIR}/${v.name.slice(0, 2).trim()}.pdf`, pdf);
      const check = await validateLetterPdf(pdf, { recipientLines: data.recipientLines, position: 'left', expectedPages: 1 });
      expect(check.issues, `${v.name}: ${JSON.stringify(check.issues)}`).toEqual([]);
    }
  }, 120_000);
});

describe('V4-Einladung passt für jede Branche auf eine Seite (fester Text, lange Angaben)', () => {
  afterAll(closeBrowser);
  it('alle Branchen × Varianten A/B/C × Folgebriefe, nach dem Einpassen ohne Befund', async () => {
    const { composeLetter } = await import('../src/letters/compose');
    const { v4LetterVariant } = await import('../src/letters/conversion-v4');
    const { INDUSTRIES } = await import('../src/types');
    const { htmlToPdf } = await import('../src/render');
    const { fitLetterLayout, qrDataUri } = await import('../src/render/letter');
    const { DEFAULT_CONFIG } = await import('../src/config/settings');
    const { privacyNoticeText, objectionNoticeText } = await import('../src/letters/notices');
    const { OPERATOR_TEST_CONFIG } = await import('./helpers');
    const { previewInvitationCopy } = await import('../src/letters/personalization');
    const { invitationContextHash, LETTER_TEXT_LIMITS: L } = await import('../src/letters/writer');
    // Text bis kurz vor die Grenze verlängern (ganze Wörter)
    const filler = (start: string, max: number) => {
      let t = start;
      while (t.length < max - 40) t += ' und ausführlich beschriebene Leistungen rund um den Betrieb';
      return `${t.slice(0, max - 1).replace(/\s+\S*$/, '')}.`;
    };
    const cfg = {
      ...DEFAULT_CONFIG,
      ...OPERATOR_TEST_CONFIG,
      sender: {
        ...DEFAULT_CONFIG.sender,
        ...OPERATOR_TEST_CONFIG.sender,
        name: 'Vorname Langername-Beispiel',
        email: 'kontakt@beispiel-webdesign.world',
        phone: '+49 1521 0000000',
        photoUrl: '',
      },
      offers: { ...DEFAULT_CONFIG.offers, activeVersion: 'v4' as const },
    } as typeof DEFAULT_CONFIG;
    const svg = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="1800" height="1080"><rect width="1800" height="1080" fill="#ccc"/></svg>',
    );
    const qr = await qrDataUri('https://go.example-websites.de/q/ABCDEFGHJKLMNPQRSTUVWXYZ');
    const failures: string[] = [];
    for (const b of cfg.targeting.branches) {
      const industry = (INDUSTRIES as readonly string[]).includes(b.group)
        ? (b.group as (typeof INDUSTRIES)[number])
        : 'dienstleistung';
      const cases = [
        ...(['A', 'B', 'C'] as const).map((arm) => ({ arm, sequence: 1 as const, mode: 'fest' as const })),
        ...(['A', 'B'] as const).map((arm) => ({ arm, sequence: 1 as const, mode: 'fakten' as const })),
        { arm: 'A' as const, sequence: 1 as const, mode: 'ki' as const },
        { arm: 'B' as const, sequence: 1 as const, mode: 'ki-beobachtung' as const },
        { arm: 'A' as const, sequence: 2 as const, mode: 'fest' as const },
        { arm: 'A' as const, sequence: 3 as const, mode: 'fest' as const },
      ];
      // Längstes zulässiges Faktenpaket: Beobachtung, Websuche, drei belegte Angaben (je ≤ 140 Zeichen)
      const checkedAt = new Date().toISOString();
      const longFacts = [
        {
          text: 'Ihr Eintrag nennt seit kurzem neue Öffnungszeiten am Samstagvormittag',
          source: 'osm',
          verified: true,
          kind: 'public_observation' as const,
          checkedAt,
        },
        {
          text: 'not_found',
          source: 'suche',
          verified: true,
          kind: 'website_search' as const,
          checkedAt,
          checks: ['name_city_search' as const, 'directory_links' as const, 'social_links' as const],
        },
        {
          text: 'Beratung und Ausführung für Privatkunden und Hausverwaltungen im gesamten Dortmunder Süden und Umgebung',
          source: 'osm',
          verified: true,
        },
        { text: 'Notdienst nach Absprache auch am Wochenende', source: 'osm', verified: true },
        {
          text: 'Kostenlose Erstberatung vor Ort für Eigentümer, Mieter und kleine Gewerbebetriebe nach Terminabsprache',
          source: 'osm',
          verified: true,
        },
      ];
      for (const { arm, sequence, mode } of cases) {
        const facts = mode !== 'fest';
        const recipient = {
          businessName: `${b.label} Beispiel am Westfalenpark Dortmund-Hörde`,
          street: 'Hörder Semerteichstraße',
          houseNumber: '183a',
          postalCode: '44263',
          city: 'Dortmund',
        };
        const context = {
          businessName: recipient.businessName,
          city: recipient.city,
          branchLabel: b.label,
          details: facts ? longFacts : [],
        };
        // KI-Fassung genau an den Längengrenzen des Schreibers (LETTER_TEXT_LIMITS)
        const base = previewInvitationCopy(context, sequence, arm === 'B' ? 'B' : 'A');
        const invitationCopy =
          mode === 'ki' || mode === 'ki-beobachtung'
            ? {
                copy: {
                  ...base,
                  subject: filler('Ihre Website-Idee für den Betrieb am Westfalenpark', 118),
                  opening:
                    mode === 'ki'
                      ? filler('ich habe für Ihren Betrieb eine eigene Website gebaut', L.body / 2)
                      : `${filler('mir ist aufgefallen, dass Ihr Eintrag neue Öffnungszeiten am Samstag nennt', L.observation)} ${filler('deshalb habe ich für Ihren Betrieb eine eigene Website gebaut', (L.total - L.observation) / 2 - 1)}`,
                  intro: [
                    filler(
                      'Wer in Dortmund nach Ihnen sucht, sieht dort Ihr Angebot',
                      mode === 'ki' ? L.body / 2 : (L.total - L.observation) / 2 - 1,
                    ),
                    ...(base.research ? [base.research] : []),
                  ],
                },
                contextHash: invitationContextHash(context, sequence),
                demoHash: 'test',
                engine: 'llm' as const,
                attempts: 1,
                reviewReasons: [],
              }
            : undefined;
        const data = composeLetter({
          variant: v4LetterVariant(industry, arm, sequence),
          ...(invitationCopy ? { invitationCopy } : {}),
          cfg,
          sequence,
          recipient,
          branchLabel: b.label,
          personalization: context,
          domain: null,
          rating: null,
          compositeDataUri: `data:image/svg+xml;base64,${svg.toString('base64')}`,
          qrDataUri: qr,
          shortUrl: 'go.example-websites.de/k7m2xq',
          expiresLabel: '23. November 2026',
          dateLine: 'Dortmund, 23. Oktober 2026',
          privacyNotice: privacyNoticeText(cfg, 'osm', 'https://app.example-websites.de/datenschutz'),
          objectionNotice: objectionNoticeText('widerspruch@example-websites.de'),
          priceLabel: '597 €',
        });
        const { html, domIssues } = await fitLetterLayout(data, cfg);
        const label = `${b.key} ${arm}${sequence} ${mode}`;
        if (domIssues.length) failures.push(`${label}: ${JSON.stringify(domIssues)}`);
        const check = await validateLetterPdf(await htmlToPdf(html), {
          recipientLines: data.recipientLines,
          position: 'left',
          expectedPages: 1,
        });
        if (check.issues.length) failures.push(`${label} PDF: ${JSON.stringify(check.issues)}`);
      }
    }
    expect(failures).toEqual([]);
  }, 600_000);
});
