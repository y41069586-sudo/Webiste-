import { beforeEach, describe, expect, it } from 'vitest';
import { createAdmin, login, logout, validateSession } from '../src/auth/admin';
import { totp } from '../src/auth/totp';
import { decrypt, encrypt } from '../src/util/crypto';
import { resetDb } from './helpers';

describe('Admin-Login mit 2FA', () => {
  beforeEach(resetDb);

  it('Login nur mit Passwort + gültigem TOTP, Session ist prüfbar', async () => {
    const { secret } = await createAdmin('admin@example.com', 'sehr-geheimes-passwort');
    const noTotp = await login({ email: 'admin@example.com', password: 'sehr-geheimes-passwort', totp: '', clientKey: 'c1' });
    expect(noTotp).toEqual({ ok: false, reason: 'totp_required' });
    const wrongPw = await login({ email: 'admin@example.com', password: 'falsch-falsch-falsch', totp: totp(secret), clientKey: 'c1' });
    expect(wrongPw.ok).toBe(false);
    const ok = await login({ email: 'admin@example.com', password: 'sehr-geheimes-passwort', totp: totp(secret), clientKey: 'c1' });
    expect(ok.ok).toBe(true);
    if (!ok.ok) return;
    const s = await validateSession(ok.token);
    expect(s?.email).toBe('admin@example.com');
    await logout(ok.token);
    expect(await validateSession(ok.token)).toBeNull();
  });

  it('derselbe TOTP-Code kann nicht zweimal verwendet werden', async () => {
    const { secret } = await createAdmin('admin@example.com', 'sehr-geheimes-passwort');
    const code = totp(secret);
    const a = await login({ email: 'admin@example.com', password: 'sehr-geheimes-passwort', totp: code, clientKey: 'c2' });
    const b = await login({ email: 'admin@example.com', password: 'sehr-geheimes-passwort', totp: code, clientKey: 'c3' });
    expect(a.ok).toBe(true);
    expect(b.ok).toBe(false);
  });

  it('Rate-Limit nach 5 Fehlversuchen', async () => {
    await createAdmin('admin@example.com', 'sehr-geheimes-passwort');
    for (let i = 0; i < 5; i++) {
      await login({ email: 'admin@example.com', password: 'falsch-falsch-falsch', totp: '123456', clientKey: 'brute' });
    }
    const r = await login({ email: 'admin@example.com', password: 'falsch-falsch-falsch', totp: '123456', clientKey: 'brute' });
    expect(r).toEqual({ ok: false, reason: 'rate_limited' });
  });

  it('kurze Passwörter werden abgelehnt', async () => {
    await expect(createAdmin('a@example.com', 'kurz')).rejects.toThrow();
  });

  it('Verschlüsselung ist umkehrbar und manipulationssicher', () => {
    const enc = encrypt('geheim');
    expect(decrypt(enc)).toBe('geheim');
    const parts = enc.split('.');
    parts[3] = Buffer.from('xxxxxx').toString('base64');
    expect(() => decrypt(parts.join('.'))).toThrow();
  });
});
