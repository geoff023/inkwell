export default function Loading() {
  return (
    <div role="status" aria-label="Loading" className="mx-auto w-full max-w-3xl animate-pulse px-4 py-14">
      <div className="h-8 w-48 rounded bg-paper-soft" />
      <div className="mt-10 space-y-8">
        {[0, 1, 2].map((i) => (
          <div key={i} className="space-y-3">
            <div className="h-3 w-32 rounded bg-paper-soft" />
            <div className="h-5 w-3/4 rounded bg-paper-soft" />
            <div className="h-4 w-full rounded bg-paper-soft" />
          </div>
        ))}
      </div>
    </div>
  );
}
