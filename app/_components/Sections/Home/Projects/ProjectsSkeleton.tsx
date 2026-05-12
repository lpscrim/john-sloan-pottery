export function ProjectsSkeleton() {
  return (
    <section id="work" className="py-8 lg:py-12 xl:py-16 overflow-hidden">
      <div
        className="overflow-hidden w-full"
        style={{
          maskImage:
            "linear-gradient(to right, transparent 0%, black 8%, black 85%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to right, transparent 0%, black 8%, black 85%, transparent 100%)",
        }}
      >
        <div className="flex gap-6 w-max animate-pulse">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="shrink-0 w-64 lg:w-75 xl:w-85">
              <div className="relative aspect-4/5 bg-muted rounded-sm" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
