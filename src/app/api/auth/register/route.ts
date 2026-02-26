import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword, createToken, setAuthCookie } from "@/lib/auth";
import { success, error } from "@/lib/api";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, phone, password, city, ridingExperience, motorcycle } =
      body;

    if (!name || !email || !password) {
      return error("Name, email, and password are required");
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return error("An account with this email already exists", 409);
    }

    const hashedPassword = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        phone: phone || null,
        password: hashedPassword,
        city: city || null,
        ridingExperience: ridingExperience || null,
        isApproved: false,
        role: "rider",
      },
    });

    // If motorcycle info was provided, create it
    if (motorcycle) {
      const parts = motorcycle.split(" ");
      const make = parts[0] || "Unknown";
      const model = parts.slice(1).join(" ") || "Unknown";
      await prisma.motorcycle.create({
        data: {
          make,
          model,
          year: new Date().getFullYear(),
          cc: 0,
          color: "Unknown",
          userId: user.id,
        },
      });
    }

    // Create a welcome notification
    await prisma.notification.create({
      data: {
        title: "Welcome to T2W!",
        message:
          "Your registration is pending approval. An admin will review your account shortly.",
        type: "info",
        userId: user.id,
      },
    });

    const token = await createToken(user.id);
    await setAuthCookie(token);

    const { password: _, ...userWithoutPassword } = user;
    return success(
      { user: userWithoutPassword, message: "Registration successful. Pending admin approval." },
      201
    );
  } catch (err) {
    console.error("Registration error:", err);
    return error("Registration failed", 500);
  }
}
