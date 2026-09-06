import express, { Request, Response } from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import multer from "multer";
import { getPrisma } from "./prisma.js";
import { generateTicketNumber } from "./utils/ticket-number.js";
import { validateTicketInput } from "./utils/validators.js";
import {
  validateAttachmentFile,
  generateStoredFileName,
  MAX_ACTIVE_ATTACHMENTS,
  MAX_FILE_SIZE_BYTES,
} from "./utils/attachment-validator.js";

export const app = express();

app.use(cors());
app.use(express.json());

// Setup safe local disk storage directory for attachments
const uploadsDir = path.join(process.cwd(), "uploads", "attachments");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer memory storage to validate files in memory before writing to disk
const upload = multer({
  limits: { fileSize: MAX_FILE_SIZE_BYTES + 1024 * 1024 }, // allow slightly larger so validator handles exact code
  storage: multer.memoryStorage(),
});

// ---------------------------------------------------------------------------
// Health check endpoint
// ---------------------------------------------------------------------------
app.get("/api/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok", service: "TokTickIT API" });
});

// ---------------------------------------------------------------------------
// GET /api/categories — Active Categories Reference Data
// ---------------------------------------------------------------------------
app.get("/api/categories", async (_req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { id: "asc" },
      select: {
        id: true,
        name: true,
      },
    });
    res.status(200).json(categories);
  } catch (_err) {
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

// ---------------------------------------------------------------------------
// GET /api/related-systems — Active Related Systems Reference Data (Lab 2 Issue 2)
// ---------------------------------------------------------------------------
app.get("/api/related-systems", async (_req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    const relatedSystems = await prisma.relatedSystem.findMany({
      where: { isActive: true },
      orderBy: { id: "asc" },
      select: {
        id: true,
        name: true,
        description: true,
      },
    });
    res.status(200).json(relatedSystems);
  } catch (_err) {
    res.status(500).json({ error: "Failed to fetch related systems" });
  }
});

// ---------------------------------------------------------------------------
// GET /api/requesters — Active Development Requester List (Lab 2 Issue 1)
// ---------------------------------------------------------------------------
app.get("/api/requesters", async (_req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    const requesters = await prisma.requesterUser.findMany({
      where: { isActive: true },
      orderBy: { id: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        department: true,
        isActive: true,
      },
    });
    res.status(200).json(requesters);
  } catch (_err) {
    res.status(500).json({ error: "Failed to fetch development requesters" });
  }
});

