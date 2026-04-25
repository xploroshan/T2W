CREATE TABLE IF NOT EXISTS "ScheduledEmail" (
  "id"          TEXT NOT NULL,
  "rideId"      TEXT NOT NULL,
  "tier"        TEXT NOT NULL,
  "notifyMode"  TEXT NOT NULL,
  "scheduledAt" TIMESTAMP(3) NOT NULL,
  "sentAt"      TIMESTAMP(3),
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ScheduledEmail_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ScheduledEmail" ADD CONSTRAINT "ScheduledEmail_rideId_fkey"
  FOREIGN KEY ("rideId") REFERENCES "Ride"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "ScheduledEmail_scheduledAt_sentAt_idx"
  ON "ScheduledEmail"("scheduledAt", "sentAt");
