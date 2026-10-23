import { ensureSiteForCustomer, sendOnboardingReminders, sendRenewalReminders } from '@wbm/core';
import { buildSite, deploySite, liveCheck } from '@wbm/core/render';
import { defineJob } from '../runtime';

/** Nach Zahlung: Kundenseite aus der Demo anlegen (Onboarding-Link steckt in der Rechnungs-Mail). */
defineJob('onboarding', async (data) => {
  const site = await ensureSiteForCustomer(data.customerId);
  return { siteId: site.id };
});

/** Vorschau bauen (Angaben übernehmen bzw. Änderungswunsch umsetzen). */
defineJob('build-site', async (data) => buildSite(data.siteId, data.changeRequestId), { concurrency: 2 });

/** Veröffentlichen: Domain (mit Freigabe), Upload, Live-Check anstoßen. */
defineJob('deploy-site', async (data) => deploySite(data.siteId));

/** Live-Check mit wachsendem Abstand (DNS/SSL brauchen Zeit). */
defineJob('live-check', async (data) => liveCheck(data.siteId, data.attempt ?? 0));

/** Täglich: Onboarding-Erinnerung und Hinweis vor Ablauf des Hostings. */
defineJob('renewal-reminders', async () => ({
  onboarding: await sendOnboardingReminders(),
  renewal: await sendRenewalReminders(),
}));
