import Link from "next/link";

export default function CancelledPage() {
  return (
    <section className="min-h-[75svh] px-6 py-24 xl:py-32 max-w-2xl mx-auto">
      <h1 className="text-3xl md:text-5xl tracking-tight mb-4">
        CHECKOUT CANCELLED
      </h1>
      <p className="text-muted-foreground mb-12">
        Your payment was not processed and no charge was made. Your reserved
        items have been released.
      </p>

      <Link
        href="/shop"
        className="inline-block mt-8 text-muted-foreground hover:text-foreground transition-colors"
      >
        ← Back to gallery
      </Link>
    </section>
  );
}
