import type { Metadata } from "next";
import { riderProfiles } from "@/data/rider-profiles";
import { RiderProfilePage } from "@/components/rider/RiderProfilePage";

export function generateStaticParams() {
  return riderProfiles.map((rider) => ({
    id: rider.id,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const rider = riderProfiles.find((r) => r.id === id);

  if (!rider) {
    return {
      title: "Rider Not Found",
      description: "The requested rider profile could not be found.",
    };
  }

  const title = `${rider.name} - T2W Rider Profile | Tales on 2 Wheels`;
  const description = `${rider.name} has completed ${rider.ridesCompleted} rides covering ${rider.totalKm.toLocaleString()} km with Tales on 2 Wheels motorcycle community. View ride history and achievements.`;

  return {
    title,
    description,
    openGraph: {
      title: `${rider.name} | Tales on 2 Wheels Rider`,
      description,
      images: [
        {
          url: "/og-image.jpg",
          width: 1200,
          height: 630,
          alt: `${rider.name} - Tales on 2 Wheels Rider Profile`,
        },
      ],
    },
    alternates: {
      canonical: `https://taleson2wheels.com/rider/${rider.id}`,
    },
  };
}

export default async function RiderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <RiderProfilePage riderId={id} />;
}
