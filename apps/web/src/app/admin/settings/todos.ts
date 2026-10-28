import { goLiveBlockers, type AppConfig } from '@wbm/core';

/** Offene Pflichtangaben, jeweils mit dem Einstellungsbereich (`?bereich=`), in dem sie eingetragen werden. */
export function settingsTodos(cfg: AppConfig): { tab: string; label: string }[] {
  const todos = goLiveBlockers(cfg).map((b) => ({
    tab: b.key.startsWith('legal.') ? 'legal' : b.key.startsWith('tax.') ? 'money' : 'sender',
    label: b.label,
  }));
  const t = cfg.letter.testRecipient;
  if (!t.street || !t.postalCode || !t.city) todos.push({ tab: 'letter', label: 'Testadresse für den Testbrief an dich' });
  return todos;
}
