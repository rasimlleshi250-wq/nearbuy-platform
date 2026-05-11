import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Regjistrohu — Biznes ose Profesionist",
  description: "Regjistro biznesin ose profilin tënd profesional në NearBuy.al dhe rrit klientelën tënde.",
  alternates: { canonical: "/auth/register" },
  openGraph: {
    title: "Regjistrohu | NearBuy.al",
    description: "Regjistro biznesin tënd dhe shfaqu para mijëra klientëve në Shqipëri.",
    url: "https://nearbuy.al/auth/register",
  },
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
