import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import multer from "multer";
import session from "express-session";
import cookieParser from "cookie-parser";
import bcrypt from "bcryptjs";
import { getPrisma } from "./prisma.js";
import { generateTicketNumber } from "./utils/ticket-number.js";
import { validateTicketInput } from "./utils/validators.js";
import { validatePasswordPolicy } from "./utils/password-policy.js";
import {
  validateAttachmentFile,
  generateStoredFileName,
  MAX_ACTIVE_ATTACHMENTS,
  MAX_FILE_SIZE_BYTES,
} from "./utils/attachment-validator.js";

declare module "express-session" {
  interface SessionData {
    userId?: number;
    role?: string;
  }
}

export const app = express();

app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

app.use(
  session({
    secret: process.env.SESSION_SECRET || "toktickit_session_secret_key_2026_lab3",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);

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
// Authentication Endpoints (Lab 3 Issue #3)
// ---------------------------------------------------------------------------

// POST /api/auth/login
app.post("/api/auth/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password || typeof email !== "string" || typeof password !== "string") {
      res.status(401).json({
        error: "Invalid email or password",
        code: "INVALID_CREDENTIALS",
      });
      return;
    }

    const prisma = getPrisma();
    const cleanEmail = email.trim().toLowerCase();

    const user = await prisma.user.findFirst({
      where: {
        email: {
          equals: cleanEmail,
          mode: "insensitive",
        },
      },
    });

    if (!user) {
      res.status(401).json({
        error: "Invalid email or password",
        code: "INVALID_CREDENTIALS",
      });
      return;
    }

    if (!user.isActive) {
      res.status(401).json({
        error: "Account is inactive. Please contact an Administrator",
        code: "ACCOUNT_INACTIVE",
      });
      return;
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      res.status(401).json({
        error: "Invalid email or password",
        code: "INVALID_CREDENTIALS",
      });
      return;
    }

    req.session.userId = user.id;
    req.session.role = user.role;

    res.status(200).json({
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          department: user.department,
          role: user.role,
          mustChangePassword: user.mustChangePassword,
          isActive: user.isActive,
        },
      },
      message: "Login successful",
    });
  } catch (_err) {
    console.error("POST /api/auth/login error:", _err);
    res.status(500).json({
      error: "Internal server error during authentication",
      code: "INTERNAL_SERVER_ERROR",
    });
  }
});

// POST /api/auth/logout
app.post("/api/auth/logout", (req: Request, res: Response) => {
  req.session.destroy((_err) => {
    res.clearCookie("connect.sid");
    res.status(200).json({
      message: "Logged out successfully",
    });
  });
});

// GET /api/auth/me
app.get("/api/auth/me", async (req: Request, res: Response) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      res.status(401).json({
        error: "Unauthenticated access",
        code: "UNAUTHENTICATED",
      });
      return;
    }

    const prisma = getPrisma();
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.isActive) {
      req.session.destroy(() => {});
      res.clearCookie("connect.sid");
      res.status(401).json({
        error: "Account is inactive or user not found",
        code: "UNAUTHENTICATED",
      });
      return;
    }

    res.status(200).json({
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        department: user.department,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
        isActive: user.isActive,
      },
    });
  } catch (_err) {
    res.status(500).json({
      error: "Internal server error retrieving user profile",
      code: "INTERNAL_SERVER_ERROR",
    });
  }
});

