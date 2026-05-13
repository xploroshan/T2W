import React from "react";
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Stack, router } from "expo-router";
import { Plus } from "lucide-react-native";
import { Screen } from "@/components/Screen";
import { listBlogs } from "@/api/misc";
import { useAuth } from "@/auth/AuthProvider";
import { colors, radius, spacing, text } from "@/theme";

export default function BlogsScreen() {
  const auth = useAuth();
  const canPost =
    auth.status === "authed" &&
    ["superadmin", "core_member", "t2w_rider"].includes(auth.user.role);

  const q = useInfiniteQuery({
    queryKey: ["blogs"],
    queryFn: ({ pageParam }) => listBlogs(pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });

  const items = q.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <Screen>
      <Stack.Screen
        options={{
          title: "Blogs",
          headerRight: () =>
            canPost ? (
              <Pressable hitSlop={10} onPress={() => router.push("/blog/new")}>
                <Plus color={colors.primary} size={22} />
              </Pressable>
            ) : null,
        }}
      />
      {q.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(b) => b.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/blog/${item.id}`)}
              style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}
            >
              {item.coverImage ? (
                <Image source={{ uri: item.coverImage }} style={styles.cover} />
              ) : null}
              <View style={styles.body}>
                <Text style={text.h3} numberOfLines={2}>{item.title}</Text>
                <Text style={text.bodySecondary} numberOfLines={2}>{item.excerpt}</Text>
                <Text style={text.caption}>
                  {item.authorName} · {item.readTime} min{item.isVlog ? " · vlog" : ""}
                </Text>
              </View>
            </Pressable>
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
              <Text style={text.bodySecondary}>No blogs yet.</Text>
            </View>
          }
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.md, paddingBottom: spacing.xl, gap: spacing.md },
  card: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  cover: { width: "100%", height: 180, backgroundColor: colors.card },
  body: { padding: spacing.md, gap: spacing.xs },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
});
