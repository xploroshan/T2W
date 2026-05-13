import React from "react";
import { ActivityIndicator, Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, Stack } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Screen } from "@/components/Screen";
import { apiFetch } from "@/api/client";
import { colors, radius, spacing, text } from "@/theme";

type BlogDetail = {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  coverImage: string | null;
  authorName: string;
  authorAvatar: string | null;
  readTime: number;
  publishDate: string;
  videoUrl: string | null;
  isVlog: boolean;
  type: string;
  tags: string[];
  likes: number;
};

export default function BlogDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useQuery({
    queryKey: ["blog", id],
    queryFn: () => apiFetch<{ blog: BlogDetail }>(`/api/v1/blogs/${id}`),
  });

  if (q.isLoading || !q.data) {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </Screen>
    );
  }
  const b = q.data.blog;

  return (
    <Screen edges={["left", "right"]}>
      <Stack.Screen options={{ title: b.title }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        {b.coverImage ? <Image source={{ uri: b.coverImage }} style={styles.cover} /> : null}
        <View style={styles.padding}>
          <Text style={text.h1}>{b.title}</Text>
          <Text style={[text.bodySecondary, { marginTop: spacing.xs }]}>
            {b.authorName} · {new Date(b.publishDate).toLocaleDateString()} · {b.readTime} min
          </Text>
          {b.isVlog && b.videoUrl ? (
            <Pressable onPress={() => Linking.openURL(b.videoUrl!)}>
              <Text style={[text.body, { color: colors.primary, marginTop: spacing.sm }]}>
                Watch vlog →
              </Text>
            </Pressable>
          ) : null}
          <Text style={[text.body, { marginTop: spacing.lg, lineHeight: 22 }]}>{b.content}</Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: spacing.xl },
  cover: { width: "100%", height: 220, backgroundColor: colors.card },
  padding: { padding: spacing.lg, gap: spacing.xs },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
});
