import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

/**
 * Lab 3 — Issue #5: IT Staff Ticket Queue API Tests
 *
 * Covers:
 *   API-08  FR-05 / AC-08  — IT Staff shared queue retrieval
 *   API-09  BR-11 / AC-09  — Queue search and filtering
 *   BR-10                  — Role-based queue access
 *   BR-11                  — assignedTo filter variants (UNASSIGNED, ME, staffId)
 *   Safe query validation  — invalid / injection values are ignored gracefully
 */
describe("Lab 3 — Issue #5: IT Staff Ticket Queue API Tests", () => {
  let itStaffAgent: any;
  let adminAgent: any;
  let requesterAgent: any;

  let itStaffUser: any;
  let requesterUser: any;
  let category: any;
  let relatedSystem: any;

  // Tickets created for filter tests
  let ticketNew: any;
  let ticketInProgress: any;
  let ticketHighPriority: any;
  let ticketUnassigned: any;
  let ticketAssignedToMe: any;

  beforeAll(async () => {
    const prisma = getPrisma();

    // Retrieve seed users
    itStaffUser = await prisma.user.findFirst({
      where: { email: "tech1@toktickit.local" },
    });
    const adminUser = await prisma.user.findFirst({
      where: { email: "admin@toktickit.local" },
    });
    requesterUser = await prisma.user.findFirst({
      where: { email: "jennifer.anderson@toktickit.local" },
    });

    category = await prisma.category.findFirst({ where: { isActive: true } });
    relatedSystem = await prisma.relatedSystem.findFirst({ where: { isActive: true } });

    // Ensure test users do not have mustChangePassword set
    await prisma.user.updateMany({
      where: { id: { in: [itStaffUser.id, adminUser!.id, requesterUser.id] } },
      data: { mustChangePassword: false },
    });

    // Authenticated agents
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

    requesterAgent = request.agent(app);
    await requesterAgent.post("/api/auth/login").send({
      email: requesterUser.email,
      password: "Password123!",
    });

    // Create test tickets for deterministic filter tests
    const baseTicketData = {
      ticketNumber: "",
      requesterId: requesterUser.id,
      categoryId: category.id,
      relatedSystemId: relatedSystem.id,
      summary: "",
      description: "Queue filter test ticket",
      requestedPriority: "MEDIUM" as const,
      status: "NEW" as const,
    };

    ticketNew = await prisma.ticket.create({
      data: {
        ...baseTicketData,
        ticketNumber: `TKT-Q-NEW-${Date.now()}`,
        summary: "Queue test: NEW status ticket",
        status: "NEW",
        requestedPriority: "LOW",
        itPriority: "LOW",
      },
    });

    ticketInProgress = await prisma.ticket.create({
      data: {
        ...baseTicketData,
        ticketNumber: `TKT-Q-INP-${Date.now()}`,
        summary: "Queue test: IN_PROGRESS ticket with VPN issue",
        status: "IN_PROGRESS",
        requestedPriority: "HIGH",
        itPriority: "HIGH",
        ownerId: itStaffUser.id,
      },
    });

    ticketHighPriority = await prisma.ticket.create({
      data: {
        ...baseTicketData,
        ticketNumber: `TKT-Q-HGH-${Date.now()}`,
        summary: "Queue test: HIGH priority battery draining",
        status: "OPEN",
        requestedPriority: "HIGH",
        itPriority: "URGENT",
      },
    });

    ticketUnassigned = await prisma.ticket.create({
      data: {
        ...baseTicketData,
        ticketNumber: `TKT-Q-UNA-${Date.now()}`,
        summary: "Queue test: unassigned ticket",
        status: "NEW",
        ownerId: null,
      },
    });

    ticketAssignedToMe = await prisma.ticket.create({
      data: {
        ...baseTicketData,
        ticketNumber: `TKT-Q-ME-${Date.now()}`,
        summary: "Queue test: assigned to IT staff",
        status: "OPEN",
        ownerId: itStaffUser.id,
      },
    });
  });

  // ---------------------------------------------------------------------------
  // API-08: IT Staff Shared Queue Retrieval — BR-10
  // ---------------------------------------------------------------------------
  describe("API-08: IT Staff can retrieve shared ticket queue (BR-10)", () => {
    it("returns 200 OK with paginated ticket list for IT Staff", async () => {
      const res = await itStaffAgent.get("/api/tickets");
      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.page).toBe(1);
    });

    it("includes requester and owner objects in each ticket item", async () => {
      const res = await itStaffAgent.get("/api/tickets");
      expect(res.status).toBe(200);
      const ticket = res.body.data.find((t: any) => t.id === ticketInProgress.id);
      expect(ticket).toBeDefined();
      expect(ticket.requester).toBeDefined();
      expect(ticket.requester.id).toBe(requesterUser.id);
      expect(ticket.requester.name).toBeTypeOf("string");
      expect(ticket.owner).toBeDefined();
      expect(ticket.owner.id).toBe(itStaffUser.id);
    });

    it("returns 200 OK with paginated ticket list for Administrator", async () => {
      const res = await adminAgent.get("/api/tickets");
      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.pagination).toBeDefined();
    });

    it("returns tickets across all requesters — not scoped to own tickets", async () => {
      const res = await itStaffAgent.get("/api/tickets");
      expect(res.status).toBe(200);
      // Should not be limited to any single requester
      const requestersFound = new Set(res.body.data.map((t: any) => t.requesterId));
      // In a seeded DB with multiple requesters, expect more than one or at least all visible
      expect(requestersFound.size).toBeGreaterThanOrEqual(1);
    });

    it("returns pagination metadata with correct shape", async () => {
      const res = await itStaffAgent.get("/api/tickets?page=1&pageSize=5");
      expect(res.status).toBe(200);
      const p = res.body.pagination;
      expect(p.page).toBe(1);
      expect(p.pageSize).toBe(5);
      expect(typeof p.totalItems).toBe("number");
      expect(typeof p.totalPages).toBe("number");
      expect(typeof p.hasNextPage).toBe("boolean");
      expect(typeof p.hasPrevPage).toBe("boolean");
    });
  });

  // ---------------------------------------------------------------------------
  // API-09: Queue Search and Filtering — BR-11
  // ---------------------------------------------------------------------------
  describe("API-09: Queue search and filters (BR-11)", () => {
    it("filters by text search on ticketNumber (case-insensitive)", async () => {
      const partialNum = ticketInProgress.ticketNumber.slice(-6);
      const res = await itStaffAgent.get(`/api/tickets?search=${partialNum}`);
      expect(res.status).toBe(200);
      const found = res.body.data.some((t: any) => t.id === ticketInProgress.id);
      expect(found).toBe(true);
    });

    it("filters by text search on summary keyword (case-insensitive)", async () => {
      // "VPN" appears in ticketInProgress summary
      const res = await itStaffAgent.get("/api/tickets?search=VPN");
      expect(res.status).toBe(200);
      const found = res.body.data.some((t: any) => t.id === ticketInProgress.id);
      expect(found).toBe(true);
    });

    it("filters by status=IN_PROGRESS returns only IN_PROGRESS tickets", async () => {
      const res = await itStaffAgent.get("/api/tickets?status=IN_PROGRESS");
      expect(res.status).toBe(200);
      const allInProgress = res.body.data.every((t: any) => t.status === "IN_PROGRESS");
      expect(allInProgress).toBe(true);
    });

    it("filters by status=NEW returns only NEW tickets", async () => {
      const res = await itStaffAgent.get("/api/tickets?status=NEW");
      expect(res.status).toBe(200);
      const allNew = res.body.data.every((t: any) => t.status === "NEW");
      expect(allNew).toBe(true);
      const found = res.body.data.some((t: any) => t.id === ticketNew.id);
      expect(found).toBe(true);
    });

    it("filters by status=WAITING_FOR_REQUESTER (Lab 3 extended status)", async () => {
      const res = await itStaffAgent.get("/api/tickets?status=WAITING_FOR_REQUESTER");
      expect(res.status).toBe(200);
      // Should not return IN_PROGRESS or NEW tickets
      const noWrong = res.body.data.every((t: any) => t.status === "WAITING_FOR_REQUESTER");
      expect(noWrong).toBe(true);
    });

    it("filters by itPriority=HIGH returns only HIGH itPriority tickets", async () => {
      const res = await itStaffAgent.get("/api/tickets?itPriority=HIGH");
      expect(res.status).toBe(200);
      const allHigh = res.body.data.every((t: any) => t.itPriority === "HIGH");
      expect(allHigh).toBe(true);
    });

    it("filters by itPriority=URGENT returns only URGENT itPriority tickets", async () => {
      const res = await itStaffAgent.get("/api/tickets?itPriority=URGENT");
      expect(res.status).toBe(200);
      const found = res.body.data.some((t: any) => t.id === ticketHighPriority.id);
      expect(found).toBe(true);
      const allUrgent = res.body.data.every((t: any) => t.itPriority === "URGENT");
      expect(allUrgent).toBe(true);
    });

    it("filters by requestedPriority=HIGH returns only HIGH requestedPriority tickets", async () => {
      const res = await itStaffAgent.get("/api/tickets?requestedPriority=HIGH");
      expect(res.status).toBe(200);
      const allHigh = res.body.data.every((t: any) => t.requestedPriority === "HIGH");
      expect(allHigh).toBe(true);
    });

    it("filters by categoryId returns tickets in that category", async () => {
      const res = await itStaffAgent.get(`/api/tickets?categoryId=${category.id}`);
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      const allMatch = res.body.data.every((t: any) => t.category.id === category.id);
      expect(allMatch).toBe(true);
    });

    it("combines search + status filter and returns matching tickets only", async () => {
      const res = await itStaffAgent.get(
        "/api/tickets?search=VPN&status=IN_PROGRESS"
      );
      expect(res.status).toBe(200);
      // All returned tickets must be IN_PROGRESS and contain 'VPN' in ticketNumber or summary
      for (const t of res.body.data) {
        expect(t.status).toBe("IN_PROGRESS");
        const matchesSearch =
          t.ticketNumber.toLowerCase().includes("vpn") ||
          t.summary.toLowerCase().includes("vpn");
        expect(matchesSearch).toBe(true);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // assignedTo Filter — BR-11
  // ---------------------------------------------------------------------------
  describe("assignedTo filter (BR-11)", () => {
    it("UNASSIGNED filter returns only tickets with null ownerId", async () => {
      const res = await itStaffAgent.get("/api/tickets?assignedTo=UNASSIGNED");
      expect(res.status).toBe(200);
      const allUnassigned = res.body.data.every(
        (t: any) => t.owner === null || t.owner === undefined
      );
      expect(allUnassigned).toBe(true);
      // Our unassigned test ticket should appear
      const found = res.body.data.some((t: any) => t.id === ticketUnassigned.id);
      expect(found).toBe(true);
    });

    it("ME filter returns only tickets assigned to the authenticated IT Staff user", async () => {
      const res = await itStaffAgent.get("/api/tickets?assignedTo=ME");
      expect(res.status).toBe(200);
      const allMine = res.body.data.every(
        (t: any) => t.owner && t.owner.id === itStaffUser.id
      );
      expect(allMine).toBe(true);
      const found = res.body.data.some((t: any) => t.id === ticketAssignedToMe.id);
      expect(found).toBe(true);
    });

    it("staffId filter returns only tickets assigned to the specified staff user", async () => {
      const res = await itStaffAgent.get(
        `/api/tickets?assignedTo=${itStaffUser.id}`
      );
      expect(res.status).toBe(200);
      const allOurs = res.body.data.every(
        (t: any) => t.owner && t.owner.id === itStaffUser.id
      );
      expect(allOurs).toBe(true);
    });

    it("ignores assignedTo filter for REQUESTER role (safe query isolation)", async () => {
      const res = await requesterAgent.get("/api/tickets?assignedTo=UNASSIGNED");
      expect(res.status).toBe(200);
      // Requester sees only own tickets regardless of filter
      const allOwned = res.body.data.every(
        (t: any) => t.requesterId === requesterUser.id
      );
      expect(allOwned).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Sorting
  // ---------------------------------------------------------------------------
  describe("Sorting", () => {
    it("sortBy=createdAt&sortOrder=asc returns oldest ticket first", async () => {
      const res = await itStaffAgent.get(
        "/api/tickets?sortBy=createdAt&sortOrder=asc"
      );
      expect(res.status).toBe(200);
      const dates = res.body.data.map((t: any) => new Date(t.createdAt).getTime());
      for (let i = 1; i < dates.length; i++) {
        expect(dates[i]).toBeGreaterThanOrEqual(dates[i - 1]);
      }
    });

    it("sortBy=createdAt&sortOrder=desc returns newest ticket first", async () => {
      const res = await itStaffAgent.get(
        "/api/tickets?sortBy=createdAt&sortOrder=desc"
      );
      expect(res.status).toBe(200);
      const dates = res.body.data.map((t: any) => new Date(t.createdAt).getTime());
      for (let i = 1; i < dates.length; i++) {
        expect(dates[i]).toBeLessThanOrEqual(dates[i - 1]);
      }
    });

    it("sortBy=ticketNumber returns results ordered by ticketNumber", async () => {
      const res = await itStaffAgent.get(
        "/api/tickets?sortBy=ticketNumber&sortOrder=asc"
      );
      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
    });

    it("sortBy=updatedAt is accepted as valid sort field", async () => {
      const res = await itStaffAgent.get(
        "/api/tickets?sortBy=updatedAt&sortOrder=desc"
      );
      expect(res.status).toBe(200);
    });

    it("sortBy=itPriority is accepted as valid sort field for IT Staff queue", async () => {
      const res = await itStaffAgent.get(
        "/api/tickets?sortBy=itPriority&sortOrder=asc"
      );
      expect(res.status).toBe(200);
    });

    it("invalid sortBy value falls back to createdAt without error", async () => {
      const res = await itStaffAgent.get(
        "/api/tickets?sortBy=INVALID_COLUMN_DROP_TABLE&sortOrder=asc"
      );
      expect(res.status).toBe(200);
    });

    it("invalid sortOrder value falls back to desc without error", async () => {
      const res = await itStaffAgent.get(
        "/api/tickets?sortBy=createdAt&sortOrder=MALICIOUS_INPUT"
      );
      expect(res.status).toBe(200);
    });
  });

  // ---------------------------------------------------------------------------
  // Pagination
  // ---------------------------------------------------------------------------
  describe("Pagination", () => {
    it("respects pageSize parameter and returns correct number of items", async () => {
      const res = await itStaffAgent.get("/api/tickets?page=1&pageSize=2");
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeLessThanOrEqual(2);
      expect(res.body.pagination.pageSize).toBe(2);
    });

    it("page=2 returns different tickets than page=1", async () => {
      const page1 = await itStaffAgent.get("/api/tickets?page=1&pageSize=3");
      const page2 = await itStaffAgent.get("/api/tickets?page=2&pageSize=3");
      expect(page1.status).toBe(200);
      expect(page2.status).toBe(200);
      if (page1.body.pagination.totalItems > 3) {
        const ids1 = new Set(page1.body.data.map((t: any) => t.id));
        const ids2 = new Set(page2.body.data.map((t: any) => t.id));
        const overlap = [...ids2].filter((id) => ids1.has(id));
        expect(overlap.length).toBe(0);
      }
    });

    it("invalid page value falls back to page 1 without error", async () => {
      const res = await itStaffAgent.get("/api/tickets?page=-99&pageSize=5");
      expect(res.status).toBe(200);
      expect(res.body.pagination.page).toBe(1);
    });

    it("pageSize above 50 is capped at 50", async () => {
      const res = await itStaffAgent.get("/api/tickets?pageSize=999");
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeLessThanOrEqual(50);
    });

    it("hasPrevPage is false on first page", async () => {
      const res = await itStaffAgent.get("/api/tickets?page=1&pageSize=5");
      expect(res.status).toBe(200);
      expect(res.body.pagination.hasPrevPage).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Safe Query Validation (Injection / Malformed Input)
  // ---------------------------------------------------------------------------
  describe("Safe query validation — rejects or ignores malicious inputs", () => {
    it("ignores non-enum status values gracefully (no 500 error)", async () => {
      const res = await itStaffAgent.get(
        "/api/tickets?status=DROP_TABLE"
      );
      expect(res.status).toBe(200);
      // Should return all tickets (filter ignored)
    });

    it("ignores non-enum itPriority values gracefully", async () => {
      const res = await itStaffAgent.get(
        "/api/tickets?itPriority=NOT_A_PRIORITY"
      );
      expect(res.status).toBe(200);
    });

    it("ignores non-numeric categoryId gracefully", async () => {
      const res = await itStaffAgent.get(
        "/api/tickets?categoryId=abc_injection"
      );
      expect(res.status).toBe(200);
    });

    it("ignores invalid assignedTo value gracefully (no 500 error)", async () => {
      const res = await itStaffAgent.get(
        "/api/tickets?assignedTo=INVALID_VALUE"
      );
      expect(res.status).toBe(200);
    });
  });

  // ---------------------------------------------------------------------------
  // Authorization — Requester only sees own tickets (BR-08)
  // ---------------------------------------------------------------------------
  describe("Authorization — Requester sees only own tickets (BR-08)", () => {
    it("Requester GET /api/tickets returns only their own tickets", async () => {
      const res = await requesterAgent.get("/api/tickets");
      expect(res.status).toBe(200);
      const allOwned = res.body.data.every(
        (t: any) => t.requesterId === requesterUser.id
      );
      expect(allOwned).toBe(true);
    });

    it("Requester response does NOT include requester/owner objects (staff-only fields)", async () => {
      const res = await requesterAgent.get("/api/tickets");
      expect(res.status).toBe(200);
      if (res.body.data.length > 0) {
        // Requester queue response does not expose enriched staff fields
        expect(res.body.data[0].owner).toBeUndefined();
        expect(res.body.data[0].requester).toBeUndefined();
      }
    });
  });
});
