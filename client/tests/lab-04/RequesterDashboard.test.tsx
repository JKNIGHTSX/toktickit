import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { RequesterDashboard } from "../../src/components/RequesterDashboard.js";
import * as api from "../../src/api.js";
import * as AuthContextModule from "../../src/context/AuthContext.js";

/**
 * Lab 4 — Issue #8: Requester Dashboard UI Component Tests (UI-03)
 *
 * Traceability:
 *   - AC-15 (Requester Dashboard Metrics): Renders 4 metric cards with correct values.
 *   - AC-16 (Requester Dashboard Isolation): Only authenticated requester's data shown.
 *   - AC-21 (Empty State Dashboard Rendering): Zero metrics and empty list handled.
 */

vi.mock("../../src/api.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/api.js")>();
  return {
    ...actual,
    fetchRequesterDashboard: vi.fn(),
  };
});

vi.mock("../../src/context/AuthContext.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/context/AuthContext.js")>();
  return {
    ...actual,
    useAuth: vi.fn(),
  };
});

describe("Lab 4 — Issue #8: Requester Dashboard UI Component Tests (UI-03)", () => {
  const requesterUser: api.AuthUser = {
    id: 30,
    email: "jennifer.anderson@toktickit.local",
    name: "Jennifer Anderson",
    role: "REQUESTER",
    mustChangePassword: false,
    isActive: true,
  };

  const mockDashboardData: api.RequesterDashboardResponse = {
    metrics: {
      totalOpen: 3,
      inProgress: 2,
      resolved: 5,
      closed: 12,
    },
    recentTickets: [
      {
        id: 101,
        ticketNumber: "TKT-2026-000101",
        summary: "Laptop battery drains quickly",
        status: "IN_PROGRESS",
        requestedPriority: "HIGH",
        updatedAt: "2026-10-21T09:14:00.000Z",
        category: { name: "Hardware" },
      },
      {
        id: 102,
        ticketNumber: "TKT-2026-000102",
        summary: "Request software access",
        status: "RESOLVED",
        requestedPriority: "MEDIUM",
        updatedAt: "2026-10-20T14:30:00.000Z",
        category: { name: "Software" },
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(AuthContextModule.useAuth).mockReturnValue({
      user: requesterUser,
      isAuthenticated: true,
      isLoading: false,
      error: null,
      successMessage: null,
      login: vi.fn(),
      logout: vi.fn(),
      changePassword: vi.fn(),
      checkAuth: vi.fn(),
    });
  });

  // ---------------------------------------------------------------------------
  // Renders 4 metric cards with correct values
  // ---------------------------------------------------------------------------
  it("UI-03a: renders 4 metric cards with correct values from Requester Dashboard API (AC-15)", async () => {
    vi.mocked(api.fetchRequesterDashboard).mockResolvedValue(mockDashboardData);

    render(<RequesterDashboard />);

    await waitFor(() => {
      expect(screen.getByTestId("metric-total-open")).toHaveTextContent("3");
      expect(screen.getByTestId("metric-in-progress")).toHaveTextContent("2");
      expect(screen.getByTestId("metric-resolved")).toHaveTextContent("5");
      expect(screen.getByTestId("metric-closed")).toHaveTextContent("12");
    });
  });

  // ---------------------------------------------------------------------------
  // Renders recent tickets list
  // ---------------------------------------------------------------------------
  it("UI-03b: renders recent tickets list with ticket numbers and summaries", async () => {
    vi.mocked(api.fetchRequesterDashboard).mockResolvedValue(mockDashboardData);

    render(<RequesterDashboard />);

    await waitFor(() => {
      expect(screen.getByText("TKT-2026-000101")).toBeInTheDocument();
      expect(screen.getByText("Laptop battery drains quickly")).toBeInTheDocument();
      expect(screen.getByText("TKT-2026-000102")).toBeInTheDocument();
      expect(screen.getByText("Request software access")).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Loading skeleton shown while in-flight
  // ---------------------------------------------------------------------------
  it("UI-03c: renders loading skeleton while API is in-flight", () => {
    vi.mocked(api.fetchRequesterDashboard).mockReturnValue(new Promise(() => {}));

    render(<RequesterDashboard />);

    // No metric cards should be rendered yet
    expect(screen.queryByTestId("metric-total-open")).not.toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Error state
  // ---------------------------------------------------------------------------
  it("UI-03d: renders error banner when requester dashboard API fails", async () => {
    vi.mocked(api.fetchRequesterDashboard).mockRejectedValue(
      new Error("Failed to load dashboard data")
    );

    render(<RequesterDashboard />);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(screen.getByText(/Failed to load dashboard data/i)).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Empty state: no tickets
  // ---------------------------------------------------------------------------
  it("UI-03e: renders empty placeholder when recentTickets is empty (AC-21)", async () => {
    vi.mocked(api.fetchRequesterDashboard).mockResolvedValue({
      metrics: { totalOpen: 0, inProgress: 0, resolved: 0, closed: 0 },
      recentTickets: [],
    });

    render(<RequesterDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/No tickets yet/i)).toBeInTheDocument();
      expect(screen.getByText(/You haven't submitted any support requests yet/i)).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Zero metrics displayed correctly
  // ---------------------------------------------------------------------------
  it("UI-03f: renders zero metrics without breaking layout (AC-21)", async () => {
    vi.mocked(api.fetchRequesterDashboard).mockResolvedValue({
      metrics: { totalOpen: 0, inProgress: 0, resolved: 0, closed: 0 },
      recentTickets: [],
    });

    render(<RequesterDashboard />);

    await waitFor(() => {
      expect(screen.getByTestId("metric-total-open")).toHaveTextContent("0");
      expect(screen.getByTestId("metric-in-progress")).toHaveTextContent("0");
      expect(screen.getByTestId("metric-resolved")).toHaveTextContent("0");
      expect(screen.getByTestId("metric-closed")).toHaveTextContent("0");
    });
  });

  // ---------------------------------------------------------------------------
  // Drill-down navigation — clicking metric card invokes onNavigateTickets
  // ---------------------------------------------------------------------------
  it("UI-03g: clicking a metric card calls onNavigateTickets with correct status filter", async () => {
    const mockNavigate = vi.fn();
    vi.mocked(api.fetchRequesterDashboard).mockResolvedValue(mockDashboardData);

    render(<RequesterDashboard onNavigateTickets={mockNavigate} />);

    await waitFor(() => {
      expect(screen.getByTestId("metric-resolved")).toBeInTheDocument();
    });

    // Click the "View all →" button under "Resolved"
    const viewAllLinks = screen.getAllByText(/View all/i);
    // Order: Open, In Progress, Resolved, Closed → index 2 for Resolved
    fireEvent.click(viewAllLinks[2]);

    expect(mockNavigate).toHaveBeenCalledWith({ status: "RESOLVED" });
  });

  // ---------------------------------------------------------------------------
  // Drill-down — clicking recent ticket calls onSelectTicket
  // ---------------------------------------------------------------------------
  it("UI-03h: clicking a recent ticket calls onSelectTicket with the ticket id", async () => {
    const mockSelect = vi.fn();
    vi.mocked(api.fetchRequesterDashboard).mockResolvedValue(mockDashboardData);

    render(<RequesterDashboard onSelectTicket={mockSelect} />);

    await waitFor(() => {
      expect(screen.getByText("TKT-2026-000101")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("TKT-2026-000101").closest("li")!);
    expect(mockSelect).toHaveBeenCalledWith(101);
  });

  // ---------------------------------------------------------------------------
  // Welcome banner uses first name
  // ---------------------------------------------------------------------------
  it("UI-03i: displays welcome message with the requester's first name", async () => {
    vi.mocked(api.fetchRequesterDashboard).mockResolvedValue(mockDashboardData);

    render(<RequesterDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Welcome, Jennifer!/i)).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Calls fetchRequesterDashboard (backend API — not client-side filtering)
  // ---------------------------------------------------------------------------
  it("UI-03j: fetches data from /api/dashboard/requester, not from ticket list", async () => {
    vi.mocked(api.fetchRequesterDashboard).mockResolvedValue(mockDashboardData);

    render(<RequesterDashboard />);

    await waitFor(() => {
      expect(api.fetchRequesterDashboard).toHaveBeenCalledOnce();
    });
  });

  // ---------------------------------------------------------------------------
  // Refresh button re-fetches data
  // ---------------------------------------------------------------------------
  it("UI-03k: Refresh button re-fetches dashboard data", async () => {
    vi.mocked(api.fetchRequesterDashboard).mockResolvedValue(mockDashboardData);

    render(<RequesterDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Refresh/i)).toBeInTheDocument();
    });

    expect(api.fetchRequesterDashboard).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByText(/Refresh/i));

    await waitFor(() => {
      expect(api.fetchRequesterDashboard).toHaveBeenCalledTimes(2);
    });
  });
});

