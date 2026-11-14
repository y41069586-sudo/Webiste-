/**
 * Arbeit nach der Antwort erledigen (14.11.2026, Tempo): Benachrichtigungen sollen den Besucher nicht warten lassen.
 * Die Web-App registriert beim Start `after()` von Next.js als Runner; ohne Runner (Worker, Tests, Skripte) oder wenn der
 * Runner außerhalb einer Anfrage nicht greift, läuft die Aufgabe wie bisher sofort und wird abgewartet.
 */
type Task = () => Promise<void>;
type Runner = (task: Task) => void;

let runner: Runner | null = null;

export function setBackgroundRunner(r: Runner | null): void {
  runner = r;
}

export async function runInBackground(task: Task): Promise<void> {
  if (runner) {
    try {
      runner(task);
      return;
    } catch {
      // z. B. außerhalb einer Anfrage: dann direkt ausführen
    }
  }
  await task();
}
