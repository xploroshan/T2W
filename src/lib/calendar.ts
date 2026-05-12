// Calendar export helpers — pure functions, no deps.
//
// - buildIcs(ride): produces a VCALENDAR string (RFC 5545) suitable for
//   download as a .ics file. Always UTC; no VTIMEZONE block, since every
//   modern calendar app handles the Z suffix correctly.
// - googleCalendarUrl(ride): produces a calendar.google.com/calendar/render
//   deep link with all fields prefilled. Pure client-side; no API call.

import type { Ride } from "@/types";

// Minimum fields the calendar helpers need. Defined narrowly so the
// helpers can run against either a Prisma Ride or the lighter list-card
// shape from /api/rides.
export interface CalendarRide {
  id: string;
  rideNumber?: string;
  title: string;
  description?: string;
  startDate: string | Date;
  endDate: string | Date;
  startLocation?: string;
  startingPoint?: string | null;
  leadRider?: string;
  distanceKm?: number;
  fee?: number;
}

/** Public origin used for the URL property + the .ics UID. Override in tests. */
export const T2W_ORIGIN = "https://taleson2wheels.com";

/**
 * Escape per RFC 5545: backslashes, commas, semicolons, and newlines all
 * need to be backslash-prefixed (or replaced by `\n`) inside text values.
 */
export function escapeIcsText(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

/** YYYYMMDDTHHMMSSZ — the UTC form ICS + Google Calendar both accept. */
export function toIcsDate(d: string | Date): string {
  const date = d instanceof Date ? d : new Date(d);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return (
    date.getUTCFullYear().toString() +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) +
    "T" +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes()) +
    pad(date.getUTCSeconds()) +
    "Z"
  );
}

/** Lines longer than 75 octets must be folded per RFC 5545. */
function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const out: string[] = [];
  let remaining = line;
  // First chunk is full-width; subsequent chunks are 74 (room for the
  // continuation space prefix).
  out.push(remaining.slice(0, 75));
  remaining = remaining.slice(75);
  while (remaining.length > 0) {
    out.push(" " + remaining.slice(0, 74));
    remaining = remaining.slice(74);
  }
  return out.join("\r\n");
}

export function buildIcs(ride: CalendarRide, origin = T2W_ORIGIN): string {
  const url = `${origin}/ride/${ride.id}`;
  const summaryParts = [ride.rideNumber, ride.title].filter(Boolean).join(" ");
  const descriptionLines = [
    ride.description ?? "",
    "",
    ride.leadRider ? `Lead: ${ride.leadRider}` : "",
    ride.distanceKm != null ? `Distance: ${ride.distanceKm} km` : "",
    ride.fee != null ? `Fee: ₹${ride.fee}` : "",
    "",
    url,
  ]
    .filter((l) => l !== null)
    .join("\n");

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Tales on 2 Wheels//Ride//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:t2w-ride-${ride.id}@taleson2wheels.com`,
    `DTSTAMP:${toIcsDate(new Date())}`,
    `DTSTART:${toIcsDate(ride.startDate)}`,
    `DTEND:${toIcsDate(ride.endDate)}`,
    `SUMMARY:${escapeIcsText(summaryParts)}`,
    `DESCRIPTION:${escapeIcsText(descriptionLines)}`,
    `LOCATION:${escapeIcsText(ride.startingPoint || ride.startLocation || "")}`,
    `URL:${url}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  // CRLF line endings + 75-octet folding are both required by RFC 5545.
  return lines.map(foldLine).join("\r\n") + "\r\n";
}

/**
 * Google Calendar deep link. Opens calendar.google.com with the event
 * fields pre-filled — users still click "Save" to add it. No backend
 * call needed.
 */
export function googleCalendarUrl(ride: CalendarRide, origin = T2W_ORIGIN): string {
  const url = `${origin}/ride/${ride.id}`;
  const summary = [ride.rideNumber, ride.title].filter(Boolean).join(" ");
  const descriptionLines = [
    ride.description ?? "",
    "",
    ride.leadRider ? `Lead: ${ride.leadRider}` : "",
    ride.distanceKm != null ? `Distance: ${ride.distanceKm} km` : "",
    ride.fee != null ? `Fee: ₹${ride.fee}` : "",
    "",
    url,
  ].filter(Boolean).join("\n");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: summary,
    dates: `${toIcsDate(ride.startDate)}/${toIcsDate(ride.endDate)}`,
    details: descriptionLines,
    location: ride.startingPoint || ride.startLocation || "",
    sf: "true",
    output: "xml",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** Convenience adapter so the Ride type from @/types fits CalendarRide. */
export function rideToCalendarRide(r: Ride): CalendarRide {
  return {
    id: r.id,
    rideNumber: r.rideNumber,
    title: r.title,
    description: r.description,
    startDate: r.startDate,
    endDate: r.endDate,
    startLocation: r.startLocation,
    leadRider: r.leadRider,
    distanceKm: r.distanceKm,
    fee: r.fee,
  };
}
