"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login");
    }
  }, [user, loading, router]);

  // Loading spinner ndërsa kontrollohet auth state
  if (loading) {
    return (
      <div className="nb-loading">
        <div className="nb-loading-inner">
          <div className="nb-logo-mark">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="#f97316" strokeWidth="2"/>
              <path d="M7 12c0-3.314 2.239-6 5-6s5 2.686 5 6-2.239 6-5 6" stroke="#f97316" strokeWidth="2" strokeLinecap="round"/>
              <circle cx="12" cy="12" r="2.5" fill="#f97316"/>
            </svg>
          </div>
          <div className="nb-spinner" />
        </div>
        <style>{`
          .nb-loading {
            min-height: 100vh;
            background: #0a0a0a;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .nb-loading-inner {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 20px;
          }
          .nb-logo-mark {
            width: 56px; height: 56px;
            border-radius: 14px;
            background: rgba(249,115,22,0.12);
            border: 1px solid rgba(249,115,22,0.2);
            display: flex; align-items: center; justify-content: center;
            animation: pulse 2s ease-in-out infinite;
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.7; transform: scale(0.95); }
          }
          .nb-spinner {
            width: 20px; height: 20px;
            border: 2px solid rgba(249,115,22,0.2);
            border-top-color: #f97316;
            border-radius: 50%;
            animation: spin 0.7s linear infinite;
          }
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  // Nëse nuk është i loguar, mos shfaq asgjë (router po redirect)
  if (!user) return null;

  // I loguar — shfaq faqen
  return <>{children}</>;
}
