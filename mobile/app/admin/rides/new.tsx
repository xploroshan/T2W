import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { Stack, router } from "expo-router";
import { Screen } from "@/components/Screen";
import { Button } from "@/components/Button";
import { TextField } from "@/components/TextField";
import { createRide } from "@/api/admin";
import { ApiClientError } from "@/api/client";
import { colors, radius, spacing, text } from "@/theme";

type FormState = {
  title: string;
  type: string;
  startDate: string;
  endDate: string;
  startLocation: string;
  endLocation: string;
  distanceKm: string;
  maxRiders: string;
  fee: string;
  difficulty: string;
  description: string;
  highlights: string;
  leadRider: string;
  sweepRider: string;
  organisedBy: string;
};

const DEFAULT_STATE: FormState = {
  title: "",
  type: "day",
  startDate: "",
  endDate: "",
  startLocation: "",
  endLocation: "",
  distanceKm: "",
  maxRiders: "40",
  fee: "0",
  difficulty: "moderate",
  description: "",
  highlights: "",
  leadRider: "",
  sweepRider: "",
  organisedBy: "",
};

/**
 * Mobile admin ride create form. Intentionally limited to the most-used
 * fields — full ride config (per-ride form settings, staggered open
 * windows, riders cache override) stays on the web for now.
 */
export default function NewRideScreen() {
  const [s, setS] = useState<FormState>(DEFAULT_STATE);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof FormState>(key: K) {
    return (v: string) => setS((curr) => ({ ...curr, [key]: v }));
  }

  async function submit() {
    setError(null);
    if (!s.title.trim() || !s.startDate || !s.endDate || !s.startLocation || !s.endLocation) {
      setError("Title, dates, and start/end locations are required.");
      return;
    }
    let startIso: string;
    let endIso: string;
    try {
      startIso = new Date(s.startDate).toISOString();
      endIso = new Date(s.endDate).toISOString();
    } catch {
      setError("Dates must be parseable (YYYY-MM-DD or full ISO).");
      return;
    }

    setBusy(true);
    try {
      const res = await createRide({
        title: s.title.trim(),
        type: s.type,
        startDate: startIso,
        endDate: endIso,
        startLocation: s.startLocation.trim(),
        endLocation: s.endLocation.trim(),
        distanceKm: Number(s.distanceKm) || 0,
        maxRiders: Number(s.maxRiders) || 40,
        fee: Number(s.fee) || 0,
        difficulty: s.difficulty,
        description: s.description.trim(),
        highlights: s.highlights
          .split("\n")
          .map((h) => h.trim())
          .filter(Boolean),
        leadRider: s.leadRider.trim(),
        sweepRider: s.sweepRider.trim(),
        organisedBy: s.organisedBy.trim() || undefined,
      });
      Alert.alert("Ride created", `Ride ${res.ride.rideNumber}`, [
        { text: "OK", onPress: () => router.replace(`/ride/${res.ride.id}`) },
      ]);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to create ride.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: "New ride" }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <TextField label="Title" value={s.title} onChangeText={set("title")} />
          <View style={styles.row}>
            <TextField
              label="Type"
              value={s.type}
              onChangeText={set("type")}
              placeholder="day | weekend | multi-day | expedition"
              style={{ flex: 1 }}
            />
            <TextField
              label="Difficulty"
              value={s.difficulty}
              onChangeText={set("difficulty")}
              placeholder="easy | moderate | hard"
              style={{ flex: 1, marginLeft: spacing.sm }}
            />
          </View>

          <View style={styles.row}>
            <TextField
              label="Start (ISO)"
              value={s.startDate}
              onChangeText={set("startDate")}
              placeholder="2026-06-12T08:00"
              style={{ flex: 1 }}
              autoCapitalize="none"
            />
            <TextField
              label="End (ISO)"
              value={s.endDate}
              onChangeText={set("endDate")}
              placeholder="2026-06-14T17:00"
              style={{ flex: 1, marginLeft: spacing.sm }}
              autoCapitalize="none"
            />
          </View>

          <TextField label="Start location" value={s.startLocation} onChangeText={set("startLocation")} />
          <TextField label="End location" value={s.endLocation} onChangeText={set("endLocation")} />

          <View style={styles.row}>
            <TextField
              label="Distance (km)"
              value={s.distanceKm}
              onChangeText={set("distanceKm")}
              keyboardType="number-pad"
              style={{ flex: 1 }}
            />
            <TextField
              label="Max riders"
              value={s.maxRiders}
              onChangeText={set("maxRiders")}
              keyboardType="number-pad"
              style={{ flex: 1, marginLeft: spacing.sm }}
            />
            <TextField
              label="Fee (₹)"
              value={s.fee}
              onChangeText={set("fee")}
              keyboardType="number-pad"
              style={{ flex: 1, marginLeft: spacing.sm }}
            />
          </View>

          <TextField
            label="Description"
            value={s.description}
            onChangeText={set("description")}
            multiline
          />
          <TextField
            label="Highlights (one per line)"
            value={s.highlights}
            onChangeText={set("highlights")}
            multiline
          />

          <View style={styles.row}>
            <TextField label="Lead rider" value={s.leadRider} onChangeText={set("leadRider")} style={{ flex: 1 }} />
            <TextField label="Sweep rider" value={s.sweepRider} onChangeText={set("sweepRider")} style={{ flex: 1, marginLeft: spacing.sm }} />
          </View>
          <TextField label="Organised by" value={s.organisedBy} onChangeText={set("organisedBy")} />

          {error ? <Text style={{ color: colors.danger, marginTop: spacing.sm }}>{error}</Text> : null}

          <Text style={[text.caption, { marginTop: spacing.md }]}>
            Per-ride form fields, poster image, and staggered registration windows
            can be set from the web admin after creating the ride.
          </Text>

          <Button
            label={busy ? "Creating…" : "Create ride"}
            onPress={submit}
            loading={busy}
            style={{ marginTop: spacing.lg }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, paddingBottom: spacing.xl, gap: spacing.xs },
  row: { flexDirection: "row" },
});
