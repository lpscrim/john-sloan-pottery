import type { Metadata, Viewport } from "next";

import "./globals.css";
import { Header } from "./_components/Sections/Header";
import { Footer } from "./_components/Sections/Footer";
import { CartShell } from "./_components/Cart/CartShell";
import MailingListPopup from "./_components/MailingListPopup";


function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit;

  const vercel = process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;

  return "https://example.com";
}

const siteUrl = new URL(getSiteUrl()).origin;


const seoKeywords = [
  "art",
  "portfolio",
  "art shop",
  "art for sale",
  "art prints",
  "original art",
  "art gallery",
  "artwork",
  // TODO: Add artist/shop-specific keywords
];



export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Art Shop", // TODO: Replace with your site name
    template: "%s | Art Shop", // TODO: Replace with your site name
  },
  description:
    "An art portfolio and shop.", // TODO: Replace with your site description
  alternates: {
    canonical: "/",
  },
  keywords: seoKeywords,
  category: "art",
  authors: [{ name: "Artist" }], // TODO: Replace with artist name
  creator: "Artist", // TODO: Replace with artist name
  publisher: "Artist", // TODO: Replace with artist name
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "Art Shop", // TODO: Replace with your site name
    title: "Art Shop", // TODO: Replace with your site name
    description:
      "An art portfolio and shop.", // TODO: Replace with your site description
    locale: "en_GB",
  },
  twitter: {
    card: "summary_large_image",
    title: "Art Shop", // TODO: Replace with your site name
    description:
      "An art portfolio and shop.", // TODO: Replace with your site description
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
          <MailingListPopup />
        </CartShell>
      </body>
    </html>
  );
}
