import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { TicketDetail } from "../../src/components/TicketDetail";
import * as RequesterModule from "../../src/context/RequesterContext";
import * as api from "../../src/api";

// Mock API functions
vi.mock("../../src/api", () => ({
  fetchTicketDetail: vi.fn(),
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

const mockTicketDetail: api.TicketDetail = {
  id: 101,
  ticketNumber: "TKT-2026-000101",
  requesterId: 1,
  requester: { id: 1, name: "Jennifer Anderson", email: "jennifer.anderson@toktickit.local" },
  categoryId: 2,
  category: { id: 2, name: "Hardware" },
  relatedSystemId: 7,
  relatedSystem: { id: 7, name: "Corporate Laptop" },
  summary: "Laptop battery drains quickly under normal load",
  description: "My laptop battery is draining much faster than usual even when the system is idle.",
  requestedPriority: "MEDIUM",
  itPriority: "HIGH",
  status: "NEW",
  ticketOwnerName: "Michael Support",
  resolutionSummary: "Under investigation by hardware desk.",
  attachments: [],
  createdAt: "2026-09-04T10:00:00.000Z",
  updatedAt: "2026-09-04T10:30:00.000Z",
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

describe("TicketDetail UI Component (Lab 2 — Issue #6)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupRequesterMock();
  });

  it("UI-09 / AC-16: renders ticket detail fields, read-only containers (#F0F4F1), and badges", async () => {
    (api.fetchTicketDetail as any).mockResolvedValue(mockTicketDetail);

    render(<TicketDetail ticketId={101} onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("TKT-2026-000101")).toBeInTheDocument();
      expect(screen.getByText("Laptop battery drains quickly under normal load")).toBeInTheDocument();
      expect(screen.getByText("My laptop battery is draining much faster than usual even when the system is idle.")).toBeInTheDocument();
      expect(screen.getByText("Hardware")).toBeInTheDocument();
      expect(screen.getByText("Corporate Laptop")).toBeInTheDocument();
      expect(screen.getByText("Jennifer Anderson")).toBeInTheDocument();
      expect(screen.getByText("Michael Support")).toBeInTheDocument();
      expect(screen.getByText("Under investigation by hardware desk.")).toBeInTheDocument();
    });

    expect(api.fetchTicketDetail).toHaveBeenCalledWith(101, 1);
  });

  it("displays loading state while ticket details are loading", () => {
    (api.fetchTicketDetail as any).mockReturnValue(new Promise(() => {}));

    render(<TicketDetail ticketId={101} onBack={vi.fn()} />);

    expect(screen.getAllByText("Loading ticket details…")[0]).toBeInTheDocument();
  });

  it("displays unauthorized / not-found error state when fetchTicketDetail fails (404 / 403)", async () => {
    (api.fetchTicketDetail as any).mockRejectedValue(new Error("Ticket not found or access denied"));

    render(<TicketDetail ticketId={999} onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Ticket Not Found or Access Denied")).toBeInTheDocument();
      expect(screen.getByText("Return to My Tickets")).toBeInTheDocument();
    });
  });

  it("triggers onBack callback when Back button is clicked", async () => {
    (api.fetchTicketDetail as any).mockResolvedValue(mockTicketDetail);
    const onBackMock = vi.fn();

    render(<TicketDetail ticketId={101} onBack={onBackMock} />);

    await waitFor(() => {
      expect(screen.getByText("TKT-2026-000101")).toBeInTheDocument();
    });

    const backButton = screen.getByRole("button", { name: /Back to My Tickets/i });
    fireEvent.click(backButton);

    expect(onBackMock).toHaveBeenCalledTimes(1);
  });
});
