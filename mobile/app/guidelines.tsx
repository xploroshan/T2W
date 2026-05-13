import React from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { Screen } from "@/components/Screen";
import { listGuidelines } from "@/api/misc";
import { colors, radius, spacing, text } from "@/theme";

export default function GuidelinesScreen() {
  const q = useQuery({ queryKey: ["guidelines"], queryFn: listGuidelines });

  return (
    <Screen>
      <Stack.Screen options={{ title: "Riding guidelines" }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        {q.isLoading ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          (q.data?.guidelines ?? []).map((g) => (
            <View key={g.id} style={styles.card}>
              <View style={styles.head}>
                <Text style={styles.icon}>{g.icon || "🛣️"}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={text.h3}>{g.title}</Text>
                  {g.category ? <Text style={text.caption}>{g.category}</Text> : null}
                </View>
              </View>
              <Text style={[text.body, { marginTop: spacing.sm }]}>{g.content}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.md, paddingBottom: spacing.xl, gap: spacing.md },
  card: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  head: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  icon: { fontSize: 24 },
});
