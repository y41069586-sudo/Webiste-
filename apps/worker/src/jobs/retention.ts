import { maintainClaims, refreshFunnel, runRetention } from '@wbm/core';
import { defineJob } from '../runtime';

/** Nachts: Löschfristen umsetzen (Protokoll im Audit-Log). */
defineJob('retention', async () => runRetention());

/** Täglich: Claims-Datei abgleichen, abgelaufene Quellen sperren und melden. */
defineJob('claims', async () => maintainClaims());

/** Halbstündlich: Funnel-Sichten (letter_outcomes, funnel_by_arm) auffrischen. */
defineJob('refresh-funnel', async () => refreshFunnel());
