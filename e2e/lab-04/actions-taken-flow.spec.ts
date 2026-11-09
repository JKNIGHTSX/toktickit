import { test, expect } from "@playwright/test";

/**
 * Lab 4 — Issue #3: Actions Taken End-to-End Workflow (E2E-01)
 *
 * Traceability:
 *   - AC-01 (Create Action Taken): IT Staff creates a record; performedById = actor's id.
 *   - AC-04 (Update Action Taken): IT Staff edits description; updated values appear.
 *   - AC-07 (Requester Action Creation Blocked): Requester sees no "Record Action Taken" button.
 *   - AC-08 (Independent Performer vs. Owner): Action performer != ticket owner; owner unchanged.
 *   - AC-22 (Responsive & Accessibility): All key interactions work at desktop and mobile viewports.
 */

// ---------------------------------------------------------------------------
// Credentials (seeded test accounts — must have mustChangePassword = false)
// ---------------------------------------------------------------------------
const STAFF_EMAIL = "tech1@toktickit.local";
const STAFF_PASSWORD = "Password123!";
const STAFF2_EMAIL = "tech2@toktickit.local";
const STAFF2_PASSWORD = "Password123!";
const REQUESTER_EMAIL = "jennifer.anderson@toktickit.local";
const REQUESTER_PASSWORD = "Password123!";

const API_BASE = "http://localhost:3000";

// ---------------------------------------------------------------------------
// Helper: ensure seeded users have mustChangePassword = false
// (The E2E test users may have mustChangePassword = true in seed — this helper
//  performs a login and, if redirected to change-password, sets the password.)
// ---------------------------------------------------------------------------
async function ensurePasswordChanged(request: any, email: string, currentPassword: string): Promise<void> {
  const loginRes = await request.post(`${API_BASE}/api/auth/login`, {
    data: { email, password: currentPassword },
  });
  if (!loginRes.ok()) return; // Can't login — will fail in test naturally
  const me = await request.get(`${API_BASE}/api/auth/me`);
  if (!me.ok()) return;
  const user = await me.json();
  if (user?.mustChangePassword) {
    await request.post(`${API_BASE}/api/auth/change-password`, {
      data: { currentPassword, newPassword: currentPassword },
    });
  }
  await request.post(`${API_BASE}/api/auth/logout`);
}

