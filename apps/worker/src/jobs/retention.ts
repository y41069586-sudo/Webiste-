import { runRetention } from '@wbm/core';
import { defineJob } from '../runtime';

/** Nachts: Löschfristen umsetzen (Protokoll im Audit-Log). */
defineJob('retention', async () => runRetention());
