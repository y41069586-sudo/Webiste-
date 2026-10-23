import type { Metadata } from 'next';
import Link from 'next/link';
import { getConfig, getOnboardingContext, MAX_PHOTOS } from '@wbm/core';
import { PublicCard, PublicShell } from '@/components/public/shell';
import { OnboardingForm } from './onboarding-form';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Ihre Angaben', robots: { index: false, follow: false } };

export default async function OnboardingPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ abgeschickt?: string; fehler?: string; bild?: string }>;
}) {
  const { token } = await params;
  const sp = await searchParams;
  const cfg = await getConfig();
  const ctx = await getOnboardingContext(token);
  if (ctx.state === 'not_found') {
    return (
      <PublicShell company={cfg.sender.company}>
        <PublicCard>
          <h1 className="mb-2 text-2xl font-semibold">Link ungültig</h1>
          <p className="text-slate-700">
            Dieser Link ist nicht (mehr) gültig. Bei Fragen erreichen Sie uns unter {cfg.sender.email}.
          </p>
        </PublicCard>
      </PublicShell>
    );
  }
  if (ctx.state === 'submitted') {
    return (
      <PublicShell company={cfg.sender.company}>
        <PublicCard>
          <h1 className="mb-2 text-2xl font-semibold">
            {sp.abgeschickt ? 'Vielen Dank – Ihre Angaben sind da!' : 'Ihre Angaben liegen uns vor'}
          </h1>
          <p className="text-slate-700">
            Wir bereiten jetzt die Vorschau Ihrer Website vor. Sobald sie fertig ist, bekommen Sie eine E-Mail mit dem Link –
            meist innerhalb weniger Minuten.
          </p>
          <p className="mt-4">
            <Link href={`/preview/${token}`} className="font-medium text-brand-700 underline">
              Zur Vorschau
            </Link>
          </p>
        </PublicCard>
      </PublicShell>
    );
  }
  const { uploads } = ctx;
  const fileInput =
    'block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:font-medium file:text-brand-700 hover:file:bg-brand-100';
  return (
    <PublicShell company={cfg.sender.company}>
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Ihre Angaben für die Website</h1>
      <p className="mt-2 mb-6 text-slate-600">
        {ctx.businessName}: Bitte ergänzen Sie die folgenden Angaben. Das dauert etwa 10 Minuten – Sie können jederzeit
        zwischenspeichern und später weitermachen. Danach erstellen wir eine Vorschau, die Sie in Ruhe prüfen.
      </p>

      <section
        id="bilder"
        aria-labelledby="bilder-titel"
        className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <h2 id="bilder-titel" className="text-lg font-semibold">
          1. Logo und Fotos <span className="text-sm font-normal text-slate-500">(optional)</span>
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          JPG, PNG oder WebP, je max. 8 MB. Bitte nur Bilder, an denen Sie die Rechte haben. Wir verkleinern die Bilder und
          entfernen Metadaten (z. B. Standort). Tipp: Bilder zuerst hochladen oder das Formular vorher zwischenspeichern.
        </p>
        {sp.fehler ? (
          <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
            {sp.fehler}
          </p>
        ) : sp.bild === 'ok' ? (
          <p role="status" className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            Bild gespeichert.
          </p>
        ) : null}
        <div className="mt-4 grid gap-6 md:grid-cols-2">
          <div>
            <h3 className="mb-2 text-sm font-semibold">Logo</h3>
            {uploads.logo ? (
              <div className="mb-3 flex items-center gap-3">
                {/* Vorschau des hochgeladenen Logos */}
                <img
                  src={`/onboarding/${token}/bild/logo`}
                  alt="Ihr Logo"
                  className="h-14 w-auto max-w-40 rounded border border-slate-200 bg-white object-contain p-1"
                />
                <form method="post" action={`/onboarding/${token}/upload`}>
                  <input type="hidden" name="delete" value="logo" />
                  <button className="text-sm text-red-700 underline">Entfernen</button>
                </form>
              </div>
            ) : null}
            <form method="post" action={`/onboarding/${token}/upload`} encType="multipart/form-data" className="space-y-2">
              <input type="hidden" name="kind" value="logo" />
              <label htmlFor="logo-datei" className="sr-only">
                Logo-Datei
              </label>
              <input id="logo-datei" name="file" type="file" accept="image/png,image/jpeg,image/webp" className={fileInput} />
              <button className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-white hover:bg-slate-900">
                {uploads.logo ? 'Logo ersetzen' : 'Logo hochladen'}
              </button>
            </form>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold">
              Fotos ({uploads.photos.length}/{MAX_PHOTOS})
            </h3>
            {uploads.photos.length ? (
              <ul className="mb-3 grid grid-cols-3 gap-2">
                {uploads.photos.map((p, i) => (
                  <li key={p.id} className="relative">
                    <img
                      src={`/onboarding/${token}/bild/${p.id}`}
                      alt={`Foto ${i + 1}`}
                      className="aspect-square w-full rounded border border-slate-200 object-cover"
                    />
                    <form method="post" action={`/onboarding/${token}/upload`} className="mt-1 text-center">
                      <input type="hidden" name="delete" value={p.id} />
                      <button className="text-xs text-red-700 underline">Entfernen</button>
                    </form>
                  </li>
                ))}
              </ul>
            ) : null}
            {uploads.photos.length < MAX_PHOTOS ? (
              <form method="post" action={`/onboarding/${token}/upload`} encType="multipart/form-data" className="space-y-2">
                <input type="hidden" name="kind" value="photo" />
                <label htmlFor="foto-datei" className="sr-only">
                  Fotos auswählen
                </label>
                <input
                  id="foto-datei"
                  name="file"
                  type="file"
                  multiple
                  accept="image/png,image/jpeg,image/webp"
                  className={fileInput}
                />
                <button className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-white hover:bg-slate-900">
                  Fotos hochladen
                </button>
              </form>
            ) : null}
          </div>
        </div>
      </section>

      <OnboardingForm token={token} initial={ctx.data} photos={uploads.photos.map((p) => ({ id: p.id }))} />
    </PublicShell>
  );
}
