const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export interface Category {
  id: number;
  name: string;
  description?: string;
}

export interface RelatedSystem {
  id: number;
  name: string;
  description?: string;
}

export interface SystemStatus {
  online: boolean;
  categories: Category[];
}

export async function checkSystem(): Promise<SystemStatus> {
  const healthRes = await fetch(`${API_URL}/api/health`);
  if (!healthRes.ok) {
    throw new Error("Unable to connect to TokTickIT API");
  }

  const categoriesRes = await fetch(`${API_URL}/api/categories`);
  if (!categoriesRes.ok) {
    throw new Error("Unable to connect to TokTickIT API");
  }

  const categories: Category[] = await categoriesRes.json();
  return { online: true, categories };
}

// ---------------------------------------------------------------------------
// Lab 2 — Issue 1: Fetch active Development Requesters
// ---------------------------------------------------------------------------
export interface Requester {
  id: number;
  name: string;
  email: string;
  department?: string | null;
  isActive: boolean;
}

export async function fetchRequesters(): Promise<Requester[]> {
  const res = await fetch(`${API_URL}/api/requesters`);
  if (!res.ok) {
    let errorMsg = "Failed to fetch development requesters";
    try {
      const data = await res.json();
      if (data?.error) errorMsg = data.error;
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// Lab 2 — Issue 2: Fetch Categories & Related Systems Reference Data
// ---------------------------------------------------------------------------
export async function fetchCategories(): Promise<Category[]> {
  const res = await fetch(`${API_URL}/api/categories`);
  if (!res.ok) {
    throw new Error("Failed to fetch categories");
  }
  return res.json();
}

export async function fetchRelatedSystems(): Promise<RelatedSystem[]> {
  const res = await fetch(`${API_URL}/api/related-systems`);
  if (!res.ok) {
    throw new Error("Failed to fetch related systems");
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// Lab 2 — Issue 3: Ticket Creation API
// ---------------------------------------------------------------------------
export type PriorityLevel = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type TicketStatus = "NEW" | "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED" | "CANCELLED";

export interface CreateTicketPayload {
  requesterId: number;
  categoryId: number;
  relatedSystemId: number;
  summary: string;
  description: string;
  requestedPriority: PriorityLevel;
}

export interface Attachment {
  id: number;
  ticketId: number;
  originalFileName: string;
  fileMimeType: string;
  fileSizeBytes: number;
  isRemoved: boolean;
  removedReason?: string | null;
  removedAt?: string | null;
  createdAt: string;
}

export interface Ticket {
  id: number;
  ticketNumber: string;
  requesterId: number;
  requester: { id: number; name: string; email: string };
  categoryId: number;
  category: { id: number; name: string };
  relatedSystemId: number;
  relatedSystem: { id: number; name: string };
  summary: string;
  description: string;
  requestedPriority: PriorityLevel;
  itPriority: PriorityLevel | null;
  status: TicketStatus;
  ticketOwnerName: string | null;
  resolutionSummary: string | null;
  attachments: Attachment[];
  createdAt: string;
  updatedAt: string;
}

export interface ApiValidationError {
  error: string;
  code: string;
  details?: { field: string; message: string }[];
}

export async function createTicket(
  payload: CreateTicketPayload,
  requesterId?: number
): Promise<Ticket> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (requesterId !== undefined) {
    headers["X-Requester-Id"] = String(requesterId);
  }

  const res = await fetch(`${API_URL}/api/tickets`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    let errorData: ApiValidationError = { error: "Failed to create ticket", code: "UNKNOWN_ERROR" };
    try {
      errorData = await res.json();
    } catch {
      // ignore parse error
    }
    const err = new Error(errorData.error) as Error & { status: number; data: ApiValidationError };
    err.status = res.status;
    err.data = errorData;
    throw err;
  }

  return res.json();
}

// ---------------------------------------------------------------------------
// Lab 2 — Issue 5: Fetch My Tickets API
// ---------------------------------------------------------------------------
export interface TicketListItem {
  id: number;
  ticketNumber: string;
  requesterId: number;
  category: { id: number; name: string };
  relatedSystem: { id: number; name: string };
  summary: string;
  requestedPriority: PriorityLevel;
  itPriority: PriorityLevel | null;
  status: TicketStatus;
  ticketOwnerName: string | null;
  createdAt: string;
  updatedAt: string;
  attachmentCount: number;
}

export interface PaginationMetadata {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginatedTicketsResponse {
  data: TicketListItem[];
  pagination: PaginationMetadata;
}

export interface FetchTicketsParams {
  requesterId?: number;
  page?: number;
  pageSize?: number;
  search?: string;
  categoryId?: number;
  requestedPriority?: PriorityLevel;
  itPriority?: PriorityLevel;
  status?: TicketStatus;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export async function fetchTickets(
  params: FetchTicketsParams = {},
  requesterId?: number
): Promise<PaginatedTicketsResponse> {
  const query = new URLSearchParams();
  
  const activeRequesterId = requesterId ?? params.requesterId;
  if (activeRequesterId !== undefined) {
    query.set("requesterId", String(activeRequesterId));
  }
  if (params.page !== undefined) query.set("page", String(params.page));
  if (params.pageSize !== undefined) query.set("pageSize", String(params.pageSize));
  if (params.search !== undefined && params.search.trim() !== "") {
    query.set("search", params.search.trim());
  }
  if (params.categoryId !== undefined) query.set("categoryId", String(params.categoryId));
  if (params.requestedPriority !== undefined) query.set("requestedPriority", params.requestedPriority);
  if (params.itPriority !== undefined) query.set("itPriority", params.itPriority);
  if (params.status !== undefined) query.set("status", params.status);
  if (params.sortBy !== undefined) query.set("sortBy", params.sortBy);
  if (params.sortOrder !== undefined) query.set("sortOrder", params.sortOrder);

  const headers: Record<string, string> = {};
  if (activeRequesterId !== undefined) {
    headers["X-Requester-Id"] = String(activeRequesterId);
  }

  const url = `${API_URL}/api/tickets?${query.toString()}`;
  const res = await fetch(url, { headers });

  if (!res.ok) {
    let errorMsg = "Failed to fetch tickets";
    try {
      const data = await res.json();
      if (data?.error) errorMsg = data.error;
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  return res.json();
}

// ---------------------------------------------------------------------------
// Lab 2 — Issue 6: Ticket Detail API
// ---------------------------------------------------------------------------
export type TicketDetail = Ticket;

export async function fetchTicketDetail(
  idOrNumber: string | number,
  requesterId?: number
): Promise<TicketDetail> {
  const headers: Record<string, string> = {};
  if (requesterId !== undefined) {
    headers["X-Requester-Id"] = String(requesterId);
  }

  const query = requesterId !== undefined ? `?requesterId=${requesterId}` : "";
  const url = `${API_URL}/api/tickets/${idOrNumber}${query}`;
  const res = await fetch(url, { headers });

  if (!res.ok) {
    let errorMsg = "Ticket not found or access denied";
    try {
      const data = await res.json();
      if (data?.error) errorMsg = data.error;
    } catch {
      // ignore
    }
    const err = new Error(errorMsg) as Error & { status: number };
    err.status = res.status;
    throw err;
  }

  return res.json();
}

// ---------------------------------------------------------------------------
// Lab 2 — Issue 7: Attachment Lifecycle API
// ---------------------------------------------------------------------------

export async function uploadAttachment(
  ticketIdOrNumber: string | number,
  file: File,
  requesterId?: number
): Promise<Attachment> {
  const formData = new FormData();
  formData.append("file", file);

  const headers: Record<string, string> = {};
  if (requesterId !== undefined) {
    headers["X-Requester-Id"] = String(requesterId);
  }

  const res = await fetch(`${API_URL}/api/tickets/${ticketIdOrNumber}/attachments`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!res.ok) {
    let errorData: any = { error: "Failed to upload attachment", code: "UPLOAD_FAILED" };
    try {
      errorData = await res.json();
    } catch {
      // ignore
    }
    const err = new Error(errorData.error) as Error & { status: number; data: any };
    err.status = res.status;
    err.data = errorData;
    throw err;
  }

  return res.json();
}

export async function fetchAttachmentMetadata(
  attachmentId: number,
  requesterId?: number
): Promise<Attachment> {
  const headers: Record<string, string> = {};
  if (requesterId !== undefined) {
    headers["X-Requester-Id"] = String(requesterId);
  }

  const res = await fetch(`${API_URL}/api/attachments/${attachmentId}/metadata`, {
    headers,
  });

  if (!res.ok) {
    let errorMsg = "Failed to fetch attachment metadata";
    try {
      const data = await res.json();
      if (data?.error) errorMsg = data.error;
    } catch {
      // ignore
    }
    const err = new Error(errorMsg) as Error & { status: number };
    err.status = res.status;
    throw err;
  }

  return res.json();
}

export function getAttachmentDownloadUrl(attachmentId: number, requesterId?: number): string {
  const query = requesterId !== undefined ? `?requesterId=${requesterId}` : "";
  return `${API_URL}/api/attachments/${attachmentId}/download${query}`;
}

export async function softRemoveAttachment(
  attachmentId: number,
  reason?: string,
  requesterId?: number
): Promise<{ id: number; isRemoved: boolean; removedReason?: string; removedAt?: string; message: string }> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (requesterId !== undefined) {
    headers["X-Requester-Id"] = String(requesterId);
  }

  const res = await fetch(`${API_URL}/api/attachments/${attachmentId}`, {
    method: "DELETE",
    headers,
    body: JSON.stringify({ reason }),
  });

  if (!res.ok) {
    let errorMsg = "Failed to remove attachment";
    try {
      const data = await res.json();
      if (data?.error) errorMsg = data.error;
    } catch {
      // ignore
    }
    const err = new Error(errorMsg) as Error & { status: number };
    err.status = res.status;
    throw err;
  }

  return res.json();
}



