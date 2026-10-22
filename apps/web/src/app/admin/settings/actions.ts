'use server';

import { revalidatePath } from 'next/cache';
import { audit, getDb, updateConfig, type AppConfigPatch } from '@wbm/core';
import { actorOf, requireAdmin } from '@/lib/auth';
import { SECTIONS, setPath, SWITCHES } from './fields';

export interface SaveState {
  ok?: boolean;
  error?: string;
}

function parseValue(type: string, raw: FormDataEntryValue | null, all: FormDataEntryValue[]): unknown {
  const s = typeof raw === 'string' ? raw : '';
  switch (type) {
    case 'number': {
      const n = Number(s.replace(',', '.'));
      if (!Number.isFinite(n)) throw new Error(`Ungültige Zahl: ${s}`);
      return n;
    }
    case 'euro': {
      const n = Number(s.replace(/\s|€/g, '').replace(',', '.'));
      if (!Number.isFinite(n)) throw new Error(`Ungültiger Betrag: ${s}`);
      return Math.round(n * 100);
    }
    case 'bool':
      return s === 'on' || s === 'true';
    case 'lines':
      return s
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);
    case 'json':
      try {
        return JSON.parse(s || 'null');
      } catch {
        throw new Error('Ungültiges JSON');
      }
    case 'multi':
      return all.map(String);
    default:
      return s;
  }
}

export async function saveSection(sectionId: string, _prev: SaveState, form: FormData): Promise<SaveState> {
  const session = await requireAdmin();
  const section = SECTIONS.find((s) => s.id === sectionId);
  if (!section) return { error: 'Unbekannter Bereich' };
  try {
    const patch: Record<string, unknown> = {};
    for (const f of section.fields) {
      setPath(patch, f.path, parseValue(f.type, form.get(f.path), form.getAll(f.path)));
    }
    await updateConfig(patch as AppConfigPatch, actorOf(session));
    revalidatePath('/admin', 'layout');
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { error: msg.length > 400 ? `${msg.slice(0, 400)} …` : msg };
  }
}

export async function toggleSwitch(form: FormData): Promise<void> {
  const session = await requireAdmin();
  const key = String(form.get('key'));
  const value = String(form.get('value')) === 'true';
  if (!SWITCHES.some((s) => s.key === key) && key !== 'killSwitch') throw new Error('Unbekannter Schalter');
  await updateConfig({ switches: { [key]: value } } as AppConfigPatch, actorOf(session));
  await audit(getDb(), { entity: 'switch', entityId: key, action: value ? 'on' : 'off', actor: actorOf(session) });
  revalidatePath('/admin', 'layout');
}
