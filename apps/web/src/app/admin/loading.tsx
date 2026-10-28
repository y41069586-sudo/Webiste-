/** Sofortige Rückmeldung beim Seitenwechsel: Gerüst der Seite mit sanftem Schimmer. */
export default function AdminLoading() {
  return (
    <div role="status" aria-label="Bereich wird geladen" className="admin-loading">
      <div className="admin-skel" style={{ height: 34, width: 240 }} />
      <div className="grid gap-3 sm:grid-cols-4">
        {[1, 2, 3, 4].map((n) => (
          <div key={n} className="admin-skel" style={{ height: 92 }} />
        ))}
      </div>
      <div className="admin-skel" style={{ height: 280 }} />
      <div className="admin-skel" style={{ height: 160 }} />
      <span className="sr-only">Bitte einen Moment warten.</span>
    </div>
  );
}
