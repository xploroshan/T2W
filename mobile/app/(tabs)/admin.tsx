import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, ClipboardList, ListChecks, Users } from "lucide-react-native";
import { Screen } from "@/components/Screen";
import { listAdminUsers } from "@/api/admin";
import { listRides } from "@/api/rides";
import { colors, radius, spacing, text } from "@/theme";

export default function AdminHome() {
  const pendingUsers = useQuery({
    queryKey: ["admin", "pending-count"],
    queryFn: () => listAdminUsers({ status: "pending" }),
  });
  const ridesUpcoming = useQuery({
    queryKey: ["rides", "upcoming-admin"],
    queryFn: () => listRides({ status: "upcoming", limit: 50 }),
  });

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={text.h2}>Admin</Text>
        <Text style={[text.bodySecondary, { marginTop: spacing.xs }]}>
          Moderation surfaces for core members and super admins.
        </Text>

        <View style={styles.statsRow}>
          <StatCard
            label="Pending users"
            value={pendingUsers.data?.items.length ?? "—"}
            onPress={() => router.push("/admin/users")}
          />
          <StatCard
            label="Upcoming rides"
            value={ridesUpcoming.data?.items.length ?? "—"}
            onPress={() => router.push("/rides")}
          />
        </View>

        <Text style={[text.h3, styles.section]}>Quick actions</Text>
        <Row
          icon={<Users color={colors.primary} size={20} />}
          label="User approval queue"
          sublabel="Approve, reject, or change roles for pending riders"
          onPress={() => router.push("/admin/users")}
        />
        <Row
          icon={<ListChecks color={colors.primary} size={20} />}
          label="Pending ride registrations"
          sublabel="Approve / reject riders per ride"
          onPress={() => router.push("/admin/registrations")}
        />
        <Row
          icon={<ClipboardList color={colors.primary} size={20} />}
          label="Activity log"
          sublabel="Audit trail of admin actions"
          onPress={() => router.push("/admin/activity-log")}
        />

        <Text style={[text.caption, { marginTop: spacing.lg }]}>
          Heavier admin surfaces (ride CRUD, site settings, scheduled emails)
          remain on the web for now. They'll come to mobile in Phase 3.
        </Text>
      </ScrollView>
    </Screen>
  );
}

function StatCard({
  label,
  value,
  onPress,
}: {
  label: string;
  value: number | string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.stat, pressed && { opacity: 0.85 }]}
    >
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Pressable>
  );
}

function Row({
  icon,
  label,
  sublabel,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  sublabel: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}>
      <View style={styles.rowIcon}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={text.body}>{label}</Text>
        <Text style={text.caption}>{sublabel}</Text>
      </View>
      <ChevronRight color={colors.textSecondary} size={18} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xl },
  statsRow: { flexDirection: "row", gap: spacing.md, marginTop: spacing.md },
  stat: {
    flex: 1,
    backgroundColor: colors.bgElevated,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    alignItems: "center",
  },
  statValue: { color: colors.primary, fontSize: 28, fontWeight: "700" },
  statLabel: { color: colors.textSecondary, fontSize: 12, marginTop: spacing.xs },
  section: { marginTop: spacing.lg },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bgElevated,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
  },
});
