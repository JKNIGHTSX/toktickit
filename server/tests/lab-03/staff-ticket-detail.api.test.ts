import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { app, STATUS_TRANSITIONS, isValidStatusTransition } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

describe("Lab 3 — Issue #6: Staff Ticket Detail Access", () => {
  let requesterA: any;
  let requesterB: any;
  let itStaff: any;
  let otherStaff: any;
  let inactiveStaff: any;
  let administrator: any;
  let requesterAAgent: any;
  let requesterBAgent: any;
  let itStaffAgent: any;
  let administratorAgent: any;
  let unassignedTicket: any;
  let otherOwnerTicket: any;
  let ownOwnerTicket: any;
  let requesterBTicket: any;
  const createdTicketIds: number[] = [];
  const originalPasswordFlags = new Map<number, boolean>();

  beforeAll(async () => {
    const prisma = getPrisma();

    [requesterA, requesterB, itStaff, otherStaff, inactiveStaff, administrator] = await Promise.all([
      prisma.user.findFirstOrThrow({ where: { email: "jennifer.anderson@toktickit.local" } }),
      prisma.user.findFirstOrThrow({ where: { email: "michael.brown@toktickit.local" } }),
      prisma.user.findFirstOrThrow({ where: { email: "tech1@toktickit.local" } }),
      prisma.user.findFirstOrThrow({ where: { email: "tech2@toktickit.local" } }),
      prisma.user.findFirstOrThrow({ where: { email: "tech_inactive@toktickit.local" } }),
      prisma.user.findFirstOrThrow({ where: { email: "admin@toktickit.local" } }),
    ]);

    for (const user of [requesterA, requesterB, itStaff, otherStaff, administrator]) {
      originalPasswordFlags.set(user.id, user.mustChangePassword);
    }
    await prisma.user.updateMany({
      where: { id: { in: [requesterA.id, requesterB.id, itStaff.id, otherStaff.id, administrator.id] } },
      data: { mustChangePassword: false },
    });

    requesterAAgent = request.agent(app);
    requesterBAgent = request.agent(app);
    itStaffAgent = request.agent(app);
    administratorAgent = request.agent(app);

    await Promise.all([
      requesterAAgent.post("/api/auth/login").send({ email: requesterA.email, password: "Password123!" }),
      requesterBAgent.post("/api/auth/login").send({ email: requesterB.email, password: "Password123!" }),
      itStaffAgent.post("/api/auth/login").send({ email: itStaff.email, password: "Password123!" }),
      administratorAgent.post("/api/auth/login").send({ email: administrator.email, password: "Password123!" }),
    ]);

    const category = await prisma.category.findFirstOrThrow({ where: { isActive: true } });
    const relatedSystem = await prisma.relatedSystem.findFirstOrThrow({ where: { isActive: true } });
    const createTicket = (ticketNumber: string, requesterId: number, ownerId: number | null) =>
      prisma.ticket.create({
        data: {
          ticketNumber,
          requesterId,
          categoryId: category.id,
          relatedSystemId: relatedSystem.id,
          summary: `Staff detail access test ${ticketNumber}`,
          description: "Detail endpoint authorization regression fixture",
          requestedPriority: "MEDIUM",
          status: "NEW",
          ownerId,
        },
      });

    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    [unassignedTicket, otherOwnerTicket, ownOwnerTicket, requesterBTicket] = await Promise.all([
      createTicket(`TKT-DETAIL-UNASSIGNED-${suffix}`, requesterA.id, null),
      createTicket(`TKT-DETAIL-OTHER-OWNER-${suffix}`, requesterA.id, otherStaff.id),
      createTicket(`TKT-DETAIL-OWN-OWNER-${suffix}`, requesterA.id, itStaff.id),
      createTicket(`TKT-DETAIL-REQUESTER-B-${suffix}`, requesterB.id, null),
    ]);
    createdTicketIds.push(unassignedTicket.id, otherOwnerTicket.id, ownOwnerTicket.id, requesterBTicket.id);
  });

  afterAll(async () => {
    if (createdTicketIds.length > 0) {
      await getPrisma().ticket.deleteMany({ where: { id: { in: createdTicketIds } } });
    }
    for (const [id, mustChangePassword] of originalPasswordFlags) {
      await getPrisma().user.update({ where: { id }, data: { mustChangePassword } });
    }
  });

  it("allows IT Staff to open an unassigned ticket using its database ID", async () => {
    const res = await itStaffAgent.get(`/api/tickets/${unassignedTicket.id}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(unassignedTicket.id);
  });

  it("allows IT Staff to open a ticket assigned to another IT Staff member", async () => {
    const res = await itStaffAgent.get(`/api/tickets/${otherOwnerTicket.id}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(otherOwnerTicket.id);
  });

  it("allows IT Staff to open a ticket assigned to themselves", async () => {
    const res = await itStaffAgent.get(`/api/tickets/${ownOwnerTicket.id}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(ownOwnerTicket.id);
  });

  it("allows Administrator access to any ticket", async () => {
    const res = await administratorAgent.get(`/api/tickets/${otherOwnerTicket.id}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(otherOwnerTicket.id);
  });

  it("lists only active IT Staff and Administrators for ticket assignment", async () => {
    const res = await itStaffAgent.get("/api/assignable-users");
    const returnedIds = res.body.map((user: any) => user.id);

    expect(res.status).toBe(200);
    expect(returnedIds).toContain(itStaff.id);
    expect(returnedIds).toContain(otherStaff.id);
    expect(returnedIds).toContain(administrator.id);
    expect(returnedIds).not.toContain(requesterA.id);
    expect(returnedIds).not.toContain(inactiveStaff.id);
    expect(res.body.every((user: any) => user.isActive)).toBe(true);
  });

  it("does not expose assignable users to Requesters", async () => {
    const res = await requesterBAgent.get("/api/assignable-users");
    expect(res.status).toBe(403);
    expect(res.body.code).toBe("FORBIDDEN_ROLE");
  });

  it("persists IT Priority and Status changes returned by the Staff Queue", async () => {
    const priorityRes = await itStaffAgent
      .patch(`/api/tickets/${unassignedTicket.id}/priority`)
      .send({ itPriority: "URGENT" });
    expect(priorityRes.status).toBe(200);
    expect(priorityRes.body.data.itPriority).toBe("URGENT");

    const statusRes = await itStaffAgent
      .patch(`/api/tickets/${unassignedTicket.id}/status`)
      .send({ status: "OPEN" });
    expect(statusRes.status).toBe(200);
    expect(statusRes.body.data.status).toBe("OPEN");

    const queueRes = await itStaffAgent.get(
      `/api/tickets?search=${encodeURIComponent(unassignedTicket.ticketNumber)}&status=OPEN&itPriority=URGENT`
    );
    expect(queueRes.status).toBe(200);
    expect(queueRes.body.data).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: unassignedTicket.id,
        status: "OPEN",
        itPriority: "URGENT",
      }),
    ]));
  });

  it("keeps Requester detail access limited to their own tickets", async () => {
    const ownRes = await requesterBAgent.get(`/api/tickets/${requesterBTicket.id}`);
    const otherRes = await requesterBAgent.get(`/api/tickets/${unassignedTicket.id}`);
    expect(ownRes.status).toBe(200);
    expect(otherRes.status).toBe(404);
    expect(otherRes.body.code).toBe("TICKET_NOT_FOUND");
  });

  it("does not accept requester identity headers without an authenticated session", async () => {
    const res = await request(app)
      .get(`/api/tickets/${requesterBTicket.id}`)
      .set("X-Requester-Id", String(requesterB.id));
    expect(res.status).toBe(401);
    expect(res.body.code).toBe("UNAUTHENTICATED");
  });

  it("returns 404 for a nonexistent ticket, even to IT Staff", async () => {
    const res = await itStaffAgent.get("/api/tickets/99999999");
    expect(res.status).toBe(404);
    expect(res.body.code).toBe("TICKET_NOT_FOUND");

    const invalidRes = await itStaffAgent.get("/api/tickets/not-a-ticket");
    expect(invalidRes.status).toBe(404);
    expect(invalidRes.body.code).toBe("TICKET_NOT_FOUND");
  });

  describe("UT-02: State Transition Matrix Rule Engine (BR-14)", () => {
    it("validates permitted status transitions across all states", () => {
      expect(isValidStatusTransition("NEW", "OPEN")).toBe(true);
      expect(isValidStatusTransition("NEW", "CANCELLED")).toBe(true);
      expect(isValidStatusTransition("OPEN", "IN_PROGRESS")).toBe(true);
      expect(isValidStatusTransition("OPEN", "CANCELLED")).toBe(true);
      expect(isValidStatusTransition("IN_PROGRESS", "WAITING_FOR_REQUESTER")).toBe(true);
      expect(isValidStatusTransition("IN_PROGRESS", "RESOLVED")).toBe(true);
      expect(isValidStatusTransition("IN_PROGRESS", "CANCELLED")).toBe(true);
      expect(isValidStatusTransition("WAITING_FOR_REQUESTER", "IN_PROGRESS")).toBe(true);
      expect(isValidStatusTransition("WAITING_FOR_REQUESTER", "CANCELLED")).toBe(true);
      expect(isValidStatusTransition("RESOLVED", "CLOSED")).toBe(true);
      expect(isValidStatusTransition("RESOLVED", "REOPENED")).toBe(true);
      expect(isValidStatusTransition("RESOLVED", "CANCELLED")).toBe(true);
      expect(isValidStatusTransition("REOPENED", "IN_PROGRESS")).toBe(true);
      expect(isValidStatusTransition("REOPENED", "CANCELLED")).toBe(true);
    });

    it("rejects forbidden status transitions", () => {
      expect(isValidStatusTransition("NEW", "RESOLVED")).toBe(false);
      expect(isValidStatusTransition("NEW", "CLOSED")).toBe(false);
      expect(isValidStatusTransition("CLOSED", "OPEN")).toBe(false);
      expect(isValidStatusTransition("CLOSED", "CANCELLED")).toBe(false);
      expect(isValidStatusTransition("CANCELLED", "OPEN")).toBe(false);
      expect(STATUS_TRANSITIONS.CLOSED).toHaveLength(0);
      expect(STATUS_TRANSITIONS.CANCELLED).toHaveLength(0);
    });
  });

  describe("API-10: Ticket Ownership Claim (PATCH /api/tickets/:id/claim)", () => {
    it("allows IT Staff to claim an unassigned ticket", async () => {
      const prisma = getPrisma();
      const testClaimTicket = await prisma.ticket.create({
        data: {
          ticketNumber: `TKT-CLAIM-${Date.now()}`,
          requesterId: requesterA.id,
          categoryId: 1,
          relatedSystemId: 1,
          summary: "Claim test ticket",
          description: "Unassigned ticket for claim test",
          requestedPriority: "LOW",
          status: "NEW",
          ownerId: null,
        },
      });
      createdTicketIds.push(testClaimTicket.id);

      const res = await itStaffAgent.patch(`/api/tickets/${testClaimTicket.id}/claim`);
      expect(res.status).toBe(200);
      expect(res.body.data.ownerId).toBe(itStaff.id);
      expect(res.body.data.status).toBe("OPEN");
      expect(res.body.message).toContain("claimed successfully");
    });

    it("rejects claim when ticket is already assigned to another staff", async () => {
      const res = await itStaffAgent.patch(`/api/tickets/${otherOwnerTicket.id}/claim`);
      expect(res.status).toBe(409);
      expect(res.body.code).toBe("TICKET_ALREADY_ASSIGNED");
    });
  });

  describe("API-11: Ticket Ownership Reassignment (PATCH /api/tickets/:id/assign)", () => {
    it("reassigns ticket to specified active IT Staff", async () => {
      const res = await itStaffAgent
        .patch(`/api/tickets/${ownOwnerTicket.id}/assign`)
        .send({ ownerId: otherStaff.id });
      expect(res.status).toBe(200);
      expect(res.body.data.ownerId).toBe(otherStaff.id);
      expect(res.body.message).toContain("reassigned successfully");
    });

    it("rejects assignment to an inactive staff member", async () => {
      const res = await itStaffAgent
        .patch(`/api/tickets/${ownOwnerTicket.id}/assign`)
        .send({ ownerId: inactiveStaff.id });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe("INVALID_OWNER");
    });

    it("rejects assignment to a Requester user", async () => {
      const res = await itStaffAgent
        .patch(`/api/tickets/${ownOwnerTicket.id}/assign`)
        .send({ ownerId: requesterA.id });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe("INVALID_OWNER");
    });
  });

  describe("API-12: Update IT Priority (PATCH /api/tickets/:id/priority)", () => {
    it("updates itPriority to permitted levels", async () => {
      for (const level of ["LOW", "MEDIUM", "HIGH", "URGENT"]) {
        const res = await itStaffAgent
          .patch(`/api/tickets/${ownOwnerTicket.id}/priority`)
          .send({ itPriority: level });
        expect(res.status).toBe(200);
        expect(res.body.data.itPriority).toBe(level);
      }
    });

    it("rejects invalid priority values with 400 Bad Request", async () => {
      const res = await itStaffAgent
        .patch(`/api/tickets/${ownOwnerTicket.id}/priority`)
        .send({ itPriority: "SUPER_CRITICAL" });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("API-13 & API-14: Status Transitions & Resolution Summary (PATCH /api/tickets/:id/status)", () => {
    it("API-14: rejects transitioning to RESOLVED without resolutionSummary (BR-15)", async () => {
      const prisma = getPrisma();
      const testResTicket = await prisma.ticket.create({
        data: {
          ticketNumber: `TKT-RES-${Date.now()}`,
          requesterId: requesterA.id,
          categoryId: 1,
          relatedSystemId: 1,
          summary: "Resolution summary validation ticket",
          description: "Needs summary before resolve",
          requestedPriority: "MEDIUM",
          status: "IN_PROGRESS",
        },
      });
      createdTicketIds.push(testResTicket.id);

      // Without resolutionSummary
      const missingSummaryRes = await itStaffAgent
        .patch(`/api/tickets/${testResTicket.id}/status`)
        .send({ status: "RESOLVED" });
      expect(missingSummaryRes.status).toBe(422);
      expect(missingSummaryRes.body.code).toBe("RESOLUTION_SUMMARY_REQUIRED");

      // With resolutionSummary < 5 characters
      const shortSummaryRes = await itStaffAgent
        .patch(`/api/tickets/${testResTicket.id}/status`)
        .send({ status: "RESOLVED", resolutionSummary: "ok" });
      expect(shortSummaryRes.status).toBe(422);
      expect(shortSummaryRes.body.code).toBe("RESOLUTION_SUMMARY_REQUIRED");
    });

    it("API-13: updates status to RESOLVED when valid resolutionSummary is provided", async () => {
      const prisma = getPrisma();
      const testResTicket = await prisma.ticket.create({
        data: {
          ticketNumber: `TKT-RES-OK-${Date.now()}`,
          requesterId: requesterA.id,
          categoryId: 1,
          relatedSystemId: 1,
          summary: "Successful resolve test ticket",
          description: "Testing valid resolution",
          requestedPriority: "MEDIUM",
          status: "IN_PROGRESS",
        },
      });
      createdTicketIds.push(testResTicket.id);

      const res = await itStaffAgent
        .patch(`/api/tickets/${testResTicket.id}/status`)
        .send({
          status: "RESOLVED",
          resolutionSummary: "Replaced faulty battery pack and tested charging.",
        });
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe("RESOLVED");
      expect(res.body.data.resolutionSummary).toBe(
        "Replaced faulty battery pack and tested charging."
      );
    });

    it("rejects invalid status transitions with 422 Unprocessable", async () => {
      const prisma = getPrisma();
      const testInvalidTicket = await prisma.ticket.create({
        data: {
          ticketNumber: `TKT-INV-TRANS-${Date.now()}`,
          requesterId: requesterA.id,
          categoryId: 1,
          relatedSystemId: 1,
          summary: "Invalid transition test ticket",
          description: "Testing invalid transitions",
          requestedPriority: "LOW",
          status: "NEW",
        },
      });
      createdTicketIds.push(testInvalidTicket.id);

      // NEW cannot jump directly to RESOLVED or CLOSED
      const res = await itStaffAgent
        .patch(`/api/tickets/${testInvalidTicket.id}/status`)
        .send({ status: "RESOLVED", resolutionSummary: "Cannot skip states" });
      expect(res.status).toBe(422);
      expect(res.body.code).toBe("INVALID_STATUS_TRANSITION");
    });
  });
});