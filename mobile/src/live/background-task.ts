import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { enqueue, type QueuedPoint } from "./queue";

export const LOCATION_TASK = "t2w.background-location";
const ACTIVE_RIDE_KEY = "t2w.live.activeRideId";

/**
 * Background location TaskManager registration.
 *
 * The OS calls into this task with batches of points (potentially out of
 * order across short suspensions). We map them into our queue shape and
 * enqueue against whichever ride is currently active. If no ride is active
 * we drop the batch — this can happen briefly during start/stop transitions
 * and is harmless.
 */
TaskManager.defineTask(LOCATION_TASK, async (event) => {
  if (event.error) {
    console.error("[T2W][live] background task error:", event.error.message);
    return;
  }
  const data = event.data as { locations?: Location.LocationObject[] } | undefined;
  if (!data?.locations || data.locations.length === 0) return;

  const rideId = await AsyncStorage.getItem(ACTIVE_RIDE_KEY);
  if (!rideId) return;

  const points: QueuedPoint[] = data.locations.map((l) => ({
    rideId,
    lat: l.coords.latitude,
    lng: l.coords.longitude,
    speed:
      typeof l.coords.speed === "number" && l.coords.speed >= 0
        ? l.coords.speed * 3.6 // m/s → km/h to match the backend convention
        : null,
    heading:
      typeof l.coords.heading === "number" && l.coords.heading >= 0
        ? l.coords.heading
        : null,
    accuracy:
      typeof l.coords.accuracy === "number" && l.coords.accuracy >= 0
        ? l.coords.accuracy
        : null,
    recordedAt: new Date(l.timestamp).toISOString(),
  }));

  await enqueue(rideId, points);
});

export async function setActiveRideId(rideId: string | null) {
  if (rideId) await AsyncStorage.setItem(ACTIVE_RIDE_KEY, rideId);
  else await AsyncStorage.removeItem(ACTIVE_RIDE_KEY);
}

export async function getActiveRideId(): Promise<string | null> {
  return AsyncStorage.getItem(ACTIVE_RIDE_KEY);
}
