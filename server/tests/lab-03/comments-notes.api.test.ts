import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

describe("Lab 3 — Issue #7: Public Comments and Internal Notes", () => {
  let requester: any;
  let otherRequester: any;
  let staff: any;
  let administrator: any;
  let requesterAgent: any;
  let otherRequesterAgent: any;
  let staffAgent: any;
  let administratorAgent: any;
  let ticket: any;
  let resolvingTicket: any;

  beforeAll(async () => {
    const prisma = getPrisma();
    [requester, otherRequester, staff, administrator] = await Promise.all([
      prisma.user.findFirstOrThrow({ where: { email: "jennifer.anderson@toktickit.local" } }),
      prisma.user.findFirstOrThrow({ where: { email: "michael.brown@toktickit.local" } }),
      prisma.user.findFirstOrThrow({ where: { email: "tech1@toktickit.local" } }),
      prisma.user.findFirstOrThrow({ where: { email: "admin@toktickit.local" } }),
    ]);
    await prisma.user.updateMany({
      where: { id: { in: [requester.id, otherRequester.id, staff.id, administrator.id] } },
      data: { mustChangePassword: false },
    });

    requesterAgent = request.agent(app);
    otherRequesterAgent = request.agent(app);
    staffAgent = request.agent(app);
    administratorAgent = request.agent(app);
    await Promise.all([
      requesterAgent.post("/api/auth/login").send({ email: requester.email, password: "Password123!" }),
      otherRequesterAgent.post("/api/auth/login").send({ email: otherRequester.email, password: "Password123!" }),
      staffAgent.post("/api/auth/login").send({ email: staff.email, password: "Password123!" }),
      administratorAgent.post("/api/auth/login").send({ email: administrator.email, password: "Password123!" }),
    ]);

    const category = await prisma.category.findFirstOrThrow({ where: { isActive: true } });
    const relatedSystem = await prisma.relatedSystem.findFirstOrThrow({ where: { isActive: true } });
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const createTicket = (ticketNumber: string, status: "NEW" | "IN_PROGRESS") => prisma.ticket.create({
      data: {
        ticketNumber,
        requesterId: requester.id,
        categoryId: category.id,
        relatedSystemId: relatedSystem.id,
        summary: `Collaboration test ${ticketNumber}`,
        description: "Comments and notes test fixture",
        requestedPriority: "MEDIUM",
        status,
      },
    });
    [ticket, resolvingTicket] = await Promise.all([
      createTicket(`TKT-COLLAB-${suffix}`, "NEW"),
      createTicket(`TKT-RESOLVE-${suffix}`, "IN_PROGRESS"),
    ]);
  });

  afterAll(async () => {
    await getPrisma().ticket.deleteMany({ where: { id: { in: [ticket?.id, resolvingTicket?.id].filter(Boolean) } } });
  });

  it("creates and retrieves a public comment with backend identity and timestamp", async () => {
    const created = await requesterAgent
      .post(`/api/tickets/${ticket.id}/comments`)
      .send({ content: "  Please keep me updated.  ", authorId: otherRequester.id, createdAt: "2000-01-01" });

    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({
      ticketId: ticket.id,
      authorId: requester.id,
      content: "Please keep me updated.",
      author: { id: requester.id, name: requester.name, role: "REQUESTER" },
    });
    expect(new Date(created.body.data.createdAt).getTime()).toBeGreaterThan(new Date("2020-01-01").getTime());

    for (const agent of [requesterAgent, staffAgent, administratorAgent]) {
      const listed = await agent.get(`/api/tickets/${ticket.id}/comments`);
      expect(listed.status).toBe(200);
      expect(listed.body).toEqual(expect.arrayContaining([expect.objectContaining({ id: created.body.data.id })]));
    }

    expect((await staffAgent.patch(`/api/tickets/${ticket.id}/comments/${created.body.data.id}`).send({ content: "Edited" })).status).toBe(404);
    expect((await staffAgent.delete(`/api/tickets/${ticket.id}/comments/${created.body.data.id}`)).status).toBe(404);
  });

  it("rejects empty, whitespace-only, and over-limit comment or note content", async () => {
    for (const content of ["", "   ", "x".repeat(1001)]) {
      expect((await requesterAgent.post(`/api/tickets/${ticket.id}/comments`).send({ content })).status).toBe(400);
      expect((await staffAgent.post(`/api/tickets/${ticket.id}/notes`).send({ content })).status).toBe(400);
    }
  });

  it("prevents requesters from accessing another requester's public comments", async () => {
    const response = await otherRequesterAgent.get(`/api/tickets/${ticket.id}/comments`);
    expect(response.status).toBe(403);
    expect(response.body.code).toBe("FORBIDDEN_TICKET_ACCESS");
    expect((await otherRequesterAgent.post(`/api/tickets/${ticket.id}/comments`).send({ content: "Not mine" })).status).toBe(403);
  });

  it("creates and retrieves staff-only internal notes", async () => {
    const created = await staffAgent
      .post(`/api/tickets/${ticket.id}/notes`)
      .send({ content: "  Check the device logs.  ", authorId: requester.id });
    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({
      ticketId: ticket.id,
      authorId: staff.id,
      content: "Check the device logs.",
      author: { id: staff.id, role: "IT_STAFF" },
    });

    const listed = await administratorAgent.get(`/api/tickets/${ticket.id}/notes`);
    expect(listed.status).toBe(200);
    expect(listed.body).toEqual(expect.arrayContaining([expect.objectContaining({ id: created.body.data.id })]));
    expect((await staffAgent.get(`/api/tickets/${ticket.id}/notes`)).status).toBe(200);
    expect((await requesterAgent.get(`/api/tickets/${ticket.id}/notes`)).status).toBe(403);
    expect((await requesterAgent.post(`/api/tickets/${ticket.id}/notes`).send({ content: "Private" })).status).toBe(403);
    expect((await staffAgent.patch(`/api/tickets/${ticket.id}/notes/${created.body.data.id}`).send({ content: "Edited" })).status).toBe(404);
    expect((await staffAgent.delete(`/api/tickets/${ticket.id}/notes/${created.body.data.id}`)).status).toBe(404);
  });

  it("returns not found for missing note ticket IDs instead of database errors", async () => {
    expect((await staffAgent.get("/api/tickets/99999999/notes")).status).toBe(404);
    expect((await staffAgent.post("/api/tickets/99999999/notes").send({ content: "Private" })).status).toBe(404);
  });

  it("records a requester resolution indication as a public comment and status change", async () => {
    const directStatusUpdate = await requesterAgent
      .patch(`/api/tickets/${resolvingTicket.id}/status`)
      .send({ status: "RESOLVED", resolutionSummary: "Looks fixed now" });
    expect(directStatusUpdate.status).toBe(403);

    const response = await requesterAgent.post(`/api/tickets/${resolvingTicket.id}/problem-appears-resolved`);
    expect(response.status).toBe(200);
    expect(response.body.data.ticket.status).toBe("RESOLVED");
    expect(response.body.data.comment).toMatchObject({
      authorId: requester.id,
      content: "The requester indicates that the problem appears resolved.",
    });
  });
});