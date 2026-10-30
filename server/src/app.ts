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
import { validateTicketInput, validateActionTakenInput } from "./utils/validators.js";
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

const VALID_TICKET_STATUSES = [
  "NEW",
  "OPEN",
  "IN_PROGRESS",
  "WAITING_FOR_REQUESTER",
  "RESOLVED",
  "CLOSED",
  "REOPENED",
  "CANCELLED",
] as const;

const VALID_PRIORITY_LEVELS = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

export const STATUS_TRANSITIONS: Record<string, string[]> = {
  NEW: ["OPEN", "CANCELLED"],
  OPEN: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
  WAITING_FOR_REQUESTER: ["IN_PROGRESS", "CANCELLED"],
  RESOLVED: ["CLOSED", "REOPENED", "CANCELLED"],
  REOPENED: ["IN_PROGRESS", "CANCELLED"],
  CANCELLED: [],
  CLOSED: [],
};

export const REQUESTER_ALLOWED_STATUS_UPDATES: Record<string, string[]> = {
  IN_PROGRESS: ["IN_PROGRESS"],
  WAITING_FOR_REQUESTER: ["IN_PROGRESS"],
  RESOLVED: ["REOPENED"],
  REOPENED: ["IN_PROGRESS"],
};

export const isRoleStaffOrAdmin = (role?: string) => role === "IT_STAFF" || role === "ADMINISTRATOR";