// ---------------------------------------------------------------------------
// POST /api/tickets — Create a new IT support ticket (Lab 2 Issue 3)
// ---------------------------------------------------------------------------
app.post("/api/tickets", async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma();

    // Resolve requesterId from body (primary) or X-Requester-Id header
    const rawRequesterId = req.body.requesterId ?? req.headers["x-requester-id"];
    const requesterId = rawRequesterId !== undefined ? parseInt(String(rawRequesterId), 10) : NaN;

    // Validate requesterId is a valid integer
    if (isNaN(requesterId) || requesterId <= 0) {
      res.status(400).json({
        error: "Validation failed",
        code: "VALIDATION_ERROR",
        details: [{ field: "requesterId", message: "A valid requester ID is required" }],
      });
      return;
    }

    // Verify requester exists and is active
    const requester = await prisma.requesterUser.findUnique({
      where: { id: requesterId },
    });

    if (!requester) {
      res.status(400).json({
        error: "Validation failed",
        code: "VALIDATION_ERROR",
        details: [{ field: "requesterId", message: "Requester not found" }],
      });
      return;
    }

    if (!requester.isActive) {
      res.status(403).json({
        error: "Selected requester is inactive and cannot create tickets",
        code: "REQUESTER_INACTIVE",
      });
      return;
    }

    // Validate input fields (summary, description, priority)
    const validation = validateTicketInput(req.body);
    if (!validation.isValid) {
      res.status(400).json({
        error: "Validation failed",
        code: "VALIDATION_ERROR",
        details: validation.errors,
      });
      return;
    }

    // Validate categoryId
    const rawCategoryId = req.body.categoryId;
    const categoryId = rawCategoryId !== undefined ? parseInt(String(rawCategoryId), 10) : NaN;

    if (isNaN(categoryId) || categoryId <= 0) {
      res.status(400).json({
        error: "Validation failed",
        code: "VALIDATION_ERROR",
        details: [{ field: "categoryId", message: "Valid category selection is required" }],
      });
      return;
    }

    const category = await prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category || !category.isActive) {
      res.status(400).json({
        error: "Validation failed",
        code: "VALIDATION_ERROR",
        details: [{ field: "categoryId", message: "Category not found or is inactive" }],
      });
      return;
    }

    // Validate relatedSystemId
    const rawRelatedSystemId = req.body.relatedSystemId;
    const relatedSystemId = rawRelatedSystemId !== undefined ? parseInt(String(rawRelatedSystemId), 10) : NaN;

    if (isNaN(relatedSystemId) || relatedSystemId <= 0) {
      res.status(400).json({
        error: "Validation failed",
        code: "VALIDATION_ERROR",
        details: [{ field: "relatedSystemId", message: "Valid related system selection is required" }],
      });
      return;
    }

    const relatedSystem = await prisma.relatedSystem.findUnique({
      where: { id: relatedSystemId },
    });

    if (!relatedSystem || !relatedSystem.isActive) {
      res.status(400).json({
        error: "Validation failed",
        code: "VALIDATION_ERROR",
        details: [{ field: "relatedSystemId", message: "Related system not found or is inactive" }],
      });
      return;
    }

    // Generate unique server-side ticket number
    const ticketNumber = await generateTicketNumber(prisma as any);

    // Persist ticket with all defaults
    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber,
        requesterId,
        categoryId,
        relatedSystemId,
        summary: validation.sanitized.summary,
        description: validation.sanitized.description,
        requestedPriority: validation.sanitized.requestedPriority,
        status: "NEW",
        itPriority: null,
        ticketOwnerName: null,
        resolutionSummary: null,
      },
      include: {
        requester: {
          select: { id: true, name: true, email: true },
        },
        category: {
          select: { id: true, name: true },
        },
        relatedSystem: {
          select: { id: true, name: true },
        },
      },
    });

    res.status(201).json({
      id: ticket.id,
      ticketNumber: ticket.ticketNumber,
      requesterId: ticket.requesterId,
      requester: ticket.requester,
      categoryId: ticket.categoryId,
      category: ticket.category,
      relatedSystemId: ticket.relatedSystemId,
      relatedSystem: ticket.relatedSystem,
      summary: ticket.summary,
      description: ticket.description,
      requestedPriority: ticket.requestedPriority,
      itPriority: ticket.itPriority,
      status: ticket.status,
      ticketOwnerName: ticket.ticketOwnerName,
      resolutionSummary: ticket.resolutionSummary,
      attachments: [],
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
    });
  } catch (_err) {
    res.status(500).json({
      error: "An unexpected error occurred while creating the ticket",
      code: "INTERNAL_SERVER_ERROR",
    });
  }
});

