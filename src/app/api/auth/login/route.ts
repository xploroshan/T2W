import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword, createToken, setAuthCookie } from "@/lib/auth";
import { success, error } from "@/lib/api";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return error("Email and password are required");
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        motorcycles: true,
        earnedBadges: { include: { badge: true } },
      },
    });

    if (!user) {
      return error("Invalid email or password", 401);
    }

    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      return error("Invalid email or password", 401);
    }

    const token = await createToken(user.id);
    await setAuthCookie(token);

    const { password: _, ...userWithoutPassword } = user;
    return success({ user: userWithoutPassword });
  } catch (err) {
    console.error("Login error:", err);
    return error("Login failed", 500);
  }
}
