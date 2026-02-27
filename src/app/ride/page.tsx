import type { Metadata } from "next";
import { RideDetailClient } from "./RideDetailClient";

export const metadata: Metadata = {
  title: "Ride Details | Motorcycle Group Rides in India",
  description:
    "View ride details, route information, and register for upcoming motorcycle group rides across India. Join T2W for epic rides from Bangalore, Mumbai, Pune, and more.",
  openGraph: {
    title: "Ride Details | Tales on 2 Wheels",
    description:
      "View ride details and register for motorcycle group rides across India with T2W.",
  },
};

export default function RidePage() {
  return <RideDetailClient />;
}
