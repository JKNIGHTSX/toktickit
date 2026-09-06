import { test, expect } from "@playwright/test";

test.describe("Lab 2 - Requester Ticket Flow", () => {
  test("requester can create a ticket and open it from My Tickets", async ({ page }) => {
    // 1. Open application
    await page.goto("/");

    // 2. Select Development Requester
    await expect(
      page.getByText("Select Development Requester")
    ).toBeVisible();

    const requesterSelect = page.getByRole("combobox");
    await requesterSelect.selectOption("1");

    const continueButton = page.getByRole("button", {
      name: /continue/i,
    });

    await expect(continueButton).toBeEnabled();
    await continueButton.click();

    // 3. Create Ticket page should be displayed
    await expect(
      page.getByRole("heading", { name: "Create Support Ticket" })
    ).toBeVisible();

    // 4. Select Category
    const categorySelect = page.getByLabel("Category");
    await expect(categorySelect).toBeVisible();

    const categoryOptions = await categorySelect.locator("option").all();
    expect(categoryOptions.length).toBeGreaterThan(1);

    await categorySelect.selectOption({ index: 1 });

    // 5. Select Related System
    const systemSelect = page.getByLabel("Related System");
    await expect(systemSelect).toBeVisible();

    const systemOptions = await systemSelect.locator("option").all();
    expect(systemOptions.length).toBeGreaterThan(1);

    await systemSelect.selectOption({ index: 1 });

    // 6. Select Requested Priority
    const prioritySelect = page.getByLabel("Requested Priority");
    await prioritySelect.selectOption("MEDIUM");

    // 7. Fill ticket summary and description
    const uniqueSummary =
      `E2E Lab 2 ticket ${Date.now()}`;

    await page.getByLabel("Summary").fill(uniqueSummary);

    await page
      .getByLabel("Description")
      .fill(
        "This ticket was created automatically by the Lab 2 Playwright E2E test."
      );

    // 8. Submit ticket
    const submitButton = page.getByRole("button", {
      name: /submit ticket/i,
    });

    await expect(submitButton).toBeEnabled();
    await submitButton.click();

    // 9. Verify ticket was created and Ticket Number is displayed
    await expect(
      page.getByText("Ticket Created Successfully!")
    ).toBeVisible();

    const successMessage = page.getByRole("alert").filter({
      hasText: "Your ticket number is",
    });

    await expect(successMessage).toBeVisible();

    const ticketNumberText = await successMessage.textContent();

    expect(ticketNumberText).toMatch(/TKT-\d{4}-\d+/);

    const ticketNumberMatch = ticketNumberText?.match(
      /TKT-\d{4}-\d+/
    );

    expect(ticketNumberMatch).not.toBeNull();

    const ticketNumber = ticketNumberMatch![0];

    // 10. Navigate to My Tickets
    await page.getByRole("button", { name: "My Tickets" }).click();

    await expect(
      page.getByRole("heading", { name: "My Tickets" })
    ).toBeVisible();

    // 11. Find the newly created ticket
    await expect(
      page.getByRole("cell", { name: ticketNumber })
    ).toBeVisible();

    await expect(
      page.getByRole("cell", { name: uniqueSummary })
    ).toBeVisible();

    // 12. Open Ticket Detail
    await page.getByRole("cell", { name: ticketNumber }).click();

    // 13. Verify Ticket Detail
    await expect(
      page.getByText(ticketNumber)
    ).toBeVisible();

    await expect(
      page.getByText(uniqueSummary)
    ).toBeVisible();

    await expect(
      page.getByText("This ticket was created automatically by the Lab 2 Playwright E2E test.")
    ).toBeVisible();

    // 14. Verify NEW status
    await expect(page.getByText("NEW")).toBeVisible();
  });
});