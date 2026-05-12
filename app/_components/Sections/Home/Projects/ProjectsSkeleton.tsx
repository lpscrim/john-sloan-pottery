export function ProjectsSkeleton() {
  return (
    <section id="work" className="py-8 lg:py-12 xl:py-16">
      <div className="px-12 lg:px-16">
        <div className="flex gap-6 overflow-hidden animate-pulse">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="shrink-0 w-full sm:w-[calc(50%-0.75rem)] lg:w-[calc(33.33%-1rem)]"
            >
              <div className="relative aspect-4/5 bg-muted rounded-sm" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
