/** Read-only environment assessment. Presence is not a successful provider connection or release. */
import { assertSameQueueDatabase, assertQueueConnection } from '../queue-config';
export interface OperationsCheck {
  key: string;
  status: 'verified' | 'blocked';
  next: string;
}
export function operationsPreflight(raw: Record<string, string | undefined>): OperationsCheck[] {
  const checks: OperationsCheck[] = [];
  const check = (key: string, ok: boolean, next: string) =>
    checks.push({
      key,
      status: ok ? 'verified' : 'blocked',
      next: ok ? 'Konfiguration vorhanden; tatsächliche Abnahme separat.' : next,
    });
  const on = (key: string) => /^(true|1|yes|on)$/i.test(raw[key] ?? '');
  check('dry-run', on('DRY_RUN'), 'DRY_RUN ausdrücklich auf true setzen.');
  check(
    'automatic-actions',
    !['AUTO_SEND', 'AUTO_REPLY', 'AUTO_OPTIMIZE', 'AUTO_ACTIVATE_VARIANTS', 'ALLOW_REAL_LETTERS'].some(on),
    'Automatische Echtweltaktionen vor dem Test deaktivieren.',
  );
  for (const key of ['APP_URL', 'DEMO_DOMAIN', 'TRACK_DOMAIN']) {
    let valid = false;
    try {
      const url = new URL(key === 'APP_URL' || raw[key]?.includes('://') ? raw[key]! : `https://${raw[key] ?? ''}`);
      valid =
        Boolean(raw[key]?.trim()) &&
        url.protocol === 'https:' &&
        !url.username &&
        !url.password &&
        !url.search &&
        !url.hash &&
        !/(^|\.)(localhost|example\.(com|test|org)|invalid)$/.test(url.hostname) &&
        !/^127\.|^\[?::1/.test(url.hostname) &&
        !url.hostname.includes('_');
    } catch {
      /* Missing or malformed public URL stays blocked. */
    }
    check(
      key,
      valid,
      `${key} mit der vorgesehenen HTTPS-App-/Demo-/Trackingadresse konfigurieren; DNS und Route getrennt prüfen.`,
    );
  }
  let queue = false;
  try {
    if (raw.DATABASE_URL) {
      const url = raw.QUEUE_DATABASE_URL || raw.DATABASE_URL;
      assertSameQueueDatabase(raw.DATABASE_URL, url);
      assertQueueConnection(url, { migrate: false, supervise: true, schedule: true });
      queue = true;
    }
  } catch {
    /* Never emit connection strings or credentials in a public report. */
  }
  check('queue-target', queue, 'App und Worker auf dieselbe DB setzen; Supabase Direct oder Session5432 für den Worker.');
  check(
    'migration-switches',
    raw.RUN_MIGRATIONS === 'false' && raw.BOSS_MIGRATE === 'false' && raw.BOSS_CREATE_QUEUES === 'false',
    'Automatische Migrationen und Queue-Anlage deaktivieren; freigegebene Migration separat ausführen.',
  );
  const present = (...keys: string[]) => keys.every((k) => Boolean(raw[k]?.trim()));
  check(
    'private-storage',
    raw.STORAGE_DRIVER === 's3' && present('S3_ENDPOINT', 'S3_REGION', 'S3_BUCKET', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY'),
    'Vorhandene private S3-Zugangsdaten sicher in die Worker-Laufzeit übernehmen; keine neuen Schlüssel im Chat ausgeben.',
  );
  check(
    'anthropic',
    raw.LLM_PROVIDER === 'anthropic' && present('ANTHROPIC_API_KEY'),
    'Anthropic-Schlüssel sicher in der Laufzeit hinterlegen; begrenzten Text-/Bildtest mit Kostenprüfung freigeben.',
  );
  check(
    'lead-source',
    raw.LEAD_SOURCE === 'osm',
    'Bestehenden OSM-Adapter nach Quellenprüfung aktivieren; individuelle Website-/Bedarfsrecherche bleibt gesondert.',
  );
  check(
    'stripe-sandbox',
    raw.PAYMENT_PROVIDER === 'stripe' && /^(sk|rk)_test_/.test(raw.STRIPE_SECRET_KEY ?? '') && present('STRIPE_WEBHOOK_SECRET'),
    'Vorhandenen Sandbox-Key und Signatursecret des dynamischen App-Webhooks sicher hinterlegen; vollständigen Sandbox-Ablauf abnehmen.',
  );
  check(
    'letterxpress-test',
    raw.MAIL_PROVIDER === 'letterxpress' && raw.LXP_MODE === 'test' && present('LXP_USERNAME', 'LXP_APIKEY'),
    'LetterXpress-Testzugang sicher bereitstellen; kein Auftrag durch diesen Check.',
  );
  check(
    'resend',
    raw.EMAIL_PROVIDER === 'resend' && present('EMAIL_API_KEY', 'EMAIL_FROM') && !/example\./i.test(raw.EMAIL_FROM ?? ''),
    'Bestehenden Resend-Key und verifizierten Absender in die Laufzeit übernehmen; eigenen Nachrichtenfluss getrennt prüfen.',
  );
  return checks;
}
