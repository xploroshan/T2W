import { removeAuthCookie } from "@/lib/auth";
import { success, error } from "@/lib/api";

export async function POST() {
  try {
    await removeAuthCookie();
    return success({ message: "Logged out successfully" });
  } catch (err) {
    console.error("Logout error:", err);
    return error("Logout failed", 500);
  }
}
