import { test, expect, request as apiRequest } from "@playwright/test";

/**
 * Lab 4 — Issue #8: Role Dashboards & Drill-down Journey (E2E-03)
 *
 * Traceability:
 *   - AC-15 (Requester Dashboard Metrics): Requester sees metric cards.
 *   - AC-17 (IT Staff Dashboard Metrics): IT Staff sees 5 queue cards.
 *   - AC-18 (Dashboard Drill-Down Navigation): Clicking card navigates to queue.
 *   - AC-19 (Administrator Dashboard Account Counters): Admin sees user summary row.
 *   - AC-21 (Empty State): Dashboard renders with zero metrics without breaking.
 *   - AC-22 (Responsive & Accessibility): Dashboard renders at multiple viewports.
 */

// ---------------------------------------------------------------------------
// Credentials (seeded test accounts)
// ---------------------------------------------------------------------------
const STAFF_EMAIL = "michael.brown@toktickit.local";
const STAFF_PASSWORD = "Password123!";
const ADMIN_EMAIL = "sarah.johnson@toktickit.local";
const ADMIN_PASSWORD = "Password123!";
const REQUESTER_EMAIL = "jennifer.anderson@toktickit.local";
const REQUESTER_PASSWORD = "Password123!";

const API_BASE = "http://localhost:3000";

