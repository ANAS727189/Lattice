"use client";

import { AuthPanel } from "@/components/layout/auth-panel";
import { DocumentWorkspace } from "@/components/layout/document-workspace";
import { useAuthStore } from "@/store/auth";

export function AppShell() {
  const token = useAuthStore(state => state.token);
  const logout = useAuthStore(state => state.logout);

  if (!token) {
    return <AuthPanel />;
  }

  return <DocumentWorkspace token={token} onLogout={logout} />;
}
