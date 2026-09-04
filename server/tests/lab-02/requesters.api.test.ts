import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

describe("Lab 2 — Issue #1: Development Requester API & Seed Tests", () => {
  describe("GET /api/requesters", () => {
    it("returns HTTP 200 with active development requesters", async () => {
      const res = await request(app).get("/api/requesters");
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(4);

      // Verify structure of requester objects
      for (const reqUser of res.body) {
        expect(reqUser).toHaveProperty("id");
        expect(reqUser).toHaveProperty("name");
        expect(reqUser).toHaveProperty("email");
        expect(reqUser).toHaveProperty("isActive", true);
      }
    });

    it("excludes inactive development requesters from the selector response", async () => {
      const res = await request(app).get("/api/requesters");
      expect(res.status).toBe(200);

      // Find inactive requester by name or email
      const inactiveUser = res.body.find(
        (u: any) =>
          u.name === "Inactive Test User" ||
          u.email === "inactive.user@toktickit.local" ||
          u.isActive === false
      );
      expect(inactiveUser).toBeUndefined();
    });

    it("returns active requesters with their correct names and departments", async () => {
      const res = await request(app).get("/api/requesters");
      expect(res.status).toBe(200);

      const names = res.body.map((u: any) => u.name);
      expect(names).toContain("Jennifer Anderson");
      expect(names).toContain("Michael Brown");
      expect(names).toContain("Sarah Johnson");
      expect(names).toContain("David Lee");

      const jennifer = res.body.find((u: any) => u.name === "Jennifer Anderson");
      expect(jennifer).toBeDefined();
      expect(jennifer.department).toBe("Marketing");
      expect(jennifer.email).toBe("jennifer.anderson@toktickit.local");
    });
  });

  describe("Database Seed & Integrity Check", () => {
    it("has inactive requesters stored in the database even though excluded from API", async () => {
      const prisma = getPrisma();
      const inactiveDbUser = await prisma.requesterUser.findUnique({
        where: { email: "inactive.user@toktickit.local" },
      });

      expect(inactiveDbUser).not.toBeNull();
      expect(inactiveDbUser?.name).toBe("Inactive Test User");
      expect(inactiveDbUser?.isActive).toBe(false);
    });

    it("maintains unique email constraint on RequesterUser", async () => {
      const prisma = getPrisma();
      const count = await prisma.requesterUser.count({
        where: { email: "jennifer.anderson@toktickit.local" },
      });
      expect(count).toBe(1);
    });
  });
});
