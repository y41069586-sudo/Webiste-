import { pipelineTick } from '@wbm/core';
import { defineJob } from '../runtime';

/** Zentraler Takt: schiebt Leads idempotent durch die Pipeline (alle 5 Minuten). */
defineJob('pipeline-tick', async () => pipelineTick());
