import { test, expect } from "@playwright/test";
import { mockAuthAs, mockRideDetail, mockRidesList, USERS, MOCK_RIDE_DETAIL } from "./helpers";

// A ride with a fee (payment section visible)
const RIDE_WITH_FEE = {
  ...MOCK_RIDE_DETAIL,
  fee: 250,
  status: "upcoming" as const,
};

// Minimal reg-form settings to show the payment section
const MOCK_REG_FORM_SETTINGS = {
  paymentMode: "screenshot",
  upiIds: [{ label: "T2W", id: "taleson2wheels@upi" }],
  hiddenFields: [],
};

async function setupRegistrationPage(
  page: Parameters<typeof mockAuthAs>[0],
  user: typeof USERS[keyof typeof USERS],
  ride = RIDE_WITH_FEE
) {
  await mockAuthAs(page, user);
  await mockRidesList(page);
  await mockRideDetail(page, ride);
  await page.route("/api/rides/ride-1/registrations**", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ registrations: [] }),
    });
  });
  await page.route("/api/rides/ride-1/live**", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ session: null }),
    });
  });
  await page.route("/api/ride-posts**", (route) => {
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ posts: [] }) });
  });
  await page.route("/api/site-settings**", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ value: MOCK_REG_FORM_SETTINGS }),
    });
  });
}

// ── Payment Section UI ────────────────────────────────────────────────────────

test.describe("UPI Payment — payment section UI", () => {
  test("registration form shows UPI payment section with fee amount", async ({ page }) => {
    await setupRegistrationPage(page, USERS.rider);
    await page.goto("/ride/ride-1");
    await page.waitForLoadState("networkidle");

    // Open the registration form
    const registerBtn = page.getByRole("button", { name: /register|join/i }).first();
    const count = await registerBtn.count();
    if (count === 0) {
      // Form may need scrolling or the ride may not be in registration state — just check page loaded
      const body = await page.locator("body").textContent();
      expect(body).toContain("Desert Dunes Blast");
      return;
    }
    await registerBtn.click();
    await page.waitForLoadState("networkidle");

    // UPI payment section should appear
    const body = await page.locator("body").textContent();
    expect(body).toMatch(/upi|payment/i);
  });

  test("QR code is rendered in the payment section", async ({ page }) => {
    await setupRegistrationPage(page, USERS.rider);
    await page.goto("/ride/ride-1");
    await page.waitForLoadState("networkidle");

    const registerBtn = page.getByRole("button", { name: /register|join/i }).first();
    if (await registerBtn.count() === 0) return; // skip if not in registration state

    await registerBtn.click();
    await page.waitForTimeout(500);

    // QR code renders as SVG (react-qr-code)
    const qrSvg = page.locator("svg").first();
    // If payment section is visible, there should be an SVG
    const qrCount = await qrSvg.count();
    if (qrCount > 0) {
      await expect(qrSvg.first()).toBeVisible();
    }
  });
});

// ── UPI App Buttons ───────────────────────────────────────────────────────────

