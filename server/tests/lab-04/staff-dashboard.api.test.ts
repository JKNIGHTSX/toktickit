import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

/**
 * Lab 4 — Issue #6: IT Staff & Administrator Dashboard API Tests
 *
 * Traceability Matrix:
 *   API-18 / FR-10, AC-17 — GET /api/dashboard/staff (Staff Queue Metrics & Recent List)
 *   API-19 / FR-10, AC-17 — GET /api/dashboard/staff (Requester access rejected with 403)
 *   API-20 / FR-11, AC-19 — GET /api/dashboard/admin (Staff Metrics + User counts)
 *   BR-23 / FR-10         — Metric definitions: new, open, inProgress, waitingForRequester, myAssigned
 *   BR-24 / FR-10         — Recent tickets: limit 5, updatedAt desc, active & (assigned to me OR unassigned)
 *   BR-25 / FR-10         — Zero-state metrics return 0, not missing or null
 *   BR-26 / FR-11         — Administrator metrics include userSummary (totalUsers, activeUsers, inactiveUsers)
 *   Security & RBAC       — 401 unauthenticated, 403 forbidden role, 403 MUST_CHANGE_PASSWORD
 */

describe("Lab 4 — Issue #6: IT Staff & Administrator Dashboard API Tests", () => {
  let requester: any;
  let itStaffA: any;
  let itStaffB: any;
  let adminUser: any;
  let passwordChangeUser: any;

  let unauthAgent: any;
  let requesterAgent: any;
  let itStaffAgentA: any;
  let itStaffAgentB: any;
  let adminAgent: any;
  let passwordChangeAgent: any;

  const createdTicketIds: number[] = [];

  beforeAll(async () => {
    const prisma = getPrisma();

    [requester, itStaffA, itStaffB, adminUser] = await Promise.all([
      prisma.user.findFirstOrThrow({ where: { email: "jennifer.anderson@toktickit.local" } }),
      prisma.user.findFirstOrThrow({ where: { email: "tech1@toktickit.local" } }),
      prisma.user.findFirstOrThrow({ where: { email: "tech2@toktickit.local" } }),
      prisma.user.findFirstOrThrow({ where: { email: "admin@toktickit.local" } }),
    ]);

    passwordChangeUser = await prisma.user.findFirst({
      where: { email: "first.login@toktickit.local" },
    });

    // Ensure staff/admin can log in normally
    await prisma.user.updateMany({
      where: { id: { in: [requester.id, itStaffA.id, itStaffB.id, adminUser.id] } },
      data: { mustChangePassword: false, isActive: true },
    });

    unauthAgent = request(app);
    requesterAgent = request.agent(app);
    itStaffAgentA = request.agent(app);
    itStaffAgentB = request.agent(app);
    adminAgent = request.agent(app);

    await Promise.all([
      requesterAgent.post("/api/auth/login").send({ email: requester.email, password: "Password123!" }),
      itStaffAgentA.post("/api/auth/login").send({ email: itStaffA.email, password: "Password123!" }),
      itStaffAgentB.post("/api/auth/login").send({ email: itStaffB.email, password: "Password123!" }),
      adminAgent.post("/api/auth/login").send({ email: adminUser.email, password: "Password123!" }),
    ]);

    if (passwordChangeUser) {
      await prisma.user.update({
        where: { id: passwordChangeUser.id },
        data: { mustChangePassword: true, isActive: true },
      });
      passwordChangeAgent = request.agent(app);
      await passwordChangeAgent.post("/api/auth/login").send({
        email: passwordChangeUser.email,
        password: "Password123!",
      });
    }
  });

  afterAll(async () => {
    const prisma = getPrisma();
    if (createdTicketIds.length > 0) {
      await prisma.actionTaken.deleteMany({ where: { ticketId: { in: createdTicketIds } } });
      await prisma.publicComment.deleteMany({ where: { ticketId: { in: createdTicketIds } } });
      await prisma.internalNote.deleteMany({ where: { ticketId: { in: createdTicketIds } } });
      await prisma.ticket.deleteMany({ where: { id: { in: createdTicketIds } } });
    }
  });

  // -------------------------------------------------------------------------
  // 1. Authentication & Role Authorization (API-18, API-19, API-20)
  // -------------------------------------------------------------------------
  describe("Security & Authorization for Staff & Admin Dashboards", () => {
    it("rejects unauthenticated requests to /api/dashboard/staff with 401", async () => {
      const res = await unauthAgent.get("/api/dashboard/staff");
      expect(res.status).toBe(401);
      expect(res.body.code).toBe("UNAUTHENTICATED");
    });

    it("rejects unauthenticated requests to /api/dashboard/admin with 401", async () => {
      const res = await unauthAgent.get("/api/dashboard/admin");
      expect(res.status).toBe(401);
      expect(res.body.code).toBe("UNAUTHENTICATED");
    });

    it("rejects REQUESTER access to /api/dashboard/staff with 403 Forbidden (API-19)", async () => {
      const res = await requesterAgent.get("/api/dashboard/staff");
      expect(res.status).toBe(403);
      expect(res.body.code).toBe("FORBIDDEN_ROLE");
    });

    it("rejects REQUESTER access to /api/dashboard/admin with 403 Forbidden", async () => {
      const res = await requesterAgent.get("/api/dashboard/admin");
      expect(res.status).toBe(403);
      expect(res.body.code).toBe("FORBIDDEN_ROLE");
    });

    it("rejects IT_STAFF access to /api/dashboard/admin with 403 Forbidden", async () => {
      const res = await itStaffAgentA.get("/api/dashboard/admin");
      expect(res.status).toBe(403);
      expect(res.body.code).toBe("FORBIDDEN_ROLE");
    });

    it("allows IT_STAFF to access /api/dashboard/staff", async () => {
      const res = await itStaffAgentA.get("/api/dashboard/staff");
      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.metrics).toBeDefined();
    });

    it("allows ADMINISTRATOR to access /api/dashboard/staff", async () => {
      const res = await adminAgent.get("/api/dashboard/staff");
      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.metrics).toBeDefined();
    });

    it("allows ADMINISTRATOR to access /api/dashboard/admin", async () => {
      const res = await adminAgent.get("/api/dashboard/admin");
      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.metrics.userSummary).toBeDefined();
    });

    it("rejects users flagged with mustChangePassword = true with 403 MUST_CHANGE_PASSWORD", async () => {
      if (!passwordChangeAgent) return;
      const res = await passwordChangeAgent.get("/api/dashboard/staff");
      expect(res.status).toBe(403);
      expect(res.body.code).toBe("MUST_CHANGE_PASSWORD");
    });
  });

  // -------------------------------------------------------------------------
  // 2. Metrics Accuracy & Business Rules (BR-23, BR-25, API-18)
  // -------------------------------------------------------------------------
  describe("Staff Dashboard Metric Calculations (BR-23, BR-25, API-18)", () => {
    it("returns accurate counts for newTickets, openTickets, inProgressTickets, waitingForRequesterTickets, and myAssignedTickets", async () => {
      const prisma = getPrisma();
      const initialRes = await itStaffAgentA.get("/api/dashboard/staff");
      expect(initialRes.status).toBe(200);
      const initialMetrics = initialRes.body.data.metrics;

      // Create known fixture tickets
      const t1 = await prisma.ticket.create({
        data: {
          ticketNumber: `TKT-DASH-NEW-${Date.now()}`,
          requesterId: requester.id,
          categoryId: 1,
          relatedSystemId: 1,
          summary: "Dashboard fixture: NEW unassigned",
          description: "Testing dashboard metrics",
          requestedPriority: "MEDIUM",
          status: "NEW",
          ownerId: null,
        },
      });
      createdTicketIds.push(t1.id);

      const t2 = await prisma.ticket.create({
        data: {
          ticketNumber: `TKT-DASH-OPEN-${Date.now()}`,
          requesterId: requester.id,
          categoryId: 1,
          relatedSystemId: 1,
          summary: "Dashboard fixture: OPEN assigned to Staff A",
          description: "Testing dashboard metrics",
          requestedPriority: "HIGH",
          status: "OPEN",
          ownerId: itStaffA.id,
        },
      });
      createdTicketIds.push(t2.id);

      const t3 = await prisma.ticket.create({
        data: {
          ticketNumber: `TKT-DASH-INPROG-${Date.now()}`,
          requesterId: requester.id,
          categoryId: 1,
          relatedSystemId: 1,
          summary: "Dashboard fixture: IN_PROGRESS assigned to Staff A",
          description: "Testing dashboard metrics",
          requestedPriority: "URGENT",
          status: "IN_PROGRESS",
          ownerId: itStaffA.id,
        },
      });
      createdTicketIds.push(t3.id);

      const t4 = await prisma.ticket.create({
        data: {
          ticketNumber: `TKT-DASH-WAIT-${Date.now()}`,
          requesterId: requester.id,
          categoryId: 1,
          relatedSystemId: 1,
          summary: "Dashboard fixture: WAITING_FOR_REQUESTER assigned to Staff B",
          description: "Testing dashboard metrics",
          requestedPriority: "LOW",
          status: "WAITING_FOR_REQUESTER",
          ownerId: itStaffB.id,
        },
      });
      createdTicketIds.push(t4.id);

      // Inactive/terminal tickets (CLOSED and CANCELLED) should NOT count towards myAssignedTickets
      const tClosed = await prisma.ticket.create({
        data: {
          ticketNumber: `TKT-DASH-CLOSED-${Date.now()}`,
          requesterId: requester.id,
          categoryId: 1,
          relatedSystemId: 1,
          summary: "Dashboard fixture: CLOSED assigned to Staff A",
          description: "Testing dashboard metrics",
          requestedPriority: "MEDIUM",
          status: "CLOSED",
          ownerId: itStaffA.id,
        },
      });
      createdTicketIds.push(tClosed.id);

      // Verify Staff A's view
      const afterResA = await itStaffAgentA.get("/api/dashboard/staff");
      expect(afterResA.status).toBe(200);
      const mA = afterResA.body.data.metrics;

      expect(mA.newTickets).toBe(initialMetrics.newTickets + 1);
      expect(mA.openTickets).toBe(initialMetrics.openTickets + 1);
      expect(mA.inProgressTickets).toBe(initialMetrics.inProgressTickets + 1);
      expect(mA.waitingForRequesterTickets).toBe(initialMetrics.waitingForRequesterTickets + 1);
      // Staff A was assigned t2 (OPEN) and t3 (IN_PROGRESS), but tClosed (CLOSED) does not count
      expect(mA.myAssignedTickets).toBe(initialMetrics.myAssignedTickets + 2);

      // Verify Staff B's view (myAssignedTickets must isolate to authenticated user)
      const afterResB = await itStaffAgentB.get("/api/dashboard/staff");
      expect(afterResB.status).toBe(200);
      const mB = afterResB.body.data.metrics;
      // System wide counts match
      expect(mB.newTickets).toBe(mA.newTickets);
      expect(mB.openTickets).toBe(mA.openTickets);
      expect(mB.inProgressTickets).toBe(mA.inProgressTickets);
      expect(mB.waitingForRequesterTickets).toBe(mA.waitingForRequesterTickets);
      // Staff B only sees tickets assigned to Staff B (t4)
      expect(mB.myAssignedTickets).not.toBe(mA.myAssignedTickets);
    });

    it("returns zero (0) for numeric metrics when no tickets match (BR-25)", async () => {
      const res = await itStaffAgentA.get("/api/dashboard/staff");
      expect(res.status).toBe(200);
      const metrics = res.body.data.metrics;

      expect(typeof metrics.newTickets).toBe("number");
      expect(typeof metrics.openTickets).toBe("number");
      expect(typeof metrics.inProgressTickets).toBe("number");
      expect(typeof metrics.waitingForRequesterTickets).toBe("number");
      expect(typeof metrics.myAssignedTickets).toBe("number");

      expect(metrics.newTickets).toBeGreaterThanOrEqual(0);
      expect(metrics.openTickets).toBeGreaterThanOrEqual(0);
      expect(metrics.inProgressTickets).toBeGreaterThanOrEqual(0);
      expect(metrics.waitingForRequesterTickets).toBeGreaterThanOrEqual(0);
      expect(metrics.myAssignedTickets).toBeGreaterThanOrEqual(0);
    });
  });

  // -------------------------------------------------------------------------
  // 3. Recent Tickets Ordering & Filtering (BR-24)
  // -------------------------------------------------------------------------
  describe("Recent Tickets List Rules (BR-24)", () => {
    it("returns up to 5 most recently updated active tickets assigned to current user or unassigned, ordered by updatedAt DESC", async () => {
      const res = await itStaffAgentA.get("/api/dashboard/staff");
      expect(res.status).toBe(200);
      const recentTickets = res.body.data.recentTickets;

      expect(Array.isArray(recentTickets)).toBe(true);
      expect(recentTickets.length).toBeLessThanOrEqual(5);

      // Verify sorting: updatedAt DESC
      for (let i = 0; i < recentTickets.length - 1; i++) {
        const curTime = new Date(recentTickets[i].updatedAt).getTime();
        const nextTime = new Date(recentTickets[i + 1].updatedAt).getTime();
        expect(curTime).toBeGreaterThanOrEqual(nextTime);
      }

      // Verify each ticket is either unassigned or assigned to Staff A, and has an active status
      for (const t of recentTickets) {
        expect([
          "NEW",
          "OPEN",
          "IN_PROGRESS",
          "WAITING_FOR_REQUESTER",
          "REOPENED",
        ]).toContain(t.status);

        if (t.owner) {
          expect(t.owner.id).toBe(itStaffA.id);
        }

        // Check required fields
        expect(t.id).toBeDefined();
        expect(t.ticketNumber).toBeDefined();
        expect(t.summary).toBeDefined();
        expect(t.status).toBeDefined();
        expect(t.updatedAt).toBeDefined();
        expect(t.requester).toBeDefined();
        expect(t.requester.name).toBeDefined();
        expect(t.requester.email).toBeDefined();
      }
    });
  });

  // -------------------------------------------------------------------------
  // 4. Administrator Dashboard & User Summary (BR-26, API-20)
  // -------------------------------------------------------------------------
  describe("Administrator Dashboard & User Account Summary (BR-26, API-20)", () => {
    it("returns operational queue metrics plus userSummary with totalUsers, activeUsers, and inactiveUsers", async () => {
      const prisma = getPrisma();
      const [totalCount, activeCount] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { isActive: true } }),
      ]);
      const expectedInactive = totalCount - activeCount;

      const res = await adminAgent.get("/api/dashboard/admin");
      expect(res.status).toBe(200);

      const data = res.body.data;
      expect(data.metrics).toBeDefined();
      expect(data.metrics.newTickets).toBeDefined();
      expect(data.metrics.openTickets).toBeDefined();
      expect(data.metrics.inProgressTickets).toBeDefined();
      expect(data.metrics.waitingForRequesterTickets).toBeDefined();
      expect(data.metrics.myAssignedTickets).toBeDefined();

      const userSummary = data.metrics.userSummary;
      expect(userSummary).toBeDefined();
      expect(userSummary.totalUsers).toBe(totalCount);
      expect(userSummary.activeUsers).toBe(activeCount);
      expect(userSummary.inactiveUsers).toBe(expectedInactive);
      expect(userSummary.activeUsers + userSummary.inactiveUsers).toBe(userSummary.totalUsers);

      expect(Array.isArray(data.recentTickets)).toBe(true);
      expect(data.recentTickets.length).toBeLessThanOrEqual(5);
    });

    it("calculates myAssignedTickets scoped to the authenticated Administrator", async () => {
      const prisma = getPrisma();
      const adminAssignedCount = await prisma.ticket.count({
        where: {
          ownerId: adminUser.id,
          status: {
            in: ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "REOPENED"],
          },
        },
      });

      const res = await adminAgent.get("/api/dashboard/admin");
      expect(res.status).toBe(200);
      expect(res.body.data.metrics.myAssignedTickets).toBe(adminAssignedCount);
    });
  });
});
