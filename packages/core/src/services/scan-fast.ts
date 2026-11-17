import { and, eq, gt, inArray, isNotNull, isNull, sql } from 'drizzle-orm';
import { appUrl, getEnv } from '../config/env';
import { getDb } from '../db/client';
import { demos, leads, letters } from '../db/schema';
import { logger } from '../logger';
import { currentDemoForLead } from './demo-review';

/**
 * Schnelle QR-Strecke (17.11.2026): Ein Scan soll nie auf den Kaltstart der Serverfunktion warten (bis 11 s).
 * - Der Pförtner (Netlify Edge Function, apps/web/netlify/edge-functions/qr-pfoertner.ts) fragt das Ziel über
 *   /qz/{t|k}/{id} ab. Diese Antwort liegt im Netlify-Zwischenspeicher (durable), sodass keine Funktion startet.
 * - Die Demo /d/{slug} liegt ebenso im Zwischenspeicher.
 * - Gezählt wird der Scan wie bisher von /q/{token} bzw. /{kurzcode}; der Pförtner ruft das im Hintergrund auf.
 * - Der Worker ruft beides täglich vorab auf, damit nie ein Betrieb der erste Besucher ist.
 */

const DAY = 86_400;
/** Längste Haltedauer im Zwischenspeicher (Demos laufen ohnehin höchstens ~30 Tage). */
const MAX_TTL = 35 * DAY;

/** Ziel eines gültigen QR-Tokens – gleiche Regeln wie handleScan (ohne Zählung). */
export async function scanTargetSlug(token: string, now = new Date()): Promise<{ slug: string; expiresAt: Date | null } | null> {
  if (!/^[A-Za-z0-9]{16,64}$/.test(token)) return null;
  const db = getDb();
  const lead = await db.query.leads.findFirst({ where: eq(leads.trackToken, token) });
  if (!lead || lead.status === 'suppressed') return null;
  const demo = await currentDemoForLead(db, lead.id);
  if (!demo || demo.deletedAt || (demo.expiresAt && demo.expiresAt < now)) return null;
  return { slug: demo.slug, expiresAt: demo.expiresAt ?? null };
}

/** Sekunden bis zum Ablauf (0, wenn abgelaufen), höchstens MAX_TTL. */
export function secondsUntil(expiresAt: Date | null | undefined, now = new Date()): number {
  if (!expiresAt) return 7 * DAY;
  return Math.max(0, Math.min(MAX_TTL, Math.floor((expiresAt.getTime() - now.getTime()) / 1000)));
}

/**
 * Netlify-Zwischenspeicher für eine öffentliche Demo-Antwort. Browser speichern nicht (private, no-store bleibt),
 * nur Netlifys CDN. `fresh` = so lange gilt die Antwort als frisch; danach wird sie bis zum Ablauf sofort ausgeliefert
 * und im Hintergrund erneuert. Netlify-Cache-ID: Veröffentlichungen leeren den Speicher nicht.
 * Leer, wenn die Demo schon abgelaufen ist (dann nichts speichern).
 */
export function demoCdnHeaders(
  slug: string,
  expiresAt: Date | null | undefined,
  opts: { fresh?: number; vary?: string; now?: Date } = {},
): Record<string, string> {
  const remaining = secondsUntil(expiresAt, opts.now);
  if (remaining < 60) return {};
  const fresh = Math.min(opts.fresh ?? DAY, remaining);
  const swr = Math.max(0, remaining - fresh);
  const tag = `demo-${slug}`;
  return {
    'netlify-cdn-cache-control': `public, durable, s-maxage=${fresh}${swr ? `, stale-while-revalidate=${swr}` : ''}`,
    'netlify-cache-tag': tag,
    'netlify-cache-id': tag,
    ...(opts.vary ? { 'netlify-vary': opts.vary } : {}),
  };
}

/**
 * Gespeicherte Antworten einer Demo bei Netlify sofort verwerfen (z. B. „Kein Interesse“). Nur innerhalb der
 * Netlify-Funktion verfügbar (NETLIFY_PURGE_API_TOKEN, SITE_ID werden dort gesetzt); sonst ohne Wirkung.
 * Gibt zurück, ob der Auftrag angenommen wurde.
 */
