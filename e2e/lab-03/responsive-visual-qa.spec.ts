import { test, expect } from "@playwright/test";

const viewports = {
  desktop: { width: 1200, height: 800 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 375, height: 667 },
};

async function expectNoHorizontalOverflow(page: any) {
  const hasOverflow = await page.evaluate(() => {
    return document.documentElement.scrollWidth > window.innerWidth;
  });
  expect(hasOverflow).toBe(false);
}

test.describe("Lab 3 - Responsive and Visual QA", () => {
  test("Login Screen - Desktop, Tablet, and Mobile", async ({ page }) => {
    for (const [device, viewport] of Object.entries(viewports)) {
      await page.setViewportSize(viewport);
      await page.goto("/");

      await expect(page.getByRole("heading", { name: /Sign in to your account/i })).toBeVisible();
      await expectNoHorizontalOverflow(page);

      await page.screenshot({
        path: `artifacts/lab-03/screenshots/authentication/${device}.png`,
        fullPage: true,
      });
    }
  });

  test("Change Password Screen - Desktop, Tablet, and Mobile", async ({ page, request }) => {
    // Create fresh user needing password change
    const email = `resp.pwd.${Date.now()}@toktickit.local`;
    const tempPass = "InitialPass123!";
    const adminLoginRes = await request.post("http://localhost:3000/api/auth/login", {
      data: { email: "admin@toktickit.local", password: "Password123!" },
    });
    expect(adminLoginRes.ok()).toBeTruthy();

    await request.post("http://localhost:3000/api/users", {
      data: {
        name: "Password QA User",
        email,
        role: "REQUESTER",
        isActive: true,
        initialPassword: tempPass,
      },
    });

    // Login once at desktop size to reach the Change Password screen
    await page.setViewportSize(viewports.desktop);
    await page.goto("/");
    await page.getByLabel(/email/i).fill(email);
    await page.locator("#passwordInput").fill(tempPass);
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page.getByRole("heading", { name: /Change Your Password/i })).toBeVisible();

    for (const [device, viewport] of Object.entries(viewports)) {
      await page.setViewportSize(viewport);
      await expectNoHorizontalOverflow(page);

      await page.screenshot({
        path: `artifacts/lab-03/screenshots/authentication/change-password-${device}.png`,
        fullPage: true,
      });
    }
  });

  test("Staff Ticket Queue - Desktop, Tablet, and Mobile", async ({ page }) => {
    // Login once at desktop size
    await page.setViewportSize(viewports.desktop);
    await page.goto("/");
    await page.getByLabel(/email/i).fill("tech1@toktickit.local");
    await page.locator("#passwordInput").fill("Password123!");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page.getByRole("heading", { name: /Ticket Queue/i })).toBeVisible();

    for (const [device, viewport] of Object.entries(viewports)) {
      await page.setViewportSize(viewport);
      await expectNoHorizontalOverflow(page);

      await page.screenshot({
        path: `artifacts/lab-03/screenshots/staff-queue/${device}.png`,
        fullPage: true,
      });
    }
  });

  test("Staff Ticket Detail - Desktop, Tablet, and Mobile", async ({ page }) => {
    // First navigate to queue and select a ticket
    await page.setViewportSize(viewports.desktop);
    await page.goto("/");

    const queueHeader = page.getByRole("heading", { name: /Ticket Queue/i });
    if (!(await queueHeader.isVisible().catch(() => false))) {
      await page.getByLabel(/email/i).fill("tech1@toktickit.local");
      await page.locator("#passwordInput").fill("Password123!");
      await page.getByRole("button", { name: /sign in/i }).click();
    }

    await expect(page.getByRole("heading", { name: /Ticket Queue/i })).toBeVisible();

    // Click the first ticket in the table
    const firstRow = page.locator("tbody tr").first();
    await firstRow.click();

    await expect(page.getByRole("button", { name: /Back to Ticket Queue/i })).toBeVisible();

    for (const [device, viewport] of Object.entries(viewports)) {
      await page.setViewportSize(viewport);
      await expectNoHorizontalOverflow(page);

      await page.screenshot({
        path: `artifacts/lab-03/screenshots/staff-ticket-detail/${device}.png`,
        fullPage: true,
      });
    }
  });

  test("User Management - Desktop, Tablet, and Mobile", async ({ page }) => {
    // Login once at desktop size
    await page.setViewportSize(viewports.desktop);
    await page.goto("/");
    await page.getByLabel(/email/i).fill("admin@toktickit.local");
    await page.locator("#passwordInput").fill("Password123!");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page.getByRole("heading", { name: /User Management/i })).toBeVisible();

    for (const [device, viewport] of Object.entries(viewports)) {
      await page.setViewportSize(viewport);
      await expectNoHorizontalOverflow(page);

      await page.screenshot({
        path: `artifacts/lab-03/screenshots/user-management/${device}.png`,
        fullPage: true,
      });
    }
  });
});
