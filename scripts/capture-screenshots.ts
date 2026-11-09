/**
 * Lab 4 — Screenshot capture script for artifacts/lab-04/screenshots/
 * Captures Staff Dashboard, Requester Dashboard, and Actions Taken views
 * at Desktop (1280x800), Tablet (768x1024), and Mobile (375x812) viewports.
 */

import { chromium, expect, type Page } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";
import prepareE2E from "../e2e/global-setup.cjs";

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

async function signIn(page: Page, email: string, password: string): Promise<void> {
  await page.goto(APP_BASE);
  await page.getByLabel(/email/i).fill(email);
  await page.locator("#passwordInput").fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page.getByRole("button", { name: /Dashboard/i })).toBeVisible({ timeout: 10_000 });
}

async function main() {
  await prepareE2E();

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

    const staffContext = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      baseURL: APP_BASE,
    });
    const requesterContext = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      baseURL: APP_BASE,
    });
    const staffPage = await staffContext.newPage();
    const requesterPage = await requesterContext.newPage();

    // --- STAFF DASHBOARD SCREENSHOT ---
    console.log(`  → Staff Dashboard (${viewport.name})`);
    await signIn(staffPage, STAFF_EMAIL, STAFF_PASSWORD);

    await staffPage.screenshot({
      path: path.join(ARTIFACTS_BASE, "staff-dashboard", `${viewport.name}.png`),
      fullPage: false,
    });
    console.log(`    ✅ Saved staff-dashboard/${viewport.name}.png`);

    // --- REQUESTER DASHBOARD SCREENSHOT ---
    console.log(`  → Requester Dashboard (${viewport.name})`);
    await signIn(requesterPage, REQUESTER_EMAIL, REQUESTER_PASSWORD);

    await requesterPage.screenshot({
      path: path.join(ARTIFACTS_BASE, "requester-dashboard", `${viewport.name}.png`),
      fullPage: false,
    });
    console.log(`    ✅ Saved requester-dashboard/${viewport.name}.png`);

    // --- ACTIONS TAKEN SCREENSHOT ---
    console.log(`  → Actions Taken (${viewport.name})`);
    await staffPage.setViewportSize({ width: 1280, height: 800 });
    await staffPage.locator("#nav-ticket-queue").click();
    await staffPage.waitForLoadState("networkidle");

    const searchInput = staffPage.getByLabel("Search by ticket number or summary");
    await searchInput.fill("TKT-2026-000101");
    const actionTicket = staffPage.locator("tbody tr").filter({ hasText: "TKT-2026-000101" }).first();
    await expect(actionTicket).toBeVisible();
    await actionTicket.click();
    const actionsHeading = staffPage.getByRole("heading", { name: /Actions Taken/i });
    await expect(actionsHeading).toBeVisible();
    await expect(staffPage.getByText(/Ran battery health diagnostics remotely/).first()).toBeVisible();
    await staffPage.setViewportSize({ width: viewport.width, height: viewport.height });
    await actionsHeading.scrollIntoViewIfNeeded();

    await staffPage.screenshot({
      path: path.join(ARTIFACTS_BASE, "actions-taken", `${viewport.name}.png`),
      fullPage: false,
    });
    console.log(`    ✅ Saved actions-taken/${viewport.name}.png`);

    await staffPage.close();
    await requesterPage.close();
    await staffContext.close();
    await requesterContext.close();
  }

  await browser.close();
  console.log("\n✅ All screenshots captured!");
  console.log(`📁 Location: ${ARTIFACTS_BASE}`);
}

main().catch((err) => {
  console.error("Screenshot capture failed:", err);
  process.exit(1);
});
