"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { api } from "@/lib/api-client";

interface UserData {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  avatar?: string | null;
  role: string;
  joinDate: string;
  isApproved: boolean;
  city?: string | null;
  ridingExperience?: string | null;
  totalKm: number;
  ridesCompleted: number;
  motorcycles: Array<{
    id: string;
    make: string;
    model: string;
    year: number;
    cc: number;
    color: string;
    nickname?: string | null;
  }>;
  earnedBadges: Array<{
    id: string;
    earnedDate: string;
    badge: {
      id: string;
      tier: string;
      name: string;
      description: string;
      minKm: number;
      icon: string;
      color: string;
    };
  }>;
}

interface AuthContextType {
  user: UserData | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: Record<string, unknown>) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const data = await api.auth.me() as { user: UserData };
      setUser(data.user);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    refreshUser().finally(() => setLoading(false));
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    const data = await api.auth.login(email, password) as { user: UserData };
    setUser(data.user);
  };

  const register = async (formData: Record<string, unknown>) => {
    const data = await api.auth.register(formData) as { user: UserData };
    setUser(data.user);
  };

  const logout = async () => {
    await api.auth.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
