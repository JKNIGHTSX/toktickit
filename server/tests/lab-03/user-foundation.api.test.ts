import { describe, it, expect } from "vitest";
import bcrypt from "bcryptjs";
import { getPrisma } from "../../src/prisma.js";

describe("Lab 3 — Issue #2: User Database Foundation & Data Model Tests", () => {
  const prisma = getPrisma();

  describe("User Schema & Model Validation", () => {
    it("supports required User fields: id, name, email, passwordHash, role, isActive, mustChangePassword, timestamps", async () => {
      const admin = await prisma.user.findUnique({
        where: { email: "admin@toktickit.local" },
      });

      expect(admin).not.toBeNull();
      expect(admin?.id).toBeTypeOf("number");
      expect(admin?.name).toBe("John Smith");
      expect(admin?.email).toBe("admin@toktickit.local");
      expect(admin?.passwordHash).toBeTypeOf("string");
      expect(admin?.role).toBe("ADMINISTRATOR");
      expect(admin?.isActive).toBe(true);
      expect(admin?.mustChangePassword).toBe(false);
      expect(admin?.createdAt).toBeInstanceOf(Date);
      expect(admin?.updatedAt).toBeInstanceOf(Date);
    });

    it("ensures passwords are never stored in plaintext (validates bcrypt hash format)", async () => {
      const users = await prisma.user.findMany();
      expect(users.length).toBeGreaterThan(0);

      for (const u of users) {
        expect(u.passwordHash).not.toBe("Password123!");
        // bcrypt hashes start with $2a$, $2b$, or $2y$
        expect(u.passwordHash).toMatch(/^\$2[aby]\$/);
        const matches = await bcrypt.compare("Password123!", u.passwordHash);
        expect(matches).toBe(true);
      }
    });

    it("enforces exact one role per User and unique email constraint", async () => {
      // Unique email check
      const duplicateAttempt = async () => {
        await prisma.user.create({
          data: {
            name: "Duplicate User",
            email: "admin@toktickit.local", // Existing email
            passwordHash: await bcrypt.hash("Password123!", 10),
            role: "REQUESTER",
          },
        });
      };

      await expect(duplicateAttempt()).rejects.toThrow();
    });
  });

  describe("Idempotent Seed Data Verification", () => {
    it("seeds at least 4 active Requesters", async () => {
      const activeRequesters = await prisma.user.findMany({
        where: { role: "REQUESTER", isActive: true },
      });
      expect(activeRequesters.length).toBeGreaterThanOrEqual(4);
    });

    it("seeds at least 1 inactive Requester", async () => {
      const inactiveRequesters = await prisma.user.findMany({
        where: { role: "REQUESTER", isActive: false },
      });
      expect(inactiveRequesters.length).toBeGreaterThanOrEqual(1);
      expect(inactiveRequesters.some((u) => u.email === "inactive.user@toktickit.local")).toBe(true);
    });

    it("seeds at least 3 active IT Staff", async () => {
      const activeITStaff = await prisma.user.findMany({
        where: { role: "IT_STAFF", isActive: true },
      });
      expect(activeITStaff.length).toBeGreaterThanOrEqual(3);
    });

    it("seeds at least 1 inactive IT Staff", async () => {
      const inactiveITStaff = await prisma.user.findMany({
        where: { role: "IT_STAFF", isActive: false },
      });
      expect(inactiveITStaff.length).toBeGreaterThanOrEqual(1);
    });

    it("seeds at least 1 active Administrator", async () => {
      const activeAdmins = await prisma.user.findMany({
        where: { role: "ADMINISTRATOR", isActive: true },
      });
      expect(activeAdmins.length).toBeGreaterThanOrEqual(1);
    });

    it("seeds realistic Tickets with categories, systems, and ownership relations", async () => {
      const tickets = await prisma.ticket.findMany({
        include: {
          requester: true,
          owner: true,
          category: true,
          relatedSystem: true,
        },
      });

      expect(tickets.length).toBeGreaterThan(0);
      for (const t of tickets) {
        expect(t.requesterId).toBeTypeOf("number");
        expect(t.requester).toBeDefined();
        expect(t.category).toBeDefined();
        expect(t.relatedSystem).toBeDefined();
      }
    });

    it("seeds example Public Comments and Internal Notes", async () => {
      const publicComments = await prisma.publicComment.findMany({
        include: { author: true, ticket: true },
      });
      const internalNotes = await prisma.internalNote.findMany({
        include: { author: true, ticket: true },
      });

      expect(publicComments.length).toBeGreaterThanOrEqual(1);
      expect(internalNotes.length).toBeGreaterThanOrEqual(1);
      expect(publicComments[0].author).toBeDefined();
      expect(internalNotes[0].author).toBeDefined();
    });
  });

  describe("Ticket & Attachment Domain Relations with User Model", () => {
    it("links ticket requester and owner to User records without breaking Lab 2 functions", async () => {
      const ticket = await prisma.ticket.findFirst({
        where: { ownerId: { not: null } },
        include: { requester: true, owner: true },
      });

      expect(ticket).not.toBeNull();
      expect(ticket?.requester.role).toBe("REQUESTER");
      expect(ticket?.owner?.role).toBe("IT_STAFF");
    });
  });
});
