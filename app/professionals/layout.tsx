import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Profesionistë të Verifikuar",
  description: "Gjej hidraulikë, elektriçistë, ndërtues dhe profesionistë të tjerë të verifikuar afër teje në Shqipëri.",
  alternates: { canonical: "/professionals" },
  openGraph: {
    title: "Profesionistë të Verifikuar | NearBuy.al",
    description: "Hidraulikë, elektriçistë, ndërtues dhe profesionistë të tjerë afër teje.",
    url: "https://nearbuy.al/professionals",
  },
};

export default function ProfessionalsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
