import React, { useState, useEffect, useCallback } from "react";
import {
  fetchStaffDashboard,
  fetchAdminDashboard,
  StaffDashboardResponse,
  AdminDashboardResponse,
  StaffRecentTicket,
  TicketStatus,
  PriorityLevel,
} from "../api.js";
import { useAuth } from "../context/AuthContext.js";

// ---------------------------------------------------------------------------
// Design Tokens (Zen Green)
// ---------------------------------------------------------------------------
const GREEN_PRIMARY = "#006B3C";
const GREEN_SECONDARY = "#0B7A46";
const BG_PAGE = "#F5F7F6";
const SURFACE = "#FFFFFF";
const BORDER = "#D1D9D4";
const TEXT_PRIMARY = "#1E2B24";
const TEXT_MUTED = "#556B60";
const PALE_GREEN = "#EAF6EF";
const ERROR_TEXT = "#B3261E";
const ERROR_BG = "#FDF2F2";

export interface StaffDashboardProps {
  onNavigateQueue?: (filter?: { status?: string; assignedTo?: string }) => void;
  onSelectTicket?: (id: number) => void;
  onCreateTicket?: () => void;
}

function statusBadge(status: TicketStatus): React.ReactNode {
  const styles: Record<TicketStatus, { bg: string; color: string; label: string }> = {
    NEW: { bg: "#EAF6EF", color: "#006B3C", label: "New" },
    OPEN: { bg: "#E3F2FD", color: "#1565C0", label: "Open" },
    IN_PROGRESS: { bg: "#FFF8E1", color: "#B76E00", label: "In Progress" },
    WAITING_FOR_REQUESTER: { bg: "#F3E5F5", color: "#7B1FA2", label: "Waiting Req" },
    RESOLVED: { bg: "#E8F5E9", color: "#2E7D32", label: "Resolved" },
    CLOSED: { bg: "#ECEFF1", color: "#455A64", label: "Closed" },
    REOPENED: { bg: "#FBE9E7", color: "#D84315", label: "Reopened" },
    CANCELLED: { bg: "#FFEBEE", color: "#C62828", label: "Cancelled" },
  };
  const s = styles[status] ?? { bg: "#F5F7F6", color: "#556B60", label: status };
  return (
    <span
      style={{
        backgroundColor: s.bg,
        color: s.color,
        padding: "3px 8px",
        borderRadius: "12px",
        fontSize: "11px",
        fontWeight: 600,
        whiteSpace: "nowrap",
        display: "inline-block",
      }}
    >
      {s.label}
    </span>
  );
}

