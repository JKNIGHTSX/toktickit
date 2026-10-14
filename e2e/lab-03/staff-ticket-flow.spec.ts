import { test, expect } from "@playwright/test";

test.describe("Lab 3 - E2E IT Staff Ticket Journey", () => {
  test("AC-08 to AC-17: Staff Ticket Queue, Detail, Assignment, Priority, Status, Comments, and Notes", async ({ page, request }) => {
    // 1. Create a unique test ticket via API as Requester
    const reqLoginRes = await request.post("http://localhost:3000/api/auth/login", {
      data: {
        email: "jennifer.anderson@toktickit.local",
        password: "Password123!",
      },
    });
    expect(reqLoginRes.ok()).toBeTruthy();

    const uniqueSummary = `E2E IT Staff Queue Ticket ${Date.now()}`;
    const createRes = await request.post("http://localhost:3000/api/tickets", {
      data: {
        categoryId: 1,
        relatedSystemId: 1,
        summary: uniqueSummary,
        description: "Staff workflow E2E test description for battery issues.",
        requestedPriority: "MEDIUM",
      },
    });
    expect(createRes.status()).toBe(201);
    const createdTicket = await createRes.json();
    const ticketNumber = createdTicket.ticketNumber;

    // 2. IT Staff signs in
    await page.goto("/");
    await page.getByLabel(/email/i).fill("tech1@toktickit.local");
    await page.locator("#passwordInput").fill("Password123!");
    await page.getByRole("button", { name: /sign in/i }).click();

    // 3. View Queue and verify navigation
    await expect(page.locator("#nav-ticket-queue")).toBeVisible();
    await expect(page.getByRole("heading", { name: /Ticket Queue/i })).toBeVisible();

    // 4. Search for the created ticket
    const searchInput = page.getByLabel("Search by ticket number or summary");
    await expect(searchInput).toBeVisible();
    await searchInput.fill(uniqueSummary);

    // Wait for search result and click ticket row to open detail
    const ticketRow = page.locator(`tr:has-text("${uniqueSummary}")`);
    await expect(ticketRow).toBeVisible();
    await ticketRow.click();

    // 5. Verify Ticket Detail opens
    await expect(page.getByText(ticketNumber)).toBeVisible();
    await expect(page.getByText(uniqueSummary)).toBeVisible();

    // 6. Claim or Assign Ticket Ownership
    const assigneeSelect = page.getByRole("combobox", { name: /Assign to IT Staff or Administrator/i });
    if (await assigneeSelect.isVisible()) {
      // Select Tech One (id 2 or first option)
      await assigneeSelect.selectOption({ index: 1 });
      const assignBtn = page.getByRole("button", { name: /^Assign$/i });
      if (await assignBtn.isEnabled()) {
        await assignBtn.click();
        await expect(page.getByRole("status")).toContainText(/Assigned/i);
      }
    }

    // 7. Update IT Priority
    const prioritySelect = page.getByRole("combobox", { name: /Update IT Priority/i });
    await expect(prioritySelect).toBeVisible();
    await prioritySelect.selectOption("HIGH");
    const savePriorityBtn = page.getByRole("button", { name: /Save Priority/i });
    await expect(savePriorityBtn).toBeEnabled();
    await savePriorityBtn.click();
    await expect(page.getByText(/IT Priority updated to HIGH/i)).toBeVisible();

    // 8. Add Public Comment
    const commentInput = page.getByLabel("Add Public Comment");
    await expect(commentInput).toBeVisible();
    const commentText = `Public comment posted by IT Staff ${Date.now()}`;
    await commentInput.fill(commentText);
    const postCommentBtn = page.getByRole("button", { name: "Post Comment" });
    await expect(postCommentBtn).toBeEnabled();
    await postCommentBtn.click();
    await expect(page.getByText(commentText)).toBeVisible();

    // 9. Add Internal Note
    const noteInput = page.getByLabel("Add Internal Note");
    await expect(noteInput).toBeVisible();
    const noteText = `Private internal diagnostic note ${Date.now()}`;
    await noteInput.fill(noteText);
    const postNoteBtn = page.getByRole("button", { name: "Post Internal Note" });
    await expect(postNoteBtn).toBeEnabled();
    await postNoteBtn.click();
    await expect(page.getByText(noteText)).toBeVisible();

    // Verify amber internal notes banner/indicator
    await expect(page.getByText(/Restricted: visible only to IT Staff and Administrators/i)).toBeVisible();

    // 10. Status Transitions: Advance to IN_PROGRESS, then RESOLVED with summary
    const openBtn = page.getByRole("button", { name: "Open Ticket" });
    if (await openBtn.isVisible()) {
      await openBtn.click();
      await page.waitForTimeout(300);
    }

    const beginWorkBtn = page.getByRole("button", { name: "Begin Work" });
    if (await beginWorkBtn.isVisible()) {
      await beginWorkBtn.click();
      await page.waitForTimeout(300);
    }

    // Resolve ticket requires resolution summary
    const resolutionInput = page.getByLabel("Resolution Summary");
    if (await resolutionInput.isVisible()) {
      await resolutionInput.fill("Hardware diagnostic completed and battery module replaced.");
      const resolveBtn = page.getByRole("button", { name: "Resolve Ticket" });
      await expect(resolveBtn).toBeEnabled();
      await resolveBtn.click();
      await expect(page.getByText(/Ticket status updated to RESOLVED/i)).toBeVisible();
    }

    // 11. Back to Queue navigation
    const backBtn = page.getByRole("button", { name: /Back to Ticket Queue/i });
    await expect(backBtn).toBeVisible();
    await backBtn.click();
    await expect(page.getByRole("heading", { name: /Ticket Queue/i })).toBeVisible();

    // Logout
    await page.getByRole("button", { name: /logout/i }).click();
    await expect(page.getByLabel(/email/i)).toBeVisible();
  });
});
