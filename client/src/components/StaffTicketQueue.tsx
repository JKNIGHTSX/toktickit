import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  fetchStaffQueue,
  fetchCategories,
  Category,
  TicketQueueItem,
  PaginationMetadata,
  PriorityLevel,
  TicketStatus,
  AssignedToFilter,
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

// ---------------------------------------------------------------------------
// Badge helpers
// ---------------------------------------------------------------------------
function statusBadge(status: TicketStatus): React.ReactNode {
  const styles: Record<TicketStatus, { bg: string; color: string; label: string }> = {
    NEW: { bg: "#EAF6EF", color: "#006B3C", label: "New" },
    OPEN: { bg: "#E3F2FD", color: "#1565C0", label: "Open" },
    IN_PROGRESS: { bg: "#FFF8E1", color: "#B76E00", label: "In Progress" },
    WAITING_FOR_REQUESTER: { bg: "#F3E5F5", color: "#7B1FA2", label: "Waiting" },
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
        padding: "2px 8px",
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

function priorityBadge(priority: PriorityLevel | null, variant: "req" | "it" = "req"): React.ReactNode {
  if (!priority) return <span style={{ color: TEXT_MUTED, fontSize: "12px" }}>—</span>;
  const map: Record<PriorityLevel, { bg: string; color: string }> = {
    LOW: { bg: "#E8F5E9", color: "#2E7D32" },
    MEDIUM: { bg: "#FFF9C4", color: "#827717" },
    HIGH: { bg: "#FBE9E7", color: "#BF360C" },
    URGENT: { bg: "#FFEBEE", color: "#B71C1C" },
  };
  const s = map[priority];
  return (
    <span
      style={{
        backgroundColor: variant === "it" ? s.bg : s.bg,
        color: s.color,
        border: variant === "it" ? `1px solid ${s.color}33` : "none",
        padding: "2px 8px",
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
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateShort(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ---------------------------------------------------------------------------
// Skeleton loader
// ---------------------------------------------------------------------------
function SkeletonRow() {
  return (
    <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
      {Array.from({ length: 9 }).map((_, i) => (
        <td key={i} style={{ padding: "12px 10px" }}>
          <div
            style={{
              height: 14,
              borderRadius: 6,
              backgroundColor: "#E0EBE5",
              width: i === 2 ? "80%" : i === 3 ? "60%" : "50%",
              animation: "pulse 1.4s ease-in-out infinite",
            }}
          />
        </td>
      ))}
    </tr>
  );
}

function SkeletonCard() {
  return (
    <div
      style={{
        backgroundColor: SURFACE,
        border: `1px solid ${BORDER}`,
        borderRadius: 10,
        padding: "14px 16px",
        marginBottom: 12,
      }}
    >
      {[70, 90, 50, 60].map((w, i) => (
        <div
          key={i}
          style={{
            height: 12,
            borderRadius: 6,
            backgroundColor: "#E0EBE5",
            width: `${w}%`,
            marginBottom: 8,
            animation: "pulse 1.4s ease-in-out infinite",
          }}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sort header helper
// ---------------------------------------------------------------------------
interface SortHeaderProps {
  label: string;
  field: string;
  currentSortBy: string;
  currentSortOrder: "asc" | "desc";
  onSort: (field: string) => void;
}

function SortHeader({ label, field, currentSortBy, currentSortOrder, onSort }: SortHeaderProps) {
  const isActive = currentSortBy === field;
  return (
    <th
      onClick={() => onSort(field)}
      style={{
        padding: "10px 10px",
        fontSize: "12px",
        fontWeight: 600,
        color: isActive ? GREEN_PRIMARY : TEXT_MUTED,
        cursor: "pointer",
        userSelect: "none",
        whiteSpace: "nowrap",
        borderBottom: `2px solid ${BORDER}`,
        backgroundColor: PALE_GREEN,
      }}
    >
      {label}
      {isActive ? (currentSortOrder === "asc" ? " ↑" : " ↓") : " ↕"}
    </th>
  );
}

// ---------------------------------------------------------------------------
// StaffTicketQueue Props
// ---------------------------------------------------------------------------
export interface StaffTicketQueueProps {
  onSelectTicket?: (ticketId: number | string) => void;
  onCreateTicket?: () => void;
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export function StaffTicketQueue({ onSelectTicket, onCreateTicket }: StaffTicketQueueProps) {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<TicketQueueItem[]>([]);
  const [pagination, setPagination] = useState<PaginationMetadata>({
    page: 1,
    pageSize: 10,
    totalItems: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  });
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState<boolean>(false);

  // Filter state
  const [search, setSearch] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [requestedPriority, setRequestedPriority] = useState<string>("");
  const [itPriority, setItPriority] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [assignedTo, setAssignedTo] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState<number>(1);
  const pageSize = 10;

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce search input
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [search]);

  // Fetch categories once
  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => {});
  }, []);

  // Reset to page 1 when any filter changes
  useEffect(() => {
    setPage(1);
  }, [categoryId, requestedPriority, itPriority, status, assignedTo, sortBy, sortOrder]);

  // Fetch queue
  const loadQueue = useCallback(async () => {
    if (!user) return;
    if (user.role !== "IT_STAFF" && user.role !== "ADMINISTRATOR") {
      setForbidden(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetchStaffQueue({
        page,
        pageSize,
        search: debouncedSearch.trim() || undefined,
        categoryId: categoryId ? parseInt(categoryId, 10) : undefined,
        requestedPriority: requestedPriority ? (requestedPriority as PriorityLevel) : undefined,
        itPriority: itPriority ? (itPriority as PriorityLevel) : undefined,
        status: status ? (status as TicketStatus) : undefined,
        assignedTo: assignedTo ? (assignedTo as AssignedToFilter) : undefined,
        sortBy,
        sortOrder,
      });
      setTickets(res.data);
      setPagination(res.pagination);
    } catch (err: any) {
      if (err?.status === 403) {
        setForbidden(true);
      } else {
        setError(err?.message || "Failed to load the ticket queue. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }, [user, page, pageSize, debouncedSearch, categoryId, requestedPriority, itPriority, status, assignedTo, sortBy, sortOrder]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  const clearFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setCategoryId("");
    setRequestedPriority("");
    setItPriority("");
    setStatus("");
    setAssignedTo("");
    setSortBy("createdAt");
    setSortOrder("desc");
    setPage(1);
  };

  const hasActiveFilters =
    search.trim() !== "" ||
    categoryId !== "" ||
    requestedPriority !== "" ||
    itPriority !== "" ||
    status !== "" ||
    assignedTo !== "";

  // ---------------------------------------------------------------------------
  // Render: Forbidden
  // ---------------------------------------------------------------------------
  if (forbidden) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "40vh",
          padding: 40,
          textAlign: "center",
        }}
      >
        <div
          style={{
            backgroundColor: SURFACE,
            border: `1px solid ${BORDER}`,
            borderRadius: 12,
            padding: "40px 48px",
            maxWidth: 480,
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
          <h2 style={{ color: TEXT_PRIMARY, fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
            Access Restricted
          </h2>
          <p style={{ color: TEXT_MUTED, fontSize: 14, margin: 0 }}>
            You do not have permission to view this resource. Only IT Staff and Administrators can access the Ticket Queue.
          </p>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: Filter Bar
  // ---------------------------------------------------------------------------
  const filterBar = (
    <div
      style={{
        backgroundColor: SURFACE,
        border: `1px solid ${BORDER}`,
        borderRadius: 10,
        padding: "14px 16px",
        marginBottom: 16,
        display: "flex",
        flexWrap: "wrap",
        gap: 10,
        alignItems: "center",
      }}
    >
      {/* Search */}
      <div style={{ position: "relative", flex: "1 1 220px", minWidth: 200 }}>
        <span
          style={{
            position: "absolute",
            left: 10,
            top: "50%",
            transform: "translateY(-50%)",
            color: TEXT_MUTED,
            fontSize: 14,
            pointerEvents: "none",
          }}
          aria-hidden="true"
        >
          🔍
        </span>
        <input
          id="staff-queue-search"
          type="text"
          aria-label="Search by ticket number or summary"
          placeholder="Search by ticket number or summary…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: "100%",
            padding: "8px 10px 8px 32px",
            border: `1px solid ${BORDER}`,
            borderRadius: 7,
            fontSize: 13,
            color: TEXT_PRIMARY,
            outline: "none",
            boxSizing: "border-box",
          }}
        />
      </div>

      {/* Category */}
      <select
        id="staff-queue-filter-category"
        aria-label="Filter by Category"
        value={categoryId}
        onChange={(e) => setCategoryId(e.target.value)}
        style={selectStyle}
      >
        <option value="">All Categories</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      {/* Requested Priority */}
      <select
        id="staff-queue-filter-req-priority"
        aria-label="Filter by Requested Priority"
        value={requestedPriority}
        onChange={(e) => setRequestedPriority(e.target.value)}
        style={selectStyle}
      >
        <option value="">Req. Priority</option>
        <option value="LOW">Low</option>
        <option value="MEDIUM">Medium</option>
        <option value="HIGH">High</option>
        <option value="URGENT">Urgent</option>
      </select>

      {/* IT Priority */}
      <select
        id="staff-queue-filter-it-priority"
        aria-label="Filter by IT Priority"
        value={itPriority}
        onChange={(e) => setItPriority(e.target.value)}
        style={selectStyle}
      >
        <option value="">IT Priority</option>
        <option value="LOW">Low</option>
        <option value="MEDIUM">Medium</option>
        <option value="HIGH">High</option>
        <option value="URGENT">Urgent</option>
      </select>

      {/* Status */}
      <select
        id="staff-queue-filter-status"
        aria-label="Filter by Status"
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        style={selectStyle}
      >
        <option value="">All Statuses</option>
        <option value="NEW">New</option>
        <option value="OPEN">Open</option>
        <option value="IN_PROGRESS">In Progress</option>
        <option value="WAITING_FOR_REQUESTER">Waiting for Requester</option>
        <option value="RESOLVED">Resolved</option>
        <option value="CLOSED">Closed</option>
        <option value="REOPENED">Reopened</option>
        <option value="CANCELLED">Cancelled</option>
      </select>

      {/* Assignment */}
      <select
        id="staff-queue-filter-assigned"
        aria-label="Filter by Assignment"
        value={assignedTo}
        onChange={(e) => setAssignedTo(e.target.value)}
        style={selectStyle}
      >
        <option value="">All Ownership</option>
        <option value="UNASSIGNED">Unassigned</option>
        <option value="ME">Assigned to Me</option>
      </select>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <button
          id="staff-queue-clear-filters"
          type="button"
          onClick={clearFilters}
          aria-label="Clear all filters"
          style={{
            padding: "7px 14px",
            border: `1px solid ${BORDER}`,
            borderRadius: 7,
            backgroundColor: "transparent",
            color: TEXT_MUTED,
            fontSize: 12,
            cursor: "pointer",
            whiteSpace: "nowrap",
            fontWeight: 500,
          }}
        >
          ✕ Clear Filters
        </button>
      )}
    </div>
  );

  // ---------------------------------------------------------------------------
  // Render: Error state
  // ---------------------------------------------------------------------------
  if (error && !loading) {
    return (
      <div>
        <div style={headerRowStyle}>
          <h1 style={pageTitleStyle}>Ticket Queue</h1>
          {onCreateTicket && (
            <button type="button" onClick={onCreateTicket} style={createBtnStyle} id="staff-queue-create-ticket">
              + Create Ticket
            </button>
          )}
        </div>
        {filterBar}
        <div
          role="alert"
          style={{
            backgroundColor: ERROR_BG,
            border: `1px solid #F5C6C6`,
            borderRadius: 8,
            padding: "16px 20px",
            color: ERROR_TEXT,
            fontSize: 14,
          }}
        >
          <strong>⚠ Failed to load tickets</strong>
          <p style={{ margin: "6px 0 0", fontSize: 13 }}>{error}</p>
          <button
            type="button"
            onClick={loadQueue}
            style={{
              marginTop: 10,
              padding: "6px 14px",
              backgroundColor: ERROR_TEXT,
              color: "#fff",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              fontSize: 12,
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: Desktop Table
  // ---------------------------------------------------------------------------
  const noResults = !loading && tickets.length === 0;
  const noResultsMessage = hasActiveFilters
    ? "No tickets match your search or filter criteria. Try clearing filters."
    : "No tickets found in the queue.";

  const tableView = (
    <div style={{ overflowX: "auto" }}>
      <table
        id="staff-queue-table"
        role="table"
        style={{
          width: "100%",
          borderCollapse: "collapse",
          backgroundColor: SURFACE,
          borderRadius: 10,
          overflow: "hidden",
          border: `1px solid ${BORDER}`,
          fontSize: 13,
        }}
      >
        <thead>
          <tr>
            <SortHeader label="Ticket No" field="ticketNumber" currentSortBy={sortBy} currentSortOrder={sortOrder} onSort={handleSort} />
            <SortHeader label="Created" field="createdAt" currentSortBy={sortBy} currentSortOrder={sortOrder} onSort={handleSort} />
            <th style={thStyle}>Summary</th>
            <th style={thStyle}>Category</th>
            <SortHeader label="Req. Priority" field="requestedPriority" currentSortBy={sortBy} currentSortOrder={sortOrder} onSort={handleSort} />
            <SortHeader label="IT Priority" field="itPriority" currentSortBy={sortBy} currentSortOrder={sortOrder} onSort={handleSort} />
            <SortHeader label="Status" field="status" currentSortBy={sortBy} currentSortOrder={sortOrder} onSort={handleSort} />
            <th style={thStyle}>Owner</th>
            <SortHeader label="Last Updated" field="updatedAt" currentSortBy={sortBy} currentSortOrder={sortOrder} onSort={handleSort} />
          </tr>
        </thead>
        <tbody>
          {loading
            ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
            : noResults
            ? (
              <tr>
                <td
                  colSpan={9}
                  style={{
                    textAlign: "center",
                    padding: "48px 20px",
                    color: TEXT_MUTED,
                    fontSize: 14,
                  }}
                >
                  <div style={{ fontSize: 32, marginBottom: 12 }}>📭</div>
                  {noResultsMessage}
                  {hasActiveFilters && (
                    <div style={{ marginTop: 12 }}>
                      <button
                        type="button"
                        onClick={clearFilters}
                        style={{
                          padding: "7px 16px",
                          backgroundColor: GREEN_PRIMARY,
                          color: "#fff",
                          border: "none",
                          borderRadius: 7,
                          cursor: "pointer",
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        Clear Filters
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            )
            : tickets.map((ticket) => (
              <tr
                key={ticket.id}
                id={`queue-row-${ticket.id}`}
                onClick={() => onSelectTicket?.(ticket.id)}
                style={{
                  borderBottom: `1px solid ${BORDER}`,
                  cursor: onSelectTicket ? "pointer" : "default",
                  transition: "background-color 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLTableRowElement).style.backgroundColor = PALE_GREEN;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLTableRowElement).style.backgroundColor = "transparent";
                }}
              >
                <td style={tdStyle}>
                  <span
                    style={{
                      fontFamily: "monospace",
                      fontSize: 12,
                      fontWeight: 600,
                      color: GREEN_PRIMARY,
                    }}
                  >
                    {ticket.ticketNumber}
                  </span>
                </td>
                <td style={{ ...tdStyle, whiteSpace: "nowrap", color: TEXT_MUTED }}>
                  {formatDateShort(ticket.createdAt)}
                </td>
                <td
                  style={{
                    ...tdStyle,
                    maxWidth: 260,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                  title={ticket.summary}
                >
                  {ticket.summary}
                </td>
                <td style={{ ...tdStyle, whiteSpace: "nowrap", color: TEXT_MUTED }}>
                  {ticket.category?.name ?? "—"}
                </td>
                <td style={{ ...tdStyle, textAlign: "center" }}>
                  {priorityBadge(ticket.requestedPriority, "req")}
                </td>
                <td style={{ ...tdStyle, textAlign: "center" }}>
                  {priorityBadge(ticket.itPriority, "it")}
                </td>
                <td style={{ ...tdStyle, textAlign: "center" }}>
                  {statusBadge(ticket.status)}
                </td>
                <td style={{ ...tdStyle, color: TEXT_MUTED, fontSize: 12, whiteSpace: "nowrap" }}>
                  {ticket.owner ? (
                    <span title={ticket.owner.role}>
                      {ticket.owner.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                      {" "}
                      <span style={{ fontWeight: 500, color: TEXT_PRIMARY }}>
                        {ticket.owner.name.split(" ")[0]}
                      </span>
                    </span>
                  ) : (
                    <span style={{ color: "#A0B0A8", fontStyle: "italic" }}>Unassigned</span>
                  )}
                </td>
                <td style={{ ...tdStyle, color: TEXT_MUTED, whiteSpace: "nowrap", fontSize: 12 }}>
                  {formatDateShort(ticket.updatedAt)}
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );

  // ---------------------------------------------------------------------------
  // Render: Mobile Card View
  // ---------------------------------------------------------------------------
  const cardView = (
    <div id="staff-queue-cards" aria-label="Ticket queue cards">
      {loading
        ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        : noResults
        ? (
          <div
            style={{
              textAlign: "center",
              padding: "48px 20px",
              color: TEXT_MUTED,
              fontSize: 14,
              backgroundColor: SURFACE,
              borderRadius: 10,
              border: `1px solid ${BORDER}`,
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 12 }}>📭</div>
            {noResultsMessage}
            {hasActiveFilters && (
              <div style={{ marginTop: 12 }}>
                <button
                  type="button"
                  onClick={clearFilters}
                  style={{
                    padding: "7px 16px",
                    backgroundColor: GREEN_PRIMARY,
                    color: "#fff",
                    border: "none",
                    borderRadius: 7,
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>
        )
        : tickets.map((ticket) => (
          <div
            key={ticket.id}
            id={`queue-card-${ticket.id}`}
            onClick={() => onSelectTicket?.(ticket.id)}
            style={{
              backgroundColor: SURFACE,
              border: `1px solid ${BORDER}`,
              borderRadius: 10,
              padding: "14px 16px",
              marginBottom: 10,
              cursor: onSelectTicket ? "pointer" : "default",
              transition: "border-color 0.15s, box-shadow 0.15s",
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLDivElement;
              el.style.borderColor = GREEN_PRIMARY;
              el.style.boxShadow = `0 2px 8px rgba(0,107,60,0.12)`;
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLDivElement;
              el.style.borderColor = BORDER;
              el.style.boxShadow = "none";
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
              <span
                style={{
                  fontFamily: "monospace",
                  fontSize: 11,
                  fontWeight: 700,
                  color: GREEN_PRIMARY,
                }}
              >
                {ticket.ticketNumber}
              </span>
              {statusBadge(ticket.status)}
            </div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: TEXT_PRIMARY,
                marginBottom: 8,
                lineHeight: 1.35,
              }}
            >
              {ticket.summary}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
              {priorityBadge(ticket.requestedPriority, "req")}
              {ticket.itPriority && priorityBadge(ticket.itPriority, "it")}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: TEXT_MUTED }}>
              <span>
                {ticket.owner ? (
                  <span>👤 {ticket.owner.name}</span>
                ) : (
                  <span style={{ fontStyle: "italic" }}>Unassigned</span>
                )}
              </span>
              <span>{formatDateShort(ticket.createdAt)}</span>
            </div>
            {onSelectTicket && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectTicket(ticket.id);
                }}
                aria-label={`View detail for ticket ${ticket.ticketNumber}`}
                style={{
                  marginTop: 10,
                  width: "100%",
                  padding: "8px",
                  backgroundColor: PALE_GREEN,
                  color: GREEN_PRIMARY,
                  border: `1px solid ${GREEN_PRIMARY}33`,
                  borderRadius: 7,
                  fontWeight: 600,
                  fontSize: 12,
                  cursor: "pointer",
                  minHeight: 44,
                }}
              >
                View Detail →
              </button>
            )}
          </div>
        ))}
    </div>
  );

  // ---------------------------------------------------------------------------
  // Render: Pagination
  // ---------------------------------------------------------------------------
  const renderPagination = () => {
    if (pagination.totalPages <= 1 && !loading) return null;
    const pages: (number | "...")[] = [];
    const total = pagination.totalPages;
    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push("...");
      for (let i = Math.max(2, page - 1); i <= Math.min(total - 1, page + 1); i++) {
        pages.push(i);
      }
      if (page < total - 2) pages.push("...");
      pages.push(total);
    }

    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 6,
          paddingTop: 16,
          flexWrap: "wrap",
        }}
        aria-label="Ticket queue pagination"
      >
        <button
          type="button"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={!pagination.hasPrevPage || loading}
          aria-label="Previous page"
          style={pageNavBtnStyle(!pagination.hasPrevPage || loading)}
        >
          ← Previous
        </button>

        {pages.map((p, i) =>
          p === "..." ? (
            <span key={`ellipsis-${i}`} style={{ padding: "6px 4px", color: TEXT_MUTED, fontSize: 13 }}>
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => setPage(p as number)}
              disabled={loading}
              aria-current={page === p ? "page" : undefined}
              aria-label={`Page ${p}`}
              style={{
                padding: "6px 12px",
                border: `1px solid ${page === p ? GREEN_PRIMARY : BORDER}`,
                borderRadius: 6,
                backgroundColor: page === p ? GREEN_PRIMARY : SURFACE,
                color: page === p ? "#fff" : TEXT_MUTED,
                fontWeight: page === p ? 700 : 400,
                cursor: loading ? "default" : "pointer",
                fontSize: 13,
                minWidth: 36,
                minHeight: 36,
              }}
            >
              {p}
            </button>
          )
        )}

        <button
          type="button"
          onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
          disabled={!pagination.hasNextPage || loading}
          aria-label="Next page"
          style={pageNavBtnStyle(!pagination.hasNextPage || loading)}
        >
          Next →
        </button>
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // Full Render
  // ---------------------------------------------------------------------------
  return (
    <div id="staff-ticket-queue" style={{ backgroundColor: BG_PAGE }}>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @media (min-width: 768px) {
          #staff-queue-cards { display: none !important; }
          #staff-queue-table-wrapper { display: block !important; }
        }
        @media (max-width: 767px) {
          #staff-queue-cards { display: block !important; }
          #staff-queue-table-wrapper { display: none !important; }
        }
      `}</style>

      {/* Page header */}
      <div style={headerRowStyle}>
        <div>
          <h1 style={pageTitleStyle}>Ticket Queue</h1>
          {!loading && (
            <p style={{ color: TEXT_MUTED, fontSize: 13, margin: "2px 0 0" }}>
              {pagination.totalItems > 0
                ? `Showing ${(pagination.page - 1) * pagination.pageSize + 1}–${Math.min(
                    pagination.page * pagination.pageSize,
                    pagination.totalItems
                  )} of ${pagination.totalItems} ticket${pagination.totalItems !== 1 ? "s" : ""}`
                : "No tickets found"}
            </p>
          )}
        </div>
        {onCreateTicket && (
          <button
            type="button"
            id="staff-queue-create-ticket"
            onClick={onCreateTicket}
            style={createBtnStyle}
          >
            + Create Ticket
          </button>
        )}
      </div>

      {/* Filter bar */}
      {filterBar}

      {/* Desktop table */}
      <div id="staff-queue-table-wrapper" style={{ display: "none" }}>
        {tableView}
      </div>

      {/* Mobile cards */}
      <div id="staff-queue-cards" style={{ display: "block" }}>
        {cardView}
      </div>

      {/* Pagination */}
      {renderPagination()}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared inline style helpers
// ---------------------------------------------------------------------------
const selectStyle: React.CSSProperties = {
  padding: "7px 10px",
  border: `1px solid ${BORDER}`,
  borderRadius: 7,
  fontSize: 13,
  color: TEXT_PRIMARY,
  backgroundColor: SURFACE,
  minWidth: 130,
  cursor: "pointer",
};

const thStyle: React.CSSProperties = {
  padding: "10px 10px",
  fontSize: 12,
  fontWeight: 600,
  color: TEXT_MUTED,
  borderBottom: `2px solid ${BORDER}`,
  backgroundColor: PALE_GREEN,
  textAlign: "left",
  whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = {
  padding: "10px 10px",
  color: TEXT_PRIMARY,
  verticalAlign: "middle",
};

const headerRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  marginBottom: 16,
  flexWrap: "wrap",
  gap: 8,
};

const pageTitleStyle: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 700,
  color: TEXT_PRIMARY,
  margin: 0,
};

const createBtnStyle: React.CSSProperties = {
  padding: "9px 18px",
  backgroundColor: GREEN_PRIMARY,
  color: "#fff",
  border: "none",
  borderRadius: 8,
  fontWeight: 600,
  fontSize: 13,
  cursor: "pointer",
  whiteSpace: "nowrap",
  minHeight: 44,
};

const pageNavBtnStyle = (disabled: boolean): React.CSSProperties => ({
  padding: "6px 14px",
  border: `1px solid ${BORDER}`,
  borderRadius: 6,
  backgroundColor: disabled ? "#F5F7F6" : SURFACE,
  color: disabled ? "#A0B0A8" : TEXT_MUTED,
  cursor: disabled ? "not-allowed" : "pointer",
  fontSize: 13,
  fontWeight: 500,
  minHeight: 36,
});
