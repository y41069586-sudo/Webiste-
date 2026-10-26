import type { BranchGroup } from '@wbm/templates/types';
import { registerMockStructured } from '../providers/llm/mock';
import { DEMO_TOOL_NAME, QA_TOOL_NAME, verifiedServiceFallback } from './content';
import { libraryContent } from './library';

function line(prompt: string, key: string): string {
  return new RegExp(`^${key}:\\s*(.+)$`, 'm').exec(prompt)?.[1]?.trim() ?? '';
}

function seedOf(s: string): number {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

/** Deterministische Ersatzantworten (ohne API-Key, Tests, DRY_RUN). */
registerMockStructured(DEMO_TOOL_NAME, (req) => {
  const name = line(req.prompt, 'Firmenname');
  const branche = line(req.prompt, 'Branche');
  const key = line(req.prompt, 'Branchen-Schlüssel');
  const stadt = line(req.prompt, 'Stadt');
  const group = (line(req.prompt, 'Design-Gruppe') || 'handwerk') as BranchGroup;
  const content = libraryContent(key, group, { name, stadt, branche }, seedOf(name));
  const verified = line(req.prompt, 'Bestätigte Leistungen');
  if (!verified) return content;
  return verifiedServiceFallback(content, {
    name,
    branchKey: key,
    branchLabel: branche,
    group,
    city: stadt,
    postalCode: '',
    street: '',
    houseNumber: '',
    phone: null,
    hasOpeningHours: false,
    socialOnly: false,
    verifiedServices: JSON.parse(verified),
  });
});

registerMockStructured(QA_TOOL_NAME, () => ({ issues: [] }));
