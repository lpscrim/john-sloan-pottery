import Link from 'next/link';

export default function AdminHomePage() {
  return (
    <div className="bg-background text-foreground px-6 pt-16">
      <div className="max-w-xl mx-auto space-y-6">
        <h1 className="text-3xl tracking-tight">ADMIN</h1>
        <p className="text-lg text-muted-foreground">
          Choose a task to continue.
        </p>
        <div className="grid gap-4 text-base">
          <Link
            href="/admin/add-product"
            className="block rounded-md border border-muted bg-background px-4 py-3  transition-colors hover:border-foreground"
          >
            Add product
          </Link>
          <Link
            href="/admin/edit-product"
            className="block rounded-md border border-muted bg-background px-4 py-3  transition-colors hover:border-foreground"
          >
            Edit products
          </Link>
          <Link
            href="/admin/orders"
            className="block rounded-md border border-muted bg-background px-4 py-3  transition-colors hover:border-foreground"
          >
            Orders
          </Link>
          <Link
            href="/admin/about"
            className="block rounded-md border border-muted bg-background px-4 py-3  transition-colors hover:border-foreground"
          >
            About page
          </Link>
          <Link
            href="/admin/home-about"
            className="block rounded-md border border-muted bg-background px-4 py-3  transition-colors hover:border-foreground"
          >
            Home about section
          </Link>
          <Link
            href="/admin/settings"
            className="block rounded-md border border-muted bg-background px-4 py-3  transition-colors hover:border-foreground"
          >
            Settings
          </Link>
          <Link
            href="/admin/etsy"
            className="block rounded-md border border-muted bg-background px-4 py-3  transition-colors hover:border-foreground"
          >
            Etsy sync
          </Link>
        </div>
      </div>
    </div>
  );
}
