import { beforeEach, describe, expect, it } from 'vitest';
import { updateConfig } from '../src/config/service';
import { getDb } from '../src/db/client';
import {
  BudgetExceededError,
  KillSwitchError,
  budgetStatus,
  llmCostMicroCents,
  llmReservationCents,
  recordCost,
  releaseReservation,
  reserveBudget,
  settleCost,
} from '../src/services/budget';
import { DEFAULT_CONFIG } from '../src/config/settings';
import { resetDb } from './helpers';

describe('Budget-Guard', () => {
  beforeEach(async () => {
    await resetDb();
    await updateConfig({ budget: { weeklyBudgetCents: 500 } }, 'test');
  });

  it('reserviert bis zum Wochenbudget und stoppt danach', async () => {
    const db = getDb();
    await reserveBudget(db, { category: 'letter', estimateCents: 200, idempotencyKey: 'l1' });
    await reserveBudget(db, { category: 'letter', estimateCents: 200, idempotencyKey: 'l2' });
    await expect(reserveBudget(db, { category: 'letter', estimateCents: 200, idempotencyKey: 'l3' })).rejects.toBeInstanceOf(
      BudgetExceededError,
    );
    const s = await budgetStatus('letter');
    expect(s.spentCents).toBe(400);
    expect(s.remainingCents).toBe(100);
  });

  it('ist idempotent: gleicher Schlüssel reserviert nur einmal', async () => {
    const db = getDb();
    await reserveBudget(db, { category: 'letter', estimateCents: 300, idempotencyKey: 'same' });
    await reserveBudget(db, { category: 'letter', estimateCents: 300, idempotencyKey: 'same' });
    expect((await budgetStatus('letter')).spentCents).toBe(300);
  });

  it('parallele Reservierungen überschreiten das Budget nicht', async () => {
    const db = getDb();
    const results = await Promise.allSettled(
      Array.from({ length: 10 }, (_, i) =>
        reserveBudget(db, { category: 'letter', estimateCents: 100, idempotencyKey: `p${i}` }),
      ),
    );
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(5);
    expect((await budgetStatus('letter')).spentCents).toBe(500);
  });

  it('settle ersetzt Schätzung, release gibt Reservierung frei', async () => {
    const db = getDb();
    await reserveBudget(db, { category: 'letter', estimateCents: 200, idempotencyKey: 'a' });
    await settleCost(db, 'a', 120);
    await reserveBudget(db, { category: 'letter', estimateCents: 200, idempotencyKey: 'b' });
    await releaseReservation(db, 'b');
    expect((await budgetStatus('letter')).spentCents).toBe(120);
  });

  it('Not-Aus blockiert jede Reservierung', async () => {
    await updateConfig({ switches: { killSwitch: true } }, 'test');
    await expect(reserveBudget(getDb(), { category: 'letter', estimateCents: 1, idempotencyKey: 'k' })).rejects.toBeInstanceOf(
      KillSwitchError,
    );
  });

  it('Mikro-Cent-Buchungen werden korrekt summiert', async () => {
    const db = getDb();
    for (let i = 0; i < 10; i++) await recordCost(db, { category: 'llm', amountMicroCents: 250_000, idempotencyKey: `m${i}` });
    expect((await budgetStatus('llm')).spentCents).toBe(3); // 2,5 Cent → gerundet 3
  });

  it('berechnet LLM-Kosten aus Tokens', () => {
    const micro = llmCostMicroCents(DEFAULT_CONFIG, {
      model: 'claude-opus-5-5',
      inputTokens: 1_000_000,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
    });
    // 4 USD → 400 US-Cent × 0,9 = 360 Cent
    expect(micro / 1e6).toBeCloseTo(360, 5);
  });

  it('bucht Haiku 5.5 günstig und über 100K Prompt-Tokens zum teuren Tarif', () => {
    const usage = (inputTokens: number) => ({
      model: 'claude-haiku-5-5',
      inputTokens,
      outputTokens: 10_000,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
    });
    // 50K × 0,10 $ + 10K × 0,50 $ je MTok = 0,5 + 0,5 US-Cent → × 0,9
    expect(llmCostMicroCents(DEFAULT_CONFIG, usage(50_000)) / 1e6).toBeCloseTo(0.9, 5);
    // 200K × 0,50 $ + 10K × 2,50 $ = 10 + 2,5 US-Cent → × 0,9
    expect(llmCostMicroCents(DEFAULT_CONFIG, usage(200_000)) / 1e6).toBeCloseTo(11.25, 5);
  });

  it('reserviert Haiku-Websuche mit dem teuren Tarif für das volle Eingabefenster', () => {
    const cents = llmReservationCents(DEFAULT_CONFIG, {
      model: 'claude-haiku-5-5',
      inputTokens: 1_000_000,
      maxOutputTokens: 6000,
      maxSearches: 8,
    });
    // (1,1M+1024) × 62,5 + 6000 × 250 + 8 × 1000 × 1000 Mikro-Cent, × 0,9 (min. 1) × 1,1 → rund 87 Cent
    expect(cents).toBeGreaterThan(80);
    expect(cents).toBeLessThan(100);
  });
});
