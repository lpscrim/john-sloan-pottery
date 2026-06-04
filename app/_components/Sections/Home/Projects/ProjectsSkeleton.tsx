export function ProjectsSkeleton() {
  return (
    <section id="shop" className="py-16 xl:py-40">
      <div className="px-4">
        <div className="flex gap-6 overflow-hidden animate-pulse">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="shrink-0 h-[55vh] sm:h-[65vh] aspect-4/5">
              <div className="h-full bg-stone-200 rounded-sm" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