// ---------------------------------------------------------------------------
// GET /api/tickets — Personal Ticket List for Active Requester (Lab 2 Issue 5)
// ---------------------------------------------------------------------------
app.get("/api/tickets", async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma();

    // 1. Resolve active requesterId from X-Requester-Id header or requesterId query param
    const rawRequesterId = req.headers["x-requester-id"] ?? req.query.requesterId;
    const requesterId = rawRequesterId !== undefined ? parseInt(String(rawRequesterId), 10) : NaN;

    if (isNaN(requesterId) || requesterId <= 0) {
      res.status(400).json({
        error: "Requester ID is required to retrieve tickets",
        code: "MISSING_REQUESTER_ID",
      });
      return;
    }

    // 2. Parse & sanitize pagination params
    let page = parseInt(String(req.query.page ?? "1"), 10);
    if (isNaN(page) || page < 1) page = 1;

    let pageSize = parseInt(String(req.query.pageSize ?? "10"), 10);
    if (isNaN(pageSize) || pageSize < 1) pageSize = 10;
    if (pageSize > 50) pageSize = 50;

    // 3. Build filter conditions
    const where: any = {
      requesterId: requesterId,
    };

    // Text search (case-insensitive on ticketNumber or summary)
    const search = req.query.search !== undefined ? String(req.query.search).trim() : "";
    if (search.length > 0) {
      where.OR = [
        { ticketNumber: { contains: search, mode: "insensitive" } },
        { summary: { contains: search, mode: "insensitive" } },
      ];
    }

    // Category filter
    if (req.query.categoryId !== undefined && req.query.categoryId !== "") {
      const catId = parseInt(String(req.query.categoryId), 10);
      if (!isNaN(catId)) {
        where.categoryId = catId;
      }
    }

    // Priority & Status Enum filters
    const validPriorities = ["LOW", "MEDIUM", "HIGH", "URGENT"];
    const validStatuses = ["NEW", "OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED", "CANCELLED"];

    if (req.query.requestedPriority && validPriorities.includes(String(req.query.requestedPriority))) {
      where.requestedPriority = String(req.query.requestedPriority);
    }

    if (req.query.itPriority && validPriorities.includes(String(req.query.itPriority))) {
      where.itPriority = String(req.query.itPriority);
    }

    if (req.query.status && validStatuses.includes(String(req.query.status))) {
      where.status = String(req.query.status);
    }

    // 4. Build sorting
    const validSortFields = ["createdAt", "ticketNumber", "summary", "status", "requestedPriority", "updatedAt"];
    const sortBy = validSortFields.includes(String(req.query.sortBy)) ? String(req.query.sortBy) : "createdAt";
    const sortOrder = String(req.query.sortOrder).toLowerCase() === "asc" ? "asc" : "desc";

    const orderBy: any[] = [{ [sortBy]: sortOrder }];
    if (sortBy !== "createdAt") {
      orderBy.push({ createdAt: "desc" });
    }

    // 5. Query DB for total count and paginated items
    const totalItems = await prisma.ticket.count({ where });

    const skip = (page - 1) * pageSize;
    const tickets = await prisma.ticket.findMany({
      where,
      orderBy,
      skip,
      take: pageSize,
      include: {
        category: {
          select: { id: true, name: true },
        },
        relatedSystem: {
          select: { id: true, name: true },
        },
        attachments: {
          where: { isRemoved: false },
          select: { id: true },
        },
      },
    });

    // 6. Calculate pagination metadata
    const totalPages = Math.ceil(totalItems / pageSize);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1 && totalPages > 0;

    // 7. Map payload items
    const data = tickets.map((t) => ({
      id: t.id,
      ticketNumber: t.ticketNumber,
      requesterId: t.requesterId,
      category: t.category,
      relatedSystem: t.relatedSystem,
      summary: t.summary,
      requestedPriority: t.requestedPriority,
      itPriority: t.itPriority,
      status: t.status,
      ticketOwnerName: t.ticketOwnerName,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      attachmentCount: t.attachments.length,
    }));

    res.status(200).json({
      data,
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages,
        hasNextPage,
        hasPrevPage,
      },
    });
  } catch (_err) {
    console.error("GET /api/tickets error:", _err);
    res.status(500).json({
      error: "Failed to fetch tickets",
      code: "INTERNAL_SERVER_ERROR",
    });
  }
});

