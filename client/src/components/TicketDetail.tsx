import React, { useState, useEffect } from "react";
import {
  assignTicket,
  fetchAssignableUsers,
  fetchTicketDetail,
  updateTicketITPriority,
  updateTicketStatus,
  uploadAttachment,
  softRemoveAttachment,
  getAttachmentDownloadUrl,
  fetchTicketComments,
  createTicketComment,
  fetchInternalNotes,
  createInternalNote,
  markTicketProblemResolved,
  TicketDetail as TicketDetailType,
  AssignableUser,
  Attachment,
  TicketComment,
  InternalNote,
  PriorityLevel,
  TicketStatus,
} from "../api.js";
import { useAuth } from "../context/AuthContext.js";

interface TicketDetailProps {
  ticketId: string | number;
  onBack: () => void;
}

const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".pdf"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_ACTIVE_ATTACHMENTS = 5;
const PRIORITY_OPTIONS: PriorityLevel[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];
const STAFF_STATUS_ACTIONS: Partial<Record<TicketStatus, { status: TicketStatus; label: string }[]>> = {
  NEW: [
    { status: "OPEN", label: "Open Ticket" },
    { status: "CANCELLED", label: "Cancel Ticket" },
  ],
  OPEN: [
    { status: "IN_PROGRESS", label: "Begin Work" },
    { status: "CANCELLED", label: "Cancel Ticket" },
  ],
  IN_PROGRESS: [
    { status: "WAITING_FOR_REQUESTER", label: "Request Info" },
    { status: "RESOLVED", label: "Resolve Ticket" },
    { status: "CANCELLED", label: "Cancel Ticket" },
  ],
  WAITING_FOR_REQUESTER: [{ status: "CANCELLED", label: "Cancel Ticket" }],
  RESOLVED: [
    { status: "CLOSED", label: "Close Ticket" },
    { status: "REOPENED", label: "Reopen Ticket" },
    { status: "CANCELLED", label: "Cancel Ticket" },
  ],
  REOPENED: [
    { status: "IN_PROGRESS", label: "Resume Work" },
    { status: "CANCELLED", label: "Cancel Ticket" },
  ],
};

