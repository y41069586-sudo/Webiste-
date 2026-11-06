import { redirect } from 'next/navigation';

/** „Schritt für Schritt“ entfällt (06.11.2026): der Ablauf läuft von selbst, offene Arbeit steht auf der Startseite. */
export default function WorkflowPage() {
  redirect('/admin');
}
