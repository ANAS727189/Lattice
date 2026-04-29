import * as Y from "yjs";

export type User = {
  id: string;
  email: string;
  display_name: string;
  created_at?: string;
};

export type DocumentSummary = {
  id: string;
  title: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
};

export type DocumentRole = "owner" | "editor" | "viewer";

export type DocumentDetail = {
  document: DocumentSummary;
  role: DocumentRole;
};

export type AuthMode = "login" | "register";

export type RegisterPayload = {
  email: string;
  password: string;
  name: string;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type SyncStatus = "connected" | "connecting" | "offline" | "error";

export type ProviderOptions = {
  docId: string;
  token: string;
  doc: Y.Doc;
  onStatusChange: (status: SyncStatus) => void;
};