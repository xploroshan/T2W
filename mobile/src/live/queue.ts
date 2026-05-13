import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Offline-safe GPS breadcrumb queue.
 *
 * The background-location task appends points here; a separate flusher
 * drains the queue to /api/v1/rides/:id/live/location.
 *
 * AsyncStorage is plenty for the volume involved: 8 hours at 1 sample / 5 s
 * is ~5,700 points * ~80 bytes JSON ≈ 460 KB, well under the platform cap.
 * If we ever push beyond ~50k pending points we'll graduate to expo-sqlite.
 */

export type QueuedPoint = {
  rideId: string;
  lat: number;
  lng: number;
  speed: number | null;
  heading: number | null;
  accuracy: number | null;
  recordedAt: string; // ISO
};

const KEY_PREFIX = "t2w.live.queue.";

function key(rideId: string) {
  return `${KEY_PREFIX}${rideId}`;
}

export async function enqueue(rideId: string, points: QueuedPoint[]): Promise<void> {
  if (points.length === 0) return;
  const existingRaw = await AsyncStorage.getItem(key(rideId));
  const existing: QueuedPoint[] = existingRaw ? safeParse(existingRaw) : [];
  const next = existing.concat(points);
  await AsyncStorage.setItem(key(rideId), JSON.stringify(next));
}

export async function peek(rideId: string, max: number): Promise<QueuedPoint[]> {
  const raw = await AsyncStorage.getItem(key(rideId));
  if (!raw) return [];
  const arr = safeParse(raw);
  return arr.slice(0, max);
}

export async function dropFirst(rideId: string, count: number): Promise<void> {
  const raw = await AsyncStorage.getItem(key(rideId));
  if (!raw) return;
  const arr = safeParse(raw);
  const remaining = arr.slice(count);
  if (remaining.length === 0) {
    await AsyncStorage.removeItem(key(rideId));
  } else {
    await AsyncStorage.setItem(key(rideId), JSON.stringify(remaining));
  }
}

export async function size(rideId: string): Promise<number> {
  const raw = await AsyncStorage.getItem(key(rideId));
  if (!raw) return 0;
  return safeParse(raw).length;
}

export async function clear(rideId: string): Promise<void> {
  await AsyncStorage.removeItem(key(rideId));
}

function safeParse(raw: string): QueuedPoint[] {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? (v as QueuedPoint[]) : [];
  } catch {
    return [];
  }
}
