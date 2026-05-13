import React from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack, useLocalSearchParams, router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Screen } from "@/components/Screen";
import { Button } from "@/components/Button";
import { MetricsBar } from "@/components/MetricsBar";
import { getPostRideSummary } from "@/api/admin";
import { colors, radius, spacing, text } from "@/theme";

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

export default function PostRideSummaryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useQuery({
    queryKey: ["post-ride-summary", id],
    queryFn: () => getPostRideSummary(id),
    enabled: typeof id === "string",
  });

  if (q.isLoading || !q.data) {
    return (
      <Screen>
        <View style={styles.center}>
          {q.isError ? (
            <Text style={text.bodySecondary}>Couldn't load the summary.</Text>
          ) : (
            <ActivityIndicator color={colors.primary} />
          )}
        </View>
      </Screen>
    );
  }

  const s = q.data;

  return (
    <Screen>
      <Stack.Screen options={{ title: "Ride summary" }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={text.h2}>Group total</Text>
        <MetricsBar
          metrics={[
            { label: "Distance", value: `${s.group.distanceKm} km` },
            { label: "Moving", value: formatDuration(s.group.movingMinutes) },
            { label: "Avg", value: `${s.group.avgSpeedKmh} km/h` },
          ]}
        />
        <MetricsBar
          metrics={[
            { label: "Elapsed", value: formatDuration(s.group.elapsedMinutes) },
            { label: "Breaks", value: `${s.group.closedBreaks}` },
            { label: "Max", value: `${s.group.maxSpeedKmh} km/h` },
          ]}
        />

        {s.me.hasPath ? (
          <>
            <Text style={[text.h3, styles.section]}>Your ride</Text>
            <MetricsBar
              metrics={[
                { label: "Distance", value: `${s.me.distanceKm} km` },
                { label: "Avg", value: `${s.me.avgSpeedKmh} km/h` },
                { label: "Max", value: `${s.me.maxSpeedKmh} km/h` },
              ]}
            />
          </>
        ) : (
          <Text style={[text.bodySecondary, { marginTop: spacing.md }]}>
            You didn't track GPS on this ride, so we don't have a personal
            breakdown.
          </Text>
        )}

        {s.elevation ? (
          <>
            <Text style={[text.h3, styles.section]}>Elevation</Text>
            <View style={styles.elevCard}>
              <ElevRow label="Total gain" value={`${s.elevation.gainM} m`} />
              <ElevRow label="Total loss" value={`${s.elevation.lossM} m`} />
              <ElevRow label="Net" value={`${s.elevation.netM} m`} />
              <ElevRow label="Min / max" value={`${s.elevation.minM} / ${s.elevation.maxM} m`} />
            </View>
          </>
        ) : null}

        {s.splits.length > 0 ? (
          <>
            <Text style={[text.h3, styles.section]}>Splits (per km)</Text>
            <View style={styles.splitsCard}>
              <View style={styles.splitsHeader}>
                <Text style={[styles.splitCell, styles.splitHeadText]}>Km</Text>
                <Text style={[styles.splitCell, styles.splitHeadText, { textAlign: "right" }]}>Time</Text>
                <Text style={[styles.splitCell, styles.splitHeadText, { textAlign: "right" }]}>Avg km/h</Text>
              </View>
              {s.splits.map((sp) => (
                <View key={sp.index} style={styles.splitRow}>
                  <Text style={styles.splitCell}>{sp.index + 1}</Text>
                  <Text style={[styles.splitCell, { textAlign: "right" }]}>
                    {Math.floor(sp.durationSec / 60)}:{(sp.durationSec % 60).toString().padStart(2, "0")}
                  </Text>
                  <Text style={[styles.splitCell, { textAlign: "right" }]}>
                    {sp.avgSpeedKmh.toFixed(1)}
                  </Text>
                </View>
              ))}
            </View>
          </>
        ) : null}

        <Button
          label="Share this ride"
          onPress={() => router.push(`/ride/${id}/share`)}
          style={{ marginTop: spacing.lg }}
        />
        <Button
          label="Back to ride"
          variant="secondary"
          onPress={() => router.replace(`/ride/${id}`)}
          style={{ marginTop: spacing.sm }}
        />
      </ScrollView>
    </Screen>
  );
}

function ElevRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.elevRow}>
      <Text style={text.bodySecondary}>{label}</Text>
      <Text style={text.body}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, paddingBottom: spacing.xl, gap: spacing.sm },
  section: { marginTop: spacing.lg },
  elevCard: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  elevRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.xs,
  },
  splitsCard: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },
  splitsHeader: {
    flexDirection: "row",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  splitRow: {
    flexDirection: "row",
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  splitCell: { flex: 1, color: colors.textPrimary, fontSize: 14 },
  splitHeadText: { color: colors.textSecondary, fontSize: 12, textTransform: "uppercase" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
});
