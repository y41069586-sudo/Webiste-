import { redirect } from 'next/navigation';

/** „Betriebe prüfen“ entfällt (06.11.2026): die KI prüft jeden Treffer selbst und blockiert den Demo-Bau nicht. */
export default function QuickReviewPage() {
  redirect('/admin/suche');
}
