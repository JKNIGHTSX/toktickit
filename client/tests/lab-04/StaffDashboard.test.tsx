import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { StaffDashboard } from "../../src/components/StaffDashboard.js";
import * as api from "../../src/api.js";
import * as AuthContextModule from "../../src/context/AuthContext.js";

/**
 * Lab 4 — Issue #8: Staff Dashboard UI Component Tests (UI-04)
 *
 * Traceability:
 *   - AC-17 (IT Staff Dashboard Metrics): Renders 5 queue cards with correct values.
 *   - AC-18 (Dashboard Drill-Down Navigation): Clicking metric card invokes navigation.
 *   - AC-19 (Administrator Dashboard Account Counters): Admin sees extra userSummary row.
 *   - AC-21 (Empty State Dashboard Rendering): Empty recentTickets shows placeholder.
 */

vi.mock("../../src/api.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/api.js")>();
  return {
    ...actual,
    fetchStaffDashboard: vi.fn(),
    fetchAdminDashboard: vi.fn(),
  };
});

vi.mock("../../src/context/AuthContext.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/context/AuthContext.js")>();
  return {
    ...actual,
    useAuth: vi.fn(),
  };
});

describe("Lab 4 — Issue #8: Staff Dashboard UI Component Tests (UI-04)", () => {
  const staffUser: api.AuthUser = {
    id: 10,
    email: "staff@toktickit.local",
    name: "Michael Brown",
    role: "IT_STAFF",
    mustChangePassword: false,
    isActive: true,
  };

  const adminUser: api.AuthUser = {
    id: 20,
    email: "admin@toktickit.local",
    name: "Admin User",
    role: "ADMINISTRATOR",
    mustChangePassword: false,
    isActive: true,
  };

  const mockStaffData: api.StaffDashboardResponse = {
    metrics: {
      newTickets: 14,
      openTickets: 23,
      inProgressTickets: 18,
      waitingForRequesterTickets: 7,
      myAssignedTickets: 16,
    },
    recentTickets: [
      {
        id: 101,
        ticketNumber: "TKT-2026-000101",
        summary: "Laptop battery drains quickly",
        status: "IN_PROGRESS",
        itPriority: "HIGH",
        updatedAt: "2026-10-21T09:14:00.000Z",
        requester: { name: "Jennifer Anderson", email: "janderson@toktickit.local" },
        owner: { id: 10, name: "Michael Brown" },
        category: { name: "Hardware" },
      },
      {
        id: 102,
        ticketNumber: "TKT-2026-000102",
        summary: "Outlook freezing intermittently",
        status: "OPEN",
        itPriority: "MEDIUM",
        updatedAt: "2026-10-21T08:00:00.000Z",
        category: { name: "Software" },
      },
    ],
  };

  const mockAdminData: api.AdminDashboardResponse = {
    metrics: {
      newTickets: 14,
      openTickets: 23,
      inProgressTickets: 18,
      waitingForRequesterTickets: 7,
      myAssignedTickets: 16,
      userSummary: {
        totalUsers: 28,
        activeUsers: 26,
        inactiveUsers: 2,
      },
    },
    recentTickets: mockStaffData.recentTickets,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // IT Staff — Renders metric cards correctly
  // ---------------------------------------------------------------------------
  it("UI-04a: renders 5 metric cards with correct values from Staff Dashboard API", async () => {
    vi.mocked(AuthContextModule.useAuth).mockReturnValue({
      user: staffUser,
      isAuthenticated: true,
      isLoading: false,
      error: null,
      successMessage: null,
      login: vi.fn(),
      logout: vi.fn(),
      changePassword: vi.fn(),
      checkAuth: vi.fn(),
    });
    vi.mocked(api.fetchStaffDashboard).mockResolvedValue(mockStaffData);

    render(<StaffDashboard />);

    await waitFor(() => {
      expect(screen.getByTestId("metric-new-tickets")).toHaveTextContent("14");
      expect(screen.getByTestId("metric-open-tickets")).toHaveTextContent("23");
      expect(screen.getByTestId("metric-in-progress-tickets")).toHaveTextContent("18");
      expect(screen.getByTestId("metric-waiting-req-tickets")).toHaveTextContent("7");
      expect(screen.getByTestId("metric-my-assigned-tickets")).toHaveTextContent("16");
    });
  });

  // ---------------------------------------------------------------------------
  // IT Staff — Renders recent tickets list
  // ---------------------------------------------------------------------------
  it("UI-04b: renders recent tickets list with ticket numbers and summaries", async () => {
    vi.mocked(AuthContextModule.useAuth).mockReturnValue({
      user: staffUser,
      isAuthenticated: true,
      isLoading: false,
      error: null,
      successMessage: null,
      login: vi.fn(),
      logout: vi.fn(),
      changePassword: vi.fn(),
      checkAuth: vi.fn(),
    });
    vi.mocked(api.fetchStaffDashboard).mockResolvedValue(mockStaffData);

    render(<StaffDashboard />);

    await waitFor(() => {
      expect(screen.getByText("TKT-2026-000101")).toBeInTheDocument();
      expect(screen.getByText("Laptop battery drains quickly")).toBeInTheDocument();
      expect(screen.getByText("TKT-2026-000102")).toBeInTheDocument();
      expect(screen.getByText("Outlook freezing intermittently")).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // IT Staff — Renders loading skeleton
  // ---------------------------------------------------------------------------
  it("UI-04c: renders loading skeleton while API is in-flight", () => {
    vi.mocked(AuthContextModule.useAuth).mockReturnValue({
      user: staffUser,
      isAuthenticated: true,
      isLoading: false,
      error: null,
      successMessage: null,
      login: vi.fn(),
      logout: vi.fn(),
      changePassword: vi.fn(),
      checkAuth: vi.fn(),
    });
    // Never resolves — keep component in loading state
    vi.mocked(api.fetchStaffDashboard).mockReturnValue(new Promise(() => {}));

    render(<StaffDashboard />);

    // Metric testid elements should NOT be present during loading
    expect(screen.queryByTestId("metric-new-tickets")).not.toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // IT Staff — Renders error banner on API failure
  // ---------------------------------------------------------------------------
  it("UI-04d: renders error banner when staff dashboard API fails", async () => {
    vi.mocked(AuthContextModule.useAuth).mockReturnValue({
      user: staffUser,
      isAuthenticated: true,
      isLoading: false,
      error: null,
      successMessage: null,
      login: vi.fn(),
      logout: vi.fn(),
      changePassword: vi.fn(),
      checkAuth: vi.fn(),
    });
    vi.mocked(api.fetchStaffDashboard).mockRejectedValue(new Error("Failed to load dashboard data"));

    render(<StaffDashboard />);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(screen.getByText(/Failed to load dashboard data/i)).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // IT Staff — Empty state for recent tickets
  // ---------------------------------------------------------------------------
  it("UI-04e: renders empty queue placeholder when recentTickets is empty (AC-21)", async () => {
    vi.mocked(AuthContextModule.useAuth).mockReturnValue({
      user: staffUser,
      isAuthenticated: true,
      isLoading: false,
      error: null,
      successMessage: null,
      login: vi.fn(),
      logout: vi.fn(),
      changePassword: vi.fn(),
      checkAuth: vi.fn(),
    });
    vi.mocked(api.fetchStaffDashboard).mockResolvedValue({
      ...mockStaffData,
      recentTickets: [],
    });

    render(<StaffDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Queue is clear/i)).toBeInTheDocument();
      expect(screen.getByText(/No active tickets require immediate triage/i)).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // IT Staff — Zero metrics
  // ---------------------------------------------------------------------------
  it("UI-04f: renders zero metrics correctly without breaking layout (AC-21)", async () => {
    vi.mocked(AuthContextModule.useAuth).mockReturnValue({
      user: staffUser,
      isAuthenticated: true,
      isLoading: false,
      error: null,
      successMessage: null,
      login: vi.fn(),
      logout: vi.fn(),
      changePassword: vi.fn(),
      checkAuth: vi.fn(),
    });
    vi.mocked(api.fetchStaffDashboard).mockResolvedValue({
      metrics: {
        newTickets: 0,
        openTickets: 0,
        inProgressTickets: 0,
        waitingForRequesterTickets: 0,
        myAssignedTickets: 0,
      },
      recentTickets: [],
    });

    render(<StaffDashboard />);

    await waitFor(() => {
      expect(screen.getByTestId("metric-new-tickets")).toHaveTextContent("0");
      expect(screen.getByTestId("metric-my-assigned-tickets")).toHaveTextContent("0");
    });
  });

  // ---------------------------------------------------------------------------
  // IT Staff — Drill-down navigation callback
  // ---------------------------------------------------------------------------
  it("UI-04g: clicking 'My Assigned' metric card calls onNavigateQueue with assignedTo=ME (AC-18)", async () => {
    const mockNavigate = vi.fn();
    vi.mocked(AuthContextModule.useAuth).mockReturnValue({
      user: staffUser,
      isAuthenticated: true,
      isLoading: false,
      error: null,
      successMessage: null,
      login: vi.fn(),
      logout: vi.fn(),
      changePassword: vi.fn(),
      checkAuth: vi.fn(),
    });
    vi.mocked(api.fetchStaffDashboard).mockResolvedValue(mockStaffData);

    render(<StaffDashboard onNavigateQueue={mockNavigate} />);

    await waitFor(() => {
      expect(screen.getByTestId("metric-my-assigned-tickets")).toBeInTheDocument();
    });

    // Click the "View queue →" link under "My Assigned"
    const viewQueueLinks = screen.getAllByText(/View queue/i);
    fireEvent.click(viewQueueLinks[viewQueueLinks.length - 1]); // Last link is "My Assigned"

    expect(mockNavigate).toHaveBeenCalledWith({ assignedTo: "ME" });
  });

  // ---------------------------------------------------------------------------
  // IT Staff — Clicking recent ticket calls onSelectTicket
  // ---------------------------------------------------------------------------
  it("UI-04h: clicking a recent ticket calls onSelectTicket with the ticket id", async () => {
    const mockSelect = vi.fn();
    vi.mocked(AuthContextModule.useAuth).mockReturnValue({
      user: staffUser,
      isAuthenticated: true,
      isLoading: false,
      error: null,
      successMessage: null,
      login: vi.fn(),
      logout: vi.fn(),
      changePassword: vi.fn(),
      checkAuth: vi.fn(),
    });
    vi.mocked(api.fetchStaffDashboard).mockResolvedValue(mockStaffData);

    render(<StaffDashboard onSelectTicket={mockSelect} />);

    await waitFor(() => {
      expect(screen.getByText("TKT-2026-000101")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("TKT-2026-000101").closest("li")!);
    expect(mockSelect).toHaveBeenCalledWith(101);
  });

  // ---------------------------------------------------------------------------
  // Administrator — Fetches admin dashboard and shows userSummary row (AC-19)
  // ---------------------------------------------------------------------------
  it("UI-04i: Administrator sees extra userSummary cards (AC-19)", async () => {
    vi.mocked(AuthContextModule.useAuth).mockReturnValue({
      user: adminUser,
      isAuthenticated: true,
      isLoading: false,
      error: null,
      successMessage: null,
      login: vi.fn(),
      logout: vi.fn(),
      changePassword: vi.fn(),
      checkAuth: vi.fn(),
    });
    vi.mocked(api.fetchAdminDashboard).mockResolvedValue(mockAdminData);

    render(<StaffDashboard />);

    await waitFor(() => {
      expect(screen.getByTestId("admin-total-users")).toHaveTextContent("28");
      expect(screen.getByTestId("admin-active-users")).toHaveTextContent("26");
      expect(screen.getByTestId("admin-inactive-users")).toHaveTextContent("2");
    });
  });

  // ---------------------------------------------------------------------------
  // Administrator — Calls fetchAdminDashboard, not fetchStaffDashboard
  // ---------------------------------------------------------------------------
  it("UI-04j: Administrator calls fetchAdminDashboard, IT Staff calls fetchStaffDashboard", async () => {
    // Test IT Staff endpoint
    vi.mocked(AuthContextModule.useAuth).mockReturnValue({
      user: staffUser,
      isAuthenticated: true,
      isLoading: false,
      error: null,
      successMessage: null,
      login: vi.fn(),
      logout: vi.fn(),
      changePassword: vi.fn(),
      checkAuth: vi.fn(),
    });
    vi.mocked(api.fetchStaffDashboard).mockResolvedValue(mockStaffData);

    const { unmount } = render(<StaffDashboard />);
    await waitFor(() => expect(api.fetchStaffDashboard).toHaveBeenCalledOnce());
    expect(api.fetchAdminDashboard).not.toHaveBeenCalled();
    unmount();

    vi.clearAllMocks();

    // Test Admin endpoint
    vi.mocked(AuthContextModule.useAuth).mockReturnValue({
      user: adminUser,
      isAuthenticated: true,
      isLoading: false,
      error: null,
      successMessage: null,
      login: vi.fn(),
      logout: vi.fn(),
      changePassword: vi.fn(),
      checkAuth: vi.fn(),
    });
    vi.mocked(api.fetchAdminDashboard).mockResolvedValue(mockAdminData);

    render(<StaffDashboard />);
    await waitFor(() => expect(api.fetchAdminDashboard).toHaveBeenCalledOnce());
    expect(api.fetchStaffDashboard).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // IT Staff — Welcome banner uses first name
  // ---------------------------------------------------------------------------
  it("UI-04k: displays welcome message with the user's first name", async () => {
    vi.mocked(AuthContextModule.useAuth).mockReturnValue({
      user: staffUser,
      isAuthenticated: true,
      isLoading: false,
      error: null,
      successMessage: null,
      login: vi.fn(),
      logout: vi.fn(),
      changePassword: vi.fn(),
      checkAuth: vi.fn(),
    });
    vi.mocked(api.fetchStaffDashboard).mockResolvedValue(mockStaffData);

    render(<StaffDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Welcome back, Michael!/i)).toBeInTheDocument();
    });
  });
});

