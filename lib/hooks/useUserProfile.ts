"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import type { UserProfile } from "@/types";

export function useUserProfile() {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const fetchProfile = async () => {
      try {
        const ref = doc(db, "users", user.uid);
        const snap = await getDoc(ref);

        if (snap.exists()) {
          setProfile(snap.data() as UserProfile);
        } else {
          // Krijo profilin nëse nuk ekziston
          const newProfile: Omit<UserProfile, "createdAt"> = {
            uid: user.uid,
            email: user.email || "",
            displayName: user.displayName || "",
            role: "user",
            phone: "",
          };
          await setDoc(ref, {
            ...newProfile,
            createdAt: serverTimestamp(),
          });
          setProfile({ ...newProfile, createdAt: null as any });
        }
      } catch (err) {
        console.error("useUserProfile error:", err);
        // Nëse Firestore ka problem, vazhdo pa profile
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user, authLoading]);

  return { profile, loading };
}
