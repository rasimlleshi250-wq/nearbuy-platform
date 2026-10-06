import { redirect } from "next/navigation";

// Profili i mjeshtrit krijohet gjatë regjistrimit (app/auth/register).
// Të dhënat (profesioni, qyteti, telefoni, fotot) plotësohen te faqja e profilit.
export default function ProfessionalSetupPage() {
  redirect("/dashboard/professional/profile");
}
