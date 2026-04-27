// Google Maps Elevation API wrapper used for the post-ride backfill.
//
// Called once from the `end` action in src/app/api/rides/[id]/live/route.ts via
// after(), so it never blocks the End Ride response. Failures are swallowed —
// the UI hides the elevation card when the columns remain null.

import type { LatLng } from "./geo-utils";
import { decimatePath } from "./geo-utils";

const ELEVATION_ENDPOINT = "https://maps.googleapis.com/maps/api/elevation/json";

// Suppress sub-3m deltas to ignore Google's ±5m sample noise on flat ground.
const NOISE_THRESHOLD_M = 3;

// Elevation API path= length is bounded by URL size; 256 samples fits well
// inside Google's 8KB query limit using the lat,lng|... form (no encoder).
const MAX_SAMPLES = 256;

interface ElevationResponse {
  status: string;
  results?: { elevation: number }[];
  error_message?: string;
}

/**
 * Fetch cumulative elevation gain/loss (in metres, integer-rounded) along the
 * given path. Returns null on any failure (no API key, network error, fewer
 * than 2 points, non-OK Google status).
 */
export async function fetchElevationStats(
  path: LatLng[]
): Promise<{ gainM: number; lossM: number } | null> {
  const apiKey = process.env.GOOGLE_MAPS_SERVER_API_KEY;
  if (!apiKey) return null;
  if (path.length < 2) return null;

  const sampled = decimatePath(path, MAX_SAMPLES);
  const pathParam = sampled.map((p) => `${p.lat},${p.lng}`).join("|");
  const samples = Math.min(sampled.length, MAX_SAMPLES);
  const url = `${ELEVATION_ENDPOINT}?path=${encodeURIComponent(
    pathParam
  )}&samples=${samples}&key=${apiKey}`;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const body = (await res.json()) as ElevationResponse;
    if (body.status !== "OK" || !body.results || body.results.length < 2) {
      return null;
    }

    let gain = 0;
    let loss = 0;
    for (let i = 1; i < body.results.length; i++) {
      const delta = body.results[i].elevation - body.results[i - 1].elevation;
      if (Math.abs(delta) < NOISE_THRESHOLD_M) continue;
      if (delta > 0) gain += delta;
      else loss += -delta;
    }
    return { gainM: Math.round(gain), lossM: Math.round(loss) };
  } catch {
    return null;
  }
}
