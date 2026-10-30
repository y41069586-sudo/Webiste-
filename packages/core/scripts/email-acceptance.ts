/** Existing worker only: one real confirmation to the operator for a fictional, paid Sandbox order. */
import { createHash } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { appUrl, getEnv } from '../src/config/env';
import { effectiveSwitches, getConfig } from '../src/config/service';
import { closeDb, getDb } from '../src/db/client';
import { customers, leads, orders } from '../src/db/schema';
import { orderConfirmationEmail } from '../src/emails/templates';
import { getProviders } from '../src/providers';
import { audit } from '../src/services/audit';
import { assertNotHalted } from '../src/services/budget';
import { sendTransactionalEmail } from '../src/services/email';
import { formatEuro } from '../src/util/time';

const apply = process.argv.includes('--apply');
const orderId = process.argv.find((arg) => arg.startsWith('--order='))?.slice(8);
// Process-local selection only; no worker, Netlify, configuration, or auto-reply switches change.
process.env.EMAIL_PROVIDER = apply ? 'resend' : 'mock';

async function main() {
  if (!orderId || !/^[a-f0-9-]{36}$/.test(orderId)) throw new Error('--order=<fiktive Testbestellung> fehlt.');
  if (apply && process.env.EMAIL_ACCEPTANCE_CONFIRM !== 'own-inbox')
    throw new Error('Explizite EMAIL_ACCEPTANCE_CONFIRM=own-inbox fehlt.');
  const env = getEnv();
  const cfg = await getConfig({ fresh: true });
  if (!effectiveSwitches(cfg).dryRun) throw new Error('Dieser Probelauf erfordert DRY_RUN=true.');
  await assertNotHalted(cfg);
  const db = getDb();
  const order = await db.query.orders.findFirst({ where: eq(orders.id, orderId) });
  const customer = order ? await db.query.customers.findFirst({ where: eq(customers.orderId, order.id) }) : null;
  const lead = order?.leadId ? await db.query.leads.findFirst({ where: eq(leads.id, order.leadId) }) : null;
  if (
    order?.paymentMode !== 'test' ||
    order.provider !== 'stripe' ||
    order.status !== 'paid' ||
    lead?.source !== 'mock' ||
    !/test|fiktiv/i.test(order.customerCompany)
  )
    throw new Error('Nur ausdrücklich fiktive, bezahlte Stripe-Sandbox-Bestellungen zulässig.');
  const own = cfg.sender.email.toLowerCase();
  const from = env.EMAIL_FROM.match(/(?:<|\s|^)([^<>\s]+@[^<>\s]+)(?:>|\s|$)/)?.[1]?.toLowerCase();
  if (!customer || customer.email.toLowerCase() !== own || order.customerEmail.toLowerCase() !== own || from !== own)
    throw new Error('Absender und beide Testempfänger müssen das eigene konfigurierte Absenderpostfach sein.');
  if (!order.invoiceJson || !order.invoiceNumber || !order.invoicePdfKey || !order.paidAt || !order.offerSnapshot)
    throw new Error('Gespeicherte V4-Testrechnung und Angebotssnapshot erforderlich.');
  if (!cfg.tax.operatorConfirmed && order.invoiceJson.taxNote)
    throw new Error('Alten Testbeleg mit unbestätigtem Steuerhinweis nicht versenden.');
  const origin = new URL(env.APP_URL);
  if (origin.protocol !== 'https:' || origin.origin !== 'https://seitenwerkworld.netlify.app')
    throw new Error('Der Test muss zur vorhandenen HTTPS-App führen.');
  if (!apply) {
    console.log(
      JSON.stringify({ stage: 'fixture_checked', ownRecipient: true, providerCalls: false, tariff: order.offerSnapshot.tier }),
    );
    return;
  }
  if (!env.EMAIL_API_KEY) throw new Error('EMAIL_API_KEY fehlt in der geschützten Worker-Umgebung.');
  if (getProviders().email.name !== 'resend') throw new Error('Tatsächlicher Resend-Adapter erforderlich.');
  const pdf = await getProviders().storage.get(order.invoicePdfKey);
  if (!pdf || !pdf.subarray(0, 5).equals(Buffer.from('%PDF-')))
    throw new Error('Originaler Testbeleg fehlt im Speicher; nicht stillschweigend neu erzeugen.');
  const number = order.invoiceNumber;
  const content = orderConfirmationEmail(cfg, {
    name: order.customerName,
    company: order.customerCompany,
    invoiceNumber: number,
    amount: formatEuro(order.amountCents),
    onboardingUrl: appUrl(`/onboarding/${customer.accessToken}`),
    domain: order.domainWish,
    v4: order.offerSnapshot,
  });
  const notice =
    'SANDBOX-TEST: Fiktive Bestellung, ausschließlich mit Stripe-Testkarte bezahlt. Kein echter Kauf, keine Zahlungspflicht. Der Anhang ist ein Testbeleg und keine steuerlich gültige Rechnung. Domainregistrierung, Veröffentlichung und Monatsstart werden durch diese E-Mail nicht ausgelöst.';
  const result = await sendTransactionalEmail({
    ...content,
    subject: `[SANDBOX-TEST] ${content.subject}`,
    text: `${notice}\n\n${content.text}`,
    html: content.html.replace(
      /(<body\b[^>]*>)/i,
      `$1<p style="padding:16px;color:#1d232b;font:16px/1.5 Arial,sans-serif">${notice}</p>`,
    ),
    kind: 'acceptance_invoice',
    idempotencyKey: `acceptance:order-confirmation:${order.id}:resend:v1`,
    to: own,
    attachments: [{ filename: `TESTBELEG-${number}.pdf`, content: pdf, contentType: 'application/pdf' }],
    orderId: order.id,
    customerId: customer.id,
    leadId: order.leadId,
  });
  await audit(db, {
    entity: 'order',
    entityId: order.id,
    action: 'email_acceptance',
    actor: 'test:email-acceptance',
    context: {
      provider: 'resend',
      status: result.status,
      messageId: result.messageId,
      attachmentHash: createHash('sha256').update(pdf).digest('hex'),
      deliveryVerified: false,
    },
  });
  // "sent" here means accepted by Resend. Delivery needs a separate provider/inbox readback.
  console.log(
    JSON.stringify({
      stage: 'result',
      provider: 'resend',
      ...result,
      deliveryVerified: false,
      orderStateChanged: false,
      globalProviderChanged: false,
    }),
  );
}

try {
  await main();
} finally {
  await closeDb();
}