export const isValidStatusTransition = (currentStatus: string, nextStatus: string) => {
  const transitions = STATUS_TRANSITIONS[currentStatus] ?? [];
  return transitions.includes(nextStatus);
};

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

    if (!sessionUserId) {
      res.status(401).json({
        error: "Unauthenticated access",
        code: "UNAUTHENTICATED",
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
    if (sessionRole === "REQUESTER" && ticket.requesterId !== sessionUserId) {
      res.status(404).json({
        error: "Ticket not found or you do not have permission to view it",
        code: "TICKET_NOT_FOUND",
      });
      return;
    }

    if (sessionRole !== "REQUESTER" && !isRoleStaffOrAdmin(sessionRole)) {
      res.status(403).json({
        error: "Forbidden: role cannot view tickets",
        code: "FORBIDDEN_ROLE",
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

    if (!isRoleStaffOrAdmin(sessionRole)) {
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

    if (ticket.ownerId !== null && ticket.ownerId !== sessionUserId) {
      res.status(409).json({ error: "Ticket is already assigned to another IT staff member", code: "TICKET_ALREADY_ASSIGNED" });
      return;
    }

    const nextStatus = ticket.status === "NEW" ? "OPEN" : ticket.status;
    if (ticket.status === "CLOSED" || ticket.status === "CANCELLED") {
      res.status(409).json({ error: "Ticket is no longer claimable", code: "TICKET_NOT_CLAIMABLE" });
      return;
    }

    const updated = await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        ownerId: sessionUserId,
        status: nextStatus,
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

// GET /api/assignable-users — Active ticket owners for IT Staff / Admin
app.get("/api/assignable-users", async (req: Request, res: Response) => {
  try {
    const sessionUserId = req.session?.userId;
    const sessionRole = req.session?.role;
    if (!sessionUserId) {
      res.status(401).json({ error: "Unauthenticated access", code: "UNAUTHENTICATED" });
      return;
    }

    if (!isRoleStaffOrAdmin(sessionRole)) {
      res.status(403).json({ error: "Forbidden: role cannot view assignable users", code: "FORBIDDEN_ROLE" });
      return;
    }

    const users = await getPrisma().user.findMany({
      where: {
        isActive: true,
        role: { in: ["IT_STAFF", "ADMINISTRATOR"] },
      },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true, role: true, isActive: true },
    });

    res.status(200).json(users);
  } catch (_err) {
    res.status(500).json({ error: "Failed to fetch assignable users", code: "INTERNAL_SERVER_ERROR" });
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

    if (!isRoleStaffOrAdmin(sessionRole)) {
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
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) {
      res.status(404).json({ error: "Ticket not found", code: "TICKET_NOT_FOUND" });
      return;
    }

    const targetUser = await prisma.user.findUnique({ where: { id: targetOwnerId } });
    if (!targetUser || !targetUser.isActive || (targetUser.role !== "IT_STAFF" && targetUser.role !== "ADMINISTRATOR")) {
      res.status(400).json({ error: "Target owner must be an active IT Staff or Administrator", code: "INVALID_OWNER" });
      return;
    }

    if (ticket.status === "CLOSED" || ticket.status === "CANCELLED") {
      res.status(409).json({ error: "Ticket ownership cannot be reassigned after closure", code: "TICKET_NOT_ASSIGNABLE" });
      return;
    }

    const updated = await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        ownerId: targetOwnerId,
        status: ticket.status === "NEW" ? "OPEN" : ticket.status,
      },
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

    if (!isRoleStaffOrAdmin(sessionRole)) {
      res.status(403).json({ error: "Forbidden: role cannot update IT priority", code: "FORBIDDEN_ROLE" });
      return;
    }

    const ticketId = parseInt(String(req.params.id), 10);
    const { itPriority } = req.body || {};

    if (isNaN(ticketId) || !VALID_PRIORITY_LEVELS.includes(String(itPriority) as any)) {
      res.status(400).json({ error: "Invalid priority value", code: "VALIDATION_ERROR" });
      return;
    }

    const prisma = getPrisma();
    const existingTicket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!existingTicket) {
      res.status(404).json({ error: "Ticket not found", code: "TICKET_NOT_FOUND" });
      return;
    }

    const updated = await prisma.ticket.update({
      where: { id: ticketId },
      data: { itPriority: String(itPriority).toUpperCase() as any },
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
    const requestedStatus = typeof status === "string" ? status.trim().toUpperCase() : "";

    if (!requestedStatus || !(VALID_TICKET_STATUSES as readonly string[]).includes(requestedStatus)) {
      res.status(400).json({ error: "Invalid ticket status", code: "VALIDATION_ERROR" });
      return;
    }

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

      const allowedStatuses = REQUESTER_ALLOWED_STATUS_UPDATES[ticket.status] ?? [];
      if (!allowedStatuses.includes(requestedStatus)) {
        res.status(403).json({ error: "Requesters cannot set this status", code: "FORBIDDEN_STATUS_TRANSITION" });
        return;
      }
    } else if (isRoleStaffOrAdmin(sessionRole)) {
      if (!isValidStatusTransition(ticket.status, requestedStatus)) {
        res.status(422).json({
          error: `Invalid status transition from ${ticket.status} to ${requestedStatus}`,
          code: "INVALID_STATUS_TRANSITION",
        });
        return;
      }
    } else {
      res.status(403).json({ error: "Forbidden access", code: "FORBIDDEN_ROLE" });
      return;
    }

    if (requestedStatus === "RESOLVED" && (!resolutionSummary || String(resolutionSummary).trim().length < 5)) {
      res.status(422).json({
        error: "A valid resolution summary (at least 5 characters) is required to resolve a ticket",
        code: "RESOLUTION_SUMMARY_REQUIRED",
      });
      return;
    }

    if (requestedStatus === "CLOSED" && ticket.status !== "RESOLVED") {
      res.status(422).json({
        error: "A resolved ticket is required before it can be closed",
        code: "INVALID_STATUS_TRANSITION",
      });
      return;
    }

    if (requestedStatus === "CANCELLED" && ticket.status === "CLOSED") {
      res.status(422).json({
        error: "A closed ticket cannot be cancelled",
        code: "INVALID_STATUS_TRANSITION",
      });
      return;
    }

    const updated = await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        status: requestedStatus as any,
        resolutionSummary: requestedStatus === "RESOLVED" || requestedStatus === "CLOSED"
          ? resolutionSummary
            ? String(resolutionSummary).trim()
            : ticket.resolutionSummary
          : ticket.resolutionSummary,
      },
    });

    res.status(200).json({ data: updated, message: `Ticket status updated to ${requestedStatus}` });
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

    const ticketId = Number(String(req.params.id));
    if (!Number.isInteger(ticketId) || ticketId <= 0) {
      res.status(400).json({ error: "Invalid ticket ID", code: "INVALID_TICKET_ID" });
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
    if (sessionRole !== "REQUESTER" && !isRoleStaffOrAdmin(sessionRole)) {
      res.status(403).json({ error: "Forbidden access", code: "FORBIDDEN_ROLE" });
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

    const ticketId = Number(String(req.params.id));
    const { content } = req.body || {};
    const trimmed = typeof content === "string" ? content.trim() : "";

    if (!Number.isInteger(ticketId) || ticketId <= 0) {
      res.status(400).json({ error: "Invalid ticket ID", code: "INVALID_TICKET_ID" });
      return;
    }
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
    if (sessionRole !== "REQUESTER" && !isRoleStaffOrAdmin(sessionRole)) {
      res.status(403).json({ error: "Forbidden access", code: "FORBIDDEN_ROLE" });
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

    const ticketId = Number(String(req.params.id));
    if (!Number.isInteger(ticketId) || ticketId <= 0) {
      res.status(400).json({ error: "Invalid ticket ID", code: "INVALID_TICKET_ID" });
      return;
    }
    const prisma = getPrisma();
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId }, select: { id: true } });
    if (!ticket) {
      res.status(404).json({ error: "Ticket not found", code: "TICKET_NOT_FOUND" });
      return;
    }
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

    const ticketId = Number(String(req.params.id));
    const { content } = req.body || {};
    const trimmed = typeof content === "string" ? content.trim() : "";

    if (!Number.isInteger(ticketId) || ticketId <= 0) {
      res.status(400).json({ error: "Invalid ticket ID", code: "INVALID_TICKET_ID" });
      return;
    }
    if (!trimmed || trimmed.length > 1000) {
      res.status(400).json({ error: "Note content must be between 1 and 1000 characters", code: "VALIDATION_ERROR" });
      return;
    }

    const prisma = getPrisma();
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId }, select: { id: true } });
    if (!ticket) {
      res.status(404).json({ error: "Ticket not found", code: "TICKET_NOT_FOUND" });
      return;
    }
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
// Actions Taken Endpoints (Lab 4 Issue 2)
// ---------------------------------------------------------------------------

// GET /api/tickets/:id/actions — List Actions Taken for Ticket
app.get("/api/tickets/:id/actions", async (req: Request, res: Response) => {
  try {
    const sessionUserId = req.session?.userId;
    const sessionRole = req.session?.role;
    if (!sessionUserId) {
      res.status(401).json({ error: "Unauthenticated access", code: "UNAUTHENTICATED" });
      return;
    }

    const ticketId = Number(String(req.params.id));
    if (!Number.isInteger(ticketId) || ticketId <= 0) {
      res.status(400).json({ error: "Invalid ticket ID", code: "INVALID_TICKET_ID" });
      return;
    }

    const prisma = getPrisma();
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { id: true, requesterId: true },
    });

    if (!ticket) {
      res.status(404).json({ error: "Ticket not found", code: "TICKET_NOT_FOUND" });
      return;
    }

    // Role check: Requester can only view actions on owned tickets
    if (sessionRole === "REQUESTER" && ticket.requesterId !== sessionUserId) {
      res.status(403).json({ error: "Forbidden access", code: "FORBIDDEN_TICKET_ACCESS" });
      return;
    }

    if (sessionRole !== "REQUESTER" && !isRoleStaffOrAdmin(sessionRole)) {
      res.status(403).json({ error: "Forbidden access", code: "FORBIDDEN_ROLE" });
      return;
    }

    const actions = await prisma.actionTaken.findMany({
      where: { ticketId },
      orderBy: { actionDateTime: "desc" },
      include: {
        performedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    res.status(200).json({ data: actions });
  } catch (_err) {
    console.error("GET /api/tickets/:id/actions error:", _err);
    res.status(500).json({ error: "Failed to fetch actions taken", code: "INTERNAL_SERVER_ERROR" });
  }
});

// POST /api/tickets/:id/actions — Create Action Taken
app.post("/api/tickets/:id/actions", async (req: Request, res: Response) => {
  try {
    const sessionUserId = req.session?.userId;
    const sessionRole = req.session?.role;
    if (!sessionUserId) {
      res.status(401).json({ error: "Unauthenticated access", code: "UNAUTHENTICATED" });
      return;
    }

    // Role check: IT_STAFF and ADMINISTRATOR only
    if (!isRoleStaffOrAdmin(sessionRole)) {
      res.status(403).json({
        error: "Forbidden: Only IT Staff and Administrators can record Actions Taken",
        code: "FORBIDDEN",
      });
      return;
    }

    const ticketId = Number(String(req.params.id));
    if (!Number.isInteger(ticketId) || ticketId <= 0) {
      res.status(400).json({ error: "Invalid ticket ID", code: "INVALID_TICKET_ID" });
      return;
    }

    const prisma = getPrisma();
    const user = await prisma.user.findUnique({
      where: { id: sessionUserId },
      select: { id: true, isActive: true },
    });

    if (!user || !user.isActive) {
      res.status(403).json({
        error: "Forbidden: Inactive users cannot perform actions",
        code: "FORBIDDEN",
      });
      return;
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { id: true, status: true },
    });

    if (!ticket) {
      res.status(404).json({ error: "Ticket not found", code: "TICKET_NOT_FOUND" });
      return;
    }

    if (ticket.status === "CLOSED") {
      res.status(422).json({
        error: "Cannot add actions taken to a closed ticket",
        code: "TICKET_CLOSED",
      });
      return;
    }

    const validation = validateActionTakenInput(req.body || {});
    if (!validation.isValid) {
      res.status(400).json({
        error: validation.errors[0]?.message || "Validation failed",
        code: validation.code || "VALIDATION_ERROR",
        details: validation.errors,
      });
      return;
    }

    const created = await prisma.actionTaken.create({
      data: {
        ticketId,
        performedById: sessionUserId, // Always bound from authenticated session
        actionDateTime: validation.sanitized.actionDateTime,
        actionDescription: validation.sanitized.actionDescription,
        result: validation.sanitized.result,
        isFollowUpRequired: validation.sanitized.isFollowUpRequired,
        followUpNote: validation.sanitized.followUpNote,
        attachmentNotes: validation.sanitized.attachmentNotes,
      },
      include: {
        performedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    res.status(201).json({
      data: created,
      message: "Action taken recorded successfully",
    });
  } catch (_err) {
    console.error("POST /api/tickets/:id/actions error:", _err);
    res.status(500).json({ error: "Failed to create action taken", code: "INTERNAL_SERVER_ERROR" });
  }
});

// GET /api/actions/:id — Get single Action Taken record
app.get("/api/actions/:id", async (req: Request, res: Response) => {
  try {
    const sessionUserId = req.session?.userId;
    const sessionRole = req.session?.role;
    if (!sessionUserId) {
      res.status(401).json({ error: "Unauthenticated access", code: "UNAUTHENTICATED" });
      return;
    }

    const actionId = Number(String(req.params.id));
    if (!Number.isInteger(actionId) || actionId <= 0) {
      res.status(400).json({ error: "Invalid action ID", code: "INVALID_ACTION_ID" });
      return;
    }

    const prisma = getPrisma();
    const action = await prisma.actionTaken.findUnique({
      where: { id: actionId },
      include: {
        ticket: { select: { id: true, requesterId: true } },
        performedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (!action) {
      res.status(404).json({ error: "Action taken not found", code: "ACTION_NOT_FOUND" });
      return;
    }

    if (sessionRole === "REQUESTER" && action.ticket.requesterId !== sessionUserId) {
      res.status(403).json({ error: "Forbidden access", code: "FORBIDDEN_TICKET_ACCESS" });
      return;
    }

    if (sessionRole !== "REQUESTER" && !isRoleStaffOrAdmin(sessionRole)) {
      res.status(403).json({ error: "Forbidden access", code: "FORBIDDEN_ROLE" });
      return;
    }

    const { ticket: _ticket, ...actionData } = action;
    res.status(200).json({ data: actionData });
  } catch (_err) {
    console.error("GET /api/actions/:id error:", _err);
    res.status(500).json({ error: "Failed to fetch action taken", code: "INTERNAL_SERVER_ERROR" });
  }
});

// PATCH /api/actions/:id — Update Action Taken record
app.patch("/api/actions/:id", async (req: Request, res: Response) => {
  try {
    const sessionUserId = req.session?.userId;
    const sessionRole = req.session?.role;
    if (!sessionUserId) {
      res.status(401).json({ error: "Unauthenticated access", code: "UNAUTHENTICATED" });
      return;
    }

    if (!isRoleStaffOrAdmin(sessionRole)) {
      res.status(403).json({
        error: "Forbidden: Only IT Staff and Administrators can update Actions Taken",
        code: "FORBIDDEN",
      });
      return;
    }

    const actionId = Number(String(req.params.id));
    if (!Number.isInteger(actionId) || actionId <= 0) {
      res.status(400).json({ error: "Invalid action ID", code: "INVALID_ACTION_ID" });
      return;
    }

    const prisma = getPrisma();
    const user = await prisma.user.findUnique({
      where: { id: sessionUserId },
      select: { id: true, isActive: true },
    });

    if (!user || !user.isActive) {
      res.status(403).json({
        error: "Forbidden: Inactive users cannot perform actions",
        code: "FORBIDDEN",
      });
      return;
    }

    const existingAction = await prisma.actionTaken.findUnique({
      where: { id: actionId },
    });

    if (!existingAction) {
      res.status(404).json({ error: "Action taken not found", code: "ACTION_NOT_FOUND" });
      return;
    }

    // Optimistic Concurrency Check
    const { expectedUpdatedAt } = req.body || {};
    if (expectedUpdatedAt !== undefined) {
      const clientTimestamp = new Date(expectedUpdatedAt).getTime();
      const serverTimestamp = existingAction.updatedAt.getTime();
      // Compare with 1000ms window as specified
      if (isNaN(clientTimestamp) || Math.abs(clientTimestamp - serverTimestamp) > 1000) {
        res.status(409).json({
          error: "Action Taken record has been modified by another user. Please refresh and try again.",
          code: "STALE_UPDATE_CONFLICT",
        });
        return;
      }
    }

    // Merge existing values for fields not provided
    const mergedInput: any = {
      actionDescription: req.body.actionDescription !== undefined ? req.body.actionDescription : existingAction.actionDescription,
      result: req.body.result !== undefined ? req.body.result : existingAction.result,
      isFollowUpRequired: req.body.isFollowUpRequired !== undefined ? req.body.isFollowUpRequired : existingAction.isFollowUpRequired,
      followUpNote: req.body.followUpNote !== undefined ? req.body.followUpNote : existingAction.followUpNote,
      attachmentNotes: req.body.attachmentNotes !== undefined ? req.body.attachmentNotes : existingAction.attachmentNotes,
      actionDateTime: req.body.actionDateTime !== undefined ? req.body.actionDateTime : existingAction.actionDateTime.toISOString(),
    };

    const validation = validateActionTakenInput(mergedInput, { isUpdate: true });
    if (!validation.isValid) {
      res.status(400).json({
        error: validation.errors[0]?.message || "Validation failed",
        code: validation.code || "VALIDATION_ERROR",
        details: validation.errors,
      });
      return;
    }

    const updated = await prisma.actionTaken.update({
      where: { id: actionId },
      data: {
        actionDescription: validation.sanitized.actionDescription,
        result: validation.sanitized.result,
        isFollowUpRequired: validation.sanitized.isFollowUpRequired,
        followUpNote: validation.sanitized.followUpNote,
        attachmentNotes: validation.sanitized.attachmentNotes,
        actionDateTime: validation.sanitized.actionDateTime,
      },
      include: {
        performedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    res.status(200).json({
      data: updated,
      message: "Action taken updated successfully",
    });
  } catch (_err) {
    console.error("PATCH /api/actions/:id error:", _err);
    res.status(500).json({ error: "Failed to update action taken", code: "INTERNAL_SERVER_ERROR" });
  }
});

// POST /api/tickets/:id/problem-appears-resolved — Requester resolution indication
app.post("/api/tickets/:id/problem-appears-resolved", async (req: Request, res: Response) => {
  try {
    const sessionUserId = req.session?.userId;
    const sessionRole = req.session?.role;
    if (!sessionUserId) {
      res.status(401).json({ error: "Unauthenticated access", code: "UNAUTHENTICATED" });
      return;
    }
    if (sessionRole !== "REQUESTER") {
      res.status(403).json({ error: "Only Requesters can submit this indication", code: "FORBIDDEN_ROLE" });
      return;
    }

    const ticketId = Number(String(req.params.id));
    if (!Number.isInteger(ticketId) || ticketId <= 0) {
      res.status(400).json({ error: "Invalid ticket ID", code: "INVALID_TICKET_ID" });
      return;
    }

    const prisma = getPrisma();
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) {
      res.status(404).json({ error: "Ticket not found", code: "TICKET_NOT_FOUND" });
      return;
    }
    if (ticket.requesterId !== sessionUserId) {
      res.status(403).json({ error: "Forbidden access", code: "FORBIDDEN_TICKET_ACCESS" });
      return;
    }
    if (ticket.status !== "IN_PROGRESS" && ticket.status !== "WAITING_FOR_REQUESTER") {
      res.status(422).json({ error: "The ticket is not in a state that can be marked as resolved", code: "INVALID_STATUS_TRANSITION" });
      return;
    }

    const content = "The requester indicates that the problem appears resolved.";
    const [updatedTicket, comment] = await prisma.$transaction([
      prisma.ticket.update({ where: { id: ticketId }, data: { status: "RESOLVED" } }),
      prisma.publicComment.create({
        data: { ticketId, authorId: sessionUserId, content },
        include: { author: { select: { id: true, name: true, role: true } } },
      }),
    ]);

    res.status(200).json({ data: { ticket: updatedTicket, comment }, message: "Problem marked as appearing resolved" });
  } catch (_err) {
    res.status(500).json({ error: "Failed to record resolution indication", code: "INTERNAL_SERVER_ERROR" });
  }
});

// ---------------------------------------------------------------------------
// User Management Endpoints (Admin ONLY)
// ---------------------------------------------------------------------------

// GET /api/users — List Users with optional search and role filter (Admin ONLY)
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

    const { search, role } = req.query;

    const VALID_USER_ROLES = ["REQUESTER", "IT_STAFF", "ADMINISTRATOR"];
    if (role && (typeof role !== "string" || !VALID_USER_ROLES.includes(role))) {
      res.status(400).json({
        error: "Invalid role filter",
        code: "INVALID_ROLE",
      });
      return;
    }

    const where: any = {};
    if (role) {
      where.role = role;
    }

    if (search && typeof search === "string" && search.trim()) {
      const term = search.trim();
      where.OR = [
        { name: { contains: term, mode: "insensitive" } },
        { email: { contains: term, mode: "insensitive" } },
      ];
    }

    const prisma = getPrisma();
    const users = await prisma.user.findMany({
      where,
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

// GET /api/users/:id — Get User Detail (Admin ONLY)
app.get("/api/users/:id", async (req: Request, res: Response) => {
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

    const targetUserId = parseInt(req.params.id, 10);
    if (isNaN(targetUserId)) {
      res.status(400).json({ error: "Invalid user ID", code: "INVALID_ID" });
      return;
    }

    const prisma = getPrisma();
    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
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

    if (!user) {
      res.status(404).json({ error: "User not found", code: "USER_NOT_FOUND" });
      return;
    }

    res.status(200).json({ data: user });
  } catch (_err) {
    res.status(500).json({ error: "Failed to fetch user", code: "INTERNAL_SERVER_ERROR" });
  }
});

// POST /api/users — Create User with one role & initial password (Admin ONLY)
app.post("/api/users", async (req: Request, res: Response) => {
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

    const { name, email, role, isActive, initialPassword } = req.body || {};

    // Validate name
    if (!name || typeof name !== "string" || !name.trim()) {
      res.status(400).json({
        error: "Validation failed",
        code: "VALIDATION_ERROR",
        details: [{ field: "name", message: "Full name is required" }],
      });
      return;
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || typeof email !== "string" || !emailRegex.test(email.trim())) {
      res.status(400).json({
        error: "Validation failed",
        code: "VALIDATION_ERROR",
        details: [{ field: "email", message: "Valid email address is required" }],
      });
      return;
    }

    // Validate role (exactly one permitted role)
    const VALID_USER_ROLES = ["REQUESTER", "IT_STAFF", "ADMINISTRATOR"];
    if (!role || typeof role !== "string" || !VALID_USER_ROLES.includes(role)) {
      res.status(400).json({
        error: "Validation failed",
        code: "VALIDATION_ERROR",
        details: [{ field: "role", message: "Role must be exactly one of: REQUESTER, IT_STAFF, ADMINISTRATOR" }],
      });
      return;
    }

    // Validate initialPassword
    if (!initialPassword || typeof initialPassword !== "string") {
      res.status(400).json({
        error: "Validation failed",
        code: "VALIDATION_ERROR",
        details: [{ field: "initialPassword", message: "Initial password is required" }],
      });
      return;
    }

    const policy = validatePasswordPolicy(initialPassword);
    if (!policy.isValid) {
      res.status(400).json({
        error: "Password policy violation",
        code: "VALIDATION_ERROR",
        details: [{ field: "initialPassword", message: policy.errors.join("; ") }],
      });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const prisma = getPrisma();

    // Check duplicate email
    const existing = await prisma.user.findFirst({
      where: {
        email: {
          equals: cleanEmail,
          mode: "insensitive",
        },
      },
    });

    if (existing) {
      res.status(409).json({
        error: "Email is already registered",
        code: "EMAIL_ALREADY_EXISTS",
        details: [{ field: "email", message: "Email is already registered" }],
      });
      return;
    }

    const passwordHash = await bcrypt.hash(initialPassword, 10);
    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        email: cleanEmail,
        role: role as any,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
        passwordHash,
        mustChangePassword: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
        createdAt: true,
      },
    });

    res.status(201).json({
      data: newUser,
      message: "User account created successfully",
    });
  } catch (_err) {
    console.error("POST /api/users error:", _err);
    res.status(500).json({ error: "Failed to create user", code: "INTERNAL_SERVER_ERROR" });
  }
});

// PATCH /api/users/:id — Update User (Name, Email, Role, Activation) (Admin ONLY)
app.patch("/api/users/:id", async (req: Request, res: Response) => {
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

    const targetUserId = parseInt(req.params.id, 10);
    if (isNaN(targetUserId)) {
      res.status(400).json({ error: "Invalid user ID", code: "INVALID_ID" });
      return;
    }

    const prisma = getPrisma();
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      res.status(404).json({ error: "User not found", code: "USER_NOT_FOUND" });
      return;
    }

    const { name, email, role, isActive } = req.body || {};

    // Validate name if provided
    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        res.status(400).json({
          error: "Name cannot be empty",
          code: "VALIDATION_ERROR",
          details: [{ field: "name", message: "Name cannot be empty" }],
        });
        return;
      }
    }

    // Validate role if provided
    const VALID_USER_ROLES = ["REQUESTER", "IT_STAFF", "ADMINISTRATOR"];
    if (role !== undefined) {
      if (typeof role !== "string" || !VALID_USER_ROLES.includes(role)) {
        res.status(400).json({
          error: "Invalid role value",
          code: "INVALID_ROLE",
          details: [{ field: "role", message: "Role must be exactly one of: REQUESTER, IT_STAFF, ADMINISTRATOR" }],
        });
        return;
      }
    }

    // Validate email if provided
    if (email !== undefined) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (typeof email !== "string" || !emailRegex.test(email.trim())) {
        res.status(400).json({
          error: "Valid email is required",
          code: "VALIDATION_ERROR",
          details: [{ field: "email", message: "Valid email address is required" }],
        });
        return;
      }

      const cleanEmail = email.trim().toLowerCase();
      if (cleanEmail !== targetUser.email.toLowerCase()) {
        const dup = await prisma.user.findFirst({
          where: {
            email: { equals: cleanEmail, mode: "insensitive" },
            id: { not: targetUserId },
          },
        });
        if (dup) {
          res.status(409).json({
            error: "Email is already registered",
            code: "EMAIL_ALREADY_EXISTS",
            details: [{ field: "email", message: "Email is already registered" }],
          });
          return;
        }
      }
    }

    // Guardrail: Cannot deactivate own Administrator account
    if (isActive === false && targetUserId === sessionUserId) {
      res.status(400).json({
        error: "Cannot deactivate your own active Administrator account",
        code: "SELF_DEACTIVATION_FORBIDDEN",
      });
      return;
    }

    // Guardrail: Cannot remove or deactivate the last active Administrator
    const isDeactivating = isActive === false;
    const isDemotingAdmin = role !== undefined && role !== "ADMINISTRATOR";

    if (targetUser.role === "ADMINISTRATOR" && targetUser.isActive && (isDeactivating || isDemotingAdmin)) {
      const activeAdminCount = await prisma.user.count({
        where: {
          role: "ADMINISTRATOR",
          isActive: true,
        },
      });

      if (activeAdminCount <= 1) {
        res.status(400).json({
          error: "Cannot remove or deactivate the last active Administrator. At least one active Administrator must remain.",
          code: "LAST_ADMIN_PROTECTION",
        });
        return;
      }
    }

    const updated = await prisma.user.update({
      where: { id: targetUserId },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(email !== undefined && { email: email.trim().toLowerCase() }),
        ...(role !== undefined && { role: role as any }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
        createdAt: true,
      },
    });

    res.status(200).json({
      data: updated,
      message: "User updated successfully",
    });
  } catch (_err) {
    console.error("PATCH /api/users/:id error:", _err);
    res.status(500).json({ error: "Failed to update user", code: "INTERNAL_SERVER_ERROR" });
  }
});

// POST /api/users/:id/reset-password — Set new initial password requiring change at next login (Admin ONLY)
app.post("/api/users/:id/reset-password", async (req: Request, res: Response) => {
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

    const targetUserId = parseInt(req.params.id, 10);
    if (isNaN(targetUserId)) {
      res.status(400).json({ error: "Invalid user ID", code: "INVALID_ID" });
      return;
    }

    const prisma = getPrisma();
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      res.status(404).json({ error: "User not found", code: "USER_NOT_FOUND" });
      return;
    }

    const { initialPassword } = req.body || {};
    if (!initialPassword || typeof initialPassword !== "string") {
      res.status(400).json({
        error: "Validation failed",
        code: "VALIDATION_ERROR",
        details: [{ field: "initialPassword", message: "Initial password is required" }],
      });
      return;
    }

    const policy = validatePasswordPolicy(initialPassword);
    if (!policy.isValid) {
      res.status(400).json({
        error: "Password policy violation",
        code: "VALIDATION_ERROR",
        details: [{ field: "initialPassword", message: policy.errors.join("; ") }],
      });
      return;
    }

    const passwordHash = await bcrypt.hash(initialPassword, 10);
    await prisma.user.update({
      where: { id: targetUserId },
      data: {
        passwordHash,
        mustChangePassword: true,
      },
    });

    res.status(200).json({
      message: "New initial password set. User will be required to change it at next login.",
    });
  } catch (_err) {
    console.error("POST /api/users/:id/reset-password error:", _err);
    res.status(500).json({ error: "Failed to reset initial password", code: "INTERNAL_SERVER_ERROR" });
  }
});

// DELETE /api/users/:id — Hard deletion is prohibited by Business Rule (BR-25)
app.delete("/api/users/:id", async (req: Request, res: Response) => {
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

  res.status(400).json({
    error: "User deletion is not permitted. Deactivate account instead.",
    code: "USER_DELETION_FORBIDDEN",
  });
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



