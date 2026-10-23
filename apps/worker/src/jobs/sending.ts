import { scheduleFollowups, sendApprovedLetters, sendLetter, syncLetterStatuses } from '@wbm/core';
import { defineJob } from '../runtime';

defineJob('send-letter', async (data) => sendLetter(data.letterId, 'job:send-letter'));

defineJob('send-approved-letters', async (data) => sendApprovedLetters(`job:send-approved:${data.triggeredBy}`, data.limit));

defineJob('sync-letter-status', async () => syncLetterStatuses());

defineJob('followup', async () => scheduleFollowups());
