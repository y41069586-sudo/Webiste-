import { findLeads, getConfig, SearchProgressReporter } from '@wbm/core';
import { defineJob } from '../runtime';

defineJob('find-leads', async (data, ctx) => {
  // Wöchentlicher Lauf (Cron ohne Auslöser) nur, solange er in den Einstellungen aktiv ist
  const weekly = !data.triggeredBy;
  const cfg = await getConfig();
  if (weekly && !cfg.segments.weeklyLeadFinder) return { skipped: 'weeklyLeadFinder aus' };
  const minScore = data.minScore ?? cfg.filters.minLeadScore;
  // Live-Fortschritt für die Verwaltung (Akquise → Lead-Suche)
  const progress = new SearchProgressReporter({
    runId: ctx.jobId,
    cities: data.cities?.length ? data.cities : cfg.targeting.cities,
    branches: data.branches ?? [],
    minScore,
  });
  await progress.flush(true);
  try {
    const summary = await findLeads({
      cities: data.cities,
      branches: data.branches,
      minScore,
      actor: `job:find-leads:${data.triggeredBy ?? 'weekly'}`,
      progress,
    });
    await progress.finish(
      summary.stopped ? 'gestoppt' : 'fertig',
      summary.stopped
        ? `Gestoppt nach ${progress.state.counts.checked} von ${summary.found} Treffern`
        : `Fertig: ${summary.found} Treffer, ${summary.qualified + summary.needsReview} übernommen`,
    );
    ctx.log.info(
      { found: summary.found, qualified: summary.qualified, rejected: summary.rejected, costCents: summary.costCents },
      'find-leads',
    );
    return summary;
  } catch (err) {
    await progress.finish('fehler', 'Suche abgebrochen', err instanceof Error ? err.message : String(err));
    throw err;
  }
});
