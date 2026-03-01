import type { Metadata } from "next";
import { mockRides } from "@/data/mock";
import { RideDetailPage } from "@/components/rides/RideDetailPage";

// Pre-render all ride pages at build time for static export
export function generateStaticParams() {
  return mockRides.map((ride) => ({
    id: ride.id,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const ride = mockRides.find((r) => r.id === id);

  if (!ride) {
    return {
      title: "Ride Not Found",
      description: "The requested ride could not be found.",
    };
  }

  const title = `${ride.rideNumber} ${ride.title} | ${ride.startLocation} to ${ride.endLocation} Motorcycle Ride`;
  const description = `${ride.description} ${ride.distanceKm} km ${ride.type} ride from ${ride.startLocation} to ${ride.endLocation}. ${ride.status === "upcoming" ? `Register now - only ${ride.maxRiders - ride.registeredRiders} spots left! Fee: ₹${ride.fee}` : `${ride.registeredRiders} riders participated.`} Organised by Tales on 2 Wheels.`;
  const url = `https://taleson2wheels.com/ride/${ride.id}`;

  return {
    title,
    description,
    keywords: [
      `${ride.endLocation} motorcycle ride`,
      `${ride.startLocation} to ${ride.endLocation} bike ride`,
      `motorcycle ride ${ride.endLocation}`,
      `T2W ride ${ride.rideNumber}`,
      `${ride.title} motorcycle tour`,
      `group ride ${ride.endLocation}`,
      `motorcycle tour ${ride.type}`,
      "Tales on 2 Wheels",
      "T2W rides",
      "motorcycle group ride India",
    ],
    openGraph: {
      title: `${ride.rideNumber} ${ride.title} | Tales on 2 Wheels`,
      description: `${ride.distanceKm} km ${ride.type} ride: ${ride.startLocation} → ${ride.endLocation}. ${ride.status === "upcoming" ? "Register now!" : "View ride details."}`,
      url,
      images: [
        {
          url: "/og-image.jpg",
          width: 1200,
          height: 630,
          alt: `${ride.title} - Tales on 2 Wheels Motorcycle Ride`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${ride.rideNumber} ${ride.title} | T2W`,
      description: `${ride.distanceKm} km ${ride.type} ride: ${ride.startLocation} → ${ride.endLocation}`,
      images: ["/og-image.jpg"],
    },
    alternates: {
      canonical: url,
    },
  };
}

function RideEventSchema({ rideId }: { rideId: string }) {
  const ride = mockRides.find((r) => r.id === rideId);
  if (!ride) return null;

  const schema = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: `${ride.rideNumber} ${ride.title} - Tales on 2 Wheels`,
    description: ride.description,
    startDate: ride.startDate,
    endDate: ride.endDate,
    eventStatus:
      ride.status === "upcoming"
        ? "https://schema.org/EventScheduled"
        : "https://schema.org/EventCompleted",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: {
      "@type": "Place",
      name: ride.startingPoint || ride.startLocation,
      address: {
        "@type": "PostalAddress",
        addressLocality: ride.startLocation.split(",")[0].trim(),
        addressRegion: ride.startLocation.split(",")[1]?.trim() || "Karnataka",
        addressCountry: "IN",
      },
    },
    organizer: {
      "@type": "Organization",
      name: "Tales on 2 Wheels",
      url: "https://taleson2wheels.com",
    },
    offers: {
      "@type": "Offer",
      price: ride.fee,
      priceCurrency: "INR",
      availability:
        ride.registeredRiders < ride.maxRiders
          ? "https://schema.org/InStock"
          : "https://schema.org/SoldOut",
      url: `https://taleson2wheels.com/ride/${ride.id}`,
      validFrom: "2024-01-01",
    },
    maximumAttendeeCapacity: ride.maxRiders,
    remainingAttendeeCapacity: ride.maxRiders - ride.registeredRiders,
    image: "https://taleson2wheels.com/og-image.jpg",
    performer: ride.leadRider
      ? { "@type": "Person", name: ride.leadRider }
      : undefined,
    ...(ride.status === "upcoming" && {
      isAccessibleForFree: ride.fee === 0,
      typicalAgeRange: "18-",
      keywords: `motorcycle ride, ${ride.endLocation}, group ride, ${ride.type} ride, T2W`,
    }),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export default async function RidePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <>
      <RideEventSchema rideId={id} />
      <RideDetailPage rideId={id} />
    </>
  );
}