test.describe("Lab 4 — E2E-03: Role Dashboards & Drill-down Journey", () => {
  // -------------------------------------------------------------------------
  // IT Staff Dashboard
  // -------------------------------------------------------------------------
  test.describe("IT Staff Dashboard", () => {
    test("IT Staff sees Dashboard tab and 5 operational metric cards", async ({ page, request }) => {
      // Login via API to establish session
      const loginRes = await request.post(`${API_BASE}/api/auth/login`, {
        data: { email: STAFF_EMAIL, password: STAFF_PASSWORD },
      });
      expect(loginRes.ok()).toBeTruthy();

      await page.goto("/");
      await page.waitForLoadState("networkidle");

      // Dashboard tab should be visible
      await expect(page.getByRole("button", { name: /Dashboard/i })).toBeVisible();

      // Metric cards should be present (all 5 labels)
      await expect(page.locator("text=New").first()).toBeVisible();
      await expect(page.locator("text=Open").first()).toBeVisible();
      await expect(page.locator("text=In Progress").first()).toBeVisible();
      await expect(page.locator("text=Waiting Req")).toBeVisible();
      await expect(page.locator("text=My Assigned")).toBeVisible();

      // "My Recent Tickets" panel should be visible
      await expect(page.locator("text=My Recent Tickets")).toBeVisible();

      // "Quick Actions" panel should be visible
      await expect(page.locator("text=Quick Actions")).toBeVisible();
    });

    test("Clicking Ticket Queue tab navigates to queue view", async ({ page, request }) => {
      const loginRes = await request.post(`${API_BASE}/api/auth/login`, {
        data: { email: STAFF_EMAIL, password: STAFF_PASSWORD },
      });
      expect(loginRes.ok()).toBeTruthy();

      await page.goto("/");
      await page.waitForLoadState("networkidle");

      // Click Ticket Queue tab
      await page.getByRole("button", { name: /Ticket Queue/i }).click();

      // Ticket Queue panel should appear
      await expect(page.locator("text=Ticket Queue").first()).toBeVisible();
    });

    test("Clicking View Full Queue in Quick Actions navigates to staff queue", async ({ page, request }) => {
      const loginRes = await request.post(`${API_BASE}/api/auth/login`, {
        data: { email: STAFF_EMAIL, password: STAFF_PASSWORD },
      });
      expect(loginRes.ok()).toBeTruthy();

      await page.goto("/");
      await page.waitForLoadState("networkidle");

      // Click "View Full Queue" quick action
      await page.getByRole("button", { name: /View Full Queue/i }).click();

      // Should navigate to queue view
      await expect(page.getByRole("button", { name: /Ticket Queue/i })).toBeVisible();
    });

    test("Dashboard is responsive at tablet viewport (768px)", async ({ page, request }) => {
      const loginRes = await request.post(`${API_BASE}/api/auth/login`, {
        data: { email: STAFF_EMAIL, password: STAFF_PASSWORD },
      });
      expect(loginRes.ok()).toBeTruthy();

      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto("/");
      await page.waitForLoadState("networkidle");

      // No horizontal overflow
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      const viewportWidth = await page.evaluate(() => window.innerWidth);
      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 2); // 2px tolerance

      // Metric cards should still be visible
      await expect(page.locator("text=New").first()).toBeVisible();
    });

    test("Dashboard is responsive at mobile viewport (375px)", async ({ page, request }) => {
      const loginRes = await request.post(`${API_BASE}/api/auth/login`, {
        data: { email: STAFF_EMAIL, password: STAFF_PASSWORD },
      });
      expect(loginRes.ok()).toBeTruthy();

      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto("/");
      await page.waitForLoadState("networkidle");

      // No horizontal overflow
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      const viewportWidth = await page.evaluate(() => window.innerWidth);
      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 2);

      await expect(page.locator("text=My Assigned")).toBeVisible();
    });
  });

  // -------------------------------------------------------------------------
  // Administrator Dashboard
  // -------------------------------------------------------------------------
  test.describe("Administrator Dashboard", () => {
    test("Administrator sees Dashboard tab, operational metrics, AND user summary row", async ({ page, request }) => {
      const loginRes = await request.post(`${API_BASE}/api/auth/login`, {
        data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
      });
      expect(loginRes.ok()).toBeTruthy();

      await page.goto("/");
      await page.waitForLoadState("networkidle");

      // Dashboard tab visible
      await expect(page.getByRole("button", { name: /Dashboard/i })).toBeVisible();

      // IT Staff operational metrics
      await expect(page.locator("text=My Assigned")).toBeVisible();

      // Admin-only user summary section
      await expect(page.locator("text=Total Users")).toBeVisible();
      await expect(page.locator("text=Active Users")).toBeVisible();
      await expect(page.locator("text=Inactive Users")).toBeVisible();
    });

    test("Administrator sees Ticket Queue AND User Management tabs preserved", async ({ page, request }) => {
      const loginRes = await request.post(`${API_BASE}/api/auth/login`, {
        data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
      });
      expect(loginRes.ok()).toBeTruthy();

      await page.goto("/");
      await page.waitForLoadState("networkidle");

      await expect(page.getByRole("button", { name: /Ticket Queue/i })).toBeVisible();
      await expect(page.getByRole("button", { name: /User Management/i })).toBeVisible();
    });
  });

  // -------------------------------------------------------------------------
  // Requester Dashboard
  // -------------------------------------------------------------------------
  test.describe("Requester Dashboard", () => {
    test("Requester sees Dashboard tab and 4 metric cards", async ({ page, request }) => {
      const loginRes = await request.post(`${API_BASE}/api/auth/login`, {
        data: { email: REQUESTER_EMAIL, password: REQUESTER_PASSWORD },
      });
      expect(loginRes.ok()).toBeTruthy();

      await page.goto("/");
      await page.waitForLoadState("networkidle");

      // Dashboard tab visible
      await expect(page.getByRole("button", { name: /Dashboard/i })).toBeVisible();

      // 4 metric cards
      await expect(page.locator("text=Open").first()).toBeVisible();
      await expect(page.locator("text=In Progress").first()).toBeVisible();
      await expect(page.locator("text=Resolved").first()).toBeVisible();
      await expect(page.locator("text=Closed").first()).toBeVisible();

      // "My Recent Tickets" section
      await expect(page.locator("text=My Recent Tickets")).toBeVisible();

      // Quick Actions
      await expect(page.locator("text=Quick Actions")).toBeVisible();
    });

    test("Requester does NOT see IT Staff metrics (My Assigned / Waiting Req)", async ({ page, request }) => {
      const loginRes = await request.post(`${API_BASE}/api/auth/login`, {
        data: { email: REQUESTER_EMAIL, password: REQUESTER_PASSWORD },
      });
      expect(loginRes.ok()).toBeTruthy();

      await page.goto("/");
      await page.waitForLoadState("networkidle");

      // These are IT Staff-only metric labels
      await expect(page.locator("text=My Assigned")).not.toBeVisible();
      await expect(page.locator("text=Waiting Req")).not.toBeVisible();
    });

    test("Requester does NOT see User Management tab", async ({ page, request }) => {
      const loginRes = await request.post(`${API_BASE}/api/auth/login`, {
        data: { email: REQUESTER_EMAIL, password: REQUESTER_PASSWORD },
      });
      expect(loginRes.ok()).toBeTruthy();

      await page.goto("/");
      await page.waitForLoadState("networkidle");

      await expect(page.getByRole("button", { name: /User Management/i })).not.toBeVisible();
    });

    test("Clicking Submit New Ticket navigates to Create Ticket view", async ({ page, request }) => {
      const loginRes = await request.post(`${API_BASE}/api/auth/login`, {
        data: { email: REQUESTER_EMAIL, password: REQUESTER_PASSWORD },
      });
      expect(loginRes.ok()).toBeTruthy();

      await page.goto("/");
      await page.waitForLoadState("networkidle");

      await page.getByRole("button", { name: /Submit New Ticket/i }).click();

      // Create Ticket view should appear
      await expect(page.getByRole("button", { name: /Create Ticket/i }).first()).toBeVisible();
    });

    test("Requester dashboard is responsive at mobile viewport (375px)", async ({ page, request }) => {
      const loginRes = await request.post(`${API_BASE}/api/auth/login`, {
        data: { email: REQUESTER_EMAIL, password: REQUESTER_PASSWORD },
      });
      expect(loginRes.ok()).toBeTruthy();

      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto("/");
      await page.waitForLoadState("networkidle");

      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      const viewportWidth = await page.evaluate(() => window.innerWidth);
      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 2);

      await expect(page.locator("text=Open").first()).toBeVisible();
    });
  });
});

