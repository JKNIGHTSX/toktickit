import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

/**
 * Lab 4 — Issue #7: Requester Dashboard API Tests
 *
 * Traceability Matrix:
 *   API-16 / FR-09, AC-15 — GET /api/dashboard/requester (Metrics & Recent)
 *   API-17 / FR-09, AC-16 — GET /api/dashboard/requester (Data Isolation)
 *   BR-20  — Requester dashboard data strictly scoped to currentUser.id
 *   BR-21  — Metric formulas: totalOpen, inProgress, resolved, closed
 *   BR-22  — recentTickets: up to 5, ordered by updatedAt DESC
 *   BR-25  — Zero-value metrics return 0, not null or missing
 *   BR-27  — Backend aggregation queries only
 */

describe("Lab 4 — Issue #7: Requester Dashboard API Tests", () => {
  let requesterA: any;
  let requesterB: any;
  let itStaff: any;
  let adminUser: any;
  let firstLoginUser: any;

  let unauthAgent: any;
  let requesterAgentA: any;
  let requesterAgentB: any;
  let itStaffAgent: any;
  let adminAgent: any;
  let firstLoginAgent: any;

  const createdTicketIds: number[] = [];

  beforeAll(async () => {
    const prisma = getPrisma();

    [requesterA, requesterB, itStaff, adminUser] = await Promise.all([
      prisma.user.findFirstOrThrow({ where: { email: "jennifer.anderson@toktickit.local" } }),
      prisma.user.findFirstOrThrow({ where: { email: "michael.brown@toktickit.local" } }),
      prisma.user.findFirstOrThrow({ where: { email: "tech1@toktickit.local" } }),
      prisma.user.findFirstOrThrow({ where: { email: "admin@toktickit.local" } }),
    ]);

    firstLoginUser = await prisma.user.findFirst({
      where: { email: "first.login@toktickit.local" },
    });

    // Ensure test accounts are login-ready
    await prisma.user.updateMany({
      where: { id: { in: [requesterA.id, requesterB.id, itStaff.id, adminUser.id] } },
      data: { mustChangePassword: false, isActive: true },
    });

    if (firstLoginUser) {
      await prisma.user.update({
        where: { id: firstLoginUser.id },
        data: { mustChangePassword: true, isActive: true },
      });
    }

    unauthAgent = request(app);
    requesterAgentA = request.agent(app);
    requesterAgentB = request.agent(app);
    itStaffAgent = request.agent(app);
    adminAgent = request.agent(app);

    await Promise.all([
      requesterAgentA.post("/api/auth/login").send({ email: requesterA.email, password: "Password123!" }),
      requesterAgentB.post("/api/auth/login").send({ email: requesterB.email, password: "Password123!" }),
      itStaffAgent.post("/api/auth/login").send({ email: itStaff.email, password: "Password123!" }),
      adminAgent.post("/api/auth/login").send({ email: adminUser.email, password: "Password123!" }),
    ]);

    if (firstLoginUser) {
      firstLoginAgent = request.agent(app);
      await firstLoginAgent.post("/api/auth/login").send({
        email: firstLoginUser.email,
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
  // 1. Authentication & Role Authorization
  // -------------------------------------------------------------------------
  describe("Authentication & Role Restrictions", () => {
    it("rejects unauthenticated requests with 401 UNAUTHENTICATED", async () => {
      const res = await unauthAgent.get("/api/dashboard/requester");
      expect(res.status).toBe(401);
      expect(res.body.code).toBe("UNAUTHENTICATED");
    });

    it("rejects IT_STAFF access with 403 FORBIDDEN_ROLE", async () => {
      const res = await itStaffAgent.get("/api/dashboard/requester");
      expect(res.status).toBe(403);
      expect(res.body.code).toBe("FORBIDDEN_ROLE");
    });

    it("rejects ADMINISTRATOR access with 403 FORBIDDEN_ROLE", async () => {
      const res = await adminAgent.get("/api/dashboard/requester");
      expect(res.status).toBe(403);
      expect(res.body.code).toBe("FORBIDDEN_ROLE");
    });

    it("rejects users with mustChangePassword = true with 403 MUST_CHANGE_PASSWORD", async () => {
      if (!firstLoginAgent) return;
      const res = await firstLoginAgent.get("/api/dashboard/requester");
      expect(res.status).toBe(403);
      expect(res.body.code).toBe("MUST_CHANGE_PASSWORD");
    });

    it("allows REQUESTER to access the dashboard with 200", async () => {
      const res = await requesterAgentA.get("/api/dashboard/requester");
      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.metrics).toBeDefined();
      expect(res.body.data.recentTickets).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // 2. Response Shape (API contract)
  // -------------------------------------------------------------------------
  describe("Response structure and field contract", () => {
    it("returns all required metric fields with numeric values", async () => {
      const res = await requesterAgentA.get("/api/dashboard/requester");
      expect(res.status).toBe(200);
      const { metrics } = res.body.data;
      expect(typeof metrics.totalOpen).toBe("number");
      expect(typeof metrics.inProgress).toBe("number");
      expect(typeof metrics.resolved).toBe("number");
      expect(typeof metrics.closed).toBe("number");
    });

    it("returns recentTickets as an array with required fields per ticket", async () => {
      const prisma = getPrisma();
      // Ensure at least one ticket exists for requesterA
      const t = await prisma.ticket.create({
        data: {
          ticketNumber: `TKT-RDASH-SHAPE-${Date.now()}`,
          requesterId: requesterA.id,
          categoryId: 1,
          relatedSystemId: 1,
          summary: "Dashboard shape test ticket",
          description: "Checking response fields",
          requestedPriority: "MEDIUM",
          status: "NEW",
        },
      });
      createdTicketIds.push(t.id);

      const res = await requesterAgentA.get("/api/dashboard/requester");
      expect(res.status).toBe(200);
      const { recentTickets } = res.body.data;
      expect(Array.isArray(recentTickets)).toBe(true);

      if (recentTickets.length > 0) {
        const ticket = recentTickets[0];
        expect(ticket.id).toBeDefined();
        expect(ticket.ticketNumber).toBeDefined();
        expect(ticket.summary).toBeDefined();
        expect(ticket.status).toBeDefined();
        expect(ticket.requestedPriority).toBeDefined();
        expect(ticket.updatedAt).toBeDefined();
        expect(ticket.category).toBeDefined();
        expect(ticket.category.name).toBeDefined();
      }
    });
  });

  // -------------------------------------------------------------------------
  // 3. Metric Accuracy (BR-21)
  // -------------------------------------------------------------------------
  describe("Metric Calculation Accuracy (BR-21)", () => {
    it("counts totalOpen, inProgress, resolved, and closed correctly against known fixtures", async () => {
      const prisma = getPrisma();

      // Get baseline
      const baseline = await requesterAgentA.get("/api/dashboard/requester");
      expect(baseline.status).toBe(200);
      const base = baseline.body.data.metrics;

      // Create known tickets in different statuses
      const fixtures = await Promise.all([
        prisma.ticket.create({ data: { ticketNumber: `TKT-RDASH-NEW-${Date.now()}`, requesterId: requesterA.id, categoryId: 1, relatedSystemId: 1, summary: "Fixture NEW", description: "d", requestedPriority: "LOW", status: "NEW" } }),
        prisma.ticket.create({ data: { ticketNumber: `TKT-RDASH-OPEN-${Date.now()}`, requesterId: requesterA.id, categoryId: 1, relatedSystemId: 1, summary: "Fixture OPEN", description: "d", requestedPriority: "LOW", status: "OPEN" } }),
        prisma.ticket.create({ data: { ticketNumber: `TKT-RDASH-IP-${Date.now()}`, requesterId: requesterA.id, categoryId: 1, relatedSystemId: 1, summary: "Fixture IN_PROGRESS", description: "d", requestedPriority: "LOW", status: "IN_PROGRESS" } }),
        prisma.ticket.create({ data: { ticketNumber: `TKT-RDASH-WAIT-${Date.now()}`, requesterId: requesterA.id, categoryId: 1, relatedSystemId: 1, summary: "Fixture WAITING", description: "d", requestedPriority: "LOW", status: "WAITING_FOR_REQUESTER" } }),
        prisma.ticket.create({ data: { ticketNumber: `TKT-RDASH-REOP-${Date.now()}`, requesterId: requesterA.id, categoryId: 1, relatedSystemId: 1, summary: "Fixture REOPENED", description: "d", requestedPriority: "LOW", status: "REOPENED" } }),
        prisma.ticket.create({ data: { ticketNumber: `TKT-RDASH-RES-${Date.now()}`, requesterId: requesterA.id, categoryId: 1, relatedSystemId: 1, summary: "Fixture RESOLVED", description: "d", requestedPriority: "LOW", status: "RESOLVED" } }),
        prisma.ticket.create({ data: { ticketNumber: `TKT-RDASH-CL-${Date.now()}`, requesterId: requesterA.id, categoryId: 1, relatedSystemId: 1, summary: "Fixture CLOSED", description: "d", requestedPriority: "LOW", status: "CLOSED" } }),
      ]);
      fixtures.forEach(f => createdTicketIds.push(f.id));

      const after = await requesterAgentA.get("/api/dashboard/requester");
      expect(after.status).toBe(200);
      const m = after.body.data.metrics;

      // totalOpen adds: NEW, OPEN, IN_PROGRESS, WAITING_FOR_REQUESTER, REOPENED = +5
      expect(m.totalOpen).toBe(base.totalOpen + 5);
      // inProgress: +1
      expect(m.inProgress).toBe(base.inProgress + 1);
      // resolved: +1
      expect(m.resolved).toBe(base.resolved + 1);
      // closed: +1
      expect(m.closed).toBe(base.closed + 1);
    });

    it("does not count CANCELLED tickets in any metric (BR-21)", async () => {
      const prisma = getPrisma();

      // Capture baseline before creating the CANCELLED fixture
      const baseline = await requesterAgentA.get("/api/dashboard/requester");
      expect(baseline.status).toBe(200);
      const base = baseline.body.data.metrics;

      // Create a single CANCELLED ticket for requesterA
      const cancelled = await prisma.ticket.create({
        data: {
          ticketNumber: `TKT-RDASH-CANCEL-${Date.now()}`,
          requesterId: requesterA.id,
          categoryId: 1,
          relatedSystemId: 1,
          summary: "Fixture CANCELLED",
          description: "d",
          requestedPriority: "LOW",
          status: "CANCELLED",
        },
      });
      createdTicketIds.push(cancelled.id);

      const after = await requesterAgentA.get("/api/dashboard/requester");
      expect(after.status).toBe(200);
      const m = after.body.data.metrics;

      // CANCELLED must not appear in any metric
      expect(m.totalOpen).toBe(base.totalOpen);
      expect(m.inProgress).toBe(base.inProgress);
      expect(m.resolved).toBe(base.resolved);
      expect(m.closed).toBe(base.closed);
    });

    it("returns 0 for all metrics when the requester has no tickets (BR-25)", async () => {
      // Use requesterB who has no tickets created in this test suite
      const prisma = getPrisma();
      const existing = await prisma.ticket.count({ where: { requesterId: requesterB.id } });

      if (existing === 0) {
        const res = await requesterAgentB.get("/api/dashboard/requester");
        expect(res.status).toBe(200);
        const { metrics } = res.body.data;
        expect(metrics.totalOpen).toBe(0);
        expect(metrics.inProgress).toBe(0);
        expect(metrics.resolved).toBe(0);
        expect(metrics.closed).toBe(0);
        expect(res.body.data.recentTickets).toEqual([]);
      } else {
        // requesterB already has tickets in seeded data — verify values are numbers >= 0
        const res = await requesterAgentB.get("/api/dashboard/requester");
        expect(res.status).toBe(200);
        expect(res.body.data.metrics.totalOpen).toBeGreaterThanOrEqual(0);
      }
    });
  });

  // -------------------------------------------------------------------------
  // 4. Data Isolation (BR-20, AC-16)
  // -------------------------------------------------------------------------
  describe("Data Isolation & Ownership Security (BR-20, AC-16)", () => {
    it("Requester A and Requester B see different metrics (no data leakage)", async () => {
      const prisma = getPrisma();

      // Create a ticket owned by requesterB only
      const bTicket = await prisma.ticket.create({
        data: {
          ticketNumber: `TKT-RDASH-ISOLATE-B-${Date.now()}`,
          requesterId: requesterB.id,
          categoryId: 1,
          relatedSystemId: 1,
          summary: "Requester B isolation ticket",
          description: "Should not appear in Requester A dashboard",
          requestedPriority: "HIGH",
          status: "NEW",
        },
      });
      createdTicketIds.push(bTicket.id);

      // Requester A metrics should NOT include requesterB's ticket
      const resA = await requesterAgentA.get("/api/dashboard/requester");
      expect(resA.status).toBe(200);
      const recentA = resA.body.data.recentTickets as Array<{ id: number }>;
      const leakedToA = recentA.some(t => t.id === bTicket.id);
      expect(leakedToA).toBe(false);

      // Requester B's recentTickets should include their ticket
      const resB = await requesterAgentB.get("/api/dashboard/requester");
      expect(resB.status).toBe(200);
      const recentB = resB.body.data.recentTickets as Array<{ id: number }>;
      const visibleToB = recentB.some(t => t.id === bTicket.id);
      expect(visibleToB).toBe(true);
    });

    it("ignores any query parameter attempting to override requesterId", async () => {
      // Even if Requester A passes requesterB's id as query param, they still see their own data
      const resA = await requesterAgentA.get(`/api/dashboard/requester?requesterId=${requesterB.id}`);
      expect(resA.status).toBe(200);

      const resADirect = await requesterAgentA.get("/api/dashboard/requester");
      expect(resADirect.status).toBe(200);

      // Both calls must return the same totalOpen metric (session-scoped, not query-param-scoped)
      expect(resA.body.data.metrics.totalOpen).toBe(resADirect.body.data.metrics.totalOpen);
    });
  });

  // -------------------------------------------------------------------------
  // 5. Recent Tickets Ordering & Limit (BR-22)
  // -------------------------------------------------------------------------
  describe("Recent Tickets List Rules (BR-22)", () => {
    it("returns at most 5 recent tickets, ordered by updatedAt DESC", async () => {
      const res = await requesterAgentA.get("/api/dashboard/requester");
      expect(res.status).toBe(200);
      const { recentTickets } = res.body.data;

      expect(Array.isArray(recentTickets)).toBe(true);
      expect(recentTickets.length).toBeLessThanOrEqual(5);

      // Verify descending updatedAt order
      for (let i = 0; i < recentTickets.length - 1; i++) {
        const cur = new Date(recentTickets[i].updatedAt).getTime();
        const next = new Date(recentTickets[i + 1].updatedAt).getTime();
        expect(cur).toBeGreaterThanOrEqual(next);
      }
    });

    it("returns an empty array when requester has no tickets", async () => {
      // Create a new requester with zero tickets to verify empty state
      const prisma = getPrisma();
      const emptyRequester = await prisma.user.create({
        data: {
          email: `empty.requester.${Date.now()}@toktickit.local`,
          passwordHash: "$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi", // password
          name: "Empty Requester",
          role: "REQUESTER",
          mustChangePassword: false,
          isActive: true,
        },
      });

      try {
        const agent = request.agent(app);
        const loginRes = await agent.post("/api/auth/login").send({
          email: emptyRequester.email,
          password: "password",
        });
        expect(loginRes.status).toBe(200);

        const res = await agent.get("/api/dashboard/requester");
        expect(res.status).toBe(200);
        expect(res.body.data.recentTickets).toEqual([]);
        expect(res.body.data.metrics.totalOpen).toBe(0);
        expect(res.body.data.metrics.inProgress).toBe(0);
        expect(res.body.data.metrics.resolved).toBe(0);
        expect(res.body.data.metrics.closed).toBe(0);
      } finally {
        await prisma.user.delete({ where: { id: emptyRequester.id } });
      }
    });
  });
});

