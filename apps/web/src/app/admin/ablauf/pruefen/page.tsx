import Link from 'next/link';
import { eq } from 'drizzle-orm';
import { getDb, nextLeadForReview, schema } from '@wbm/core';
import { SubmitButton } from '@/components/admin/submit-button';
import { Notice, input } from '@/components/ui';
import { requireAdmin } from '@/lib/auth';
import { num } from '@/lib/format';
import { rejectQuickReviewAction, saveQuickReviewAction, skipQuickReviewAction } from '../actions';

export const metadata = { title: 'Betriebe prüfen' };
export const dynamic = 'force-dynamic';

const google = (q: string) => `https://www.google.com/search?q=${encodeURIComponent(q)}`;

/**
 * Prüfen in einfach: ein Betrieb, einmal nachsehen, drei Haken, ein Knopf.
 * Die Haken werden in actions.ts auf dieselbe Recherche abgebildet wie das ausführliche Formular.
 */
export default async function QuickReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ lead?: string; skip?: string; ok?: string; aus?: string; offen?: string; fehler?: string }>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const skip = (sp.skip ?? '').split(',').filter(Boolean);
  const db = getDb();
  const { lead: nextLead, remaining } = await nextLeadForReview(skip);
  const lead =
    sp.lead && /^[0-9a-f-]{36}$/.test(sp.lead)
      ? ((await db.query.leads.findFirst({ where: eq(schema.leads.id, sp.lead) })) ?? nextLead)
      : nextLead;
  const nameOf = async (id?: string) =>
    id && /^[0-9a-f-]{36}$/.test(id)
      ? (await db.query.leads.findFirst({ where: eq(schema.leads.id, id), columns: { businessName: true } }))?.businessName
      : undefined;
  const [okName, outName] = await Promise.all([nameOf(sp.ok), nameOf(sp.aus)]);
  const skipValue = skip.join(',');

  return (
    <div className="check">
      <div className="check-top">
        <Link href="/admin/ablauf" className="check-back">
          ← Zurück
        </Link>
        <span className="check-left">{remaining === 1 ? 'Noch 1 Betrieb' : `Noch ${num(remaining)} Betriebe`}</span>
      </div>

      {okName ? (
        <Notice kind="success">
          <strong>{okName}</strong> passt. Die Demo wird jetzt von selbst gebaut.
        </Notice>
      ) : null}
      {outName ? (
        <Notice kind="info">
          <strong>{outName}</strong> ist aussortiert.
        </Notice>
      ) : null}
      {sp.offen ? (
        <Notice kind="warn">
          <strong>Noch nicht fertig.</strong> Es fehlt: {sp.offen}
        </Notice>
      ) : null}
      {sp.fehler ? <Notice kind="error">{sp.fehler}</Notice> : null}

      {!lead ? (
        <div className="check-card check-done">
          <p className="check-name">Alles geprüft 🎉</p>
          <p className="check-sub">Gerade wartet kein Betrieb.</p>
          {skip.length ? (
            <Link className="ui-btn ui-btn-secondary" href="/admin/ablauf/pruefen">
              Übersprungene noch mal ansehen ({skip.length})
            </Link>
          ) : (
            <Link className="ui-btn ui-btn-primary" href="/admin/ablauf">
              Zurück zum Ablauf
            </Link>
          )}
        </div>
      ) : (
        <div className="check-card">
          <p className="check-name">{lead.businessName}</p>
          <p className="check-sub">
            {lead.street} {lead.houseNumber}, {lead.postalCode} {lead.city}
            {lead.phone ? ` · ${lead.phone}` : ''}
          </p>
          {!lead.phone ? (
            <Notice kind="warn">
              Keine Telefonnummer bekannt – so ein Betrieb bekommt keinen Brief. Am besten „Passt nicht“.
            </Notice>
          ) : null}
          {lead.websiteUri ? <p className="check-link">Eingetragener Link: {lead.websiteUri}</p> : null}

          <div className="check-step">
            <span className="check-num">1</span>
            <div>
              <p className="check-q">Kurz im Internet nachsehen</p>
              <div className="check-search">
                <a
                  className="ui-btn ui-btn-primary"
                  href={google(`"${lead.businessName}" ${lead.city}`)}
                  target="_blank"
                  rel="noreferrer"
                >
                  Bei Google suchen ↗
                </a>
                {lead.phone ? (
                  <a className="check-mini" href={google(`"${lead.phone}"`)} target="_blank" rel="noreferrer">
                    Nummer
                  </a>
                ) : null}
                <a
                  className="check-mini"
                  href={google(`${lead.businessName} ${lead.city} instagram OR facebook`)}
                  target="_blank"
                  rel="noreferrer"
                >
                  Instagram/Facebook
                </a>
                <a
                  className="check-mini"
                  href={google(`${lead.businessName} ${lead.city} gelbe seiten OR das örtliche`)}
                  target="_blank"
                  rel="noreferrer"
                >
                  Branchenbuch
                </a>
              </div>
            </div>
          </div>

          <form action={saveQuickReviewAction}>
            <input type="hidden" name="id" value={lead.id} />
            <input type="hidden" name="skip" value={skipValue} />
            <input type="hidden" name="simple" value="1" />
            <input type="hidden" name="clients" value={lead.branch === 'reinigung' ? 'business' : 'private'} />
            <div className="check-step">
              <span className="check-num">2</span>
              <div className="check-ticks">
                <p className="check-q">Stimmt das?</p>
                <label className="check-tick">
                  <input type="checkbox" name="noWebsite" />
                  <span>Hat keine eigene Website</span>
                </label>
                <label className="check-tick">
                  <input type="checkbox" name="realBusiness" />
                  <span>Adresse stimmt, Betrieb ist aktiv, keine Kette</span>
                </label>
                <label className="check-tick">
                  <input type="checkbox" name="active" />
                  <span>Ist gerade aktiv (z. B. neue Posts, Angebote, Termine)</span>
                </label>
              </div>
            </div>
            <div className="check-step">
              <span className="check-num">3</span>
              <div className="check-ticks">
                <label className="check-q" htmlFor="services">
                  Was bietet der Betrieb an?
                </label>
                <input
                  id="services"
                  name="services"
                  maxLength={130}
                  placeholder={
                    lead.branch === 'maler'
                      ? 'z. B. Innenanstrich, Renovierung'
                      : lead.branch === 'reinigung'
                        ? 'z. B. Büroreinigung, Fensterreinigung'
                        : lead.branch === 'fliesenleger'
                          ? 'z. B. Badsanierung, Fliesen verlegen'
                          : 'z. B. zwei, drei Leistungen mit Komma'
                  }
                  className={`${input} check-input`}
                />
              </div>
            </div>
            <SubmitButton className="ui-btn ui-btn-primary check-go">Passt – weiter</SubmitButton>
            <p className="check-note">Mit dem Klick bestätigst du, dass du es selbst nachgesehen hast.</p>
          </form>

          <div className="check-no">
            <form action={rejectQuickReviewAction}>
              <input type="hidden" name="id" value={lead.id} />
              <input type="hidden" name="skip" value={skipValue} />
              <input type="hidden" name="reason" value="has_website" />
              <SubmitButton className="ui-btn ui-btn-secondary">Hat eine Website</SubmitButton>
            </form>
            <form action={rejectQuickReviewAction}>
              <input type="hidden" name="id" value={lead.id} />
              <input type="hidden" name="skip" value={skipValue} />
              <input type="hidden" name="reason" value="manual" />
              <SubmitButton className="ui-btn ui-btn-secondary">Passt nicht</SubmitButton>
            </form>
            <form action={skipQuickReviewAction}>
              <input type="hidden" name="id" value={lead.id} />
              <input type="hidden" name="skip" value={skipValue} />
              <SubmitButton className="ui-btn ui-btn-ghost">Später</SubmitButton>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
