import { maintainClaims, refreshFunnel, runRetention, runSafetyNets } from '@wbm/core';
import { defineJob } from '../runtime';

/** Nachts: Löschfristen umsetzen (Protokoll im Audit-Log). */
defineJob('retention', async () => runRetention());

/** Täglich: Claims-Datei abgleichen, abgelaufene Quellen sperren und melden. */
defineJob('claims', async () => maintainClaims());

/** Halbstündlich: Funnel-Sichten (letter_outcomes, funnel_by_arm) auffrischen, danach Sicherheitsnetze (B6.7). */
defineJob('refresh-funnel', async () => {
  await refreshFunnel();
  const actions = await runSafetyNets();
  return { safetyActions: actions.map((a) => a.key) };
});