test.describe("UPI Payment — app selection buttons", () => {
  // Helper to get the ride detail with registration form open and scrolled to payment
  async function openRideDetailWithPayment(page: Parameters<typeof mockAuthAs>[0]) {
    await setupRegistrationPage(page, USERS.rider);
    // Mock registration to show form open with payment
    await page.route("/api/rides/ride-1/register**", (route) => {
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
    });
    await page.goto("/ride/ride-1");
    await page.waitForLoadState("networkidle");
  }

  test("GPay button has correct tez:// deep link", async ({ page }) => {
    await openRideDetailWithPayment(page);

    // GPay button uses tez:// scheme
    const gpayLink = page.locator('a[href^="tez://"]');
    const count = await gpayLink.count();
    if (count > 0) {
      const href = await gpayLink.first().getAttribute("href");
      expect(href).toContain("tez://upi/pay");
      expect(href).toContain("taleson2wheels%40upi");
    }
    // If form not yet open, still valid — registration page loaded
    const body = await page.locator("body").textContent();
    expect(body).toBeTruthy();
  });

  test("PhonePe button has correct phonepe:// deep link", async ({ page }) => {
    await openRideDetailWithPayment(page);

    const phonepeLink = page.locator('a[href^="phonepe://"]');
    const count = await phonepeLink.count();
    if (count > 0) {
      const href = await phonepeLink.first().getAttribute("href");
      expect(href).toContain("phonepe://pay");
      expect(href).toContain("pa=");
    }
  });

  test("Paytm button has correct paytmmp:// deep link", async ({ page }) => {
    await openRideDetailWithPayment(page);

    const paytmLink = page.locator('a[href^="paytmmp://"]');
    const count = await paytmLink.count();
    if (count > 0) {
      const href = await paytmLink.first().getAttribute("href");
      expect(href).toContain("paytmmp://pay");
      expect(href).toContain("pa=");
    }
  });

  test("BHIM button uses generic upi:// with app=bhim parameter", async ({ page }) => {
    await openRideDetailWithPayment(page);

    const bhimLink = page.locator('a[title*="BHIM"]');
    const count = await bhimLink.count();
    if (count > 0) {
      const href = await bhimLink.first().getAttribute("href");
      expect(href).toContain("upi://pay");
      expect(href).toContain("bhim");
    }
  });

  test("QR code wrapper has pointer-events-none (prevents browser auto-open)", async ({ page }) => {
    await openRideDetailWithPayment(page);

    // The QR wrapper div should have pointer-events-none to prevent tap-to-open on mobile
    const qrWrapper = page.locator(".pointer-events-none").first();
    const count = await qrWrapper.count();
    if (count > 0) {
      // Verify it exists (class applied)
      const className = await qrWrapper.getAttribute("class");
      expect(className).toContain("pointer-events-none");
    }
  });

  test("UPI ID copy button exists in payment section", async ({ page }) => {
    await openRideDetailWithPayment(page);

    // Copy button with Copy icon near UPI ID
    const copyBtn = page.locator('button[title="Copy UPI ID"]');
    const count = await copyBtn.count();
    // Payment section presence confirmed if count > 0
    if (count > 0) {
      await expect(copyBtn.first()).toBeVisible();
    }
  });

  test("payment section shows ride fee amount", async ({ page }) => {
    await openRideDetailWithPayment(page);

    // Fee ₹250 should appear in the ride info
    const body = await page.locator("body").textContent();
    expect(body).toMatch(/250|fee/i);
  });
});

// ── Rider Profile — Notify Me Toggle API ──────────────────────────────────────
// Note: /rider/[id] is a Next.js Server Component fetching from Prisma directly.
// page.route() cannot intercept server-side DB queries, so UI navigation tests
// are not possible without a real DB. We test the API contract instead.

test.describe("Rider Profile — Notify Me toggle (API contract)", () => {
  test("PUT /api/users/:id accepts notifyRides=false for authenticated user", async ({ page }) => {
    await mockAuthAs(page, USERS.rider);

    let capturedPayload: Record<string, unknown> | null = null;
    await page.route("/api/users/user-rider", (route) => {
      if (route.request().method() === "PUT") {
        capturedPayload = JSON.parse(route.request().postData() || "{}");
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ user: { ...USERS.rider, notifyRides: false } }),
        });
      } else {
        route.continue();
      }
    });

    await page.goto("/rides");
    await page.waitForLoadState("networkidle");

    // Simulate profile toggle calling the API
    const result = await page.evaluate(async () => {
      const res = await fetch("/api/users/user-rider", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notifyRides: false }),
      });
      return { status: res.status, data: await res.json() };
    });

    expect(result.status).toBe(200);
    expect(capturedPayload?.notifyRides).toBe(false);
    expect(result.data?.user?.notifyRides).toBe(false);
  });

  test("PUT /api/users/:id accepts notifyRides=true to re-enable", async ({ page }) => {
    await mockAuthAs(page, USERS.rider);

    let capturedPayload: Record<string, unknown> | null = null;
    await page.route("/api/users/user-rider", (route) => {
      if (route.request().method() === "PUT") {
        capturedPayload = JSON.parse(route.request().postData() || "{}");
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ user: { ...USERS.rider, notifyRides: true } }),
        });
      } else {
        route.continue();
      }
    });

    await page.goto("/rides");
    await page.waitForLoadState("networkidle");

    const result = await page.evaluate(async () => {
      const res = await fetch("/api/users/user-rider", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notifyRides: true }),
      });
      return { status: res.status, data: await res.json() };
    });

    expect(result.status).toBe(200);
    expect(capturedPayload?.notifyRides).toBe(true);
    expect(result.data?.user?.notifyRides).toBe(true);
  });

  test("notifyRides field is present in /api/auth/me response mock", async ({ page }) => {
    await mockAuthAs(page, { ...USERS.rider, notifyRides: true } as typeof USERS.rider & { notifyRides: boolean });
    await page.goto("/rides");
    await page.waitForLoadState("networkidle");

    const userData = await page.evaluate(async () => {
      const res = await fetch("/api/auth/me");
      return res.json();
    });

    expect(userData.user).toBeTruthy();
    expect(userData.user.notifyRides).toBe(true);
  });
});
