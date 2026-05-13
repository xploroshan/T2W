import { apiFetch } from "./client";
import type { RideDetail, RideListItem } from "./types";

export type LiveSession = {
  id: string;
  rideId: string;
  status: "live" | "paused" | "ended";
  startedAt: string | null;
  endedAt: string | null;
  leadRiderId: string | null;
  sweepRiderId: string | null;
  plannedRoute: Array<{ lat: number; lng: number }> | null;
  breaks: Array<{ id: string; startedAt: string; endedAt: string | null; reason: string | null }>;
};

export type LiveRider = {
  userId: string;
  userName: string;
  userAvatar: string | null;
  lat: number;
  lng: number;
  speed: number | null;
  heading: number | null;
  isDeviated: boolean;
  isLead: boolean;
  isSweep: boolean;
  recordedAt: string;
};

export type LivePathPoint = {
  lat: number;
  lng: number;
  recordedAt: string;
  speed: number | null;
  accuracy: number | null;
};

export type LiveMetrics = {
  session: { status: string; startedAt: string | null; endedAt: string | null };
  group: {
    distanceKm: number;
    elapsedMinutes: number;
    movingMinutes: number;
    breakMinutes: number;
    closedBreaks: number;
    activeBreak: boolean;
    avgSpeedKmh: number;
    maxSpeedKmh: number;
    riderCount: number;
  };
  me: {
    distanceKm: number;
    movingMinutes: number;
    avgSpeedKmh: number;
    maxSpeedKmh: number;
    hasPath: boolean;
  };
};

export type RideListPage = {
  items: RideListItem[];
  nextCursor: string | null;
};

export async function listRides(opts: {
  status?: "upcoming" | "ongoing" | "completed" | "cancelled" | "all";
  cursor?: string;
  limit?: number;
} = {}): Promise<RideListPage> {
  return apiFetch<RideListPage>("/api/v1/rides", {
    query: { status: opts.status, cursor: opts.cursor, limit: opts.limit },
  });
}

export async function getRide(id: string): Promise<RideDetail> {
  const res = await apiFetch<{ ride: RideDetail }>(`/api/v1/rides/${id}`);
  return res.ride;
}

export type LiveLocationPoint = {
  lat: number;
  lng: number;
  speed?: number | null;
  heading?: number | null;
  accuracy?: number | null;
  recordedAt?: string;
};

export async function postLiveLocations(rideId: string, points: LiveLocationPoint[]) {
  return apiFetch<{ accepted: number; rejected: Array<{ index: number; reason: string }>; anyDeviation: boolean }>(
    `/api/v1/rides/${rideId}/live/location`,
    { method: "POST", body: { points } },
  );
}

export async function getLive(rideId: string, since?: string | null) {
  return apiFetch<{
    session: LiveSession | null;
    riders: LiveRider[];
    leadPath: LivePathPoint[];
    myPath: LivePathPoint[];
  }>(`/api/v1/rides/${rideId}/live`, { query: { since } });
}

export async function joinLive(rideId: string) {
  return apiFetch<{
    session: Pick<LiveSession, "id" | "rideId" | "status" | "startedAt" | "leadRiderId" | "sweepRiderId">;
    isLead: boolean;
    isSweep: boolean;
  }>(`/api/v1/rides/${rideId}/live/join`, { method: "POST", body: {} });
}

export async function getLiveMetrics(rideId: string) {
  return apiFetch<LiveMetrics>(`/api/v1/rides/${rideId}/live/metrics`);
}

export async function postBreak(rideId: string, action: "start" | "end", reason?: string) {
  return apiFetch<{ break: { id: string; startedAt: string; endedAt: string | null; reason: string | null } }>(
    `/api/v1/rides/${rideId}/live/break`,
    { method: "POST", body: { action, reason } },
  );
}

export type RegistrationBody = {
  riderName?: string;
  email?: string;
  phone?: string;
  address?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  bloodGroup?: string;
  referredBy?: string;
  foodPreference?: string;
  ridingType?: string;
  vehicleModel?: string;
  vehicleRegNumber?: string;
  tshirtSize?: string;
  agreedCancellationTerms: boolean;
  agreedIndemnity: boolean;
  paymentScreenshot?: string;
  upiTransactionId?: string;
};

export async function registerForRide(rideId: string, body: RegistrationBody) {
  return apiFetch<{
    registration: {
      id: string;
      confirmationCode: string | null;
      approvalStatus: string;
      accommodationType: string | null;
      registeredAt: string;
    };
  }>(`/api/v1/rides/${rideId}/register`, { method: "POST", body });
}
