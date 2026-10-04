import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
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
});