// POST /api/auth/change-password
app.post("/api/auth/change-password", async (req: Request, res: Response) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      res.status(401).json({
        error: "Unauthenticated access",
        code: "UNAUTHENTICATED",
      });
      return;
    }

    const { currentPassword, newPassword, confirmPassword } = req.body || {};

    if (!currentPassword || !newPassword || !confirmPassword) {
      res.status(400).json({
        error: "Validation failed",
        code: "VALIDATION_ERROR",
        details: [
          { field: "currentPassword", message: "Current password is required" },
          { field: "newPassword", message: "New password is required" },
          { field: "confirmPassword", message: "Confirm password is required" },
        ].filter((d) => !req.body?.[d.field]),
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      res.status(400).json({
        error: "Password policy violation",
        code: "VALIDATION_ERROR",
        details: [
          { field: "confirmPassword", message: "New password and confirmation do not match" },
        ],
      });
      return;
    }

    const prisma = getPrisma();
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user || !user.isActive) {
      res.status(401).json({
        error: "User not found or account inactive",
        code: "UNAUTHENTICATED",
      });
      return;
    }

    const passwordMatches = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!passwordMatches) {
      res.status(400).json({
        error: "Current password is incorrect",
        code: "INVALID_CURRENT_PASSWORD",
        details: [
          { field: "currentPassword", message: "Current password is incorrect" },
        ],
      });
      return;
    }

    const policyResult = validatePasswordPolicy(newPassword);
    if (!policyResult.isValid) {
      res.status(400).json({
        error: "Password policy violation",
        code: "VALIDATION_ERROR",
        details: [
          {
            field: "newPassword",
            message: "Password must contain at least 8 characters, 1 uppercase, 1 lowercase, 1 number, and 1 special character",
          },
        ],
      });
      return;
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: newPasswordHash,
        mustChangePassword: false,
      },
    });

    res.status(200).json({
      message: "Password changed successfully. You may now access the application.",
    });
  } catch (_err) {
    console.error("POST /api/auth/change-password error:", _err);
    res.status(500).json({
      error: "Internal server error changing password",
      code: "INTERNAL_SERVER_ERROR",
    });
  }
});

// ---------------------------------------------------------------------------
// Mandatory First-Login Password Change Intercept Middleware
// ---------------------------------------------------------------------------
app.use(async (req: Request, res: Response, next: NextFunction) => {
  const allowedUnauthenticatedOrAuthPaths = [
    "/api/health",
    "/api/auth/login",
    "/api/auth/logout",
    "/api/auth/me",
    "/api/auth/change-password",
    "/api/categories",
    "/api/related-systems",
    "/api/requesters",
  ];

  if (allowedUnauthenticatedOrAuthPaths.includes(req.path)) {
    return next();
  }

  const userId = req.session?.userId;
  if (userId) {
    const prisma = getPrisma();
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user && user.mustChangePassword) {
      res.status(403).json({
        error: "Password change required before accessing the application",
        code: "MUST_CHANGE_PASSWORD",
      });
      return;
    }
  }

  next();
});

// Fallback seed data for development when database container is offline
const FALLBACK_CATEGORIES = [
  { id: 1, name: "Account and Access", description: "Login, permissions, and account requests" },
  { id: 2, name: "Hardware", description: "Laptops, monitors, peripherals, and accessories" },
  { id: 3, name: "Software", description: "Application issues, licenses, and installation" },
  { id: 4, name: "Network", description: "VPN, Wi-Fi, DNS, and connectivity issues" },
];

const FALLBACK_SYSTEMS = [
  { id: 1, name: "Email", description: "Corporate email and inbox service" },
  { id: 2, name: "Campus Wi-Fi", description: "Wireless network access on campus" },
  { id: 3, name: "VPN", description: "Virtual private network remote access" },
  { id: 4, name: "LEB2 App", description: "Learning environment portal" },
  { id: 5, name: "Grade Submission App", description: "Academic grade management app" },
  { id: 6, name: "Printer", description: "Networked office printers and scanners" },
  { id: 7, name: "Corporate Laptop", description: "Company-issued laptop hardware" },
];

const FALLBACK_REQUESTERS = [
  { id: 1, name: "Jennifer Anderson", email: "jennifer.anderson@toktickit.local", department: "Marketing", isActive: true },
  { id: 2, name: "Michael Brown", email: "michael.brown@toktickit.local", department: "Finance", isActive: true },
  { id: 3, name: "Sarah Johnson", email: "sarah.johnson@toktickit.local", department: "Human Resources", isActive: true },
  { id: 4, name: "David Lee", email: "david.lee@toktickit.local", department: "Engineering", isActive: true },
];

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
    res.status(200).json(FALLBACK_CATEGORIES);
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
    res.status(200).json(FALLBACK_SYSTEMS);
  }
});

