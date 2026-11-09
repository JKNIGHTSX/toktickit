/**
 * Lab 4 — Screenshot capture script for artifacts/lab-04/screenshots/
 * Captures Staff Dashboard, Requester Dashboard, and Actions Taken views
 * at Desktop (1280x800), Tablet (768x1024), and Mobile (375x812) viewports.
 */

import { chromium } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";

const API_BASE = "http://localhost:3000";
const APP_BASE = "http://localhost:5173";

const STAFF_EMAIL = "tech1@toktickit.local";
const STAFF_PASSWORD = "Password123!";
const REQUESTER_EMAIL = "jennifer.anderson@toktickit.local";
const REQUESTER_PASSWORD = "Password123!";

const ARTIFACTS_BASE = path.join(process.cwd(), "artifacts", "lab-04", "screenshots");

const VIEWPORTS = [
  { name: "desktop", width: 1280, height: 800 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "mobile", width: 375, height: 812 },
];

async function ensurePasswordChanged(request: any, email: string, password: string): Promise<void> {
  const loginRes = await request.post(`${API_BASE}/api/auth/login`, {
    data: { email, password },
  });
  if (!loginRes.ok()) return;
  const me = await request.get(`${API_BASE}/api/auth/me`);
  if (!me.ok()) return;
  const user = await me.json();
  if (user?.mustChangePassword) {
    await request.post(`${API_BASE}/api/auth/change-password`, {
      data: { currentPassword: password, newPassword: password },
    });
  }
  await request.post(`${API_BASE}/api/auth/logout`);
}

async function main() {
  // Create screenshot directories
  for (const folder of ["staff-dashboard", "requester-dashboard", "actions-taken"]) {
    const dir = path.join(ARTIFACTS_BASE, folder);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  const browser = await chromium.launch({ headless: true });

  for (const viewport of VIEWPORTS) {
    console.log(`\n📸 Capturing at ${viewport.name} (${viewport.width}x${viewport.height})...`);

    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      baseURL: APP_BASE,
    });
    const apiContext = await context.newPage();

    // --- STAFF DASHBOARD SCREENSHOT ---
    console.log(`  → Staff Dashboard (${viewport.name})`);

    // Login as staff via API
    await apiContext.goto(`${API_BASE}/api/health`);
    const loginResp = await apiContext.evaluate(async ({ email, password, base }: any) => {
      const r = await fetch(`${base}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      return r.status;
    }, { email: STAFF_EMAIL, password: STAFF_PASSWORD, base: API_BASE });

    const staffPage = await context.newPage();
    await staffPage.goto(APP_BASE);
    await staffPage.waitForLoadState("networkidle");

    // If login form is showing, login via UI
    const emailInput = staffPage.getByLabel(/email/i);
    if (await emailInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await emailInput.fill(STAFF_EMAIL);
      await staffPage.locator("#passwordInput").fill(STAFF_PASSWORD);
      await staffPage.getByRole("button", { name: /sign in/i }).click();
      await staffPage.waitForLoadState("networkidle");
      // Handle mustChangePassword redirect
      const changeBtn = staffPage.getByRole("button", { name: /Change Password/i });
      if (await changeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await staffPage.locator("[name=currentPassword],[id*=current],[placeholder*=current i]").fill(STAFF_PASSWORD);
        await staffPage.locator("[name=newPassword],[id*=new],[placeholder*=new i]").fill(STAFF_PASSWORD);
        const confirmField = staffPage.locator("[name=confirmPassword],[id*=confirm],[placeholder*=confirm i]");
        if (await confirmField.isVisible({ timeout: 1000 }).catch(() => false)) {
          await confirmField.fill(STAFF_PASSWORD);
        }
        await changeBtn.click();
        await staffPage.waitForLoadState("networkidle");
      }
    }

    // Click Dashboard tab
    const dashboardBtn = staffPage.getByRole("button", { name: /Dashboard/i });
    if (await dashboardBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await dashboardBtn.click();
      await staffPage.waitForLoadState("networkidle");
    }

    await staffPage.screenshot({
      path: path.join(ARTIFACTS_BASE, "staff-dashboard", `${viewport.name}.png`),
      fullPage: false,
    });
    console.log(`    ✅ Saved staff-dashboard/${viewport.name}.png`);

    // --- REQUESTER DASHBOARD SCREENSHOT ---
    console.log(`  → Requester Dashboard (${viewport.name})`);
    const requesterPage = await context.newPage();
    await requesterPage.goto(APP_BASE);
    await requesterPage.waitForLoadState("networkidle");

    const reqEmailInput = requesterPage.getByLabel(/email/i);
    if (await reqEmailInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await reqEmailInput.fill(REQUESTER_EMAIL);
      await requesterPage.locator("#passwordInput").fill(REQUESTER_PASSWORD);
      await requesterPage.getByRole("button", { name: /sign in/i }).click();
      await requesterPage.waitForLoadState("networkidle");
      // Handle mustChangePassword
      const changeBtn = requesterPage.getByRole("button", { name: /Change Password/i });
      if (await changeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await requesterPage.locator("[name=currentPassword],[id*=current],[placeholder*=current i]").fill(REQUESTER_PASSWORD);
        await requesterPage.locator("[name=newPassword],[id*=new],[placeholder*=new i]").fill(REQUESTER_PASSWORD);
        const confirmField = requesterPage.locator("[name=confirmPassword],[id*=confirm],[placeholder*=confirm i]");
        if (await confirmField.isVisible({ timeout: 1000 }).catch(() => false)) {
          await confirmField.fill(REQUESTER_PASSWORD);
        }
        await changeBtn.click();
        await requesterPage.waitForLoadState("networkidle");
      }
    }

    // Dashboard should auto-load for requester
    const reqDashBtn = requesterPage.getByRole("button", { name: /Dashboard/i });
    if (await reqDashBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await reqDashBtn.click();
      await requesterPage.waitForLoadState("networkidle");
    }

    await requesterPage.screenshot({
      path: path.join(ARTIFACTS_BASE, "requester-dashboard", `${viewport.name}.png`),
      fullPage: false,
    });
    console.log(`    ✅ Saved requester-dashboard/${viewport.name}.png`);

    // --- ACTIONS TAKEN SCREENSHOT ---
    console.log(`  → Actions Taken (${viewport.name})`);
    // Reuse staffPage to navigate to a ticket with actions
    await staffPage.getByRole("button", { name: /Ticket Queue/i }).click();
    await staffPage.waitForLoadState("networkidle");

    // Click first available ticket
    const firstRow = staffPage.locator("tr td a, tr[data-ticket-id], tbody tr").first();
    if (await firstRow.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstRow.click();
      await staffPage.waitForLoadState("networkidle");
      // Scroll to Actions Taken section
      const actionsHeading = staffPage.getByRole("heading", { name: /Actions Taken/i });
      if (await actionsHeading.isVisible({ timeout: 5000 }).catch(() => false)) {
        await actionsHeading.scrollIntoViewIfNeeded();
        await staffPage.waitForTimeout(500);
      }
    }

    await staffPage.screenshot({
      path: path.join(ARTIFACTS_BASE, "actions-taken", `${viewport.name}.png`),
      fullPage: false,
    });
    console.log(`    ✅ Saved actions-taken/${viewport.name}.png`);

    await staffPage.close();
    await requesterPage.close();
    await context.close();
  }

  await browser.close();
  console.log("\n✅ All screenshots captured!");
  console.log(`📁 Location: ${ARTIFACTS_BASE}`);
}

main().catch((err) => {
  console.error("Screenshot capture failed:", err);
  process.exit(1);
});

