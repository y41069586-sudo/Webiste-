import { describe, expect, it } from 'vitest';
import { serverlessPoolerUrl } from '../src/db/client';

const session = 'postgresql://user.ref:geheim@aws-1-eu-central-1.pooler.supabase.com:5432/postgres?sslmode=require';

describe('Datenbank-Pooler für Serverfunktionen', () => {
  it('leitet Serverfunktionen auf den Transaction-Pooler (6543), Zugangsdaten bleiben gleich', () => {
    const u = new URL(serverlessPoolerUrl(session, { NETLIFY: 'true' }));
    expect(u.port).toBe('6543');
    expect(u.username).toBe('user.ref');
    expect(u.password).toBe('geheim');
    expect(u.hostname).toBe('aws-1-eu-central-1.pooler.supabase.com');
    expect(u.searchParams.get('sslmode')).toBe('require');
  });
  it('lässt Worker, andere Hosts und ausdrücklich abgeschaltete Umleitung unverändert', () => {
    expect(serverlessPoolerUrl(session, {})).toBe(session);
    expect(serverlessPoolerUrl(session, { NETLIFY: 'true', DB_SERVERLESS_TRANSACTION_POOLER: 'false' })).toBe(session);
    const direct = 'postgresql://postgres:x@db.abc.supabase.co:5432/postgres';
    expect(serverlessPoolerUrl(direct, { AWS_LAMBDA_FUNCTION_NAME: 'f' })).toBe(direct);
    const tx = session.replace(':5432', ':6543');
    expect(serverlessPoolerUrl(tx, { NETLIFY: 'true' })).toBe(tx);
  });
});
