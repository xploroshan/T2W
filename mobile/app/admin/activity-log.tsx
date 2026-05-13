import React from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Stack } from "expo-router";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Screen } from "@/components/Screen";
import { listActivityLog, rollbackActivity, type ActivityEntry } from "@/api/admin";
import { ApiClientError } from "@/api/client";
import { useAuth } from "@/auth/AuthProvider";
import { colors, radius, spacing, text } from "@/theme";

const ROLLBACKABLE_ACTIONS = new Set([
  "ride_edited",
  "ride_deleted",
  "user_role_changed",
  "user_deleted",
]);

export default function ActivityLogScreen() {
  const qc = useQueryClient();
  const auth = useAuth();
  const q = useInfiniteQuery({
    queryKey: ["admin", "activity-log"],
    queryFn: ({ pageParam }) => listActivityLog(pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
  const items = q.data?.pages.flatMap((p) => p.items) ?? [];

  const rollback = useMutation({
    mutationFn: rollbackActivity,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "activity-log"] }),
    onError: (err) => {
      Alert.alert(
        "Rollback failed",
        err instanceof ApiClientError ? err.message : "Unknown error",
      );
    },
  });

  const isSuper = auth.status === "authed" && auth.user.role === "superadmin";

  return (
    <Screen>
      <Stack.Screen options={{ title: "Activity log" }} />
      {q.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Entry
              entry={item}
              isSuper={isSuper}
              busy={rollback.isPending && rollback.variables === item.id}
              onRollback={() =>
                Alert.alert(
                  "Roll back this action?",
                  `${item.action} — ${item.targetName}`,
                  [
                    { text: "Cancel" },
                    {
                      text: "Roll back",
                      style: "destructive",
                      onPress: () => rollback.mutate(item.id),
                    },
                  ],
                )
              }
            />
          )}
          onEndReached={() => {
            if (q.hasNextPage && !q.isFetchingNextPage) q.fetchNextPage();
          }}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            q.isFetchingNextPage ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.md }} />
            ) : null
          }
          refreshing={q.isRefetching}
          onRefresh={() => q.refetch()}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={text.bodySecondary}>No activity yet.</Text>
            </View>
          }
        />
      )}
    </Screen>
  );
}

function Entry({
  entry,
  isSuper,
  busy,
  onRollback,
}: {
  entry: ActivityEntry;
  isSuper: boolean;
  busy: boolean;
  onRollback: () => void;
}) {
  const alreadyRolled = entry.details?.includes("[ROLLED BACK]");
  const canRollback =
    isSuper && entry.hasRollback && !alreadyRolled && ROLLBACKABLE_ACTIONS.has(entry.action);

  return (
    <View style={styles.row}>
      <View style={styles.head}>
        <Text style={styles.action}>{entry.action}</Text>
        <Text style={text.caption}>{new Date(entry.createdAt).toLocaleString()}</Text>
      </View>
      <Text style={text.bodySecondary}>
        {entry.performedByName} → {entry.targetName}
      </Text>
      {entry.details ? <Text style={text.caption}>{entry.details}</Text> : null}
      {canRollback ? (
        <Pressable
          onPress={onRollback}
          disabled={busy}
          style={[styles.rollbackBtn, busy && { opacity: 0.5 }]}
        >
          {busy ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Text style={styles.rollbackText}>Roll back</Text>
          )}
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.xl },
  row: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
  },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  action: {
    color: colors.primary,
    fontFamily: "monospace",
    fontWeight: "700",
    fontSize: 13,
  },
  rollbackBtn: {
    alignSelf: "flex-start",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    marginTop: spacing.xs,
  },
  rollbackText: { color: colors.primary, fontWeight: "600", fontSize: 13 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
});
