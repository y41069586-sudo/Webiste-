import { templatesForGroup, type BranchGroup } from '@wbm/templates';

/** Wählbare Gestaltungen einer Branchengruppe für die Demo-Anpassung (Template × Farbvariante). */
export function demoDesignChoices(group: BranchGroup): { templateId: string; name: string; palettes: string[] }[] {
  return templatesForGroup(group).map((t) => ({ templateId: t.id, name: t.name, palettes: t.palettes }));
}
