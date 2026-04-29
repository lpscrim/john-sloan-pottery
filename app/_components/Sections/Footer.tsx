export function Footer() {
  return (
      <footer className="mt-24 py-2 px-6 flex flex-col gap-1 sm:flex-row sm:justify-between sm:items-center">
      <p className="text-muted-foreground">© {new Date().getFullYear()} JOHN SLOAN POTTERY. ALL RIGHTS RESERVED.</p>
    </footer>
  );
}