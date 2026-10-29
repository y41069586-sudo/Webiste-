import { eq } from 'drizzle-orm';
import { templatesForGroup, type ServiceItem, type SiteContent } from '@wbm/templates';
import { getConfig } from '../config/service';
import { setSetting } from '../config/service';
import { getDb } from '../db/client';
import { demos, leads } from '../db/schema';
import { getProviders } from '../providers';
import { audit } from '../services/audit';
import { leadResearch } from '../services/lead-research';
import { resolveBusinessDesign } from './business-design';
import {
  demoHtmlKey,
  exampleServicesFor,
  leadContentFacts,
  leadToFacts,
  renderDemoHtml,
  senderPhotoDataUri,
  storedContent,
} from './build';
import { normalizeContent, validateDemoContent } from './content';
import { demoRevisionKey, type DemoRevisionPatch, type DemoRevisionStatus } from './revision-types';

/**
 * Kostenlose Anpassung vor dem Kauf: Der Betreiber ändert Texte, Leistungen oder Farbvariante einer bestehenden Demo.
 * Die Demo wird unter DEMSELBEN Link neu erzeugt (der Betrieb sieht den neuen Stand sofort). Dieselben Inhaltsregeln
 * wie beim Erzeugen gelten (keine erfundenen Fakten, Leistungen als Beispiel gekennzeichnet); Verstöße blockieren.
 */
export async function reviseDemo(input: {
  demoId: string;
  patch: DemoRevisionPatch;
  actor: string;
  wishMessageId?: string | null;
}): Promise<DemoRevisionStatus> {
  const db = getDb();
  const at = new Date().toISOString();
  const finish = async (status: DemoRevisionStatus) => {
    await setSetting(demoRevisionKey(input.demoId), status, input.actor);
    return status;
  };
  const demo = await db.query.demos.findFirst({ where: eq(demos.id, input.demoId) });
  if (!demo || !['pending_review', 'approved', 'published'].includes(demo.status))
    return finish({ state: 'failed', at, error: 'Demo nicht änderbar (gelöscht, abgelaufen oder im Bau).' });
  const lead = await db.query.leads.findFirst({ where: eq(leads.id, demo.leadId) });
  if (!lead || lead.anonymizedAt) return finish({ state: 'failed', at, error: 'Betrieb nicht mehr vorhanden.' });
  const cfg = await getConfig({ fresh: true });
  const current = storedContent(demo.contentJson);
  if (!current) return finish({ state: 'failed', at, error: 'Demo ohne gespeicherte Inhalte.' });
  const p = input.patch;
  const services: ServiceItem[] = p.services
    ? p.services
        .filter((s) => s.title.trim())
        .map((s, i) => ({
          title: s.title.trim(),
          text: s.text.trim(),
          // Symbole bleiben aus dem bestehenden Entwurf (freie Eingaben sind keine gültigen Symbolnamen)
          icon: current.services[i]?.icon ?? current.services[0]!.icon,
        }))
    : current.services;
  const next: SiteContent = normalizeContent({
    ...current,
    hero_headline: p.hero_headline?.trim() || current.hero_headline,
    hero_subline: p.hero_subline?.trim() || current.hero_subline,
    about: p.about?.trim() || current.about,
    cta_text: p.cta_text?.trim() || current.cta_text,
    services: services.length ? services : current.services,
  });
  const research = await leadResearch(lead);
  const baseFacts = leadContentFacts(lead, cfg, research);
  // Vom Betrieb selbst genannte Leistungen sind belegt (Quelle: sein Wunsch); sonst gelten nur die geprüften Titel
  const contentFacts =
    p.servicesConfirmedByBusiness && baseFacts.verifiedServices?.length
      ? { ...baseFacts, verifiedServices: [...new Set([...baseFacts.verifiedServices, ...next.services.map((s) => s.title)])] }
      : baseFacts;
  const violations = validateDemoContent(next, contentFacts);
  if (violations.length) return finish({ state: 'blocked', at, violations: violations.map((v) => `${v.field}: ${v.detail}`) });

  const options = templatesForGroup(lead.branchGroup);
  const template =
    options.find((t) => t.id === (p.templateId || demo.templateId)) ?? options.find((t) => t.id === demo.templateId);
  if (!template) return finish({ state: 'failed', at, error: 'Template passt nicht zur Branche.' });
  const palette = template.palettes.includes(p.palette ?? '')
    ? p.palette!
    : template.palettes.includes(demo.palette)
      ? demo.palette
      : template.palettes[0]!;
  const meta = ((demo.contentJson as { _meta?: Record<string, unknown> } | null)?._meta ?? {}) as Record<string, unknown>;
  const design = await resolveBusinessDesign(lead);
  const verifiedServices = contentFacts.verifiedServices;
  const html = renderDemoHtml({
    templateId: template.id,
    palette,
    artDirection: design.direction,
    content: next,
    facts: {
      ...leadToFacts(lead, cfg),
      verifiedServices,
      exampleServices: verifiedServices?.length ? exampleServicesFor(lead, cfg, verifiedServices) : undefined,
      photos: design.photos,
    },
    slug: demo.slug,
    cfg,
    photoDataUri: await senderPhotoDataUri(cfg),
  });
  const revision = Number(meta.revisions ?? 0) + 1;
  await getProviders().storage.put(demo.htmlStorageKey ?? demoHtmlKey(demo.id), html, 'text/html; charset=utf-8');
  await db
    .update(demos)
    .set({
      templateId: template.id,
      palette,
      htmlStorageKey: demo.htmlStorageKey ?? demoHtmlKey(demo.id),
      contentJson: { ...next, _meta: { ...meta, revisions: revision, lastRevisionAt: at } } as unknown as Record<string, unknown>,
      updatedAt: new Date(),
    })
    .where(eq(demos.id, demo.id));
  await audit(db, {
    entity: 'demo',
    entityId: demo.id,
    action: 'revise',
    actor: input.actor,
    context: { revision, templateId: template.id, palette, wishMessageId: input.wishMessageId ?? null },
  });
  return finish({ state: 'done', at, revision });
}
