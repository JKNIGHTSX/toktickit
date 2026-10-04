import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import React from "react";
import { AuthProvider } from "../../src/context/AuthContext.js";
import { StaffTicketQueue } from "../../src/components/StaffTicketQueue.js";

// ---------------------------------------------------------------------------
// Mock fetch globally
// ---------------------------------------------------------------------------
(globalThis as any).fetch = vi.fn();

// ---------------------------------------------------------------------------
// Mock data factories
// ---------------------------------------------------------------------------
const makeTicket = (overrides: Partial<any> = {}) => ({
  id: 101,
  ticketNumber: "TKT-2026-000101",
  requesterId: 5,
  requester: { id: 5, name: "Jennifer Anderson", email: "jennifer.anderson@toktickit.local" },
  category: { id: 1, name: "Hardware" },
  relatedSystem: { id: 3, name: "Corporate Laptop" },
  summary: "Laptop battery drains quickly",
  requestedPriority: "MEDIUM",
  itPriority: "MEDIUM",
  status: "IN_PROGRESS",
  owner: { id: 2, name: "Michael Brown", role: "IT_STAFF" },
  ticketOwnerName: "Michael Brown",
  createdAt: "2026-05-12T09:14:00.000Z",
  updatedAt: "2026-05-13T10:30:00.000Z",
  attachmentCount: 0,
  ...overrides,
});

const makePagination = (overrides: Partial<any> = {}) => ({
  page: 1,
  pageSize: 10,
  totalItems: 1,
  totalPages: 1,
  hasNextPage: false,
  hasPrevPage: false,
  ...overrides,
});

const mockItStaffUser = {
  id: 2,
  email: "tech1@toktickit.local",
  name: "Michael Brown",
  role: "IT_STAFF" as const,
  mustChangePassword: false,
  isActive: true,
  department: "IT",
};

// ---------------------------------------------------------------------------
// Helper: set up fetch mocks
// ---------------------------------------------------------------------------
function mockAuthMe(user: any) {
  return {
    url: "/api/auth/me",
    response: { ok: true, status: 200, json: async () => ({ data: user }) },
  };
}

function mockCategories() {
  return {
    url: "/api/categories",
    response: {
      ok: true,
      status: 200,
      json: async () => [
        { id: 1, name: "Hardware" },
        { id: 2, name: "Software" },
        { id: 3, name: "Network" },
      ],
    },
  };
}

function mockTicketsQueue(tickets: any[], pagination: any) {
  return {
    url: "/api/tickets",
    response: {
      ok: true,
      status: 200,
      json: async () => ({ data: tickets, pagination }),
    },
  };
}

function setupFetchMock(responses: { url: string; response: any }[]) {
  ((globalThis as any).fetch as any).mockImplementation((url: string) => {
    for (const { url: matchUrl, response } of responses) {
      if (url.includes(matchUrl)) {
        return Promise.resolve(response);
      }
    }
    return Promise.resolve({
      ok: false,
      status: 404,
      json: async () => ({ error: "Not found" }),
    });
  });
}

// ---------------------------------------------------------------------------
// Helper: render with AuthProvider providing an IT Staff user
// ---------------------------------------------------------------------------
function renderWithItStaff(props: any = {}) {
  setupFetchMock([
    mockAuthMe(mockItStaffUser),
    mockCategories(),
    mockTicketsQueue([makeTicket()], makePagination({ totalItems: 1 })),
  ]);

  return render(
    <AuthProvider>
      <StaffTicketQueue {...props} />
    </AuthProvider>
  );
}