// ---------------------------------------------------------------------------
// GET /api/requesters — Active Development Requester List (Lab 2 Issue 1)
// ---------------------------------------------------------------------------
app.get("/api/requesters", async (_req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    const requesters = await prisma.user.findMany({
      where: { role: "REQUESTER", isActive: true },
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
    res.status(200).json(FALLBACK_REQUESTERS);
  }
});

// ---------------------------------------------------------------------------
// POST /api/tickets — Create a new IT support ticket (Lab 2 Issue 3)
// ---------------------------------------------------------------------------
app.post("/api/tickets", async (req: Request, res: Response) => {
  try {
    const sessionUserId = req.session?.userId;
    const rawRequesterId = req.body.requesterId ?? req.headers["x-requester-id"];

    let requesterId: number;
    if (sessionUserId) {
      requesterId = sessionUserId;
    } else if (rawRequesterId !== undefined && rawRequesterId !== null && rawRequesterId !== "") {
      requesterId = parseInt(String(rawRequesterId), 10);
      if (isNaN(requesterId) || requesterId <= 0) {
        res.status(400).json({
          error: "Validation failed",
          code: "VALIDATION_ERROR",
          details: [{ field: "requesterId", message: "A valid requester ID is required" }],
        });
        return;
      }
    } else {
      res.status(400).json({
        error: "Validation failed",
        code: "VALIDATION_ERROR",
        details: [{ field: "requesterId", message: "A valid requester ID is required" }],
      });
      return;
    }

    const prisma = getPrisma();

    // Verify requester exists and is active
    const requester = await prisma.user.findUnique({
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
    const sessionUserId = req.session?.userId;
    const sessionRole = req.session?.role;
    const rawRequesterId = req.headers["x-requester-id"] ?? req.query.requesterId;

    let requesterId: number | undefined;
    if (sessionUserId) {
      requesterId = sessionUserId;
    } else if (rawRequesterId !== undefined && rawRequesterId !== null && rawRequesterId !== "") {
      requesterId = parseInt(String(rawRequesterId), 10);
      if (isNaN(requesterId) || requesterId <= 0) {
        res.status(400).json({
          error: "Requester ID is required to retrieve tickets",
          code: "MISSING_REQUESTER_ID",
        });
        return;
      }
    } else {
      res.status(400).json({
        error: "Requester ID is required to retrieve tickets",
        code: "MISSING_REQUESTER_ID",
      });
      return;
    }

    const prisma = getPrisma();

    // 2. Parse & sanitize pagination params
    let page = parseInt(String(req.query.page ?? "1"), 10);
    if (isNaN(page) || page < 1) page = 1;

    let pageSize = parseInt(String(req.query.pageSize ?? "10"), 10);
    if (isNaN(pageSize) || pageSize < 1) pageSize = 10;
    if (pageSize > 50) pageSize = 50;

    // 3. Build filter conditions
    const where: any = {};
    if (sessionUserId) {
      if (sessionRole === "REQUESTER") {
        where.requesterId = sessionUserId;
      } else if (req.query.requesterId) {
        const queryReqId = parseInt(String(req.query.requesterId), 10);
        if (!isNaN(queryReqId)) {
          where.requesterId = queryReqId;
        }
      }
    } else {
      where.requesterId = requesterId;
    }

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

    // Priority & Status Enum filters (includes all Lab 3 statuses)
    const validPriorities = ["LOW", "MEDIUM", "HIGH", "URGENT"];
    const validStatuses = [
      "NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER",
      "RESOLVED", "CLOSED", "REOPENED", "CANCELLED",
    ];

    if (req.query.requestedPriority && validPriorities.includes(String(req.query.requestedPriority))) {
      where.requestedPriority = String(req.query.requestedPriority);
    }

    if (req.query.itPriority && validPriorities.includes(String(req.query.itPriority))) {
      where.itPriority = String(req.query.itPriority);
    }

    if (req.query.status && validStatuses.includes(String(req.query.status))) {
      where.status = String(req.query.status);
    }

    // assignedTo filter — IT Staff / Admin only (BR-11)
    // Values: "UNASSIGNED" | "ME" | "<userId number>"
    if (sessionRole === "IT_STAFF" || sessionRole === "ADMINISTRATOR") {
      const assignedTo = req.query.assignedTo;
      if (assignedTo !== undefined && assignedTo !== "") {
        const assignedToStr = String(assignedTo).trim();
        if (assignedToStr === "UNASSIGNED") {
          where.ownerId = null;
        } else if (assignedToStr === "ME" && sessionUserId) {
          where.ownerId = sessionUserId;
        } else {
          const staffId = parseInt(assignedToStr, 10);
          if (!isNaN(staffId) && staffId > 0) {
            where.ownerId = staffId;
          }
        }
      }
    }

    // 4. Build sorting (itPriority added as valid sort field for IT Staff queue)
    const validSortFields = ["createdAt", "ticketNumber", "summary", "status", "requestedPriority", "itPriority", "updatedAt"];
    const sortBy = validSortFields.includes(String(req.query.sortBy)) ? String(req.query.sortBy) : "createdAt";
    const sortOrder = String(req.query.sortOrder).toLowerCase() === "asc" ? "asc" : "desc";

    const orderBy: any[] = [{ [sortBy]: sortOrder }];
    if (sortBy !== "createdAt") {
      orderBy.push({ createdAt: "desc" });
    }

    // 5. Query DB for total count and paginated items
    const totalItems = await prisma.ticket.count({ where });

    const skip = (page - 1) * pageSize;
    const isStaffOrAdmin = sessionRole === "IT_STAFF" || sessionRole === "ADMINISTRATOR";

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
        // Include requester & owner for IT Staff / Admin queue view
        ...(isStaffOrAdmin
          ? {
              requester: { select: { id: true, name: true, email: true } },
              owner: { select: { id: true, name: true, role: true } },
            }
          : {}),
      },
    });

    // 6. Calculate pagination metadata
    const totalPages = Math.ceil(totalItems / pageSize);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1 && totalPages > 0;

    // 7. Map payload items
    const data = tickets.map((t: any) => ({
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
      // IT Staff / Admin-only enriched fields
      ...(isStaffOrAdmin
        ? {
            requester: t.requester,
            owner: t.owner ?? null,
          }
        : {}),
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
    const sessionUserId = req.session?.userId;
    const sessionRole = req.session?.role;
    const rawRequesterId = req.headers["x-requester-id"] ?? req.query.requesterId;

    let requesterId: number | undefined;
    if (sessionUserId) {
      requesterId = sessionUserId;
    } else if (rawRequesterId !== undefined && rawRequesterId !== null && rawRequesterId !== "") {
      requesterId = parseInt(String(rawRequesterId), 10);
      if (isNaN(requesterId) || requesterId <= 0) {
        res.status(400).json({
          error: "Requester ID is required to retrieve ticket details",
          code: "MISSING_REQUESTER_ID",
        });
        return;
      }
    } else {
      res.status(400).json({
        error: "Requester ID is required to retrieve ticket details",
        code: "MISSING_REQUESTER_ID",
      });
      return;
    }

    const prisma = getPrisma();

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

    if (!ticket) {
      res.status(404).json({
        error: "Ticket not found",
        code: "TICKET_NOT_FOUND",
      });
      return;
    }

    // 4. Ownership verification
    if (sessionUserId) {
      if (sessionRole === "REQUESTER" && ticket.requesterId !== sessionUserId) {
        res.status(403).json({
          error: "Forbidden: you do not have permission to view this ticket",
          code: "FORBIDDEN_TICKET_ACCESS",
        });
        return;
      }
    } else {
      if (ticket.requesterId !== requesterId) {
        res.status(404).json({
          error: "Ticket not found or you do not have permission to view it",
          code: "TICKET_NOT_FOUND",
        });
        return;
      }
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
// Ticket Operations Endpoints (Lab 3 Issue #4 & IT Staff Workflow)
// ---------------------------------------------------------------------------

// PATCH /api/tickets/:id/claim — Claim ticket ownership (IT Staff & Admin ONLY)
app.patch("/api/tickets/:id/claim", async (req: Request, res: Response) => {
  try {
    const sessionUserId = req.session?.userId;
    const sessionRole = req.session?.role;
    if (!sessionUserId) {
      res.status(401).json({ error: "Unauthenticated access", code: "UNAUTHENTICATED" });
      return;
    }

    if (sessionRole !== "IT_STAFF" && sessionRole !== "ADMINISTRATOR") {
      res.status(403).json({ error: "Forbidden: role cannot claim tickets", code: "FORBIDDEN_ROLE" });
      return;
    }

    const ticketId = parseInt(String(req.params.id), 10);
    if (isNaN(ticketId) || ticketId <= 0) {
      res.status(400).json({ error: "Invalid ticket ID", code: "INVALID_TICKET_ID" });
      return;
    }

    const prisma = getPrisma();
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) {
      res.status(404).json({ error: "Ticket not found", code: "TICKET_NOT_FOUND" });
      return;
    }

    const updated = await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        ownerId: sessionUserId,
        status: ticket.status === "NEW" ? "OPEN" : ticket.status,
      },
      include: {
        owner: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    res.status(200).json({
      data: updated,
      message: "Ticket ownership claimed successfully",
    });
  } catch (_err) {
    res.status(500).json({ error: "Failed to claim ticket", code: "INTERNAL_SERVER_ERROR" });
  }
});

// PATCH /api/tickets/:id/assign — Assign ticket ownership (IT Staff & Admin ONLY)
app.patch("/api/tickets/:id/assign", async (req: Request, res: Response) => {
  try {
    const sessionUserId = req.session?.userId;
    const sessionRole = req.session?.role;
    if (!sessionUserId) {
      res.status(401).json({ error: "Unauthenticated access", code: "UNAUTHENTICATED" });
      return;
    }

    if (sessionRole !== "IT_STAFF" && sessionRole !== "ADMINISTRATOR") {
      res.status(403).json({ error: "Forbidden: role cannot assign tickets", code: "FORBIDDEN_ROLE" });
      return;
    }

    const ticketId = parseInt(String(req.params.id), 10);
    const { ownerId } = req.body || {};
    const targetOwnerId = parseInt(String(ownerId), 10);

    if (isNaN(ticketId) || isNaN(targetOwnerId)) {
      res.status(400).json({ error: "Invalid ticket ID or owner ID", code: "VALIDATION_ERROR" });
      return;
    }

    const prisma = getPrisma();
    const targetUser = await prisma.user.findUnique({ where: { id: targetOwnerId } });
    if (!targetUser || !targetUser.isActive || (targetUser.role !== "IT_STAFF" && targetUser.role !== "ADMINISTRATOR")) {
      res.status(400).json({ error: "Target owner must be an active IT Staff or Administrator", code: "INVALID_OWNER" });
      return;
    }

    const updated = await prisma.ticket.update({
      where: { id: ticketId },
      data: { ownerId: targetOwnerId },
      include: { owner: { select: { id: true, name: true } } },
    });

    res.status(200).json({ data: updated, message: "Ticket reassigned successfully" });
  } catch (_err) {
    res.status(500).json({ error: "Failed to assign ticket", code: "INTERNAL_SERVER_ERROR" });
  }
});

// PATCH /api/tickets/:id/priority — Update IT Priority (IT Staff & Admin ONLY)
app.patch("/api/tickets/:id/priority", async (req: Request, res: Response) => {
  try {
    const sessionUserId = req.session?.userId;
    const sessionRole = req.session?.role;
    if (!sessionUserId) {
      res.status(401).json({ error: "Unauthenticated access", code: "UNAUTHENTICATED" });
      return;
    }

    if (sessionRole !== "IT_STAFF" && sessionRole !== "ADMINISTRATOR") {
      res.status(403).json({ error: "Forbidden: role cannot update IT priority", code: "FORBIDDEN_ROLE" });
      return;
    }

    const ticketId = parseInt(String(req.params.id), 10);
    const { itPriority } = req.body || {};
    const validPriorities = ["LOW", "MEDIUM", "HIGH", "URGENT"];

    if (isNaN(ticketId) || !validPriorities.includes(String(itPriority))) {
      res.status(400).json({ error: "Invalid priority value", code: "VALIDATION_ERROR" });
      return;
    }

    const prisma = getPrisma();
    const updated = await prisma.ticket.update({
      where: { id: ticketId },
      data: { itPriority },
    });

    res.status(200).json({ data: updated, message: `IT Priority updated to ${itPriority}` });
  } catch (_err) {
    res.status(500).json({ error: "Failed to update IT priority", code: "INTERNAL_SERVER_ERROR" });
  }
});

// PATCH /api/tickets/:id/status — Update ticket status
app.patch("/api/tickets/:id/status", async (req: Request, res: Response) => {
  try {
    const sessionUserId = req.session?.userId;
    const sessionRole = req.session?.role;
    if (!sessionUserId) {
      res.status(401).json({ error: "Unauthenticated access", code: "UNAUTHENTICATED" });
      return;
    }

    const ticketId = parseInt(String(req.params.id), 10);
    if (isNaN(ticketId)) {
      res.status(400).json({ error: "Invalid ticket ID", code: "INVALID_TICKET_ID" });
      return;
    }

    const { status, resolutionSummary } = req.body || {};
    const prisma = getPrisma();
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });

    if (!ticket) {
      res.status(404).json({ error: "Ticket not found", code: "TICKET_NOT_FOUND" });
      return;
    }

    if (sessionRole === "REQUESTER") {
      if (ticket.requesterId !== sessionUserId) {
        res.status(403).json({ error: "Forbidden access", code: "FORBIDDEN_TICKET_ACCESS" });
        return;
      }
      // Requesters can only signal resolution (transition to RESOLVED) or REOPENED
      if (status !== "RESOLVED" && status !== "REOPENED" && status !== "IN_PROGRESS") {
        res.status(403).json({ error: "Requesters cannot set this status", code: "FORBIDDEN_STATUS_TRANSITION" });
        return;
      }
    }

    if (status === "RESOLVED" && (!resolutionSummary || String(resolutionSummary).trim().length < 5)) {
      res.status(422).json({
        error: "A valid resolution summary (at least 5 characters) is required to resolve a ticket",
        code: "RESOLUTION_SUMMARY_REQUIRED",
      });
      return;
    }

    const updated = await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        status,
        resolutionSummary: resolutionSummary ? String(resolutionSummary).trim() : ticket.resolutionSummary,
      },
    });

    res.status(200).json({ data: updated, message: `Ticket status updated to ${status}` });
  } catch (_err) {
    res.status(500).json({ error: "Failed to update ticket status", code: "INTERNAL_SERVER_ERROR" });
  }
});

// ---------------------------------------------------------------------------
// Public Comments & Internal Notes Endpoints
// ---------------------------------------------------------------------------

// GET /api/tickets/:id/comments — List Public Comments
app.get("/api/tickets/:id/comments", async (req: Request, res: Response) => {
  try {
    const sessionUserId = req.session?.userId;
    const sessionRole = req.session?.role;
    if (!sessionUserId) {
      res.status(401).json({ error: "Unauthenticated access", code: "UNAUTHENTICATED" });
      return;
    }

    const ticketId = parseInt(String(req.params.id), 10);
    const prisma = getPrisma();
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });

    if (!ticket) {
      res.status(404).json({ error: "Ticket not found", code: "TICKET_NOT_FOUND" });
      return;
    }

    if (sessionRole === "REQUESTER" && ticket.requesterId !== sessionUserId) {
      res.status(403).json({ error: "Forbidden access", code: "FORBIDDEN_TICKET_ACCESS" });
      return;
    }

    const comments = await prisma.publicComment.findMany({
      where: { ticketId },
      orderBy: { createdAt: "asc" },
      include: { author: { select: { id: true, name: true, role: true } } },
    });

    res.status(200).json(comments);
  } catch (_err) {
    res.status(500).json({ error: "Failed to fetch comments", code: "INTERNAL_SERVER_ERROR" });
  }
});

