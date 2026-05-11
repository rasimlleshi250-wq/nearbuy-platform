import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

export const metadata: Metadata = {
  title: {
    default: "NearBuy.al — Gjej produktin afër teje",
    template: "%s | NearBuy.al",
  },
  description: "Kërko produkte dhe profesionistë afër teje në gjithë Shqipërinë. Çmimi më i mirë, shërbim lokal.",
  keywords: ["nearbuy", "blerje online shqipëri", "produkte lokale", "profesionistë shqipëri", "tregti lokale", "hidraulik", "elektriçist", "ndërtim"],
  authors: [{ name: "NearBuy.al" }],
  creator: "NearBuy.al",
  metadataBase: new URL("https://nearbuy.al"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "NearBuy.al — Gjej produktin afër teje",
    description: "Kërko produkte dhe profesionistë afër teje në gjithë Shqipërinë. Çmimi më i mirë, shërbim lokal.",
    url: "https://nearbuy.al",
    siteName: "NearBuy.al",
    locale: "sq_AL",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "NearBuy.al — Gjej produktin afër teje",
    description: "Kërko produkte dhe profesionistë afër teje në gjithë Shqipërinë.",
    creator: "@nearbuy_al",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="sq">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
