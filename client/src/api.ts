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
  attachments: unknown[];
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
