/** Existing worker/adapter only. Account authentication + one availability read; never registration or DNS writes. */
import { getEnv } from '../src/config/env';
import { InwxError, InwxRegistrar } from '../src/providers/registrar/inwx';

async function main() {
  const env = getEnv();
  const configured = Boolean(env.REGISTRAR_USER && env.REGISTRAR_PASSWORD);
  if (!process.argv.includes('--check')) {
    console.log(JSON.stringify({ stage: 'configuration', configured, environment: env.REGISTRAR_ENV, providerCalls: false }));
    return;
  }
  if (process.env.REGISTRAR_CHECK_CONFIRM !== 'read-only') throw new Error('REGISTRAR_CHECK_CONFIRM=read-only erforderlich.');
  if (!env.DRY_RUN || env.REGISTRAR_ENV !== 'sandbox')
    throw new Error('Dieser Prüflauf erfordert DRY_RUN=true und REGISTRAR_ENV=sandbox.');
  if (!configured) throw new Error('Private REGISTRAR_USER/REGISTRAR_PASSWORD fehlen im Worker.');
  const registrar = new InwxRegistrar({
    user: env.REGISTRAR_USER!,
    password: env.REGISTRAR_PASSWORD!,
    env: 'sandbox',
    totpSecret: env.REGISTRAR_TOTP_SECRET,
  });
  const result = await registrar.checkAvailability(['example.org']);
  if (result.length !== 1 || result[0]?.reason === 'keine Antwort')
    throw new Error('INWX-Leseantwort unvollständig; keine Verbindung bestätigt.');
  console.log(
    JSON.stringify({
      stage: 'result',
      provider: 'inwx',
      environment: 'sandbox',
      authenticatedRead: true,
      globalProviderChanged: false,
      domainPurchased: false,
      dnsChanged: false,
    }),
  );
}

try {
  await main();
} catch (err) {
  // Provider messages can include account details. Only a code/class is safe in a copied terminal result.
  console.error(
    JSON.stringify({
      stage: 'blocked',
      code: err instanceof InwxError ? err.code : null,
      errorClass: err instanceof Error ? err.name : 'Error',
      reason:
        err instanceof InwxError
          ? 'Sandbox-Anmeldung oder Lesezugriff fehlgeschlagen; privaten Kontozugang prüfen.'
          : 'Konfiguration oder Prüffreigabe fehlt; private Anleitung beachten.',
    }),
  );
  process.exitCode = 1;
}
