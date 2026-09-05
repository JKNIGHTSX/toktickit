import express, { Request, Response } from "express";
import cors from "cors";
import { getPrisma } from "./prisma.js";
import { generateTicketNumber } from "./utils/ticket-number.js";
import { validateTicketInput } from "./utils/validators.js";

export const app = express();

app.use(cors());
app.use(express.json());

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

export default app;
