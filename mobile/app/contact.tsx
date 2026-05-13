import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Stack, router } from "expo-router";
import { Screen } from "@/components/Screen";
import { Button } from "@/components/Button";
import { TextField } from "@/components/TextField";
import { sendContact } from "@/api/posts";
import { ApiClientError } from "@/api/client";
import { useAuth } from "@/auth/AuthProvider";
import { colors, radius, spacing, text } from "@/theme";

export default function ContactScreen() {
  const auth = useAuth();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    if (!subject.trim() || !message.trim()) {
      setError("Subject and message are required.");
      return;
    }
    setBusy(true);
    try {
      await sendContact(subject.trim(), message.trim());
      Alert.alert("Sent", "Thanks — the crew will get back to you.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to send message.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: "Contact crew" }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={text.bodySecondary}>
            We'll reply to{" "}
            <Text style={{ color: colors.textPrimary, fontWeight: "600" }}>
              {auth.status === "authed" ? auth.user.email : "your account email"}
            </Text>
            .
          </Text>
          <TextField label="Subject" value={subject} onChangeText={setSubject} />
          <Text style={[text.bodySecondary, { fontSize: 13, marginTop: spacing.sm }]}>
            Message
          </Text>
          <TextInput
            value={message}
            onChangeText={setMessage}
            multiline
            placeholderTextColor={colors.textMuted}
            placeholder="What's on your mind?"
            style={styles.messageInput}
          />
          {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
          <Button
            label={busy ? "Sending…" : "Send"}
            onPress={submit}
            loading={busy}
            style={{ marginTop: spacing.md }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, paddingBottom: spacing.xl, gap: spacing.xs },
  messageInput: {
    color: colors.textPrimary,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    minHeight: 180,
    textAlignVertical: "top",
  },
});
