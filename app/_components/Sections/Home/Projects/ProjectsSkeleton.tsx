export function ProjectsSkeleton() {
  return (
    <section id="shop" className="py-8 lg:py-12 xl:py-16">
      <div className="px-12 lg:px-16">
        <div className="flex gap-6 overflow-hidden animate-pulse">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="shrink-0 h-[80vh] aspect-4/5">
              <div className="h-full bg-muted rounded-sm" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
