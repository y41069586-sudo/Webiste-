import { randomBytes } from 'node:crypto';
import { and, eq, gt, lt } from 'drizzle-orm';
import { getDb, type DbOrTx } from '../db/client';
import { adminSessions, adminUsers } from '../db/schema';
import { audit } from '../services/audit';
import { rateLimit, resetRateLimit } from '../services/rate-limit';
import { decrypt, encrypt, hashPassword, sha256, verifyPassword } from '../util/crypto';
import { generateTotpSecret, otpauthUrl, verifyTotp } from './totp';

export const SESSION_COOKIE = 'wbm_admin';
export const SESSION_HOURS = 12;

export type LoginResult =
  | { ok: true; token: string; adminId: string; expiresAt: Date }
  | { ok: false; reason: 'invalid' | 'rate_limited' | 'totp_required' };

/** Admin anlegen (nur einer vorgesehen). Liefert die otpauth-URL zum Einrichten der 2FA-App. */
export async function createAdmin(
  email: string,
  password: string,
  db: DbOrTx = getDb(),
): Promise<{ adminId: string; otpauth: string; secret: string }> {
  if (password.length < 12) throw new Error('Passwort muss mindestens 12 Zeichen lang sein.');
  const existing = await db.query.adminUsers.findFirst();
  if (existing && existing.email !== email.toLowerCase()) {
    throw new Error('Es existiert bereits ein Admin. Nur ein Admin ist vorgesehen (Passwort zurücksetzen mit --reset).');
  }
  const secret = generateTotpSecret();
  const passwordHash = await hashPassword(password);
  const values = {
    email: email.toLowerCase(),
    passwordHash,
    totpSecretEnc: encrypt(secret),
    totpEnabled: true,
    lastTotpStep: 0,
  };
  let adminId: string;
  if (existing) {
    await db.update(adminUsers).set(values).where(eq(adminUsers.id, existing.id));
    await db.delete(adminSessions).where(eq(adminSessions.adminId, existing.id));
    adminId = existing.id;
  } else {
    const [row] = await db.insert(adminUsers).values(values).returning({ id: adminUsers.id });
    adminId = row!.id;
  }
  await audit(db, { entity: 'admin', entityId: adminId, action: existing ? 'reset' : 'create', actor: 'system' });
  return { adminId, otpauth: otpauthUrl(secret, email.toLowerCase()), secret };
}

/**
 * Login mit Passwort + TOTP. Rate-Limit: 5 Versuche / 15 Minuten je Client-Hash
 * und 20 / Stunde global für das Konto.
 */
export async function login(
  input: { email: string; password: string; totp: string; clientKey: string },
  db: DbOrTx = getDb(),
): Promise<LoginResult> {
  const perClient = await rateLimit(db, `login:client:${input.clientKey}`, 5, 15 * 60);
  const perAccount = await rateLimit(db, `login:account`, 20, 60 * 60);
  if (!perClient.allowed || !perAccount.allowed) return { ok: false, reason: 'rate_limited' };

  const admin = await db.query.adminUsers.findFirst({ where: eq(adminUsers.email, input.email.trim().toLowerCase()) });
  // Immer Passwort prüfen (gleichmäßige Laufzeit, kein Nutzer-Enumeration)
  const pwOk = await verifyPassword(input.password, admin?.passwordHash ?? 'scrypt$32768$8$1$AAAA$AAAA');
  if (!admin || !pwOk) {
    await audit(db, { entity: 'admin', entityId: admin?.id ?? 'unknown', action: 'login_failed', actor: 'public:login' });
    return { ok: false, reason: 'invalid' };
  }
  if (!input.totp) return { ok: false, reason: 'totp_required' };
  const step = verifyTotp(decrypt(admin.totpSecretEnc), input.totp, admin.lastTotpStep);
  if (step === null) {
    await audit(db, { entity: 'admin', entityId: admin.id, action: 'login_failed_totp', actor: 'public:login' });
    return { ok: false, reason: 'invalid' };
  }

  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_HOURS * 3600 * 1000);
  await db.update(adminUsers).set({ lastTotpStep: step, lastLoginAt: new Date() }).where(eq(adminUsers.id, admin.id));
  await db.insert(adminSessions).values({ id: sha256(token), adminId: admin.id, expiresAt });
  await db.delete(adminSessions).where(lt(adminSessions.expiresAt, new Date()));
  await resetRateLimit(db, `login:client:${input.clientKey}`);
  await audit(db, { entity: 'admin', entityId: admin.id, action: 'login', actor: `admin:${admin.id}` });
  return { ok: true, token, adminId: admin.id, expiresAt };
}

export interface AdminSession {
  adminId: string;
  email: string;
  expiresAt: Date;
}

export async function validateSession(token: string | undefined, db: DbOrTx = getDb()): Promise<AdminSession | null> {
  if (!token || token.length < 20) return null;
  const id = sha256(token);
  const row = await db
    .select({ adminId: adminSessions.adminId, expiresAt: adminSessions.expiresAt, email: adminUsers.email, lastSeenAt: adminSessions.lastSeenAt })
    .from(adminSessions)
    .innerJoin(adminUsers, eq(adminUsers.id, adminSessions.adminId))
    .where(and(eq(adminSessions.id, id), gt(adminSessions.expiresAt, new Date())))
    .limit(1);
  const s = row[0];
  if (!s) return null;
  if (Date.now() - s.lastSeenAt.getTime() > 60_000) {
    await db.update(adminSessions).set({ lastSeenAt: new Date() }).where(eq(adminSessions.id, id));
  }
  return { adminId: s.adminId, email: s.email, expiresAt: s.expiresAt };
}

export async function logout(token: string | undefined, db: DbOrTx = getDb()): Promise<void> {
  if (!token) return;
  await db.delete(adminSessions).where(eq(adminSessions.id, sha256(token)));
}
