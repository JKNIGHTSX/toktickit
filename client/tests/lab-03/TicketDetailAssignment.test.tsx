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
    assignTicket: vi.fn(),
    updateTicketITPriority: vi.fn(),
    updateTicketStatus: vi.fn(),
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

describe("Ticket Detail assignment controls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.fetchCurrentUser).mockResolvedValue(staffUser);
    vi.mocked(api.fetchTicketDetail).mockResolvedValue(ticket);
    vi.mocked(api.fetchAssignableUsers).mockResolvedValue([
      { id: 3, name: "Tech Two", email: "tech2@toktickit.local", role: "IT_STAFF", isActive: true },
      { id: 4, name: "Inactive Tech", email: "inactive@toktickit.local", role: "IT_STAFF", isActive: false },
      { id: 5, name: "Admin One", email: "admin@toktickit.local", role: "ADMINISTRATOR", isActive: true },
    ]);
    vi.mocked(api.assignTicket).mockResolvedValue({
      data: { id: ticket.id, ownerId: 3, owner: { id: 3, name: "Tech Two" }, status: "NEW" },
      message: "Ticket reassigned successfully",
    });
    vi.mocked(api.updateTicketITPriority).mockResolvedValue({
      data: { id: ticket.id, itPriority: "HIGH", updatedAt: "2026-10-05T10:05:00.000Z" },
      message: "IT Priority updated to HIGH",
    });
    vi.mocked(api.updateTicketStatus).mockResolvedValue({
      data: {
        id: ticket.id,
        status: "RESOLVED",
        resolutionSummary: "Issue fixed",
        updatedAt: "2026-10-05T10:10:00.000Z",
      },
      message: "Ticket status updated to RESOLVED",
    });
  });

  it("shows active assignees, enables Assign on selection, and submits the selected owner", async () => {
    render(
      <AuthProvider>
        <TicketDetail ticketId={ticket.id} onBack={vi.fn()} />
      </AuthProvider>
    );

    await screen.findByText(ticket.ticketNumber);
    expect(screen.getByRole("button", { name: /Back to Ticket Queue/i })).toBeInTheDocument();
    const assigneeSelect = screen.getByRole("combobox", { name: "Assign to IT Staff or Administrator" });
    expect(await screen.findByRole("option", { name: /Tech Two \(IT Staff\)/ })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Admin One \(Administrator\)/ })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /Inactive Tech/ })).not.toBeInTheDocument();

    const assignButton = screen.getByRole("button", { name: "Assign" });
    expect(assignButton).toBeDisabled();

    fireEvent.change(assigneeSelect, { target: { value: "3" } });
    expect(assignButton).toBeEnabled();
    fireEvent.click(assignButton);

    await waitFor(() => expect(api.assignTicket).toHaveBeenCalledWith(ticket.id, 3));
    expect(await screen.findByRole("status")).toHaveTextContent("Assigned to Tech Two");
  });

  it("saves a changed IT Priority through the priority API", async () => {
    render(
      <AuthProvider>
        <TicketDetail ticketId={ticket.id} onBack={vi.fn()} />
      </AuthProvider>
    );

    await screen.findByText(ticket.ticketNumber);
    fireEvent.change(screen.getByRole("combobox", { name: "Update IT Priority" }), {
      target: { value: "HIGH" },
    });
    const saveButton = screen.getByRole("button", { name: "Save Priority" });
    expect(saveButton).toBeEnabled();
    fireEvent.click(saveButton);

    await waitFor(() => expect(api.updateTicketITPriority).toHaveBeenCalledWith(ticket.id, "HIGH"));
    expect(await screen.findByRole("status")).toHaveTextContent("IT Priority updated to HIGH");
  });

  it("requires a resolution summary and submits a permitted status transition", async () => {
    vi.mocked(api.fetchTicketDetail).mockResolvedValue({ ...ticket, status: "IN_PROGRESS" });

    render(
      <AuthProvider>
        <TicketDetail ticketId={ticket.id} onBack={vi.fn()} />
      </AuthProvider>
    );

    await screen.findByText(ticket.ticketNumber);
    const resolveButton = screen.getByRole("button", { name: "Resolve Ticket" });
    expect(resolveButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Resolution Summary"), {
      target: { value: "Issue fixed" },
    });
    expect(resolveButton).toBeEnabled();
    fireEvent.click(resolveButton);

    await waitFor(() => {
      expect(api.updateTicketStatus).toHaveBeenCalledWith(ticket.id, "RESOLVED", "Issue fixed");
    });
    expect(await screen.findByRole("status")).toHaveTextContent("Ticket status updated to RESOLVED");
  });
});