import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kërko Produkte & Shërbime",
  description: "Kërko produkte dhe shërbime afër teje në gjithë Shqipërinë. Filtro sipas qytetit dhe kategorisë.",
  alternates: { canonical: "/search" },
  openGraph: {
    title: "Kërko Produkte & Shërbime | NearBuy.al",
    description: "Gjej produktet dhe shërbimet më të mira afër teje.",
    url: "https://nearbuy.al/search",
  },
};

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
