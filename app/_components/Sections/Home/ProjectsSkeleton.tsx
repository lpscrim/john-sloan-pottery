export function ProjectsSkeleton() {
  return (
    <section id="work" className="py-24 overflow-hidden">
      <div className="px-6 mb-16">
        <h2 className="text-3xl md:text-5xl tracking-tight">Recent work</h2>
      </div>
      <div className="flex gap-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="shrink-0 w-56 md:w-72 animate-pulse">
            <div className="relative aspect-4/5 bg-muted rounded-xs" />
            <div className="mt-3 h-4 bg-muted rounded w-2/3" />
          </div>
        ))}
      </div>
    </section>
  );
}
