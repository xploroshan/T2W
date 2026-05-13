"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, Activity } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { EmptyState } from "@/components/shared/EmptyState";
import { Skeleton } from "@/components/shared/Skeleton";

interface RiderDiagnostics {
  userId: string;
  userName: string;
  totalPoints: number;
  medianIntervalS: number;
  p95IntervalS: number;
  histogram: number[];
  longGaps: { startAt: string; endAt: string; gapSeconds: number }[];
  suspiciousBunchCount: number;
}

interface DiagnosticsResponse {
  rideId: string;
  sessionId: string;
  totalPoints: number;
  riders: RiderDiagnostics[];
  bucketLabels: string[];
}

/**
 * Super-admin page that surfaces per-rider GPS ping statistics for a
 * ride. Used to verify the offline replay path after the runbook in
 * docs/runbooks/offline-gps-test.md.
 *
 * Usage: /admin/ride-diagnostics?rideId=<id>
 */
export function RideDiagnosticsPage() {
  const { user } = useAuth();
  const search = useSearchParams();
  const rideId = search.get("rideId");
  const [data, setData] = useState<DiagnosticsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!rideId) return;
    setLoading(true);
    setError(null);
    setData(null);
    fetch(`/api/rides/${encodeURIComponent(rideId)}/diagnostics`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `Request failed (${res.status})`);
        }
        return res.json();
      })
      .then((body) => setData(body as DiagnosticsResponse))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [rideId]);

  if (user && user.role !== "superadmin") {
    return (
      <div className="min-h-screen bg-t2w-dark pt-24">
        <div className="mx-auto max-w-2xl px-4">
          <EmptyState
            icon={<AlertTriangle className="h-6 w-6" />}
            title="Super-admin only"
            body="GPS diagnostics expose per-rider timestamps and are restricted to super-admins."
            action={{ label: "Back to admin →", href: "/admin" }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-t2w-dark pt-24">
      <div className="mx-auto max-w-5xl px-4">
        <h1 className="font-display text-2xl font-bold text-white">
          Ride GPS Diagnostics
        </h1>
        <p className="mt-1 text-sm text-t2w-muted">
          Per-rider interval statistics for a ride&apos;s recorded track. Use this
          after the offline-GPS runbook to verify timestamp chronology.
        </p>

        {!rideId && (
          <div className="mt-8">
            <EmptyState
              icon={<Activity className="h-6 w-6" />}
              title="Pass a ride ID"
              body="Open this page with ?rideId=<id> to inspect a ride. The ride must have a live session and at least one recorded ping."
              action={{ label: "Pick a ride →", href: "/rides?status=completed" }}
            />
          </div>
        )}

        {loading && (
          <div className="mt-8 space-y-3">
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300">
            <strong className="block text-xs uppercase tracking-wide text-red-400">
              Couldn&apos;t load diagnostics
            </strong>
            {error}
          </div>
        )}

        {data && data.riders.length === 0 && (
          <div className="mt-8">
            <EmptyState
              title="No GPS pings recorded"
              body="This ride has a live session but no rider ever submitted a position. Was tracking ever started?"
            />
          </div>
        )}

        {data && data.riders.length > 0 && (
          <div className="mt-6 space-y-6">
            <div className="rounded-xl border border-t2w-border bg-t2w-surface p-4 text-sm text-t2w-muted">
              <div>
                <span className="text-white font-medium">Total pings:</span>{" "}
                {data.totalPoints.toLocaleString()}
              </div>
              <div>
                <span className="text-white font-medium">Riders:</span>{" "}
                {data.riders.length}
              </div>
            </div>
            {data.riders.map((r) => (
              <RiderCard key={r.userId} rider={r} bucketLabels={data.bucketLabels} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function RiderCard({
  rider,
  bucketLabels,
}: {
  rider: RiderDiagnostics;
  bucketLabels: string[];
}) {
  const peak = Math.max(1, ...rider.histogram);
  return (
    <div className="rounded-xl border border-t2w-border bg-t2w-surface p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 className="font-semibold text-white">{rider.userName}</h3>
          <p className="text-xs text-t2w-muted">
            {rider.totalPoints.toLocaleString()} pings · median {rider.medianIntervalS} s · p95 {rider.p95IntervalS} s
          </p>
        </div>
        {rider.suspiciousBunchCount > 0 && (
          <span
            className="rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-medium text-red-300"
            title="Adjacent recordedAt values < 100 ms apart. This is the canonical signal that the queue-flush bunching bug has regressed."
          >
            ⚠ Suspicious chronology ({rider.suspiciousBunchCount})
          </span>
        )}
      </div>

      <div className="mt-4 grid grid-cols-5 gap-1 text-center">
        {rider.histogram.map((count, i) => (
          <div key={i} className="flex flex-col gap-1">
            <div
              className="rounded bg-t2w-accent/30"
              style={{ height: `${Math.max(4, (count / peak) * 56)}px` }}
              aria-label={`${bucketLabels[i]}: ${count} intervals`}
            />
            <div className="text-[10px] text-t2w-muted">{bucketLabels[i]}</div>
            <div className="text-[10px] font-mono text-white">{count}</div>
          </div>
        ))}
      </div>

      {rider.longGaps.length > 0 && (
        <details className="mt-4 rounded-lg border border-amber-400/30 bg-amber-400/5 p-3 text-xs">
          <summary className="cursor-pointer font-medium text-amber-300">
            {rider.longGaps.length} gap{rider.longGaps.length !== 1 ? "s" : ""} &gt; 5 minutes
          </summary>
          <ul className="mt-2 space-y-1 text-amber-200">
            {rider.longGaps.map((g, i) => (
              <li key={i}>
                <span className="font-mono">{g.startAt}</span> →{" "}
                <span className="font-mono">{g.endAt}</span>{" "}
                <span className="text-amber-300">
                  ({Math.round(g.gapSeconds / 60)} min)
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