// POST /api/tickets/:id/comments — Add Public Comment
app.post("/api/tickets/:id/comments", async (req: Request, res: Response) => {
  try {
    const sessionUserId = req.session?.userId;
    const sessionRole = req.session?.role;
    if (!sessionUserId) {
      res.status(401).json({ error: "Unauthenticated access", code: "UNAUTHENTICATED" });
      return;
    }

    const ticketId = parseInt(String(req.params.id), 10);
    const { content } = req.body || {};
    const trimmed = typeof content === "string" ? content.trim() : "";

    if (!trimmed || trimmed.length > 1000) {
      res.status(400).json({ error: "Comment content must be between 1 and 1000 characters", code: "VALIDATION_ERROR" });
      return;
    }

    const prisma = getPrisma();
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });

    if (!ticket) {
      res.status(404).json({ error: "Ticket not found", code: "TICKET_NOT_FOUND" });
      return;
    }

    if (sessionRole === "REQUESTER" && ticket.requesterId !== sessionUserId) {
      res.status(403).json({ error: "Forbidden access", code: "FORBIDDEN_TICKET_ACCESS" });
      return;
    }

    const comment = await prisma.publicComment.create({
      data: {
        ticketId,
        authorId: sessionUserId,
        content: trimmed,
      },
      include: { author: { select: { id: true, name: true, role: true } } },
    });

    res.status(201).json({ data: comment, message: "Public comment posted" });
  } catch (_err) {
    res.status(500).json({ error: "Failed to post comment", code: "INTERNAL_SERVER_ERROR" });
  }
});

