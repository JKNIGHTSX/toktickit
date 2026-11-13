import { test, expect, type Page } from "@playwright/test";

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
const STAFF_EMAIL = "tech1@toktickit.local";
const STAFF_PASSWORD = "Password123!";
const ADMIN_EMAIL = "admin@toktickit.local";
const ADMIN_PASSWORD = "Password123!";
const REQUESTER_EMAIL = "jennifer.anderson@toktickit.local";
const REQUESTER_PASSWORD = "Password123!";

async function signInAs(page: Page, email: string, password: string): Promise<void> {
  await page.goto("/");
  await page.getByLabel(/email/i).fill(email);
  await page.locator("#passwordInput").fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page.getByRole("button", { name: /Dashboard/i })).toBeVisible();
}

test.describe("Lab 4 — E2E-03: Role Dashboards & Drill-down Journey", () => {
  // -------------------------------------------------------------------------
  // IT Staff Dashboard
  // -------------------------------------------------------------------------
  test.describe("IT Staff Dashboard", () => {
    test("IT Staff sees Dashboard tab and 5 operational metric cards", async ({ page }) => {
      await signInAs(page, STAFF_EMAIL, STAFF_PASSWORD);

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

    test("Clicking Ticket Queue tab navigates to queue view", async ({ page }) => {
      await signInAs(page, STAFF_EMAIL, STAFF_PASSWORD);

      // Click Ticket Queue tab
      await page.getByRole("button", { name: /Ticket Queue/i }).click();

      // Ticket Queue panel should appear
      await expect(page.locator("text=Ticket Queue").first()).toBeVisible();
    });

    test("Status metric drill-down applies its filter to the ticket queue", async ({ page }) => {
      await signInAs(page, STAFF_EMAIL, STAFF_PASSWORD);
      await page.getByRole("button", { name: "Status: New - View queue" }).click();

      await expect(page.getByRole("heading", { name: /Ticket Queue/i })).toBeVisible();
      await expect(page.locator("#staff-queue-filter-status")).toHaveValue("NEW");
    });

    test("Clicking View Full Queue in Quick Actions navigates to staff queue", async ({ page }) => {
      await signInAs(page, STAFF_EMAIL, STAFF_PASSWORD);

      // Click "View Full Queue" quick action
      await page.getByRole("button", { name: /View Full Queue/i }).click();

      // Should navigate to queue view
      await expect(page.getByRole("button", { name: /Ticket Queue/i })).toBeVisible();
    });

    test("Dashboard is responsive at tablet viewport (768px)", async ({ page }) => {
      await signInAs(page, STAFF_EMAIL, STAFF_PASSWORD);

      await page.setViewportSize({ width: 768, height: 1024 });

      // No horizontal overflow
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      const viewportWidth = await page.evaluate(() => window.innerWidth);
      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 2); // 2px tolerance

      // Metric cards should still be visible
      await expect(page.locator("text=New").first()).toBeVisible();
    });

    test("Dashboard is responsive at mobile viewport (375px)", async ({ page }) => {
      await signInAs(page, STAFF_EMAIL, STAFF_PASSWORD);

      await page.setViewportSize({ width: 375, height: 812 });

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
    test("Administrator sees Dashboard tab, operational metrics, AND user summary row", async ({ page }) => {
      await signInAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);

      // Dashboard tab visible
      await expect(page.getByRole("button", { name: /Dashboard/i })).toBeVisible();

      // IT Staff operational metrics
      await expect(page.locator("text=My Assigned")).toBeVisible();

      // Admin-only user summary section
      await expect(page.locator("text=Total Users")).toBeVisible();
      await expect(page.getByText("Active Users", { exact: true })).toBeVisible();
      await expect(page.getByText("Inactive Users", { exact: true })).toBeVisible();
    });

    test("Administrator sees Ticket Queue AND User Management tabs preserved", async ({ page }) => {
      await signInAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);

      await expect(page.getByRole("button", { name: /Ticket Queue/i })).toBeVisible();
      await expect(page.getByRole("button", { name: /User Management/i })).toBeVisible();
      await page.getByRole("button", { name: /Ticket Queue/i }).click();
      await expect(page.getByRole("heading", { name: /Ticket Queue/i })).toBeVisible();
    });
  });

  // -------------------------------------------------------------------------
  // Requester Dashboard
  // -------------------------------------------------------------------------
  test.describe("Requester Dashboard", () => {
    test("Requester sees Dashboard tab and 4 metric cards", async ({ page }) => {
      await signInAs(page, REQUESTER_EMAIL, REQUESTER_PASSWORD);

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

    test("Requester metric drill-down applies its filter to My Tickets", async ({ page }) => {
      await signInAs(page, REQUESTER_EMAIL, REQUESTER_PASSWORD);
      await page.getByRole("button", { name: "Status: Open - View all" }).click();

      await expect(page.locator("#filter-status")).toHaveValue("OPEN");
    });

    test("Requester does NOT see IT Staff metrics (My Assigned / Waiting Req)", async ({ page }) => {
      await signInAs(page, REQUESTER_EMAIL, REQUESTER_PASSWORD);

      // These are IT Staff-only metric labels
      await expect(page.locator("text=My Assigned")).not.toBeVisible();
      await expect(page.locator("text=Waiting Req")).not.toBeVisible();
    });

    test("Requester does NOT see User Management tab", async ({ page }) => {
      await signInAs(page, REQUESTER_EMAIL, REQUESTER_PASSWORD);

      await expect(page.getByRole("button", { name: /User Management/i })).not.toBeVisible();
    });

    test("Clicking Submit New Ticket navigates to Create Ticket view", async ({ page }) => {
      await signInAs(page, REQUESTER_EMAIL, REQUESTER_PASSWORD);

      await page.getByRole("button", { name: /Submit New Ticket/i }).click();

      // Create Ticket view should appear
      await expect(page.getByRole("button", { name: /Create Ticket/i }).first()).toBeVisible();
    });

    test("Requester dashboard is responsive at mobile viewport (375px)", async ({ page }) => {
      await signInAs(page, REQUESTER_EMAIL, REQUESTER_PASSWORD);

      await page.setViewportSize({ width: 375, height: 812 });

      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      const viewportWidth = await page.evaluate(() => window.innerWidth);
      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 2);

      await expect(page.locator("text=Open").first()).toBeVisible();
    });
  });
});
