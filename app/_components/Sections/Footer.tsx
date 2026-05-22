import Link from "next/link";

export function Footer() {
  return (
      <footer className="py-4 px-6 flex flex-col gap-1 sm:flex-row sm:justify-between sm:items-center text-muted-foreground">
      <p className="">© {new Date().getFullYear()} JOHN SLOAN POTTERY. ALL RIGHTS RESERVED.</p>
      <p className="text-sm">SITE BY: <Link href="https://www.lpscrim.com" target="_blank" rel="noopener noreferrer" className=" hover:opacity-70 transition-opacity">LEWIS SCRIMGEOUR</Link></p>
    </footer>
  );
}