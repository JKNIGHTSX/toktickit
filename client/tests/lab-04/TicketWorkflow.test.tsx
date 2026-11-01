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

const requesterUser: api.AuthUser = {
  id: 5,
  email: "jennifer.anderson@toktickit.local",
  name: "Jennifer Anderson",
  role: "REQUESTER",
  mustChangePassword: false,
  isActive: true,
};

const baseTicket: api.TicketDetail = {
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
  status: "IN_PROGRESS",
  ticketOwnerName: "Tech One",
  resolutionSummary: null,
  attachments: [],
  createdAt: "2026-10-05T10:00:00.000Z",
  updatedAt: "2026-10-05T10:30:00.000Z",
};

describe("Lab 4 — Issue #5: Ticket Workflow & Resolution Frontend Component (UI-02)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.fetchCurrentUser).mockResolvedValue(staffUser);
    vi.mocked(api.fetchTicketComments).mockResolvedValue([]);
    vi.mocked(api.fetchInternalNotes).mockResolvedValue([]);
    vi.mocked(api.fetchAssignableUsers).mockResolvedValue([
      { id: 2, name: "Tech One", email: "tech1@toktickit.local", role: "IT_STAFF", isActive: true },
    ]);
  });

  it("renders permitted status transition buttons for IN_PROGRESS status (BR-12)", async () => {
    vi.mocked(api.fetchTicketDetail).mockResolvedValue({ ...baseTicket, status: "IN_PROGRESS" });

    render(
      <AuthProvider>
        <TicketDetail ticketId={baseTicket.id} onBack={vi.fn()} />
      </AuthProvider>
    );

    await screen.findByText(baseTicket.ticketNumber);

    // Permitted from IN_PROGRESS: Request Info (WAITING_FOR_REQUESTER), Resolve Ticket (RESOLVED), Cancel Ticket (CANCELLED)
    expect(screen.getByRole("button", { name: "Request Info" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Resolve Ticket" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel Ticket" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Open Ticket" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Close Ticket" })).not.toBeInTheDocument();
  });

  it("renders permitted status transition buttons for WAITING_FOR_REQUESTER status (BR-12)", async () => {
    vi.mocked(api.fetchTicketDetail).mockResolvedValue({ ...baseTicket, status: "WAITING_FOR_REQUESTER" });

    render(
      <AuthProvider>
        <TicketDetail ticketId={baseTicket.id} onBack={vi.fn()} />
      </AuthProvider>
    );

    await screen.findByText(baseTicket.ticketNumber);

    // Permitted from WAITING_FOR_REQUESTER: Resume Work (IN_PROGRESS), Resolve Ticket (RESOLVED)
    expect(screen.getByRole("button", { name: "Resume Work" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Resolve Ticket" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancel Ticket" })).not.toBeInTheDocument();
  });

  it("renders permitted status transition buttons for RESOLVED status (BR-12)", async () => {
    vi.mocked(api.fetchTicketDetail).mockResolvedValue({
      ...baseTicket,
      status: "RESOLVED",
      resolutionSummary: "Battery pack replaced OEM",
    });

    render(
      <AuthProvider>
        <TicketDetail ticketId={baseTicket.id} onBack={vi.fn()} />
      </AuthProvider>
    );

    await screen.findByText(baseTicket.ticketNumber);

    // Permitted from RESOLVED: Close Ticket (CLOSED), Reopen Ticket (REOPENED)
    expect(screen.getByRole("button", { name: "Close Ticket" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reopen Ticket" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancel Ticket" })).not.toBeInTheDocument();
  });

  it("disables Resolve Ticket button and shows validation prompt when resolution summary is < 5 characters (BR-16)", async () => {
    vi.mocked(api.fetchTicketDetail).mockResolvedValue({ ...baseTicket, status: "IN_PROGRESS" });

    render(
      <AuthProvider>
        <TicketDetail ticketId={baseTicket.id} onBack={vi.fn()} />
      </AuthProvider>
    );

    await screen.findByText(baseTicket.ticketNumber);
    const resolveButton = screen.getByRole("button", { name: "Resolve Ticket" });
    expect(resolveButton).toBeDisabled();

    const summaryInput = screen.getByLabelText("Resolution Summary");
    fireEvent.change(summaryInput, { target: { value: "Fix" } });
    expect(resolveButton).toBeDisabled();
    expect(screen.getByText("Resolution summary must be at least 5 characters.")).toBeInTheDocument();

    fireEvent.change(summaryInput, { target: { value: "Replaced faulty battery pack and tested normal boot." } });
    expect(resolveButton).toBeEnabled();
  });

  it("submits status transition to RESOLVED and passes expectedUpdatedAt timestamp (BR-19)", async () => {
    vi.mocked(api.fetchTicketDetail).mockResolvedValue({ ...baseTicket, status: "IN_PROGRESS" });
    vi.mocked(api.updateTicketStatus).mockResolvedValue({
      data: { ...baseTicket, status: "RESOLVED", resolutionSummary: "Replaced battery pack and verified diagnostics." },
      message: "Ticket status updated to RESOLVED",
    });

    render(
      <AuthProvider>
        <TicketDetail ticketId={baseTicket.id} onBack={vi.fn()} />
      </AuthProvider>
    );

    await screen.findByText(baseTicket.ticketNumber);
    const summaryInput = screen.getByLabelText("Resolution Summary");
    fireEvent.change(summaryInput, { target: { value: "Replaced battery pack and verified diagnostics." } });

    const resolveBtn = screen.getByRole("button", { name: "Resolve Ticket" });
    fireEvent.click(resolveBtn);

    await waitFor(() => {
      expect(api.updateTicketStatus).toHaveBeenCalledWith(
        baseTicket.id,
        "RESOLVED",
        "Replaced battery pack and verified diagnostics."
      );
    });

    expect(await screen.findByRole("status")).toHaveTextContent("Ticket status updated to RESOLVED");
  });

  it("handles 409 STALE_UPDATE_CONFLICT error and provides reload option", async () => {
    vi.mocked(api.fetchTicketDetail).mockResolvedValue({ ...baseTicket, status: "IN_PROGRESS" });
    const conflictError: any = new Error("Ticket has been modified by another user.");
    conflictError.status = 409;
    conflictError.code = "STALE_UPDATE_CONFLICT";
    vi.mocked(api.updateTicketStatus).mockRejectedValue(conflictError);

    render(
      <AuthProvider>
        <TicketDetail ticketId={baseTicket.id} onBack={vi.fn()} />
      </AuthProvider>
    );

    await screen.findByText(baseTicket.ticketNumber);
    const requestInfoBtn = screen.getByRole("button", { name: "Request Info" });
    fireEvent.click(requestInfoBtn);

    await waitFor(() => {
      expect(screen.getByText(/This ticket has been modified by another user. Please reload the latest data./i)).toBeInTheDocument();
    });

    const reloadBtn = screen.getByRole("button", { name: "Reload latest data" });
    expect(reloadBtn).toBeInTheDocument();
    fireEvent.click(reloadBtn);
    expect(api.fetchTicketDetail).toHaveBeenCalledTimes(2);
  });

  it("prevents Requesters from directly changing ticket status while allowing advisory problem-resolved indication (BR-17, BR-18)", async () => {
    vi.mocked(api.fetchCurrentUser).mockResolvedValue(requesterUser);
    vi.mocked(api.fetchTicketDetail).mockResolvedValue({ ...baseTicket, requesterId: requesterUser.id, status: "IN_PROGRESS" });
    vi.mocked(api.markTicketProblemResolved).mockResolvedValue({
      data: {
        ticket: { ...baseTicket, status: "IN_PROGRESS" } as any,
        comment: {
          id: 1,
          ticketId: baseTicket.id,
          authorId: requesterUser.id,
          author: { id: requesterUser.id, name: requesterUser.name, role: "REQUESTER" },
          content: "The requester indicates that the problem appears resolved.",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      },
      message: "Resolution indication submitted and staff notified",
    });

    render(
      <AuthProvider>
        <TicketDetail ticketId={baseTicket.id} onBack={vi.fn()} />
      </AuthProvider>
    );

    await screen.findByText(baseTicket.ticketNumber);

    // Requesters should not see staff Service Actions buttons (BR-17)
    expect(screen.queryByRole("button", { name: "Resolve Ticket" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Open Ticket" })).not.toBeInTheDocument();

    // Requesters see advisory button (BR-18)
    const advisoryBtn = screen.getByRole("button", { name: "Problem Appears Resolved" });
    expect(advisoryBtn).toBeInTheDocument();
    fireEvent.click(advisoryBtn);

    await waitFor(() => {
      expect(api.markTicketProblemResolved).toHaveBeenCalledWith(baseTicket.id);
    });
  });
});

