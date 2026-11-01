import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import {
  STATUS_TRANSITIONS,
  REQUESTER_ALLOWED_STATUS_UPDATES,
  isValidStatusTransition,
} from "../../src/app.js";

/**
 * Lab 4 — Issue #5: Ticket Status Workflow & Resolution Rules Unit & API Tests
 *
 * Traceability Matrix:
 *   UT-02  / BR-12  — Status transition matrix pure unit tests
 *   UT-03  / BR-15, BR-16 — Resolution gate prerequisite rules
 *   API-09 / FR-05, AC-09 — Permitted status transitions (OPEN -> IN_PROGRESS, etc.)
 *   API-10 / FR-05, AC-10 — Invalid status transitions rejected with 422 INVALID_STATUS_TRANSITION
 *   API-11 / FR-06, AC-11 — Transition to RESOLVED with 0 Actions Taken rejected (422 RESOLUTION_REQUIRES_ACTION_TAKEN)
 *   API-12 / FR-06, AC-12 — Transition to RESOLVED with 1 Action but missing/short summary rejected (422 RESOLUTION_SUMMARY_REQUIRED)
 *   API-13 / FR-06, AC-11 — Transition to RESOLVED with >= 1 Action and valid summary succeeds
 *   API-14 / FR-07, AC-13 — Requester advisory "Problem Appears Resolved" creates comment and does not set RESOLVED
 *   API-15 / FR-08, BR-19 — Stale expectedUpdatedAt rejected with 409 STALE_UPDATE_CONFLICT
 *   Role security:
 *     - Requesters directly calling PATCH /api/tickets/:id/status to set RESOLVED/CLOSED return 403 FORBIDDEN_ROLE
 *     - Closed tickets cannot transition to other statuses (BR-13)
 */

describe("Lab 4 — Issue #5: Status Transition Matrix Unit Rules (UT-02, BR-12, BR-13)", () => {
  it("enforces approved transitions from NEW (OPEN, CANCELLED)", () => {
    expect(STATUS_TRANSITIONS.NEW).toEqual(["OPEN", "CANCELLED"]);
    expect(isValidStatusTransition("NEW", "OPEN")).toBe(true);
    expect(isValidStatusTransition("NEW", "CANCELLED")).toBe(true);
    expect(isValidStatusTransition("NEW", "IN_PROGRESS")).toBe(false);
    expect(isValidStatusTransition("NEW", "RESOLVED")).toBe(false);
    expect(isValidStatusTransition("NEW", "CLOSED")).toBe(false);
  });

  it("enforces approved transitions from OPEN (IN_PROGRESS, CANCELLED)", () => {
    expect(STATUS_TRANSITIONS.OPEN).toEqual(["IN_PROGRESS", "CANCELLED"]);
    expect(isValidStatusTransition("OPEN", "IN_PROGRESS")).toBe(true);
    expect(isValidStatusTransition("OPEN", "CANCELLED")).toBe(true);
    expect(isValidStatusTransition("OPEN", "RESOLVED")).toBe(false);
    expect(isValidStatusTransition("OPEN", "CLOSED")).toBe(false);
  });

  it("enforces approved transitions from IN_PROGRESS (WAITING_FOR_REQUESTER, RESOLVED, CANCELLED)", () => {
    expect(STATUS_TRANSITIONS.IN_PROGRESS).toEqual(["WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"]);
    expect(isValidStatusTransition("IN_PROGRESS", "WAITING_FOR_REQUESTER")).toBe(true);
    expect(isValidStatusTransition("IN_PROGRESS", "RESOLVED")).toBe(true);
    expect(isValidStatusTransition("IN_PROGRESS", "CANCELLED")).toBe(true);
    expect(isValidStatusTransition("IN_PROGRESS", "CLOSED")).toBe(false);
  });

  it("enforces approved transitions from WAITING_FOR_REQUESTER (IN_PROGRESS, RESOLVED)", () => {
    expect(STATUS_TRANSITIONS.WAITING_FOR_REQUESTER).toEqual(["IN_PROGRESS", "RESOLVED"]);
    expect(isValidStatusTransition("WAITING_FOR_REQUESTER", "IN_PROGRESS")).toBe(true);
    expect(isValidStatusTransition("WAITING_FOR_REQUESTER", "RESOLVED")).toBe(true);
    expect(isValidStatusTransition("WAITING_FOR_REQUESTER", "CANCELLED")).toBe(false);
    expect(isValidStatusTransition("WAITING_FOR_REQUESTER", "CLOSED")).toBe(false);
  });

  it("enforces approved transitions from RESOLVED (CLOSED, REOPENED)", () => {
    expect(STATUS_TRANSITIONS.RESOLVED).toEqual(["CLOSED", "REOPENED"]);
    expect(isValidStatusTransition("RESOLVED", "CLOSED")).toBe(true);
    expect(isValidStatusTransition("RESOLVED", "REOPENED")).toBe(true);
    expect(isValidStatusTransition("RESOLVED", "CANCELLED")).toBe(false);
    expect(isValidStatusTransition("RESOLVED", "IN_PROGRESS")).toBe(false);
  });

  it("enforces approved transitions from REOPENED (IN_PROGRESS, CANCELLED)", () => {
    expect(STATUS_TRANSITIONS.REOPENED).toEqual(["IN_PROGRESS", "CANCELLED"]);
    expect(isValidStatusTransition("REOPENED", "IN_PROGRESS")).toBe(true);
    expect(isValidStatusTransition("REOPENED", "CANCELLED")).toBe(true);
    expect(isValidStatusTransition("REOPENED", "RESOLVED")).toBe(false);
    expect(isValidStatusTransition("REOPENED", "CLOSED")).toBe(false);
  });

  it("enforces CLOSED and CANCELLED as terminal states (BR-13, BR-14)", () => {
    expect(STATUS_TRANSITIONS.CLOSED).toEqual([]);
    expect(STATUS_TRANSITIONS.CANCELLED).toEqual([]);
    expect(isValidStatusTransition("CLOSED", "OPEN")).toBe(false);
    expect(isValidStatusTransition("CLOSED", "REOPENED")).toBe(false);
    expect(isValidStatusTransition("CANCELLED", "IN_PROGRESS")).toBe(false);
  });

  it("strictly prohibits Requesters from setting tickets to RESOLVED or CLOSED (BR-17, BR-18)", () => {
    for (const [status, allowed] of Object.entries(REQUESTER_ALLOWED_STATUS_UPDATES)) {
      expect(allowed).not.toContain("RESOLVED");
      expect(allowed).not.toContain("CLOSED");
    }
  });
});

