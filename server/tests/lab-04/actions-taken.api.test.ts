import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

/**
 * Lab 4 — Issue #2: Actions Taken Database and API Foundation Tests
 *
 * Traceability Matrix:
 *   UT-01  / BR-05  — Follow-up note validator
 *   API-01 / AC-01  — POST /api/tickets/:id/actions (Valid data, sets performedById)
 *   API-02 / AC-02  — POST /api/tickets/:id/actions (Missing follow-up note rejection)
 *   API-03 / AC-03  — POST /api/tickets/:id/actions with attachment notes
 *   API-04 / AC-04  — PATCH /api/actions/:id (Valid update)
 *   API-05 / AC-05  — PATCH /api/actions/:id (Update follow-up missing note rejection)
 *   API-06 / AC-06  — GET /api/tickets/:id/actions (Requester view owned ticket actions)
 *   API-07 / AC-07  — POST /api/tickets/:id/actions (Requester attempt returns 403)
 *   API-08 / AC-08  — Action performer differs from Ticket Owner
 *   API-15 / AC-14  — PATCH /api/actions/:id with stale expectedUpdatedAt returns 409 Conflict
 *   Additional edge cases:
 *     - Inactive IT staff rejected
 *     - Closed ticket rejects action creation (422 TICKET_CLOSED)
 *     - Missing ticket returns 404
 *     - Missing action returns 404
 *     - Other requester cannot view actions for unowned ticket (403)
 */
