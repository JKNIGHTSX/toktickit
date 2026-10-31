import React, { useState, useEffect } from "react";
import {
  ActionTaken,
  CreateActionTakenInput,
  UpdateActionTakenInput,
  fetchTicketActions,
  createActionTaken,
  updateActionTaken,
} from "../api.js";
import { useAuth } from "../context/AuthContext.js";

interface ActionsTakenProps {
  ticketId: string | number;
  ticketStatus?: string;
}

interface FormState {
  actionDateTime: string;
  actionDescription: string;
  result: string;
  isFollowUpRequired: boolean;
  followUpNote: string;
  attachmentNotes: string;
}

const INITIAL_FORM_STATE: FormState = {
  actionDateTime: "",
  actionDescription: "",
  result: "",
  isFollowUpRequired: false,
  followUpNote: "",
  attachmentNotes: "",
};

export function ActionsTakenComponent({ ticketId, ticketStatus }: ActionsTakenProps) {
  const { user } = useAuth();
  const canManageActions = user?.role === "IT_STAFF" || user?.role === "ADMINISTRATOR";
  const isTicketClosed = ticketStatus === "CLOSED";

  const [actions, setActions] = useState<ActionTaken[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Modal / Form state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingAction, setEditingAction] = useState<ActionTaken | null>(null);
  const [formData, setFormData] = useState<FormState>(INITIAL_FORM_STATE);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isConflict, setIsConflict] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const getLocalDateTimeString = (date?: Date) => {
    const d = date ? new Date(date) : new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const year = d.getFullYear();
    const month = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const hours = pad(d.getHours());
    const minutes = pad(d.getMinutes());
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const loadActions = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const data = await fetchTicketActions(ticketId);
      setActions(data);
    } catch (err: any) {
      setFetchError(err?.message || "Failed to load actions taken.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActions();
  }, [ticketId]);

  const openCreateModal = () => {
    setEditingAction(null);
    setFormData({
      ...INITIAL_FORM_STATE,
      actionDateTime: getLocalDateTimeString(),
    });
    setValidationErrors({});
    setSubmitError(null);
    setIsConflict(false);
    setIsModalOpen(true);
  };

  const openEditModal = (action: ActionTaken) => {
    setEditingAction(action);
    setFormData({
      actionDateTime: action.actionDateTime
        ? getLocalDateTimeString(new Date(action.actionDateTime))
        : getLocalDateTimeString(),
      actionDescription: action.actionDescription,
      result: action.result,
      isFollowUpRequired: action.isFollowUpRequired,
      followUpNote: action.followUpNote || "",
      attachmentNotes: action.attachmentNotes || "",
    });
    setValidationErrors({});
    setSubmitError(null);
    setIsConflict(false);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (isSubmitting) return;
    setIsModalOpen(false);
    setEditingAction(null);
    setSubmitError(null);
    setIsConflict(false);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    const desc = formData.actionDescription.trim();
    if (!desc) {
      errors.actionDescription = "Action description is required";
    } else if (desc.length < 5 || desc.length > 1000) {
      errors.actionDescription = "Action description must be between 5 and 1000 characters";
    }

    const res = formData.result.trim();
    if (!res) {
      errors.result = "Result is required";
    } else if (res.length < 2 || res.length > 1000) {
      errors.result = "Result must be between 2 and 1000 characters";
    }

    if (formData.isFollowUpRequired) {
      const note = formData.followUpNote.trim();
      if (!note || note.length < 3 || note.length > 1000) {
        errors.followUpNote = "Follow-up note is required (between 3 and 1000 characters) when follow-up is requested";
      }
    }

    if (formData.attachmentNotes && formData.attachmentNotes.length > 500) {
      errors.attachmentNotes = "Attachment notes must not exceed 500 characters";
    }

    if (formData.actionDateTime) {
      const parsedDate = new Date(formData.actionDateTime);
      if (isNaN(parsedDate.getTime())) {
        errors.actionDateTime = "Please enter a valid date and time";
      } else {
        const futureLimit = Date.now() + 5 * 60 * 1000;
        if (parsedDate.getTime() > futureLimit) {
          errors.actionDateTime = "Action date and time cannot be in the future";
        }
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setIsConflict(false);

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const isoDateTime = formData.actionDateTime
        ? new Date(formData.actionDateTime).toISOString()
        : undefined;

      if (editingAction) {
        // Edit mode
        const payload: UpdateActionTakenInput = {
          actionDescription: formData.actionDescription.trim(),
          result: formData.result.trim(),
          isFollowUpRequired: formData.isFollowUpRequired,
          followUpNote: formData.isFollowUpRequired ? formData.followUpNote.trim() : null,
          attachmentNotes: formData.attachmentNotes.trim() || null,
          actionDateTime: isoDateTime,
          expectedUpdatedAt: editingAction.updatedAt,
        };

        const res = await updateActionTaken(editingAction.id, payload);
        setActions((prev) =>
          prev.map((a) => (a.id === editingAction.id ? res.data : a))
        );
        setSuccessMessage("Action taken updated successfully.");
        setIsModalOpen(false);
      } else {
        // Create mode
        const payload: CreateActionTakenInput = {
          actionDescription: formData.actionDescription.trim(),
          result: formData.result.trim(),
          isFollowUpRequired: formData.isFollowUpRequired,
          followUpNote: formData.isFollowUpRequired ? formData.followUpNote.trim() : null,
          attachmentNotes: formData.attachmentNotes.trim() || null,
          actionDateTime: isoDateTime,
        };

        const res = await createActionTaken(ticketId, payload);
        setActions((prev) => [res.data, ...prev]);
        setSuccessMessage("Action taken recorded successfully.");
        setIsModalOpen(false);
      }
    } catch (err: any) {
      // In case of conflict (HTTP 409) or other errors, protect entered data
      if (err?.status === 409 || err?.code === "STALE_UPDATE_CONFLICT") {
        setIsConflict(true);
        setSubmitError(
          "This record has been updated by another user. Please reload the latest data."
        );
      } else {
        setSubmitError(err?.message || "Failed to save action taken. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return "—";
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatRoleLabel = (role?: string) => {
    switch (role) {
      case "ADMINISTRATOR":
        return "Administrator";
      case "IT_STAFF":
        return "IT Staff";
      case "REQUESTER":
        return "Requester";
      default:
        return role || "Staff";
    }
  };

  return (
    <section
      className="card shadow-sm border mb-4"
      aria-labelledby="actions-taken-heading"
      style={{ backgroundColor: "#FFFFFF", borderColor: "#D1D9D4", borderRadius: "8px" }}
    >
      <div
        className="card-header bg-white border-bottom p-3 d-flex align-items-center justify-content-between flex-wrap gap-2"
        style={{ borderColor: "#D1D9D4" }}
      >
        <div className="d-flex align-items-center gap-2">
          <h2 id="actions-taken-heading" className="h6 fw-bold mb-0" style={{ color: "#1E2B24" }}>
            Actions Taken ({actions.length})
          </h2>
          <span className="badge rounded-pill" style={{ backgroundColor: "#EAF6EF", color: "#006B3C" }}>
            Audit Log
          </span>
        </div>

        {canManageActions && !isTicketClosed && (
          <button
            type="button"
            className="btn btn-sm text-white fw-semibold"
            style={{ backgroundColor: "#006B3C", borderColor: "#006B3C" }}
            onClick={openCreateModal}
          >
            + Record Action Taken
          </button>
        )}
      </div>

      <div className="card-body p-4">
        {successMessage && (
          <div
            className="alert alert-success alert-dismissible fade show py-2 px-3 mb-3 small"
            role="status"
            aria-live="polite"
          >
            {successMessage}
            <button
              type="button"
              className="btn-close py-2"
              onClick={() => setSuccessMessage(null)}
              aria-label="Close"
            ></button>
          </div>
        )}

        {fetchError && (
          <div className="alert alert-danger py-2 px-3 mb-3 small d-flex justify-content-between align-items-center" role="alert">
            <span>{fetchError}</span>
            <button
              type="button"
              className="btn btn-sm btn-outline-danger ms-2"
              onClick={loadActions}
            >
              Retry
            </button>
          </div>
        )}

        {loading ? (
          <div className="text-center py-4 text-muted">
            <div className="spinner-border spinner-border-sm text-success me-2" role="status">
              <span className="visually-hidden">Loading…</span>
            </div>
            <span className="small">Loading actions taken…</span>
          </div>
        ) : actions.length === 0 ? (
          <div className="text-center py-4 border rounded" style={{ backgroundColor: "#F5F7F6", borderColor: "#D1D9D4" }}>
            <p className="text-muted small mb-0">No actions taken recorded yet.</p>
            {canManageActions && !isTicketClosed && (
              <p className="text-muted small mt-1 mb-0">
                Click "+ Record Action Taken" above to document work on this ticket.
              </p>
            )}
          </div>
        ) : (
          <>
            {/* Desktop View Table (>=768px) */}
            <div className="d-none d-md-block table-responsive">
              <table className="table table-hover align-middle mb-0" style={{ fontSize: "14px" }}>
                <thead style={{ backgroundColor: "#EAF6EF", color: "#1E2B24" }}>
                  <tr>
                    <th scope="col" style={{ width: "18%" }}>Date & Time</th>
                    <th scope="col" style={{ width: "32%" }}>Action & Performer</th>
                    <th scope="col" style={{ width: "35%" }}>Result / Follow-Up</th>
                    {canManageActions && <th scope="col" style={{ width: "15%" }} className="text-end">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {actions.map((action) => (
                    <tr key={action.id}>
                      <td className="text-muted small align-top">
                        <time dateTime={action.actionDateTime || action.createdAt}>
                          {formatDate(action.actionDateTime || action.createdAt)}
                        </time>
                      </td>
                      <td className="align-top">
                        <div className="fw-semibold text-dark text-break mb-1" style={{ whiteSpace: "pre-wrap" }}>
                          {action.actionDescription}
                        </div>
                        <div className="small text-muted mb-1">
                          By: <span className="fw-semibold text-dark">{action.performedBy?.name}</span>{" "}
                          <span className="badge rounded-pill px-2 py-0 ms-1" style={{ backgroundColor: "#E1F5FE", color: "#0277BD", fontSize: "11px" }}>
                            {formatRoleLabel(action.performedBy?.role)}
                          </span>
                        </div>
                        {action.attachmentNotes && (
                          <div className="small text-muted fst-italic text-break">
                            📎 Attachment Notes: {action.attachmentNotes}
                          </div>
                        )}
                      </td>
                      <td className="align-top">
                        <div className="text-dark text-break mb-2" style={{ whiteSpace: "pre-wrap" }}>
                          {action.result}
                        </div>
                        {action.isFollowUpRequired ? (
                          <div
                            className="p-2 border rounded small"
                            style={{ backgroundColor: "#FFF8E1", borderColor: "#FFE082", color: "#B76E00" }}
                          >
                            <span className="fw-bold me-1">⚠️ Follow-up Required:</span>
                            <span className="text-break">{action.followUpNote}</span>
                          </div>
                        ) : (
                          <div className="text-muted small">No follow-up required.</div>
                        )}
                      </td>
                      {canManageActions && (
                        <td className="align-top text-end">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => openEditModal(action)}
                            disabled={isTicketClosed}
                            aria-label={`Edit action ${action.id}`}
                          >
                            Edit
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile View Cards (<768px) */}
            <div className="d-md-none d-flex flex-column gap-3">
              {actions.map((action) => (
                <article
                  key={action.id}
                  className="p-3 border rounded"
                  style={{ backgroundColor: "#FFFFFF", borderColor: "#D1D9D4" }}
                >
                  <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                    <time className="small text-muted" dateTime={action.actionDateTime || action.createdAt}>
                      {formatDate(action.actionDateTime || action.createdAt)}
                    </time>
                    {canManageActions && (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary px-2 py-1"
                        style={{ fontSize: "12px" }}
                        onClick={() => openEditModal(action)}
                        disabled={isTicketClosed}
                        aria-label={`Edit action ${action.id}`}
                      >
                        Edit
                      </button>
                    )}
                  </div>

                  <div className="fw-semibold text-dark text-break mb-1" style={{ whiteSpace: "pre-wrap" }}>
                    {action.actionDescription}
                  </div>

                  <div className="small text-muted mb-2">
                    By: <span className="fw-semibold text-dark">{action.performedBy?.name}</span>{" "}
                    <span className="badge rounded-pill px-2 py-0 ms-1" style={{ backgroundColor: "#E1F5FE", color: "#0277BD", fontSize: "11px" }}>
                      {formatRoleLabel(action.performedBy?.role)}
                    </span>
                  </div>

                  <div className="small mb-2 text-break">
                    <span className="fw-semibold text-dark">Result: </span>
                    <span className="text-muted">{action.result}</span>
                  </div>

                  {action.isFollowUpRequired ? (
                    <div
                      className="p-2 border rounded small mb-2"
                      style={{ backgroundColor: "#FFF8E1", borderColor: "#FFE082", color: "#B76E00" }}
                    >
                      <span className="fw-bold me-1">⚠️ Follow-up Required:</span>
                      <span className="text-break">{action.followUpNote}</span>
                    </div>
                  ) : (
                    <div className="text-muted small mb-2">No follow-up required.</div>
                  )}

                  {action.attachmentNotes && (
                    <div className="small text-muted fst-italic text-break">
                      📎 Attachment Notes: {action.attachmentNotes}
                    </div>
                  )}
                </article>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Create / Edit Modal Dialog */}
      {isModalOpen && (
        <div
          className="modal show d-block"
          tabIndex={-1}
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="action-modal-title"
        >
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content" style={{ borderRadius: "8px" }}>
              <form onSubmit={handleSubmit} noValidate>
                <div className="modal-header border-bottom">
                  <h5 id="action-modal-title" className="modal-title fw-bold" style={{ color: "#1E2B24" }}>
                    {editingAction ? "Edit Action Taken" : "Record Action Taken"}
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={closeModal}
                    disabled={isSubmitting}
                    aria-label="Close"
                  ></button>
                </div>

                <div className="modal-body py-4">
                  {submitError && (
                    <div
                      className={`alert ${isConflict ? "alert-warning" : "alert-danger"} py-2 px-3 mb-3 small`}
                      role="alert"
                    >
                      {submitError}
                      {isConflict && (
                        <div className="mt-2">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-dark"
                            onClick={() => {
                              loadActions();
                              closeModal();
                            }}
                          >
                            Reload Latest Data
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Performed By (Display Only - Stamped from Session) */}
                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-dark">
                      Performed By
                    </label>
                    <input
                      type="text"
                      className="form-control form-control-sm bg-light"
                      readOnly
                      disabled
                      value={
                        editingAction
                          ? `${editingAction.performedBy?.name} (${formatRoleLabel(editingAction.performedBy?.role)})`
                          : `${user?.name || "Current User"} (${formatRoleLabel(user?.role)}) - Auto-assigned`
                      }
                    />
                    <div className="form-text small text-muted">
                      Performer is automatically stamped from your authenticated session.
                    </div>
                  </div>

                  {/* Action Date & Time */}
                  <div className="mb-3">
                    <label htmlFor="action-datetime-input" className="form-label small fw-semibold text-dark">
                      Action Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      id="action-datetime-input"
                      className={`form-control form-control-sm ${validationErrors.actionDateTime ? "is-invalid" : ""}`}
                      value={formData.actionDateTime}
                      onChange={(e) => {
                        setFormData({ ...formData, actionDateTime: e.target.value });
                        if (validationErrors.actionDateTime) {
                          setValidationErrors({ ...validationErrors, actionDateTime: "" });
                        }
                      }}
                    />
                    {validationErrors.actionDateTime ? (
                      <div className="invalid-feedback small">{validationErrors.actionDateTime}</div>
                    ) : (
                      <div className="form-text small text-muted">
                        Defaults to current time. Represents when physical or technical work took place.
                      </div>
                    )}
                  </div>

                  {/* Action Description */}
                  <div className="mb-3">
                    <label htmlFor="action-description-input" className="form-label small fw-semibold text-dark">
                      Action Description <span className="text-danger">*</span>
                    </label>
                    <textarea
                      id="action-description-input"
                      className={`form-control ${validationErrors.actionDescription ? "is-invalid" : ""}`}
                      rows={3}
                      maxLength={1000}
                      placeholder="Describe what technical action was performed (min 5 characters)…"
                      value={formData.actionDescription}
                      onChange={(e) => {
                        setFormData({ ...formData, actionDescription: e.target.value });
                        if (validationErrors.actionDescription) {
                          setValidationErrors({ ...validationErrors, actionDescription: "" });
                        }
                      }}
                      aria-required="true"
                    />
                    {validationErrors.actionDescription ? (
                      <div className="invalid-feedback small">{validationErrors.actionDescription}</div>
                    ) : (
                      <div className="d-flex justify-content-between text-muted small mt-1">
                        <span>Min 5 characters</span>
                        <span>{formData.actionDescription.length}/1000</span>
                      </div>
                    )}
                  </div>

                  {/* Result */}
                  <div className="mb-3">
                    <label htmlFor="action-result-input" className="form-label small fw-semibold text-dark">
                      Result <span className="text-danger">*</span>
                    </label>
                    <textarea
                      id="action-result-input"
                      className={`form-control ${validationErrors.result ? "is-invalid" : ""}`}
                      rows={3}
                      maxLength={1000}
                      placeholder="Describe the outcome or finding from this action (min 2 characters)…"
                      value={formData.result}
                      onChange={(e) => {
                        setFormData({ ...formData, result: e.target.value });
                        if (validationErrors.result) {
                          setValidationErrors({ ...validationErrors, result: "" });
                        }
                      }}
                      aria-required="true"
                    />
                    {validationErrors.result ? (
                      <div className="invalid-feedback small">{validationErrors.result}</div>
                    ) : (
                      <div className="d-flex justify-content-between text-muted small mt-1">
                        <span>Min 2 characters</span>
                        <span>{formData.result.length}/1000</span>
                      </div>
                    )}
                  </div>

                  {/* Follow-Up Required Checkbox */}
                  <div className="form-check form-switch mb-3">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      role="switch"
                      id="action-followup-switch"
                      checked={formData.isFollowUpRequired}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setFormData({
                          ...formData,
                          isFollowUpRequired: checked,
                          followUpNote: checked ? formData.followUpNote : "",
                        });
                        if (!checked && validationErrors.followUpNote) {
                          const rest = { ...validationErrors };
                          delete rest.followUpNote;
                          setValidationErrors(rest);
                        }
                      }}
                    />
                    <label className="form-check-label small fw-semibold text-dark" htmlFor="action-followup-switch">
                      Follow-Up Required?
                    </label>
                  </div>

                  {/* Conditional Follow-Up Note */}
                  {formData.isFollowUpRequired && (
                    <div className="mb-3 p-3 border rounded" style={{ backgroundColor: "#FFF8E1", borderColor: "#FFE082" }}>
                      <label htmlFor="action-followup-note-input" className="form-label small fw-semibold text-dark">
                        Follow-Up Note <span className="text-danger">*</span>
                      </label>
                      <textarea
                        id="action-followup-note-input"
                        className={`form-control ${validationErrors.followUpNote ? "is-invalid" : ""}`}
                        rows={2}
                        maxLength={1000}
                        placeholder="Detail what next steps or monitoring are required (min 3 characters)…"
                        value={formData.followUpNote}
                        onChange={(e) => {
                          setFormData({ ...formData, followUpNote: e.target.value });
                          if (validationErrors.followUpNote) {
                            setValidationErrors({ ...validationErrors, followUpNote: "" });
                          }
                        }}
                        aria-required="true"
                      />
                      {validationErrors.followUpNote ? (
                        <div className="invalid-feedback small">{validationErrors.followUpNote}</div>
                      ) : (
                        <div className="d-flex justify-content-between text-muted small mt-1">
                          <span>Required when follow-up is requested (min 3 characters)</span>
                          <span>{formData.followUpNote.length}/1000</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Attachment Notes */}
                  <div className="mb-3">
                    <label htmlFor="action-attachment-notes-input" className="form-label small fw-semibold text-dark">
                      Attachment Notes (Optional)
                    </label>
                    <input
                      type="text"
                      id="action-attachment-notes-input"
                      className={`form-control form-control-sm ${validationErrors.attachmentNotes ? "is-invalid" : ""}`}
                      maxLength={500}
                      placeholder="e.g. Asset tag 55829, external benchmark log, hardware serial"
                      value={formData.attachmentNotes}
                      onChange={(e) => {
                        setFormData({ ...formData, attachmentNotes: e.target.value });
                        if (validationErrors.attachmentNotes) {
                          setValidationErrors({ ...validationErrors, attachmentNotes: "" });
                        }
                      }}
                    />
                    {validationErrors.attachmentNotes ? (
                      <div className="invalid-feedback small">{validationErrors.attachmentNotes}</div>
                    ) : (
                      <div className="form-text small text-muted">
                        Reference physical items, external log files, or hardware tags (max 500 characters).
                      </div>
                    )}
                  </div>
                </div>

                <div className="modal-footer border-top bg-light">
                  <button
                    type="button"
                    className="btn btn-outline-secondary px-3"
                    onClick={closeModal}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn text-white px-4 fw-semibold"
                    disabled={isSubmitting}
                    style={{ backgroundColor: "#006B3C", borderColor: "#006B3C" }}
                  >
                    {isSubmitting ? (
                      <span>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Saving…
                      </span>
                    ) : editingAction ? (
                      "Update Action"
                    ) : (
                      "Save Action"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default ActionsTakenComponent;
