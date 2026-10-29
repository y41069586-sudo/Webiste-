import { expect, test } from '@playwright/test';
import { loginAsAdmin } from './helpers';

/** Mikrofon und Stimme werden im Testbrowser simuliert: `__say(text)` spricht zu Jarvis, `__spoken` sammelt seine Sätze. */
const FAKE_SPEECH = () => {
  const w = window as unknown as Record<string, unknown>;
  const spoken: string[] = [];
  w.__spoken = spoken;
  let active: { onresult?: (e: unknown) => void; onend?: () => void } | null = null;
  class FakeRecognition {
    lang = 'de-DE';
    continuous = false;
    interimResults = false;
    onresult: ((e: unknown) => void) | null = null;
    onend: (() => void) | null = null;
    onerror: ((e: unknown) => void) | null = null;
    start() {
      active = this as never;
    }
    stop() {
      this.abort();
    }
    abort() {
      if (active === (this as never)) active = null;
      setTimeout(() => this.onend?.(), 0);
    }
  }
  w.webkitSpeechRecognition = FakeRecognition;
  w.SpeechRecognition = FakeRecognition;
  w.__say = (text: string) => {
    active?.onresult?.({ resultIndex: 0, results: [{ isFinal: true, 0: { transcript: text }, length: 1 }] });
  };
  const synth = window.speechSynthesis;
  synth.speak = (u: SpeechSynthesisUtterance) => {
    spoken.push(u.text);
    setTimeout(() => u.onend?.(new Event('end') as SpeechSynthesisEvent), 10);
  };
  synth.cancel = () => {};
};

test('Jarvis: Weckwort, Begrüßung, gesprochene Antwort', async ({ page }) => {
  await page.addInitScript(FAKE_SPEECH);
  await loginAsAdmin(page);
  await page.goto('/admin');
  const fab = page.getByRole('button', { name: 'Jarvis starten' });
  await expect(fab).toBeVisible();
  await fab.click();
  const panel = page.getByRole('dialog', { name: 'Jarvis' });
  await expect(panel).toBeVisible();
  await expect.poll(() => page.evaluate(() => (window as unknown as { __spoken: string[] }).__spoken[0] ?? '')).toMatch(/^Sers/);
  // Dauer-Zuhören an, dann mit Weckwort fragen
  await panel.getByRole('button', { name: /Immer zuhören/ }).click();
  await panel.getByRole('button', { name: 'Schließen' }).click();
  await page.evaluate(() => (window as unknown as { __say: (t: string) => void }).__say('Sers Jarvis wie viele Leads gibt es'));
  await expect(page.getByRole('dialog', { name: 'Jarvis' })).toBeVisible();
  await expect(page.locator('.jarvis-heard')).toContainText('wie viele Leads');
  await expect(page.locator('.jarvis-answer')).not.toBeEmpty({ timeout: 30_000 });
  await expect.poll(() => page.evaluate(() => (window as unknown as { __spoken: string[] }).__spoken.length)).toBeGreaterThan(1);
});
