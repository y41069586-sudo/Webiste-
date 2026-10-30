/** Existing worker/adapter only. Account authentication + one availability read; never registration or DNS writes. */
import { getEnv } from '../src/config/env';
import { INWX_ENDPOINTS, InwxError, InwxRegistrar } from '../src/providers/registrar/inwx';

const productionReadOnly = process.argv.includes('--production-read-only');
const environment = productionReadOnly ? 'production' : 'sandbox';

/** Fail closed even if the shared adapter gains additional calls in the future. */
const readOnlyFetch: typeof fetch = async (input, init) => {
  if (String(input) !== INWX_ENDPOINTS[environment] || init?.method !== 'POST' || typeof init.body !== 'string')
    throw new Error('Nur der feste INWX-Leseendpunkt ist erlaubt.');
  const rpc = JSON.parse(init.body) as { method?: string; params?: { domain?: unknown } };
  if (!['account.login', 'account.unlock', 'domain.check'].includes(rpc.method ?? ''))
    throw new Error('Dieser INWX-Prüflauf erlaubt keine schreibenden Methoden.');
  if (rpc.method === 'domain.check' && JSON.stringify(rpc.params?.domain) !== JSON.stringify(['example.org']))
    throw new Error('Nur die feste Verfügbarkeitsabfrage ist erlaubt.');
  return fetch(input, init);
};

async function main() {
  const env = getEnv();
  if (process.argv.slice(2).some((arg) => !['--check', '--production-read-only'].includes(arg)))
    throw new Error('Unbekannte Prüfoption.');
  const configured = Boolean(env.REGISTRAR_USER && env.REGISTRAR_PASSWORD);
  if (!process.argv.includes('--check')) {
    console.log(
      JSON.stringify({
        stage: 'configuration',
        configured,
        environment,
        configuredEnvironment: env.REGISTRAR_ENV,
        providerCalls: false,
      }),
    );
    return;
  }
  const confirmation = productionReadOnly ? 'production-read-only' : 'read-only';
  if (process.env.REGISTRAR_CHECK_CONFIRM !== confirmation) throw new Error('Ausdrückliche Lesefreigabe erforderlich.');
  if (!env.DRY_RUN || env.REGISTRAR_ENV !== 'sandbox')
    throw new Error('Dieser Prüflauf erfordert unverändert DRY_RUN=true und REGISTRAR_ENV=sandbox.');
  if (productionReadOnly && env.REGISTRAR_PROVIDER !== 'mock')
    throw new Error('Der allgemeine Registrar muss für diesen Kontotest auf mock bleiben.');
  if (!configured) throw new Error('Private REGISTRAR_USER/REGISTRAR_PASSWORD fehlen im Worker.');
  const registrar = new InwxRegistrar(
    {
      user: env.REGISTRAR_USER!,
      password: env.REGISTRAR_PASSWORD!,
      env: environment,
      totpSecret: env.REGISTRAR_TOTP_SECRET,
    },
    readOnlyFetch,
  );
  const result = await registrar.checkAvailability(['example.org']);
  if (result.length !== 1 || result[0]?.reason === 'keine Antwort')
    throw new Error('INWX-Leseantwort unvollständig; keine Verbindung bestätigt.');
  console.log(
    JSON.stringify({
      stage: 'result',
      provider: 'inwx',
      environment,
      configuredEnvironment: env.REGISTRAR_ENV,
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
      environment,
      code: err instanceof InwxError ? err.code : null,
      method: err instanceof InwxError ? err.method : null,
      errorClass: err instanceof Error ? err.name : 'Error',
      reason:
        err instanceof InwxError
          ? productionReadOnly
            ? 'Kontoanmeldung oder Lesezugriff fehlgeschlagen; INWX-Loginname, Passwort und 2FA privat prüfen.'
            : 'OT&E-Anmeldung oder Lesezugriff fehlgeschlagen; Zugang zum getrennten INWX-Testsystem prüfen.'
          : 'Konfiguration oder Prüffreigabe fehlt; private Anleitung beachten.',
    }),
  );
  process.exitCode = 1;
}
