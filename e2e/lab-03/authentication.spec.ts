import { test, expect } from "@playwright/test";

test.describe("Lab 3 - E2E Authentication Journey", () => {
  test("AC-01: valid login shows user profile, role badge, and enters application", async ({ page }) => {
    await page.goto("/");

    // Check login form visible
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await page.getByLabel(/email/i).fill("tech1@toktickit.local");
    await page.locator("#passwordInput").fill("Password123!");
    await page.getByRole("button", { name: /sign in/i }).click();

    // Verify authenticated user badge and role in navbar
    await expect(page.getByText("Tech One")).toBeVisible();
    await expect(page.getByText("IT Staff", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /logout/i })).toBeVisible();

    // Verify IT Staff queue navigation
    await expect(page.locator("#nav-ticket-queue")).toBeVisible();

    // Clean up session
    await page.getByRole("button", { name: /logout/i }).click();
    await expect(page.getByLabel(/email/i)).toBeVisible();
  });

  test("AC-02: inactive account login is rejected with safe error message", async ({ page }) => {
    await page.goto("/");

    await page.getByLabel(/email/i).fill("inactive.user@toktickit.local");
    await page.locator("#passwordInput").fill("Password123!");
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page.getByRole("alert")).toContainText(/Account is inactive/i);
  });

  test("invalid credentials displays safe failure feedback", async ({ page }) => {
    await page.goto("/");

    await page.getByLabel(/email/i).fill("tech1@toktickit.local");
    await page.locator("#passwordInput").fill("WrongPassword999!");
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page.getByRole("alert")).toContainText(/Invalid email or password/i);
  });

  test("AC-03, AC-04, AC-05: mandatory password change intercept, validation, success, and logout", async ({ page, request }) => {
    // 1. Create a fresh user with mustChangePassword = true via API
    const uniqueEmail = `e2e.auth.${Date.now()}@toktickit.local`;
    const tempPass = "InitialPass123!";

    // Admin login to provision user
    const adminLoginRes = await request.post("http://localhost:3000/api/auth/login", {
      data: {
        email: "admin@toktickit.local",
        password: "Password123!",
      },
    });
    expect(adminLoginRes.ok()).toBeTruthy();

    const createUserRes = await request.post("http://localhost:3000/api/users", {
      data: {
        name: "First Time User",
        email: uniqueEmail,
        role: "REQUESTER",
        isActive: true,
        initialPassword: tempPass,
      },
    });
    expect(createUserRes.status()).toBe(201);

    // 2. User logs in with initial password
    await page.goto("/");
    await page.getByLabel(/email/i).fill(uniqueEmail);
    await page.locator("#passwordInput").fill(tempPass);
    await page.getByRole("button", { name: /sign in/i }).click();

    // 3. Intercepted by mandatory Change Password screen
    await expect(page.getByRole("heading", { name: /Change Your Password/i })).toBeVisible();
    await expect(page.getByText(/You must change your password to continue/i)).toBeVisible();

    // 4. Fill password change form
    const currentPassInput = page.getByLabel(/Current \(temporary\) password/i);
    const newPassInput = page.getByLabel(/^New password/i);
    const confirmPassInput = page.getByLabel(/Confirm new password/i);

    await currentPassInput.fill(tempPass);
    await newPassInput.fill("NewSecurePass123!");
    await confirmPassInput.fill("NewSecurePass123!");

    // Check rules pass and submit
    const submitBtn = page.getByRole("button", { name: /Continue/i });
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();

    // 5. User enters normal application (Requester view: Create Ticket / My Tickets)
    await expect(page.getByRole("button", { name: /\+ Create Ticket/i })).toBeVisible();
    await expect(page.getByText("First Time User")).toBeVisible();

    // 6. AC-05: Logout invalidates session
    await page.getByRole("button", { name: /logout/i }).click();

    // 7. Redirected back to login
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });
});
