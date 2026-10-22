import pino from 'pino';

/**
 * Strukturiertes JSON-Logging. Personenbezogene Daten werden per Redaction entfernt –
 * zusätzlich gilt die Konvention: nur IDs loggen (leadId, orderId …), nie Namen,
 * Anschriften, E-Mails, Telefonnummern oder IPs.
 */
const PII_PATHS = [
  'email',
  '*.email',
  'customerEmail',
  '*.customerEmail',
  'phone',
  '*.phone',
  'businessName',
  '*.businessName',
  'street',
  '*.street',
  'address',
  '*.address',
  'ip',
  '*.ip',
  'name',
  '*.contactName',
  'password',
  '*.password',
  'token',
  '*.token',
  'authorization',
  '*.authorization',
  'headers.cookie',
  'body',
  '*.body',
];

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === 'test' ? 'silent' : 'info'),
  base: { app: process.env.APP_NAME ?? 'wbm' },
  redact: { paths: PII_PATHS, censor: '[redacted]' },
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level: (label) => ({ level: label }),
  },
});

export type Logger = typeof logger;

export function childLogger(bindings: Record<string, unknown>): Logger {
  return logger.child(bindings);
}

/** Fehler ohne personenbezogene Inhalte serialisieren (nur Name, Nachricht, Code). */
export function errInfo(err: unknown): { name: string; message: string; code?: string } {
  if (err instanceof Error) {
    const code = (err as Error & { code?: string }).code;
    return { name: err.name, message: err.message.slice(0, 500), ...(code ? { code } : {}) };
  }
  return { name: 'Unknown', message: String(err).slice(0, 500) };
}