// GET /api/tickets/:id/notes — List Internal Notes (IT Staff & Admin ONLY)
app.get("/api/tickets/:id/notes", async (req: Request, res: Response) => {
  try {
    const sessionUserId = req.session?.userId;
    const sessionRole = req.session?.role;
    if (!sessionUserId) {
      res.status(401).json({ error: "Unauthenticated access", code: "UNAUTHENTICATED" });
      return;
    }

    if (sessionRole !== "IT_STAFF" && sessionRole !== "ADMINISTRATOR") {
      res.status(403).json({ error: "Forbidden: Requesters cannot access internal notes", code: "FORBIDDEN_ROLE" });
      return;
    }

    const ticketId = parseInt(String(req.params.id), 10);
    const prisma = getPrisma();
    const notes = await prisma.internalNote.findMany({
      where: { ticketId },
      orderBy: { createdAt: "asc" },
      include: { author: { select: { id: true, name: true, role: true } } },
    });

    res.status(200).json(notes);
  } catch (_err) {
    res.status(500).json({ error: "Failed to fetch internal notes", code: "INTERNAL_SERVER_ERROR" });
  }
});

// POST /api/tickets/:id/notes — Add Internal Note (IT Staff & Admin ONLY)
app.post("/api/tickets/:id/notes", async (req: Request, res: Response) => {
  try {
    const sessionUserId = req.session?.userId;
    const sessionRole = req.session?.role;
    if (!sessionUserId) {
      res.status(401).json({ error: "Unauthenticated access", code: "UNAUTHENTICATED" });
      return;
    }

    if (sessionRole !== "IT_STAFF" && sessionRole !== "ADMINISTRATOR") {
      res.status(403).json({ error: "Forbidden: Requesters cannot create internal notes", code: "FORBIDDEN_ROLE" });
      return;
    }

    const ticketId = parseInt(String(req.params.id), 10);
    const { content } = req.body || {};
    const trimmed = typeof content === "string" ? content.trim() : "";

    if (!trimmed || trimmed.length > 1000) {
      res.status(400).json({ error: "Note content must be between 1 and 1000 characters", code: "VALIDATION_ERROR" });
      return;
    }

    const prisma = getPrisma();
    const note = await prisma.internalNote.create({
      data: {
        ticketId,
        authorId: sessionUserId,
        content: trimmed,
      },
      include: { author: { select: { id: true, name: true, role: true } } },
    });

    res.status(201).json({ data: note, message: "Internal note recorded" });
  } catch (_err) {
    res.status(500).json({ error: "Failed to record internal note", code: "INTERNAL_SERVER_ERROR" });
  }
});

