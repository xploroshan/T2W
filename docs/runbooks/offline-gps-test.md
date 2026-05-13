# Offline GPS — real-device test runbook

A script the ride lead runs during the next club ride to verify that the
offline-GPS replay path captures and chronologically stamps points even
when the device loses signal for several minutes.

Use this once per quarter, or after any change to:

- `src/lib/location-queue.ts`
- `src/app/api/rides/[id]/live/location/route.ts`
- `public/sw.js` (service worker flush path)
- The middleware-level auth check on `/api/rides/[id]/live/location`

## Why this exists

The unit + e2e tests cover the happy path with a mocked queue + mocked
network. They don't cover:

1. Real device behaviour on a moving motorcycle (cell handover, GPS
   accuracy drops, OS-level background-task throttling).
2. The browser's IndexedDB durability when the tab is killed mid-ride.
3. Wall-clock chronology of replayed points against actual airplane-mode
   windows.

The diagnostic page (`/admin/ride-diagnostics`) makes the post-ride
audit a couple of clicks instead of an SQL session.

## Pre-ride checklist (ride lead)

Run through this 15 min before the ride starts. Use a phone, not a
tablet — same form factor as actual riders.

- [ ] Open the live ride page (`/ride/<id>/live`) in Chrome (Android) or
      Safari (iOS).
- [ ] Browser is granted Location permission.
- [ ] "Add to home screen" performed (PWA install) — recommended to
      give the service worker a fair chance on iOS.
- [ ] Battery > 60%. The screen-on requirement during tracking is the
      single biggest power draw of the app.
- [ ] Confirm the "Start tracking" toggle is on.
- [ ] Wait ~30 s, then check the queued-count pill in the header. It
      should read 0 — meaning every captured ping has uploaded
      successfully.
- [ ] Note the ride session ID in your phone (visible in the URL).

## During the ride — airplane-mode test

Pick a stretch with reliable cell coverage on either side and a known
boring middle (so admin can tell what's signal-loss versus
intentionally off-route).

- [ ] Enable airplane mode. Note the wall-clock time (e.g., **10:34 AM
      IST**).
- [ ] Ride for 5–10 minutes.
- [ ] Confirm the offline banner appears within ~5 s and shows a
      growing queued-count.
- [ ] Disable airplane mode. Note the time (e.g., **10:42 AM IST**).
- [ ] Within ~30 s the queued-count should drop to 0 and the
      "Synced N pings" pill should flash.

Record:

| Field | Value |
|---|---|
| Ride ID | _____ |
| Rider ID | _____ |
| Airplane-mode start | _____ |
| Airplane-mode end | _____ |
| Queued-count at peak | _____ |

## Post-ride audit

### Method 1 — admin diagnostics page (preferred)

1. Navigate to `/admin/ride-diagnostics?rideId=<ride-id>`.
2. Find the rider whose phone went into airplane mode.
3. Verify the **interval histogram** shows:
   - A bulk of intervals at ~5 s (normal sampling)
   - A handful of intervals matching the airplane-mode duration
     (signal-loss stretch) — these are **legitimate**.
   - Zero "Suspicious chronology" warnings (no near-zero-interval
     bunching, which would indicate the timestamp bug we fixed had
     regressed).
4. The "gaps > 5 min" table should show one row whose
   start/end timestamps roughly match the airplane-mode window
   (within ~30 s).

### Method 2 — raw SQL (when you need to see specific timestamps)

Run against a Neon read-replica branch. Replace `:sessionId` and
`:userId` with values from the runbook above.

```sql
SELECT
  "recordedAt",
  LAG("recordedAt") OVER (ORDER BY "recordedAt") AS prev_at,
  EXTRACT(EPOCH FROM (
    "recordedAt" - LAG("recordedAt") OVER (ORDER BY "recordedAt")
  )) AS gap_seconds
FROM "LiveRideLocation"
WHERE "sessionId" = ':sessionId' AND "userId" = ':userId'
ORDER BY "recordedAt"
LIMIT 500;
```

What to look for:

- `gap_seconds` consistently > 0 means each replayed ping kept its
  original GPS time. Good.
- Multiple rows with **identical** `recordedAt` means the queue-flush
  bug regressed — every replayed point would be stamped at the
  reconnect instant. Open an issue tagged `bug/regression`.
- `gap_seconds` between ~3 s and ~7 s during normal coverage matches
  the configured 5 s sampling rate.

## What to do if the test fails

If the audit shows bunched timestamps:

1. File an issue: `bug: offline GPS replay timestamps bunched on
   <ride-id>`. Attach the diagnostics page screenshot + the SQL output.
2. Roll back the most recent change touching `location-queue.ts` /
   `public/sw.js` / `live/location/route.ts`.
3. Re-run this runbook on the rolled-back version to confirm it's the
   recent change.
4. Add a regression e2e test that mocks an airplane-mode window and
   asserts ping chronology on flush.

If the audit shows the gap but no synced points after reconnect:

1. The service-worker flush failed silently. Check Sentry for any
   `flushLocationQueue` errors during the rider's airplane-mode window.
2. Open the rider's phone DevTools (USB debugging on Android, or
   Inspect on Mac for iOS) and dump the IndexedDB `t2w_location_queue`
   store. Confirm rows are still present.

## Cadence

| When | What |
|---|---|
| Per quarter | Full runbook on a real ride with at least 1 rider. |
| After any change to the files above | Same. |
| Per release | Quick "diagnostics page loads with no warnings on the last completed ride" sanity check (no airplane-mode test needed). |
