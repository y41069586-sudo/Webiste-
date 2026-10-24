import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { test } from 'node:test';
import { verifyResendEvent, readResendInbound } from '../apps/web/src/lib/resend-inbound';
const secret = `whsec_${Buffer.alloc(32, 7).toString('base64')}`;
function signed(raw: string, timestamp = Math.floor(Date.now() / 1000)) {
  const id = 'msg_unit_test';
  const signature = createHmac('sha256', Buffer.alloc(32, 7)).update(`${id}.${timestamp}.${raw}`).digest('base64');
  return new Headers({ 'svix-id': id, 'svix-timestamp': String(timestamp), 'svix-signature': `v1,${signature}` });
}
const event = {
  type: 'inbox.email.received' as const,
  created_at: new Date().toISOString(),
  data: { source: 'api' as const, inbox_id: 'inbox-test', thread_id: 'thread-test', email_id: 'email-test' },
};

test('signed payload accepted; tampering and stale timestamps rejected', () => {
  const oldKey = process.env.RESEND_API_KEY;
  process.env.RESEND_API_KEY = 're_unit_test_only';
  try {
    const raw = JSON.stringify(event);
    assert.equal(verifyResendEvent(raw, signed(raw), secret).type, 'inbox.email.received');
    assert.throws(() => verifyResendEvent(raw + ' ', signed(raw), secret));
    assert.throws(() => verifyResendEvent(raw, signed(raw, Math.floor(Date.now() / 1000) - 1000), secret));
  } finally {
    if (oldKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = oldKey;
  }
});

test('different inbox is ignored before a provider API request', async () => {
  assert.equal(await readResendInbound(event, 're_unit_test_only', 'different-inbox', 'support@example.test'), null);
});

test('API-fetched text and stable Message-ID used; HTML and attachments excluded', async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () =>
      Response.json({
        id: 'email-test',
        direction: 'inbound',
        from: 'sender@example.test',
        to: ['support@example.test'],
        subject: 'Question',
        text: 'Untrusted message',
        html: '<script>unsafe</script>',
        message_id: '<stable-id>',
        received_at: new Date().toISOString(),
        attachments: [],
      });
    const mail = await readResendInbound(event, 're_unit_test_only', 'inbox-test', 'support@example.test');
    assert.equal(mail?.text, 'Untrusted message');
    assert.equal(mail?.providerMessageId, '<stable-id>');
    assert.ok(!('html' in mail!));
    assert.equal(await readResendInbound(event, 're_unit_test_only', 'inbox-test', 'different@example.test'), null);
  } finally {
    globalThis.fetch = original;
  }
});