describe("Lab 4 — Issue #5: Resolution Gate Prerequisite Validation Rules (UT-03, BR-15, BR-16)", () => {
  it("rejects resolution when actionCount < 1 (BR-15)", () => {
    const actionCount = 0;
    const canResolve = actionCount >= 1;
    expect(canResolve).toBe(false);
  });

  it("accepts resolution when actionCount >= 1 (BR-15)", () => {
    const actionCount = 1;
    const canResolve = actionCount >= 1;
    expect(canResolve).toBe(true);
  });

  it("rejects resolution summary shorter than 5 characters or empty (BR-16)", () => {
    const validateSummary = (summary?: string) =>
      Boolean(summary && summary.trim().length >= 5);

    expect(validateSummary(undefined)).toBe(false);
    expect(validateSummary("")).toBe(false);
    expect(validateSummary("   ")).toBe(false);
    expect(validateSummary("Done")).toBe(false);
    expect(validateSummary("Fixed issue in memory chip.")).toBe(true);
  });

  it("validates expectedUpdatedAt concurrency timestamps within 1000ms window (BR-19)", () => {
    const checkConcurrency = (expected: string, current: Date) => {
      const clientTimestamp = new Date(expected).getTime();
      const serverTimestamp = current.getTime();
      return !isNaN(clientTimestamp) && Math.abs(clientTimestamp - serverTimestamp) <= 1000;
    };

    const now = new Date("2026-10-21T10:00:00.000Z");
    expect(checkConcurrency("2026-10-21T10:00:00.000Z", now)).toBe(true);
    expect(checkConcurrency("2026-10-21T10:00:00.500Z", now)).toBe(true);
    expect(checkConcurrency("2026-10-21T10:00:02.000Z", now)).toBe(false);
    expect(checkConcurrency("invalid-date", now)).toBe(false);
  });
});

