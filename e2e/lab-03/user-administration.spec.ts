import { test, expect } from "@playwright/test";

test.describe("Lab 3 - E2E Admin User Management Journey", () => {
  test("AC-18 to AC-24: Administrator user listing, search, create, edit, guardrail, and password reset", async ({ page }) => {
    // 1. Admin login
    await page.goto("/");
    await page.getByLabel(/email/i).fill("admin@toktickit.local");
    await page.locator("#passwordInput").fill("Password123!");
    await page.getByRole("button", { name: /sign in/i }).click();

    // 2. Admin lands on User Management
    await expect(page.locator("#nav-user-management")).toBeVisible();
    await expect(page.getByRole("heading", { name: /User Management/i })).toBeVisible();

    // 3. Search and filter
    const searchInput = page.locator("#search-users-input");
    await expect(searchInput).toBeVisible();
    await searchInput.fill("admin@toktickit.local");
    await expect(page.locator("table")).toContainText("admin@toktickit.local");
    await searchInput.clear();

    const roleFilter = page.locator("#role-filter-select");
    await roleFilter.selectOption("IT_STAFF");
    await expect(page.locator("table")).toContainText("tech1@toktickit.local");
    await roleFilter.selectOption(""); // reset to all roles

    // 4. Create a new user
    const uniqueEmail = `e2e.admin.created.${Date.now()}@toktickit.local`;
    const openCreateBtn = page.getByRole("button", { name: /\+.*Create User/i });
    await expect(openCreateBtn).toBeVisible();
    await openCreateBtn.click();

    // Fill Create User Modal
    await expect(page.getByRole("heading", { name: /Create New User/i })).toBeVisible();
    await page.locator("#create-user-name").fill("E2E Test Employee");
    await page.locator("#create-user-email").fill(uniqueEmail);
    await page.locator("#create-user-role").selectOption("IT_STAFF");
    await page.locator("#create-user-password").fill("InitialTempPass123!");

    const saveUserBtn = page.locator("#save-create-user-btn");
    await expect(saveUserBtn).toBeEnabled();
    await saveUserBtn.click();

    // Verify user appears in table
    await expect(page.locator("table")).toContainText(uniqueEmail);

    // 5. Edit user: update role to REQUESTER
    const userRow = page.locator(`tr:has-text("${uniqueEmail}")`);
    await expect(userRow).toBeVisible();
    const editBtn = userRow.getByRole("button", { name: "Edit" });
    await editBtn.click();

    await expect(page.getByRole("heading", { name: /Edit User/i })).toBeVisible();
    await page.locator("#edit-user-role").selectOption("REQUESTER");
    const saveEditBtn = page.locator("#save-edit-user-btn");
    await saveEditBtn.click();

    // Verify updated role in table
    await expect(page.locator(`tr:has-text("${uniqueEmail}")`)).toContainText("Requester");

    // 6. Test Self-Deactivation Guardrail (Active switch disabled for logged-in Admin)
    const adminRow = page.locator('tr:has-text("admin@toktickit.local")');
    await expect(adminRow).toBeVisible();
    const editAdminBtn = adminRow.getByRole("button", { name: "Edit" });
    await editAdminBtn.click();

    await expect(page.getByRole("heading", { name: /Edit User/i })).toBeVisible();
    const activeSwitch = page.locator("#edit-user-active");
    await expect(activeSwitch).toBeDisabled();
    await expect(page.getByText(/Self-deactivation is prevented/i)).toBeVisible();
    await page.locator("#cancel-edit-user-btn").click();

    // 7. Reset Password
    const targetRow = page.locator(`tr:has-text("${uniqueEmail}")`);
    const resetPassBtn = targetRow.getByRole("button", { name: /Password/i });
    await resetPassBtn.click();

    await expect(page.getByRole("heading", { name: /Set New Initial Password/i })).toBeVisible();
    await page.locator("#reset-password-input").fill("NewResetPass123!");
    const confirmResetBtn = page.locator("#submit-reset-password-btn");
    await confirmResetBtn.click();

    // Verify success banner
    await expect(page.getByText(/New initial password set/i)).toBeVisible();

    // Logout
    await page.getByRole("button", { name: /logout/i }).click();
    await expect(page.getByLabel(/email/i)).toBeVisible();
  });
});