// ---------------------------------------------------------------------------
// UI-03: Staff Ticket Queue Component Tests
// ---------------------------------------------------------------------------
describe("UI-03: Staff Ticket Queue Component (Lab 3 — Issue #5)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // Rendering
  // -------------------------------------------------------------------------
  describe("Rendering", () => {
    it("renders the Ticket Queue heading", async () => {
      renderWithItStaff();
      await waitFor(() => {
        expect(screen.getByRole("heading", { name: /ticket queue/i })).toBeInTheDocument();
      });
    });

    it("renders the search input field", async () => {
      renderWithItStaff();
      await waitFor(() => {
        expect(
          screen.getByPlaceholderText(/search by ticket number or summary/i)
        ).toBeInTheDocument();
      });
    });

    it("renders category, priority, status, and assignment filter dropdowns", async () => {
      renderWithItStaff();
      await waitFor(() => {
        expect(screen.getByLabelText(/filter by category/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/filter by requested priority/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/filter by it priority/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/filter by status/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/filter by assignment/i)).toBeInTheDocument();
      });
    });

    it("renders ticket data from API", async () => {
      renderWithItStaff();
      await waitFor(() => {
        // ticket number appears in both desktop table and mobile card — use getAllByText
        expect(screen.getAllByText("TKT-2026-000101").length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText(/laptop battery drains quickly/i).length).toBeGreaterThanOrEqual(1);
      });
    });

    it("renders ticket status badge", async () => {
      renderWithItStaff();
      await waitFor(() => {
        expect(screen.getByText(/in progress/i)).toBeInTheDocument();
      });
    });

    it("renders ticket owner name", async () => {
      renderWithItStaff();
      await waitFor(() => {
        // owner name appears in both desktop table cell and mobile card — use getAllByText
        expect(screen.getAllByText(/michael/i).length).toBeGreaterThanOrEqual(1);
      });
    });

    it("renders 'Unassigned' for tickets with no owner", async () => {
      setupFetchMock([
        mockAuthMe(mockItStaffUser),
        mockCategories(),
        mockTicketsQueue(
          [makeTicket({ id: 200, ticketNumber: "TKT-2026-000200", owner: null })],
          makePagination({ totalItems: 1 })
        ),
      ]);
      render(
        <AuthProvider>
          <StaffTicketQueue />
        </AuthProvider>
      );
      await waitFor(() => {
        expect(screen.getByText(/unassigned/i)).toBeInTheDocument();
      });
    });
  });

  // -------------------------------------------------------------------------
  // Empty / No-results states
  // -------------------------------------------------------------------------
  describe("Empty and No-Results States", () => {
    it("shows empty state message when no tickets exist in the queue", async () => {
      setupFetchMock([
        mockAuthMe(mockItStaffUser),
        mockCategories(),
        mockTicketsQueue([], makePagination({ totalItems: 0 })),
      ]);
      render(
        <AuthProvider>
          <StaffTicketQueue />
        </AuthProvider>
      );
      await waitFor(
        () => {
          // Message appears in both table empty row and card empty div
          expect(screen.getAllByText(/no tickets found in the queue/i).length).toBeGreaterThanOrEqual(1);
        },
        { timeout: 5000 }
      );
    });

    it("shows empty state message when API returns zero results", async () => {
      setupFetchMock([
        mockAuthMe(mockItStaffUser),
        mockCategories(),
        mockTicketsQueue([], makePagination({ totalItems: 0 })),
      ]);
      render(
        <AuthProvider>
          <StaffTicketQueue />
        </AuthProvider>
      );
      await waitFor(
        () => {
          // Message appears in both table empty row and card empty div
          expect(screen.getAllByText(/no tickets found in the queue/i).length).toBeGreaterThanOrEqual(1);
        },
        { timeout: 5000 }
      );
    });
  });

  // -------------------------------------------------------------------------
  // Forbidden state
  // -------------------------------------------------------------------------
  describe("Forbidden State (non-IT Staff)", () => {
    it("shows access restricted message when user role is Requester", async () => {
      const requesterUser = { ...mockItStaffUser, role: "REQUESTER" as const };
      setupFetchMock([
        mockAuthMe(requesterUser),
        mockCategories(),
      ]);
      render(
        <AuthProvider>
          <StaffTicketQueue />
        </AuthProvider>
      );
      await waitFor(() => {
        expect(screen.getByText(/access restricted/i)).toBeInTheDocument();
      });
    });
  });

  // -------------------------------------------------------------------------
  // Search input
  // -------------------------------------------------------------------------
  describe("Search input", () => {
    it("renders search input and accepts user text", async () => {
      renderWithItStaff();
      await waitFor(() => screen.getByPlaceholderText(/search by ticket number or summary/i));
      const input = screen.getByPlaceholderText(/search by ticket number or summary/i);
      fireEvent.change(input, { target: { value: "VPN" } });
      expect((input as HTMLInputElement).value).toBe("VPN");
    });

    it("shows 'Clear Filters' button after search text is entered", async () => {
      renderWithItStaff();
      await waitFor(() => screen.getByPlaceholderText(/search by ticket number or summary/i));
      const input = screen.getByPlaceholderText(/search by ticket number or summary/i);
      fireEvent.change(input, { target: { value: "test query" } });
      await waitFor(() => {
        expect(screen.getByLabelText(/clear all filters/i)).toBeInTheDocument();
      });
    });

    it("clicking Clear Filters resets search text", async () => {
      renderWithItStaff();
      await waitFor(() => screen.getByPlaceholderText(/search by ticket number or summary/i));
      const input = screen.getByPlaceholderText(/search by ticket number or summary/i);
      fireEvent.change(input, { target: { value: "test" } });
      await waitFor(() => screen.getByLabelText(/clear all filters/i));
      fireEvent.click(screen.getByLabelText(/clear all filters/i));
      expect((input as HTMLInputElement).value).toBe("");
    });
  });

  // -------------------------------------------------------------------------
  // Filter dropdowns
  // -------------------------------------------------------------------------
  describe("Filter dropdowns", () => {
    it("status filter dropdown contains all Lab 3 statuses", async () => {
      renderWithItStaff();
      await waitFor(() => screen.getByLabelText(/filter by status/i));
      const select = screen.getByLabelText(/filter by status/i);
      const options = within(select as HTMLElement).getAllByRole("option");
      const optionValues = options.map((o) => (o as HTMLOptionElement).value);
      expect(optionValues).toContain("NEW");
      expect(optionValues).toContain("OPEN");
      expect(optionValues).toContain("IN_PROGRESS");
      expect(optionValues).toContain("WAITING_FOR_REQUESTER");
      expect(optionValues).toContain("RESOLVED");
      expect(optionValues).toContain("CLOSED");
      expect(optionValues).toContain("REOPENED");
      expect(optionValues).toContain("CANCELLED");
    });

    it("assignedTo dropdown contains Unassigned and Assigned to Me options", async () => {
      renderWithItStaff();
      await waitFor(() => screen.getByLabelText(/filter by assignment/i));
      const select = screen.getByLabelText(/filter by assignment/i);
      const options = within(select as HTMLElement).getAllByRole("option");
      const optionValues = options.map((o) => (o as HTMLOptionElement).value);
      expect(optionValues).toContain("UNASSIGNED");
      expect(optionValues).toContain("ME");
    });

    it("selecting a category filter shows the clear button", async () => {
      renderWithItStaff();
      await waitFor(() => screen.getByLabelText(/filter by category/i));
      fireEvent.change(screen.getByLabelText(/filter by category/i), {
        target: { value: "1" },
      });
      await waitFor(() => {
        expect(screen.getByLabelText(/clear all filters/i)).toBeInTheDocument();
      });
    });
  });

  // -------------------------------------------------------------------------
  // API failure state
  // -------------------------------------------------------------------------
  describe("API Failure State", () => {
    it("shows error message when the queue API fails", async () => {
      setupFetchMock([
        mockAuthMe(mockItStaffUser),
        mockCategories(),
        {
          url: "/api/tickets",
          response: {
            ok: false,
            status: 500,
            json: async () => ({ error: "Internal server error", code: "INTERNAL_SERVER_ERROR" }),
          },
        },
      ]);
      render(
        <AuthProvider>
          <StaffTicketQueue />
        </AuthProvider>
      );
      await waitFor(() => {
        expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
      });
    });
  });

  // -------------------------------------------------------------------------
  // Ticket selection interaction
  // -------------------------------------------------------------------------
  describe("Ticket selection", () => {
    it("calls onSelectTicket with ticket id when the View Detail button is clicked", async () => {
      const onSelectTicket = vi.fn();
      renderWithItStaff({ onSelectTicket });
      await waitFor(() => {
        expect(screen.getAllByText("TKT-2026-000101").length).toBeGreaterThanOrEqual(1);
      });
      // The mobile card always has an explicit accessible "View Detail" button
      const viewDetailBtn = screen.getByRole("button", {
        name: /view detail for ticket TKT-2026-000101/i,
      });
      fireEvent.click(viewDetailBtn);
      expect(onSelectTicket).toHaveBeenCalledWith(101);
    });
  });

  // -------------------------------------------------------------------------
  // Column headings — query via the table element (display:none via CSS in browser,
  // but still present in jsdom DOM)
  // -------------------------------------------------------------------------
  describe("Table column headings", () => {
    it("renders all required column headers in the data table", async () => {
      renderWithItStaff();
      await waitFor(() => {
        expect(screen.getAllByText("TKT-2026-000101").length).toBeGreaterThanOrEqual(1);
      });
      const table = document.querySelector("#staff-queue-table");
      expect(table).not.toBeNull();
      const tableText = table!.textContent || "";
      expect(tableText).toMatch(/ticket no/i);
      expect(tableText).toMatch(/summary/i);
      expect(tableText).toMatch(/category/i);
      expect(tableText).toMatch(/req\. priority/i);
      expect(tableText).toMatch(/it priority/i);
      expect(tableText).toMatch(/owner/i);
      expect(tableText).toMatch(/last updated/i);
    });
  });

  // -------------------------------------------------------------------------
  // Ticket count display
  // -------------------------------------------------------------------------
  describe("Ticket count display", () => {
    it("displays the total ticket count in the header sub-title", async () => {
      setupFetchMock([
        mockAuthMe(mockItStaffUser),
        mockCategories(),
        mockTicketsQueue(
          [makeTicket(), makeTicket({ id: 102, ticketNumber: "TKT-2026-000102", summary: "Another ticket" })],
          makePagination({ totalItems: 2, totalPages: 1 })
        ),
      ]);
      render(
        <AuthProvider>
          <StaffTicketQueue />
        </AuthProvider>
      );
      await waitFor(() => {
        expect(screen.getByText(/showing 1.+2 of 2/i)).toBeInTheDocument();
      });
    });
  });
});
