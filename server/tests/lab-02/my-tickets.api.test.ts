import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

describe("Lab 2 — Issue #5: My Tickets API Tests (GET /api/tickets)", () => {
  let requesterAId: number;
  let requesterBId: number;
  let category1Id: number;
  let category2Id: number;
  let relatedSystemId: number;
  const createdTicketIds: number[] = [];

  beforeAll(async () => {
    const prisma = getPrisma();

    // Fetch active requesters
    const activeRequesters = await prisma.requesterUser.findMany({
      where: { isActive: true },
      orderBy: { id: "asc" },
      take: 2,
    });
    requesterAId = activeRequesters[0].id;
    requesterBId = activeRequesters[1].id;

    // Fetch active categories
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { id: "asc" },
      take: 2,
    });
    category1Id = categories[0].id;
    category2Id = categories[1].id;

    // Fetch active related system
    const system = await prisma.relatedSystem.findFirst({
      where: { isActive: true },
    });
    relatedSystemId = system!.id;

    // Create tickets for Requester A
    // t1: category2 + HIGH — used by the categoryId+priority filter test (unique combo
    // so it doesn't conflict with create-ticket.api.test.ts which uses category1 + HIGH)
    const t1 = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-TEST-A1-${Date.now()}`,
        requesterId: requesterAId,
        categoryId: category2Id,
        relatedSystemId,
        summary: "Laptop battery drains quickly on idle",
        description: "Battery drains quickly when opening browser tabs",
        requestedPriority: "HIGH",
        status: "NEW",
      },
    });
    createdTicketIds.push(t1.id);

    const t2 = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-TEST-A2-${Date.now()}`,
        requesterId: requesterAId,
        categoryId: category1Id,
        relatedSystemId,
        summary: "VPN access issue on home Wi-Fi",
        description: "Cannot connect to VPN from home network",
        requestedPriority: "LOW",
        status: "NEW",
      },
    });
    createdTicketIds.push(t2.id);

    const t3 = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-TEST-A3-${Date.now()}`,
        requesterId: requesterAId,
        categoryId: category1Id,
        relatedSystemId,
        summary: "Outlook email sync failure",
        description: "Emails are not syncing automatically",
        requestedPriority: "URGENT",
        status: "OPEN",
      },
    });
    createdTicketIds.push(t3.id);

    // Create ticket for Requester B
    const t4 = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-TEST-B1-${Date.now()}`,
        requesterId: requesterBId,
        categoryId: category1Id,
        relatedSystemId,
        summary: "Monitor display flickers frequently",
        description: "External monitor flickers every few minutes",
        requestedPriority: "MEDIUM",
        status: "NEW",
      },
    });
    createdTicketIds.push(t4.id);
  });

  afterAll(async () => {
    if (createdTicketIds.length > 0) {
      const prisma = getPrisma();
      await prisma.ticket.deleteMany({ where: { id: { in: createdTicketIds } } });
    }
  });

  it("returns 400 Bad Request when requesterId is missing", async () => {
    const res = await request(app).get("/api/tickets");
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("MISSING_REQUESTER_ID");
    expect(res.body.error).toContain("Requester ID is required");
  });

  it("API-06 / AC-09: returns tickets belonging strictly to the selected requester (ownership isolation)", async () => {
    const res = await request(app)
      .get("/api/tickets")
      .set("X-Requester-Id", String(requesterAId));

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("data");
    expect(res.body).toHaveProperty("pagination");
    expect(Array.isArray(res.body.data)).toBe(true);

    // All returned tickets must belong to Requester A
    for (const ticket of res.body.data) {
      expect(ticket.requesterId).toBe(requesterAId);
      expect(ticket.requesterId).not.toBe(requesterBId);
    }

    // Ensure Requester B's ticket is not present
    const summaries = res.body.data.map((t: any) => t.summary);
    expect(summaries).not.toContain("Monitor display flickers frequently");
  });

  it("accepts requesterId via query parameter if X-Requester-Id header is not set", async () => {
    const res = await request(app).get(`/api/tickets?requesterId=${requesterBId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);

    for (const ticket of res.body.data) {
      expect(ticket.requesterId).toBe(requesterBId);
    }
  });

  it("API-07 / AC-11: filters tickets by case-insensitive search term on summary or ticket number", async () => {
    const res = await request(app)
      .get("/api/tickets?search=laptop")
      .set("X-Requester-Id", String(requesterAId));

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    const summaries = res.body.data.map((t: any) => t.summary as string);
    expect(summaries.some((s: string) => s.toLowerCase().includes("laptop"))).toBe(true);
  });

  it("API-08 / AC-12: filters tickets by categoryId and requestedPriority", async () => {
    // Uses category2Id + HIGH — a unique combo not used by create-ticket or ticket-detail test suites
    const res = await request(app)
      .get(`/api/tickets?categoryId=${category2Id}&requestedPriority=HIGH`)
      .set("X-Requester-Id", String(requesterAId));

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].summary).toContain("Laptop battery");
    expect(res.body.data[0].requestedPriority).toBe("HIGH");
  });

  it("API-09 / AC-13: sorts tickets by column and order", async () => {
    const resAsc = await request(app)
      .get("/api/tickets?sortBy=createdAt&sortOrder=asc")
      .set("X-Requester-Id", String(requesterAId));

    expect(resAsc.status).toBe(200);
    expect(resAsc.body.data.length).toBeGreaterThanOrEqual(2);

    const datesAsc = resAsc.body.data.map((t: any) => new Date(t.createdAt).getTime());
    for (let i = 0; i < datesAsc.length - 1; i++) {
      expect(datesAsc[i]).toBeLessThanOrEqual(datesAsc[i + 1]);
    }
  });

  it("API-10 / AC-09: supports pagination and returns correct pagination metadata", async () => {
    const res = await request(app)
      .get("/api/tickets?page=1&pageSize=2")
      .set("X-Requester-Id", String(requesterAId));

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(2);
    expect(res.body.pagination).toEqual({
      page: 1,
      pageSize: 2,
      totalItems: expect.any(Number),
      totalPages: expect.any(Number),
      hasNextPage: true,
      hasPrevPage: false,
    });
  });
});