export async function purgeDemoCache(slug: string, fetchFn: typeof fetch = fetch): Promise<boolean> {
  const token = process.env.NETLIFY_PURGE_API_TOKEN;
  const siteId = process.env.SITE_ID;
  if (!token || !siteId || !/^[A-Za-z0-9]{8,64}$/.test(slug)) return false;
  try {
    const res = await fetchFn('https://api.netlify.com/api/v1/purge', {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ site_id: siteId, cache_tags: [`demo-${slug}`] }),
      signal: AbortSignal.timeout(5000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Kurz-URLs und QR-Ziele, die gerade auf Briefen unterwegs sind und deren Demo noch online ist. */
export async function activeScanTargets(now = new Date()) {
  const db = getDb();
  return db
    .selectDistinct({ token: leads.trackToken, code: leads.shortCode, slug: demos.slug })
    .from(leads)
    .innerJoin(letters, eq(letters.leadId, leads.id))
    .innerJoin(demos, and(eq(demos.leadId, leads.id), eq(demos.status, 'published')))
    .where(
      and(
        inArray(letters.status, ['approved', 'queued', 'sent', 'delivered']),
        isNotNull(leads.trackToken),
        sql`${leads.status} <> 'suppressed'`,
        isNull(demos.deletedAt),
        gt(demos.expiresAt, now),
      ),
    )
    .limit(1000);
}

/** Antwort holen, ohne den Inhalt zu laden (spart Bandbreite); liefert Status und Cache-Status. */
async function touch(url: string, fetchFn: typeof fetch): Promise<{ status: number; cache: string }> {
  const res = await fetchFn(url, {
    redirect: 'manual',
    headers: { 'user-agent': 'SeitenWerk-Vorabruf bot' },
    signal: AbortSignal.timeout(30_000),
  });
  const cache = res.headers.get('cache-status') ?? '';
  await res.body?.cancel().catch(() => undefined);
  return { status: res.status, cache };
}

/**
 * Vorab-Aufruf (Worker, täglich und beim Start): Ziel-Abfrage und Demo jedes aktiven QR-Codes einmal aufrufen,
 * damit sie im Netlify-Zwischenspeicher liegen. Zählt nie als Scan oder Aufruf (Bot-Kennung, kein /q).
 */
export async function warmScanTargets(
  fetchFn: typeof fetch = fetch,
): Promise<{ targets: number; warmed: number; failed: number }> {
  const base = appUrl('');
  if (!base.startsWith('https://')) return { targets: 0, warmed: 0, failed: 0 };
  const rows = await activeScanTargets();
  let warmed = 0;
  let failed = 0;
  for (const r of rows) {
    const urls = [`${base}/qz/t/${r.token}`, `${base}/d/${r.slug}?start=1`];
    if (r.code) urls.push(`${base}/qz/k/${r.code}`);
    for (const u of urls) {
      try {
        const { status } = await touch(u, fetchFn);
        if (status >= 200 && status < 300) warmed++;
        else failed++;
      } catch {
        failed++;
      }
    }
  }
  if (failed) logger.warn({ targets: rows.length, warmed, failed }, 'Vorab-Aufruf: nicht alle QR-Ziele erreichbar');
  return { targets: rows.length, warmed, failed };
}

/** Startet den Vorab-Aufruf im Worker: 2 Minuten nach dem Start, danach alle SCAN_WARMUP_HOURS Stunden. */
export function startScanWarmup(fetchFn: typeof fetch = fetch): () => void {
  const hours = getEnv().SCAN_WARMUP_HOURS;
  if (!hours || !appUrl('').startsWith('https://')) return () => undefined;
  const run = () =>
    void warmScanTargets(fetchFn)
      .then((r) => logger.info(r, 'Vorab-Aufruf der QR-Ziele'))
      .catch((err) => logger.warn({ err: err instanceof Error ? err.message : String(err) }, 'Vorab-Aufruf fehlgeschlagen'));
  const first = setTimeout(run, 2 * 60_000);
  const timer = setInterval(run, hours * 3_600_000);
  first.unref();
  timer.unref();
  return () => {
    clearTimeout(first);
    clearInterval(timer);
  };
}
