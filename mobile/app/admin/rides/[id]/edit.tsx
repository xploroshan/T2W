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
import { Stack, useLocalSearchParams, router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Screen } from "@/components/Screen";
import { Button } from "@/components/Button";
import { TextField } from "@/components/TextField";
import { deleteRide, updateRide } from "@/api/admin";
import { getRide } from "@/api/rides";
import { ApiClientError } from "@/api/client";
import { useAuth } from "@/auth/AuthProvider";
import { colors, spacing, text } from "@/theme";

export default function EditRideScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const auth = useAuth();
  const ride = useQuery({ queryKey: ["ride", id], queryFn: () => getRide(id) });

  const [title, setTitle] = useState("");
  const [distanceKm, setDistanceKm] = useState("");
  const [maxRiders, setMaxRiders] = useState("");
  const [fee, setFee] = useState("");
  const [description, setDescription] = useState("");
  const [leadRider, setLeadRider] = useState("");
  const [sweepRider, setSweepRider] = useState("");
  const [status, setStatus] = useState("upcoming");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ride.data) {
      setTitle(ride.data.title);
      setDistanceKm(String(ride.data.distanceKm));
      setMaxRiders(String(ride.data.maxRiders));
      setFee(String(ride.data.fee));
      setDescription(ride.data.description ?? "");
      setLeadRider(ride.data.leadRider ?? "");
      setSweepRider(ride.data.sweepRider ?? "");
      setStatus(ride.data.status);
    }
  }, [ride.data]);

  if (ride.isLoading || !ride.data) {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </Screen>
    );
  }

  async function save() {
    setError(null);
    setBusy(true);
    try {
      await updateRide(id, {
        title: title.trim(),
        distanceKm: Number(distanceKm) || undefined,
        maxRiders: Number(maxRiders) || undefined,
        fee: Number(fee) || undefined,
        description,
        leadRider: leadRider.trim(),
        sweepRider: sweepRider.trim(),
        status,
      });
      Alert.alert("Saved", "Ride updated", [
        { text: "OK", onPress: () => router.replace(`/ride/${id}`) },
      ]);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to save.");
    } finally {
      setBusy(false);
    }
  }

  function confirmDelete() {
    Alert.alert(
      "Delete ride?",
      "This permanently removes the ride and all its registrations. Continue?",
      [
        { text: "Cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setBusy(true);
            try {
              await deleteRide(id);
              router.replace("/rides");
            } catch (err) {
              setError(err instanceof ApiClientError ? err.message : "Failed to delete.");
              setBusy(false);
            }
          },
        },
      ],
    );
  }

  const isSuper = auth.status === "authed" && auth.user.role === "superadmin";

  return (
    <Screen>
      <Stack.Screen options={{ title: `Edit #${ride.data.rideNumber}` }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll}>
          <TextField label="Title" value={title} onChangeText={setTitle} />
          <TextField label="Status" value={status} onChangeText={setStatus} placeholder="upcoming | ongoing | completed | cancelled" autoCapitalize="none" />
          <View style={styles.row}>
            <TextField label="Distance (km)" value={distanceKm} onChangeText={setDistanceKm} keyboardType="number-pad" style={{ flex: 1 }} />
            <TextField label="Max riders" value={maxRiders} onChangeText={setMaxRiders} keyboardType="number-pad" style={{ flex: 1, marginLeft: spacing.sm }} />
            <TextField label="Fee (₹)" value={fee} onChangeText={setFee} keyboardType="number-pad" style={{ flex: 1, marginLeft: spacing.sm }} />
          </View>
          <TextField label="Description" value={description} onChangeText={setDescription} multiline />
          <View style={styles.row}>
            <TextField label="Lead rider" value={leadRider} onChangeText={setLeadRider} style={{ flex: 1 }} />
            <TextField label="Sweep rider" value={sweepRider} onChangeText={setSweepRider} style={{ flex: 1, marginLeft: spacing.sm }} />
          </View>

          {error ? <Text style={{ color: colors.danger, marginTop: spacing.sm }}>{error}</Text> : null}

          <Button label={busy ? "Saving…" : "Save changes"} onPress={save} loading={busy} style={{ marginTop: spacing.md }} />

          {isSuper ? (
            <Button
              label="Delete ride"
              variant="secondary"
              onPress={confirmDelete}
              style={{ marginTop: spacing.md }}
            />
          ) : null}

          <Text style={[text.caption, { marginTop: spacing.md }]}>
            Heavier ride config — staggered registration windows, per-ride form,
            poster — remains on the web admin.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, paddingBottom: spacing.xl, gap: spacing.xs },
  row: { flexDirection: "row" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
});
