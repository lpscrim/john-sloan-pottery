export function ProjectsSkeleton() {
  return (
    <section id="work" className="min-h-screen px-6 py-24">
      <div className="mx-auto">
        <div className="mb-16">
          <p className="text-muted-foreground mb-2">02</p>
          <h2 className="text-3xl md:text-5xl tracking-tight">
            SELECTED WORKS
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="relative aspect-4/5 bg-muted overflow-hidden mb-4 rounded-xs">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
