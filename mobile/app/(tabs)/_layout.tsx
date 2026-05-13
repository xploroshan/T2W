import React from "react";
import { Tabs } from "expo-router";
import { Home, MapPin, Shield, Trophy, User } from "lucide-react-native";
import { useAuth } from "@/auth/AuthProvider";
import { colors } from "@/theme";

export default function TabsLayout() {
  const auth = useAuth();
  const isAdmin =
    auth.status === "authed" &&
    (auth.user.role === "superadmin" || auth.user.role === "core_member");

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: { backgroundColor: colors.bgElevated, borderTopColor: colors.border },
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.textPrimary,
        headerTitleStyle: { fontWeight: "700" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="rides"
        options={{
          title: "Rides",
          tabBarIcon: ({ color, size }) => <MapPin color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{
          title: "Arena",
          tabBarIcon: ({ color, size }) => <Trophy color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          title: "Admin",
          // Hide from the bar entirely for non-admins instead of showing a
          // disabled tab — keeps the bar clean for regular riders.
          href: isAdmin ? "/(tabs)/admin" : null,
          tabBarIcon: ({ color, size }) => <Shield color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
