import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

describe("Lab 3 — Issue #4: Server-Side Authorization & Requester Migration API Tests", () => {
  let requesterAAgent: any;
  let requesterBAgent: any;
  let itStaffAgent: any;
  let adminAgent: any;

  let requesterAUser: any;
  let requesterBUser: any;
  let itStaffUser: any;
  let ticketOwnedByA: any;
  let category: any;
  let relatedSystem: any;

  beforeAll(async () => {
    const prisma = getPrisma();

    // 1. Get test users
    requesterAUser = await prisma.user.findFirst({
      where: { email: "jennifer.anderson@toktickit.local" },
    });
    requesterBUser = await prisma.user.findFirst({
      where: { email: "michael.brown@toktickit.local" },
    });
    itStaffUser = await prisma.user.findFirst({
      where: { email: "tech1@toktickit.local" },
    });
    const adminUser = await prisma.user.findFirst({
      where: { email: "admin@toktickit.local" },
    });

    category = await prisma.category.findFirst({ where: { isActive: true } });
    relatedSystem = await prisma.relatedSystem.findFirst({ where: { isActive: true } });

    // Ensure users do not require password change
    await prisma.user.updateMany({
      where: { id: { in: [requesterAUser.id, requesterBUser.id, itStaffUser.id, adminUser!.id] } },
      data: { mustChangePassword: false },
    });

    // 2. Setup authenticated Supertest agents
    requesterAAgent = request.agent(app);
    await requesterAAgent.post("/api/auth/login").send({
      email: requesterAUser.email,
      password: "Password123!",
    });

    requesterBAgent = request.agent(app);
    await requesterBAgent.post("/api/auth/login").send({
      email: requesterBUser.email,
      password: "Password123!",
    });

    itStaffAgent = request.agent(app);
    await itStaffAgent.post("/api/auth/login").send({
      email: itStaffUser.email,
      password: "Password123!",
    });

    adminAgent = request.agent(app);
    await adminAgent.post("/api/auth/login").send({
      email: adminUser!.email,
      password: "Password123!",
    });

    // 3. Create a ticket owned by Requester A
    ticketOwnedByA = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-AUTHZ-A-${Date.now()}`,
        requesterId: requesterAUser.id,
        categoryId: category.id,
        relatedSystemId: relatedSystem.id,
        summary: "Authz test ticket for Requester A",
        description: "Testing authorization boundaries",
        requestedPriority: "MEDIUM",
        status: "NEW",
      },
    });
  });

  describe("1. Unauthenticated Requests", () => {
    it("rejects unauthenticated POST /api/tickets missing requesterId with 400 VALIDATION_ERROR", async () => {
      const res = await request(app).post("/api/tickets").send({
        categoryId: category.id,
        relatedSystemId: relatedSystem.id,
        summary: "Unauth ticket attempt",
        description: "Should fail unauthenticated",
        requestedPriority: "LOW",
      });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe("VALIDATION_ERROR");
    });

    it("rejects unauthenticated GET /api/tickets with 400 MISSING_REQUESTER_ID", async () => {
      const res = await request(app).get("/api/tickets");
      expect(res.status).toBe(400);
      expect(res.body.code).toBe("MISSING_REQUESTER_ID");
    });

    it("rejects unauthenticated GET /api/tickets/:id with 401 UNAUTHENTICATED", async () => {
      const res = await request(app).get(`/api/tickets/${ticketOwnedByA.id}`);
      expect(res.status).toBe(401);
      expect(res.body.code).toBe("UNAUTHENTICATED");
    });
  });

  describe("2. Requester Identification & Spoofing Prevention", () => {
    it("binds ticket creation to authenticated user identity and ignores spoofed requesterId", async () => {
      const res = await requesterAAgent.post("/api/tickets").send({
        requesterId: requesterBUser.id, // Attempting to spoof Requester B
        categoryId: category.id,
        relatedSystemId: relatedSystem.id,
        summary: "Ticket created by Requester A",
        description: "Testing requesterId spoof prevention",
        requestedPriority: "LOW",
      });

      expect(res.status).toBe(201);
      // Ensure ticket's requesterId is set to Requester A (authenticated user), NOT Requester B
      expect(res.body.requesterId).toBe(requesterAUser.id);
    });

    it("binds ticket creation to authenticated user when headers (X-Requester-Id) are provided", async () => {
      const res = await requesterAAgent
        .post("/api/tickets")
        .set("X-Requester-Id", String(requesterBUser.id))
        .send({
          categoryId: category.id,
          relatedSystemId: relatedSystem.id,
          summary: "Ticket created by Requester A with header",
          description: "Testing header spoof prevention",
          requestedPriority: "LOW",
        });

      expect(res.status).toBe(201);
      expect(res.body.requesterId).toBe(requesterAUser.id);
    });
  });

  describe("3. Cross-Requester Data Isolation", () => {
    it("returns only owned tickets when Requester calls GET /api/tickets", async () => {
      const res = await requesterAAgent.get("/api/tickets");
      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      const allOwnedByA = res.body.data.every(
        (t: any) => t.requesterId === requesterAUser.id
      );
      expect(allOwnedByA).toBe(true);
    });

    it("returns 403 Forbidden or 404 Not Found when Requester B accesses Requester A's ticket", async () => {
      const res = await requesterBAgent.get(`/api/tickets/${ticketOwnedByA.id}`);
      expect([403, 404]).toContain(res.status);
    });
  });

  describe("4. Internal Notes Access Restriction", () => {
    it("returns 403 Forbidden when Requester attempts to GET /api/tickets/:id/notes", async () => {
      const res = await requesterAAgent.get(`/api/tickets/${ticketOwnedByA.id}/notes`);
      expect(res.status).toBe(403);
      expect(res.body.code).toBe("FORBIDDEN_ROLE");
    });

    it("returns 403 Forbidden when Requester attempts to POST /api/tickets/:id/notes", async () => {
      const res = await requesterAAgent
        .post(`/api/tickets/${ticketOwnedByA.id}/notes`)
        .send({ content: "Requester trying to write an internal note" });
      expect(res.status).toBe(403);
      expect(res.body.code).toBe("FORBIDDEN_ROLE");
    });

    it("allows IT Staff to GET and POST internal notes", async () => {
      const postRes = await itStaffAgent
        .post(`/api/tickets/${ticketOwnedByA.id}/notes`)
        .send({ content: "IT Staff note: Diagnostics complete" });
      expect(postRes.status).toBe(201);

      const getRes = await itStaffAgent.get(`/api/tickets/${ticketOwnedByA.id}/notes`);
      expect(getRes.status).toBe(200);
      expect(getRes.body).toBeDefined();
      expect(getRes.body.length).toBeGreaterThan(0);
    });
  });

  describe("5. Attachment Ownership & Permissions", () => {
    it("returns 403 or 404 when Requester B attempts to download Requester A's attachment", async () => {
      const prisma = getPrisma();
      const uniqueName = `secret_doc_stored_${Date.now()}.pdf`;
      const attachment = await prisma.attachment.create({
        data: {
          ticketId: ticketOwnedByA.id,
          originalFileName: "secret_doc.pdf",
          storedFileName: uniqueName,
          fileMimeType: "application/pdf",
          fileSizeBytes: 1024,
          storagePath: "/tmp/fake_secret.pdf",
          isRemoved: false,
        },
      });

      const res = await requesterBAgent.get(`/api/attachments/${attachment.id}/download`);
      expect([403, 404]).toContain(res.status);
    });
  });

  describe("6. Forbidden Role Actions", () => {
    it("returns 403 Forbidden when Requester attempts to claim or assign a ticket", async () => {
      const claimRes = await requesterAAgent.patch(`/api/tickets/${ticketOwnedByA.id}/claim`);
      expect(claimRes.status).toBe(403);

      const assignRes = await requesterAAgent
        .patch(`/api/tickets/${ticketOwnedByA.id}/assign`)
        .send({ ownerId: itStaffUser.id });
      expect(assignRes.status).toBe(403);
    });

    it("returns 403 Forbidden when Requester attempts to access /api/users", async () => {
      const res = await requesterAAgent.get("/api/users");
      expect(res.status).toBe(403);
    });

    it("returns 403 Forbidden when IT Staff attempts to access /api/users", async () => {
      const res = await itStaffAgent.get("/api/users");
      expect(res.status).toBe(403);
    });
  });
});