function priorityBadge(priority?: PriorityLevel | null): React.ReactNode {
  if (!priority) return null;
  const map: Record<PriorityLevel, { bg: string; color: string }> = {
    LOW: { bg: "#E8F5E9", color: "#2E7D32" },
    MEDIUM: { bg: "#FFF9C4", color: "#827717" },
    HIGH: { bg: "#FBE9E7", color: "#BF360C" },
    URGENT: { bg: "#FFEBEE", color: "#B71C1C" },
  };
  const s = map[priority] ?? { bg: "#F5F7F6", color: "#556B60" };
  return (
    <span
      style={{
        backgroundColor: s.bg,
        color: s.color,
        padding: "3px 8px",
        borderRadius: "12px",
        fontSize: "11px",
        fontWeight: 600,
        whiteSpace: "nowrap",
        display: "inline-block",
      }}
    >
      {priority}
    </span>
  );
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function StaffDashboard({
  onNavigateQueue,
  onSelectTicket,
  onCreateTicket,
}: StaffDashboardProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMINISTRATOR";

  const [data, setData] = useState<StaffDashboardResponse | AdminDashboardResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (isAdmin) {
        const res = await fetchAdminDashboard();
        setData(res);
      } else {
        const res = await fetchStaffDashboard();
        setData(res);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const firstName = user?.name ? user.name.split(" ")[0] : "there";

  const metrics = data?.metrics;
  const recentTickets = data?.recentTickets ?? [];
  const userSummary = (data?.metrics as any)?.userSummary;

  return (
    <div className="container-fluid px-0" style={{ color: TEXT_PRIMARY }}>
      {/* Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-2">
        <div>
          <h1 className="h4 fw-bold mb-1" style={{ color: TEXT_PRIMARY }}>
            Welcome back, {firstName}!
          </h1>
          <p className="small mb-0" style={{ color: TEXT_MUTED }}>
            Here's what's happening with your queue today.
          </p>
        </div>
        <div>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
            onClick={loadData}
            disabled={loading}
            style={{
              borderColor: BORDER,
              color: TEXT_PRIMARY,
              backgroundColor: SURFACE,
            }}
          >
            <span>🔄</span>
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div
          className="alert mb-4"
          role="alert"
          style={{
            backgroundColor: ERROR_BG,
            color: ERROR_TEXT,
            border: `1px solid ${ERROR_TEXT}33`,
          }}
        >
          {error}
        </div>
      )}

      {/* Loading state skeleton */}
      {loading ? (
        <div>
          <div className="row g-3 mb-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="col-12 col-sm-6 col-md-4 col-lg">
                <div
                  className="card p-3"
                  style={{
                    backgroundColor: SURFACE,
                    border: `1px solid ${BORDER}`,
                    borderRadius: "8px",
                    minHeight: "110px",
                  }}
                >
                  <div
                    style={{
                      height: "14px",
                      width: "60%",
                      backgroundColor: "#E0EBE5",
                      borderRadius: "4px",
                      marginBottom: "12px",
                    }}
                  />
                  <div
                    style={{
                      height: "32px",
                      width: "40%",
                      backgroundColor: "#E0EBE5",
                      borderRadius: "4px",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="card p-4" style={{ backgroundColor: SURFACE, border: `1px solid ${BORDER}` }}>
            <div style={{ height: "20px", width: "200px", backgroundColor: "#E0EBE5", marginBottom: "16px" }} />
            <div style={{ height: "40px", backgroundColor: "#E0EBE5", marginBottom: "8px" }} />
            <div style={{ height: "40px", backgroundColor: "#E0EBE5" }} />
          </div>
        </div>
      ) : (
        <>
          {/* Administrator User Summary row (if admin) */}
          {isAdmin && userSummary && (
            <div className="mb-4">
              <h2 className="h6 fw-bold mb-2" style={{ color: TEXT_MUTED }}>
                User Account Overview
              </h2>
              <div className="row g-3">
                <div className="col-12 col-sm-4">
                  <div
                    className="card p-3 shadow-sm"
                    style={{
                      backgroundColor: SURFACE,
                      border: `1px solid ${BORDER}`,
                      borderRadius: "8px",
                    }}
                  >
                    <div className="small fw-semibold" style={{ color: TEXT_MUTED }}>
                      Total Users
                    </div>
                    <div
                      className="fw-bold mt-1"
                      style={{ fontSize: "2rem", color: GREEN_PRIMARY }}
                      data-testid="admin-total-users"
                    >
                      {userSummary.totalUsers ?? 0}
                    </div>
                  </div>
                </div>
                <div className="col-12 col-sm-4">
                  <div
                    className="card p-3 shadow-sm"
                    style={{
                      backgroundColor: SURFACE,
                      border: `1px solid ${BORDER}`,
                      borderRadius: "8px",
                    }}
                  >
                    <div className="small fw-semibold" style={{ color: TEXT_MUTED }}>
                      Active Users
                    </div>
                    <div
                      className="fw-bold mt-1"
                      style={{ fontSize: "2rem", color: GREEN_PRIMARY }}
                      data-testid="admin-active-users"
                    >
                      {userSummary.activeUsers ?? 0}
                    </div>
                  </div>
                </div>
                <div className="col-12 col-sm-4">
                  <div
                    className="card p-3 shadow-sm"
                    style={{
                      backgroundColor: SURFACE,
                      border: `1px solid ${BORDER}`,
                      borderRadius: "8px",
                    }}
                  >
                    <div className="small fw-semibold" style={{ color: TEXT_MUTED }}>
                      Inactive Users
                    </div>
                    <div
                      className="fw-bold mt-1"
                      style={{ fontSize: "2rem", color: TEXT_MUTED }}
                      data-testid="admin-inactive-users"
                    >
                      {userSummary.inactiveUsers ?? 0}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Operational Metric Cards (5 columns) */}
          <div className="row g-3 mb-4">
            {/* New */}
            <div className="col-12 col-sm-6 col-md-4 col-lg">
              <div
                className="card p-3 h-100 shadow-sm d-flex flex-column justify-content-between"
                style={{
                  backgroundColor: SURFACE,
                  border: `1px solid ${BORDER}`,
                  borderRadius: "8px",
                  cursor: "pointer",
                }}
                onClick={() => onNavigateQueue?.({ status: "NEW" })}
              >
                <div>
                  <div className="small fw-semibold" style={{ color: TEXT_MUTED }}>
                    <span className="visually-hidden">Status: </span>New
                  </div>
                  <div
                    className="fw-bold my-1"
                    style={{ fontSize: "2.25rem", color: GREEN_PRIMARY, lineHeight: 1.2 }}
                    data-testid="metric-new-tickets"
                  >
                    {metrics?.newTickets ?? 0}
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-link p-0 text-start text-decoration-none small fw-semibold"
                  style={{ color: GREEN_SECONDARY }}
                  aria-label="Status: New - View queue"
                  onClick={(e) => {
                    e.stopPropagation();
                    onNavigateQueue?.({ status: "NEW" });
                  }}
                >
                  View queue &rarr;
                </button>
              </div>
            </div>

            {/* Open */}
            <div className="col-12 col-sm-6 col-md-4 col-lg">
              <div
                className="card p-3 h-100 shadow-sm d-flex flex-column justify-content-between"
                style={{
                  backgroundColor: SURFACE,
                  border: `1px solid ${BORDER}`,
                  borderRadius: "8px",
                  cursor: "pointer",
                }}
                onClick={() => onNavigateQueue?.({ status: "OPEN" })}
              >
                <div>
                  <div className="small fw-semibold" style={{ color: TEXT_MUTED }}>
                    <span className="visually-hidden">Status: </span>Open
                  </div>
                  <div
                    className="fw-bold my-1"
                    style={{ fontSize: "2.25rem", color: GREEN_PRIMARY, lineHeight: 1.2 }}
                    data-testid="metric-open-tickets"
                  >
                    {metrics?.openTickets ?? 0}
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-link p-0 text-start text-decoration-none small fw-semibold"
                  style={{ color: GREEN_SECONDARY }}
                  aria-label="Status: Open - View queue"
                  onClick={(e) => {
                    e.stopPropagation();
                    onNavigateQueue?.({ status: "OPEN" });
                  }}
                >
                  View queue &rarr;
                </button>
              </div>
            </div>

            {/* In Progress */}
            <div className="col-12 col-sm-6 col-md-4 col-lg">
              <div
                className="card p-3 h-100 shadow-sm d-flex flex-column justify-content-between"
                style={{
                  backgroundColor: SURFACE,
                  border: `1px solid ${BORDER}`,
                  borderRadius: "8px",
                  cursor: "pointer",
                }}
                onClick={() => onNavigateQueue?.({ status: "IN_PROGRESS" })}
              >
                <div>
                  <div className="small fw-semibold" style={{ color: TEXT_MUTED }}>
                    <span className="visually-hidden">Status: </span>In Progress
                  </div>
                  <div
                    className="fw-bold my-1"
                    style={{ fontSize: "2.25rem", color: GREEN_PRIMARY, lineHeight: 1.2 }}
                    data-testid="metric-in-progress-tickets"
                  >
                    {metrics?.inProgressTickets ?? 0}
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-link p-0 text-start text-decoration-none small fw-semibold"
                  style={{ color: GREEN_SECONDARY }}
                  aria-label="Status: In Progress - View queue"
                  onClick={(e) => {
                    e.stopPropagation();
                    onNavigateQueue?.({ status: "IN_PROGRESS" });
                  }}
                >
                  View queue &rarr;
                </button>
              </div>
            </div>

            {/* Waiting Req */}
            <div className="col-12 col-sm-6 col-md-4 col-lg">
              <div
                className="card p-3 h-100 shadow-sm d-flex flex-column justify-content-between"
                style={{
                  backgroundColor: SURFACE,
                  border: `1px solid ${BORDER}`,
                  borderRadius: "8px",
                  cursor: "pointer",
                }}
                onClick={() => onNavigateQueue?.({ status: "WAITING_FOR_REQUESTER" })}
              >
                <div>
                  <div className="small fw-semibold" style={{ color: TEXT_MUTED }}>
                    <span className="visually-hidden">Status: </span>Waiting Req
                  </div>
                  <div
                    className="fw-bold my-1"
                    style={{ fontSize: "2.25rem", color: GREEN_PRIMARY, lineHeight: 1.2 }}
                    data-testid="metric-waiting-req-tickets"
                  >
                    {metrics?.waitingForRequesterTickets ?? 0}
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-link p-0 text-start text-decoration-none small fw-semibold"
                  style={{ color: GREEN_SECONDARY }}
                  aria-label="Status: Waiting for Requester - View queue"
                  onClick={(e) => {
                    e.stopPropagation();
                    onNavigateQueue?.({ status: "WAITING_FOR_REQUESTER" });
                  }}
                >
                  View queue &rarr;
                </button>
              </div>
            </div>

            {/* My Assigned */}
            <div className="col-12 col-sm-6 col-md-4 col-lg">
              <div
                className="card p-3 h-100 shadow-sm d-flex flex-column justify-content-between"
                style={{
                  backgroundColor: PALE_GREEN,
                  border: `1px solid ${BORDER}`,
                  borderRadius: "8px",
                  cursor: "pointer",
                }}
                onClick={() => onNavigateQueue?.({ assignedTo: "ME" })}
              >
                <div>
                  <div className="small fw-semibold" style={{ color: GREEN_PRIMARY }}>
                    My Assigned<span className="visually-hidden"> Tickets</span>
                  </div>
                  <div
                    className="fw-bold my-1"
                    style={{ fontSize: "2.25rem", color: GREEN_PRIMARY, lineHeight: 1.2 }}
                    data-testid="metric-my-assigned-tickets"
                  >
                    {metrics?.myAssignedTickets ?? 0}
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-link p-0 text-start text-decoration-none small fw-semibold"
                  style={{ color: GREEN_SECONDARY }}
                  aria-label="My Assigned Tickets - View queue"
                  onClick={(e) => {
                    e.stopPropagation();
                    onNavigateQueue?.({ assignedTo: "ME" });
                  }}
                >
                  View queue &rarr;
                </button>
              </div>
            </div>
          </div>

          {/* Lower layout: Recent Tickets + Quick Actions */}
          <div className="row g-4">
            {/* My Recent Tickets */}
            <div className="col-12 col-lg-8">
              <div
                className="card shadow-sm h-100"
                style={{
                  backgroundColor: SURFACE,
                  border: `1px solid ${BORDER}`,
                  borderRadius: "8px",
                }}
              >
                <div className="card-header bg-transparent d-flex justify-content-between align-items-center py-3 px-4 border-bottom">
                  <h2 className="h6 fw-bold mb-0" style={{ color: TEXT_PRIMARY }}>
                    My Recent Tickets
                  </h2>
                  <button
                    type="button"
                    className="btn btn-link p-0 text-decoration-none small fw-semibold"
                    style={{ color: GREEN_SECONDARY }}
                    onClick={() => onNavigateQueue?.()}
                  >
                    View all
                  </button>
                </div>
                <div className="card-body p-0">
                  {recentTickets.length === 0 ? (
                    <div className="p-4 text-center">
                      <div
                        className="p-4 mx-auto"
                        style={{
                          backgroundColor: PALE_GREEN,
                          borderRadius: "8px",
                          maxWidth: "480px",
                        }}
                      >
                        <span style={{ fontSize: "28px" }} aria-hidden="true">
                          🍃
                        </span>
                        <div className="fw-semibold mt-2" style={{ color: GREEN_PRIMARY }}>
                          Queue is clear
                        </div>
                        <div className="small text-muted mt-1">
                          No active tickets require immediate triage.
                        </div>
                      </div>
                    </div>
                  ) : (
                    <ul className="list-group list-group-flush">
                      {recentTickets.map((t) => (
                        <li
                          key={t.id}
                          className="list-group-item list-group-item-action px-4 py-3"
                          style={{ cursor: "pointer" }}
                          onClick={() => onSelectTicket?.(t.id)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              onSelectTicket?.(t.id);
                            }
                          }}
                        >
                          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
                            <div className="fw-bold" style={{ color: GREEN_PRIMARY, fontSize: "14px" }}>
                              {t.ticketNumber}
                            </div>
                            <div className="small text-muted">
                              Updated: {formatDate(t.updatedAt)}
                            </div>
                          </div>
                          <div
                            className="text-truncate my-1 fw-medium"
                            style={{ color: TEXT_PRIMARY, fontSize: "14px" }}
                          >
                            {t.summary}
                          </div>
                          <div className="d-flex align-items-center gap-2 mt-1">
                            {statusBadge(t.status)}
                            {priorityBadge(t.itPriority)}
                            {t.category?.name && (
                              <span
                                className="small text-muted"
                                style={{ fontSize: "11px" }}
                              >
                                &bull; {t.category.name}
                              </span>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="col-12 col-lg-4">
              <div
                className="card shadow-sm h-100"
                style={{
                  backgroundColor: SURFACE,
                  border: `1px solid ${BORDER}`,
                  borderRadius: "8px",
                }}
              >
                <div className="card-header bg-transparent py-3 px-4 border-bottom">
                  <h2 className="h6 fw-bold mb-0" style={{ color: TEXT_PRIMARY }}>
                    Quick Actions
                  </h2>
                </div>
                <div className="card-body p-4 d-flex flex-column gap-3">
                  {onCreateTicket && (
                    <button
                      type="button"
                      className="btn w-100 text-start py-2 px-3 fw-semibold d-flex align-items-center gap-2"
                      style={{
                        backgroundColor: PALE_GREEN,
                        color: GREEN_PRIMARY,
                        border: `1px solid ${BORDER}`,
                        borderRadius: "6px",
                      }}
                      onClick={onCreateTicket}
                    >
                      <span aria-hidden="true">➕</span>
                      <span>Create Ticket</span>
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn w-100 text-start py-2 px-3 fw-semibold d-flex align-items-center gap-2"
                    style={{
                      backgroundColor: SURFACE,
                      color: TEXT_PRIMARY,
                      border: `1px solid ${BORDER}`,
                      borderRadius: "6px",
                    }}
                    onClick={() => onNavigateQueue?.()}
                  >
                    <span aria-hidden="true">🗂</span>
                    <span>View Full Queue</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

