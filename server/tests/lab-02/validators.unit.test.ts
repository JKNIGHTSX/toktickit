import { describe, it, expect } from "vitest";
import { validateTicketInput } from "../../src/utils/validators.js";

describe("UT-02: Ticket Input Validator", () => {
  const validBase = {
    summary: "VPN connection dropping on Wi-Fi",
    description: "Occurs whenever switching access points in the main building corridor.",
    requestedPriority: "HIGH",
  };

  // --- Summary validation ---

  it("accepts a valid summary within bounds (5–150 chars)", () => {
    const result = validateTicketInput(validBase);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects a missing summary", () => {
    const result = validateTicketInput({ ...validBase, summary: "" });
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.field === "summary")).toBe(true);
  });

  it("rejects a summary shorter than 5 characters", () => {
    const result = validateTicketInput({ ...validBase, summary: "abc" });
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.field === "summary")).toBe(true);
  });

  it("rejects a summary longer than 150 characters", () => {
    const result = validateTicketInput({ ...validBase, summary: "a".repeat(151) });
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.field === "summary")).toBe(true);
  });

  it("accepts a summary of exactly 5 characters", () => {
    const result = validateTicketInput({ ...validBase, summary: "12345" });
    expect(result.isValid).toBe(true);
  });

  it("accepts a summary of exactly 150 characters", () => {
    const result = validateTicketInput({ ...validBase, summary: "a".repeat(150) });
    expect(result.isValid).toBe(true);
  });

  it("trims leading and trailing whitespace from summary", () => {
    const result = validateTicketInput({ ...validBase, summary: "  Valid Summary  " });
    expect(result.isValid).toBe(true);
    expect(result.sanitized.summary).toBe("Valid Summary");
  });

  it("rejects a summary that is only whitespace", () => {
    const result = validateTicketInput({ ...validBase, summary: "   " });
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.field === "summary")).toBe(true);
  });

  // --- Description validation ---

  it("rejects a missing description", () => {
    const result = validateTicketInput({ ...validBase, description: "" });
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.field === "description")).toBe(true);
  });

  it("rejects a description shorter than 10 characters", () => {
    const result = validateTicketInput({ ...validBase, description: "Short" });
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.field === "description")).toBe(true);
  });

  it("rejects a description longer than 2000 characters", () => {
    const result = validateTicketInput({ ...validBase, description: "a".repeat(2001) });
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.field === "description")).toBe(true);
  });

  it("accepts a description of exactly 10 characters", () => {
    const result = validateTicketInput({ ...validBase, description: "1234567890" });
    expect(result.isValid).toBe(true);
  });

  it("accepts a description of exactly 2000 characters", () => {
    const result = validateTicketInput({ ...validBase, description: "a".repeat(2000) });
    expect(result.isValid).toBe(true);
  });

  it("trims leading and trailing whitespace from description", () => {
    const result = validateTicketInput({
      ...validBase,
      description: "  Occurs every morning.  ",
    });
    expect(result.isValid).toBe(true);
    expect(result.sanitized.description).toBe("Occurs every morning.");
  });

  it("rejects a description that is only whitespace", () => {
    const result = validateTicketInput({ ...validBase, description: "          " });
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.field === "description")).toBe(true);
  });

  // --- Priority validation ---

  it("accepts LOW, MEDIUM, HIGH, URGENT priorities", () => {
    for (const priority of ["LOW", "MEDIUM", "HIGH", "URGENT"]) {
      const result = validateTicketInput({ ...validBase, requestedPriority: priority });
      expect(result.isValid).toBe(true);
      expect(result.sanitized.requestedPriority).toBe(priority);
    }
  });

  it("rejects an invalid priority value", () => {
    const result = validateTicketInput({ ...validBase, requestedPriority: "CRITICAL" });
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.field === "requestedPriority")).toBe(true);
  });

  // --- Multiple errors ---

  it("returns multiple field errors when both summary and description fail", () => {
    const result = validateTicketInput({
      ...validBase,
      summary: "",
      description: "",
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
  });
});
