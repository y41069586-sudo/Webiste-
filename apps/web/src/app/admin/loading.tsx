export default function AdminLoading() {
  return (
    <div role="status" aria-label="Bereich wird geladen" className="admin-loading">
      <p className="text-sm font-medium text-slate-500">Bereich wird geladen …</p>
      <div className="h-9 w-56 rounded-xl bg-slate-200" />
      <div className="h-56 rounded-3xl bg-slate-200" />
      <div className="grid gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((n) => (
          <div key={n} className="h-28 rounded-2xl bg-slate-200" />
        ))}
      </div>
      <span className="sr-only">Bitte einen Moment warten.</span>
    </div>
  );
}
