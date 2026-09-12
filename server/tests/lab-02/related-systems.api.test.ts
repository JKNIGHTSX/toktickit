import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

describe("Lab 2 — Issue #2: Related Systems Reference Data API Tests", () => {
  describe("GET /api/related-systems", () => {
    it("returns HTTP 200 with 7 seeded active related systems in id order", async () => {
      const res = await request(app).get("/api/related-systems");
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(7);

      expect(res.body).toEqual([
        { id: 1, name: "Email", description: "Corporate email and inbox service" },
        { id: 2, name: "Campus Wi-Fi", description: "Wireless network access on campus" },
        { id: 3, name: "VPN", description: "Virtual private network remote access" },
        { id: 4, name: "LEB2 App", description: "Learning environment portal" },
        { id: 5, name: "Grade Submission App", description: "Academic grade management app" },
        { id: 6, name: "Printer", description: "Networked office printers and scanners" },
        { id: 7, name: "Corporate Laptop", description: "Company-issued laptop hardware" },
      ]);
    });

    it("verifies all related systems in DB have unique names", async () => {
      const prisma = getPrisma();
      const count = await prisma.relatedSystem.count();
      expect(count).toBe(7);
    });
  });
});
