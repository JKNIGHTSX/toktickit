import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import bcrypt from "bcryptjs";

describe("Lab 3 — Issue #8: Administrator User Management API Tests", () => {
  let adminAgent: any;
  let itStaffAgent: any;
  let requesterAgent: any;

  let adminUser: any;
  let itStaffUser: any;
  let requesterUser: any;

  const cleanupTestUsers = async () => {
    const prisma = getPrisma();
    await prisma.user.deleteMany({
      where: {
        OR: [
          { email: { startsWith: "test.user." } },
          { email: { startsWith: "editable." } },
          { email: { startsWith: "conflict." } },
          { email: { startsWith: "temp.admin." } },
          { email: { startsWith: "reset.target." } },
          { email: { startsWith: "new.email." } },
        ],
      },
    });
  };

  afterAll(async () => {
    await cleanupTestUsers();
    const prisma = getPrisma();
    if (adminUser) {
      await prisma.user.update({
        where: { id: adminUser.id },
        data: { isActive: true, role: "ADMINISTRATOR", mustChangePassword: false },
      });
    }
  });

  beforeAll(async () => {
    await cleanupTestUsers();
    const prisma = getPrisma();

    // Ensure seed admin, staff, and requester exist
    adminUser = await prisma.user.findFirst({
      where: { email: "admin@toktickit.local" },
    });
    if (!adminUser) {
      const hash = await bcrypt.hash("Password123!", 10);
      adminUser = await prisma.user.create({
        data: {
          name: "John Smith",
          email: "admin@toktickit.local",
          role: "ADMINISTRATOR",
          isActive: true,
          mustChangePassword: false,
          passwordHash: hash,
        },
      });
    } else {
      await prisma.user.update({
        where: { id: adminUser.id },
        data: { mustChangePassword: false, isActive: true },
      });
    }

    itStaffUser = await prisma.user.findFirst({
      where: { email: "tech1@toktickit.local" },
    });
    if (itStaffUser) {
      await prisma.user.update({
        where: { id: itStaffUser.id },
        data: { mustChangePassword: false, isActive: true },
      });
    }

    requesterUser = await prisma.user.findFirst({
      where: { email: "jennifer.anderson@toktickit.local" },
    });
    if (requesterUser) {
      await prisma.user.update({
        where: { id: requesterUser.id },
        data: { mustChangePassword: false, isActive: true },
      });
    }

    // Set up authenticated agents
    adminAgent = request.agent(app);
    await adminAgent.post("/api/auth/login").send({
      email: adminUser.email,
      password: "Password123!",
    });

    itStaffAgent = request.agent(app);
    await itStaffAgent.post("/api/auth/login").send({
      email: itStaffUser.email,
      password: "Password123!",
    });

    requesterAgent = request.agent(app);
    await requesterAgent.post("/api/auth/login").send({
      email: requesterUser.email,
      password: "Password123!",
    });
  });

  describe("API-19: Administrator User Listing & Query Filtering", () => {
    it("returns 200 and list of all users for Administrator", async () => {
      const res = await adminAgent.get("/api/users");
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);

      const first = res.body[0];
      expect(first).toHaveProperty("id");
      expect(first).toHaveProperty("name");
      expect(first).toHaveProperty("email");
      expect(first).toHaveProperty("role");
      expect(first).toHaveProperty("isActive");
      expect(first).toHaveProperty("mustChangePassword");
      expect(first.passwordHash).toBeUndefined(); // Never expose passwords
    });

    it("filters user list by search keyword matching name or email", async () => {
      const resName = await adminAgent.get("/api/users?search=John");
      expect(resName.status).toBe(200);
      expect(resName.body.some((u: any) => u.name.includes("John"))).toBe(true);

      const resEmail = await adminAgent.get("/api/users?search=admin@toktickit.local");
      expect(resEmail.status).toBe(200);
      expect(resEmail.body.some((u: any) => u.email === "admin@toktickit.local")).toBe(true);
    });

    it("filters user list by role (REQUESTER, IT_STAFF, ADMINISTRATOR)", async () => {
      const resStaff = await adminAgent.get("/api/users?role=IT_STAFF");
      expect(resStaff.status).toBe(200);
      expect(resStaff.body.length).toBeGreaterThan(0);
      resStaff.body.forEach((u: any) => {
        expect(u.role).toBe("IT_STAFF");
      });

      const resAdmin = await adminAgent.get("/api/users?role=ADMINISTRATOR");
      expect(resAdmin.status).toBe(200);
      resAdmin.body.forEach((u: any) => {
        expect(u.role).toBe("ADMINISTRATOR");
      });
    });

    it("rejects invalid role filter parameter with 400 Bad Request", async () => {
      const res = await adminAgent.get("/api/users?role=SUPER_USER");
      expect(res.status).toBe(400);
      expect(res.body.code).toBe("INVALID_ROLE");
    });
  });

  describe("API-20: Authorization & Access Control for User Management", () => {
    it("returns 401 Unauthorized for unauthenticated requests", async () => {
      const unauth = request(app);
      const res = await unauth.get("/api/users");
      expect(res.status).toBe(401);
      expect(res.body.code).toBe("UNAUTHENTICATED");
    });

    it("returns 403 Forbidden when IT Staff attempts to access /api/users", async () => {
      const res = await itStaffAgent.get("/api/users");
      expect(res.status).toBe(403);
      expect(res.body.code).toBe("FORBIDDEN_ROLE");
    });

    it("returns 403 Forbidden when Requester attempts to access /api/users", async () => {
      const res = await requesterAgent.get("/api/users");
      expect(res.status).toBe(403);
      expect(res.body.code).toBe("FORBIDDEN_ROLE");
    });
  });

  describe("API-21: Administrator User Creation (POST /api/users)", () => {
    it("creates a new user with single role and initial password with mustChangePassword=true", async () => {
      const uniqueEmail = `test.user.${Date.now()}@toktickit.local`;
      const res = await adminAgent.post("/api/users").send({
        name: "Test Engineer",
        email: uniqueEmail,
        role: "IT_STAFF",
        isActive: true,
        initialPassword: "TempPassword123!",
      });

      expect(res.status).toBe(201);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.email).toBe(uniqueEmail);
      expect(res.body.data.role).toBe("IT_STAFF");
      expect(res.body.data.isActive).toBe(true);
      expect(res.body.data.mustChangePassword).toBe(true);
      expect(res.body.data.passwordHash).toBeUndefined();

      // Verify the new user can authenticate and is flagged with mustChangePassword
      const newUserAgent = request.agent(app);
      const loginRes = await newUserAgent.post("/api/auth/login").send({
        email: uniqueEmail,
        password: "TempPassword123!",
      });
      expect(loginRes.status).toBe(200);
      expect(loginRes.body.data.user.mustChangePassword).toBe(true);

      // Verify protected application endpoints are blocked before password change
      const queueRes = await newUserAgent.get("/api/tickets");
      expect(queueRes.status).toBe(403);
      expect(queueRes.body.code).toBe("MUST_CHANGE_PASSWORD");
    });

    it("returns 403 Forbidden if non-admin attempts to create a user", async () => {
      const res = await itStaffAgent.post("/api/users").send({
        name: "Hacker User",
        email: "hacker@toktickit.local",
        role: "ADMINISTRATOR",
        initialPassword: "TempPassword123!",
      });
      expect(res.status).toBe(403);
    });

    it("returns 400 Bad Request when missing required fields or invalid role", async () => {
      const missingName = await adminAgent.post("/api/users").send({
        email: "noname@toktickit.local",
        role: "REQUESTER",
        initialPassword: "TempPassword123!",
      });
      expect(missingName.status).toBe(400);

      const invalidRole = await adminAgent.post("/api/users").send({
        name: "Bad Role User",
        email: "badrole@toktickit.local",
        role: "SUPER_ADMIN",
        initialPassword: "TempPassword123!",
      });
      expect(invalidRole.status).toBe(400);

      const weakPass = await adminAgent.post("/api/users").send({
        name: "Weak Pass User",
        email: "weakpass@toktickit.local",
        role: "REQUESTER",
        initialPassword: "123",
      });
      expect(weakPass.status).toBe(400);
    });
  });

  describe("API-22: Duplicate Email Rejection (POST /api/users & PATCH /api/users/:id)", () => {
    it("rejects user creation with duplicate email address with 409 Conflict", async () => {
      const res = await adminAgent.post("/api/users").send({
        name: "Duplicate John",
        email: "admin@toktickit.local",
        role: "REQUESTER",
        initialPassword: "TempPassword123!",
      });

      expect(res.status).toBe(409);
      expect(res.body.code).toBe("EMAIL_ALREADY_EXISTS");
      expect(res.body.error).toContain("already registered");
    });
  });

  describe("API-23: Administrator Self-Deactivation Guardrail", () => {
    it("returns 400 Bad Request when Administrator attempts to deactivate their own account", async () => {
      const res = await adminAgent.patch(`/api/users/${adminUser.id}`).send({
        isActive: false,
      });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe("SELF_DEACTIVATION_FORBIDDEN");
      expect(res.body.error).toContain("Cannot deactivate your own active Administrator account");
    });
  });

  describe("API-24: Last Active Administrator Protection Guardrail", () => {
    it("returns 400 Bad Request when attempting to deactivate or demote the last active Administrator", async () => {
      const prisma = getPrisma();
      // Ensure only 1 active admin exists for this test
      const allAdmins = await prisma.user.findMany({
        where: { role: "ADMINISTRATOR" },
      });

      // Deactivate any other admins besides adminUser
      for (const adm of allAdmins) {
        if (adm.id !== adminUser.id) {
          await prisma.user.update({
            where: { id: adm.id },
            data: { isActive: false },
          });
        }
      }

      // 1. Attempting to deactivate the single remaining active admin
      // Create a temporary second admin who is active, to test demoting/deactivating adminUser
      const tempAdmin = await prisma.user.create({
        data: {
          name: "Temp Second Admin",
          email: `temp.admin.${Date.now()}@toktickit.local`,
          role: "ADMINISTRATOR",
          isActive: true,
          mustChangePassword: false,
          passwordHash: await bcrypt.hash("Password123!", 10),
        },
      });

      // Now there are 2 active admins. Deactivate tempAdmin to leave only 1.
      await adminAgent.patch(`/api/users/${tempAdmin.id}`).send({
        isActive: false,
      });

      // Now adminUser is the ONLY active admin.
      // Attempting to demote adminUser's role or deactivate:
      // Even if another request tried to demote:
      const demoteRes = await adminAgent.patch(`/api/users/${adminUser.id}`).send({
        role: "IT_STAFF",
      });
      expect(demoteRes.status).toBe(400);
      expect(demoteRes.body.code).toBe("LAST_ADMIN_PROTECTION");
      expect(demoteRes.body.error).toContain("last active Administrator");
    });
  });

  describe("User Editing (PATCH /api/users/:id)", () => {
    it("successfully updates user name, email, and role", async () => {
      const prisma = getPrisma();
      const testUser = await prisma.user.create({
        data: {
          name: "Editable User",
          email: `editable.${Date.now()}@toktickit.local`,
          role: "REQUESTER",
          isActive: true,
          mustChangePassword: false,
          passwordHash: await bcrypt.hash("Password123!", 10),
        },
      });

      const updatedName = "Updated User Name";
      const updatedEmail = `new.email.${Date.now()}@toktickit.local`;

      const res = await adminAgent.patch(`/api/users/${testUser.id}`).send({
        name: updatedName,
        email: updatedEmail,
        role: "IT_STAFF",
        isActive: false,
      });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe(updatedName);
      expect(res.body.data.email).toBe(updatedEmail);
      expect(res.body.data.role).toBe("IT_STAFF");
      expect(res.body.data.isActive).toBe(false);
    });

    it("rejects updating email to an already registered email with 409 Conflict", async () => {
      const prisma = getPrisma();
      const testUser = await prisma.user.create({
        data: {
          name: "Conflict Target",
          email: `conflict.${Date.now()}@toktickit.local`,
          role: "REQUESTER",
          isActive: true,
          mustChangePassword: false,
          passwordHash: await bcrypt.hash("Password123!", 10),
        },
      });

      const res = await adminAgent.patch(`/api/users/${testUser.id}`).send({
        email: adminUser.email,
      });

      expect(res.status).toBe(409);
      expect(res.body.code).toBe("EMAIL_ALREADY_EXISTS");
    });
  });

  describe("API-25: Set New Initial Password (POST /api/users/:id/reset-password)", () => {
    it("sets new initial password and forces mustChangePassword=true at next login", async () => {
      const prisma = getPrisma();
      const targetUser = await prisma.user.create({
        data: {
          name: "Password Reset Target",
          email: `reset.target.${Date.now()}@toktickit.local`,
          role: "REQUESTER",
          isActive: true,
          mustChangePassword: false,
          passwordHash: await bcrypt.hash("OldPassword123!", 10),
        },
      });

      const newInitialPass = "NewInitPass123!";
      const resetRes = await adminAgent
        .post(`/api/users/${targetUser.id}/reset-password`)
        .send({ initialPassword: newInitialPass });

      expect(resetRes.status).toBe(200);
      expect(resetRes.body.message).toContain("New initial password set");

      // Verify target user's mustChangePassword in DB is true
      const reloaded = await prisma.user.findUnique({ where: { id: targetUser.id } });
      expect(reloaded?.mustChangePassword).toBe(true);

      // Verify target user logs in with new initial password and has mustChangePassword=true
      const userAgent = request.agent(app);
      const loginRes = await userAgent.post("/api/auth/login").send({
        email: targetUser.email,
        password: newInitialPass,
      });
      expect(loginRes.status).toBe(200);
      expect(loginRes.body.data.user.mustChangePassword).toBe(true);
    });

    it("rejects weak initial password failing password policy", async () => {
      const res = await adminAgent
        .post(`/api/users/${adminUser.id}/reset-password`)
        .send({ initialPassword: "weak" });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe("VALIDATION_ERROR");
    });

    it("returns 403 Forbidden when non-admin attempts password reset", async () => {
      const res = await itStaffAgent
        .post(`/api/users/${adminUser.id}/reset-password`)
        .send({ initialPassword: "ValidNewPass123!" });

      expect(res.status).toBe(403);
    });
  });

  describe("No User Deletion Rule (BR-25)", () => {
    it("rejects user deletion with 400 Bad Request", async () => {
      const res = await adminAgent.delete(`/api/users/${requesterUser.id}`);
      expect(res.status).toBe(400);
      expect(res.body.code).toBe("USER_DELETION_FORBIDDEN");
      expect(res.body.error).toContain("User deletion is not permitted");
    });
  });
});
