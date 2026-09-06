import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import path from "path";
import fs from "fs";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

describe("Issue #7: Attachment Lifecycle API Tests (API-13 to API-20)", () => {
  const prisma = getPrisma();

  let requesterAId: number;
  let requesterBId: number;
  let categoryId: number;
  let relatedSystemId: number;

  const testFileDir = path.join(process.cwd(), "scratch", "test-files");

  beforeAll(async () => {
    // Fetch active requesters, category, system
    const requesters = await prisma.requesterUser.findMany({ where: { isActive: true } });
    expect(requesters.length).toBeGreaterThanOrEqual(2);
    requesterAId = requesters[0].id;
    requesterBId = requesters[1].id;

    const category = await prisma.category.findFirst({ where: { isActive: true } });
    const system = await prisma.relatedSystem.findFirst({ where: { isActive: true } });
    expect(category).toBeDefined();
    expect(system).toBeDefined();
    categoryId = category!.id;
    relatedSystemId = system!.id;

    if (!fs.existsSync(testFileDir)) {
      fs.mkdirSync(testFileDir, { recursive: true });
    }
  });

  const createTempFile = (fileName: string, sizeBytes: number, fillChar = "a"): string => {
    const filePath = path.join(testFileDir, fileName);
    const buffer = Buffer.alloc(sizeBytes, fillChar);
    fs.writeFileSync(filePath, buffer);
    return filePath;
  };

  const createTestTicket = async (requesterId: number, summary = "Test Ticket") => {
    const res = await request(app)
      .post("/api/tickets")
      .set("X-Requester-Id", String(requesterId))
      .send({
        requesterId,
        categoryId,
        relatedSystemId,
        summary,
        description: "Testing attachment endpoints for requester ticket.",
        requestedPriority: "MEDIUM",
      });
    expect(res.status).toBe(201);
    return res.body;
  };

  // --- API-13: Upload Valid Attachment ---

  it("API-13: uploads a valid PDF attachment successfully (201 Created)", async () => {
    const ticket = await createTestTicket(requesterAId, "PDF Upload Ticket");
    const pdfPath = createTempFile("test_doc.pdf", 1024 * 100);

    const res = await request(app)
      .post(`/api/tickets/${ticket.id}/attachments`)
      .set("X-Requester-Id", String(requesterAId))
      .attach("file", pdfPath);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body.ticketId).toBe(ticket.id);
    expect(res.body.originalFileName).toBe("test_doc.pdf");
    expect(res.body.fileMimeType).toBe("application/pdf");
    expect(res.body.fileSizeBytes).toBe(1024 * 100);
    expect(res.body.isRemoved).toBe(false);
  });

  it("API-13: uploads a valid PNG image using ticketNumber", async () => {
    const ticket = await createTestTicket(requesterAId, "PNG Upload Ticket");
    const pngPath = createTempFile("screenshot.png", 50 * 1024);

    const res = await request(app)
      .post(`/api/tickets/${ticket.ticketNumber}/attachments`)
      .set("X-Requester-Id", String(requesterAId))
      .attach("file", pngPath);

    expect(res.status).toBe(201);
    expect(res.body.originalFileName).toBe("screenshot.png");
    expect(res.body.fileMimeType).toBe("image/png");
  });

  // --- API-14: Reject Unsupported File Format ---

  it("API-14: rejects unsupported file format e.g. .exe file (415 Unsupported Media Type)", async () => {
    const ticket = await createTestTicket(requesterAId, "Exe Upload Ticket");
    const exePath = createTempFile("setup.exe", 1024);

    const res = await request(app)
      .post(`/api/tickets/${ticket.id}/attachments`)
      .set("X-Requester-Id", String(requesterAId))
      .attach("file", exePath);

    expect(res.status).toBe(415);
    expect(res.body.code).toBe("UNSUPPORTED_FILE_TYPE");
    expect(res.body.error).toContain("Unsupported file format");
  });

  // --- API-15: Reject Oversized File > 5MB ---

  it("API-15: rejects oversized file exceeding 5MB limit (413 Payload Too Large)", async () => {
    const ticket = await createTestTicket(requesterAId, "Large Upload Ticket");
    const largePdfPath = createTempFile("large_manual.pdf", 5.1 * 1024 * 1024);

    const res = await request(app)
      .post(`/api/tickets/${ticket.id}/attachments`)
      .set("X-Requester-Id", String(requesterAId))
      .attach("file", largePdfPath);

    expect(res.status).toBe(413);
    expect(res.body.code).toBe("FILE_TOO_LARGE");
  });

  // --- API-16: Reject 6th Active Attachment ---

  it("API-16: rejects upload when ticket already has 5 active attachments (400 Bad Request)", async () => {
    const ticket = await createTestTicket(requesterAId, "Limit Test Ticket");

    for (let i = 1; i <= 5; i++) {
      const filePath = createTempFile(`file_${i}.pdf`, 1024 * 10);
      const uRes = await request(app)
        .post(`/api/tickets/${ticket.id}/attachments`)
        .set("X-Requester-Id", String(requesterAId))
        .attach("file", filePath);

      expect(uRes.status).toBe(201);
    }

    const extraFilePath = createTempFile("file_6.pdf", 1024 * 10);
    const res6 = await request(app)
      .post(`/api/tickets/${ticket.id}/attachments`)
      .set("X-Requester-Id", String(requesterAId))
      .attach("file", extraFilePath);

    expect(res6.status).toBe(400);
    expect(res6.body.code).toBe("MAX_ATTACHMENTS_EXCEEDED");
  });

  // --- Metadata Retrieval ---

  it("retrieves attachment metadata for an owned active attachment", async () => {
    const ticket = await createTestTicket(requesterAId, "Meta Ticket");
    const pdfPath = createTempFile("meta_test.pdf", 2048);
    const uRes = await request(app)
      .post(`/api/tickets/${ticket.id}/attachments`)
      .set("X-Requester-Id", String(requesterAId))
      .attach("file", pdfPath);

    expect(uRes.status).toBe(201);
    const attachmentId = uRes.body.id;

    const res = await request(app)
      .get(`/api/attachments/${attachmentId}/metadata`)
      .set("X-Requester-Id", String(requesterAId));

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(attachmentId);
    expect(res.body.originalFileName).toBe("meta_test.pdf");
    expect(res.body.isRemoved).toBe(false);
  });

  // --- API-17: Download Active Attachment ---

  it("API-17: downloads active attachment binary stream (200 OK)", async () => {
    const ticket = await createTestTicket(requesterAId, "Download Ticket");
    const pdfPath = createTempFile("download_me.pdf", 4096, "D");
    const uRes = await request(app)
      .post(`/api/tickets/${ticket.id}/attachments`)
      .set("X-Requester-Id", String(requesterAId))
      .attach("file", pdfPath);

    expect(uRes.status).toBe(201);
    const attachmentId = uRes.body.id;

    const res = await request(app)
      .get(`/api/attachments/${attachmentId}/download`)
      .set("X-Requester-Id", String(requesterAId));

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toBe("application/pdf");
    expect(res.headers["content-disposition"]).toContain("download_me.pdf");
    expect(res.headers["content-length"]).toBe("4096");
  });

  // --- API-18: Soft Removal with Audit Reason ---

  it("API-18: soft removes attachment with audit reason (200 OK)", async () => {
    const ticket = await createTestTicket(requesterAId, "Soft Remove Ticket");
    const imgPath = createTempFile("to_remove.png", 2048);
    const uRes = await request(app)
      .post(`/api/tickets/${ticket.id}/attachments`)
      .set("X-Requester-Id", String(requesterAId))
      .attach("file", imgPath);

    expect(uRes.status).toBe(201);
    const attachmentId = uRes.body.id;

    const res = await request(app)
      .delete(`/api/attachments/${attachmentId}`)
      .set("X-Requester-Id", String(requesterAId))
      .send({ reason: "Uploaded incorrect diagnostic file" });

    expect(res.status).toBe(200);
    expect(res.body.isRemoved).toBe(true);
    expect(res.body.removedReason).toBe("Uploaded incorrect diagnostic file");
    expect(res.body.removedAt).toBeDefined();

    // Verify metadata still returns the soft-removed record
    const metaRes = await request(app)
      .get(`/api/attachments/${attachmentId}/metadata`)
      .set("X-Requester-Id", String(requesterAId));

    expect(metaRes.status).toBe(200);
    expect(metaRes.body.isRemoved).toBe(true);
    expect(metaRes.body.removedReason).toBe("Uploaded incorrect diagnostic file");
  });

  // --- API-19: Blocked Download of Soft-Removed Attachment (410 Gone) ---

  it("API-19: blocks download attempt of soft-removed attachment (410 Gone)", async () => {
    const ticket = await createTestTicket(requesterAId, "Blocked Download Ticket");
    const pdfPath = createTempFile("removed_doc.pdf", 1024);
    const uRes = await request(app)
      .post(`/api/tickets/${ticket.id}/attachments`)
      .set("X-Requester-Id", String(requesterAId))
      .attach("file", pdfPath);

    expect(uRes.status).toBe(201);
    const attachmentId = uRes.body.id;

    // Remove the file
    await request(app)
      .delete(`/api/attachments/${attachmentId}`)
      .set("X-Requester-Id", String(requesterAId))
      .send({ reason: "Security violation" });

    // Attempt download
    const res = await request(app)
      .get(`/api/attachments/${attachmentId}/download`)
      .set("X-Requester-Id", String(requesterAId));

    expect(res.status).toBe(410);
    expect(res.body.code).toBe("ATTACHMENT_REMOVED");
    expect(res.body.error).toContain("removed and is no longer available");
  });

  // --- API-20: Cross-Requester Ownership Enforcement ---

  it("API-20: denies download of Requester A's attachment to Requester B (404/403)", async () => {
    const ticket = await createTestTicket(requesterAId, "Private A Ticket");
    const pdfPath = createTempFile("private_a.pdf", 1024);
    const uRes = await request(app)
      .post(`/api/tickets/${ticket.id}/attachments`)
      .set("X-Requester-Id", String(requesterAId))
      .attach("file", pdfPath);

    expect(uRes.status).toBe(201);
    const attachmentId = uRes.body.id;

    // Requester B attempts download
    const res = await request(app)
      .get(`/api/attachments/${attachmentId}/download`)
      .set("X-Requester-Id", String(requesterBId));

    expect([403, 404]).toContain(res.status);
    expect(res.body.code).toBe("ATTACHMENT_NOT_FOUND");
  });

  it("API-20: denies upload of attachment to Requester A's ticket by Requester B (404/403)", async () => {
    const ticket = await createTestTicket(requesterAId, "Ticket for A");
    const pdfPath = createTempFile("unauthorized.pdf", 1024);

    const res = await request(app)
      .post(`/api/tickets/${ticket.id}/attachments`)
      .set("X-Requester-Id", String(requesterBId))
      .attach("file", pdfPath);

    expect([403, 404]).toContain(res.status);
    expect(res.body.code).toBe("UNAUTHORIZED_TICKET_ACCESS");
  });

  it("API-20: denies soft removal of Requester A's attachment by Requester B (404/403)", async () => {
    const ticket = await createTestTicket(requesterAId, "Ticket for A removal test");
    const pdfPath = createTempFile("a_file.pdf", 1024);
    const uRes = await request(app)
      .post(`/api/tickets/${ticket.id}/attachments`)
      .set("X-Requester-Id", String(requesterAId))
      .attach("file", pdfPath);

    expect(uRes.status).toBe(201);
    const attachmentId = uRes.body.id;

    const res = await request(app)
      .delete(`/api/attachments/${attachmentId}`)
      .set("X-Requester-Id", String(requesterBId));

    expect([403, 404]).toContain(res.status);
  });

  // --- Soft-removed attachment no longer counts as active ---

  it("allows new active attachment upload after soft-removing one of 5 active attachments", async () => {
    const ticket = await createTestTicket(requesterAId, "Slot Freeing Ticket");
    const attachmentIds: number[] = [];

    for (let i = 1; i <= 5; i++) {
      const filePath = createTempFile(`slot_${i}.pdf`, 1024);
      const uRes = await request(app)
        .post(`/api/tickets/${ticket.id}/attachments`)
        .set("X-Requester-Id", String(requesterAId))
        .attach("file", filePath);

      expect(uRes.status).toBe(201);
      attachmentIds.push(uRes.body.id);
    }

    // 6th upload should fail
    const p6 = createTempFile("slot_6.pdf", 1024);
    const resFail = await request(app)
      .post(`/api/tickets/${ticket.id}/attachments`)
      .set("X-Requester-Id", String(requesterAId))
      .attach("file", p6);
    expect(resFail.status).toBe(400);

    // Soft remove 1 attachment
    const delRes = await request(app)
      .delete(`/api/attachments/${attachmentIds[0]}`)
      .set("X-Requester-Id", String(requesterAId))
      .send({ reason: "Freeing slot" });
    expect(delRes.status).toBe(200);

    // Now 6th upload should succeed!
    const resPass = await request(app)
      .post(`/api/tickets/${ticket.id}/attachments`)
      .set("X-Requester-Id", String(requesterAId))
      .attach("file", p6);
    expect(resPass.status).toBe(201);
  });
});
