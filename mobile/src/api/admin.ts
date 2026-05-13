import { apiFetch } from "./client";

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  isApproved: boolean;
  city: string | null;
  ridingExperience: string | null;
  joinDate: string;
};

export type AdminRegistration = {
  id: string;
  userId: string;
  riderName: string;
  email: string;
  phone: string;
  bloodGroup: string;
  vehicleModel: string;
  vehicleRegNumber: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  accommodationType: string;
  approvalStatus: "pending" | "confirmed" | "rejected" | "dropout";
  paymentScreenshot: string | null;
  upiTransactionId: string | null;
  confirmationCode: string | null;
  registeredAt: string;
};

export type ActivityEntry = {
  id: string;
  action: string;
  performedBy: string;
  performedByName: string;
  targetId: string;
  targetName: string;
  details: string | null;
  hasRollback: boolean;
  createdAt: string;
};

export async function listAdminUsers(opts: {
  status?: "pending" | "active";
  search?: string;
  cursor?: string;
} = {}) {
  return apiFetch<{ items: AdminUser[]; nextCursor: string | null }>("/api/v1/admin/users", {
    query: { status: opts.status, search: opts.search, cursor: opts.cursor },
  });
}

export async function approveUser(id: string) {
  return apiFetch<{ success: true }>(`/api/v1/admin/users/${id}/approve`, {
    method: "POST",
    body: {},
  });
}

export async function rejectUser(id: string) {
  return apiFetch<{ success: true }>(`/api/v1/admin/users/${id}/reject`, {
    method: "POST",
    body: {},
  });
}

export async function changeUserRole(id: string, newRole: string) {
  return apiFetch<{ success: true; newRole: string }>(`/api/v1/admin/users/${id}/role`, {
    method: "PATCH",
    body: { newRole },
  });
}

export async function listRideRegistrations(rideId: string, status?: AdminRegistration["approvalStatus"]) {
  return apiFetch<{ items: AdminRegistration[] }>(`/api/v1/admin/rides/${rideId}/registrations`, {
    query: { status },
  });
}

export async function moderateRegistration(
  regId: string,
  body: { approvalStatus?: "confirmed" | "rejected" | "dropout"; accommodationType?: "bed" },
) {
  return apiFetch<{ registration: { id: string; approvalStatus: string } }>(
    `/api/v1/admin/registrations/${regId}`,
    { method: "PATCH", body },
  );
}

export async function listActivityLog(cursor?: string) {
  return apiFetch<{ items: ActivityEntry[]; nextCursor: string | null }>(
    `/api/v1/admin/activity-log`,
    { query: { cursor } },
  );
}

export async function rollbackActivity(id: string) {
  return apiFetch<{ success: true }>(`/api/v1/admin/activity-log/${id}/rollback`, {
    method: "POST",
    body: {},
  });
}

export type CreateRidePayload = {
  title: string;
  type?: string;
  startDate: string;
  endDate: string;
  startLocation: string;
  startLocationUrl?: string;
  endLocation: string;
  endLocationUrl?: string;
  distanceKm?: number;
  maxRiders?: number;
  extraBedSlots?: number;
  difficulty?: string;
  description?: string;
  highlights?: string[];
  posterUrl?: string;
  fee?: number;
  leadRider?: string;
  sweepRider?: string;
  organisedBy?: string;
  accountsBy?: string;
  meetupTime?: string;
  rideStartTime?: string;
  startingPoint?: string;
  regOpenCore?: string;
  regOpenT2w?: string;
  regOpenRider?: string;
};

export async function createRide(body: CreateRidePayload) {
  return apiFetch<{ ride: { id: string; rideNumber: string } }>("/api/v1/admin/rides", {
    method: "POST",
    body,
  });
}

export async function updateRide(
  id: string,
  body: Partial<CreateRidePayload> & { status?: string; detailsVisible?: boolean },
) {
  return apiFetch<{ ride: { id: string; rideNumber: string } }>(`/api/v1/admin/rides/${id}`, {
    method: "PATCH",
    body,
  });
}

export async function deleteRide(id: string) {
  return apiFetch<{ success: true }>(`/api/v1/admin/rides/${id}`, { method: "DELETE" });
}

export async function getSetting<T = unknown>(key: string) {
  return apiFetch<{ key: string; value: T | null }>(
    `/api/v1/site-settings/${encodeURIComponent(key)}`,
  );
}

export async function putSetting(key: string, value: unknown) {
  return apiFetch<{ success: true; key: string }>(
    `/api/v1/site-settings/${encodeURIComponent(key)}`,
    { method: "PUT", body: { value } },
  );
}

export type PostRideSummary = {
  session: { id: string; status: string; startedAt: string | null; endedAt: string | null };
  group: {
    distanceKm: number;
    elapsedMinutes: number;
    movingMinutes: number;
    breakMinutes: number;
    closedBreaks: number;
    avgSpeedKmh: number;
    maxSpeedKmh: number;
  };
  me: {
    distanceKm: number;
    avgSpeedKmh: number;
    maxSpeedKmh: number;
    hasPath: boolean;
  };
  splits: Array<{
    index: number;
    distanceKm: number;
    durationSec: number;
    avgSpeedKmh: number;
    elevGainM: number | null;
    elevLossM: number | null;
  }>;
  elevation: {
    minM: number;
    maxM: number;
    netM: number;
    gainM: number;
    lossM: number;
  } | null;
};

export async function getPostRideSummary(rideId: string) {
  return apiFetch<PostRideSummary>(`/api/v1/rides/${rideId}/post-ride-summary`);
}
