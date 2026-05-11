import type { Metadata, Viewport } from "next";

import "./globals.css";
import { Header } from "./_components/Sections/Header";
import { Footer } from "./_components/Sections/Footer";
import { CartShell } from "./_components/Cart/CartShell";


function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit;

  const vercel = process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;

  return "https://example.com";
}

const siteUrl = new URL(getSiteUrl()).origin;


const seoKeywords = [
  "pottery",
  "ceramics",
  "handmade pottery",
  "stoneware",
  "John Sloan",
  "John Sloan Pottery",
  "ceramic art",
  "pottery for sale",
  "handmade ceramics",
  "art gallery",
];



export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "John Sloan Pottery",
    template: "%s | John Sloan Pottery",
  },
  description:
    "John Sloan Pottery — handmade stoneware mugs, bowls, and vessels thrown and fired on the Isle of Skye. Each piece is unique, finished in a range of distinctive glazes.",
  alternates: {
    canonical: "/",
  },
  keywords: seoKeywords,
  category: "art",
  authors: [{ name: "John Sloan" }],
  creator: "John Sloan",
  publisher: "John Sloan",
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "John Sloan Pottery",
    title: "John Sloan Pottery",
    description:
      "John Sloan Pottery — handmade stoneware mugs, bowls, and vessels thrown and fired on the Isle of Skye. Each piece is unique, finished in a range of distinctive glazes.",
    locale: "en_GB",
  },
  twitter: {
    card: "summary_large_image",
    title: "John Sloan Pottery",
    description:
      "John Sloan Pottery — handmade stoneware mugs, bowls, and vessels thrown and fired on the Isle of Skye. Each piece is unique, finished in a range of distinctive glazes.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" >
      <body
        className="antialiased bg-background text-foreground w-full"
      >
        <CartShell>
          <Header />
          {children}
          <Footer />
        </CartShell>
      </body>
    </html>
  );
}
