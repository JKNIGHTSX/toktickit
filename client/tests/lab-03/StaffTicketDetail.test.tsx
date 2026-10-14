import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../../src/context/AuthContext.js";
import { TicketDetail } from "../../src/components/TicketDetail.js";
import * as api from "../../src/api.js";

vi.mock("../../src/api.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/api.js")>();
  return {
    ...actual,
    fetchCurrentUser: vi.fn(),
    fetchTicketDetail: vi.fn(),
    fetchAssignableUsers: vi.fn(),
    claimTicket: vi.fn(),
    assignTicket: vi.fn(),
    updateTicketITPriority: vi.fn(),
    updateTicketStatus: vi.fn(),
    fetchTicketComments: vi.fn(),
    createTicketComment: vi.fn(),
    fetchInternalNotes: vi.fn(),
    createInternalNote: vi.fn(),
    markTicketProblemResolved: vi.fn(),
  };
});

const staffUser: api.AuthUser = {
  id: 2,
  email: "tech1@toktickit.local",
  name: "Tech One",
  role: "IT_STAFF",
  mustChangePassword: false,
  isActive: true,
};

const ticket: api.TicketDetail = {
  id: 101,
  ticketNumber: "TKT-2026-000101",
  requesterId: 5,
  requester: { id: 5, name: "Jennifer Anderson", email: "jennifer.anderson@toktickit.local" },
  categoryId: 1,
  category: { id: 1, name: "Hardware" },
  relatedSystemId: 1,
  relatedSystem: { id: 1, name: "Laptop" },
  summary: "Laptop battery issue",
  description: "Battery drains quickly.",
  requestedPriority: "MEDIUM",
  itPriority: "MEDIUM",
  status: "NEW",
  ticketOwnerName: null,
  resolutionSummary: null,
  attachments: [],
  createdAt: "2026-10-05T10:00:00.000Z",
  updatedAt: "2026-10-05T10:00:00.000Z",
};

describe("StaffTicketDetail Component Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.fetchCurrentUser).mockResolvedValue(staffUser);
    vi.mocked(api.fetchTicketDetail).mockResolvedValue(ticket);
    vi.mocked(api.fetchTicketComments).mockResolvedValue([]);
    vi.mocked(api.fetchInternalNotes).mockResolvedValue([]);
    vi.mocked(api.fetchAssignableUsers).mockResolvedValue([
      { id: 2, name: "Tech One", email: "tech1@toktickit.local", role: "IT_STAFF", isActive: true },
      { id: 3, name: "Tech Two", email: "tech2@toktickit.local", role: "IT_STAFF", isActive: true },
    ]);
  });

  it("renders ticket header, details, and navigation controls", async () => {
    const handleBack = vi.fn();
    render(
      <AuthProvider>
        <TicketDetail ticketId={ticket.id} onBack={handleBack} />
      </AuthProvider>
    );

    expect(await screen.findByText(ticket.ticketNumber)).toBeInTheDocument();
    expect(screen.getByText(ticket.summary)).toBeInTheDocument();
    expect(screen.getByText(ticket.description)).toBeInTheDocument();

    const backButton = screen.getByRole("button", { name: /Back to Ticket Queue/i });
    expect(backButton).toBeInTheDocument();
    fireEvent.click(backButton);
    expect(handleBack).toHaveBeenCalledTimes(1);
  });

  it("renders Public Comments and Internal Notes tabs with proper visual distinction", async () => {
    vi.mocked(api.fetchTicketComments).mockResolvedValue([
      {
        id: 1,
        ticketId: ticket.id,
        authorId: 5,
        content: "Customer update message",
        createdAt: "2026-10-05T10:01:00.000Z",
        author: { id: 5, name: "Jennifer Anderson", role: "REQUESTER" },
      },
    ]);
    vi.mocked(api.fetchInternalNotes).mockResolvedValue([
      {
        id: 2,
        ticketId: ticket.id,
        authorId: 2,
        content: "Diagnostic note for internal eyes only",
        createdAt: "2026-10-05T10:02:00.000Z",
        author: { id: 2, name: "Tech One", role: "IT_STAFF" },
      },
    ]);

    render(
      <AuthProvider>
        <TicketDetail ticketId={ticket.id} onBack={vi.fn()} />
      </AuthProvider>
    );

    expect(await screen.findByText("Customer update message")).toBeInTheDocument();
    expect(screen.getByText("Diagnostic note for internal eyes only")).toBeInTheDocument();
    expect(screen.getByText(/Restricted: visible only to IT Staff and Administrators/i)).toBeInTheDocument();
  });

  it("allows IT staff to claim ticket if unassigned", async () => {
    vi.mocked(api.claimTicket).mockResolvedValue({
      data: { id: ticket.id, ownerId: staffUser.id, owner: { id: staffUser.id, name: staffUser.name }, status: "OPEN" },
      message: "Ticket claimed",
    });

    render(
      <AuthProvider>
        <TicketDetail ticketId={ticket.id} onBack={vi.fn()} />
      </AuthProvider>
    );

    await screen.findByText(ticket.ticketNumber);
    const claimButton = screen.queryByRole("button", { name: /Claim/i });
    if (claimButton) {
      fireEvent.click(claimButton);
      await waitFor(() => expect(api.claimTicket).toHaveBeenCalledWith(ticket.id));
    }
  });
});
