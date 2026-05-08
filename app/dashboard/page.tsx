"use client";

import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useUserProfile } from "@/lib/hooks/useUserProfile";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useUserProfile();
  const router = useRouter();

  useEffect(() => {
    if (authLoading || profileLoading) return;
    if (!user) { router.push("/auth/login"); return; }

    const role = profile?.role;
    if (role === "admin") router.push("/admin");
    else if (role === "business") router.push("/dashboard/business");
    else if (role === "professional") router.push("/dashboard/professional");
    else router.push("/dashboard/user");
  }, [user, profile, authLoading, profileLoading, router]);

  return (
    <div style={{
      minHeight: "100vh", background: "#0a0a0a",
      display: "flex", alignItems: "center", justifyContent: "center"
    }}>
      <div style={{ width: 24, height: 24, border: "2px solid rgba(249,115,22,0.2)", borderTopColor: "#f97316", borderRadius: "50%", animation: "spin .7s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
