import { afterEach, describe, expect, it, vi } from "vitest";
import {
  assignTicket,
  fetchAssignableUsers,
  fetchTicketDetail,
  updateTicketITPriority,
  updateTicketStatus,
} from "../../src/api.js";

describe("Ticket detail API session handling", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("requests the database ticket ID with session cookies and no requester identity override", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 42 }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await fetchTicketDetail(42);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/tickets\/42$/),
      { credentials: "include" }
    );
  });

  it("loads assignable users from the staff-only list endpoint with session cookies", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    });
    vi.stubGlobal("fetch", fetchMock);

    await fetchAssignableUsers();

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/assignable-users$/),
      { credentials: "include" }
    );
  });

  it("assigns the selected owner through the ticket assignment endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { id: 42, ownerId: 7, owner: { id: 7, name: "Tech Two" }, status: "OPEN" } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await assignTicket(42, 7);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/tickets\/42\/assign$/),
      expect.objectContaining({
        method: "PATCH",
        credentials: "include",
        body: JSON.stringify({ ownerId: 7 }),
      })
    );
  });

  it("saves IT Priority through the authenticated priority endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { id: 42, itPriority: "URGENT", updatedAt: "2026-10-05T10:00:00.000Z" } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await updateTicketITPriority(42, "URGENT");

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/tickets\/42\/priority$/),
      expect.objectContaining({
        method: "PATCH",
        credentials: "include",
        body: JSON.stringify({ itPriority: "URGENT" }),
      })
    );
  });

  it("saves Status and resolution summary through the authenticated status endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { id: 42, status: "RESOLVED", resolutionSummary: "Issue fixed", updatedAt: "2026-10-05T10:00:00.000Z" } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await updateTicketStatus(42, "RESOLVED", "Issue fixed");

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/tickets\/42\/status$/),
      expect.objectContaining({
        method: "PATCH",
        credentials: "include",
        body: JSON.stringify({ status: "RESOLVED", resolutionSummary: "Issue fixed" }),
      })
    );
  });
});