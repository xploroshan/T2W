import { describe, it, expect, vi, beforeEach } from "vitest";
import { createNextRequest } from "@/__tests__/helpers";

vi.mock("@/lib/db", () => ({
  prisma: {
    ride: { findUnique: vi.fn() },
  },
}));

import { GET } from "@/app/api/rides/[id]/ics/route";
import { prisma } from "@/lib/db";

const makeParams = () => ({ params: Promise.resolve({ id: "ride-1" }) });

describe("GET /api/rides/:id/ics", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns text/calendar with an attachment header when the ride exists", async () => {
    vi.mocked(prisma.ride.findUnique).mockResolvedValue({
      id: "ride-1",
      rideNumber: "#031",
      title: "Bangalore to Coffee Nadu",
      description: "Coffee plantation ride",
      startDate: new Date("2025-05-23T03:00:00Z"),
      endDate: new Date("2025-05-24T11:00:00Z"),
      startLocation: "Bangalore",
      startingPoint: "Indiranagar Metro",
      leadRider: "Ahmed",
      distanceKm: 500,
      fee: 2650,
    } as any);

    const req = createNextRequest("http://localhost:3000/api/rides/ride-1/ics");
    const res = await GET(req, makeParams());
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/calendar");
    const disp = res.headers.get("content-disposition");
    expect(disp).toContain("attachment");
    expect(disp).toContain(".ics");
    const body = await res.text();
    expect(body).toContain("BEGIN:VCALENDAR");
    expect(body).toContain("UID:t2w-ride-ride-1@taleson2wheels.com");
    expect(body).toContain("DTSTART:20250523T030000Z");
  });

  it("returns 404 when the ride does not exist", async () => {
    vi.mocked(prisma.ride.findUnique).mockResolvedValue(null);
    const req = createNextRequest("http://localhost:3000/api/rides/missing/ics");
    const res = await GET(req, { params: Promise.resolve({ id: "missing" }) });
    expect(res.status).toBe(404);
  });

  it("does not require authentication (calendar export is public)", async () => {
    // The route handler never calls getCurrentUser. Sanity check: we got
    // here without mocking auth, which would otherwise throw.
    vi.mocked(prisma.ride.findUnique).mockResolvedValue({
      id: "ride-1",
      rideNumber: "#001",
      title: "Public Ride",
      description: "",
      startDate: new Date(),
      endDate: new Date(),
      startLocation: "",
      startingPoint: null,
      leadRider: "",
      distanceKm: 0,
      fee: 0,
    } as any);
    const req = createNextRequest("http://localhost:3000/api/rides/ride-1/ics");
    const res = await GET(req, makeParams());
    expect(res.status).toBe(200);
  });
});