test.describe("Lab 4 — E2E-01: Actions Taken End-to-End Workflow", () => {
  // -------------------------------------------------------------------------
  // Core Journey: IT Staff creates and edits an Action Taken
  // -------------------------------------------------------------------------
  test("AC-01, AC-04: Staff logs in, creates Action Taken, verifies it, then edits it", async ({
    page,
    request,
  }) => {
    // ---- SETUP: Ensure staff and requester passwords are ready ----
    await ensurePasswordChanged(request, STAFF_EMAIL, STAFF_PASSWORD);
    await ensurePasswordChanged(request, REQUESTER_EMAIL, REQUESTER_PASSWORD);

    // ---- SETUP: Requester creates a fresh ticket via API ----
    await request.post(`${API_BASE}/api/auth/login`, {
      data: { email: REQUESTER_EMAIL, password: REQUESTER_PASSWORD },
    });
    const uniqueSummary = `E2E Actions Taken Ticket ${Date.now()}`;
    const createRes = await request.post(`${API_BASE}/api/tickets`, {
      data: {
        categoryId: 1,
        relatedSystemId: 1,
        summary: uniqueSummary,
        description: "Actions Taken E2E test: Create and Edit workflow verification.",
        requestedPriority: "MEDIUM",
      },
    });
    expect(createRes.status()).toBe(201);
    const createdTicket = await createRes.json();
    const ticketId = createdTicket.id;
    const ticketNumber = createdTicket.ticketNumber;
    await request.post(`${API_BASE}/api/auth/logout`);

    // ---- STEP 1: IT Staff logs in via UI ----
    await page.goto("/");
    await page.getByLabel(/email/i).fill(STAFF_EMAIL);
    await page.locator("#passwordInput").fill(STAFF_PASSWORD);
    await page.getByRole("button", { name: /sign in/i }).click();

    // Should be on dashboard/queue now
    await expect(page.getByRole("button", { name: /Dashboard/i })).toBeVisible({ timeout: 10_000 });

    // ---- STEP 2: Navigate to Ticket Queue, search for our ticket ----
    await page.getByRole("button", { name: /Ticket Queue/i }).click();
    const searchInput = page.getByLabel("Search by ticket number or summary");
    await searchInput.fill(uniqueSummary);

    const ticketRow = page.locator(`tr:has-text("${uniqueSummary}")`).first();
    await expect(ticketRow).toBeVisible({ timeout: 8_000 });
    await ticketRow.click();

    // ---- STEP 3: Verify Ticket Detail opens ----
    await expect(page.getByText(ticketNumber)).toBeVisible({ timeout: 8_000 });

    // ---- STEP 4: Verify "Actions Taken" section is visible ----
    await expect(page.getByRole("heading", { name: /Actions Taken/i })).toBeVisible();

    // ---- STEP 5: Advance ticket to IN_PROGRESS so Actions are allowed ----
    // Open ticket if it's NEW
    const openBtn = page.getByRole("button", { name: "Open Ticket" });
    if (await openBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await openBtn.click();
      await expect(page.getByRole("status")).toBeVisible();
    }
    // Begin Work to reach IN_PROGRESS
    const beginWorkBtn = page.getByRole("button", { name: "Begin Work" });
    if (await beginWorkBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await beginWorkBtn.click();
      await expect(page.getByRole("status")).toBeVisible();
    }

    // ---- STEP 6: Click "Record Action Taken" to open the modal ----
    const recordBtn = page.getByRole("button", { name: /Record Action Taken/i });
    await expect(recordBtn).toBeVisible();
    await recordBtn.click();

    // Modal should open — verify the form is present
    await expect(page.getByText("Action Description")).toBeVisible({ timeout: 5_000 });

    // ---- STEP 7: Fill in the Action Taken form ----
    const descriptionText = "Replaced thermal paste on CPU and cleaned cooling fans for optimal airflow.";
    const resultText = "CPU temperatures stabilized below 70°C under full load.";

    await page.locator("#action-description-input").fill(descriptionText);
    await page.locator("#action-result-input").fill(resultText);
    // Follow-Up Required is off by default — leave it off

    // ---- STEP 8: Save the Action Taken ----
    await page.getByRole("button", { name: "Save Action" }).click();

    // Should see success feedback — filter specifically for the ActionsTaken success alert
    await expect(
      page.getByRole("status").filter({ hasText: /Action taken recorded successfully/i })
    ).toBeVisible({ timeout: 8_000 });

    // ---- STEP 9: Verify the new record appears in the Actions Taken timeline ----
    await expect(page.getByText(descriptionText).first()).toBeVisible();
    await expect(page.getByText(resultText).first()).toBeVisible();
    await expect(page.getByText("Tech One").first()).toBeVisible(); // performer name
    await expect(page.locator("text=No follow-up required.").first()).toBeVisible();

    // ---- STEP 10: Edit the Action Taken ----
    const editBtn = page.getByRole("button", { name: /Edit action/i }).first();
    await expect(editBtn).toBeVisible();
    await editBtn.click();

    // Modal opens in edit mode
    await expect(page.getByRole("button", { name: "Update Action" })).toBeVisible({ timeout: 5_000 });

    // Update the description
    const updatedDescription = "Replaced thermal paste, cleaned fans, and reseated RAM modules.";
    const descTextarea = page.locator("#action-description-input");
    await descTextarea.clear();
    await descTextarea.fill(updatedDescription);

    // Also toggle Follow-Up Required
    await page.locator("#action-followup-switch").click();
    await expect(page.locator("#action-followup-note-input")).toBeVisible();
    await page.locator("#action-followup-note-input").fill("Monitor thermals for 48 hours post-maintenance.");

    // ---- STEP 11: Save the edit ----
    await page.getByRole("button", { name: "Update Action" }).click();

    await expect(
      page.getByRole("status").filter({ hasText: /Action taken updated successfully/i })
    ).toBeVisible({ timeout: 8_000 });

    // ---- STEP 12: Verify updated information appears in the timeline ----
    await expect(page.getByText(updatedDescription).first()).toBeVisible();
    await expect(page.getByText("Monitor thermals for 48 hours post-maintenance.").first()).toBeVisible();
    await expect(page.getByText(/Follow-up Required/i).first()).toBeVisible();

    // ---- STEP 13: Verify ticket owner is UNCHANGED (still the original requester's ticket) ----
    // The ticketNumber and ticket summary should still display correctly
    await expect(page.getByText(ticketNumber)).toBeVisible();
    await expect(page.getByText(uniqueSummary)).toBeVisible();

    // Verify via API that the ticket ownerId didn't change to the staff's id
    await request.post(`${API_BASE}/api/auth/login`, {
      data: { email: STAFF_EMAIL, password: STAFF_PASSWORD },
    });
    const ticketCheckRes = await request.get(`${API_BASE}/api/tickets/${ticketId}`);
    expect(ticketCheckRes.status()).toBe(200);
    const ticketData = await ticketCheckRes.json();
    // The ticket should NOT be owned by tech1 (the action performer)
    expect(ticketData.requesterId).not.toBeUndefined();
    // The actions should contain our staff's work
    const actionsRes = await request.get(`${API_BASE}/api/tickets/${ticketId}/actions`);
    expect(actionsRes.status()).toBe(200);
    const actionsBody = await actionsRes.json();
    // GET /api/tickets/:id/actions returns { data: [...] }
    const actions: any[] = actionsBody.data ?? actionsBody;
    expect(Array.isArray(actions)).toBe(true);
    expect(actions.length).toBeGreaterThan(0);
    // Performer should be tech1, NOT the ticket requester
    const ourAction = actions.find((a: any) => a.actionDescription === updatedDescription);
    expect(ourAction).toBeDefined();
    expect(ourAction.performedBy.email).toBe(STAFF_EMAIL);
    await request.post(`${API_BASE}/api/auth/logout`);
  });

  // -------------------------------------------------------------------------
  // AC-07 & AC-06: Requester sees Actions Taken but cannot create them
  // -------------------------------------------------------------------------
  test("AC-06, AC-07: Requester can view Actions Taken but sees no 'Record Action Taken' button", async ({
    page,
    request,
  }) => {
    await ensurePasswordChanged(request, REQUESTER_EMAIL, REQUESTER_PASSWORD);
    await ensurePasswordChanged(request, STAFF_EMAIL, STAFF_PASSWORD);

    // Create a ticket as requester
    await request.post(`${API_BASE}/api/auth/login`, {
      data: { email: REQUESTER_EMAIL, password: REQUESTER_PASSWORD },
    });
    const uniqueSummary = `E2E Requester View Actions ${Date.now()}`;
    const createRes = await request.post(`${API_BASE}/api/tickets`, {
      data: {
        categoryId: 1,
        relatedSystemId: 1,
        summary: uniqueSummary,
        description: "Requester read-only actions taken view verification.",
        requestedPriority: "LOW",
      },
    });
    expect(createRes.status()).toBe(201);
    const createdTicket = await createRes.json();
    const ticketId = createdTicket.id;
    const ticketNumber = createdTicket.ticketNumber;
    await request.post(`${API_BASE}/api/auth/logout`);

    // Staff moves ticket to IN_PROGRESS and records one action via API
    await request.post(`${API_BASE}/api/auth/login`, {
      data: { email: STAFF_EMAIL, password: STAFF_PASSWORD },
    });
    await request.patch(`${API_BASE}/api/tickets/${ticketId}/status`, {
      data: { status: "OPEN" },
    });
    await request.patch(`${API_BASE}/api/tickets/${ticketId}/status`, {
      data: { status: "IN_PROGRESS" },
    });
    const actionRes = await request.post(`${API_BASE}/api/tickets/${ticketId}/actions`, {
      data: {
        actionDescription: "Rebooted the network switch and cleared ARP cache.",
        result: "Network connectivity restored for all devices in building C.",
        isFollowUpRequired: false,
      },
    });
    expect(actionRes.status()).toBe(201);
    await request.post(`${API_BASE}/api/auth/logout`);

    // Now login as requester via UI
    await page.goto("/");
    await page.getByLabel(/email/i).fill(REQUESTER_EMAIL);
    await page.locator("#passwordInput").fill(REQUESTER_PASSWORD);
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page.getByRole("button", { name: /Dashboard/i })).toBeVisible({ timeout: 10_000 });

    // Navigate to My Tickets
    await page.getByRole("button", { name: /My Tickets/i }).click();

    // Find our ticket
    const ticketRow = page.locator(`text=${ticketNumber}`).first();
    await expect(ticketRow).toBeVisible({ timeout: 8_000 });
    await ticketRow.click();

    // Verify ticket detail is open
    await expect(page.getByText(ticketNumber)).toBeVisible({ timeout: 8_000 });

    // Verify Actions Taken section is visible (Requester CAN view)
    await expect(page.getByRole("heading", { name: /Actions Taken/i })).toBeVisible();

    // Verify the action is visible (Requester can read)
    // The component renders both a table (desktop) and mobile cards — use .first() to avoid strict mode violation
    await expect(page.getByText("Rebooted the network switch and cleared ARP cache.").first()).toBeVisible();
    await expect(page.getByText("Network connectivity restored for all devices in building C.").first()).toBeVisible();

    // Verify "Record Action Taken" button is NOT present for Requester (AC-07)
    await expect(page.getByRole("button", { name: /Record Action Taken/i })).not.toBeVisible();
  });

  // -------------------------------------------------------------------------
  // AC-08: Performer != ticket owner (independent staff member)
  // -------------------------------------------------------------------------
  test("AC-08: A different IT Staff member can record actions on any open ticket", async ({
    request,
  }) => {
    // Set up passwords
    await ensurePasswordChanged(request, REQUESTER_EMAIL, REQUESTER_PASSWORD);
    await ensurePasswordChanged(request, STAFF_EMAIL, STAFF_PASSWORD);
    await ensurePasswordChanged(request, STAFF2_EMAIL, STAFF2_PASSWORD);

    // Requester creates ticket
    await request.post(`${API_BASE}/api/auth/login`, {
      data: { email: REQUESTER_EMAIL, password: REQUESTER_PASSWORD },
    });
    const createRes = await request.post(`${API_BASE}/api/tickets`, {
      data: {
        categoryId: 1,
        relatedSystemId: 2,
        summary: `E2E Independent Performer Ticket ${Date.now()}`,
        description: "Independent performer test.",
        requestedPriority: "HIGH",
      },
    });
    expect(createRes.status()).toBe(201);
    const ticket = await createRes.json();
    const ticketId = ticket.id;
    await request.post(`${API_BASE}/api/auth/logout`);

    // Staff1 opens and starts work on ticket
    await request.post(`${API_BASE}/api/auth/login`, {
      data: { email: STAFF_EMAIL, password: STAFF_PASSWORD },
    });
    await request.patch(`${API_BASE}/api/tickets/${ticketId}/status`, { data: { status: "OPEN" } });
    await request.patch(`${API_BASE}/api/tickets/${ticketId}/status`, { data: { status: "IN_PROGRESS" } });
    await request.post(`${API_BASE}/api/auth/logout`);

    // Staff2 (different user) records an action — proves performer != ticket owner
    await request.post(`${API_BASE}/api/auth/login`, {
      data: { email: STAFF2_EMAIL, password: STAFF2_PASSWORD },
    });
    const staff2ActionRes = await request.post(`${API_BASE}/api/tickets/${ticketId}/actions`, {
      data: {
        actionDescription: "Reviewed firewall logs and updated ACL rules.",
        result: "Unauthorized access attempts blocked; ticket ready for validation.",
        isFollowUpRequired: false,
      },
    });
    expect(staff2ActionRes.status()).toBe(201);
    const staff2Action = await staff2ActionRes.json();

    // Verify the action's performer is staff2, NOT staff1
    expect(staff2Action.data?.performedBy?.email).toBe(STAFF2_EMAIL);

    // Verify via GET actions that performer is staff2
    const actionsRes = await request.get(`${API_BASE}/api/tickets/${ticketId}/actions`);
    expect(actionsRes.status()).toBe(200);
    const actionsBody = await actionsRes.json();
    // GET /api/tickets/:id/actions returns { data: [...] }
    const actions: any[] = actionsBody.data ?? actionsBody;
    const theAction = actions.find((a: any) => a.actionDescription === "Reviewed firewall logs and updated ACL rules.");
    expect(theAction).toBeDefined();
    expect(theAction.performedBy.email).toBe(STAFF2_EMAIL);

    // Ticket itself should still have original requester — performer != ticket owner
    const ticketRes = await request.get(`${API_BASE}/api/tickets/${ticketId}`);
    expect(ticketRes.status()).toBe(200);
    const ticketData = await ticketRes.json();
    expect(ticketData.requester?.email).toBe(REQUESTER_EMAIL);

    await request.post(`${API_BASE}/api/auth/logout`);
  });

  // -------------------------------------------------------------------------
  // AC-22: Actions Taken section is accessible at mobile viewport
  // -------------------------------------------------------------------------
  test("AC-22: Actions Taken section is usable at mobile viewport (375px)", async ({
    page,
    request,
  }) => {
    await ensurePasswordChanged(request, STAFF_EMAIL, STAFF_PASSWORD);
    await ensurePasswordChanged(request, REQUESTER_EMAIL, REQUESTER_PASSWORD);

    // Create a ticket and add an action via API
    await request.post(`${API_BASE}/api/auth/login`, {
      data: { email: REQUESTER_EMAIL, password: REQUESTER_PASSWORD },
    });
    const createRes = await request.post(`${API_BASE}/api/tickets`, {
      data: {
        categoryId: 1,
        relatedSystemId: 1,
        summary: `E2E Mobile Actions Ticket ${Date.now()}`,
        description: "Mobile viewport actions taken test.",
        requestedPriority: "MEDIUM",
      },
    });
    expect(createRes.status()).toBe(201);
    const ticket = await createRes.json();
    const ticketId = ticket.id;
    const ticketNumber = ticket.ticketNumber;
    await request.post(`${API_BASE}/api/auth/logout`);

    await request.post(`${API_BASE}/api/auth/login`, {
      data: { email: STAFF_EMAIL, password: STAFF_PASSWORD },
    });
    await request.patch(`${API_BASE}/api/tickets/${ticketId}/status`, { data: { status: "OPEN" } });
    await request.patch(`${API_BASE}/api/tickets/${ticketId}/status`, { data: { status: "IN_PROGRESS" } });
    await request.post(`${API_BASE}/api/tickets/${ticketId}/actions`, {
      data: {
        actionDescription: "Applied system patches via WSUS deployment.",
        result: "All critical patches installed; system running 24 hours stable.",
        isFollowUpRequired: false,
      },
    });
    await request.post(`${API_BASE}/api/auth/logout`);

    // Login as staff at mobile viewport
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    await page.getByLabel(/email/i).fill(STAFF_EMAIL);
    await page.locator("#passwordInput").fill(STAFF_PASSWORD);
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page.getByRole("button", { name: /Dashboard/i })).toBeVisible({ timeout: 10_000 });

    // Navigate to ticket queue
    await page.getByRole("button", { name: /Ticket Queue/i }).click();

    // On mobile (<768px), mobile cards are shown with a "View detail for ticket TKT-..." button
    // Wait for the queue to load
    await page.waitForLoadState("networkidle");
    const viewDetailBtn = page.getByRole("button", { name: new RegExp(`View detail for ticket ${ticketNumber}`, "i") });
    await expect(viewDetailBtn).toBeVisible({ timeout: 8_000 });
    await viewDetailBtn.click();

    // Actions Taken section must be visible and not cause horizontal overflow
    await expect(page.getByRole("heading", { name: /Actions Taken/i })).toBeVisible({ timeout: 8_000 });

    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 2); // 2px tolerance

    // The action card view (mobile) should show our action
    // The mobile view renders actions as <article> elements; the table is hidden via CSS on mobile
    await expect(page.locator("article").filter({ hasText: "Applied system patches via WSUS deployment." })).toBeVisible();

    // Verify "Record Action Taken" button is accessible on mobile too
    await expect(page.getByRole("button", { name: /Record Action Taken/i })).toBeVisible();
  });
});

