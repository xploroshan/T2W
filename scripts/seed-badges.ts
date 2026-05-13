/**
 * Seed script to create badge tiers in the database.
 *
 * Usage:
 *   npx tsx scripts/seed-badges.ts
 *
 * Safe to run repeatedly — uses upsert.
 */

import "dotenv/config";
import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "../generated/prisma";
import ws from "ws";

if (!process.env.DATABASE_URL) {
  console.warn("[seed-badges] WARNING: DATABASE_URL is not set — skipping badge seed.");
  process.exit(0);
}

neonConfig.webSocketConstructor = ws;

function cleanConnectionString(url: string): string {
  try {
    const u = new URL(url);
    u.searchParams.delete("channel_binding");
    u.searchParams.delete("sslmode");
    return u.toString();
  } catch {
    return url
      .replace(/[?&]channel_binding=[^&]*/g, "")
      .replace(/[?&]sslmode=[^&]*/g, "")
      .replace(/\?&/, "?")
      .replace(/\?$/, "");
  }
}

const connectionString = cleanConnectionString(process.env.DATABASE_URL);
const adapter = new PrismaNeon({ connectionString });
const prisma = new PrismaClient({ adapter });

const BADGE_TIERS = [
  {
    tier: "SILVER",
    kind: "lifetime_km",
    name: "Silver Rider",
    description: "Completed 1,000 km with T2W. The journey has just begun!",
    minKm: 1000,
    icon: "shield",
    color: "#C0C0C0",
  },
  {
    tier: "GOLD",
    kind: "lifetime_km",
    name: "Gold Rider",
    description: "Completed 5,000 km with T2W. A seasoned road warrior!",
    minKm: 5000,
    icon: "award",
    color: "#FFD700",
  },
  {
    tier: "PLATINUM",
    kind: "lifetime_km",
    name: "Platinum Rider",
    description: "Completed 15,000 km with T2W. The road knows your name!",
    minKm: 15000,
    icon: "star",
    color: "#E5E4E2",
  },
  {
    tier: "DIAMOND",
    kind: "lifetime_km",
    name: "Diamond Rider",
    description: "Completed 30,000 km with T2W. A legend in the making!",
    minKm: 30000,
    icon: "gem",
    color: "#B9F2FF",
  },
  {
    tier: "ACE",
    kind: "lifetime_km",
    name: "Ace Rider",
    description: "Completed 50,000 km with T2W. Master of the open road!",
    minKm: 50000,
    icon: "zap",
    color: "#FF6B35",
  },
  {
    tier: "CONQUEROR",
    kind: "lifetime_km",
    name: "Conqueror",
    description: "Completed 100,000 km with T2W. You have conquered every horizon!",
    minKm: 100000,
    icon: "crown",
    color: "#9B59B6",
  },
  // Per-ride event badges — awarded by the live POST end action when a ride
  // crosses the threshold. minKm is set to the criterion (km, m, or km/h)
  // depending on tier; the awarder branches on `tier`. kind="per_ride" keeps
  // these out of the lifetime auto-award loop below.
  {
    tier: "RIDE_500K",
    kind: "per_ride",
    name: "Distance King",
    description: "Completed a single ride of 500 km or more in one shot.",
    minKm: 500,
    icon: "route",
    color: "#10B981",
  },
  {
    tier: "RIDE_2000M",
    kind: "per_ride",
    name: "High Climber",
    description: "Gained 2,000 metres of elevation in a single ride.",
    minKm: 2000, // metres elevation, not km — interpreted by the awarder
    icon: "mountain",
    color: "#06B6D4",
  },
  {
    tier: "RIDE_70AVG",
    kind: "per_ride",
    name: "Speed Demon",
    description: "Held a 70 km/h average over a 100+ km ride.",
    minKm: 70, // km/h average — interpreted by the awarder
    icon: "gauge",
    color: "#EF4444",
  },
];

async function main() {
  console.log("[seed-badges] Seeding badge tiers...\n");

  for (const badge of BADGE_TIERS) {
    await prisma.badge.upsert({
      where: { tier: badge.tier },
      update: {
        kind: badge.kind,
        name: badge.name,
        description: badge.description,
        minKm: badge.minKm,
        icon: badge.icon,
        color: badge.color,
      },
      create: badge,
    });
    console.log(`  [badge] ${badge.tier} (${badge.kind}): ${badge.name}`);
  }

  // Auto-award badges to existing users based on their totalKm. Per-ride
  // event badges are awarded by the live end action, not here, so we filter
  // them out — otherwise a user with 50k lifetime km would incorrectly earn
  // RIDE_500K (500 km in one shot) just because their lifetime crosses it.
  console.log("\n  [awards] Checking existing users for lifetime-km badge eligibility...");
  const allBadges = await prisma.badge.findMany({
    where: { kind: "lifetime_km" },
    orderBy: { minKm: "asc" },
  });
  const users = await prisma.user.findMany({
    where: { totalKm: { gt: 0 } },
    select: { id: true, name: true, totalKm: true },
  });

  let awarded = 0;
  for (const user of users) {
    for (const badge of allBadges) {
      if (user.totalKm >= badge.minKm) {
        try {
          await prisma.userBadge.upsert({
            where: { userId_badgeId: { userId: user.id, badgeId: badge.id } },
            update: {},
            create: { userId: user.id, badgeId: badge.id },
          });
          awarded++;
        } catch {
          // Skip if constraint fails
        }
      }
    }
  }
  console.log(`    Awarded ${awarded} badges to ${users.length} users`);

  console.log("\n[seed-badges] Done!");
}

main()
  .catch((e) => {
    console.error("[seed-badges] Seed failed (non-fatal):", e.message || e);
    process.exit(0);
  })
  .finally(() => prisma.$disconnect());
