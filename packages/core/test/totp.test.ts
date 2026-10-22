import { describe, expect, it } from 'vitest';
import { base32Decode, base32Encode, hotp, totp, verifyTotp } from '../src/auth/totp';

describe('TOTP (RFC 6238)', () => {
  // RFC 4226 Anhang D: Secret "12345678901234567890"
  const secret = base32Encode(Buffer.from('12345678901234567890'));

  it('liefert die HOTP-Testvektoren aus RFC 4226', () => {
    const expected = ['755224', '287082', '359152', '969429', '338314', '254676', '287922', '162583', '399871', '520489'];
    expected.forEach((code, i) => expect(hotp(secret, i)).toBe(code));
  });

  it('Base32 ist umkehrbar', () => {
    const buf = Buffer.from('hallo welt 123');
    expect(base32Decode(base32Encode(buf)).toString()).toBe('hallo welt 123');
  });

  it('akzeptiert aktuellen Code und lehnt Wiederverwendung ab', () => {
    const now = Date.now();
    const code = totp(secret, now);
    const step = verifyTotp(secret, code, 0, now);
    expect(step).not.toBeNull();
    expect(verifyTotp(secret, code, step!, now)).toBeNull();
  });

  it('lehnt falsche und alte Codes ab', () => {
    const now = Date.now();
    expect(verifyTotp(secret, '000000', 0, now)).toBeNull();
    const old = totp(secret, now - 5 * 60_000);
    expect(verifyTotp(secret, old, 0, now)).toBeNull();
  });
});
