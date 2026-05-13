import React from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";
import { Stack } from "expo-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Screen } from "@/components/Screen";
import { listActivityLog } from "@/api/admin";
import { colors, radius, spacing, text } from "@/theme";

export default function ActivityLogScreen() {
  const q = useInfiniteQuery({
    queryKey: ["admin", "activity-log"],
    queryFn: ({ pageParam }) => listActivityLog(pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
  const items = q.data?.pages.flatMap((p) => p.items) ?? [];

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
            <View style={styles.row}>
              <View style={styles.head}>
                <Text style={styles.action}>{item.action}</Text>
                <Text style={text.caption}>
                  {new Date(item.createdAt).toLocaleString()}
                </Text>
              </View>
              <Text style={text.bodySecondary}>
                {item.performedByName} → {item.targetName}
              </Text>
              {item.details ? <Text style={text.caption}>{item.details}</Text> : null}
            </View>
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
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
});
