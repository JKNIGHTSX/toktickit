import { test, expect, type APIRequestContext } from "@playwright/test";

const apiUrl = "http://localhost:3000";

async function signInAdmin(request: APIRequestContext) {
  const response = await request.post(`${apiUrl}/api/auth/login`, {
    data: {
      email: "admin@toktickit.local",
      password: "Password123!",
    },
  });
  expect(response.status()).toBe(200);

  const { data: { user } } = await response.json();
  if (user.mustChangePassword) {
    const changeResponse = await request.post(`${apiUrl}/api/auth/change-password`, {
      data: {
        currentPassword: "Password123!",
        newPassword: "E2eAdminPassword123!",
        confirmPassword: "E2eAdminPassword123!",
      },
    });
    expect(changeResponse.status()).toBe(200);
  }
  return user.id as number;
}

async function resetInitialPassword(
  request: APIRequestContext,
  userId: number,
  initialPassword = "Password123!"
) {
  const response = await request.post(`${apiUrl}/api/users/${userId}/reset-password`, {
    data: { initialPassword },
  });
  expect(response.status()).toBe(200);
}

test.describe("Lab 3 - E2E Authentication Journey", () => {
  test("AC-01: IT Staff must change their initial password before entering the application", async ({ page, request }) => {
    const adminId = await signInAdmin(request);
    const techResponse = await request.get(`${apiUrl}/api/users?search=tech1%40toktickit.local`);
    expect(techResponse.status()).toBe(200);
    const techUsers = await techResponse.json();
    const techUser = techUsers.find((user: { email: string }) => user.email === "tech1@toktickit.local");
    expect(techUser).toBeDefined();
    await resetInitialPassword(request, techUser.id);

    await page.goto("/");

    await expect(page.getByLabel(/email/i)).toBeVisible();
    await page.getByLabel(/email/i).fill("tech1@toktickit.local");
    await page.locator("#passwordInput").fill("Password123!");
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page.getByRole("heading", { name: /Change Your Password/i })).toBeVisible();
    await expect(page.getByLabel(/Current \(temporary\) password/i)).toBeVisible();
    await expect(page.getByLabel(/^New password/i)).toBeVisible();
    await expect(page.getByLabel(/Confirm new password/i)).toBeVisible();
    const changePasswordButton = page.getByRole("button", { name: /Change Password/i });
    await expect(changePasswordButton).toBeVisible();
    await page.getByLabel(/Current \(temporary\) password/i).fill("Password123!");
    await page.getByLabel(/^New password/i).fill("TechChangedPass123!");
    await page.getByLabel(/Confirm new password/i).fill("TechChangedPass123!");
    await changePasswordButton.click();

    await expect(page.getByText("Tech One", { exact: true })).toBeVisible();
    await expect(page.getByText("IT Staff", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /logout/i })).toBeVisible();
    await expect(page.locator("#nav-ticket-queue")).toBeVisible();

    await page.getByRole("button", { name: /logout/i }).click();
    await expect(page.getByLabel(/email/i)).toBeVisible();

    await resetInitialPassword(request, techUser.id);
    await resetInitialPassword(request, adminId);
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
    const browserErrors: string[] = [];
    const httpErrors: { url: string; status: number }[] = [];
    const failedRequests: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") browserErrors.push(message.text());
    });
    page.on("pageerror", (error) => browserErrors.push(error.message));
    page.on("requestfailed", (request) => failedRequests.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText}`));
    page.on("response", (response) => {
      if (response.status() >= 400) {
        httpErrors.push({ url: response.url(), status: response.status() });
      }
    });

    // 1. Create a fresh user with mustChangePassword = true via API
    const uniqueEmail = `e2e.auth.${Date.now()}@toktickit.local`;
    const tempPass = "InitialPass123!";

    // Admin login to provision user
    const adminId = await signInAdmin(request);

    const createUserRes = await request.post(`${apiUrl}/api/users`, {
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
    const loginResponsePromise = page.waitForResponse((response) =>
      response.url().endsWith("/api/auth/login") &&
      response.request().method() === "POST"
    );
    await page.getByRole("button", { name: /sign in/i }).click();
    const loginResponse = await loginResponsePromise;
    expect(loginResponse.status()).toBe(200);
    expect((await loginResponse.json()).data.user.mustChangePassword).toBe(true);

    // 3. Intercepted by mandatory Change Password screen
    await expect(page.getByRole("heading", { name: /Change Your Password/i })).toBeVisible();
    await expect(page.getByText(/You must change your password to continue/i)).toBeVisible();
    await page.setViewportSize({ width: 390, height: 667 });
    const submitBtn = page.getByRole("button", { name: /Change Password/i });
    await expect(submitBtn).toBeVisible();
    const submitButtonBox = await submitBtn.boundingBox();
    expect(submitButtonBox).not.toBeNull();
    expect(submitButtonBox!.y + submitButtonBox!.height).toBeLessThanOrEqual(667);
    await expect(page.getByRole("button", { name: /\+ Create Ticket/i })).not.toBeVisible();

    const guardResult = await page.evaluate(async () => {
      const response = await fetch("http://localhost:3000/api/tickets/my-protected-check", {
        credentials: "include",
      });
      return { status: response.status, body: await response.json() };
    });
    expect(guardResult.status).toBe(403);
    expect(guardResult.body.code).toBe("MUST_CHANGE_PASSWORD");

    // 4. Fill password change form
    const currentPassInput = page.getByLabel(/Current \(temporary\) password/i);
    const newPassInput = page.getByLabel(/^New password/i);
    const confirmPassInput = page.getByLabel(/Confirm new password/i);

    await currentPassInput.fill("WrongInitialPass123!");
    await newPassInput.fill("NewSecurePass123!");
    await confirmPassInput.fill("DifferentNewPass123!");

    await submitBtn.click();
    await expect(page.getByRole("alert")).toContainText(/do not match/i);
    await expect(page.getByRole("heading", { name: /Change Your Password/i })).toBeVisible();

    await confirmPassInput.fill("NewSecurePass123!");

    // Verify backend rejection remains visible without unmounting the form.
    await expect(submitBtn).toBeEnabled();
    const failedChangeResponsePromise = page.waitForResponse((response) =>
      response.url().endsWith("/api/auth/change-password") &&
      response.request().method() === "POST"
    );
    await submitBtn.click();
    const failedChangeResponse = await failedChangeResponsePromise;
    expect(failedChangeResponse.status()).toBe(400);
    await expect(page.getByRole("alert")).toContainText(/current password is incorrect/i);
    await expect(page.getByRole("heading", { name: /Change Your Password/i })).toBeVisible();

    await currentPassInput.fill(tempPass);
    const successfulChangeResponsePromise = page.waitForResponse((response) =>
      response.url().endsWith("/api/auth/change-password") &&
      response.request().method() === "POST"
    );
    await submitBtn.click();
    expect((await successfulChangeResponsePromise).status()).toBe(200);

    // 5. User enters normal application (Requester view: Create Ticket / My Tickets)
    await page.setViewportSize({ width: 1280, height: 720 });
    await expect(page.getByRole("button", { name: /\+ Create Ticket/i })).toBeVisible();
    await expect(page.getByText("First Time User")).toBeVisible();
    await expect(page.getByRole("status")).toContainText(/password changed successfully/i);
    expect(browserErrors.filter((error) => !error.includes("Failed to load resource"))).toEqual([]);
    expect(failedRequests).toEqual([]);
    expect(httpErrors.filter(({ url, status }) => status === 401 && url.endsWith("/api/auth/me"))).toHaveLength(2);
    expect(httpErrors.filter(({ url, status }) => status === 403 && url.endsWith("/api/tickets/my-protected-check"))).toHaveLength(1);
    expect(httpErrors.filter(({ url, status }) => status === 400 && url.endsWith("/api/auth/change-password"))).toHaveLength(1);
    expect(httpErrors).toHaveLength(4);

    // 6. AC-05: Logout invalidates session
    await page.getByRole("button", { name: /logout/i }).click();

    // 7. A later login with the changed password no longer requires another change.
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
    await page.getByLabel(/email/i).fill(uniqueEmail);
    await page.locator("#passwordInput").fill("NewSecurePass123!");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page.getByRole("button", { name: /\+ Create Ticket/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Change Your Password/i })).not.toBeVisible();
    await page.getByRole("button", { name: /logout/i }).click();
    await expect(page.getByLabel(/email/i)).toBeVisible();

    await resetInitialPassword(request, adminId);
  });
});
