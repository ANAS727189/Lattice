import { API_BASE_URL, DOCS_BASE_URL } from "@/lib/config";
import type {
  DocumentDetail,
  DocumentPermission,
  DocumentSummary,
  LoginPayload,
  PublicUser,
  RegisterPayload,
  User,
} from "@/types";

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = "Request failed";
    try {
      const body = (await response.json()) as { error?: string };
      message = body.error ?? message;
    } catch {
      message = response.statusText || message;
    }
    throw new ApiError(message, response.status);
  }
  return response.json() as Promise<T>;
}

function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export async function register(payload: RegisterPayload): Promise<User> {
  const response = await fetch(`${API_BASE_URL}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseResponse<User>(response);
}

export async function login(payload: LoginPayload): Promise<{ token: string }> {
  const response = await fetch(`${API_BASE_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseResponse<{ token: string }>(response);
}

export async function getCurrentUser(token: string): Promise<User> {
  const response = await fetch(`${API_BASE_URL}/me`, {
    headers: authHeaders(token),
    cache: "no-store",
  });
  return parseResponse<User>(response);
}

export async function updateCurrentUser(token: string, displayName: string): Promise<User> {
  const response = await fetch(`${API_BASE_URL}/me`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify({ display_name: displayName }),
  });
  return parseResponse<User>(response);
}

export async function searchUsers(token: string, query: string): Promise<PublicUser[]> {
  const response = await fetch(`${API_BASE_URL}/users/search?q=${encodeURIComponent(query)}`, {
    headers: authHeaders(token),
    cache: "no-store",
  });
  return parseResponse<PublicUser[]>(response);
}

export async function listDocuments(token: string): Promise<DocumentSummary[]> {
  const response = await fetch(`${DOCS_BASE_URL}/docs`, {
    headers: authHeaders(token),
    cache: "no-store",
  });
  return parseResponse<DocumentSummary[]>(response);
}

export async function createDocument(
  token: string,
  title: string,
): Promise<DocumentSummary> {
  const response = await fetch(`${DOCS_BASE_URL}/docs`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ title }),
  });
  return parseResponse<DocumentSummary>(response);
}

export async function getDocument(
  token: string,
  id: string,
): Promise<DocumentDetail> {
  const response = await fetch(`${DOCS_BASE_URL}/docs/${id}`, {
    headers: authHeaders(token),
    cache: "no-store",
  });
  return parseResponse<DocumentDetail>(response);
}

export async function updateDocumentTitle(
  token: string,
  id: string,
  title: string,
): Promise<DocumentSummary> {
  const response = await fetch(`${DOCS_BASE_URL}/docs/${id}`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify({ title }),
  });
  return parseResponse<DocumentSummary>(response);
}

export async function deleteDocument(token: string, id: string) {
  const response = await fetch(`${DOCS_BASE_URL}/docs/${id}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  if (!response.ok) {
    await parseResponse(response);
  }
}

export async function listDocumentPermissions(
  token: string,
  id: string,
): Promise<DocumentPermission[]> {
  const response = await fetch(`${DOCS_BASE_URL}/docs/${id}/permissions`, {
    headers: authHeaders(token),
    cache: "no-store",
  });
  return parseResponse<DocumentPermission[]>(response);
}

export async function upsertDocumentPermission(
  token: string,
  id: string,
  userId: string,
  role: "viewer" | "editor",
): Promise<DocumentPermission> {
  const response = await fetch(`${DOCS_BASE_URL}/docs/${id}/permissions/${userId}`, {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify({ role }),
  });
  return parseResponse<DocumentPermission>(response);
}

export async function deleteDocumentPermission(
  token: string,
  id: string,
  userId: string,
) {
  const response = await fetch(`${DOCS_BASE_URL}/docs/${id}/permissions/${userId}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  if (!response.ok) {
    await parseResponse(response);
  }
}