// ---------------------------------------------------------------------------
// GET /api/tickets/:idOrNumber — Ticket Details for Active Requester (Lab 2 Issue 6)
// ---------------------------------------------------------------------------
app.get("/api/tickets/:idOrNumber", async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma();

    // 1. Resolve active requesterId from X-Requester-Id header or requesterId query param
    const rawRequesterId = req.headers["x-requester-id"] ?? req.query.requesterId;
    const requesterId = rawRequesterId !== undefined ? parseInt(String(rawRequesterId), 10) : NaN;

    if (isNaN(requesterId) || requesterId <= 0) {
      res.status(400).json({
        error: "Requester ID is required to retrieve ticket details",
        code: "MISSING_REQUESTER_ID",
      });
      return;
    }

    // 2. Parse path parameter (:idOrNumber)
    const param = String(req.params.idOrNumber).trim();
    const numericId = parseInt(param, 10);
    const isNumeric = !isNaN(numericId) && String(numericId) === param;

    // 3. Query DB by id or ticketNumber
    const where: any = isNumeric
      ? { OR: [{ id: numericId }, { ticketNumber: param }] }
      : { ticketNumber: param };

    const ticket = await prisma.ticket.findFirst({
      where,
      include: {
        requester: {
          select: { id: true, name: true, email: true, department: true },
        },
        category: {
          select: { id: true, name: true },
        },
        relatedSystem: {
          select: { id: true, name: true },
        },
        attachments: {
          orderBy: { id: "asc" },
        },
      },
    });

    // 4. Ownership verification & Not Found handling
    if (!ticket || ticket.requesterId !== requesterId) {
      res.status(404).json({
        error: "Ticket not found or you do not have permission to view it",
        code: "TICKET_NOT_FOUND",
      });
      return;
    }

    // 5. Return complete ticket detail JSON payload
    res.status(200).json({
      id: ticket.id,
      ticketNumber: ticket.ticketNumber,
      requesterId: ticket.requesterId,
      requester: ticket.requester,
      categoryId: ticket.categoryId,
      category: ticket.category,
      relatedSystemId: ticket.relatedSystemId,
      relatedSystem: ticket.relatedSystem,
      summary: ticket.summary,
      description: ticket.description,
      requestedPriority: ticket.requestedPriority,
      itPriority: ticket.itPriority,
      status: ticket.status,
      ticketOwnerName: ticket.ticketOwnerName,
      resolutionSummary: ticket.resolutionSummary,
      attachments: ticket.attachments.map((att) => ({
        id: att.id,
        ticketId: att.ticketId,
        originalFileName: att.originalFileName,
        fileMimeType: att.fileMimeType,
        fileSizeBytes: att.fileSizeBytes,
        isRemoved: att.isRemoved,
        removedReason: att.removedReason,
        removedAt: att.removedAt,
        createdAt: att.createdAt,
      })),
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
    });
  } catch (_err) {
    console.error("GET /api/tickets/:idOrNumber error:", _err);
    res.status(500).json({
      error: "Failed to fetch ticket details",
      code: "INTERNAL_SERVER_ERROR",
    });
  }
});

// ---------------------------------------------------------------------------
// Attachment Lifecycle Endpoints (Lab 2 Issue 7)
// ---------------------------------------------------------------------------

// POST /api/tickets/:idOrNumber/attachments — Upload attachment to an owned ticket
app.post(
  "/api/tickets/:idOrNumber/attachments",
  upload.single("file"),
  async (req: Request, res: Response) => {
    try {
      const prisma = getPrisma();

      // 1. Resolve requesterId
      const rawRequesterId = req.headers["x-requester-id"] ?? req.body.requesterId ?? req.query.requesterId;
      const requesterId = rawRequesterId !== undefined ? parseInt(String(rawRequesterId), 10) : NaN;

      if (isNaN(requesterId) || requesterId <= 0) {
        res.status(400).json({
          error: "Requester ID is required to upload attachments",
          code: "MISSING_REQUESTER_ID",
        });
        return;
      }

      // 2. Parse target ticket :idOrNumber
      const param = String(req.params.idOrNumber).trim();
      const numericId = parseInt(param, 10);
      const isNumeric = !isNaN(numericId) && String(numericId) === param;

      const where: any = isNumeric
        ? { OR: [{ id: numericId }, { ticketNumber: param }] }
        : { ticketNumber: param };

      const ticket = await prisma.ticket.findFirst({
        where,
        include: {
          attachments: {
            where: { isRemoved: false },
          },
        },
      });

      // 3. Ownership & Existence check
      if (!ticket || ticket.requesterId !== requesterId) {
        res.status(404).json({
          error: "Ticket not found or permission denied",
          code: "UNAUTHORIZED_TICKET_ACCESS",
        });
        return;
      }

      // 4. Active attachment limit check (< 5)
      if (ticket.attachments.length >= MAX_ACTIVE_ATTACHMENTS) {
        res.status(400).json({
          error: "Ticket already contains the maximum allowed 5 active attachments",
          code: "MAX_ATTACHMENTS_EXCEEDED",
        });
        return;
      }

      // 5. File validation
      const file = req.file;
      const validation = validateAttachmentFile(file);

      if (!validation.isValid) {
        res.status(validation.statusCode || 400).json({
          error: validation.errorMessage,
          code: validation.errorCode,
        });
        return;
      }

      if (!file) {
        res.status(400).json({ error: "No file uploaded", code: "INVALID_FILE" });
        return;
      }

      // 6. Generate safe stored filename & write buffer to disk
      const { storedFileName } = generateStoredFileName(file.originalname);
      const filePath = path.join(uploadsDir, storedFileName);

      fs.writeFileSync(filePath, file.buffer);

      // 7. Insert Attachment record into DB
      const attachment = await prisma.attachment.create({
        data: {
          ticketId: ticket.id,
          originalFileName: file.originalname,
          storedFileName,
          fileMimeType: file.mimetype.toLowerCase(),
          fileSizeBytes: file.size,
          storagePath: filePath,
          isRemoved: false,
        },
      });

      res.status(201).json({
        id: attachment.id,
        ticketId: attachment.ticketId,
        originalFileName: attachment.originalFileName,
        fileMimeType: attachment.fileMimeType,
        fileSizeBytes: attachment.fileSizeBytes,
        isRemoved: attachment.isRemoved,
        createdAt: attachment.createdAt,
      });
    } catch (_err) {
      console.error("POST /api/tickets/:idOrNumber/attachments error:", _err);
      res.status(500).json({
        error: "An unexpected error occurred while uploading attachment",
        code: "INTERNAL_SERVER_ERROR",
      });
    }
  }
);

