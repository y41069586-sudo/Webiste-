/** Existing worker/services only. Two fixed fictional Stripe orders, owned test hosts, no domain purchase. */
import { createHash } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { getEnv } from '../src/config/env';
import { effectiveSwitches, getConfig } from '../src/config/service';
import { closeDb, getDb } from '../src/db/client';
import { customers, leads, orders, orderPayments, sites } from '../src/db/schema';
import { getProviders } from '../src/providers';
import { stopBoss } from '../src/queue';
import { closeBrowser, withPage } from '../src/render/browser';
import { buildSite, deploySite, liveCheck } from '../src/render/site';
import { audit } from '../src/services/audit';
import { assertNotHalted } from '../src/services/budget';
import { startBillingV4 } from '../src/services/billing-v4';
import { approvePreview, getOnboardingContext, saveOnboarding } from '../src/services/sites';
import { requestCancellationV4 } from '../src/services/tariffs-v4';

const FIXTURES: Record<string, { domain: string; tier: 'basis' | 'care_plus' }> = {
  '4991f35d-0c23-465f-b4b1-0f320d5a5f91': { domain: 'basis-test.seitenwerk.world', tier: 'basis' },
  'c7e74a8b-1b06-4809-8680-951b014919e6': { domain: 'care-test.seitenwerk.world', tier: 'care_plus' },
};
const ROOT_PROJECT = '7660f1ee-1fac-4ce5-aa70-a7a8fa417f52';
const APP_PROJECT = '80e75e2d-3149-49b0-a522-76a172bbd60b';
const apply = process.argv.includes('--apply');
const selected = process.argv.find((arg) => arg.startsWith('--order='))?.slice(8);
const ids = selected ? [selected] : Object.keys(FIXTURES);
const actor = 'test:customer-acceptance';
const hash = (s: string) => createHash('sha256').update(s).digest('hex');
// Only this short-lived process changes providers. No environment/configuration/auto-send changes.
Object.assign(process.env, {
  HOSTING_PROVIDER: 'netlify',
  REGISTRAR_PROVIDER: 'mock',
  PAYMENT_PROVIDER: 'stripe',
  STRIPE_MODE: 'test',
  EMAIL_PROVIDER: 'mock',
  LLM_PROVIDER: 'mock',
});

