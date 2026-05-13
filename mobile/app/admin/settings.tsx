import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Screen } from "@/components/Screen";
import { Button } from "@/components/Button";
import { TextField } from "@/components/TextField";
import { getSetting, putSetting } from "@/api/admin";
import { ApiClientError } from "@/api/client";
import { colors, spacing, text } from "@/theme";

type UpiConfig = {
  upiId?: string;
  payeeName?: string;
  qrUrl?: string;
};

export default function AdminSettingsScreen() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["site-settings", "upi_config"],
    queryFn: () => getSetting<UpiConfig>("upi_config"),
  });

  const [upiId, setUpiId] = useState("");
  const [payeeName, setPayeeName] = useState("");
  const [qrUrl, setQrUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (q.data?.value) {
      setUpiId(q.data.value.upiId ?? "");
      setPayeeName(q.data.value.payeeName ?? "");
      setQrUrl(q.data.value.qrUrl ?? "");
    }
  }, [q.data?.value]);

  const save = useMutation({
    mutationFn: () =>
      putSetting("upi_config", {
        upiId: upiId.trim(),
        payeeName: payeeName.trim(),
        qrUrl: qrUrl.trim(),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["site-settings"] });
      Alert.alert("Saved", "UPI config updated.");
    },
    onError: (err) => {
      setError(err instanceof ApiClientError ? err.message : "Failed to save settings.");
    },
  });

  return (
    <Screen>
      <Stack.Screen options={{ title: "Site settings" }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={text.h2}>UPI config</Text>
          <Text style={text.bodySecondary}>
            These are used on the mobile registration screen's "Pay to" card and
            the auto-generated UPI QR.
          </Text>

          {q.isLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.lg }} />
          ) : (
            <>
              <TextField
                label="UPI ID"
                value={upiId}
                onChangeText={setUpiId}
                autoCapitalize="none"
                placeholder="something@bank"
              />
              <TextField
                label="Payee name"
                value={payeeName}
                onChangeText={setPayeeName}
                placeholder="Tales on 2 Wheels"
              />
              <TextField
                label="QR image URL (optional override)"
                value={qrUrl}
                onChangeText={setQrUrl}
                autoCapitalize="none"
                placeholder="https://…"
              />
            </>
          )}

          {error ? (
            <Text style={{ color: colors.danger, marginTop: spacing.sm }}>{error}</Text>
          ) : null}

          <Button
            label={save.isPending ? "Saving…" : "Save"}
            onPress={() => save.mutate()}
            loading={save.isPending}
            style={{ marginTop: spacing.md }}
          />

          <Text style={[text.caption, { marginTop: spacing.lg }]}>
            Other settings (registration form fields, role permissions, email
            templates) still live on the web admin.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, paddingBottom: spacing.xl, gap: spacing.xs },
});
