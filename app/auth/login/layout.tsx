import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hyr në llogarinë tënde",
  description: "Hyr në llogarinë tënde NearBuy.al dhe menaxho biznesin ose profilin tënd profesional.",
  robots: { index: false, follow: false },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
