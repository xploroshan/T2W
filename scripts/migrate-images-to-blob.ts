/**
 * One-shot migration: move every base64 `data:` image stored in Postgres
 * into Vercel Blob, replacing the column with the public CDN URL.
 *
 * Usage:
 *   npm run migrate:images-to-blob
 *
 * Requires DATABASE_URL and BLOB_READ_WRITE_TOKEN in the environment.
 *
 * Idempotent: rows whose value already starts with `https://` are skipped,
 * so it's safe to re-run after a partial failure.
 *
 * Affected columns:
 *   User.avatar
 *   RiderProfile.avatarUrl
 *   Motorcycle.imageUrl
 *   Ride.posterUrl
 *   BlogPost.coverImage
 *   RidePost.images          (JSON array; each element migrated independently)
 */

import "dotenv/config";
import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "../generated/prisma";
import ws from "ws";
import { uploadImage } from "../src/lib/blob-upload";

if (!process.env.DATABASE_URL) {
  console.error("[migrate] DATABASE_URL is required.");
  process.exit(1);
}
if (!process.env.BLOB_READ_WRITE_TOKEN) {
  console.error(
    "[migrate] BLOB_READ_WRITE_TOKEN is required. Run `vercel env pull` " +
      "or set it manually."
  );
  process.exit(1);
}

neonConfig.webSocketConstructor = ws;

function cleanConnectionString(url: string): string {
  try {
    const u = new URL(url);
    u.searchParams.delete("channel_binding");
    u.searchParams.delete("sslmode");
    return u.toString();
  } catch {
    return url;
  }
}

const adapter = new PrismaNeon({
  connectionString: cleanConnectionString(process.env.DATABASE_URL),
});
const prisma = new PrismaClient({ adapter });

interface MigrationStats {
  scanned: number;
  migrated: number;
  skipped: number;
  failed: number;
}

function isDataUrl(s: string | null | undefined): s is string {
  return typeof s === "string" && s.startsWith("data:image/");
}

/**
 * Migrate one model+column. Generic over models that have an `id` field and a
 * single nullable string column holding either a `data:` URL or an https URL.
 */
async function migrateColumn(
  label: string,
  scope: string,
  rows: { id: string; value: string | null }[],
  persist: (id: string, url: string) => Promise<unknown>,
  stats: MigrationStats
) {
  console.log(`\n[migrate] ${label}: ${rows.length} candidate row(s)`);
  for (const row of rows) {
    stats.scanned++;
    if (!isDataUrl(row.value)) {
      stats.skipped++;
      continue;
    }
    try {
      const result = await uploadImage(row.value, { type: scope, scope: row.id });
      await persist(row.id, result.url);
      stats.migrated++;
      console.log(`  ✓ ${label} ${row.id} → ${result.url}`);
    } catch (err) {
      stats.failed++;
      console.error(`  ✗ ${label} ${row.id} failed:`, (err as Error).message);
    }
  }
}

async function migrateUserAvatars(stats: MigrationStats) {
  const rows = await prisma.user.findMany({
    where: { avatar: { startsWith: "data:" } },
    select: { id: true, avatar: true },
  });
  await migrateColumn(
    "User.avatar",
    "avatar",
    rows.map((r) => ({ id: r.id, value: r.avatar })),
    (id, url) => prisma.user.update({ where: { id }, data: { avatar: url } }),
    stats
  );
}

async function migrateRiderProfileAvatars(stats: MigrationStats) {
  const rows = await prisma.riderProfile.findMany({
    where: { avatarUrl: { startsWith: "data:" } },
    select: { id: true, avatarUrl: true },
  });
  await migrateColumn(
    "RiderProfile.avatarUrl",
    "avatar",
    rows.map((r) => ({ id: r.id, value: r.avatarUrl })),
    (id, url) =>
      prisma.riderProfile.update({ where: { id }, data: { avatarUrl: url } }),
    stats
  );
}

