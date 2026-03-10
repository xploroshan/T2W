"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

// Redirect /dashboard to the user's rider profile page
export function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (user.linkedRiderId) {
      router.replace(`/rider/${user.linkedRiderId}`);
    } else {
      // No linked rider profile yet - stay on a minimal page
      router.replace("/rides");
    }
  }, [user, loading, router]);

  return (
    <div className="flex min-h-screen items-center justify-center pt-24">
      <Loader2 className="h-8 w-8 animate-spin text-t2w-accent" />
    </div>
  );
}
