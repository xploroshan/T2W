import React, { useState } from "react";
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Screen } from "@/components/Screen";
import { leaderboard } from "@/api/misc";
import { colors, radius, spacing, text } from "@/theme";

type Period = "6m" | "1y" | "all";

export default function LeaderboardScreen() {
  const [period, setPeriod] = useState<Period>("all");
  const q = useQuery({
    queryKey: ["leaderboard", period],
    queryFn: () => leaderboard(period),
  });

  return (
    <Screen>
      <View style={styles.filters}>
        {(["6m", "1y", "all"] as Period[]).map((p) => {
          const active = p === period;
          return (
            <Pressable
              key={p}
              onPress={() => setPeriod(p)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {p === "all" ? "All time" : p === "6m" ? "6 months" : "1 year"}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {q.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={q.data?.items ?? []}
          keyExtractor={(i) => i.id}
          contentContainerStyle={styles.list}
          renderItem={({ item, index }) => (
            <View style={styles.row}>
              <Text style={styles.rank}>{index + 1}</Text>
              {item.avatarUrl ? (
                <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarPh]}>
                  <Text style={styles.avatarInitial}>{item.name[0]?.toUpperCase()}</Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={text.body} numberOfLines={1}>{item.name}</Text>
                <Text style={text.caption}>
                  {item.totalKm.toFixed(0)} km · {item.ridesCount} rides
                  {item.ridesOrganized > 0 ? ` · ${item.ridesOrganized} org` : ""}
                </Text>
              </View>
              {item.badges.length > 0 ? (
                <View style={[styles.badgePill, { backgroundColor: item.badges[0].color || colors.card }]}>
                  <Text style={styles.badgePillText}>{item.badges[0].tier}</Text>
                </View>
              ) : null}
            </View>
          )}
          refreshing={q.isRefetching}
          onRefresh={() => q.refetch()}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={text.bodySecondary}>No riders to show.</Text>
            </View>
          }
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  filters: {
    flexDirection: "row",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.textSecondary, fontSize: 13, fontWeight: "600" },
  chipTextActive: { color: "#fff" },
  list: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl, gap: spacing.xs },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bgElevated,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  rank: { color: colors.primary, fontWeight: "700", width: 28, textAlign: "center" },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.card },
  avatarPh: { alignItems: "center", justifyContent: "center" },
  avatarInitial: { color: colors.primary, fontWeight: "700" },
  badgePill: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.pill },
  badgePillText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
});