// ---------------------------------------------------------------------------
// User Management Endpoints (Admin ONLY)
// ---------------------------------------------------------------------------

// GET /api/users — List Users (Admin ONLY)
app.get("/api/users", async (req: Request, res: Response) => {
  try {
    const sessionUserId = req.session?.userId;
    const sessionRole = req.session?.role;
    if (!sessionUserId) {
      res.status(401).json({ error: "Unauthenticated access", code: "UNAUTHENTICATED" });
      return;
    }

    if (sessionRole !== "ADMINISTRATOR") {
      res.status(403).json({ error: "Forbidden: User management requires Administrator role", code: "FORBIDDEN_ROLE" });
      return;
    }

    const prisma = getPrisma();
    const users = await prisma.user.findMany({
      orderBy: { id: "asc" },
      select: {
        id: true,
        email: true,
        name: true,
        department: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
        createdAt: true,
      },
    });

    res.status(200).json(users);
  } catch (_err) {
    res.status(500).json({ error: "Failed to fetch users", code: "INTERNAL_SERVER_ERROR" });
  }
});

// ---------------------------------------------------------------------------
// Attachment Lifecycle Endpoints (Lab 2 Issue 7 + Lab 3 Security Migration)
// ---------------------------------------------------------------------------

// POST /api/tickets/:idOrNumber/attachments — Upload attachment to an owned ticket
app.post(
  "/api/tickets/:idOrNumber/attachments",
  upload.single("file"),
  async (req: Request, res: Response) => {
    try {
      const sessionUserId = req.session?.userId;
      const sessionRole = req.session?.role;
      const rawRequesterId = req.headers["x-requester-id"] ?? req.body.requesterId ?? req.query.requesterId;

      let requesterId: number;
      if (sessionUserId) {
        requesterId = sessionUserId;
      } else if (rawRequesterId !== undefined && rawRequesterId !== null && rawRequesterId !== "") {
        requesterId = parseInt(String(rawRequesterId), 10);
        if (isNaN(requesterId) || requesterId <= 0) {
          res.status(400).json({
            error: "Requester ID is required to upload attachments",
            code: "MISSING_REQUESTER_ID",
          });
          return;
        }
      } else {
        res.status(400).json({
          error: "Requester ID is required to upload attachments",
          code: "MISSING_REQUESTER_ID",
        });
        return;
      }

      const prisma = getPrisma();

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
    const sessionUserId = req.session?.userId;
    const sessionRole = req.session?.role;
    const rawRequesterId = req.headers["x-requester-id"] ?? req.query.requesterId;

    let requesterId: number;
    if (sessionUserId) {
      requesterId = sessionUserId;
    } else if (rawRequesterId !== undefined && rawRequesterId !== null && rawRequesterId !== "") {
      requesterId = parseInt(String(rawRequesterId), 10);
      if (isNaN(requesterId) || requesterId <= 0) {
        res.status(400).json({
          error: "Requester ID is required to fetch attachment metadata",
          code: "MISSING_REQUESTER_ID",
        });
        return;
      }
    } else {
      res.status(400).json({
        error: "Requester ID is required to fetch attachment metadata",
        code: "MISSING_REQUESTER_ID",
      });
      return;
    }

    const prisma = getPrisma();

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
    const sessionUserId = req.session?.userId;
    const sessionRole = req.session?.role;
    const rawRequesterId = req.headers["x-requester-id"] ?? req.query.requesterId;

    let requesterId: number;
    if (sessionUserId) {
      requesterId = sessionUserId;
    } else if (rawRequesterId !== undefined && rawRequesterId !== null && rawRequesterId !== "") {
      requesterId = parseInt(String(rawRequesterId), 10);
      if (isNaN(requesterId) || requesterId <= 0) {
        res.status(400).json({
          error: "Requester ID is required to download attachments",
          code: "MISSING_REQUESTER_ID",
        });
        return;
      }
    } else {
      res.status(400).json({
        error: "Requester ID is required to download attachments",
        code: "MISSING_REQUESTER_ID",
      });
      return;
    }

    const prisma = getPrisma();

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
    const sessionUserId = req.session?.userId;
    const sessionRole = req.session?.role;
    const rawRequesterId = req.headers["x-requester-id"] ?? req.body.requesterId ?? req.query.requesterId;

    let requesterId: number;
    if (sessionUserId) {
      requesterId = sessionUserId;
    } else if (rawRequesterId !== undefined && rawRequesterId !== null && rawRequesterId !== "") {
      requesterId = parseInt(String(rawRequesterId), 10);
      if (isNaN(requesterId) || requesterId <= 0) {
        res.status(400).json({
          error: "Requester ID is required to remove attachments",
          code: "MISSING_REQUESTER_ID",
        });
        return;
      }
    } else {
      res.status(400).json({
        error: "Requester ID is required to remove attachments",
        code: "MISSING_REQUESTER_ID",
      });
      return;
    }

    const prisma = getPrisma();

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
        removedByUserId: requesterId,
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



