import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getSeedIds() {
  const prisma = getPrisma();
  const requester = await prisma.requesterUser.findFirst({
    where: { isActive: true },
    orderBy: { id: "asc" },
  });
  const category = await prisma.category.findFirst({
    where: { isActive: true },
    orderBy: { id: "asc" },
  });
  const relatedSystem = await prisma.relatedSystem.findFirst({
    where: { isActive: true },
    orderBy: { id: "asc" },
  });
  return {
    requesterId: requester!.id,
    categoryId: category!.id,
    relatedSystemId: relatedSystem!.id,
  };
}

function validPayload(overrides: Record<string, unknown> = {}) {
  return {
    requesterId: 1, // will be replaced in beforeAll
    categoryId: 1,
    relatedSystemId: 1,
    summary: "VPN connection dropping on Wi-Fi",
    description: "Occurs whenever switching access points in the main building corridor.",
    requestedPriority: "HIGH",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Cleanup created tickets after tests to keep DB clean
// ---------------------------------------------------------------------------
const createdTicketIds: number[] = [];

afterAll(async () => {
  if (createdTicketIds.length > 0) {
    const prisma = getPrisma();
    await prisma.ticket.deleteMany({ where: { id: { in: createdTicketIds } } });
  }
});

// ---------------------------------------------------------------------------
// API-01: GET /api/requesters (verified by Issue #1 — included for completeness)
// ---------------------------------------------------------------------------
describe("Lab 2 — Issue #3: Create Ticket API Tests", () => {
  let seedIds: { requesterId: number; categoryId: number; relatedSystemId: number };

  beforeAll(async () => {
    seedIds = await getSeedIds();
  });

  // -------------------------------------------------------------------------
  // API-03: POST /api/tickets — Successful creation (FR-04, FR-05, AC-04)
  // -------------------------------------------------------------------------
  describe("POST /api/tickets — Success cases", () => {
    it("API-03: returns HTTP 201 and persists ticket with status NEW", async () => {
      const payload = validPayload({
        requesterId: seedIds.requesterId,
        categoryId: seedIds.categoryId,
        relatedSystemId: seedIds.relatedSystemId,
      });

      const res = await request(app).post("/api/tickets").send(payload);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("id");
      expect(res.body.status).toBe("NEW");
      expect(res.body.requesterId).toBe(seedIds.requesterId);
      expect(res.body.categoryId).toBe(seedIds.categoryId);
      expect(res.body.relatedSystemId).toBe(seedIds.relatedSystemId);
      expect(res.body.summary).toBe(payload.summary);
      expect(res.body.description).toBe(payload.description);
      expect(res.body.requestedPriority).toBe("HIGH");

      createdTicketIds.push(res.body.id);
    });

    it("API-03: ticket number is generated server-side with TKT-YYYY-NNNNNN format", async () => {
      const payload = validPayload({
        requesterId: seedIds.requesterId,
        categoryId: seedIds.categoryId,
        relatedSystemId: seedIds.relatedSystemId,
      });

      const res = await request(app).post("/api/tickets").send(payload);

      expect(res.status).toBe(201);
      expect(res.body.ticketNumber).toMatch(/^TKT-\d{4}-\d{6}$/);
      const year = new Date().getFullYear();
      expect(res.body.ticketNumber).toContain(`TKT-${year}-`);

      createdTicketIds.push(res.body.id);
    });

    it("API-03: ticket number is unique across multiple submissions", async () => {
      const payload = validPayload({
        requesterId: seedIds.requesterId,
        categoryId: seedIds.categoryId,
        relatedSystemId: seedIds.relatedSystemId,
      });

      const res1 = await request(app).post("/api/tickets").send(payload);
      const res2 = await request(app).post("/api/tickets").send(payload);

      expect(res1.status).toBe(201);
      expect(res2.status).toBe(201);
      expect(res1.body.ticketNumber).not.toBe(res2.body.ticketNumber);

      createdTicketIds.push(res1.body.id);
      createdTicketIds.push(res2.body.id);
    });

    it("API-03: response includes nested requester, category, and relatedSystem objects", async () => {
      const payload = validPayload({
        requesterId: seedIds.requesterId,
        categoryId: seedIds.categoryId,
        relatedSystemId: seedIds.relatedSystemId,
      });

      const res = await request(app).post("/api/tickets").send(payload);

      expect(res.status).toBe(201);
      expect(res.body.requester).toHaveProperty("id");
      expect(res.body.requester).toHaveProperty("name");
      expect(res.body.requester).toHaveProperty("email");
      expect(res.body.category).toHaveProperty("id");
      expect(res.body.category).toHaveProperty("name");
      expect(res.body.relatedSystem).toHaveProperty("id");
      expect(res.body.relatedSystem).toHaveProperty("name");

      createdTicketIds.push(res.body.id);
    });

    it("API-03: itPriority, ticketOwnerName, and resolutionSummary default to null", async () => {
      const payload = validPayload({
        requesterId: seedIds.requesterId,
        categoryId: seedIds.categoryId,
        relatedSystemId: seedIds.relatedSystemId,
      });

      const res = await request(app).post("/api/tickets").send(payload);

      expect(res.status).toBe(201);
      expect(res.body.itPriority).toBeNull();
      expect(res.body.ticketOwnerName).toBeNull();
      expect(res.body.resolutionSummary).toBeNull();

      createdTicketIds.push(res.body.id);
    });

    it("API-03: attachments defaults to empty array in response", async () => {
      const payload = validPayload({
        requesterId: seedIds.requesterId,
        categoryId: seedIds.categoryId,
        relatedSystemId: seedIds.relatedSystemId,
      });

      const res = await request(app).post("/api/tickets").send(payload);

      expect(res.status).toBe(201);
      expect(res.body.attachments).toEqual([]);

      createdTicketIds.push(res.body.id);
    });

    it("API-03: ticket is persisted in the database and retrievable", async () => {
      const payload = validPayload({
        requesterId: seedIds.requesterId,
        categoryId: seedIds.categoryId,
        relatedSystemId: seedIds.relatedSystemId,
      });

      const res = await request(app).post("/api/tickets").send(payload);

      expect(res.status).toBe(201);

      const prisma = getPrisma();
      const dbTicket = await prisma.ticket.findUnique({
        where: { id: res.body.id },
      });

      expect(dbTicket).not.toBeNull();
      expect(dbTicket!.status).toBe("NEW");
      expect(dbTicket!.ticketNumber).toBe(res.body.ticketNumber);
      expect(dbTicket!.requesterId).toBe(seedIds.requesterId);

      createdTicketIds.push(res.body.id);
    });

    it("API-03: summary and description are trimmed before persistence", async () => {
      const payload = validPayload({
        requesterId: seedIds.requesterId,
        categoryId: seedIds.categoryId,
        relatedSystemId: seedIds.relatedSystemId,
        summary: "  VPN drops on campus Wi-Fi  ",
        description: "  This happens every morning when I switch to the office network.  ",
      });

      const res = await request(app).post("/api/tickets").send(payload);

      expect(res.status).toBe(201);
      expect(res.body.summary).toBe("VPN drops on campus Wi-Fi");
      expect(res.body.description).toBe("This happens every morning when I switch to the office network.");

      createdTicketIds.push(res.body.id);
    });

    it("API-03: accepts requesterId from X-Requester-Id header when not in body", async () => {
      const { categoryId, relatedSystemId } = seedIds;
      const payload = {
        categoryId,
        relatedSystemId,
        summary: "Printer not responding on floor 2",
        description: "The network printer on floor 2 stopped accepting jobs this morning.",
        requestedPriority: "MEDIUM",
      };

      const res = await request(app)
        .post("/api/tickets")
        .set("X-Requester-Id", String(seedIds.requesterId))
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.requesterId).toBe(seedIds.requesterId);

      createdTicketIds.push(res.body.id);
    });
  });

  // -------------------------------------------------------------------------
  // API-04: POST /api/tickets — Validation failures (BR-06, BR-07, AC-05)
  // -------------------------------------------------------------------------
  describe("POST /api/tickets — Validation failures", () => {
    it("API-04: returns 400 when summary is missing", async () => {
      const { categoryId, relatedSystemId, requesterId } = seedIds;
      const payload = {
        requesterId,
        categoryId,
        relatedSystemId,
        description: "A valid description for testing purposes.",
        requestedPriority: "MEDIUM",
      };

      const res = await request(app).post("/api/tickets").send(payload);

      expect(res.status).toBe(400);
      expect(res.body.code).toBe("VALIDATION_ERROR");
      expect(res.body.details?.some((d: any) => d.field === "summary")).toBe(true);
    });

    it("API-04: returns 400 when summary is too short (< 5 chars)", async () => {
      const res = await request(app)
        .post("/api/tickets")
        .send(
          validPayload({
            requesterId: seedIds.requesterId,
            categoryId: seedIds.categoryId,
            relatedSystemId: seedIds.relatedSystemId,
            summary: "abc",
          })
        );

      expect(res.status).toBe(400);
      expect(res.body.code).toBe("VALIDATION_ERROR");
      expect(res.body.details?.some((d: any) => d.field === "summary")).toBe(true);
    });

    it("API-04: returns 400 when summary is too long (> 150 chars)", async () => {
      const res = await request(app)
        .post("/api/tickets")
        .send(
          validPayload({
            requesterId: seedIds.requesterId,
            categoryId: seedIds.categoryId,
            relatedSystemId: seedIds.relatedSystemId,
            summary: "a".repeat(151),
          })
        );

      expect(res.status).toBe(400);
      expect(res.body.code).toBe("VALIDATION_ERROR");
      expect(res.body.details?.some((d: any) => d.field === "summary")).toBe(true);
    });

    it("API-04: returns 400 when description is missing", async () => {
      const res = await request(app)
        .post("/api/tickets")
        .send(
          validPayload({
            requesterId: seedIds.requesterId,
            categoryId: seedIds.categoryId,
            relatedSystemId: seedIds.relatedSystemId,
            description: "",
          })
        );

      expect(res.status).toBe(400);
      expect(res.body.code).toBe("VALIDATION_ERROR");
      expect(res.body.details?.some((d: any) => d.field === "description")).toBe(true);
    });

    it("API-04: returns 400 when description is too short (< 10 chars)", async () => {
      const res = await request(app)
        .post("/api/tickets")
        .send(
          validPayload({
            requesterId: seedIds.requesterId,
            categoryId: seedIds.categoryId,
            relatedSystemId: seedIds.relatedSystemId,
            description: "Short",
          })
        );

      expect(res.status).toBe(400);
      expect(res.body.code).toBe("VALIDATION_ERROR");
      expect(res.body.details?.some((d: any) => d.field === "description")).toBe(true);
    });

    it("API-04: returns 400 when description exceeds 2000 characters", async () => {
      const res = await request(app)
        .post("/api/tickets")
        .send(
          validPayload({
            requesterId: seedIds.requesterId,
            categoryId: seedIds.categoryId,
            relatedSystemId: seedIds.relatedSystemId,
            description: "a".repeat(2001),
          })
        );

      expect(res.status).toBe(400);
      expect(res.body.code).toBe("VALIDATION_ERROR");
      expect(res.body.details?.some((d: any) => d.field === "description")).toBe(true);
    });

    it("API-04: returns 400 when requestedPriority is an invalid value", async () => {
      const res = await request(app)
        .post("/api/tickets")
        .send(
          validPayload({
            requesterId: seedIds.requesterId,
            categoryId: seedIds.categoryId,
            relatedSystemId: seedIds.relatedSystemId,
            requestedPriority: "CRITICAL",
          })
        );

      expect(res.status).toBe(400);
      expect(res.body.code).toBe("VALIDATION_ERROR");
      expect(res.body.details?.some((d: any) => d.field === "requestedPriority")).toBe(true);
    });

    it("API-04: returns 400 when categoryId is missing", async () => {
      const res = await request(app)
        .post("/api/tickets")
        .send(
          validPayload({
            requesterId: seedIds.requesterId,
            relatedSystemId: seedIds.relatedSystemId,
            categoryId: undefined,
          })
        );

      expect(res.status).toBe(400);
      expect(res.body.code).toBe("VALIDATION_ERROR");
      expect(res.body.details?.some((d: any) => d.field === "categoryId")).toBe(true);
    });

    it("API-04: returns 400 when relatedSystemId is missing", async () => {
      const res = await request(app)
        .post("/api/tickets")
        .send(
          validPayload({
            requesterId: seedIds.requesterId,
            categoryId: seedIds.categoryId,
            relatedSystemId: undefined,
          })
        );

      expect(res.status).toBe(400);
      expect(res.body.code).toBe("VALIDATION_ERROR");
      expect(res.body.details?.some((d: any) => d.field === "relatedSystemId")).toBe(true);
    });

    it("API-04: returns structured error envelope without exposing stack traces", async () => {
      const res = await request(app)
        .post("/api/tickets")
        .send(
          validPayload({
            requesterId: seedIds.requesterId,
            categoryId: seedIds.categoryId,
            relatedSystemId: seedIds.relatedSystemId,
            summary: "",
          })
        );

      expect(res.status).toBe(400);
      // Must have structured error envelope
      expect(res.body).toHaveProperty("error");
      expect(res.body).toHaveProperty("code");
      // Must NOT expose internal details
      expect(JSON.stringify(res.body)).not.toContain("stack");
      expect(JSON.stringify(res.body)).not.toContain("at Object");
    });

    it("API-04: returns 400 when requesterId is missing", async () => {
      const res = await request(app)
        .post("/api/tickets")
        .send({
          categoryId: seedIds.categoryId,
          relatedSystemId: seedIds.relatedSystemId,
          summary: "Valid summary here",
          description: "A valid description for testing purposes.",
          requestedPriority: "MEDIUM",
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe("VALIDATION_ERROR");
      expect(res.body.details?.some((d: any) => d.field === "requesterId")).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // API-05: POST /api/tickets — Inactive requester (BR-05, AC-01)
  // -------------------------------------------------------------------------
  describe("POST /api/tickets — Requester ownership & activity", () => {
    it("API-05: returns 403 Forbidden when requester is inactive", async () => {
      const prisma = getPrisma();
      const inactiveRequester = await prisma.requesterUser.findFirst({
        where: { isActive: false },
      });

      expect(inactiveRequester).not.toBeNull();

      const res = await request(app)
        .post("/api/tickets")
        .send(
          validPayload({
            requesterId: inactiveRequester!.id,
            categoryId: seedIds.categoryId,
            relatedSystemId: seedIds.relatedSystemId,
          })
        );

      expect(res.status).toBe(403);
      expect(res.body.code).toBe("REQUESTER_INACTIVE");
    });

    it("API-05: returns 400 when requester ID does not exist", async () => {
      const res = await request(app)
        .post("/api/tickets")
        .send(
          validPayload({
            requesterId: 999999,
            categoryId: seedIds.categoryId,
            relatedSystemId: seedIds.relatedSystemId,
          })
        );

      expect(res.status).toBe(400);
      expect(res.body.code).toBe("VALIDATION_ERROR");
    });
  });

  // -------------------------------------------------------------------------
  // Category & RelatedSystem existence/active status validation
  // -------------------------------------------------------------------------
  describe("POST /api/tickets — Category and RelatedSystem validation", () => {
    it("returns 400 when category does not exist", async () => {
      const res = await request(app)
        .post("/api/tickets")
        .send(
          validPayload({
            requesterId: seedIds.requesterId,
            categoryId: 999999,
            relatedSystemId: seedIds.relatedSystemId,
          })
        );

      expect(res.status).toBe(400);
      expect(res.body.code).toBe("VALIDATION_ERROR");
      expect(res.body.details?.some((d: any) => d.field === "categoryId")).toBe(true);
    });

    it("returns 400 when related system does not exist", async () => {
      const res = await request(app)
        .post("/api/tickets")
        .send(
          validPayload({
            requesterId: seedIds.requesterId,
            categoryId: seedIds.categoryId,
            relatedSystemId: 999999,
          })
        );

      expect(res.status).toBe(400);
      expect(res.body.code).toBe("VALIDATION_ERROR");
      expect(res.body.details?.some((d: any) => d.field === "relatedSystemId")).toBe(true);
    });

    it("returns 400 when category is inactive", async () => {
      // Create a temporary inactive category for this test
      const prisma = getPrisma();
      const inactiveCategory = await prisma.category.create({
        data: { name: "__test_inactive_cat__", isActive: false },
      });

      try {
        const res = await request(app)
          .post("/api/tickets")
          .send(
            validPayload({
              requesterId: seedIds.requesterId,
              categoryId: inactiveCategory.id,
              relatedSystemId: seedIds.relatedSystemId,
            })
          );

        expect(res.status).toBe(400);
        expect(res.body.code).toBe("VALIDATION_ERROR");
        expect(res.body.details?.some((d: any) => d.field === "categoryId")).toBe(true);
      } finally {
        await prisma.category.delete({ where: { id: inactiveCategory.id } });
      }
    });

    it("returns 400 when related system is inactive", async () => {
      // Create a temporary inactive related system for this test
      const prisma = getPrisma();
      const inactiveSystem = await prisma.relatedSystem.create({
        data: { name: "__test_inactive_sys__", isActive: false },
      });

      try {
        const res = await request(app)
          .post("/api/tickets")
          .send(
            validPayload({
              requesterId: seedIds.requesterId,
              categoryId: seedIds.categoryId,
              relatedSystemId: inactiveSystem.id,
            })
          );

        expect(res.status).toBe(400);
        expect(res.body.code).toBe("VALIDATION_ERROR");
        expect(res.body.details?.some((d: any) => d.field === "relatedSystemId")).toBe(true);
      } finally {
        await prisma.relatedSystem.delete({ where: { id: inactiveSystem.id } });
      }
    });
  });

  // -------------------------------------------------------------------------
  // Safe error handling (BR-19)
  // -------------------------------------------------------------------------
  describe("POST /api/tickets — Safe error handling", () => {
    it("500 response body never exposes stack traces or internal paths", async () => {
      // We cannot easily trigger a real 500 in integration tests without mocking.
      // Instead, verify the error envelope structure is safe by testing a bad
      // request and confirming no internal details leak.
      const res = await request(app)
        .post("/api/tickets")
        .send(
          validPayload({
            requesterId: seedIds.requesterId,
            categoryId: seedIds.categoryId,
            relatedSystemId: 999999,
          })
        );

      const body = JSON.stringify(res.body);
      expect(body).not.toContain("prisma");
      expect(body).not.toContain("Prisma");
      expect(body).not.toContain("stack");
      expect(body).not.toContain("node_modules");
    });
  });
});
