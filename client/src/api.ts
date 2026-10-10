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

export interface Requester {
  id: number;
  name: string;
  email: string;
  department?: string | null;
  isActive: boolean;
}

export type UserRole = "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR";

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  department?: string | null;
  role: UserRole;
  mustChangePassword: boolean;
  isActive: boolean;
}

export async function loginApi(email: string, password: string): Promise<AuthUser> {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();
  if (!res.ok) {
    const errorObj: any = new Error(data?.error || "Invalid email or password");
    errorObj.code = data?.code;
    throw errorObj;
  }

  return data.data.user;
}

export async function logoutApi(): Promise<void> {
  await fetch(`${API_URL}/api/auth/logout`, {
    method: "POST",
    credentials: "include",
  });
}

export async function fetchCurrentUser(): Promise<AuthUser | null> {
  const res = await fetch(`${API_URL}/api/auth/me`, {
    credentials: "include",
  });

  if (!res.ok) {
    return null;
  }

  const data = await res.json();
  return data.data;
}

export async function changePasswordApi(
  currentPassword: string,
  newPassword: string,
  confirmPassword: string
): Promise<void> {
  const res = await fetch(`${API_URL}/api/auth/change-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
  });

  const data = await res.json();
  if (!res.ok) {
    const errorObj: any = new Error(data?.error || "Failed to change password");
    errorObj.code = data?.code;
    errorObj.details = data?.details;
    throw errorObj;
  }
}

export async function fetchRequesters(): Promise<Requester[]> {
  const res = await fetch(`${API_URL}/api/requesters`, { credentials: "include" });
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
export type TicketStatus =
  | "NEW"
  | "OPEN"
  | "IN_PROGRESS"
  | "WAITING_FOR_REQUESTER"
  | "RESOLVED"
  | "CLOSED"
  | "REOPENED"
  | "CANCELLED";

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

// ---------------------------------------------------------------------------
// Lab 3 — Issue #5: IT Staff Ticket Queue types
// ---------------------------------------------------------------------------
export interface TicketQueueItem {
  id: number;
  ticketNumber: string;
  requesterId: number;
  requester: { id: number; name: string; email: string } | null;
  category: { id: number; name: string };
  relatedSystem: { id: number; name: string };
  summary: string;
  requestedPriority: PriorityLevel;
  itPriority: PriorityLevel | null;
  status: TicketStatus;
  owner: { id: number; name: string; role: string } | null;
  ticketOwnerName: string | null;
  createdAt: string;
  updatedAt: string;
  attachmentCount: number;
}

export type AssignedToFilter = "UNASSIGNED" | "ME" | number | "";

export interface FetchQueueParams {
  page?: number;
  pageSize?: number;
  search?: string;
  categoryId?: number;
  requestedPriority?: PriorityLevel;
  itPriority?: PriorityLevel;
  status?: TicketStatus;
  assignedTo?: AssignedToFilter;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export async function fetchStaffQueue(
  params: FetchQueueParams = {}
): Promise<{ data: TicketQueueItem[]; pagination: PaginationMetadata }> {
  const query = new URLSearchParams();
  if (params.page !== undefined) query.set("page", String(params.page));
  if (params.pageSize !== undefined) query.set("pageSize", String(params.pageSize));
  if (params.search !== undefined && params.search.trim() !== "") {
    query.set("search", params.search.trim());
  }
  if (params.categoryId !== undefined) query.set("categoryId", String(params.categoryId));
  if (params.requestedPriority !== undefined) query.set("requestedPriority", params.requestedPriority);
  if (params.itPriority !== undefined) query.set("itPriority", params.itPriority);
  if (params.status !== undefined) query.set("status", params.status);
  if (params.assignedTo !== undefined && params.assignedTo !== "") {
    query.set("assignedTo", String(params.assignedTo));
  }
  if (params.sortBy !== undefined) query.set("sortBy", params.sortBy);
  if (params.sortOrder !== undefined) query.set("sortOrder", params.sortOrder);

  const url = `${API_URL}/api/tickets?${query.toString()}`;
  const res = await fetch(url, { credentials: "include" });

  if (!res.ok) {
    let errorMsg = "Failed to fetch ticket queue";
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

export interface AssignableUser {
  id: number;
  name: string;
  email: string;
  role: "IT_STAFF" | "ADMINISTRATOR";
  isActive: boolean;
}

export interface AssignTicketResult {
  data: {
    id: number;
    ownerId: number;
    owner: { id: number; name: string } | null;
    status: TicketStatus;
  };
  message: string;
}

export interface UpdateITPriorityResult {
  data: Pick<Ticket, "id" | "itPriority" | "updatedAt">;
  message: string;
}

export interface UpdateTicketStatusResult {
  data: Pick<Ticket, "id" | "status" | "resolutionSummary" | "updatedAt">;
  message: string;
}

export async function fetchAssignableUsers(): Promise<AssignableUser[]> {
  const res = await fetch(`${API_URL}/api/assignable-users`, { credentials: "include" });
  if (!res.ok) {
    let errorMsg = "Failed to fetch assignable users";
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

export async function assignTicket(ticketId: number, ownerId: number): Promise<AssignTicketResult> {
  const res = await fetch(`${API_URL}/api/tickets/${ticketId}/assign`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ ownerId }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error || "Failed to assign ticket");
  }

  return data;
}

export async function updateTicketITPriority(
  ticketId: number,
  itPriority: PriorityLevel
): Promise<UpdateITPriorityResult> {
  const res = await fetch(`${API_URL}/api/tickets/${ticketId}/priority`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ itPriority }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error || "Failed to update IT Priority");
  }

  return data;
}

export async function updateTicketStatus(
  ticketId: number,
  status: TicketStatus,
  resolutionSummary?: string
): Promise<UpdateTicketStatusResult> {
  const res = await fetch(`${API_URL}/api/tickets/${ticketId}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ status, resolutionSummary }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error || "Failed to update ticket status");
  }

  return data;
}

