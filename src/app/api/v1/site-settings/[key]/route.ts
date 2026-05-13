import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { apiError, apiOk } from "@/lib/api/v1/errors";
import { requireBearer, isAdminRole } from "@/lib/api/v1/auth-guard";

// Public keys mirror the web — the mobile app needs upi_config and
// reg_form_settings to render the registration screen.
const PUBLIC_KEYS = new Set([
  "arena_weights",
  "achievement_settings",
  "role_permissions",
  "upi_config",
  "reg_form_settings",
]);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ key: string }> },
) {
  const { key } = await params;

  if (!PUBLIC_KEYS.has(key)) {
    const auth = await requireBearer(req);
    if (!auth.ok) return apiError("UNAUTHORIZED", "Authentication required");
    if (!isAdminRole(auth.user.role)) return apiError("FORBIDDEN", "Forbidden");
  }

  const setting = await prisma.siteSettings.findUnique({ where: { key } });
  if (!setting) return apiOk({ key, value: null });

  try {
    return apiOk({ key, value: JSON.parse(setting.value) });
  } catch {
    return apiOk({ key, value: setting.value });
  }
}
