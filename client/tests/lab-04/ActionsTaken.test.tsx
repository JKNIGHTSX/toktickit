import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ActionsTakenComponent } from "../../src/components/ActionsTaken.js";
import * as api from "../../src/api.js";
import * as AuthContextModule from "../../src/context/AuthContext.js";

// Mock api methods
vi.mock("../../src/api.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/api.js")>();
  return {
    ...actual,
    fetchTicketActions: vi.fn(),
    createActionTaken: vi.fn(),
    updateActionTaken: vi.fn(),
  };
});

// Mock AuthContext
vi.mock("../../src/context/AuthContext.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/context/AuthContext.js")>();
  return {
    ...actual,
    useAuth: vi.fn(),
  };
});

describe("Lab 4 — Issue #4: Actions Taken UI Component Tests", () => {
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

  const requesterUser: api.AuthUser = {
    id: 30,
    email: "requester@toktickit.local",
    name: "Jane Doe",
    role: "REQUESTER",
    mustChangePassword: false,
    isActive: true,
  };

  const mockActions: api.ActionTaken[] = [
    {
      id: 101,
      ticketId: 1,
      performedById: 10,
      performedBy: {
        id: 10,
        name: "Michael Brown",
        email: "staff@toktickit.local",
        role: "IT_STAFF",
      },
      actionDateTime: "2026-10-21T10:30:00.000Z",
      actionDescription: "Replaced swollen battery pack with OEM Part #BAT-992.",
      result: "Laptop boots normally on battery power.",
      isFollowUpRequired: true,
      followUpNote: "Monitor battery charging cycle over next 24 hours.",
      attachmentNotes: "Hardware serial logged on asset tag 55829.",
      createdAt: "2026-10-21T10:35:00.000Z",
      updatedAt: "2026-10-21T10:35:00.000Z",
    },
    {
      id: 102,
      ticketId: 1,
      performedById: 20,
      performedBy: {
        id: 20,
        name: "Admin User",
        email: "admin@toktickit.local",
        role: "ADMINISTRATOR",
      },
      actionDateTime: "2026-10-21T09:15:00.000Z",
      actionDescription: "Run battery diagnostics report.",
      result: "Degraded cell #2 identified.",
      isFollowUpRequired: false,
      followUpNote: null,
      attachmentNotes: null,
      createdAt: "2026-10-21T09:20:00.000Z",
      updatedAt: "2026-10-21T09:20:00.000Z",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
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
    vi.mocked(api.fetchTicketActions).mockResolvedValue(mockActions);
  });

  it("UI-01: renders the Actions Taken section and list with performer, dates, results, and badges", async () => {
    render(<ActionsTakenComponent ticketId={1} />);

    expect(screen.getByText(/loading actions taken/i)).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: /actions taken \(2\)/i })).toBeInTheDocument();

    // Verify description, results, and performer details
    expect(screen.getAllByText("Replaced swollen battery pack with OEM Part #BAT-992.").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Laptop boots normally on battery power.").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Michael Brown").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/follow-up required:/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/monitor battery charging cycle over next 24 hours/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/hardware serial logged on asset tag 55829/i).length).toBeGreaterThan(0);

    // Second action
    expect(screen.getAllByText("Run battery diagnostics report.").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Degraded cell #2 identified.").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/no follow-up required/i).length).toBeGreaterThan(0);
  });

  it("UI-01: renders empty state when no actions taken exist", async () => {
    vi.mocked(api.fetchTicketActions).mockResolvedValue([]);

    render(<ActionsTakenComponent ticketId={1} />);

    expect(await screen.findByRole("heading", { name: /actions taken \(0\)/i })).toBeInTheDocument();
    expect(screen.getByText(/no actions taken recorded yet/i)).toBeInTheDocument();
  });

  it("UI-01: enforces Requester read-only restrictions (hides + Record Action Taken and Edit buttons)", async () => {
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

    render(<ActionsTakenComponent ticketId={1} />);

    await screen.findByRole("heading", { name: /actions taken \(2\)/i });

    // Requester can view details
    expect(screen.getAllByText("Replaced swollen battery pack with OEM Part #BAT-992.").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/monitor battery charging cycle over next 24 hours/i).length).toBeGreaterThan(0);

    // But cannot create or edit
    expect(screen.queryByRole("button", { name: /\+ record action taken/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /edit action/i })).not.toBeInTheDocument();
  });

  it("UI-01: allows IT Staff to open create modal and displays performer stamped from session", async () => {
    render(<ActionsTakenComponent ticketId={1} />);

    await screen.findByRole("heading", { name: /actions taken \(2\)/i });
    const recordBtn = screen.getByRole("button", { name: /\+ record action taken/i });
    fireEvent.click(recordBtn);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /record action taken/i })).toBeInTheDocument();

    // Check that Performed By input contains authenticated user name and is disabled/readonly
    const performedByInput = screen.getByDisplayValue(/Michael Brown \(IT Staff\) - Auto-assigned/i);
    expect(performedByInput).toBeDisabled();
  });

  it("UI-01: validates minimum length for description, result, and conditional follow-up note", async () => {
    render(<ActionsTakenComponent ticketId={1} />);

    await screen.findByRole("heading", { name: /actions taken \(2\)/i });
    fireEvent.click(screen.getByRole("button", { name: /\+ record action taken/i }));

    const submitBtn = screen.getByRole("button", { name: /save action/i });

    // Submit empty form
    fireEvent.click(submitBtn);

    expect(await screen.findByText(/action description is required/i)).toBeInTheDocument();
    expect(screen.getByText(/result is required/i)).toBeInTheDocument();

    // Type short description (<5 chars) and short result (<2 chars)
    fireEvent.change(screen.getByPlaceholderText(/describe what technical action was performed/i), {
      target: { value: "fix" },
    });
    fireEvent.change(screen.getByPlaceholderText(/describe the outcome or finding/i), {
      target: { value: "a" },
    });
    fireEvent.click(submitBtn);

    expect(screen.getByText(/action description must be between 5 and 1000 characters/i)).toBeInTheDocument();
    expect(screen.getByText(/result must be between 2 and 1000 characters/i)).toBeInTheDocument();

    // Toggle Follow-Up switch and verify follow-up note is required
    const followUpSwitch = screen.getByLabelText(/follow-up required\?/i);
    fireEvent.click(followUpSwitch);

    // Submit with followUp checked but note empty
    fireEvent.click(submitBtn);
    expect(await screen.findByText(/follow-up note is required/i)).toBeInTheDocument();

    // Enter short follow-up note (<3 chars)
    const followUpInput = screen.getByPlaceholderText(/detail what next steps or monitoring are required/i);
    fireEvent.change(followUpInput, { target: { value: "no" } });
    fireEvent.click(submitBtn);
    expect(screen.getByText(/follow-up note is required \(between 3 and 1000 characters\)/i)).toBeInTheDocument();

    // Check that unchecking Follow-Up clears requirement
    fireEvent.click(followUpSwitch);
    expect(screen.queryByPlaceholderText(/detail what next steps or monitoring are required/i)).not.toBeInTheDocument();
  });

  it("UI-01: successfully records a new action taken and prepends to list", async () => {
    const newAction: api.ActionTaken = {
      id: 103,
      ticketId: 1,
      performedById: 10,
      performedBy: {
        id: 10,
        name: "Michael Brown",
        email: "staff@toktickit.local",
        role: "IT_STAFF",
      },
      actionDateTime: "2026-10-22T08:00:00.000Z",
      actionDescription: "Replaced thermal paste on heatsink.",
      result: "CPU idle temperatures reduced to 38°C.",
      isFollowUpRequired: true,
      followUpNote: "Check thermal logs after full stress test.",
      attachmentNotes: "Benchmark report tag #7712",
      createdAt: "2026-10-22T08:05:00.000Z",
      updatedAt: "2026-10-22T08:05:00.000Z",
    };

    vi.mocked(api.createActionTaken).mockResolvedValue({
      data: newAction,
      message: "Action taken recorded successfully",
    });

    render(<ActionsTakenComponent ticketId={1} />);

    await screen.findByRole("heading", { name: /actions taken \(2\)/i });
    fireEvent.click(screen.getByRole("button", { name: /\+ record action taken/i }));

    fireEvent.change(screen.getByPlaceholderText(/describe what technical action was performed/i), {
      target: { value: "Replaced thermal paste on heatsink." },
    });
    fireEvent.change(screen.getByPlaceholderText(/describe the outcome or finding/i), {
      target: { value: "CPU idle temperatures reduced to 38°C." },
    });
    fireEvent.click(screen.getByLabelText(/follow-up required\?/i));
    fireEvent.change(screen.getByPlaceholderText(/detail what next steps or monitoring are required/i), {
      target: { value: "Check thermal logs after full stress test." },
    });
    fireEvent.change(screen.getByPlaceholderText(/Asset tag 55829/i), {
      target: { value: "Benchmark report tag #7712" },
    });

    const saveBtn = screen.getByRole("button", { name: /save action/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(api.createActionTaken).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          actionDescription: "Replaced thermal paste on heatsink.",
          result: "CPU idle temperatures reduced to 38°C.",
          isFollowUpRequired: true,
          followUpNote: "Check thermal logs after full stress test.",
          attachmentNotes: "Benchmark report tag #7712",
        })
      );
    });

    expect(await screen.findByText(/action taken recorded successfully/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /actions taken \(3\)/i })).toBeInTheDocument();
    expect(screen.getAllByText("Replaced thermal paste on heatsink.").length).toBeGreaterThan(0);
  });

  it("UI-01: prevents duplicate submission while request is in-flight", async () => {
    let resolvePromise: (value: any) => void;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    vi.mocked(api.createActionTaken).mockReturnValue(promise as any);

    render(<ActionsTakenComponent ticketId={1} />);

    await screen.findByRole("heading", { name: /actions taken \(2\)/i });
    fireEvent.click(screen.getByRole("button", { name: /\+ record action taken/i }));

    fireEvent.change(screen.getByPlaceholderText(/describe what technical action was performed/i), {
      target: { value: "Testing duplicate submission prevention." },
    });
    fireEvent.change(screen.getByPlaceholderText(/describe the outcome or finding/i), {
      target: { value: "Action pending completion." },
    });

    const saveBtn = screen.getByRole("button", { name: /save action/i });
    fireEvent.click(saveBtn);

    expect(screen.getByText(/saving…/i)).toBeInTheDocument();
    expect(saveBtn).toBeDisabled();

    // Clicking again should not trigger a second API call
    fireEvent.click(saveBtn);
    expect(api.createActionTaken).toHaveBeenCalledTimes(1);

    // Resolve promise
    resolvePromise!({
      data: {
        ...mockActions[0],
        id: 999,
        actionDescription: "Testing duplicate submission prevention.",
      },
      message: "Success",
    });

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("UI-01: allows IT Staff to edit action, sends expectedUpdatedAt, and updates record", async () => {
    const updatedAction: api.ActionTaken = {
      ...mockActions[0],
      actionDescription: "Updated: Replaced swollen battery pack and tested charger.",
      result: "Updated: Peak temperature stabilized.",
      updatedAt: "2026-10-21T11:00:00.000Z",
    };

    vi.mocked(api.updateActionTaken).mockResolvedValue({
      data: updatedAction,
      message: "Action taken updated successfully",
    });

    render(<ActionsTakenComponent ticketId={1} />);

    await screen.findByRole("heading", { name: /actions taken \(2\)/i });
    const editButtons = screen.getAllByRole("button", { name: /edit action/i });
    fireEvent.click(editButtons[0]);

    expect(screen.getByRole("heading", { name: /edit action taken/i })).toBeInTheDocument();

    const descInput = screen.getByPlaceholderText(/describe what technical action was performed/i);
    expect(descInput).toHaveValue("Replaced swollen battery pack with OEM Part #BAT-992.");

    fireEvent.change(descInput, {
      target: { value: "Updated: Replaced swollen battery pack and tested charger." },
    });

    const updateBtn = screen.getByRole("button", { name: /update action/i });
    fireEvent.click(updateBtn);

    await waitFor(() => {
      expect(api.updateActionTaken).toHaveBeenCalledWith(
        101,
        expect.objectContaining({
          actionDescription: "Updated: Replaced swollen battery pack and tested charger.",
          expectedUpdatedAt: "2026-10-21T10:35:00.000Z",
        })
      );
    });

    expect(await screen.findByText(/action taken updated successfully/i)).toBeInTheDocument();
    expect(screen.getAllByText("Updated: Replaced swollen battery pack and tested charger.").length).toBeGreaterThan(0);
  });

  it("UI-01 / AC-14: handles HTTP 409 conflict error without losing entered user data", async () => {
    const conflictError: any = new Error("Action Taken record has been modified by another user.");
    conflictError.status = 409;
    conflictError.code = "STALE_UPDATE_CONFLICT";

    vi.mocked(api.updateActionTaken).mockRejectedValue(conflictError);

    render(<ActionsTakenComponent ticketId={1} />);

    await screen.findByRole("heading", { name: /actions taken \(2\)/i });
    const editButtons = screen.getAllByRole("button", { name: /edit action/i });
    fireEvent.click(editButtons[0]);

    const descInput = screen.getByPlaceholderText(/describe what technical action was performed/i);
    fireEvent.change(descInput, {
      target: { value: "My unsaved edits that should not be lost during 409 conflict." },
    });

    fireEvent.click(screen.getByRole("button", { name: /update action/i }));

    expect(await screen.findByText(/this record has been updated by another user\. please reload the latest data/i)).toBeInTheDocument();
    // User input is preserved in the modal
    expect(descInput).toHaveValue("My unsaved edits that should not be lost during 409 conflict.");
    expect(screen.getByRole("button", { name: /reload latest data/i })).toBeInTheDocument();
  });

  it("UI-01: handles fetch error and allows retry", async () => {
    vi.mocked(api.fetchTicketActions)
      .mockRejectedValueOnce(new Error("Network failure loading actions"))
      .mockResolvedValueOnce(mockActions);

    render(<ActionsTakenComponent ticketId={1} />);

    expect(await screen.findByText(/network failure loading actions/i)).toBeInTheDocument();
    const retryBtn = screen.getByRole("button", { name: /retry/i });
    fireEvent.click(retryBtn);

    expect(await screen.findByRole("heading", { name: /actions taken \(2\)/i })).toBeInTheDocument();
  });
});
