import React, { useState, useEffect, useCallback } from "react";
import {
  fetchTickets,
  fetchCategories,
  Category,
  TicketListItem,
  PaginationMetadata,
  PriorityLevel,
  TicketStatus,
} from "../api.js";
import { useRequester } from "../context/RequesterContext.js";

interface MyTicketsProps {
  onCreateTicket?: () => void;
  onSelectTicket?: (idOrNumber: number | string) => void;
}

export function MyTickets({ onCreateTicket, onSelectTicket }: MyTicketsProps) {
  const { currentRequester } = useRequester();

  const [tickets, setTickets] = useState<TicketListItem[]>([]);
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

  // Filter & Sort State
  const [search, setSearch] = useState<string>("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [requestedPriority, setRequestedPriority] = useState<string>("");
  const [itPriority, setItPriority] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Check if any filter is active
  const hasActiveFilters =
    search.trim() !== "" ||
    categoryId !== "" ||
    requestedPriority !== "" ||
    itPriority !== "" ||
    status !== "" ||
    sortBy !== "createdAt" ||
    sortOrder !== "desc";

  // Fetch Categories on mount
  useEffect(() => {
    fetchCategories()
      .then(setCategories)
      .catch(() => {
        // Categories fetch error handles silently in filter dropdown
      });
  }, []);

  // Fetch Tickets when filters / pagination / requester change
  const loadTickets = useCallback(async () => {
    if (!currentRequester) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetchTickets(
        {
          requesterId: currentRequester.id,
          page,
          pageSize,
          search: search.trim() || undefined,
          categoryId: categoryId ? parseInt(categoryId, 10) : undefined,
          requestedPriority: requestedPriority ? (requestedPriority as PriorityLevel) : undefined,
          itPriority: itPriority ? (itPriority as PriorityLevel) : undefined,
          status: status ? (status as TicketStatus) : undefined,
          sortBy,
          sortOrder,
        },
        currentRequester.id
      );

      setTickets(res.data);
      setPagination(res.pagination);
    } catch (err: any) {
      setError(err?.message || "Failed to load tickets. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [
    currentRequester,
    page,
    pageSize,
    search,
    categoryId,
    requestedPriority,
    itPriority,
    status,
    sortBy,
    sortOrder,
  ]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const handleClearFilters = () => {
    setSearch("");
    setCategoryId("");
    setRequestedPriority("");
    setItPriority("");
    setStatus("");
    setSortBy("createdAt");
    setSortOrder("desc");
    setPage(1);
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    const [field, order] = val.split(":");
    setSortBy(field);
    setSortOrder((order as "asc" | "desc") || "desc");
    setPage(1);
  };

  // Helper Badge Renderers
  const renderPriorityBadge = (priority: PriorityLevel | null) => {
    if (!priority) return <span className="text-muted small">—</span>;

    const styles: Record<PriorityLevel, React.CSSProperties> = {
      LOW: { backgroundColor: "#E8F5E9", color: "#2E7D32", border: "1px solid #C8E6C9" },
      MEDIUM: { backgroundColor: "#FFF8E1", color: "#B78103", border: "1px solid #FFE082" },
      HIGH: { backgroundColor: "#FBE9E7", color: "#D84315", border: "1px solid #FFCCBC" },
      URGENT: { backgroundColor: "#FFEBEE", color: "#C62828", border: "1px solid #FFCDD2" },
    };

    return (
      <span
        className="badge font-monospace fw-semibold px-2 py-1"
        style={{ fontSize: "11px", ...styles[priority] }}
      >
        {priority}
      </span>
    );
  };

  const renderStatusBadge = (statusVal: TicketStatus) => {
    const styles: Record<TicketStatus, React.CSSProperties> = {
      NEW: { backgroundColor: "#EAF6EF", color: "#006B3C", border: "1px solid #A3D9B8" },
      OPEN: { backgroundColor: "#E3F2FD", color: "#1565C0", border: "1px solid #BBDEFB" },
      IN_PROGRESS: { backgroundColor: "#E8F5E9", color: "#2E7D32", border: "1px solid #C8E6C9" },
      RESOLVED: { backgroundColor: "#ECEFF1", color: "#455A64", border: "1px solid #CFD8DC" },
      CLOSED: { backgroundColor: "#F5F5F5", color: "#616161", border: "1px solid #E0E0E0" },
      CANCELLED: { backgroundColor: "#FFEBEE", color: "#C62828", border: "1px solid #FFCDD2" },
    };

    const labels: Record<TicketStatus, string> = {
      NEW: "NEW",
      OPEN: "OPEN",
      IN_PROGRESS: "IN PROGRESS",
      RESOLVED: "RESOLVED",
      CLOSED: "CLOSED",
      CANCELLED: "CANCELLED",
    };

    return (
      <span
        className="badge font-monospace fw-semibold px-2 py-1"
        style={{ fontSize: "11px", ...styles[statusVal] }}
      >
        {labels[statusVal] || statusVal}
      </span>
    );
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

  // Compute pagination text
  const startItem = pagination.totalItems === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1;
  const endItem = Math.min(pagination.page * pagination.pageSize, pagination.totalItems);

  return (
    <div className="container p-0">
      {/* Header Bar */}
      <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between mb-3 gap-2">
        <div>
          <h1 className="h4 fw-bold mb-1" style={{ color: "#1E2B24" }}>
            My Tickets
          </h1>
          <p className="text-muted small mb-0">View and track all of your support requests.</p>
        </div>
        <div className="d-flex align-items-center gap-2">
          {hasActiveFilters && (
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={handleClearFilters}
              style={{ fontSize: "13px" }}
            >
              Clear Filters
            </button>
          )}
          {onCreateTicket && (
            <button
              type="button"
              className="btn btn-sm text-white fw-semibold"
              onClick={onCreateTicket}
              style={{ backgroundColor: "#006B3C", fontSize: "13px" }}
            >
              + Create Ticket
            </button>
          )}
        </div>
      </div>

      {/* Filter & Toolbar Bar */}
      <div
        className="card shadow-sm border mb-4"
        style={{ backgroundColor: "#FFFFFF", borderColor: "#D1D9D4", borderRadius: "8px" }}
      >
        <div className="card-body p-3">
          <div className="row g-2">
            {/* Search Input */}
            <div className="col-12 col-md-4">
              <label htmlFor="ticket-search" className="visually-hidden">
                Search tickets
              </label>
              <input
                id="ticket-search"
                type="text"
                className="form-control form-control-sm"
                placeholder="Search by ticket number or summary…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                style={{ borderColor: "#D1D9D4" }}
              />
            </div>

            {/* Category Filter */}
            <div className="col-6 col-md-2">
              <label htmlFor="filter-category" className="visually-hidden">
                Category
              </label>
              <select
                id="filter-category"
                className="form-select form-select-sm"
                value={categoryId}
                onChange={(e) => {
                  setCategoryId(e.target.value);
                  setPage(1);
                }}
                style={{ borderColor: "#D1D9D4" }}
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Requested Priority Filter */}
            <div className="col-6 col-md-2">
              <label htmlFor="filter-req-priority" className="visually-hidden">
                Requested Priority
              </label>
              <select
                id="filter-req-priority"
                className="form-select form-select-sm"
                value={requestedPriority}
                onChange={(e) => {
                  setRequestedPriority(e.target.value);
                  setPage(1);
                }}
                style={{ borderColor: "#D1D9D4" }}
              >
                <option value="">All Req. Priorities</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="col-6 col-md-2">
              <label htmlFor="filter-status" className="visually-hidden">
                Status
              </label>
              <select
                id="filter-status"
                className="form-select form-select-sm"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
                style={{ borderColor: "#D1D9D4" }}
              >
                <option value="">All Statuses</option>
                <option value="NEW">New</option>
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            {/* Sort Selector */}
            <div className="col-6 col-md-2">
              <label htmlFor="filter-sort" className="visually-hidden">
                Sort
              </label>
              <select
                id="filter-sort"
                className="form-select form-select-sm"
                value={`${sortBy}:${sortOrder}`}
                onChange={handleSortChange}
                style={{ borderColor: "#D1D9D4" }}
              >
                <option value="createdAt:desc">Date (Newest)</option>
                <option value="createdAt:asc">Date (Oldest)</option>
                <option value="ticketNumber:asc">Ticket No (A-Z)</option>
                <option value="ticketNumber:desc">Ticket No (Z-A)</option>
                <option value="summary:asc">Summary (A-Z)</option>
                <option value="requestedPriority:desc">Priority (High-Low)</option>
                <option value="status:asc">Status (A-Z)</option>
                <option value="updatedAt:desc">Last Updated</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="alert alert-danger d-flex align-items-center justify-content-between p-3 mb-4" role="alert">
          <div>
            <strong>Error loading tickets:</strong> {error}
          </div>
          <button type="button" className="btn btn-sm btn-outline-danger" onClick={loadTickets}>
            Retry
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="card shadow-sm border p-5 text-center my-3" style={{ backgroundColor: "#FFFFFF", borderColor: "#D1D9D4" }}>
          <div className="spinner-border text-success mx-auto mb-2" role="status" style={{ color: "#006B3C" }}>
            <span className="visually-hidden">Loading tickets…</span>
          </div>
          <p className="text-muted mb-0 small">Loading tickets…</p>
        </div>
      )}

      {/* Empty State (0 tickets ever created for requester) */}
      {!loading && !error && tickets.length === 0 && !hasActiveFilters && (
        <div
          className="card shadow-sm border text-center p-5 my-3"
          style={{ backgroundColor: "#FFFFFF", borderColor: "#D1D9D4", borderRadius: "8px" }}
        >
          <div className="display-4 mb-3" aria-hidden="true">🎫</div>
          <h2 className="h5 fw-bold mb-2" style={{ color: "#1E2B24" }}>
            No tickets submitted yet
          </h2>
          <p className="text-muted small mx-auto mb-4" style={{ maxWidth: "420px" }}>
            You haven't created any support tickets. If you need assistance with hardware, software, or network access, submit your first request below.
          </p>
          {onCreateTicket && (
            <div>
              <button
                type="button"
                className="btn text-white fw-semibold px-4 py-2"
                onClick={onCreateTicket}
                style={{ backgroundColor: "#006B3C" }}
              >
                + Create Your First Ticket
              </button>
            </div>
          )}
        </div>
      )}

      {/* No-Results State (Filters/search matched 0 tickets) */}
      {!loading && !error && tickets.length === 0 && hasActiveFilters && (
        <div
          className="card shadow-sm border text-center p-5 my-3"
          style={{ backgroundColor: "#FFFFFF", borderColor: "#D1D9D4", borderRadius: "8px" }}
        >
          <div className="display-5 mb-3 text-muted" aria-hidden="true">🔍</div>
          <h2 className="h5 fw-bold mb-2" style={{ color: "#1E2B24" }}>
            No matching tickets found
          </h2>
          <p className="text-muted small mx-auto mb-4" style={{ maxWidth: "420px" }}>
            No support tickets match your current search or filter criteria. Try adjusting your search term or resetting your filters.
          </p>
          <div>
            <button
              type="button"
              className="btn btn-outline-secondary px-4 py-2"
              onClick={handleClearFilters}
            >
              Clear All Filters
            </button>
          </div>
        </div>
      )}

      {/* Content Area when tickets exist */}
      {!loading && !error && tickets.length > 0 && (
        <>
          {/* Desktop & Tablet Table View */}
          <div
            className="card shadow-sm border mb-3 d-none d-md-block"
            style={{ backgroundColor: "#FFFFFF", borderColor: "#D1D9D4", borderRadius: "8px", overflow: "hidden" }}
          >
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0" style={{ fontSize: "13px" }}>
                <thead style={{ backgroundColor: "#F5F7F6" }}>
                  <tr>
                    <th scope="col" style={{ color: "#556B60", fontWeight: 600 }}>
                      Ticket No
                    </th>
                    <th scope="col" style={{ color: "#556B60", fontWeight: 600 }}>
                      Created Date
                    </th>
                    <th scope="col" style={{ color: "#556B60", fontWeight: 600 }}>
                      Summary
                    </th>
                    <th scope="col" style={{ color: "#556B60", fontWeight: 600 }}>
                      Category
                    </th>
                    <th scope="col" style={{ color: "#556B60", fontWeight: 600 }}>
                      Req. Priority
                    </th>
                    <th scope="col" style={{ color: "#556B60", fontWeight: 600 }}>
                      IT Priority
                    </th>
                    <th scope="col" style={{ color: "#556B60", fontWeight: 600 }}>
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((t) => (
                    <tr
                      key={t.id}
                      onClick={() => onSelectTicket?.(t.id)}
                      style={{ cursor: onSelectTicket ? "pointer" : "default" }}
                    >
                      <td className="fw-bold font-monospace text-nowrap" style={{ color: "#006B3C" }}>
                        {t.ticketNumber}
                        {t.attachmentCount > 0 && (
                          <span className="ms-2 badge bg-light text-dark border" title={`${t.attachmentCount} attachments`}>
                            📎 {t.attachmentCount}
                          </span>
                        )}
                      </td>
                      <td className="text-muted text-nowrap">{formatDate(t.createdAt)}</td>
                      <td className="fw-semibold text-wrap" style={{ color: "#1E2B24", maxWidth: "280px" }}>
                        {t.summary}
                      </td>
                      <td className="text-nowrap">{t.category?.name || "—"}</td>
                      <td className="text-nowrap">{renderPriorityBadge(t.requestedPriority)}</td>
                      <td className="text-nowrap">{renderPriorityBadge(t.itPriority)}</td>
                      <td className="text-nowrap">{renderStatusBadge(t.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card List View (< 768px) */}
          <div className="d-md-none mb-3">
            {tickets.map((t) => (
              <div
                key={t.id}
                className="card shadow-sm border mb-3"
                onClick={() => onSelectTicket?.(t.id)}
                style={{
                  backgroundColor: "#FFFFFF",
                  borderColor: "#D1D9D4",
                  borderRadius: "8px",
                  cursor: onSelectTicket ? "pointer" : "default",
                }}
              >
                <div className="card-body p-3">
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <span className="fw-bold font-monospace text-success" style={{ fontSize: "14px", color: "#006B3C" }}>
                      {t.ticketNumber}
                    </span>
                    {renderStatusBadge(t.status)}
                  </div>
                  <h3 className="h6 fw-semibold mb-2" style={{ color: "#1E2B24", fontSize: "14px" }}>
                    {t.summary}
                  </h3>
                  <div className="d-flex flex-wrap align-items-center gap-2 mb-2 text-muted small" style={{ fontSize: "12px" }}>
                    <span>📁 {t.category?.name}</span>
                    <span>•</span>
                    <span>🗓️ {formatDate(t.createdAt)}</span>
                    {t.attachmentCount > 0 && (
                      <>
                        <span>•</span>
                        <span>📎 {t.attachmentCount}</span>
                      </>
                    )}
                  </div>
                  <div className="d-flex align-items-center gap-2 pt-2 border-top">
                    <span className="text-muted extra-small" style={{ fontSize: "11px" }}>Priority:</span>
                    {renderPriorityBadge(t.requestedPriority)}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Footer */}
          <div className="d-flex flex-column flex-sm-row align-items-center justify-content-between gap-3 pt-2">
            <div className="d-flex flex-wrap align-items-center justify-content-center justify-content-sm-start gap-2 gap-sm-3">
              <span className="text-muted small text-center text-sm-start">
                Showing {startItem} to {endItem} of {pagination.totalItems} tickets
              </span>
              <div className="d-flex align-items-center gap-1">
                <label htmlFor="page-size-select" className="visually-hidden">
                  Items per page
                </label>
                <select
                  id="page-size-select"
                  className="form-select form-select-sm"
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(parseInt(e.target.value, 10));
                    setPage(1);
                  }}
                  style={{ width: "70px", borderColor: "#D1D9D4", fontSize: "12px" }}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
                <span className="text-muted extra-small" style={{ fontSize: "12px" }}>per page</span>
              </div>
            </div>

            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
              <nav aria-label="Ticket pagination" className="mw-100">
                <ul className="pagination pagination-sm mb-0 flex-wrap justify-content-center">
                  <li className={`page-item ${!pagination.hasPrevPage ? "disabled" : ""}`}>
                    <button
                      type="button"
                      className="page-link"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={!pagination.hasPrevPage}
                      style={{ color: pagination.hasPrevPage ? "#006B3C" : undefined }}
                    >
                      &laquo; Prev
                    </button>
                  </li>

                  {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((pageNum) => (
                    <li key={pageNum} className={`page-item ${pageNum === pagination.page ? "active" : ""}`}>
                      <button
                        type="button"
                        className="page-link"
                        onClick={() => setPage(pageNum)}
                        style={
                          pageNum === pagination.page
                            ? { backgroundColor: "#006B3C", borderColor: "#006B3C", color: "#FFFFFF" }
                            : { color: "#006B3C" }
                        }
                      >
                        {pageNum}
                      </button>
                    </li>
                  ))}

                  <li className={`page-item ${!pagination.hasNextPage ? "disabled" : ""}`}>
                    <button
                      type="button"
                      className="page-link"
                      onClick={() => setPage((p) => p + 1)}
                      disabled={!pagination.hasNextPage}
                      style={{ color: pagination.hasNextPage ? "#006B3C" : undefined }}
                    >
                      Next &raquo;
                    </button>
                  </li>
                </ul>
              </nav>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default MyTickets;
