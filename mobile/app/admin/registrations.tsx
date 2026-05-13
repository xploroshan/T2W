import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack, router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Screen } from "@/components/Screen";
import { listRides } from "@/api/rides";
import { colors, radius, spacing, text } from "@/theme";
import type { RideListItem } from "@/api/types";

/**
 * Admin registrations index — pick a ride, then drill into per-ride approval
 * at /admin/registrations/[rideId]. We list upcoming + ongoing rides; older
 * rides rarely have anything to moderate.
 */
export default function AdminRegistrationsIndex() {
  const upcoming = useQuery({
    queryKey: ["admin", "rides-upcoming"],
    queryFn: () => listRides({ status: "upcoming", limit: 50 }),
  });
  const ongoing = useQuery({
    queryKey: ["admin", "rides-ongoing"],
    queryFn: () => listRides({ status: "ongoing", limit: 20 }),
  });

  const rides: RideListItem[] = [
    ...(ongoing.data?.items ?? []),
    ...(upcoming.data?.items ?? []),
  ];

  return (
    <Screen>
      <Stack.Screen options={{ title: "Registrations" }} />
      {upcoming.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={rides}
          keyExtractor={(r) => r.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/admin/registrations/${item.id}`)}
              style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}
            >
              <Text style={text.h3}>{item.title}</Text>
              <Text style={text.caption}>
                #{item.rideNumber} · {new Date(item.startDate).toLocaleDateString()} · {item.registeredRiders}/{item.maxRiders}
              </Text>
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={text.bodySecondary}>No upcoming or ongoing rides.</Text>
            </View>
          }
          refreshing={upcoming.isRefetching || ongoing.isRefetching}
          onRefresh={() => {
            upcoming.refetch();
            ongoing.refetch();
          }}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.xl },
  card: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
});