async function migrateMotorcycleImages(stats: MigrationStats) {
  const rows = await prisma.motorcycle.findMany({
    where: { imageUrl: { startsWith: "data:" } },
    select: { id: true, imageUrl: true },
  });
  await migrateColumn(
    "Motorcycle.imageUrl",
    "motorcycle",
    rows.map((r) => ({ id: r.id, value: r.imageUrl })),
    (id, url) =>
      prisma.motorcycle.update({ where: { id }, data: { imageUrl: url } }),
    stats
  );
}

async function migrateRidePosters(stats: MigrationStats) {
  const rows = await prisma.ride.findMany({
    where: { posterUrl: { startsWith: "data:" } },
    select: { id: true, posterUrl: true },
  });
  await migrateColumn(
    "Ride.posterUrl",
    "poster",
    rows.map((r) => ({ id: r.id, value: r.posterUrl })),
    (id, url) =>
      prisma.ride.update({ where: { id }, data: { posterUrl: url } }),
    stats
  );
}

async function migrateBlogCovers(stats: MigrationStats) {
  const rows = await prisma.blogPost.findMany({
    where: { coverImage: { startsWith: "data:" } },
    select: { id: true, coverImage: true },
  });
  await migrateColumn(
    "BlogPost.coverImage",
    "blog",
    rows.map((r) => ({ id: r.id, value: r.coverImage })),
    (id, url) =>
      prisma.blogPost.update({ where: { id }, data: { coverImage: url } }),
    stats
  );
}

/**
 * RidePost.images is stored as a JSON-encoded array of image URLs/data URLs.
 * Migrate each `data:` element independently; rewrite the array with the
 * resulting public URLs and persist as JSON.
 */
async function migrateRidePostImages(stats: MigrationStats) {
  const rows = await prisma.ridePost.findMany({
    where: { images: { contains: "data:image/" } },
    select: { id: true, images: true },
  });
  console.log(`\n[migrate] RidePost.images: ${rows.length} candidate row(s)`);
  for (const row of rows) {
    stats.scanned++;
    let parsed: string[] = [];
    try {
      parsed = JSON.parse(row.images || "[]");
    } catch {
      stats.failed++;
      console.error(`  ✗ RidePost ${row.id}: malformed images JSON`);
      continue;
    }
    if (!parsed.some(isDataUrl)) {
      stats.skipped++;
      continue;
    }
    const replaced: string[] = [];
    let touched = false;
    for (const img of parsed) {
      if (!isDataUrl(img)) {
        replaced.push(img);
        continue;
      }
      try {
        const result = await uploadImage(img, { type: "ride-post", scope: row.id });
        replaced.push(result.url);
        touched = true;
      } catch (err) {
        replaced.push(img); // leave the bad element so we can re-try later
        stats.failed++;
        console.error(
          `  ✗ RidePost ${row.id} image upload failed:`,
          (err as Error).message
        );
      }
    }
    if (touched) {
      try {
        await prisma.ridePost.update({
          where: { id: row.id },
          data: { images: JSON.stringify(replaced) },
        });
        stats.migrated++;
        console.log(`  ✓ RidePost ${row.id} images migrated`);
      } catch (err) {
        stats.failed++;
        console.error(`  ✗ RidePost ${row.id} persist failed:`, err);
      }
    } else {
      stats.skipped++;
    }
  }
}

async function main() {
  const stats: MigrationStats = { scanned: 0, migrated: 0, skipped: 0, failed: 0 };

  console.log("[migrate] Starting one-shot base64 → Vercel Blob migration");
  console.log("[migrate] Idempotent: re-running is safe; only data: rows are touched.");

  await migrateUserAvatars(stats);
  await migrateRiderProfileAvatars(stats);
  await migrateMotorcycleImages(stats);
  await migrateRidePosters(stats);
  await migrateBlogCovers(stats);
  await migrateRidePostImages(stats);

  console.log("\n[migrate] ─── Summary ───");
  console.log(`  Scanned:  ${stats.scanned}`);
  console.log(`  Migrated: ${stats.migrated}`);
  console.log(`  Skipped:  ${stats.skipped} (already https or no data:)`);
  console.log(`  Failed:   ${stats.failed}`);

  if (stats.failed > 0) {
    console.error("[migrate] Completed with failures — re-run to retry.");
    process.exit(1);
  }
}

main()
  .catch((err) => {
    console.error("[migrate] Fatal error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
