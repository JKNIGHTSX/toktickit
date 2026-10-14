import { Request, Response, NextFunction } from "express";
import { UserRole } from "@prisma/client";
import { getPrisma } from "../prisma.js";

export interface AuthenticatedUser {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  mustChangePassword: boolean;
}

export async function getSessionUser(req: Request): Promise<AuthenticatedUser | null> {
  const userId = req.session?.userId;
  if (!userId) return null;

  const prisma = getPrisma();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      mustChangePassword: true,
    },
  });

  if (!user || !user.isActive) {
    return null;
  }

  return user;
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.userId) {
    res.status(401).json({
      error: "Unauthenticated access",
      code: "UNAUTHENTICATED",
    });
    return;
  }
  next();
}

export function requireRole(...allowedRoles: UserRole[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = await getSessionUser(req);
    if (!user) {
      res.status(401).json({
        error: "Unauthenticated access",
        code: "UNAUTHENTICATED",
      });
      return;
    }

    if (!allowedRoles.includes(user.role)) {
      res.status(403).json({
        error: "Forbidden: insufficient permissions for this operation",
        code: "FORBIDDEN_ROLE",
      });
      return;
    }

    next();
  };
}