// GET /api/attachments/:id/metadata — Get metadata for an owned attachment
app.get("/api/attachments/:id/metadata", async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma();

    // 1. Resolve requesterId
    const rawRequesterId = req.headers["x-requester-id"] ?? req.query.requesterId;
    const requesterId = rawRequesterId !== undefined ? parseInt(String(rawRequesterId), 10) : NaN;

    if (isNaN(requesterId) || requesterId <= 0) {
      res.status(400).json({
        error: "Requester ID is required to fetch attachment metadata",
        code: "MISSING_REQUESTER_ID",
      });
      return;
    }

    const attachmentId = parseInt(String(req.params.id), 10);
    if (isNaN(attachmentId) || attachmentId <= 0) {
      res.status(400).json({
        error: "Invalid attachment ID",
        code: "INVALID_ATTACHMENT_ID",
      });
      return;
    }

    // 2. Fetch attachment with ticket ownership check
    const attachment = await prisma.attachment.findUnique({
      where: { id: attachmentId },
      include: { ticket: { select: { requesterId: true } } },
    });

    if (!attachment || attachment.ticket.requesterId !== requesterId) {
      res.status(404).json({
        error: "Attachment not found or permission denied",
        code: "ATTACHMENT_NOT_FOUND",
      });
      return;
    }

    res.status(200).json({
      id: attachment.id,
      ticketId: attachment.ticketId,
      originalFileName: attachment.originalFileName,
      fileMimeType: attachment.fileMimeType,
      fileSizeBytes: attachment.fileSizeBytes,
      isRemoved: attachment.isRemoved,
      removedReason: attachment.removedReason,
      removedAt: attachment.removedAt,
      createdAt: attachment.createdAt,
    });
  } catch (_err) {
    console.error("GET /api/attachments/:id/metadata error:", _err);
    res.status(500).json({
      error: "Failed to fetch attachment metadata",
      code: "INTERNAL_SERVER_ERROR",
    });
  }
});

