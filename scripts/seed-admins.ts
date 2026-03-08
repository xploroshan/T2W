/**
 * Seed script to create the initial superadmin users in the database.
 *
 * Usage:
 *   npx tsx scripts/seed-admins.ts
 *
 * Requires DATABASE_URL in environment (or .env file).
 *
 * This script is safe to run during builds — it skips existing users and
 * exits gracefully (exit 0) on errors so it never breaks a deploy.
 */

import "dotenv/config";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "../generated/prisma";
import bcrypt from "bcryptjs";
import ws from "ws";

if (!process.env.DATABASE_URL) {
  console.warn(
    "[seed] WARNING: DATABASE_URL is not set — skipping admin seed.\n" +
    "Set DATABASE_URL in your environment or .env file."
  );
  process.exit(0); // Don't fail the build
}

neonConfig.webSocketConstructor = ws;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
const adapter = new PrismaNeon(pool);
const prisma = new PrismaClient({ adapter });

const ADMIN_USERS = [
  {
    name: "Roshan Manuel",
    email: "roshan.manuel@gmail.com",
    password: "PingPong!2345",
    phone: "+91 9880141543",
    city: "Bangalore",
    ridingExperience: "veteran",
    role: "superadmin",
  },
  {
    name: "T2W Official",
    email: "taleson2wheels.official@gmail.com",
    password: "admin123",
    phone: "",
    city: "Bangalore",
    ridingExperience: "veteran",
    role: "superadmin",
  },
];

async function main() {
  console.log("[seed] Seeding admin users...\n");

  for (const admin of ADMIN_USERS) {
    const existing = await prisma.user.findUnique({
      where: { email: admin.email.toLowerCase() },
    });

    if (existing) {
      console.log(`  [skip] ${admin.email} already exists (id: ${existing.id})`);
      continue;
    }

    const hashedPassword = await bcrypt.hash(admin.password, 12);
    const user = await prisma.user.create({
      data: {
        name: admin.name,
        email: admin.email.toLowerCase(),
        password: hashedPassword,
        phone: admin.phone || null,
        city: admin.city,
        ridingExperience: admin.ridingExperience,
        role: admin.role,
        isApproved: true,
      },
    });

    console.log(`  [created] ${admin.email} (id: ${user.id})`);
  }

  console.log("\n[seed] Done!");
}

main()
  .catch((e) => {
    // Log the error but exit cleanly so the build continues
    console.error("[seed] Admin seed failed (non-fatal):", e.message || e);
    process.exit(0);
  })
  .finally(() => prisma.$disconnect());
