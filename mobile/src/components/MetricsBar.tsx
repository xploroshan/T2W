import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing } from "@/theme";

type Metric = { label: string; value: string };

export function MetricsBar({ metrics }: { metrics: Metric[] }) {
  return (
    <View style={styles.bar}>
      {metrics.map((m, i) => (
        <View
          key={m.label}
          style={[styles.cell, i < metrics.length - 1 && styles.cellDivider]}
        >
          <Text style={styles.value}>{m.value}</Text>
          <Text style={styles.label}>{m.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    backgroundColor: colors.bgElevated,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
  },
  cell: { flex: 1, alignItems: "center", paddingVertical: spacing.xs },
  cellDivider: { borderRightWidth: 1, borderRightColor: colors.border },
  value: { color: colors.textPrimary, fontSize: 20, fontWeight: "700" },
  label: { color: colors.textSecondary, fontSize: 11, marginTop: 2, textTransform: "uppercase" },
});
