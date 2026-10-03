import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { validatePasswordPolicy } from "../../src/utils/password-policy.js";

describe("Lab 3 — Issue #3: Authentication & First-Login Password Change API Tests", () => {
  describe("UT-01: Password Policy Unit Tests", () => {
    it("accepts valid passwords meeting all complexity criteria", () => {
      const result = validatePasswordPolicy("SecurePass123!");
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("rejects passwords shorter than 8 characters", () => {
      const result = validatePasswordPolicy("P1!");
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Password must be at least 8 characters long");
    });

    it("rejects passwords missing uppercase letters", () => {
      const result = validatePasswordPolicy("securepass123!");
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Password must contain at least one uppercase letter");
    });

    it("rejects passwords missing lowercase letters", () => {
      const result = validatePasswordPolicy("SECUREPASS123!");
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Password must contain at least one lowercase letter");
    });

    it("rejects passwords missing numeric digits", () => {
      const result = validatePasswordPolicy("SecurePassword!");
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Password must contain at least one numeric digit");
    });

    it("rejects passwords missing special characters", () => {
      const result = validatePasswordPolicy("SecurePassword123");
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Password must contain at least one special character");
    });
  });

  describe("API-01: Valid Login (POST /api/auth/login)", () => {
    it("authenticates active user with valid credentials and sets session cookie", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: "tech1@toktickit.local",
          password: "Password123!",
        });

      expect(res.status).toBe(200);
      expect(res.headers["set-cookie"]).toBeDefined();
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.email).toBe("tech1@toktickit.local");
      expect(res.body.data.user.role).toBe("IT_STAFF");
      expect(res.body.data.user.passwordHash).toBeUndefined();
    }, 15000);
  });

  describe("API-02: Invalid Credentials & Inactive Account Login Rejection", () => {
    it("returns 401 Unauthorized for wrong password", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: "tech1@toktickit.local",
          password: "WrongPassword123!",
        });

      expect(res.status).toBe(401);
      expect(res.body.code).toBe("INVALID_CREDENTIALS");
      expect(res.body.error).toBe("Invalid email or password");
    }, 15000);

    it("returns 401 Unauthorized for non-existent user email", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: "nonexistent@toktickit.local",
          password: "Password123!",
        });

      expect(res.status).toBe(401);
      expect(res.body.code).toBe("INVALID_CREDENTIALS");
    }, 15000);

    it("returns 401 Unauthorized with safe error message when user account is inactive", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: "inactive.user@toktickit.local",
          password: "Password123!",
        });

      expect(res.status).toBe(401);
      expect(res.body.code).toBe("ACCOUNT_INACTIVE");
      expect(res.body.error).toContain("Account is inactive");
    }, 15000);
  });

  describe("GET /api/auth/me & Session Management", () => {
    it("returns 401 Unauthorized for unauthenticated request", async () => {
      const res = await request(app).get("/api/auth/me");
      expect(res.status).toBe(401);
      expect(res.body.code).toBe("UNAUTHENTICATED");
    }, 15000);

    it("returns authenticated user profile when session cookie is present", async () => {
      const agent = request.agent(app);
      await agent.post("/api/auth/login").send({
        email: "jennifer.anderson@toktickit.local",
        password: "Password123!",
      });

      const meRes = await agent.get("/api/auth/me");
      expect(meRes.status).toBe(200);
      expect(meRes.body.data.email).toBe("jennifer.anderson@toktickit.local");
      expect(meRes.body.data.role).toBe("REQUESTER");
    }, 15000);
  });

  describe("API-03: Logout (POST /api/auth/logout)", () => {
    it("invalidates session and blocks subsequent authenticated calls", async () => {
      const agent = request.agent(app);
      await agent.post("/api/auth/login").send({
        email: "jennifer.anderson@toktickit.local",
        password: "Password123!",
      });

      const logoutRes = await agent.post("/api/auth/logout");
      expect(logoutRes.status).toBe(200);

      const meRes = await agent.get("/api/auth/me");
      expect(meRes.status).toBe(401);
    }, 15000);
  });

  describe("API-04 & API-05: First-Login Mandatory Password Change Journey", () => {
    it("blocks normal application routes when user mustChangePassword=true", async () => {
      const prisma = getPrisma();
      // Set mustChangePassword = true for David Lee
      await prisma.user.update({
        where: { email: "david.lee@toktickit.local" },
        data: { mustChangePassword: true },
      });

      const agent = request.agent(app);
      const loginRes = await agent.post("/api/auth/login").send({
        email: "david.lee@toktickit.local",
        password: "Password123!",
      });
      expect(loginRes.status).toBe(200);
      expect(loginRes.body.data.user.mustChangePassword).toBe(true);

      // Attempting to access protected application endpoints like GET /api/tickets/my (or custom path) returns 403
      const blockedRes = await agent.get("/api/tickets/my-protected-check");
      expect(blockedRes.status).toBe(403);
      expect(blockedRes.body.code).toBe("MUST_CHANGE_PASSWORD");

      // Reset back to false for David Lee
      await prisma.user.update({
        where: { email: "david.lee@toktickit.local" },
        data: { mustChangePassword: false },
      });
    }, 15000);

    it("handles password change validation, confirmation matching, and success", async () => {
      const agent = request.agent(app);
      await agent.post("/api/auth/login").send({
        email: "tech1@toktickit.local",
        password: "Password123!",
      });

      // 1. Password mismatch check
      const mismatchRes = await agent.post("/api/auth/change-password").send({
        currentPassword: "Password123!",
        newPassword: "NewSecurePass123!",
        confirmPassword: "DifferentPassword123!",
      });
      expect(mismatchRes.status).toBe(400);

      // 2. Incorrect current password check
      const wrongCurrentRes = await agent.post("/api/auth/change-password").send({
        currentPassword: "WrongCurrentPassword123!",
        newPassword: "NewSecurePass123!",
        confirmPassword: "NewSecurePass123!",
      });
      expect(wrongCurrentRes.status).toBe(400);
      expect(wrongCurrentRes.body.code).toBe("INVALID_CURRENT_PASSWORD");

      // 3. Password policy violation check
      const weakRes = await agent.post("/api/auth/change-password").send({
        currentPassword: "Password123!",
        newPassword: "weak",
        confirmPassword: "weak",
      });
      expect(weakRes.status).toBe(400);
      expect(weakRes.body.code).toBe("VALIDATION_ERROR");

      // 4. Successful password change
      const successRes = await agent.post("/api/auth/change-password").send({
        currentPassword: "Password123!",
        newPassword: "NewSecurePass123!",
        confirmPassword: "NewSecurePass123!",
      });
      expect(successRes.status).toBe(200);

      // Verify login with new password works and mustChangePassword is false
      await agent.post("/api/auth/logout");
      const reLoginRes = await agent.post("/api/auth/login").send({
        email: "tech1@toktickit.local",
        password: "NewSecurePass123!",
      });
      expect(reLoginRes.status).toBe(200);
      expect(reLoginRes.body.data.user.mustChangePassword).toBe(false);

      // Restore password back to Password123! so other tests continue seamlessly
      await agent.post("/api/auth/change-password").send({
        currentPassword: "NewSecurePass123!",
        newPassword: "Password123!",
        confirmPassword: "Password123!",
      });
    }, 15000);
  });
});