export function TicketDetail({ ticketId, onBack }: TicketDetailProps) {
  const { user } = useAuth();

  const [ticket, setTicket] = useState<TicketDetailType | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [loadErrorStatus, setLoadErrorStatus] = useState<number | null>(null);
  const [comments, setComments] = useState<TicketComment[]>([]);
  const [notes, setNotes] = useState<InternalNote[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [notesLoading, setNotesLoading] = useState(false);
  const [commentDraft, setCommentDraft] = useState("");
  const [noteDraft, setNoteDraft] = useState("");
  const [commentError, setCommentError] = useState<string | null>(null);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [commentMessage, setCommentMessage] = useState<string | null>(null);
  const [noteMessage, setNoteMessage] = useState<string | null>(null);
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [isPostingNote, setIsPostingNote] = useState(false);
  const [isMarkingResolved, setIsMarkingResolved] = useState(false);
  const [assignableUsers, setAssignableUsers] = useState<AssignableUser[]>([]);
  const [selectedAssigneeId, setSelectedAssigneeId] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignmentError, setAssignmentError] = useState<string | null>(null);
  const [assignmentMessage, setAssignmentMessage] = useState<string | null>(null);
  const [selectedPriority, setSelectedPriority] = useState<PriorityLevel | "">("");
  const [isUpdatingPriority, setIsUpdatingPriority] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [resolutionSummaryDraft, setResolutionSummaryDraft] = useState("");
  const [operationError, setOperationError] = useState<string | null>(null);
  const [operationMessage, setOperationMessage] = useState<string | null>(null);
  const canAssignTickets = user?.role === "IT_STAFF" || user?.role === "ADMINISTRATOR";
  const backDestination = canAssignTickets ? "Ticket Queue" : "My Tickets";

  // Soft Removal Modal State
  const [attachmentToRemove, setAttachmentToRemove] = useState<Attachment | null>(null);
  const [removeReason, setRemoveReason] = useState<string>("");
  const [isRemoving, setIsRemoving] = useState<boolean>(false);
  const [removeError, setRemoveError] = useState<string | null>(null);

  // Add Attachment Modal State
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  const loadTicket = () => {
    if (!user) return;

    setLoading(true);
    setError(null);
    setLoadErrorStatus(null);

    fetchTicketDetail(ticketId)
      .then((loadedTicket) => {
        setTicket(loadedTicket);
        setSelectedPriority(loadedTicket.itPriority ?? loadedTicket.requestedPriority);
        setResolutionSummaryDraft(loadedTicket.resolutionSummary || "");
        setCommentsLoading(true);
        setCommentError(null);
        fetchTicketComments(loadedTicket.id)
          .then(setComments)
          .catch((err: any) => setCommentError(err?.message || "Failed to load public comments"))
          .finally(() => setCommentsLoading(false));

        if (canAssignTickets) {
          setNotesLoading(true);
          setNoteError(null);
          fetchInternalNotes(loadedTicket.id)
            .then(setNotes)
            .catch((err: any) => setNoteError(err?.message || "Failed to load internal notes"))
            .finally(() => setNotesLoading(false));
        } else {
          setNotes([]);
          setNotesLoading(false);
        }
      })
      .catch((err: any) => {
        setError(err?.message || "Ticket not found or access denied");
        setLoadErrorStatus(err?.status ?? null);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    loadTicket();
  }, [ticketId, user]);

  const handlePostComment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!ticket || !commentDraft.trim() || commentDraft.trim().length > 1000) return;
    setIsPostingComment(true);
    setCommentError(null);
    setCommentMessage(null);
    try {
      const result = await createTicketComment(ticket.id, commentDraft.trim());
      setComments((current) => [...current, result.data]);
      setCommentDraft("");
      setCommentMessage(result.message);
    } catch (err: any) {
      setCommentError(err?.message || "Failed to post public comment");
    } finally {
      setIsPostingComment(false);
    }
  };

  const handlePostNote = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!ticket || !canAssignTickets || !noteDraft.trim() || noteDraft.trim().length > 1000) return;
    setIsPostingNote(true);
    setNoteError(null);
    setNoteMessage(null);
    try {
      const result = await createInternalNote(ticket.id, noteDraft.trim());
      setNotes((current) => [...current, result.data]);
      setNoteDraft("");
      setNoteMessage(result.message);
    } catch (err: any) {
      setNoteError(err?.message || "Failed to post internal note");
    } finally {
      setIsPostingNote(false);
    }
  };

  const handleMarkProblemResolved = async () => {
    if (!ticket || user?.role !== "REQUESTER") return;
    setIsMarkingResolved(true);
    setCommentError(null);
    setCommentMessage(null);
    try {
      const result = await markTicketProblemResolved(ticket.id);
      setTicket((current) => current ? { ...current, status: result.data.ticket.status } : current);
      setComments((current) => [...current, result.data.comment]);
      setCommentMessage(result.message);
    } catch (err: any) {
      setCommentError(err?.message || "Failed to record resolution indication");
    } finally {
      setIsMarkingResolved(false);
    }
  };

  useEffect(() => {
    if (!canAssignTickets) {
      setAssignableUsers([]);
      setSelectedAssigneeId("");
      return;
    }

    let cancelled = false;
    fetchAssignableUsers()
      .then((users) => {
        if (!cancelled) {
          setAssignableUsers(users.filter((candidate) => candidate.isActive));
        }
      })
      .catch((err: any) => {
        if (!cancelled) {
          setAssignmentError(err?.message || "Failed to load assignable users");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [canAssignTickets]);

  const handleAssign = async () => {
    if (!ticket || !canAssignTickets) return;

    const selectedAssignee = assignableUsers.find(
      (candidate) => String(candidate.id) === selectedAssigneeId && candidate.isActive
    );
    if (!selectedAssignee) return;

    setIsAssigning(true);
    setAssignmentError(null);
    setAssignmentMessage(null);
    try {
      const result = await assignTicket(ticket.id, selectedAssignee.id);
      setTicket((current) => current
        ? {
            ...current,
            ticketOwnerName: result.data.owner?.name || selectedAssignee.name,
            status: result.data.status,
          }
        : current);
      setAssignmentMessage(`Assigned to ${result.data.owner?.name || selectedAssignee.name}`);
    } catch (err: any) {
      setAssignmentError(err?.message || "Failed to assign ticket");
    } finally {
      setIsAssigning(false);
    }
  };

  const handleUpdatePriority = async () => {
    if (!ticket || !canAssignTickets || !selectedPriority) return;

    setIsUpdatingPriority(true);
    setOperationError(null);
    setOperationMessage(null);
    try {
      const result = await updateTicketITPriority(ticket.id, selectedPriority);
      setTicket((current) => current
        ? { ...current, itPriority: result.data.itPriority, updatedAt: result.data.updatedAt }
        : current);
      setOperationMessage(result.message);
    } catch (err: any) {
      setOperationError(err?.message || "Failed to update IT Priority");
    } finally {
      setIsUpdatingPriority(false);
    }
  };

  const handleUpdateStatus = async (nextStatus: TicketStatus) => {
    if (!ticket || !canAssignTickets) return;
    if (nextStatus === "RESOLVED" && resolutionSummaryDraft.trim().length < 5) return;

    setIsUpdatingStatus(true);
    setOperationError(null);
    setOperationMessage(null);
    try {
      const summary = nextStatus === "RESOLVED" ? resolutionSummaryDraft.trim() : undefined;
      const result = await updateTicketStatus(ticket.id, nextStatus, summary);
      setTicket((current) => current
        ? {
            ...current,
            status: result.data.status,
            resolutionSummary: result.data.resolutionSummary,
            updatedAt: result.data.updatedAt,
          }
        : current);
      if (result.data.resolutionSummary) {
        setResolutionSummaryDraft(result.data.resolutionSummary);
      }
      setOperationMessage(result.message);
    } catch (err: any) {
      setOperationError(err?.message || "Failed to update ticket status");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Helper formatting
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoString;
    }
  };

  // Badge Renderers
  const renderPriorityBadge = (priority: PriorityLevel | null) => {
    if (!priority) return <span className="text-muted small">Unassigned</span>;

    const styles: Record<PriorityLevel, React.CSSProperties> = {
      LOW: { backgroundColor: "#E8F5E9", color: "#2E7D32", border: "1px solid #C8E6C9" },
      MEDIUM: { backgroundColor: "#FFF8E1", color: "#B78103", border: "1px solid #FFE082" },
      HIGH: { backgroundColor: "#FBE9E7", color: "#D84315", border: "1px solid #FFCCBC" },
      URGENT: { backgroundColor: "#FFEBEE", color: "#C62828", border: "1px solid #FFCDD2" },
    };

    return (
      <span className="badge font-monospace fw-semibold px-2 py-1" style={{ fontSize: "12px", ...styles[priority] }}>
        {priority}
      </span>
    );
  };

  const renderStatusBadge = (statusVal: TicketStatus) => {
    const styles: Record<TicketStatus, React.CSSProperties> = {
      NEW: { backgroundColor: "#EAF6EF", color: "#006B3C", border: "1px solid #A3D9B8" },
      OPEN: { backgroundColor: "#E3F2FD", color: "#1565C0", border: "1px solid #BBDEFB" },
      IN_PROGRESS: { backgroundColor: "#E8F5E9", color: "#2E7D32", border: "1px solid #C8E6C9" },
      WAITING_FOR_REQUESTER: { backgroundColor: "#F3E5F5", color: "#7B1FA2", border: "1px solid #E1BEE7" },
      RESOLVED: { backgroundColor: "#ECEFF1", color: "#455A64", border: "1px solid #CFD8DC" },
      CLOSED: { backgroundColor: "#F5F5F5", color: "#616161", border: "1px solid #E0E0E0" },
      REOPENED: { backgroundColor: "#FFF3E0", color: "#EF6C00", border: "1px solid #FFE0B2" },
      CANCELLED: { backgroundColor: "#FFEBEE", color: "#C62828", border: "1px solid #FFCDD2" },
    };

    const labels: Record<TicketStatus, string> = {
      NEW: "NEW",
      OPEN: "OPEN",
      IN_PROGRESS: "IN PROGRESS",
      WAITING_FOR_REQUESTER: "WAITING",
      RESOLVED: "RESOLVED",
      CLOSED: "CLOSED",
      REOPENED: "REOPENED",
      CANCELLED: "CANCELLED",
    };

    return (
      <span className="badge font-monospace fw-semibold px-2 py-1" style={{ fontSize: "12px", ...styles[statusVal] }}>
        {labels[statusVal] || statusVal}
      </span>
    );
  };

  // Attachment Actions
  const handleConfirmRemove = async () => {
    if (!attachmentToRemove || !user) return;

    setIsRemoving(true);
    setRemoveError(null);

    try {
      await softRemoveAttachment(
        attachmentToRemove.id,
        removeReason.trim(),
        user.id
      );
      setAttachmentToRemove(null);
      setRemoveReason("");
      loadTicket();
    } catch (err: any) {
      setRemoveError(err?.message || "Failed to remove attachment");
    } finally {
      setIsRemoving(false);
    }
  };

  const handleFileSelectForUpload = (file: File | null) => {
    setUploadError(null);
    if (!file) {
      setUploadFile(null);
      return;
    }

    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setUploadError(`Invalid file format "${file.name}". Allowed: JPG, PNG, WEBP, PDF.`);
      setUploadFile(null);
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setUploadError(`File "${file.name}" exceeds maximum allowed size of 5MB.`);
      setUploadFile(null);
      return;
    }

    setUploadFile(file);
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || !user || !ticket) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      await uploadAttachment(ticket.id, uploadFile, user.id);
      setShowUploadModal(false);
      setUploadFile(null);
      loadTicket();
    } catch (err: any) {
      setUploadError(err?.message || err?.data?.error || "Failed to upload file.");
    } finally {
      setIsUploading(false);
    }
  };

  const activeAttachments = ticket?.attachments?.filter((a) => !a.isRemoved) || [];
  const removedAttachments = ticket?.attachments?.filter((a) => a.isRemoved) || [];
  const staffStatusActions = ticket ? STAFF_STATUS_ACTIONS[ticket.status] ?? [] : [];

  return (
    <div className="container p-0 mx-auto" style={{ maxWidth: "860px" }}>
      {/* Top Header & Breadcrumb */}
      <div className="d-flex align-items-center justify-content-between mb-3">
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb mb-0 small">
            <li className="breadcrumb-item">
              <button
                type="button"
                className="btn btn-link p-0 text-decoration-none"
                onClick={onBack}
                style={{ color: "#006B3C", fontSize: "14px" }}
              >
                {backDestination}
              </button>
            </li>
            <li className="breadcrumb-item active" aria-current="page" style={{ color: "#556B60" }}>
              Ticket Details
            </li>
          </ol>
        </nav>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary fw-semibold"
          onClick={onBack}
          style={{ fontSize: "13px" }}
        >
          &larr; Back to {backDestination}
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="card shadow-sm border p-5 text-center my-3" style={{ backgroundColor: "#FFFFFF", borderColor: "#D1D9D4" }}>
          <div className="spinner-border text-success mx-auto mb-2" role="status" style={{ color: "#006B3C" }}>
            <span className="visually-hidden">Loading ticket details…</span>
          </div>
          <p className="text-muted mb-0 small">Loading ticket details…</p>
        </div>
      )}

      {/* Error / Unauthorized State */}
      {!loading && error && (
        <div
          className="card shadow-sm border text-center p-5 my-3"
          style={{ backgroundColor: "#FFFFFF", borderColor: "#D1D9D4", borderRadius: "8px" }}
        >
          <div className="display-4 mb-3 text-danger" aria-hidden="true">{loadErrorStatus === 404 ? "!" : "🔒"}</div>
          <h2 className="h5 fw-bold mb-2" style={{ color: "#1E2B24" }}>
            {loadErrorStatus === 404 ? "Ticket Not Found" : loadErrorStatus === 403 ? "Access Forbidden" : "Ticket Not Found or Access Denied"}
          </h2>
          <p className="text-muted small mx-auto mb-4" style={{ maxWidth: "420px" }}>
            {error || "The requested ticket does not exist or you do not have permission to view it."}
          </p>
          <div>
            <button
              type="button"
              className="btn text-white fw-semibold px-4 py-2"
              onClick={onBack}
              style={{ backgroundColor: "#006B3C" }}
            >
              Return to {backDestination}
            </button>
          </div>
        </div>
      )}

      {/* Read-Only Ticket Details Card */}
      {!loading && !error && ticket && (
        <>
          <div
            className="card shadow-sm border mb-4"
            style={{ backgroundColor: "#FFFFFF", borderColor: "#D1D9D4", borderRadius: "8px" }}
          >
            <div className="card-body p-4">
              <div className="d-flex flex-column flex-sm-row align-items-sm-center justify-content-between pb-3 mb-3 border-bottom gap-2">
                <div>
                  <h1 className="h4 fw-bold mb-1 font-monospace" style={{ color: "#006B3C" }}>
                    {ticket.ticketNumber}
                  </h1>
                  <span className="text-muted small">Submitted on {formatDate(ticket.createdAt)}</span>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <span className="text-muted small me-1">Status:</span>
                  {renderStatusBadge(ticket.status)}
                </div>
              </div>

              {/* Classification Grid (Read-Only) */}
              <div className="row g-3 mb-4">
                <div className="col-12 col-md-4">
                  <label className="form-label text-muted small fw-semibold mb-1">Category</label>
                  <div
                    className="p-2 border rounded text-dark"
                    style={{ backgroundColor: "#F0F4F1", borderColor: "#D1D9D4", fontSize: "14px", cursor: "default" }}
                  >
                    {ticket.category?.name || "—"}
                  </div>
                </div>

                <div className="col-12 col-md-4">
                  <label className="form-label text-muted small fw-semibold mb-1">Related System</label>
                  <div
                    className="p-2 border rounded text-dark"
                    style={{ backgroundColor: "#F0F4F1", borderColor: "#D1D9D4", fontSize: "14px", cursor: "default" }}
                  >
                    {ticket.relatedSystem?.name || "—"}
                  </div>
                </div>

                <div className="col-12 col-md-4">
                  <label className="form-label text-muted small fw-semibold mb-1">Requester</label>
                  <div
                    className="p-2 border rounded text-dark"
                    style={{ backgroundColor: "#F0F4F1", borderColor: "#D1D9D4", fontSize: "14px", cursor: "default" }}
                  >
                    {ticket.requester?.name || "—"}
                  </div>
                </div>

                <div className="col-12 col-md-4">
                  <label className="form-label text-muted small fw-semibold mb-1">Requested Priority</label>
                  <div
                    className="p-2 border rounded d-flex align-items-center"
                    style={{ backgroundColor: "#F0F4F1", borderColor: "#D1D9D4", height: "38px" }}
                  >
                    {renderPriorityBadge(ticket.requestedPriority)}
                  </div>
                </div>

                <div className="col-12 col-md-4">
                  <label className="form-label text-muted small fw-semibold mb-1">IT Priority</label>
                  {canAssignTickets ? (
                    <div className="d-flex flex-column gap-2">
                      <div className="d-flex gap-2">
                        <select
                          className="form-select form-select-sm"
                          aria-label="Update IT Priority"
                          value={selectedPriority || ticket.itPriority || ticket.requestedPriority}
                          disabled={isUpdatingPriority}
                          onChange={(event) => {
                            setSelectedPriority(event.target.value as PriorityLevel);
                            setOperationError(null);
                            setOperationMessage(null);
                          }}
                        >
                          {PRIORITY_OPTIONS.map((priority) => (
                            <option key={priority} value={priority}>{priority}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-success text-nowrap"
                          disabled={
                            !selectedPriority
                            || selectedPriority === ticket.itPriority
                            || isUpdatingPriority
                          }
                          onClick={handleUpdatePriority}
                        >
                          {isUpdatingPriority ? "Saving…" : "Save Priority"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="p-2 border rounded d-flex align-items-center"
                      style={{ backgroundColor: "#F0F4F1", borderColor: "#D1D9D4", height: "38px" }}
                    >
                      {renderPriorityBadge(ticket.itPriority)}
                    </div>
                  )}
                </div>

                <div className="col-12 col-md-4">
                  <label className="form-label text-muted small fw-semibold mb-1">Assigned IT Owner</label>
                  {canAssignTickets ? (
                    <div className="d-flex flex-column gap-2">
                      <div className="small text-muted">
                        Current: <span className="fw-semibold text-dark">{ticket.ticketOwnerName || "Unassigned"}</span>
                      </div>
                      <select
                        id="ticket-assignee"
                        className="form-select form-select-sm"
                        aria-label="Assign to IT Staff or Administrator"
                        value={selectedAssigneeId}
                        onChange={(event) => {
                          setSelectedAssigneeId(event.target.value);
                          setAssignmentError(null);
                          setAssignmentMessage(null);
                        }}
                      >
                        <option value="">Select an active IT owner</option>
                        {assignableUsers.map((candidate) => (
                          <option key={candidate.id} value={candidate.id}>
                            {candidate.name} ({candidate.role === "ADMINISTRATOR" ? "Administrator" : "IT Staff"})
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="btn btn-sm text-white fw-semibold align-self-start"
                        style={{ backgroundColor: "#006B3C", borderColor: "#006B3C" }}
                        disabled={
                          !assignableUsers.some((candidate) => String(candidate.id) === selectedAssigneeId && candidate.isActive)
                          || isAssigning
                          || ticket.status === "CLOSED"
                          || ticket.status === "CANCELLED"
                        }
                        onClick={handleAssign}
                      >
                        {isAssigning ? "Assigning…" : "Assign"}
                      </button>
                      {assignmentError && <div className="small text-danger" role="alert">{assignmentError}</div>}
                      {assignmentMessage && <div className="small text-success" role="status">{assignmentMessage}</div>}
                    </div>
                  ) : (
                    <div
                      className="p-2 border rounded text-dark"
                      style={{ backgroundColor: "#F0F4F1", borderColor: "#D1D9D4", fontSize: "14px", cursor: "default" }}
                    >
                      {ticket.ticketOwnerName || "Unassigned"}
                    </div>
                  )}
                </div>
              </div>

              {canAssignTickets && (operationError || operationMessage) && (
                <div className={`alert ${operationError ? "alert-danger" : "alert-success"} py-2 px-3 mb-4`} role={operationError ? "alert" : "status"}>
                  {operationError || operationMessage}
                </div>
              )}

              {canAssignTickets && staffStatusActions.length > 0 && (
                <section className="mb-4 p-3 border rounded" aria-labelledby="ticket-service-actions">
                  <h2 id="ticket-service-actions" className="h6 fw-bold mb-3" style={{ color: "#1E2B24" }}>
                    Service Actions
                  </h2>
                  {staffStatusActions.some((action) => action.status === "RESOLVED") && (
                    <div className="mb-3">
                      <label htmlFor="ticket-resolution-summary" className="form-label small fw-semibold">
                        Resolution Summary
                      </label>
                      <textarea
                        id="ticket-resolution-summary"
                        className="form-control"
                        rows={3}
                        maxLength={2000}
                        value={resolutionSummaryDraft}
                        onChange={(event) => setResolutionSummaryDraft(event.target.value)}
                        placeholder="Describe the resolution (at least 5 characters)"
                      />
                    </div>
                  )}
                  <div className="d-flex flex-wrap gap-2">
                    {staffStatusActions.map((action) => (
                      <button
                        key={action.status}
                        type="button"
                        className={action.status === "CANCELLED" ? "btn btn-sm btn-outline-danger" : "btn btn-sm btn-success"}
                        disabled={
                          isUpdatingStatus
                          || (action.status === "RESOLVED" && resolutionSummaryDraft.trim().length < 5)
                        }
                        onClick={() => handleUpdateStatus(action.status)}
                      >
                        {isUpdatingStatus ? "Saving…" : action.label}
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {/* Summary Section */}
              <div className="mb-4">
                <label className="form-label text-muted small fw-semibold mb-1">Ticket Summary</label>
                <div
                  className="p-3 border rounded fw-semibold"
                  style={{ backgroundColor: "#F0F4F1", borderColor: "#D1D9D4", color: "#1E2B24", fontSize: "15px" }}
                >
                  {ticket.summary}
                </div>
              </div>

              {/* Description Section */}
              <div className="mb-4">
                <label className="form-label text-muted small fw-semibold mb-1">Description</label>
                <div
                  className="p-3 border rounded text-wrap"
                  style={{
                    backgroundColor: "#F0F4F1",
                    borderColor: "#D1D9D4",
                    color: "#1E2B24",
                    fontSize: "14px",
                    whiteSpace: "pre-wrap",
                    minHeight: "100px",
                  }}
                >
                  {ticket.description}
                </div>
              </div>

              {/* Resolution Summary Section */}
              <div>
                <label className="form-label text-muted small fw-semibold mb-1">Resolution Summary</label>
                <div
                  className="p-3 border rounded fst-italic"
                  style={{ backgroundColor: "#F0F4F1", borderColor: "#D1D9D4", color: "#556B60", fontSize: "14px" }}
                >
                  {ticket.resolutionSummary || "No resolution summary available yet."}
                </div>
              </div>

              {user?.role === "REQUESTER" && ["IN_PROGRESS", "WAITING_FOR_REQUESTER"].includes(ticket.status) && (
                <div className="mt-4 p-3 border rounded" style={{ backgroundColor: "#EAF6EF", borderColor: "#A3D9B8" }}>
                  <p className="small mb-2" style={{ color: "#1E2B24" }}>
                    Is the issue resolved? This records your indication and notifies IT.
                  </p>
                  <button
                    type="button"
                    className="btn btn-sm text-white fw-semibold"
                    style={{ backgroundColor: "#006B3C", borderColor: "#006B3C" }}
                    disabled={isMarkingResolved}
                    onClick={handleMarkProblemResolved}
                  >
                    {isMarkingResolved ? "Submitting…" : "Problem Appears Resolved"}
                  </button>
                </div>
              )}
            </div>
          </div>

          <section className="card shadow-sm border mb-4" aria-labelledby="public-comments-heading" style={{ borderColor: "#A3D9B8", borderRadius: "8px" }}>
            <div className="card-header border-bottom" style={{ backgroundColor: "#EAF6EF", borderColor: "#A3D9B8" }}>
              <h2 id="public-comments-heading" className="h6 fw-bold mb-0" style={{ color: "#1E2B24" }}>Public Comments ({comments.length})</h2>
            </div>
            <div className="card-body" style={{ backgroundColor: "#F7FBF8" }}>
              {commentError && <div className="alert alert-danger py-2" role="alert">{commentError}</div>}
              {commentMessage && <div className="alert alert-success py-2" role="status">{commentMessage}</div>}
              {commentsLoading ? <p className="small text-muted mb-3" role="status">Loading public comments…</p> : (
                comments.length === 0
                  ? <p className="small text-muted mb-3">No public comments yet.</p>
                  : <div className="d-grid gap-2 mb-3">
                    {comments.map((comment) => (
                      <article key={comment.id} className="p-3 border rounded" style={{ backgroundColor: "#EAF6EF", borderColor: "#C8E6C9" }}>
                        <div className="d-flex justify-content-between flex-wrap gap-1 mb-2 small">
                          <span className="fw-semibold">{comment.author.name} <span className="text-muted">({comment.author.role.replaceAll("_", " ")})</span></span>
                          <time className="text-muted" dateTime={comment.createdAt}>{formatDate(comment.createdAt)}</time>
                        </div>
                        <p className="mb-0 text-break" style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{comment.content}</p>
                      </article>
                    ))}
                  </div>
              )}
              <form onSubmit={handlePostComment}>
                <label htmlFor="public-comment-content" className="form-label small fw-semibold">Add Public Comment</label>
                <textarea
                  id="public-comment-content"
                  className="form-control mb-2"
                  rows={3}
                  maxLength={1000}
                  value={commentDraft}
                  onChange={(event) => setCommentDraft(event.target.value)}
                  aria-describedby="public-comment-count"
                  placeholder="Write a comment visible to the requester and IT…"
                />
                <div className="d-flex justify-content-between align-items-center gap-2">
                  <span id="public-comment-count" className="small text-muted">{commentDraft.length}/1000</span>
                  <button type="submit" className="btn btn-sm btn-success" disabled={!commentDraft.trim() || isPostingComment || commentDraft.trim().length > 1000}>
                    {isPostingComment ? "Posting…" : "Post Comment"}
                  </button>
                </div>
              </form>
            </div>
          </section>

          {canAssignTickets && (
            <section className="card shadow-sm border mb-4" aria-labelledby="internal-notes-heading" style={{ borderColor: "#FFE082", borderRadius: "8px" }}>
              <div className="card-header border-bottom" style={{ backgroundColor: "#FFF8E1", borderColor: "#FFE082" }}>
                <h2 id="internal-notes-heading" className="h6 fw-bold mb-1" style={{ color: "#795548" }}>Internal Notes ({notes.length})</h2>
                <p className="small mb-0" style={{ color: "#795548" }}>Restricted: visible only to IT Staff and Administrators.</p>
              </div>
              <div className="card-body" style={{ backgroundColor: "#FFFCF2" }}>
                {noteError && <div className="alert alert-danger py-2" role="alert">{noteError}</div>}
                {noteMessage && <div className="alert alert-success py-2" role="status">{noteMessage}</div>}
                {notesLoading ? <p className="small text-muted mb-3" role="status">Loading internal notes…</p> : (
                  notes.length === 0
                    ? <p className="small text-muted mb-3">No internal notes yet.</p>
                    : <div className="d-grid gap-2 mb-3">
                      {notes.map((note) => (
                        <article key={note.id} className="p-3 border rounded" style={{ backgroundColor: "#FFF8E1", borderColor: "#FFE082" }}>
                          <div className="d-flex justify-content-between flex-wrap gap-1 mb-2 small" style={{ color: "#795548" }}>
                            <span className="fw-semibold">{note.author.name} <span>({note.author.role.replaceAll("_", " ")})</span></span>
                            <time dateTime={note.createdAt}>{formatDate(note.createdAt)}</time>
                          </div>
                          <p className="mb-0 text-break" style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{note.content}</p>
                        </article>
                      ))}
                    </div>
                )}
                <form onSubmit={handlePostNote}>
                  <label htmlFor="internal-note-content" className="form-label small fw-semibold">Add Internal Note</label>
                  <textarea
                    id="internal-note-content"
                    className="form-control mb-2"
                    rows={3}
                    maxLength={1000}
                    value={noteDraft}
                    onChange={(event) => setNoteDraft(event.target.value)}
                    aria-describedby="internal-note-count"
                    placeholder="Write a private note for the IT team…"
                  />
                  <div className="d-flex justify-content-between align-items-center gap-2">
                    <span id="internal-note-count" className="small text-muted">{noteDraft.length}/1000</span>
                    <button type="submit" className="btn btn-sm btn-warning" disabled={!noteDraft.trim() || isPostingNote || noteDraft.trim().length > 1000}>
                      {isPostingNote ? "Posting…" : "Post Internal Note"}
                    </button>
                  </div>
                </form>
              </div>
            </section>
          )}

          {/* Attachments Panel */}
          <div
            className="card shadow-sm border mb-4"
            style={{ backgroundColor: "#FFFFFF", borderColor: "#D1D9D4", borderRadius: "8px" }}
          >
            <div className="card-header bg-white border-bottom p-3 d-flex align-items-center justify-content-between">
              <h2 className="h6 fw-bold mb-0" style={{ color: "#1E2B24" }}>
                Attachments ({activeAttachments.length} / {MAX_ACTIVE_ATTACHMENTS} Active)
              </h2>
              <button
                type="button"
                className="btn btn-sm text-white fw-semibold"
                style={{ backgroundColor: "#006B3C", borderColor: "#006B3C" }}
                disabled={activeAttachments.length >= MAX_ACTIVE_ATTACHMENTS}
                onClick={() => setShowUploadModal(true)}
              >
                + Add Attachment
              </button>
            </div>

            <div className="card-body p-4">
              {/* Active Attachments Section */}
              <h3 className="h6 fw-semibold mb-3" style={{ color: "#1E2B24", fontSize: "14px" }}>
                Active Attachments
              </h3>

              {activeAttachments.length === 0 ? (
                <p className="text-muted small fst-italic mb-4">No active attachments on this ticket.</p>
              ) : (
                <div className="list-group mb-4">
                  {activeAttachments.map((att) => {
                    const downloadUrl = getAttachmentDownloadUrl(att.id, user?.id);
                    return (
                      <div
                        key={att.id}
                        className="list-group-item d-flex flex-column flex-sm-row align-items-sm-center justify-content-between py-2 px-3 mb-2 border rounded gap-2"
                        style={{ borderColor: "#D1D9D4" }}
                      >
                        <div className="d-flex align-items-center gap-2 overflow-hidden">
                          <span style={{ fontSize: "18px" }}>📄</span>
                          <div className="text-break">
                            <span className="fw-semibold text-dark me-2">{att.originalFileName}</span>
                            <span className="badge bg-secondary text-white small me-2">
                              {formatFileSize(att.fileSizeBytes)}
                            </span>
                            <span className="text-muted small">Uploaded {formatDate(att.createdAt)}</span>
                          </div>
                        </div>

                        <div className="d-flex align-items-center gap-2">
                          <a
                            href={downloadUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-sm btn-outline-success fw-semibold"
                            style={{ color: "#006B3C", borderColor: "#006B3C" }}
                            download={att.originalFileName}
                          >
                            Download
                          </a>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger fw-semibold"
                            style={{ color: "#B3261E", borderColor: "#B3261E" }}
                            onClick={() => {
                              setAttachmentToRemove(att);
                              setRemoveReason("");
                              setRemoveError(null);
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Soft-Removed Attachments Audit Section */}
              {removedAttachments.length > 0 && (
                <div className="pt-3 border-top" style={{ borderColor: "#D1D9D4" }}>
                  <h3 className="h6 fw-semibold mb-3" style={{ color: "#556B60", fontSize: "14px" }}>
                    Removed Attachments History (Audit Record)
                  </h3>
                  <div className="list-group">
                    {removedAttachments.map((att) => (
                      <div
                        key={att.id}
                        className="list-group-item d-flex flex-column flex-sm-row align-items-sm-center justify-content-between py-2 px-3 mb-2 border rounded gap-2"
                        style={{ backgroundColor: "#F5F7F6", borderColor: "#D1D9D4" }}
                      >
                        <div className="d-flex align-items-center gap-2 overflow-hidden">
                          <span style={{ fontSize: "18px", opacity: 0.6 }}>🗑️</span>
                          <div className="text-break">
                            <span
                              className="fw-semibold text-muted text-decoration-line-through me-2"
                              style={{ color: "#556B60" }}
                            >
                              {att.originalFileName}
                            </span>
                            <span
                              className="badge px-2 py-1 me-2"
                              style={{ backgroundColor: "#F5F5F5", color: "#616161", border: "1px solid #E0E0E0" }}
                            >
                              Removed
                            </span>
                            <span className="text-muted small">
                              Removed {att.removedAt ? formatDate(att.removedAt) : "—"}
                            </span>
                            {att.removedReason && (
                              <div className="small text-muted fst-italic mt-1">
                                Reason: "{att.removedReason}"
                              </div>
                            )}
                          </div>
                        </div>

                        <div>
                          <button
                            type="button"
                            className="btn btn-sm btn-secondary disabled"
                            disabled
                            style={{ cursor: "not-allowed", opacity: 0.6 }}
                            title="Download access blocked for soft-removed files (HTTP 410 Gone)"
                          >
                            Unavailable
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Soft Removal Confirmation Modal */}
          {attachmentToRemove && (
            <div
              className="modal show d-block"
              tabIndex={-1}
              style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
              role="dialog"
              aria-modal="true"
            >
              <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content" style={{ borderRadius: "8px" }}>
                  <div className="modal-header border-bottom">
                    <h5 className="modal-title text-danger fw-bold">Remove Attachment</h5>
                    <button
                      type="button"
                      className="btn-close"
                      onClick={() => setAttachmentToRemove(null)}
                      disabled={isRemoving || !removeReason.trim()}
                      aria-label="Close"
                    ></button>
                  </div>
                  <div className="modal-body py-4">
                    <p className="mb-2 text-dark">
                      Are you sure you want to remove <strong>"{attachmentToRemove.originalFileName}"</strong>?
                    </p>
                    <p className="small text-muted mb-3">
                      This attachment will be soft-removed and will no longer be downloadable. Its audit metadata will remain in the ticket history.
                    </p>

                    {removeError && (
                      <div className="alert alert-danger py-2 px-3 mb-3 small" role="alert">
                        {removeError}
                      </div>
                    )}

                    <div className="mb-3">
                      <label htmlFor="removalReason" className="form-label small fw-semibold text-dark">
                        Reason for removal <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        id="removalReason"
                        className="form-control"
                        placeholder="e.g. Uploaded incorrect file version"
                        value={removeReason}
                        onChange={(e) => setRemoveReason(e.target.value)}
                        maxLength={255}
                      />
                    </div>
                  </div>
                  <div className="modal-footer border-top bg-light">
                    <button
                      type="button"
                      className="btn btn-outline-secondary px-3"
                      onClick={() => setAttachmentToRemove(null)}
                      disabled={isRemoving || !removeReason.trim()}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger px-4 fw-semibold"
                      onClick={handleConfirmRemove}
                      disabled={isRemoving || !removeReason.trim()}
                      style={{ backgroundColor: "#B3261E", borderColor: "#B3261E" }}
                    >
                      {isRemoving ? "Removing…" : "Confirm Removal"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Add Attachment Modal */}
          {showUploadModal && (
            <div
              className="modal show d-block"
              tabIndex={-1}
              style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
              role="dialog"
              aria-modal="true"
            >
              <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content" style={{ borderRadius: "8px" }}>
                  <form onSubmit={handleUploadSubmit}>
                    <div className="modal-header border-bottom">
                      <h5 className="modal-title fw-bold" style={{ color: "#1E2B24" }}>
                        Add Attachment to Ticket
                      </h5>
                      <button
                        type="button"
                        className="btn-close"
                        onClick={() => {
                          setShowUploadModal(false);
                          setUploadFile(null);
                          setUploadError(null);
                        }}
                        disabled={isUploading}
                        aria-label="Close"
                      ></button>
                    </div>

                    <div className="modal-body py-4">
                      {uploadError && (
                        <div className="alert alert-danger py-2 px-3 mb-3 small" role="alert">
                          {uploadError}
                        </div>
                      )}

                      <div className="mb-3">
                        <label htmlFor="modalFileInput" className="form-label small fw-semibold text-dark">
                          Select File <span className="text-danger">*</span>
                        </label>
                        <input
                          type="file"
                          id="modalFileInput"
                          className="form-control"
                          accept=".jpg,.jpeg,.png,.webp,.pdf"
                          onChange={(e) => handleFileSelectForUpload(e.target.files?.[0] || null)}
                        />
                        <div className="form-text small text-muted">
                          Allowed formats: JPG, PNG, WEBP, PDF (Max size: 5MB)
                        </div>
                      </div>

                      {uploadFile && (
                        <div className="p-3 bg-light rounded border d-flex align-items-center justify-content-between">
                          <div className="d-flex align-items-center gap-2">
                            <span>📄</span>
                            <span className="fw-semibold text-dark">{uploadFile.name}</span>
                          </div>
                          <span className="badge bg-secondary">{formatFileSize(uploadFile.size)}</span>
                        </div>
                      )}
                    </div>

                    <div className="modal-footer border-top bg-light">
                      <button
                        type="button"
                        className="btn btn-outline-secondary px-3"
                        onClick={() => {
                          setShowUploadModal(false);
                          setUploadFile(null);
                          setUploadError(null);
                        }}
                        disabled={isUploading}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn text-white px-4 fw-semibold"
                        disabled={!uploadFile || isUploading}
                        style={{ backgroundColor: "#006B3C", borderColor: "#006B3C" }}
                      >
                        {isUploading ? "Uploading…" : "Upload Attachment"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default TicketDetail;

