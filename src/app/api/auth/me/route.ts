import { getCurrentUser } from "@/lib/auth";
import { success, error } from "@/lib/api";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return error("Not authenticated", 401);
    }
    return success({ user });
  } catch (err) {
    console.error("Auth check error:", err);
    return error("Authentication check failed", 500);
  }
}
