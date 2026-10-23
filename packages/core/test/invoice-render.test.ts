import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { eq } from 'drizzle-orm';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { getDb } from '../src/db/client';
import { customers, demos, leads, orders, outboundEmails } from '../src/db/schema';
import { getProviders } from '../src/providers';
import { stopBoss } from '../src/queue';
import { closeBrowser } from '../src/render/browser';
import { sendCancellationInvoice, sendOrderInvoice } from '../src/render/invoice';
import { pdfTextItems, validateLetterPdf } from '../src/render/pdf';
import { applyRefund, simulateMockPayment, startCheckout } from '../src/services/orders';
import { randomToken } from '../src/util/crypto';
import { addDays } from '../src/util/time';
import { resetDb } from './helpers';

async function paidOrder() {
  const db = getDb();
  const [lead] = await db
    .insert(leads)
    .values({
      source: 'mock',
      sourceId: randomToken(10),
      businessName: 'Elektro Beispiel',
      branch: 'elektriker',
      branchGroup: 'handwerk',
      city: 'Dortmund',
      street: 'Hohe Straße',
      houseNumber: '12',
      postalCode: '44139',
      segmentKey: 'dortmund:handwerk:elektriker',
      trackToken: randomToken(24),
      status: 'cta_clicked',
    })
    .returning();
  const [demo] = await db
    .insert(demos)
    .values({
      leadId: lead!.id,
      slug: randomToken(24),
      templateId: 'handwerk-klar',
      palette: 'werkblau',
      status: 'published',
      publishedAt: new Date(),
      expiresAt: addDays(new Date(), 30),
    })
    .returning();
  const res = await startCheckout(
    demo!.slug,
    {
      company: 'Elektro Beispiel GmbH',
      contactName: 'Max Beispiel',
      email: 'max@example.org',
      street: 'Hohe Straße 12',
      postalCode: '44139',
      city: 'Dortmund',
      domain: 'elektro-beispiel.de',
      b2b: true,
      terms: true,
    },
    { ua: 'x', ipHash: 'h', isBot: false },
  );
  if (!res.ok) throw new Error(res.error);
  const order = await db.query.orders.findFirst({ where: eq(orders.id, res.orderId) });
  await simulateMockPayment(order!.stripeSessionId!, 'paid');
  return (await db.query.orders.findFirst({ where: eq(orders.id, res.orderId) }))!;
}

describe('Rechnungs-PDF und Versand', () => {
  beforeEach(async () => {
    await resetDb();
  });
  afterAll(async () => {
    await closeBrowser();
    await stopBoss();
  });

  it('erzeugt die Rechnung (Anschrift im Fenster, Pflichtangaben) und sendet sie genau einmal', async () => {
    const order = await paidOrder();
    expect(await sendOrderInvoice(order.id)).toBe('sent');
    expect(await sendOrderInvoice(order.id)).toBe('already');
    const db = getDb();
    const o = (await db.query.orders.findFirst({ where: eq(orders.id, order.id) }))!;
    expect(o.invoicePdfKey).toMatch(/^invoices\/\d{4}\/RE-\d{4}-0001\.pdf$/);
    const pdf = (await getProviders().storage.get(o.invoicePdfKey!))!;
    if (process.env.INVOICE_SAMPLE_DIR) writeFileSync(path.join(process.env.INVOICE_SAMPLE_DIR, 'rechnung-beispiel.pdf'), pdf);
    const { pages, items } = await pdfTextItems(pdf);
    expect(pages).toBe(1);
    const text = items.map((i) => i.str).join(' ');
    for (const s of [o.invoiceNumber!, '§ 19 UStG', 'Elektro Beispiel GmbH', 'Steuernummer', 'Leistungszeitpunkt', '590,00'])
      expect(text).toContain(s);
    const layout = await validateLetterPdf(pdf, {
      recipientLines: ['Elektro Beispiel GmbH', 'Max Beispiel', 'Hohe Straße 12', '44139 Dortmund'],
      position: 'left',
      expectedPages: 1,
    });
    expect(layout.issues.filter((i) => i.check === 'anschriftenfeld' || i.check === 'anschrift' || i.check === 'rand')).toEqual(
      [],
    );

    const mails = await db.select().from(outboundEmails).where(eq(outboundEmails.orderId, order.id));
    expect(mails).toHaveLength(1);
    expect(mails[0]).toMatchObject({ kind: 'invoice', status: 'sent', toEmail: 'max@example.org' });
    expect(mails[0]!.attachmentNames).toEqual([`Rechnung-${o.invoiceNumber}.pdf`]);
    const stored = JSON.parse((await getProviders().storage.get(`outbox/${mails[0]!.providerMessageId}.json`))!.toString('utf8'));
    const cust = await db.query.customers.findFirst({ where: eq(customers.orderId, order.id) });
    expect(stored.text).toContain(`/onboarding/${cust!.accessToken}`);
    expect(cust!.onboardingMailSentAt).not.toBeNull();
  });

  it('Stornorechnung nach Erstattung mit eigener Nummer', async () => {
    const order = await paidOrder();
    await sendOrderInvoice(order.id);
    await applyRefund(order.id, 59000, 'test');
    expect(await sendCancellationInvoice(order.id)).toBe('sent');
    expect(await sendCancellationInvoice(order.id)).toBe('already');
    const o = (await getDb().query.orders.findFirst({ where: eq(orders.id, order.id) }))!;
    expect(o.cancellationNumber).toMatch(/-0002$/);
    const { items } = await pdfTextItems((await getProviders().storage.get(o.cancellationPdfKey!))!);
    const text = items.map((i) => i.str).join(' ');
    expect(text).toContain('Stornorechnung');
    expect(text).toContain(o.invoiceNumber!);
    expect(text).toContain('-590,00');
  });
});
