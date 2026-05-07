import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

export const metadata: Metadata = {
  title: "NearBuy.al — Gjej produktin afër teje",
  description: "Kërko produkte dhe profesionistë afër teje në gjithë Shqipërinë. Çmimi më i mirë, dorëzim i shpejtë.",
  keywords: "blerje online, produkte shqipëri, nearbuy, tregti lokale",
  openGraph: {
    title: "NearBuy.al",
    description: "Gjej produktin që dëshiron afër teje, çmimi më i mirë.",
    locale: "sq_AL",
    type: "website",
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
