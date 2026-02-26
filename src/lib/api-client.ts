const BASE = "";

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }

  return data as T;
}

// Auth
export const api = {
  auth: {
    login: (email: string, password: string) =>
      request("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),
    register: (data: Record<string, unknown>) =>
      request("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    me: () => request("/api/auth/me"),
    logout: () => request("/api/auth/logout", { method: "POST" }),
  },

  // Users
  users: {
    list: (params?: string) => request(`/api/users${params ? `?${params}` : ""}`),
    get: (id: string) => request(`/api/users/${id}`),
    update: (id: string, data: Record<string, unknown>) =>
      request(`/api/users/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request(`/api/users/${id}`, { method: "DELETE" }),
    approve: (id: string) =>
      request(`/api/users/${id}/approve`, { method: "POST" }),
    reject: (id: string) =>
      request(`/api/users/${id}/reject`, { method: "POST" }),
  },

  // Rides
  rides: {
    list: (params?: string) => request(`/api/rides${params ? `?${params}` : ""}`),
    get: (id: string) => request(`/api/rides/${id}`),
    create: (data: Record<string, unknown>) =>
      request("/api/rides", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) =>
      request(`/api/rides/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request(`/api/rides/${id}`, { method: "DELETE" }),
    register: (id: string, data?: Record<string, unknown>) =>
      request(`/api/rides/${id}/register`, {
        method: "POST",
        body: JSON.stringify(data || {}),
      }),
    unregister: (id: string) =>
      request(`/api/rides/${id}/register`, { method: "DELETE" }),
  },

  // Blogs
  blogs: {
    list: (params?: string) => request(`/api/blogs${params ? `?${params}` : ""}`),
    get: (id: string) => request(`/api/blogs/${id}`),
    create: (data: Record<string, unknown>) =>
      request("/api/blogs", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) =>
      request(`/api/blogs/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request(`/api/blogs/${id}`, { method: "DELETE" }),
  },

  // Motorcycles
  motorcycles: {
    list: () => request("/api/motorcycles"),
    create: (data: Record<string, unknown>) =>
      request("/api/motorcycles", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Record<string, unknown>) =>
      request(`/api/motorcycles/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request(`/api/motorcycles/${id}`, { method: "DELETE" }),
  },

  // Notifications
  notifications: {
    list: () => request("/api/notifications"),
    markRead: (id: string) =>
      request(`/api/notifications/${id}/read`, { method: "PATCH" }),
  },

  // Guidelines
  guidelines: {
    list: () => request("/api/guidelines"),
    create: (data: Record<string, unknown>) =>
      request("/api/guidelines", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },

  // Dashboard
  dashboard: {
    stats: () => request("/api/dashboard/stats"),
  },

  // Admin
  admin: {
    stats: () => request("/api/admin/stats"),
    content: {
      list: () => request("/api/admin/content"),
      create: (data: Record<string, unknown>) =>
        request("/api/admin/content", {
          method: "POST",
          body: JSON.stringify(data),
        }),
      update: (id: string, data: Record<string, unknown>) =>
        request(`/api/admin/content/${id}`, {
          method: "PATCH",
          body: JSON.stringify(data),
        }),
      delete: (id: string) =>
        request(`/api/admin/content/${id}`, { method: "DELETE" }),
    },
  },

  // Seed
  seed: () => request("/api/seed", { method: "POST" }),
};
