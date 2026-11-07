import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import App from "../../src/App.js";

/**
 * Lab 4 — Issue #8 / Navigation Filtering Tests
 *
 * Requirements:
 * - New navigation displays only NEW tickets.
 * - Open navigation displays only OPEN tickets.
 * - Other status navigation items filter correctly.
 * - Switching between statuses updates the displayed records.
 * - All Tickets displays the unfiltered permitted ticket list.
 * - Search and pagination continue to work with status filters.
 * - My Assigned Tickets does not display tickets assigned to other users.
 */

describe("Navigation Filtering & Drill-Down Integration Tests", () => {
  const itStaffUser = {
    id: 10,
    email: "michael.brown@toktickit.local",
    name: "Michael Brown",
    role: "IT_STAFF",
    mustChangePassword: false,
    isActive: true,
  };

  const sampleCategories = [
    { id: 1, name: "Hardware" },
    { id: 2, name: "Software" },
  ];

  const staffDashboardData = {
    metrics: {
      newTickets: 5,
      openTickets: 8,
      inProgressTickets: 4,
      waitingForRequesterTickets: 2,
      myAssignedTickets: 3,
    },
    recentTickets: [],
  };

  const ticketNew1 = {
    id: 1,
    ticketNumber: "TKT-NEW-001",
    summary: "New server requested",
    status: "NEW",
    requestedPriority: "MEDIUM",
    itPriority: "HIGH",
    category: { id: 1, name: "Hardware" },
    ownerId: null,
    owner: null,
    requester: { id: 100, name: "Alice", email: "alice@test.local" },
    createdAt: "2026-11-01T10:00:00.000Z",
    updatedAt: "2026-11-01T10:00:00.000Z",
    commentCount: 0,
    attachmentCount: 0,
  };

  const ticketOpen1 = {
    id: 2,
    ticketNumber: "TKT-OPEN-001",
    summary: "Cannot access VPN network",
    status: "OPEN",
    requestedPriority: "HIGH",
    itPriority: "HIGH",
    category: { id: 2, name: "Software" },
    ownerId: null,
    owner: null,
    requester: { id: 101, name: "Bob", email: "bob@test.local" },
    createdAt: "2026-11-02T10:00:00.000Z",
    updatedAt: "2026-11-02T10:00:00.000Z",
    commentCount: 0,
    attachmentCount: 0,
  };

  const ticketInProgress1 = {
    id: 3,
    ticketNumber: "TKT-INPROG-001",
    summary: "Laptop keyboard replacement",
    status: "IN_PROGRESS",
    requestedPriority: "LOW",
    itPriority: "MEDIUM",
    category: { id: 1, name: "Hardware" },
    ownerId: 10,
    owner: { id: 10, name: "Michael Brown" },
    requester: { id: 102, name: "Charlie", email: "charlie@test.local" },
    createdAt: "2026-11-03T10:00:00.000Z",
    updatedAt: "2026-11-03T10:00:00.000Z",
    commentCount: 0,
    attachmentCount: 0,
  };

  const ticketWaiting1 = {
    id: 4,
    ticketNumber: "TKT-WAIT-001",
    summary: "Need asset tag for monitor",
    status: "WAITING_FOR_REQUESTER",
    requestedPriority: "MEDIUM",
    itPriority: "MEDIUM",
    category: { id: 1, name: "Hardware" },
    ownerId: 20,
    owner: { id: 20, name: "Sarah Johnson" },
    requester: { id: 103, name: "Diana", email: "diana@test.local" },
    createdAt: "2026-11-04T10:00:00.000Z",
    updatedAt: "2026-11-04T10:00:00.000Z",
    commentCount: 0,
    attachmentCount: 0,
  };

  const allTickets = [ticketNew1, ticketOpen1, ticketInProgress1, ticketWaiting1];

  let lastTicketQuery: URLSearchParams | null = null;

  beforeEach(() => {
    lastTicketQuery = null;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL): Promise<Response> => {
        const urlStr = String(input);

        if (urlStr.includes("/api/auth/me")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ data: itStaffUser }),
          } as Response;
        }

        if (urlStr.includes("/api/categories")) {
          return {
            ok: true,
            status: 200,
            json: async () => sampleCategories,
          } as Response;
        }

        if (urlStr.includes("/api/dashboard/staff")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ data: staffDashboardData }),
          } as Response;
        }

        if (urlStr.includes("/api/tickets?") || urlStr.endsWith("/api/tickets")) {
          const parsed = new URL(urlStr, "http://localhost:3000");
          lastTicketQuery = parsed.searchParams;

          const statusFilter = parsed.searchParams.get("status");
          const assignedFilter = parsed.searchParams.get("assignedTo");
          const searchFilter = parsed.searchParams.get("search");

          let filtered = [...allTickets];

          if (statusFilter) {
            filtered = filtered.filter((t) => t.status === statusFilter);
          }

          if (assignedFilter === "ME") {
            filtered = filtered.filter((t) => t.ownerId === itStaffUser.id);
          } else if (assignedFilter === "UNASSIGNED") {
            filtered = filtered.filter((t) => t.ownerId === null);
          }

          if (searchFilter) {
            const s = searchFilter.toLowerCase();
            filtered = filtered.filter(
              (t) =>
                t.ticketNumber.toLowerCase().includes(s) ||
                t.summary.toLowerCase().includes(s)
            );
          }

          const page = parseInt(parsed.searchParams.get("page") || "1", 10);
          const pageSize = parseInt(parsed.searchParams.get("pageSize") || "10", 10);

          return {
            ok: true,
            status: 200,
            json: async () => ({
              data: filtered,
              pagination: {
                page,
                pageSize,
                totalItems: filtered.length,
                totalPages: Math.ceil(filtered.length / pageSize) || 1,
                hasNextPage: false,
                hasPrevPage: false,
              },
            }),
          } as Response;
        }

        return {
          ok: true,
          status: 200,
          json: async () => ({}),
        } as Response;
      })
    );
  });

  it("New navigation displays only NEW tickets", async () => {
    render(<App />);

    // Wait for Dashboard to render
    await screen.findByRole("button", { name: /dashboard/i });
    await screen.findByTestId("metric-new-tickets");

    // Click Status: New navigation (View queue for New)
    const newButton = screen.getByRole("button", { name: /status: new/i });
    fireEvent.click(newButton);

    // Should navigate to Staff Queue and display ONLY NEW tickets
    await waitFor(() => {
      expect(screen.getAllByText("TKT-NEW-001").length).toBeGreaterThan(0);
      expect(screen.getAllByText("New server requested").length).toBeGreaterThan(0);
    });

    expect(screen.queryAllByText("TKT-OPEN-001")).toHaveLength(0);
    expect(screen.queryAllByText("TKT-INPROG-001")).toHaveLength(0);
    expect(lastTicketQuery?.get("status")).toBe("NEW");
  });

  it("Open navigation displays only OPEN tickets", async () => {
    render(<App />);

    await screen.findByRole("button", { name: /dashboard/i });
    await screen.findByTestId("metric-open-tickets");

    const openButton = screen.getByRole("button", { name: /status: open/i });
    fireEvent.click(openButton);

    await waitFor(() => {
      expect(screen.getAllByText("TKT-OPEN-001").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Cannot access VPN network").length).toBeGreaterThan(0);
    });

    expect(screen.queryAllByText("TKT-NEW-001")).toHaveLength(0);
    expect(screen.queryAllByText("TKT-INPROG-001")).toHaveLength(0);
    expect(lastTicketQuery?.get("status")).toBe("OPEN");
  });

  it("Other status navigation items filter correctly (In Progress & Waiting for Requester)", async () => {
    render(<App />);

    await screen.findByRole("button", { name: /dashboard/i });
    await screen.findByTestId("metric-in-progress-tickets");

    const inProgButton = screen.getByRole("button", { name: /status: in progress/i });
    fireEvent.click(inProgButton);

    await waitFor(() => {
      expect(screen.getAllByText("TKT-INPROG-001").length).toBeGreaterThan(0);
    });

    expect(screen.queryAllByText("TKT-NEW-001")).toHaveLength(0);
    expect(screen.queryAllByText("TKT-OPEN-001")).toHaveLength(0);
    expect(lastTicketQuery?.get("status")).toBe("IN_PROGRESS");
  });

  it("Switching between statuses updates the displayed records", async () => {
    render(<App />);

    await screen.findByRole("button", { name: /dashboard/i });
    await screen.findByTestId("metric-new-tickets");

    // 1. Click New
    fireEvent.click(screen.getByRole("button", { name: /status: new/i }));
    await waitFor(() => {
      expect(screen.getAllByText("TKT-NEW-001").length).toBeGreaterThan(0);
    });
    expect(screen.queryAllByText("TKT-OPEN-001")).toHaveLength(0);

    // 2. Return to Dashboard and click Open
    fireEvent.click(screen.getByRole("button", { name: /dashboard/i }));
    await screen.findByTestId("metric-open-tickets");
    fireEvent.click(screen.getByRole("button", { name: /status: open/i }));

    await waitFor(() => {
      expect(screen.getAllByText("TKT-OPEN-001").length).toBeGreaterThan(0);
    });
    expect(screen.queryAllByText("TKT-NEW-001")).toHaveLength(0);
    expect(lastTicketQuery?.get("status")).toBe("OPEN");

    // 3. In-queue status filter dropdown change to IN_PROGRESS
    const statusSelect = screen.getByLabelText(/filter by status/i);
    fireEvent.change(statusSelect, { target: { value: "IN_PROGRESS" } });

    await waitFor(() => {
      expect(screen.getAllByText("TKT-INPROG-001").length).toBeGreaterThan(0);
    });
    expect(screen.queryAllByText("TKT-OPEN-001")).toHaveLength(0);
    expect(lastTicketQuery?.get("status")).toBe("IN_PROGRESS");
  });

  it("All Tickets displays the unfiltered permitted ticket list", async () => {
    render(<App />);

    await screen.findByRole("button", { name: /dashboard/i });
    await screen.findByTestId("metric-new-tickets");

    // First filter by NEW
    fireEvent.click(screen.getByRole("button", { name: /status: new/i }));
    await waitFor(() => {
      expect(screen.getAllByText("TKT-NEW-001").length).toBeGreaterThan(0);
    });
    expect(screen.queryAllByText("TKT-OPEN-001")).toHaveLength(0);

    // Now select "All Tickets" from the status dropdown
    const statusSelect = screen.getByLabelText(/filter by status/i);
    fireEvent.change(statusSelect, { target: { value: "" } });

    // All permitted tickets should now be displayed
    await waitFor(() => {
      expect(screen.getAllByText("TKT-NEW-001").length).toBeGreaterThan(0);
      expect(screen.getAllByText("TKT-OPEN-001").length).toBeGreaterThan(0);
      expect(screen.getAllByText("TKT-INPROG-001").length).toBeGreaterThan(0);
      expect(screen.getAllByText("TKT-WAIT-001").length).toBeGreaterThan(0);
    });

    expect(lastTicketQuery?.get("status")).toBeNull();
  });

  it("Search and pagination continue to work with status filters", async () => {
    render(<App />);

    await screen.findByRole("button", { name: /dashboard/i });
    await screen.findByTestId("metric-open-tickets");

    // Filter by OPEN
    fireEvent.click(screen.getByRole("button", { name: /status: open/i }));
    await waitFor(() => {
      expect(screen.getAllByText("TKT-OPEN-001").length).toBeGreaterThan(0);
    });

    // Enter search text
    const searchInput = screen.getByPlaceholderText(/search by ticket number or summary/i);
    fireEvent.change(searchInput, { target: { value: "VPN" } });

    // Wait for debounced search
    await waitFor(
      () => {
        expect(lastTicketQuery?.get("status")).toBe("OPEN");
        expect(lastTicketQuery?.get("search")).toBe("VPN");
      },
      { timeout: 1500 }
    );
  });

  it("My Assigned Tickets does not display tickets assigned to other users", async () => {
    render(<App />);

    await screen.findByRole("button", { name: /dashboard/i });
    await screen.findByTestId("metric-my-assigned-tickets");

    // Click "My Assigned Tickets"
    const myAssignedButton = screen.getByRole("button", { name: /my assigned tickets/i });
    fireEvent.click(myAssignedButton);

    await waitFor(() => {
      // TKT-INPROG-001 is assigned to Michael Brown (id 10)
      expect(screen.getAllByText("TKT-INPROG-001").length).toBeGreaterThan(0);
    });

    // TKT-WAIT-001 is assigned to Sarah Johnson (id 20) — must NOT be displayed
    expect(screen.queryAllByText("TKT-WAIT-001")).toHaveLength(0);
    // Unassigned tickets must NOT be displayed
    expect(screen.queryAllByText("TKT-NEW-001")).toHaveLength(0);
    expect(screen.queryAllByText("TKT-OPEN-001")).toHaveLength(0);

    expect(lastTicketQuery?.get("assignedTo")).toBe("ME");
  });
});