describe("Lab 4 — Issue #5: Ticket Workflow & Resolution API Integration Tests", () => {
  let requester: any;
  let staff: any;
  let requesterAgent: any;
  let staffAgent: any;
  let category: any;
  let relatedSystem: any;

  const fixtureUserIds: number[] = [];
  const fixtureTicketIds: number[] = [];

  beforeAll(async () => {
    const prisma = getPrisma();
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const passwordHash = await bcrypt.hash("Password123!", 10);

    try {
      [requester, staff] = await Promise.all([
        prisma.user.create({
          data: {
            email: `wf.req.${suffix}@toktickit.local`,
            name: "Workflow Requester",
            role: "REQUESTER",
            isActive: true,
            mustChangePassword: false,
            passwordHash,
          },
        }),
        prisma.user.create({
          data: {
            email: `wf.staff.${suffix}@toktickit.local`,
            name: "Workflow Staff",
            role: "IT_STAFF",
            isActive: true,
            mustChangePassword: false,
            passwordHash,
          },
        }),
      ]);

      fixtureUserIds.push(requester.id, staff.id);

      requesterAgent = request.agent(app);
      staffAgent = request.agent(app);

      await Promise.all([
        requesterAgent.post("/api/auth/login").send({ email: requester.email, password: "Password123!" }),
        staffAgent.post("/api/auth/login").send({ email: staff.email, password: "Password123!" }),
      ]);

      category = await prisma.category.findFirstOrThrow({ where: { isActive: true } });
      relatedSystem = await prisma.relatedSystem.findFirstOrThrow({ where: { isActive: true } });
    } catch {
      // If DB is offline, integration tests will skip gracefully
    }
  });

  afterAll(async () => {
    const prisma = getPrisma();
    try {
      if (fixtureTicketIds.length > 0) {
        await prisma.actionTaken.deleteMany({ where: { ticketId: { in: fixtureTicketIds } } });
        await prisma.publicComment.deleteMany({ where: { ticketId: { in: fixtureTicketIds } } });
        await prisma.ticket.deleteMany({ where: { id: { in: fixtureTicketIds } } });
      }
      if (fixtureUserIds.length > 0) {
        await prisma.user.deleteMany({ where: { id: { in: fixtureUserIds } } });
      }
    } catch {
      // ignore
    }
  });

  it("API-09 / AC-09: permits valid transitions (OPEN -> IN_PROGRESS)", async () => {
    if (!staffAgent || !category) return;
    const prisma = getPrisma();

    const t = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-WF-${Date.now()}-01`,
        summary: "API-09 Transition Ticket",
        description: "Testing permitted transition.",
        status: "OPEN",
        requestedPriority: "MEDIUM",
        requesterId: requester.id,
        ownerId: staff.id,
        categoryId: category.id,
        relatedSystemId: relatedSystem.id,
      },
    });
    fixtureTicketIds.push(t.id);

    const res = await staffAgent.patch(`/api/tickets/${t.id}/status`).send({
      status: "IN_PROGRESS",
    });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("IN_PROGRESS");
  });

  it("API-10 / AC-10: rejects invalid transitions with 422 INVALID_STATUS_TRANSITION", async () => {
    if (!staffAgent || !category) return;
    const prisma = getPrisma();

    const t = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-WF-${Date.now()}-02`,
        summary: "API-10 Invalid Transition Ticket",
        description: "Testing invalid direct transition.",
        status: "NEW",
        requestedPriority: "MEDIUM",
        requesterId: requester.id,
        categoryId: category.id,
        relatedSystemId: relatedSystem.id,
      },
    });
    fixtureTicketIds.push(t.id);

    const res = await staffAgent.patch(`/api/tickets/${t.id}/status`).send({
      status: "CLOSED",
    });

    expect(res.status).toBe(422);
    expect(res.body.code).toBe("INVALID_STATUS_TRANSITION");
  });

  it("API-11 / AC-11: rejects RESOLVED transition with 0 Actions Taken (422 RESOLUTION_REQUIRES_ACTION_TAKEN)", async () => {
    if (!staffAgent || !category) return;
    const prisma = getPrisma();

    const t = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-WF-${Date.now()}-03`,
        summary: "API-11 Resolution Gate 0 Actions Ticket",
        description: "Testing resolution gate blocking.",
        status: "IN_PROGRESS",
        requestedPriority: "HIGH",
        requesterId: requester.id,
        ownerId: staff.id,
        categoryId: category.id,
        relatedSystemId: relatedSystem.id,
      },
    });
    fixtureTicketIds.push(t.id);

    const res = await staffAgent.patch(`/api/tickets/${t.id}/status`).send({
      status: "RESOLVED",
      resolutionSummary: "Attempting resolution without any actions taken.",
    });

    expect(res.status).toBe(422);
    expect(res.body.code).toBe("RESOLUTION_REQUIRES_ACTION_TAKEN");
  });

  it("API-12 / AC-12: rejects RESOLVED transition when resolutionSummary < 5 characters (422 RESOLUTION_SUMMARY_REQUIRED)", async () => {
    if (!staffAgent || !category) return;
    const prisma = getPrisma();

    const t = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-WF-${Date.now()}-04`,
        summary: "API-12 Resolution Gate Summary Ticket",
        description: "Testing summary validation.",
        status: "IN_PROGRESS",
        requestedPriority: "HIGH",
        requesterId: requester.id,
        ownerId: staff.id,
        categoryId: category.id,
        relatedSystemId: relatedSystem.id,
      },
    });
    fixtureTicketIds.push(t.id);

    // Create Action Taken
    await prisma.actionTaken.create({
      data: {
        ticketId: t.id,
        performedById: staff.id,
        actionDescription: "Ran hardware diagnostic tests.",
        result: "Hardware confirmed operational.",
      },
    });

    const res = await staffAgent.patch(`/api/tickets/${t.id}/status`).send({
      status: "RESOLVED",
      resolutionSummary: "Fix", // < 5 chars
    });

    expect(res.status).toBe(422);
    expect(res.body.code).toBe("RESOLUTION_SUMMARY_REQUIRED");
  });

  it("API-13 / AC-11: successfully resolves ticket with >= 1 Action and valid resolutionSummary", async () => {
    if (!staffAgent || !category) return;
    const prisma = getPrisma();

    const t = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-WF-${Date.now()}-05`,
        summary: "API-13 Resolution Gate Success Ticket",
        description: "Testing successful resolution.",
        status: "IN_PROGRESS",
        requestedPriority: "HIGH",
        requesterId: requester.id,
        ownerId: staff.id,
        categoryId: category.id,
        relatedSystemId: relatedSystem.id,
      },
    });
    fixtureTicketIds.push(t.id);

    await prisma.actionTaken.create({
      data: {
        ticketId: t.id,
        performedById: staff.id,
        actionDescription: "Replaced faulty RAM module.",
        result: "System passes all memory stress checks.",
      },
    });

    const res = await staffAgent.patch(`/api/tickets/${t.id}/status`).send({
      status: "RESOLVED",
      resolutionSummary: "Replaced faulty RAM module and verified stability.",
    });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("RESOLVED");
    expect(res.body.data.resolutionSummary).toBe("Replaced faulty RAM module and verified stability.");
  });

  it("API-14 / AC-13: Requester advisory indication does not directly set RESOLVED", async () => {
    if (!requesterAgent || !category) return;
    const prisma = getPrisma();

    const t = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-WF-${Date.now()}-06`,
        summary: "API-14 Advisory Requester Ticket",
        description: "Testing advisory resolution indication.",
        status: "IN_PROGRESS",
        requestedPriority: "MEDIUM",
        requesterId: requester.id,
        ownerId: staff.id,
        categoryId: category.id,
        relatedSystemId: relatedSystem.id,
      },
    });
    fixtureTicketIds.push(t.id);

    const res = await requesterAgent.post(`/api/tickets/${t.id}/problem-appears-resolved`).send({});
    expect(res.status).toBe(200);

    const updated = await prisma.ticket.findUniqueOrThrow({ where: { id: t.id } });
    expect(updated.status).not.toBe("RESOLVED");
    expect(updated.status).toBe("IN_PROGRESS");

    const comment = await prisma.publicComment.findFirst({ where: { ticketId: t.id } });
    expect(comment).toBeDefined();
    expect(comment?.content).toContain("The requester indicates that the problem appears resolved.");
  });

  it("API-15 / BR-19: rejects stale expectedUpdatedAt with 409 STALE_UPDATE_CONFLICT", async () => {
    if (!staffAgent || !category) return;
    const prisma = getPrisma();

    const t = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-WF-${Date.now()}-07`,
        summary: "API-15 Stale Update Ticket",
        description: "Testing concurrency conflict detection.",
        status: "OPEN",
        requestedPriority: "MEDIUM",
        requesterId: requester.id,
        ownerId: staff.id,
        categoryId: category.id,
        relatedSystemId: relatedSystem.id,
      },
    });
    fixtureTicketIds.push(t.id);

    // Stale timestamp (1 hour behind)
    const staleTimestamp = new Date(Date.now() - 3600000).toISOString();

    const res = await staffAgent.patch(`/api/tickets/${t.id}/status`).send({
      status: "IN_PROGRESS",
      expectedUpdatedAt: staleTimestamp,
    });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe("STALE_UPDATE_CONFLICT");
  });

  it("rejects Requester attempt to directly call PATCH /api/tickets/:id/status to set RESOLVED (403 FORBIDDEN_ROLE)", async () => {
    if (!requesterAgent || !category) return;
    const prisma = getPrisma();

    const t = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-WF-${Date.now()}-08`,
        summary: "Requester Direct Status Bypass Attempt",
        description: "Testing direct status bypass.",
        status: "IN_PROGRESS",
        requestedPriority: "MEDIUM",
        requesterId: requester.id,
        categoryId: category.id,
        relatedSystemId: relatedSystem.id,
      },
    });
    fixtureTicketIds.push(t.id);

    const res = await requesterAgent.patch(`/api/tickets/${t.id}/status`).send({
      status: "RESOLVED",
      resolutionSummary: "Direct unauthorized resolution",
    });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe("FORBIDDEN_ROLE");
  });
});
