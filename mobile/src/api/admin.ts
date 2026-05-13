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
