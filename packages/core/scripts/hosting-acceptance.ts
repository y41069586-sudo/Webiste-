/** Existing worker only. Publishes one fictional, inert preview to the fixed owned TEST subdomain. */
import { createHash } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { getEnv } from '../src/config/env';
import { effectiveSwitches, getConfig } from '../src/config/service';
import { closeDb, getDb } from '../src/db/client';
import { customers, leads, orders, sites } from '../src/db/schema';
import { getProviders } from '../src/providers';
import { NetlifyHosting } from '../src/providers/hosting/netlify';
import { closeBrowser, withPage } from '../src/render/browser';
import { assertNotHalted } from '../src/services/budget';
import { audit } from '../src/services/audit';

const HOST = 'test.seitenwerk.world';
const APP_PROJECT = '80e75e2d-3149-49b0-a522-76a172bbd60b';
const ROOT_PROJECT = '7660f1ee-1fac-4ce5-aa70-a7a8fa417f52';
const PROJECT_NAME = 'seitenwerk-hosting-test-80e75e2d';
const hash = (data: string | Buffer) => createHash('sha256').update(data).digest('hex');
const apply = process.argv.includes('--apply');
const orderId = process.argv.find((arg) => arg.startsWith('--order='))?.slice(8);

async function main() {
  if (!orderId || !/^[a-f0-9-]{36}$/.test(orderId)) throw new Error('--order=<fiktive Testbestellung> fehlt.');
  if (apply && process.env.HOSTING_ACCEPTANCE_CONFIRM !== HOST)
    throw new Error('Explizite HOSTING_ACCEPTANCE_CONFIRM=test.seitenwerk.world fehlt.');
  const env = getEnv();
  const cfg = await getConfig({ fresh: true });
  if (!effectiveSwitches(cfg).dryRun) throw new Error('Dieser Probelauf erfordert DRY_RUN=true.');
  await assertNotHalted(cfg);
  const db = getDb();
  const order = await db.query.orders.findFirst({ where: eq(orders.id, orderId) });
  const customer = order ? await db.query.customers.findFirst({ where: eq(customers.orderId, order.id) }) : null;
  const lead = order?.leadId ? await db.query.leads.findFirst({ where: eq(leads.id, order.leadId) }) : null;
  if (order?.paymentMode !== 'test' || order.provider !== 'stripe' || order.status !== 'paid' || lead?.source !== 'mock')
    throw new Error('Nur ausdrücklich fiktive, bezahlte Stripe-Sandbox-Bestellungen zulässig.');
  if (!customer || customer.email.toLowerCase() !== cfg.sender.email.toLowerCase())
    throw new Error('Der Testempfänger muss die eigene bestätigte Absenderadresse sein.');
  const site = await db.query.sites.findFirst({ where: eq(sites.customerId, customer.id) });
  if (!site?.previewHtmlKey || !site.onboardingSubmittedAt || site.status !== 'preview')
    throw new Error('Abgeschlossenes Test-Onboarding und fertige private Vorschau erforderlich.');
  const data = await getProviders().storage.get(site.previewHtmlKey);
  if (!data) throw new Error('Tatsächliche Vorschau fehlt im Speicher.');
  const html = data.toString('utf8');
  if (html.includes(customer.accessToken) || /\/(?:onboarding|preview)\/[A-Za-z0-9_-]{16,}/.test(html))
    throw new Error('Private Zugangslinks dürfen nicht veröffentlicht werden.');
  if (!/name=["']robots["'][^>]*noindex/i.test(html) || !/fiktiv/i.test(html))
    throw new Error('Testkennzeichnung und noindex fehlen.');
  await withPage({ width: 390, height: 844 }, async (page) => {
    await page.setContent(html);
    const unsafe = await page.evaluate(() => ({
      activeSubmit: Array.from(document.querySelectorAll('form button,form input')).some(
        (e) => (e as HTMLInputElement).type === 'submit' && !e.matches(':disabled'),
      ),
      localAssets: Array.from(document.querySelectorAll('img[src],link[href]')).some((e) => {
        const value = e.getAttribute('src') ?? e.getAttribute('href') ?? '';
        return !/^(?:data:|https:|#)/.test(value);
      }),
      overflow: document.documentElement.scrollWidth > innerWidth,
    }));
    if (unsafe.activeSubmit || unsafe.localAssets || unsafe.overflow)
      throw new Error('Vorschau braucht Prüfung: Formular, lokale Assets oder Mobilüberlauf.');
  });
  if (!env.NETLIFY_API_TOKEN) throw new Error('Hosting-Secret fehlt im Worker. Regulär mit NEU=1 übernehmen.');
  if (!apply) {
    console.log(JSON.stringify({ stage: 'fixture_checked', domain: HOST, providerCalls: false, sourceHtmlHash: hash(html) }));
    return;
  }
  const ownerCheck = await fetch(`https://api.netlify.com/api/v1/sites/${ROOT_PROJECT}`, {
    headers: { authorization: `Bearer ${env.NETLIFY_API_TOKEN}` },
    signal: AbortSignal.timeout(10000),
  });
  if (!ownerCheck.ok) throw new Error(`Bestehende Domain-Zuordnung nicht lesbar: HTTP ${ownerCheck.status}`);
  const owner = (await ownerCheck.json()) as { custom_domain?: string; domain_aliases?: string[] };
  if (![owner.custom_domain, ...(owner.domain_aliases ?? [])].includes('seitenwerk.world'))
    throw new Error('Bestehende Root-Domain ist nicht dem erwarteten Projekt zugeordnet.');
  const rootBefore = await fetch('https://seitenwerk.world/', { signal: AbortSignal.timeout(10000) });
  if (!rootBefore.ok) throw new Error('Firmenwebsite vor dem Test nicht erreichbar.');
  const rootHash = hash(await rootBefore.text());
  const hosting = new NetlifyHosting({ apiToken: env.NETLIFY_API_TOKEN, formOrigin: env.APP_URL });
  const project = await hosting.ensureProject(PROJECT_NAME);
  if ([APP_PROJECT, ROOT_PROJECT].includes(project.projectId))
    throw new Error('Bestehende produktive Projekte bleiben geschützt.');
  const deployment = await hosting.deploy(project.projectId, [
    { path: 'index.html', content: html, contentType: 'text/html; charset=utf-8' },
    { path: 'robots.txt', content: 'User-agent: *\nDisallow: /\n', contentType: 'text/plain' },
  ]);
  await hosting.attachDomain(project.projectId, HOST);
  console.log(JSON.stringify({ stage: 'test_deployed', domain: HOST, deploymentId: deployment.deploymentId }));
  let verified = false;
  for (let attempt = 1; attempt <= 12; attempt++) {
    await hosting.getDomainStatus(project.projectId, HOST);
    try {
      const response = await fetch(`https://${HOST}/`, { redirect: 'manual', signal: AbortSignal.timeout(10000) });
      verified = response.status === 200 && hash(await response.text()) === hash(html);
    } catch {
      /* DNS / certificate may still be pending; no TLS bypass. */
    }
    if (verified) break;
    console.log(JSON.stringify({ stage: 'dns_tls_pending', attempt }));
    if (attempt < 12) await new Promise((resolve) => setTimeout(resolve, 10000));
  }
  const rootAfter = await fetch('https://seitenwerk.world/', { signal: AbortSignal.timeout(10000) });
  const rootUnchanged = rootAfter.ok && hash(await rootAfter.text()) === rootHash;
  await audit(db, {
    entity: 'site',
    entityId: site.id,
    action: 'hosting_acceptance',
    actor: 'test:hosting-acceptance',
    context: {
      domain: HOST,
      projectId: project.projectId,
      deploymentId: deployment.deploymentId,
      htmlHash: hash(html),
      httpsContentVerified: verified,
      rootUnchanged,
    },
  });
  console.log(
    JSON.stringify({
      stage: 'result',
      httpsContentVerified: verified,
      rootUnchanged,
      domain: HOST,
      appCustomerGoLiveChanged: false,
      subscriptionStarted: false,
      domainPurchased: false,
    }),
  );
  if (!verified || !rootUnchanged) process.exitCode = 2;
}

try {
  await main();
} finally {
  await closeBrowser();
  await closeDb();
}
