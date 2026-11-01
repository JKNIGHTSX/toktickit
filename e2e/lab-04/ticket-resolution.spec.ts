import { test, expect } from "@playwright/test";

/**
 * Lab 4 — Issue #5: Ticket Resolution Gate End-to-End Journey (E2E-02)
 *
 * Traceability:
 *   - AC-11: Resolution gate blocks resolving a ticket when 0 Actions Taken exist.
 *   - AC-12: Resolution gate requires valid resolution summary (>= 5 chars).
 *   - AC-13: Requester advisory indication posts comment and does not directly set RESOLVED.
 *   - Permitted status flow: NEW -> OPEN -> IN_PROGRESS -> RESOLVED -> CLOSED.
 */

test.describe("Lab 4 - Ticket Resolution Gate E2E Journey", () => {
  test("AC-11, AC-12, AC-13: Resolution gate blocks until action recorded, accepts valid resolution, closes, and keeps Requester feedback advisory", async ({
    page,
    request,
  }) => {
    // 1. Authenticate as Requester and create a fresh test ticket
    const reqLoginRes = await request.post("http://localhost:3000/api/auth/login", {
      data: {
        email: "jennifer.anderson@toktickit.local",
        password: "Password123!",
      },
    });
    expect(reqLoginRes.ok()).toBeTruthy();

    const uniqueSummary = `E2E Resolution Gate Ticket ${Date.now()}`;
    const createRes = await request.post("http://localhost:3000/api/tickets", {
      data: {
        categoryId: 1,
        relatedSystemId: 1,
        summary: uniqueSummary,
        description: "Testing resolution gate enforcement with Actions Taken and closure.",
        requestedPriority: "HIGH",
      },
    });
    expect(createRes.status()).toBe(201);
    const createdTicket = await createRes.json();
    const ticketId = createdTicket.id;
    const ticketNumber = createdTicket.ticketNumber;

    // 2. Login as IT Staff
    await page.goto("/");
    await page.getByLabel(/email/i).fill("tech1@toktickit.local");
    await page.locator("#passwordInput").fill("Password123!");
    await page.getByRole("button", { name: /sign in/i }).click();

    // 3. Navigate to Ticket Queue and locate ticket
    await expect(page.locator("#nav-ticket-queue")).toBeVisible();
    const searchInput = page.getByLabel("Search by ticket number or summary");
    await searchInput.fill(uniqueSummary);

    const ticketRow = page.locator(`tr:has-text("${uniqueSummary}")`);
    await expect(ticketRow).toBeVisible();
    await ticketRow.click();

    // 4. Verify Ticket Detail opens
    await expect(page.getByText(ticketNumber)).toBeVisible();

    // 5. Claim / Open Ticket (NEW -> OPEN)
    const openBtn = page.getByRole("button", { name: "Open Ticket" });
    if (await openBtn.isVisible()) {
      await openBtn.click();
      await expect(page.getByRole("status")).toBeVisible();
    }

    // 6. Begin Work (OPEN -> IN_PROGRESS)
    const beginWorkBtn = page.getByRole("button", { name: "Begin Work" });
    if (await beginWorkBtn.isVisible()) {
      await beginWorkBtn.click();
      await expect(page.getByRole("status")).toBeVisible();
    }

    // 7. Verify Resolution Gate: Attempting to resolve without Actions Taken is blocked
    const resolveBtn = page.getByRole("button", { name: "Resolve Ticket" });
    await expect(resolveBtn).toBeVisible();

    // With 0 actions taken and empty summary, button must be disabled
    await expect(resolveBtn).toBeDisabled();

    // Attempting direct backend PATCH without actions must return 422
    const staffLoginRes = await request.post("http://localhost:3000/api/auth/login", {
      data: {
        email: "tech1@toktickit.local",
        password: "Password123!",
      },
    });
    expect(staffLoginRes.ok()).toBeTruthy();

    const directResolveRes = await request.patch(`http://localhost:3000/api/tickets/${ticketId}/status`, {
      data: {
        status: "RESOLVED",
        resolutionSummary: "Direct resolution attempt without actions",
      },
    });
    expect(directResolveRes.status()).toBe(422);
    const errBody = await directResolveRes.json();
    expect(errBody.code).toBe("RESOLUTION_REQUIRES_ACTION_TAKEN");

    // 8. Record an Action Taken on the ticket via API or UI
    const createActionRes = await request.post(`http://localhost:3000/api/tickets/${ticketId}/actions`, {
      data: {
        actionDescription: "Replaced faulty battery pack with OEM part.",
        result: "Laptop boots normally and battery charges to 100%.",
        isFollowUpRequired: false,
      },
    });
    expect(createActionRes.status()).toBe(201);

    // Reload or re-check the ticket detail
    await page.reload();
    await expect(page.getByText(ticketNumber)).toBeVisible();

    // 9. Enter resolution summary (< 5 chars should keep resolve disabled)
    const summaryInput = page.getByLabel("Resolution Summary");
    await expect(summaryInput).toBeVisible();
    await summaryInput.fill("Fix");
    await expect(page.getByRole("button", { name: "Resolve Ticket" })).toBeDisabled();

    // Enter valid resolution summary (>= 5 chars)
    await summaryInput.fill("Replaced swollen battery pack and confirmed normal load stability.");
    await expect(page.getByRole("button", { name: "Resolve Ticket" })).toBeEnabled();

    // Click Resolve Ticket
    await page.getByRole("button", { name: "Resolve Ticket" }).click();
    await expect(page.getByRole("status")).toContainText(/Ticket status updated to RESOLVED/i);

    // 10. Close Ticket (RESOLVED -> CLOSED)
    const closeBtn = page.getByRole("button", { name: "Close Ticket" });
    await expect(closeBtn).toBeVisible();
    await closeBtn.click();
    await expect(page.getByRole("status")).toContainText(/Ticket status updated to CLOSED/i);

    // 11. Verify Advisory Requester Feedback:
    // Create another ticket for Requester advisory test
    const reqTicketRes = await request.post("http://localhost:3000/api/tickets", {
      headers: { Cookie: reqLoginRes.headers()["set-cookie"] || "" },
      data: {
        categoryId: 1,
        relatedSystemId: 1,
        summary: `Advisory Requester Ticket ${Date.now()}`,
        description: "Checking Requester Problem Appears Resolved remains advisory.",
        requestedPriority: "MEDIUM",
      },
    });
    const reqTicket = await reqTicketRes.json();

    // Transition to IN_PROGRESS by staff
    await request.patch(`http://localhost:3000/api/tickets/${reqTicket.id}/status`, {
      data: { status: "OPEN" },
    });
    await request.patch(`http://localhost:3000/api/tickets/${reqTicket.id}/status`, {
      data: { status: "IN_PROGRESS" },
    });

    // Requester clicks "Problem Appears Resolved"
    const advisoryRes = await request.post(`http://localhost:3000/api/tickets/${reqTicket.id}/problem-appears-resolved`, {
      headers: { Cookie: reqLoginRes.headers()["set-cookie"] || "" },
    });
    expect(advisoryRes.status()).toBe(200);

    // Check that ticket status did NOT directly become RESOLVED
    const checkReqTicket = await request.get(`http://localhost:3000/api/tickets/${reqTicket.id}`, {
      headers: { Cookie: reqLoginRes.headers()["set-cookie"] || "" },
    });
    const fetchedReqTicket = await checkReqTicket.json();
    expect(fetchedReqTicket.status).not.toBe("RESOLVED");
    expect(fetchedReqTicket.status).toBe("IN_PROGRESS");
  });
});

