import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

describe("Lab 2 — Issue #6: Ticket Detail API Tests (GET /api/tickets/:idOrNumber)", () => {
  let requesterAId: number;
  let requesterBId: number;
  let categoryId: number;
  let relatedSystemId: number;
  let ticketAId: number;
  let ticketANumber: string;
  let ticketBId: number;
  const createdTicketIds: number[] = [];

  beforeAll(async () => {
    const prisma = getPrisma();

    // Fetch 2 active requesters
    const requesters = await prisma.requesterUser.findMany({
      where: { isActive: true },
      orderBy: { id: "asc" },
      take: 2,
    });
    requesterAId = requesters[0].id;
    requesterBId = requesters[1].id;

    // Fetch active category & related system
    const category = await prisma.category.findFirst({ where: { isActive: true } });
    categoryId = category!.id;

    const system = await prisma.relatedSystem.findFirst({ where: { isActive: true } });
    relatedSystemId = system!.id;

    // Create ticket owned by Requester A
    ticketANumber = `TKT-DETAIL-A-${Date.now()}`;
    const tA = await prisma.ticket.create({
      data: {
        ticketNumber: ticketANumber,
        requesterId: requesterAId,
        categoryId,
        relatedSystemId,
        summary: "Laptop battery overheating issue",
        description: "My laptop battery gets excessively hot when charging under normal load.",
        requestedPriority: "HIGH",
        status: "NEW",
      },
    });
    ticketAId = tA.id;
    createdTicketIds.push(tA.id);

    // Create ticket owned by Requester B
    const tB = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-DETAIL-B-${Date.now()}`,
        requesterId: requesterBId,
        categoryId,
        relatedSystemId,
        summary: "Confidential HR payroll access request",
        description: "Need access to HR payroll folder",
        requestedPriority: "URGENT",
        status: "NEW",
      },
    });
    ticketBId = tB.id;
    createdTicketIds.push(tB.id);
  });

  afterAll(async () => {
    if (createdTicketIds.length > 0) {
      const prisma = getPrisma();
      await prisma.ticket.deleteMany({ where: { id: { in: createdTicketIds } } });
    }
  });

  it("returns 400 Bad Request when requesterId is missing", async () => {
    const res = await request(app).get(`/api/tickets/${ticketAId}`);
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("MISSING_REQUESTER_ID");
  });

  it("API-11 / AC-16: returns 200 OK with complete ticket details for owned ticket by numeric ID", async () => {
    const res = await request(app)
      .get(`/api/tickets/${ticketAId}`)
      .set("X-Requester-Id", String(requesterAId));

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      id: ticketAId,
      ticketNumber: ticketANumber,
      requesterId: requesterAId,
      requester: expect.objectContaining({ id: requesterAId }),
      categoryId,
      category: expect.objectContaining({ id: categoryId }),
      relatedSystemId,
      relatedSystem: expect.objectContaining({ id: relatedSystemId }),
      summary: "Laptop battery overheating issue",
      description: "My laptop battery gets excessively hot when charging under normal load.",
      requestedPriority: "HIGH",
      itPriority: null,
      status: "NEW",
      ticketOwnerName: null,
      resolutionSummary: null,
      attachments: [],
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });
  });

  it("API-11 / AC-16: returns 200 OK with complete ticket details for owned ticket by Ticket Number", async () => {
    const res = await request(app)
      .get(`/api/tickets/${ticketANumber}`)
      .set("X-Requester-Id", String(requesterAId));

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(ticketAId);
    expect(res.body.ticketNumber).toBe(ticketANumber);
  });

  it("API-12 / AC-10: returns 404 Not Found when Requester B attempts to view Requester A's ticket (ownership isolation)", async () => {
    const res = await request(app)
      .get(`/api/tickets/${ticketAId}`)
      .set("X-Requester-Id", String(requesterBId));

    expect(res.status).toBe(404);
    expect(res.body.code).toBe("TICKET_NOT_FOUND");
    expect(res.body.error).toContain("Ticket not found or you do not have permission");
  });

  it("returns 404 Not Found for non-existent ticket ID", async () => {
    const res = await request(app)
      .get("/api/tickets/99999999")
      .set("X-Requester-Id", String(requesterAId));

    expect(res.status).toBe(404);
    expect(res.body.code).toBe("TICKET_NOT_FOUND");
  });
});
