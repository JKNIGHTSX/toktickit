import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { TicketDetail } from "../../src/components/TicketDetail";
import * as RequesterModule from "../../src/context/RequesterContext";
import * as api from "../../src/api";

vi.mock("../../src/api", () => ({
  fetchTicketDetail: vi.fn(),
  softRemoveAttachment: vi.fn(),
  uploadAttachment: vi.fn(),
  getAttachmentDownloadUrl: vi.fn(
    (id: number, requesterId?: number) => `http://localhost:3000/api/attachments/${id}/download?requesterId=${requesterId}`
  ),
}));

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

const mockTicketWithAttachments: api.TicketDetail = {
  id: 101,
  ticketNumber: "TKT-2026-000101",
  requesterId: 1,
  requester: { id: 1, name: "Jennifer Anderson", email: "jennifer.anderson@toktickit.local" },
  categoryId: 2,
  category: { id: 2, name: "Hardware" },
  relatedSystemId: 7,
  relatedSystem: { id: 7, name: "Corporate Laptop" },
  summary: "Laptop battery issue",
  description: "Detailed description of hardware issue.",
  requestedPriority: "MEDIUM",
  itPriority: "MEDIUM",
  status: "NEW",
  ticketOwnerName: null,
  resolutionSummary: null,
  attachments: [
    {
      id: 1,
      ticketId: 101,
      originalFileName: "active_log.pdf",
      fileMimeType: "application/pdf",
      fileSizeBytes: 245760, // 240 KB
      isRemoved: false,
      removedReason: null,
      removedAt: null,
      createdAt: "2026-09-04T10:00:00.000Z",
    },
    {
      id: 2,
      ticketId: 101,
      originalFileName: "removed_screenshot.png",
      fileMimeType: "image/png",
      fileSizeBytes: 512000,
      isRemoved: true,
      removedReason: "Uploaded wrong image file",
      removedAt: "2026-09-04T10:15:00.000Z",
      createdAt: "2026-09-04T10:00:00.000Z",
    },
  ],
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

describe("UI-10 & UI-11: Attachment Section Component Tests (Issue #7)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupRequesterMock();
  });

  it("UI-10 / AC-17: renders active attachment with download link and remove button", async () => {
    (api.fetchTicketDetail as any).mockResolvedValue(mockTicketWithAttachments);

    render(<TicketDetail ticketId={101} onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("active_log.pdf")).toBeInTheDocument();
      expect(screen.getByText("240.0 KB")).toBeInTheDocument();
    });

    const downloadLink = screen.getByRole("link", { name: /Download/i });
    expect(downloadLink).toBeInTheDocument();
    expect(downloadLink).toHaveAttribute("href", expect.stringContaining("/api/attachments/1/download"));

    const removeBtn = screen.getByRole("button", { name: /^Remove$/i });
    expect(removeBtn).toBeInTheDocument();
  });

  it("UI-11 / AC-19: renders soft-removed attachment with strikethrough, Removed badge, reason, and disabled download indicator", async () => {
    (api.fetchTicketDetail as any).mockResolvedValue(mockTicketWithAttachments);

    render(<TicketDetail ticketId={101} onBack={vi.fn()} />);

    await waitFor(() => {
      const removedFilename = screen.getByText("removed_screenshot.png");
      expect(removedFilename).toBeInTheDocument();
      expect(removedFilename.className).toContain("text-decoration-line-through");
      expect(screen.getByText("Removed")).toBeInTheDocument();
      expect(screen.getByText(/Reason: "Uploaded wrong image file"/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Unavailable/i })).toBeDisabled();
    });
  });

  it("UI-10 / AC-18: opens soft removal modal, accepts reason, and calls softRemoveAttachment API", async () => {
    (api.fetchTicketDetail as any).mockResolvedValue(mockTicketWithAttachments);
    (api.softRemoveAttachment as any).mockResolvedValue({
      id: 1,
      isRemoved: true,
      removedReason: "No longer relevant",
      message: "Attachment soft-removed successfully",
    });

    render(<TicketDetail ticketId={101} onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("active_log.pdf")).toBeInTheDocument();
    });

    // Click Remove button
    fireEvent.click(screen.getByRole("button", { name: /^Remove$/i }));

    // Confirm modal opens
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText(/Are you sure you want to remove/i)).toBeInTheDocument();
    });

    // Enter removal reason
    const reasonInput = screen.getByPlaceholderText(/e.g. Uploaded incorrect file version/i);
    fireEvent.change(reasonInput, { target: { value: "No longer relevant" } });

    // Click Confirm Removal
    fireEvent.click(screen.getByRole("button", { name: /Confirm Removal/i }));

    await waitFor(() => {
      expect(api.softRemoveAttachment).toHaveBeenCalledWith(1, "No longer relevant", 1);
    });
  });

  it("disables '+ Add Attachment' button when 5 active attachments exist", async () => {
    const active5Attachments: api.Attachment[] = Array.from({ length: 5 }, (_, i) => ({
      id: i + 10,
      ticketId: 101,
      originalFileName: `file_${i + 1}.pdf`,
      fileMimeType: "application/pdf",
      fileSizeBytes: 1024,
      isRemoved: false,
      createdAt: "2026-09-04T10:00:00.000Z",
    }));

    const ticketWith5Active = {
      ...mockTicketWithAttachments,
      attachments: active5Attachments,
    };

    (api.fetchTicketDetail as any).mockResolvedValue(ticketWith5Active);

    render(<TicketDetail ticketId={101} onBack={vi.fn()} />);

    await waitFor(() => {
      const addBtn = screen.getByRole("button", { name: /\+ Add Attachment/i });
      expect(addBtn).toBeDisabled();
    });
  });
});