export async function fetchTicketDetail(idOrNumber: string | number): Promise<TicketDetail> {
  const url = `${API_URL}/api/tickets/${idOrNumber}`;
  const res = await fetch(url, { credentials: "include" });

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

export interface TicketComment {
  id: number;
  ticketId: number;
  authorId: number;
  content: string;
  createdAt: string;
  author: { id: number; name: string; role: UserRole };
}

export type InternalNote = TicketComment;

async function collaborationRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, credentials: "include" });
  let payload: any;
  try {
    payload = await res.json();
  } catch {
    payload = {};
  }
  if (!res.ok) {
    const error = new Error(payload?.error || "Ticket collaboration request failed") as Error & {
      status: number;
      code?: string;
    };
    error.status = res.status;
    error.code = payload?.code;
    throw error;
  }
  return payload as T;
}

export function fetchTicketComments(ticketId: number): Promise<TicketComment[]> {
  return collaborationRequest<TicketComment[]>(`${API_URL}/api/tickets/${ticketId}/comments`);
}

export function createTicketComment(ticketId: number, content: string): Promise<{ data: TicketComment; message: string }> {
  return collaborationRequest(`${API_URL}/api/tickets/${ticketId}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
}

export function fetchInternalNotes(ticketId: number): Promise<InternalNote[]> {
  return collaborationRequest<InternalNote[]>(`${API_URL}/api/tickets/${ticketId}/notes`);
}

export function createInternalNote(ticketId: number, content: string): Promise<{ data: InternalNote; message: string }> {
  return collaborationRequest(`${API_URL}/api/tickets/${ticketId}/notes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
}

export function markTicketProblemResolved(
  ticketId: number
): Promise<{ data: { ticket: Ticket; comment: TicketComment }; message: string }> {
  return collaborationRequest(`${API_URL}/api/tickets/${ticketId}/problem-appears-resolved`, {
    method: "POST",
  });
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