// GET /api/attachments/:id/download — Download binary content of an active attachment
app.get("/api/attachments/:id/download", async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma();

    // 1. Resolve requesterId
    const rawRequesterId = req.headers["x-requester-id"] ?? req.query.requesterId;
    const requesterId = rawRequesterId !== undefined ? parseInt(String(rawRequesterId), 10) : NaN;

    if (isNaN(requesterId) || requesterId <= 0) {
      res.status(400).json({
        error: "Requester ID is required to download attachments",
        code: "MISSING_REQUESTER_ID",
      });
      return;
    }

    const attachmentId = parseInt(String(req.params.id), 10);
    if (isNaN(attachmentId) || attachmentId <= 0) {
      res.status(400).json({
        error: "Invalid attachment ID",
        code: "INVALID_ATTACHMENT_ID",
      });
      return;
    }

    // 2. Fetch attachment with ticket relation
    const attachment = await prisma.attachment.findUnique({
      where: { id: attachmentId },
      include: { ticket: { select: { requesterId: true } } },
    });

    if (!attachment || attachment.ticket.requesterId !== requesterId) {
      res.status(404).json({
        error: "Attachment not found or permission denied",
        code: "ATTACHMENT_NOT_FOUND",
      });
      return;
    }

    // 3. Check soft-removal flag -> 410 Gone if removed
    if (attachment.isRemoved) {
      res.status(410).json({
        error: "This attachment has been removed and is no longer available for download",
        code: "ATTACHMENT_REMOVED",
        removedAt: attachment.removedAt,
        removedReason: attachment.removedReason,
      });
      return;
    }

    // 4. Verify physical file exists
    if (!fs.existsSync(attachment.storagePath)) {
      res.status(404).json({
        error: "Attachment binary file is missing from storage",
        code: "FILE_MISSING",
      });
      return;
    }

    // 5. Stream file with proper attachment headers
    res.setHeader("Content-Type", attachment.fileMimeType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(attachment.originalFileName)}"`
    );
    res.setHeader("Content-Length", attachment.fileSizeBytes);

    const stream = fs.createReadStream(attachment.storagePath);
    stream.pipe(res);
  } catch (_err) {
    console.error("GET /api/attachments/:id/download error:", _err);
    res.status(500).json({
      error: "Failed to download attachment",
      code: "INTERNAL_SERVER_ERROR",
    });
  }
});

// DELETE /api/attachments/:id — Soft remove attachment with audit reason
app.delete("/api/attachments/:id", async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma();

    // 1. Resolve requesterId
    const rawRequesterId = req.headers["x-requester-id"] ?? req.body.requesterId ?? req.query.requesterId;
    const requesterId = rawRequesterId !== undefined ? parseInt(String(rawRequesterId), 10) : NaN;

    if (isNaN(requesterId) || requesterId <= 0) {
      res.status(400).json({
        error: "Requester ID is required to remove attachments",
        code: "MISSING_REQUESTER_ID",
      });
      return;
    }

    const attachmentId = parseInt(String(req.params.id), 10);
    if (isNaN(attachmentId) || attachmentId <= 0) {
      res.status(400).json({
        error: "Invalid attachment ID",
        code: "INVALID_ATTACHMENT_ID",
      });
      return;
    }

    // 2. Fetch attachment with ticket ownership check
    const attachment = await prisma.attachment.findUnique({
      where: { id: attachmentId },
      include: { ticket: { select: { requesterId: true } } },
    });

    if (!attachment || attachment.ticket.requesterId !== requesterId) {
      res.status(404).json({
        error: "Attachment not found or permission denied",
        code: "ATTACHMENT_NOT_FOUND",
      });
      return;
    }

    // 3. Check if already removed
    if (attachment.isRemoved) {
      res.status(400).json({
        error: "Attachment has already been removed",
        code: "ALREADY_REMOVED",
      });
      return;
    }

    // 4. Resolve reason
    const reason =
      typeof req.body?.reason === "string"
        ? req.body.reason.trim()
        : "";

    if (!reason) {
      res.status(400).json({
        error: "Remove reason is required",
        code: "REMOVE_REASON_REQUIRED",
      });
      return;
    }
    // 5. Update record with soft removal fields
    const updated = await prisma.attachment.update({
      where: { id: attachmentId },
      data: {
        isRemoved: true,
        removedAt: new Date(),
        removedReason: reason,
        removedByRequesterId: requesterId,
      },
    });

    res.status(200).json({
      id: updated.id,
      ticketId: updated.ticketId,
      originalFileName: updated.originalFileName,
      isRemoved: updated.isRemoved,
      removedReason: updated.removedReason,
      removedAt: updated.removedAt,
      message: "Attachment soft-removed successfully",
    });
  } catch (_err) {
    console.error("DELETE /api/attachments/:id error:", _err);
    res.status(500).json({
      error: "Failed to remove attachment",
      code: "INTERNAL_SERVER_ERROR",
    });
  }
});

export default app;