describe("Lab 4 — Issue #2: Actions Taken Database and API Foundation", () => {
  let requester: any;
  let otherRequester: any;
  let staff1: any;
  let staff2: any;
  let admin: any;
  let inactiveStaff: any;

  let requesterAgent: any;
  let otherRequesterAgent: any;
  let staff1Agent: any;
  let staff2Agent: any;
  let adminAgent: any;
  let inactiveStaffAgent: any;

  let category: any;
  let relatedSystem: any;
  let ticket: any;
  let closedTicket: any;

  const fixtureUserIds: number[] = [];
  const fixtureTicketIds: number[] = [];

  beforeAll(async () => {
    const prisma = getPrisma();
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const passwordHash = await bcrypt.hash("Password123!", 10);

    // Create test fixtures
    [requester, otherRequester, staff1, staff2, admin, inactiveStaff] = await Promise.all([
      prisma.user.create({
        data: {
          email: `act.requester.${suffix}@toktickit.local`,
          name: "Action Requester",
          role: "REQUESTER",
          isActive: true,
          mustChangePassword: false,
          passwordHash,
        },
      }),
      prisma.user.create({
        data: {
          email: `act.other.req.${suffix}@toktickit.local`,
          name: "Other Action Requester",
          role: "REQUESTER",
          isActive: true,
          mustChangePassword: false,
          passwordHash,
        },
      }),
      prisma.user.create({
        data: {
          email: `act.staff1.${suffix}@toktickit.local`,
          name: "Action Staff One",
          role: "IT_STAFF",
          isActive: true,
          mustChangePassword: false,
          passwordHash,
        },
      }),
      prisma.user.create({
        data: {
          email: `act.staff2.${suffix}@toktickit.local`,
          name: "Action Staff Two",
          role: "IT_STAFF",
          isActive: true,
          mustChangePassword: false,
          passwordHash,
        },
      }),
      prisma.user.create({
        data: {
          email: `act.admin.${suffix}@toktickit.local`,
          name: "Action Administrator",
          role: "ADMINISTRATOR",
          isActive: true,
          mustChangePassword: false,
          passwordHash,
        },
      }),
      prisma.user.create({
        data: {
          email: `act.inactive.staff.${suffix}@toktickit.local`,
          name: "Inactive Staff",
          role: "IT_STAFF",
          isActive: false,
          mustChangePassword: false,
          passwordHash,
        },
      }),
    ]);

    fixtureUserIds.push(
      requester.id,
      otherRequester.id,
      staff1.id,
      staff2.id,
      admin.id,
      inactiveStaff.id
    );

    // Create agents & login
    requesterAgent = request.agent(app);
    otherRequesterAgent = request.agent(app);
    staff1Agent = request.agent(app);
    staff2Agent = request.agent(app);
    adminAgent = request.agent(app);
    inactiveStaffAgent = request.agent(app);

    const loginResponses = await Promise.all([
      requesterAgent.post("/api/auth/login").send({ email: requester.email, password: "Password123!" }),
      otherRequesterAgent.post("/api/auth/login").send({ email: otherRequester.email, password: "Password123!" }),
      staff1Agent.post("/api/auth/login").send({ email: staff1.email, password: "Password123!" }),
      staff2Agent.post("/api/auth/login").send({ email: staff2.email, password: "Password123!" }),
      adminAgent.post("/api/auth/login").send({ email: admin.email, password: "Password123!" }),
      // Inactive user login returns 401 ACCOUNT_INACTIVE
      inactiveStaffAgent.post("/api/auth/login").send({ email: inactiveStaff.email, password: "Password123!" }),
    ]);

    expect(loginResponses[0].status).toBe(200);
    expect(loginResponses[1].status).toBe(200);
    expect(loginResponses[2].status).toBe(200);
    expect(loginResponses[3].status).toBe(200);
    expect(loginResponses[4].status).toBe(200);
    expect(loginResponses[5].status).toBe(401);

    category = await prisma.category.findFirstOrThrow({ where: { isActive: true } });
    relatedSystem = await prisma.relatedSystem.findFirstOrThrow({ where: { isActive: true } });

    // Ticket owned by staff1, requested by requester
    ticket = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-ACT-${suffix}-01`,
        requesterId: requester.id,
        ownerId: staff1.id,
        categoryId: category.id,
        relatedSystemId: relatedSystem.id,
        summary: "Actions Taken Test Ticket",
        description: "Testing actions taken model and API endpoints.",
        status: "IN_PROGRESS",
      },
    });
    fixtureTicketIds.push(ticket.id);

    // Closed ticket
    closedTicket = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-ACT-${suffix}-02`,
        requesterId: requester.id,
        ownerId: staff1.id,
        categoryId: category.id,
        relatedSystemId: relatedSystem.id,
        summary: "Closed Test Ticket",
        description: "Testing rejection on closed tickets.",
        status: "CLOSED",
      },
    });
    fixtureTicketIds.push(closedTicket.id);
  });

  afterAll(async () => {
    const prisma = getPrisma();
    if (fixtureTicketIds.length > 0) {
      await prisma.actionTaken.deleteMany({ where: { ticketId: { in: fixtureTicketIds } } });
      await prisma.ticket.deleteMany({ where: { id: { in: fixtureTicketIds } } });
    }
    if (fixtureUserIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: fixtureUserIds } } });
    }
  });

  describe("API-01 / AC-01: Create Action Taken (POST /api/tickets/:id/actions)", () => {
    it("creates an Action Taken record with performedById stamped from authenticated IT Staff", async () => {
      const payload = {
        actionDateTime: new Date().toISOString(),
        actionDescription: "Inspected power delivery unit and thermal heatsink.",
        result: "Heatsink was clogged with dust; thermal paste re-applied.",
        isFollowUpRequired: false,
      };

      const res = await staff1Agent.post(`/api/tickets/${ticket.id}/actions`).send(payload);

      expect(res.status).toBe(201);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.ticketId).toBe(ticket.id);
      expect(res.body.data.performedById).toBe(staff1.id);
      expect(res.body.data.performedBy.id).toBe(staff1.id);
      expect(res.body.data.performedBy.name).toBe("Action Staff One");
      expect(res.body.data.actionDescription).toBe(payload.actionDescription);
      expect(res.body.data.result).toBe(payload.result);
      expect(res.body.data.isFollowUpRequired).toBe(false);
      expect(res.body.data.followUpNote).toBeNull();
    });

    it("creates an Action Taken by Administrator", async () => {
      const payload = {
        actionDescription: "Admin reviewed system audit log and cleared hardware warning flag.",
        result: "Warning cleared successfully.",
        isFollowUpRequired: false,
      };

      const res = await adminAgent.post(`/api/tickets/${ticket.id}/actions`).send(payload);

      expect(res.status).toBe(201);
      expect(res.body.data.performedById).toBe(admin.id);
      expect(res.body.data.performedBy.role).toBe("ADMINISTRATOR");
    });

    it("ignores client attempts to spoof performedById and uses session identity (BR-03)", async () => {
      const payload = {
        performedById: 999999, // Attempted spoof
        actionDescription: "Ran memory diagnostics test suite 86+.",
        result: "Zero memory errors detected after 2 passes.",
        isFollowUpRequired: false,
      };

      const res = await staff1Agent.post(`/api/tickets/${ticket.id}/actions`).send(payload);

      expect(res.status).toBe(201);
      expect(res.body.data.performedById).toBe(staff1.id);
      expect(res.body.data.performedById).not.toBe(999999);
    });
  });

  describe("API-02 / AC-02 & UT-01 / BR-05: Follow-Up Validation", () => {
    it("rejects creation when isFollowUpRequired is true but followUpNote is missing", async () => {
      const payload = {
        actionDescription: "Replaced faulty fan assembly.",
        result: "Fan spinning at normal RPM.",
        isFollowUpRequired: true,
        // followUpNote missing
      };

      const res = await staff1Agent.post(`/api/tickets/${ticket.id}/actions`).send(payload);

      expect(res.status).toBe(400);
      expect(res.body.code).toBe("FOLLOW_UP_NOTE_REQUIRED");
      expect(res.body.error).toContain("Follow-up note is required");
    });

    it("rejects creation when isFollowUpRequired is true but followUpNote is too short (<3 chars)", async () => {
      const payload = {
        actionDescription: "Replaced faulty fan assembly.",
        result: "Fan spinning at normal RPM.",
        isFollowUpRequired: true,
        followUpNote: "ok", // only 2 chars
      };

      const res = await staff1Agent.post(`/api/tickets/${ticket.id}/actions`).send(payload);

      expect(res.status).toBe(400);
      expect(res.body.code).toBe("FOLLOW_UP_NOTE_REQUIRED");
    });

    it("succeeds when isFollowUpRequired is true and followUpNote is valid (>= 3 chars)", async () => {
      const payload = {
        actionDescription: "Installed firmware patch v2.4.1.",
        result: "Patch applied; reboot confirmed.",
        isFollowUpRequired: true,
        followUpNote: "Check telemetry logs tomorrow morning.",
      };

      const res = await staff1Agent.post(`/api/tickets/${ticket.id}/actions`).send(payload);

      expect(res.status).toBe(201);
      expect(res.body.data.isFollowUpRequired).toBe(true);
      expect(res.body.data.followUpNote).toBe(payload.followUpNote);
    });

    it("clears followUpNote to null if isFollowUpRequired is false", async () => {
      const payload = {
        actionDescription: "Verified BIOS settings are set to defaults.",
        result: "Defaults applied properly.",
        isFollowUpRequired: false,
        followUpNote: "This should not be saved",
      };

      const res = await staff1Agent.post(`/api/tickets/${ticket.id}/actions`).send(payload);

      // Either 400 or sanitized to null depending on validator rule
      if (res.status === 201) {
        expect(res.body.data.followUpNote).toBeNull();
      } else {
        expect(res.status).toBe(400);
      }
    });
  });

  describe("API-03 / AC-03: Attachment Notes Storage", () => {
    it("persists attachmentNotes string accurately up to 500 characters", async () => {
      const payload = {
        actionDescription: "Captured memory dump and network trace during crash.",
        result: "Memory dump reveals BSOD caused by driver igdkmd64.sys.",
        isFollowUpRequired: false,
        attachmentNotes: "Hardware asset tag #99481; memory dump saved on NAS at /diag/crash-2026.dmp",
      };

      const res = await staff1Agent.post(`/api/tickets/${ticket.id}/actions`).send(payload);

      expect(res.status).toBe(201);
      expect(res.body.data.attachmentNotes).toBe(payload.attachmentNotes);
    });

    it("rejects attachmentNotes exceeding 500 characters", async () => {
      const payload = {
        actionDescription: "Captured diagnostic information.",
        result: "Complete diagnostics stored.",
        isFollowUpRequired: false,
        attachmentNotes: "A".repeat(501),
      };

      const res = await staff1Agent.post(`/api/tickets/${ticket.id}/actions`).send(payload);

      expect(res.status).toBe(400);
    });
  });

  describe("API-08 / AC-08: Separation of Ticket Owner vs. Action Performer", () => {
    it("allows Tech 2 to record an Action Taken on a Ticket owned by Tech 1 without altering ownerId", async () => {
      // ticket.ownerId is staff1.id
      expect(ticket.ownerId).toBe(staff1.id);

      const payload = {
        actionDescription: "Assisted primary technician with bench multimeter voltage test.",
        result: "Power supply rail 12V verified stable within 1.5% tolerance.",
        isFollowUpRequired: false,
      };

      const res = await staff2Agent.post(`/api/tickets/${ticket.id}/actions`).send(payload);

      expect(res.status).toBe(201);
      expect(res.body.data.performedById).toBe(staff2.id);
      expect(res.body.data.performedBy.id).toBe(staff2.id);

      // Verify Ticket owner remains staff1 in DB
      const prisma = getPrisma();
      const freshTicket = await prisma.ticket.findUnique({ where: { id: ticket.id } });
      expect(freshTicket?.ownerId).toBe(staff1.id);
    });
  });

  describe("API-06 & API-07 / AC-06 & AC-07: Authorization & Visibility", () => {
    it("allows Requester to view Actions Taken on their owned ticket (GET /api/tickets/:id/actions)", async () => {
      const res = await requesterAgent.get(`/api/tickets/${ticket.id}/actions`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      // Verify actions belong to this ticket
      expect(res.body.data.every((a: any) => a.ticketId === ticket.id)).toBe(true);
    });

    it("prohibits Requester from creating an Action Taken (POST /api/tickets/:id/actions) with 403 Forbidden", async () => {
      const payload = {
        actionDescription: "Requester attempt to log an action.",
        result: "Should not succeed.",
        isFollowUpRequired: false,
      };

      const res = await requesterAgent.post(`/api/tickets/${ticket.id}/actions`).send(payload);

      expect(res.status).toBe(403);
      expect(res.body.code).toBe("FORBIDDEN");
    });

    it("prohibits Requester from updating an Action Taken (PATCH /api/actions/:id) with 403 Forbidden", async () => {
      // Find an action
      const prisma = getPrisma();
      const existing = await prisma.actionTaken.findFirst({ where: { ticketId: ticket.id } });
      expect(existing).toBeDefined();

      const res = await requesterAgent.patch(`/api/actions/${existing!.id}`).send({
        actionDescription: "Requester tampering attempt.",
      });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe("FORBIDDEN");
    });

    it("prevents other requesters from viewing actions on tickets they do not own (403)", async () => {
      const res = await otherRequesterAgent.get(`/api/tickets/${ticket.id}/actions`);

      expect(res.status).toBe(403);
      expect(res.body.code).toBe("FORBIDDEN_TICKET_ACCESS");
    });

    it("rejects unauthenticated requests with 401 Unauthorized", async () => {
      const unauth = request(app);

      const getRes = await unauth.get(`/api/tickets/${ticket.id}/actions`);
      expect(getRes.status).toBe(401);

      const postRes = await unauth.post(`/api/tickets/${ticket.id}/actions`).send({
        actionDescription: "Valid description here",
        result: "Valid result",
      });
      expect(postRes.status).toBe(401);
    });
  });

  describe("API-04 & API-05 / AC-04 & AC-05: Update Action Taken (PATCH /api/actions/:id)", () => {
    let actionToUpdate: any;

    beforeAll(async () => {
      const prisma = getPrisma();
      actionToUpdate = await prisma.actionTaken.create({
        data: {
          ticketId: ticket.id,
          performedById: staff1.id,
          actionDescription: "Initial description before update.",
          result: "Initial result before update.",
          isFollowUpRequired: false,
        },
      });
    });

    it("successfully updates description and result by IT Staff", async () => {
      const payload = {
        actionDescription: "Updated description with additional technical context.",
        result: "Updated result confirming stability.",
      };

      const res = await staff1Agent.patch(`/api/actions/${actionToUpdate.id}`).send(payload);

      expect(res.status).toBe(200);
      expect(res.body.data.actionDescription).toBe(payload.actionDescription);
      expect(res.body.data.result).toBe(payload.result);
    });

    it("rejects update when setting isFollowUpRequired=true without a valid followUpNote (API-05 / AC-05)", async () => {
      const payload = {
        isFollowUpRequired: true,
        followUpNote: "", // empty
      };

      const res = await staff1Agent.patch(`/api/actions/${actionToUpdate.id}`).send(payload);

      expect(res.status).toBe(400);
      expect(res.body.code).toBe("FOLLOW_UP_NOTE_REQUIRED");
    });

    it("successfully updates follow-up flag and note when valid", async () => {
      const payload = {
        isFollowUpRequired: true,
        followUpNote: "Follow up with vendor about warranty claim.",
      };

      const res = await staff1Agent.patch(`/api/actions/${actionToUpdate.id}`).send(payload);

      expect(res.status).toBe(200);
      expect(res.body.data.isFollowUpRequired).toBe(true);
      expect(res.body.data.followUpNote).toBe(payload.followUpNote);
    });

    it("returns 404 Not Found for non-existent action ID", async () => {
      const res = await staff1Agent.patch("/api/actions/999999").send({
        actionDescription: "Non-existent update",
      });

      expect(res.status).toBe(404);
      expect(res.body.code).toBe("ACTION_NOT_FOUND");
    });
  });

  describe("API-15 / AC-14: Optimistic Concurrency & Stale Update Detection", () => {
    it("returns 409 Conflict with STALE_UPDATE_CONFLICT when expectedUpdatedAt does not match DB", async () => {
      const prisma = getPrisma();
      const freshAction = await prisma.actionTaken.create({
        data: {
          ticketId: ticket.id,
          performedById: staff1.id,
          actionDescription: "Concurrency test action item.",
          result: "Testing timestamp conflict checks.",
          isFollowUpRequired: false,
        },
      });

      const staleTimestamp = new Date(freshAction.updatedAt.getTime() - 60000).toISOString();

      const res = await staff1Agent.patch(`/api/actions/${freshAction.id}`).send({
        actionDescription: "Attempted stale update on action.",
        expectedUpdatedAt: staleTimestamp,
      });

      expect(res.status).toBe(409);
      expect(res.body.code).toBe("STALE_UPDATE_CONFLICT");
    });

    it("accepts update when expectedUpdatedAt matches DB timestamp", async () => {
      const prisma = getPrisma();
      const freshAction = await prisma.actionTaken.create({
        data: {
          ticketId: ticket.id,
          performedById: staff1.id,
          actionDescription: "Timestamp match test action item.",
          result: "Testing matching timestamp.",
          isFollowUpRequired: false,
        },
      });

      const res = await staff1Agent.patch(`/api/actions/${freshAction.id}`).send({
        actionDescription: "Update with correct timestamp matching DB.",
        expectedUpdatedAt: freshAction.updatedAt.toISOString(),
      });

      expect(res.status).toBe(200);
      expect(res.body.data.actionDescription).toBe("Update with correct timestamp matching DB.");
    });
  });

  describe("Edge cases & Business Constraints", () => {
    it("rejects creating actions on a CLOSED ticket (BR-13) with 422 TICKET_CLOSED", async () => {
      const payload = {
        actionDescription: "Attempting to perform action on closed ticket.",
        result: "Should be rejected.",
        isFollowUpRequired: false,
      };

      const res = await staff1Agent.post(`/api/tickets/${closedTicket.id}/actions`).send(payload);

      expect(res.status).toBe(422);
      expect(res.body.code).toBe("TICKET_CLOSED");
    });

    it("rejects future actionDateTime greater than 5 minutes ahead (BR-07)", async () => {
      const futureTime = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      const payload = {
        actionDateTime: futureTime,
        actionDescription: "Action with future timestamp.",
        result: "Should fail validation.",
        isFollowUpRequired: false,
      };

      const res = await staff1Agent.post(`/api/tickets/${ticket.id}/actions`).send(payload);

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("future");
    });

    it("returns 404 when creating action for non-existent ticket", async () => {
      const res = await staff1Agent.post("/api/tickets/999999/actions").send({
        actionDescription: "Valid action description.",
        result: "Valid action result.",
        isFollowUpRequired: false,
      });

      expect(res.status).toBe(404);
      expect(res.body.code).toBe("TICKET_NOT_FOUND");
    });

    it("returns single action with GET /api/actions/:id", async () => {
      const prisma = getPrisma();
      const action = await prisma.actionTaken.create({
        data: {
          ticketId: ticket.id,
          performedById: staff1.id,
          actionDescription: "Single action lookup test.",
          result: "Successfully retrieved.",
          isFollowUpRequired: false,
        },
      });

      const res = await staff1Agent.get(`/api/actions/${action.id}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(action.id);
      expect(res.body.data.performedBy).toBeDefined();
    });
  });
});
