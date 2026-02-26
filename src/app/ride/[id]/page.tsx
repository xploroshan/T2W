"use client";

import { use } from "react";
import { RideDetailPage } from "@/components/rides/RideDetailPage";

export default function RideDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <RideDetailPage rideId={id} />;
}
