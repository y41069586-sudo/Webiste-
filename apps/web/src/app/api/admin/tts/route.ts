import { synthesizeSpeech } from '@wbm/core';
import { adminOrNull } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/** Natürliche Stimme für Jarvis (nur angemeldeter Betreiber; Kosten im KI-Budget). */
export async function POST(req: Request) {
  if (!(await adminOrNull())) return new Response('unauthorized', { status: 401 });
  const body = (await req.json().catch(() => null)) as { text?: unknown } | null;
  const text = typeof body?.text === 'string' ? body.text.slice(0, 800) : '';
  if (!text.trim()) return new Response('kein Text', { status: 400 });
  try {
    const { audio, contentType } = await synthesizeSpeech(text);
    return new Response(Buffer.from(audio), { headers: { 'content-type': contentType, 'cache-control': 'no-store' } });
  } catch {
    // Jarvis fällt dann auf die Stimme des Browsers zurück
    return new Response('Sprachausgabe nicht verfügbar', { status: 503 });
  }
}
