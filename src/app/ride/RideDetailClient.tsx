"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { RideDetailPage } from "@/components/rides/RideDetailPage";
import { Loader2 } from "lucide-react";

function RideDetailInner() {
  const searchParams = useSearchParams();
  const rideId = searchParams.get("id") || "";

  if (!rideId) {
    return (
      <div className="flex min-h-screen items-center justify-center pt-24">
        <div className="text-center">
          <p className="text-t2w-muted">No ride specified.</p>
          <a href="/rides" className="mt-4 inline-block text-t2w-accent">
            &larr; Browse All Rides
          </a>
        </div>
      </div>
    );
  }

  return <RideDetailPage rideId={rideId} />;
}

export function RideDetailClient() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center pt-24">
          <Loader2 className="h-8 w-8 animate-spin text-t2w-accent" />
        </div>
      }
    >
      <RideDetailInner />
    </Suspense>
  );
}
