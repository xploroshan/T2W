import { describe, it, expect } from "vitest";
import {
  buildIcs,
  googleCalendarUrl,
  toIcsDate,
  escapeIcsText,
  type CalendarRide,
} from "@/lib/calendar";

const ride: CalendarRide = {
  id: "ride-1",
  rideNumber: "#031",
  title: "Bangalore → Coffee Nadu",
  description: "A coffee-plantation ride.\nBring a poncho.",
  startDate: "2025-05-23T03:00:00.000Z",
  endDate: "2025-05-24T11:00:00.000Z",
  startLocation: "Bangalore",
  startingPoint: "Indiranagar Metro, Bangalore; gate 2",
  leadRider: "Ahmed",
  distanceKm: 500,
  fee: 2650,
};

describe("toIcsDate", () => {
  it("emits YYYYMMDDTHHMMSSZ in UTC", () => {
    expect(toIcsDate("2025-05-23T03:00:00.000Z")).toBe("20250523T030000Z");
  });
  it("works on a Date instance", () => {
    expect(toIcsDate(new Date("2025-01-01T00:00:00Z"))).toBe("20250101T000000Z");
  });
});

describe("escapeIcsText", () => {
  it("escapes commas, semicolons, backslashes, and newlines", () => {
    expect(escapeIcsText("a, b; c\\d\ne")).toBe("a\\, b\\; c\\\\d\\ne");
  });
});

describe("buildIcs", () => {
  const ics = buildIcs(ride);

  it("contains required VCALENDAR fields", () => {
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("END:VCALENDAR");
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("END:VEVENT");
    expect(ics).toContain("VERSION:2.0");
  });

  it("uses UTC times (Z suffix, no VTIMEZONE block)", () => {
    expect(ics).toContain("DTSTART:20250523T030000Z");
    expect(ics).toContain("DTEND:20250524T110000Z");
    expect(ics).not.toContain("VTIMEZONE");
  });

  it("escapes special characters in SUMMARY / LOCATION / DESCRIPTION", () => {
    // "; gate 2" should be escaped to "\; gate 2"
    expect(ics).toContain("LOCATION:Indiranagar Metro\\, Bangalore\\; gate 2");
    // The newline in description should be \n
    expect(ics).toContain("\\nBring a poncho.");
  });

  it("uses a stable UID so re-imports don't duplicate the event", () => {
    expect(ics).toContain("UID:t2w-ride-ride-1@taleson2wheels.com");
  });

  it("uses CRLF line endings", () => {
    expect(ics.includes("\r\n")).toBe(true);
  });
});

describe("googleCalendarUrl", () => {
  const url = googleCalendarUrl(ride);

  it("targets calendar.google.com", () => {
    expect(url).toMatch(/^https:\/\/calendar\.google\.com\/calendar\/render\?/);
  });

  it("encodes the event date range as YYYYMMDDTHHMMSSZ/YYYYMMDDTHHMMSSZ", () => {
    const u = new URL(url);
    expect(u.searchParams.get("dates")).toBe("20250523T030000Z/20250524T110000Z");
  });

  it("includes the title, location, and description", () => {
    const u = new URL(url);
    expect(u.searchParams.get("text")).toBe("#031 Bangalore → Coffee Nadu");
    expect(u.searchParams.get("location")).toBe("Indiranagar Metro, Bangalore; gate 2");
    expect(u.searchParams.get("details")).toContain("Lead: Ahmed");
  });

  it("uses action=TEMPLATE so the user can save without further setup", () => {
    const u = new URL(url);
    expect(u.searchParams.get("action")).toBe("TEMPLATE");
  });
});