async function run(orderId: string) {
  const target = FIXTURES[orderId];
  if (!target) throw new Error('Nur die zwei festgelegten eigenen Sandbox-Bestellungen sind zulässig.');
  const env = getEnv(),
    cfg = await getConfig({ fresh: true }),
    db = getDb();
  if (!effectiveSwitches(cfg).dryRun) throw new Error('DRY_RUN=true erforderlich.');
  await assertNotHalted(cfg);
  const order = await db.query.orders.findFirst({ where: eq(orders.id, orderId) });
  const customer = order ? await db.query.customers.findFirst({ where: eq(customers.orderId, orderId) }) : null;
  const lead = order?.leadId ? await db.query.leads.findFirst({ where: eq(leads.id, order.leadId) }) : null;
  const own = cfg.sender.email.toLowerCase();
  if (
    !order ||
    order.status !== 'paid' ||
    order.provider !== 'stripe' ||
    order.paymentMode !== 'test' ||
    order.offerSnapshot?.tier !== target.tier ||
    order.offerSnapshot.billingMode !== 'saved_mandate' ||
    !order.offerSnapshot.consentAt ||
    !/test|fiktiv/i.test(order.customerCompany) ||
    lead?.source !== 'mock' ||
    !customer ||
    order.customerEmail.toLowerCase() !== own ||
    customer.email.toLowerCase() !== own
  )
    throw new Error('Bezahlte fiktive Stripe-Testbestellung mit Tarifzustimmung und eigenem Postfach erforderlich.');
  const site = await db.query.sites.findFirst({ where: eq(sites.customerId, customer.id) });
  if (
    !site ||
    !['onboarding', 'generating', 'preview', 'approved', 'deploying', 'live'].includes(site.status) ||
    (site.hostingProjectId && [ROOT_PROJECT, APP_PROJECT].includes(site.hostingProjectId)) ||
    customer.registrarDomainId
  )
    throw new Error('Testseite fehlt, ist geschützt oder hat bereits eine Registrar-Referenz.');
  if (!apply) {
    console.log(JSON.stringify({ stage: 'fixture_checked', tier: target.tier, domain: target.domain, providerCalls: false }));
    return;
  }
  if (!env.NETLIFY_API_TOKEN || !env.STRIPE_SECRET_KEY?.startsWith('sk_test_'))
    throw new Error('Vorhandene Hosting-/Stripe-Sandbox-Secrets im Worker erforderlich.');
  const owner = await fetch(`https://api.netlify.com/api/v1/sites/${ROOT_PROJECT}`, {
    headers: { authorization: `Bearer ${env.NETLIFY_API_TOKEN}` },
    signal: AbortSignal.timeout(10000),
  });
  if (!owner.ok) throw new Error('Eigene Root-Domain nicht bestätigt.');
  const root = (await owner.json()) as { custom_domain?: string; domain_aliases?: string[] };
  if (![root.custom_domain, ...(root.domain_aliases ?? [])].includes('seitenwerk.world'))
    throw new Error('Eigene Domain ist nicht dem erwarteten Projekt zugeordnet.');
  const before = await fetch('https://seitenwerk.world/', { signal: AbortSignal.timeout(15000) });
  if (!before.ok) throw new Error('Root-Website vor Test nicht erreichbar.');
  const rootHash = hash(await before.text());
  if (getProviders().payment.testMode !== true || getProviders().hosting.name !== 'netlify')
    throw new Error('Tatsächlicher Test-Zahlungsadapter und Netlify-Hosting erforderlich.');

  // Confirm the already-owned parent domain, not a new registration. Never set domainRegisteredAt or registrar IDs.
  await db.transaction(async (tx) => {
    await tx
      .update(customers)
      .set({ domain: target.domain, domainStatus: 'registered', updatedAt: new Date() })
      .where(eq(customers.id, customer.id));
    await tx
      .update(sites)
      .set({ onboardingJson: { ...site.onboardingJson, domain: target.domain }, updatedAt: new Date() })
      .where(eq(sites.id, site.id));
  });
  await audit(db, {
    entity: 'customer',
    entityId: customer.id,
    action: 'existing_test_domain_confirmed',
    actor,
    context: { domain: target.domain, parentOwnershipVerified: true, domainPurchased: false },
  });
  let current = site;
  if (current.status === 'onboarding') {
    const ctx = await getOnboardingContext(customer.accessToken);
    if (ctx.state !== 'form') throw new Error('Test-Onboarding nicht verfügbar.');
    const submitted = await saveOnboarding(
      customer.accessToken,
      {
        ...ctx.data,
        business: { ...ctx.data.business, name: order.customerCompany },
        impressum: {
          ...ctx.data.impressum,
          legalForm: 'Einzelunternehmen',
          owner: 'Alex Sandboxtest',
          company: order.customerCompany,
          register: '',
          registerNumber: '',
          vatId: '',
        },
        privacyText: (
          'FIKTIVER SANDBOX-TEST. Dies ist ein technisch verwendeter Testtext, keine freigegebene Datenschutzerklärung. ' +
          'Die Testseite nimmt keine Anfragen entgegen und stellt keinen realen Betrieb dar. '
        ).repeat(4),
        domain: target.domain,
        confirmed: true,
      },
      { submit: true, enqueueBuild: false, actor },
    );
    if (!submitted.ok)
      throw new Error(`Fiktives Onboarding braucht Prüfung: ${Object.keys(submitted.fieldErrors ?? {}).join(',')}`);
    current = (await db.query.sites.findFirst({ where: eq(sites.id, site.id) }))!;
  }
  if (current.status === 'generating') {
    await buildSite(site.id);
    current = (await db.query.sites.findFirst({ where: eq(sites.id, site.id) }))!;
  }
  if (current.status === 'preview') {
    const approved = await approvePreview(customer.accessToken, { enqueueDeploy: false, actor });
    if (!approved.ok) throw new Error('Fiktive Vorschau konnte nicht bestätigt werden.');
    current = (await db.query.sites.findFirst({ where: eq(sites.id, site.id) }))!;
  }
  if (['approved', 'deploying'].includes(current.status)) {
    console.log(JSON.stringify({ stage: 'publishing', tier: target.tier, domain: target.domain }));
    if ((await deploySite(site.id, actor, { enqueueLiveCheck: false })) !== 'deployed')
      throw new Error('Tatsächliche Veröffentlichung nicht abgeschlossen.');
  }
  const actualSite = (await db.query.sites.findFirst({ where: eq(sites.id, site.id) }))!;
  const actualHtml = actualSite.liveHtmlKey ? await getProviders().storage.get(actualSite.liveHtmlKey) : null;
  if (!actualHtml || !actualSite.hostingProjectId) throw new Error('Veröffentlichter Teststand fehlt.');
  let html = '',
    published = false;
  for (let attempt = 0; attempt < 12; attempt++) {
    const status = await getProviders().hosting.getDomainStatus(actualSite.hostingProjectId, target.domain);
    try {
      const response = await fetch(`https://${target.domain}/`, { redirect: 'manual', signal: AbortSignal.timeout(15000) });
      html = await response.text();
      published = status.active && response.status === 200 && hash(html) === hash(actualHtml.toString('utf8'));
    } catch {
      /* DNS/TLS may still be pending. Never disable certificate verification. */
    }
    if (published) break;
    console.log(JSON.stringify({ stage: 'dns_https_pending', tier: target.tier, attempt }));
    if (attempt < 11) await new Promise((resolve) => setTimeout(resolve, 10000));
  }
  if (!published) throw new Error('DNS/HTTPS oder Live-Prüfung noch offen; kein bestätigter Monatsstart.');
  if (html.includes(customer.accessToken)) throw new Error('Privater Kundenlink im veröffentlichten HTML.');
  await withPage({ width: 390, height: 844, allowNetwork: true }, async (page, context) => {
    await context.route(/^https?:\/\//, (route) =>
      new URL(route.request().url()).hostname === target.domain ? route.continue() : route.abort(),
    );
    await page.goto(`https://${target.domain}/`, { waitUntil: 'networkidle' });
    const checks = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > innerWidth,
      activeSubmit: [...document.querySelectorAll('button[type=submit],input[type=submit]')].some((e) => !e.matches(':disabled')),
      noindex: document.querySelector('meta[name=robots]')?.getAttribute('content')?.includes('noindex'),
    }));
    if (checks.overflow || checks.activeSubmit || !checks.noindex) throw new Error('Sandbox-Mobilansicht braucht Prüfung.');
    await getProviders().storage.put(
      `sites/${site.id}/acceptance-mobile-390.png`,
      await page.screenshot({ fullPage: true }),
      'image/png',
    );
    await page.setViewportSize({ width: 1440, height: 900 });
    if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth))
      throw new Error('Sandbox-Desktopansicht läuft über.');
    await getProviders().storage.put(
      `sites/${site.id}/acceptance-desktop-1440.png`,
      await page.screenshot({ fullPage: true }),
      'image/png',
    );
  });
  const after = await fetch('https://seitenwerk.world/', { signal: AbortSignal.timeout(15000) });
  const rootUnchanged = after.ok && hash(await after.text()) === rootHash;
  if (!rootUnchanged) throw new Error('Root-Website nach Test nicht identisch.');
  // Only now confirm publication through the existing service; it records liveAt and invokes billing.
  const checked = await liveCheck(site.id, 0, { scheduleRetry: false });
  if (!('ok' in checked) || !checked.ok) throw new Error('Normaler Live-Check nicht bestanden.');
  const first = await startBillingV4(orderId, actor),
    second = await startBillingV4(orderId, actor);
  if (!first.id || first.id !== second.id) throw new Error('Monatsabo-ID nicht stabil.');
  let paid = false;
  for (let attempt = 0; attempt < 12; attempt++) {
    const payments = await db.query.orderPayments.findMany({
      where: and(eq(orderPayments.orderId, orderId), eq(orderPayments.provider, 'stripe')),
    });
    paid = payments.some((p) => p.amountCents === order.offerSnapshot!.monthlyCents);
    if (paid) break;
    if (attempt < 11) await new Promise((resolve) => setTimeout(resolve, 5000));
  }
  // Prevent endless fixture renewals using the normal cancellation action, only after the first test payment.
  if (paid) await requestCancellationV4(customer.accessToken, true);
  await audit(db, {
    entity: 'order',
    entityId: orderId,
    action: 'customer_acceptance',
    actor,
    context: {
      domain: target.domain,
      htmlHash: hash(html),
      subscriptionId: first.id,
      monthlyPaymentVerified: paid,
      monthlyCents: order.offerSnapshot.monthlyCents,
      rootUnchanged,
      repeatedStartSameId: true,
      domainPurchased: false,
      screenshotKeys: [`sites/${site.id}/acceptance-mobile-390.png`, `sites/${site.id}/acceptance-desktop-1440.png`],
    },
  });
  console.log(
    JSON.stringify({
      stage: 'result',
      tier: target.tier,
      domain: target.domain,
      subscriptionId: first.id,
      monthlyCents: order.offerSnapshot.monthlyCents,
      monthlyPaymentVerified: paid,
      repeatedStartSameId: true,
      rootUnchanged,
      domainPurchased: false,
      renewalCancelledAtPeriodEnd: paid,
      globalProvidersChanged: false,
    }),
  );
  if (!paid) process.exitCode = 2;
}

try {
  if (apply && process.env.CUSTOMER_ACCEPTANCE_CONFIRM !== 'stripe-sandbox-owned-domain')
    throw new Error('Explizite CUSTOMER_ACCEPTANCE_CONFIRM=stripe-sandbox-owned-domain fehlt.');
  for (const id of ids) await run(id);
} finally {
  await closeBrowser();
  await stopBoss();
  await closeDb();
}
