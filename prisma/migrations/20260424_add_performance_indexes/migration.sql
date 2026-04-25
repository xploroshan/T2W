-- Performance indexes: Notification.userId, Notification.isRead,
-- LiveRideBreak.sessionId, RiderProfile.name
CREATE INDEX IF NOT EXISTS "Notification_userId_idx" ON "Notification"("userId");
CREATE INDEX IF NOT EXISTS "Notification_isRead_idx" ON "Notification"("isRead");
CREATE INDEX IF NOT EXISTS "LiveRideBreak_sessionId_idx" ON "LiveRideBreak"("sessionId");
CREATE INDEX IF NOT EXISTS "RiderProfile_name_idx" ON "RiderProfile"("name");
