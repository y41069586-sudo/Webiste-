'use client';
import { useState } from 'react';
import type { OnboardingData } from '@wbm/core';
import { OnboardingForm } from '../../onboarding/[token]/onboarding-form';
import { saveSetup } from './actions';

/** Independent requests preserve unsaved text fields and stay below the serverless payload limit. */
export function SetupUploads({
  slug,
  initial,
  photoAlts,
  onBusyChange,
}: {
  slug: string;
  initial: string[];
  photoAlts: Record<string, string>;
  onBusyChange?: (busy: boolean) => void;
}) {
  const [ids, setIds] = useState(initial);
  const [version, setVersion] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function upload(kind: 'logo' | 'photo', files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    onBusyChange?.(true);
    setMessage('');
    try {
      for (const file of Array.from(files)) {
        if (file.size > 4 * 1024 * 1024) throw new Error('Bitte Bilder mit höchstens 4 MB wählen.');
        const body = new FormData();
        body.set('kind', kind);
        body.set('file', file);
        const response = await fetch(`/einrichten/${slug}/upload`, { method: 'POST', body });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? 'Bild konnte nicht gespeichert werden.');
        setIds(data.ids);
        setVersion((v) => v + 1);
      }
      setMessage('Bilder gespeichert. Ihre Texteingaben bleiben erhalten.');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Upload fehlgeschlagen. Bitte erneut versuchen.');
    } finally {
      setBusy(false);
      onBusyChange?.(false);
    }
  }
  async function remove(id: string) {
    setBusy(true);
    onBusyChange?.(true);
    try {
      const body = new FormData();
      body.set('remove', id);
      const r = await fetch(`/einrichten/${slug}/upload`, { method: 'POST', body });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setIds(data.ids);
      setVersion((v) => v + 1);
      setMessage('Bild entfernt.');
    } catch {
      setMessage('Entfernen fehlgeschlagen. Bitte erneut versuchen.');
    } finally {
      setBusy(false);
      onBusyChange?.(false);
    }
  }
  return (
    <section className="mb-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm" aria-labelledby="setup-images">
      <h2 id="setup-images" className="text-lg font-semibold">
        Logo und eigene Fotos <span className="text-sm font-normal text-slate-500">(optional)</span>
      </h2>
      <p className="mt-2 text-sm text-slate-600">
        JPG, PNG oder WebP bis 4 MB. Ein Logo und bis zu sechs Fotos, an denen Sie die Nutzungsrechte haben. Die Bilder werden für
        die Website optimiert.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium">
          Logo
          <input
            className="mt-2 block w-full text-sm"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={busy}
            onChange={(e) => void upload('logo', e.target.files)}
          />
        </label>
        <label className="text-sm font-medium">
          Fotos
          <input
            className="mt-2 block w-full text-sm"
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            disabled={busy}
            onChange={(e) => void upload('photo', e.target.files)}
          />
        </label>
      </div>
      <div className="mt-4 flex flex-wrap gap-4">
        {ids.map((id, i) => (
          <div key={id} className="w-28">
            <img
              src={`/einrichten/${slug}/bild/${encodeURIComponent(id)}?v=${version}`}
              alt={id === 'logo' ? 'Ihr Logo' : `Ihr Foto ${i + 1}`}
              className="h-24 w-28 rounded border object-contain"
            />
            {id !== 'logo' ? (
              <label className="mt-2 block text-xs">
                Bildbeschreibung
                <input
                  form="prepayment-form"
                  name={`photoAlt.${id.slice(6)}`}
                  defaultValue={photoAlts[id.slice(6)] ?? ''}
                  maxLength={120}
                  className="mt-1 w-full rounded border p-1"
                />
              </label>
            ) : null}
            <button type="button" disabled={busy} onClick={() => void remove(id)} className="mt-1 text-sm underline">
              {id === 'logo' ? 'Logo' : 'Foto'} entfernen
            </button>
          </div>
        ))}
      </div>
      <p role="status" className="mt-3 text-sm text-slate-700">
        {busy ? 'Bild wird gespeichert …' : message}
      </p>
    </section>
  );
}

export function SetupEditor({ slug, initial, assets }: { slug: string; initial: OnboardingData; assets: string[] }) {
  const [uploading, setUploading] = useState(false);
  return (
    <>
      <SetupUploads slug={slug} initial={assets} photoAlts={initial.photoAlts} onBusyChange={setUploading} />
      <p className="mb-5 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
        Für Rechnung und Bestellbestätigung übernehmen wir Firmenname, Ansprechperson, Anschrift und E-Mail aus Ihren
        Impressumsangaben. Anfragen Ihrer Website gehen an die von Ihnen unten gewählte Empfängeradresse.
      </p>
      <OnboardingForm
        token=""
        initial={initial}
        photos={[]}
        setupAction={saveSetup.bind(null, slug)}
        externalPending={uploading}
      />
    </>
  );
}
