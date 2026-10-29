import { adminOrNull } from '@/lib/auth';
import { loadLeadSearchStatus } from '@/lib/lead-search';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Live-Stand der Lead-Suche für die Fortschrittsanzeige (nur angemeldet, keine Zugangsdaten). */
export async function GET() {
  if (!(await adminOrNull())) return new Response('unauthorized', { status: 401 });
  return Response.json(await loadLeadSearchStatus(), { headers: { 'cache-control': 'no-store' } });
}
