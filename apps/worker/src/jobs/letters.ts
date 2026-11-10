import { enqueue, getDb, LetterCheckUnavailableError, QUEUES, raiseAlert } from '@wbm/core';
import { generateLetter } from '@wbm/core/render';
import { defineJob, NonRetryableError } from '../runtime';

defineJob(
  'generate-letter',
  async (data) => {
    try {
      const res = await generateLetter(data.leadId, data.sequence, {
        actor: `job:generate-letter:${data.triggeredBy ?? 'system'}`,
        test: data.test,
        regenerate: data.regenerate,
      });
      // Einmal automatisch neu schreiben (KI-Text und KI-Wahrheitsprüfung schwanken); scheitert auch das, bleibt der
      // Brief zur Prüfung stehen. Testbriefe und Neuerzeugungen von Hand nicht.
      if (res.status === 'failed' && !data.regenerate && !data.test)
        await enqueue(
          QUEUES.generateLetter,
          { leadId: data.leadId, sequence: data.sequence, triggeredBy: 'auto-retry', regenerate: true },
          { singletonKey: `letter-retry:${data.leadId}:${data.sequence}`, startAfter: 60 },
        );
      return { letterId: res.letterId, status: res.status, issues: res.issues.length };
    } catch (err) {
      // Technisch nicht verfügbar (Website, Quellenseite, KI-Prüfung): kein Urteil über den Brief. Einmal melden,
      // dann mit Wartezeit wiederholen (pg-boss: steigende Abstände). Der bisherige Brief bleibt unverändert.
      if (err instanceof LetterCheckUnavailableError) {
        await raiseAlert(getDb(), {
          level: 'warn',
          code: `letter_check_unavailable:${err.check}`,
          message: `Brieferzeugung wartet: ${err.message}`,
        }).catch(() => undefined);
        throw err;
      }
      // Fachliche Gründe: Wiederholen ändert nichts und kostet nur KI-Aufrufe
      if (
        err instanceof Error &&
        /Status|Widerspr|gelöscht|unvollständig|Keine veröffentlichte|nicht technisch und gestalterisch|Neu-Erzeugung nicht bestanden|Sperrliste|gesperrt|nicht mehr geeignet|Eigene Website vorhanden|Betriebsdublette|Betriebsrecherche seit|Folgebrief benötigt|Dritter Brief/.test(
          err.message,
        )
      ) {
        throw new NonRetryableError(err.message);
      }
      throw err;
    }
  },
  { concurrency: 2 },
);
