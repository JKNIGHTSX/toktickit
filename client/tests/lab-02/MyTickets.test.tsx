import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MyTickets } from "../../src/components/MyTickets";
import * as RequesterModule from "../../src/context/RequesterContext";
import * as api from "../../src/api";

// Mock API functions
vi.mock("../../src/api", () => ({
  fetchCategories: vi.fn(),
  fetchTickets: vi.fn(),
}));

// Mock useRequester hook
vi.mock("../../src/context/RequesterContext", () => ({
  useRequester: vi.fn(),
}));

const mockRequester = {
  id: 1,
  name: "Jennifer Anderson",
  email: "jennifer.anderson@toktickit.local",
  department: "Marketing",
  isActive: true,
};

const mockCategories = [
  { id: 1, name: "Account and Access" },
  { id: 2, name: "Hardware" },
];

const mockTickets: api.TicketListItem[] = [
  {
    id: 1,
    ticketNumber: "TKT-2026-000001",
    requesterId: 1,
    category: { id: 2, name: "Hardware" },
    relatedSystem: { id: 7, name: "Corporate Laptop" },
    summary: "Laptop battery drains quickly",
    requestedPriority: "MEDIUM",
    itPriority: "MEDIUM",
    status: "NEW",
    ticketOwnerName: "Michael Support",
    createdAt: "2026-09-04T10:00:00.000Z",
    updatedAt: "2026-09-04T10:00:00.000Z",
    attachmentCount: 0,
  },
  {
    id: 2,
    ticketNumber: "TKT-2026-000002",
    requesterId: 1,
    category: { id: 1, name: "Account and Access" },
    relatedSystem: { id: 3, name: "VPN" },
    summary: "VPN password reset needed",
    requestedPriority: "HIGH",
    itPriority: null,
    status: "OPEN",
    ticketOwnerName: null,
    createdAt: "2026-09-05T12:00:00.000Z",
    updatedAt: "2026-09-05T12:00:00.000Z",
    attachmentCount: 1,
  },
];

const mockPaginatedResponse: api.PaginatedTicketsResponse = {
  data: mockTickets,
  pagination: {
    page: 1,
    pageSize: 10,
    totalItems: 2,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  },
};

function setupRequesterMock() {
  (RequesterModule.useRequester as any).mockReturnValue({
    currentRequester: mockRequester,
    requesters: [mockRequester],
    isLoading: false,
    error: null,
    selectRequester: vi.fn(),
    clearRequester: vi.fn(),
  });
}

describe("MyTickets UI Component (Lab 2 — Issue #5)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupRequesterMock();
    (api.fetchCategories as any).mockResolvedValue(mockCategories);
  });

  it("UI-06: renders ticket list when tickets are returned", async () => {
    (api.fetchTickets as any).mockResolvedValue(mockPaginatedResponse);

    render(<MyTickets />);

    await waitFor(() => {
      expect(screen.getAllByText("TKT-2026-000001")[0]).toBeInTheDocument();
      expect(screen.getAllByText("Laptop battery drains quickly")[0]).toBeInTheDocument();
      expect(screen.getAllByText("VPN password reset needed")[0]).toBeInTheDocument();
    });

    expect(api.fetchTickets).toHaveBeenCalledWith(
      expect.objectContaining({ requesterId: 1, page: 1, pageSize: 10 }),
      1
    );
  });

  it("UI-06 / AC-14: renders empty state when selected requester has 0 tickets overall", async () => {
    (api.fetchTickets as any).mockResolvedValue({
      data: [],
      pagination: { page: 1, pageSize: 10, totalItems: 0, totalPages: 0, hasNextPage: false, hasPrevPage: false },
    });

    render(<MyTickets onCreateTicket={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("No tickets submitted yet")).toBeInTheDocument();
      expect(screen.getByText("+ Create Your First Ticket")).toBeInTheDocument();
    });
  });

  it("UI-07 / AC-15: renders no-results state when search/filter returns zero matches", async () => {
    (api.fetchTickets as any).mockResolvedValue({
      data: [],
      pagination: { page: 1, pageSize: 10, totalItems: 0, totalPages: 0, hasNextPage: false, hasPrevPage: false },
    });

    render(<MyTickets />);

    const searchInput = screen.getByPlaceholderText("Search by ticket number or summary…");
    fireEvent.change(searchInput, { target: { value: "nonexistent term" } });

    await waitFor(() => {
      expect(screen.getByText("No matching tickets found")).toBeInTheDocument();
      expect(screen.getByText("Clear All Filters")).toBeInTheDocument();
    });
  });

  it("renders error state when fetching tickets fails", async () => {
    (api.fetchTickets as any).mockRejectedValue(new Error("Network connection lost"));

    render(<MyTickets />);

    await waitFor(() => {
      expect(screen.getByText(/Network connection lost/i)).toBeInTheDocument();
      expect(screen.getByText("Retry")).toBeInTheDocument();
    });
  });

  it("UI-08: search input updates fetch parameters", async () => {
    (api.fetchTickets as any).mockResolvedValue(mockPaginatedResponse);

    render(<MyTickets />);

    await waitFor(() => {
      expect(api.fetchTickets).toHaveBeenCalledTimes(1);
    });

    const searchInput = screen.getByPlaceholderText("Search by ticket number or summary…");
    fireEvent.change(searchInput, { target: { value: "battery" } });

    await waitFor(() => {
      expect(api.fetchTickets).toHaveBeenLastCalledWith(
        expect.objectContaining({ search: "battery" }),
        1
      );
    });
  });

  it("UI-08: clear filters button resets all filter controls", async () => {
    (api.fetchTickets as any).mockResolvedValue(mockPaginatedResponse);

    render(<MyTickets />);

    const searchInput = screen.getByPlaceholderText("Search by ticket number or summary…");
    fireEvent.change(searchInput, { target: { value: "battery" } });

    await waitFor(() => {
      expect(screen.getByText("Clear Filters")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Clear Filters"));

    await waitFor(() => {
      expect((searchInput as HTMLInputElement).value).toBe("");
    });
  });
});
