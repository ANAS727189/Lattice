"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  deleteDocument,
  deleteDocumentPermission,
  getCurrentUser,
  getDocument,
  listDocumentPermissions,
  searchUsers,
  updateDocumentTitle,
  upsertDocumentPermission,
} from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { CollabEditor } from "@/components/editor/collab-editor";
import { DocumentHeader } from "@/components/pages/document/DocumentHeader";
import {
  DocumentErrorState,
  DocumentLoadingState,
} from "@/components/pages/document/DocumentStates";
import { ShareModal } from "@/components/pages/document/ShareModal";
import type {
  DocumentDetail,
  DocumentPermission,
  PublicUser,
  User,
} from "@/types";

export default function DocumentPage() {
  const router = useRouter();
  const { id } = useParams() as { id: string };
  const token = useAuthStore((state) => state.token);

  const [detail, setDetail] = useState<DocumentDetail | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<DocumentPermission[]>([]);
  const [shareOpen, setShareOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [inviteQuery, setInviteQuery] = useState("");
  const [inviteRole, setInviteRole] = useState<"viewer" | "editor">("editor");
  const [userResults, setUserResults] = useState<PublicUser[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  async function loadDocument() {
    try {
      const [docDetail, me] = await Promise.all([
        getDocument(token, id),
        getCurrentUser(token),
      ]);
      setDetail(docDetail);
      setCurrentUser(me);
      if (docDetail.role === "owner") {
        const nextPermissions = await listDocumentPermissions(token, id);
        setPermissions(nextPermissions);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load document");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!token) {
      router.push("/login");
      return;
    }
    const timeout = window.setTimeout(() => {
      loadDocument();
    }, 0);
    return () => window.clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, token]);

  async function handleRename(title: string) {
    if (!detail) return;

    setBusy(true);
    try {
      const updated = await updateDocumentTitle(token, id, title);
      setDetail({ ...detail, document: updated });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Rename failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!detail || detail.role !== "owner") return;
    if (
      !window.confirm(
        `Delete "${detail.document.title}"? This cannot be undone.`
      )
    )
      return;

    setBusy(true);
    try {
      await deleteDocument(token, id);
      router.push("/");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed");
      setBusy(false);
    }
  }

  function handleShare() {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleCloseShare() {
    setShareOpen(false);
    setInviteQuery("");
    setUserResults([]);
  }

  function handleInviteQueryChange(value: string) {
    setInviteQuery(value);
    if (value.trim().length < 2) {
      setUserResults([]);
    }
  }

  useEffect(() => {
    if (!token || !shareOpen || inviteQuery.trim().length < 2) return;
    const timeout = window.setTimeout(async () => {
      try {
        const users = await searchUsers(token, inviteQuery.trim());
        setUserResults(users.filter((user) => user.id !== currentUser?.id));
      } catch {
        setUserResults([]);
      }
    }, 220);
    return () => window.clearTimeout(timeout);
  }, [currentUser?.id, inviteQuery, shareOpen, token]);

  async function inviteUser(user: PublicUser) {
    if (!detail) return;
    setBusy(true);
    try {
      const permission = await upsertDocumentPermission(
        token,
        detail.document.id,
        user.id,
        inviteRole
      );
      setPermissions((current) => [
        permission,
        ...current.filter((item) => item.user_id !== user.id),
      ]);
      setInviteQuery("");
      setUserResults([]);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Invite failed");
    } finally {
      setBusy(false);
    }
  }

  async function removePermission(userId: string) {
    if (!detail) return;
    setBusy(true);
    try {
      await deleteDocumentPermission(token, detail.document.id, userId);
      setPermissions((current) =>
        current.filter((item) => item.user_id !== userId)
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not remove access");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <DocumentLoadingState />;
  }

  if (error) {
    return <DocumentErrorState error={error} />;
  }

  if (!detail || !currentUser) return null;

  return (
    <div
      className="flex h-dvh min-h-0 flex-col"
      style={{ background: "var(--cream)" }}
    >
      <DocumentHeader
        detail={detail}
        currentUser={currentUser}
        busy={busy}
        onShareOpen={() => setShareOpen(true)}
        onDelete={handleDelete}
        onRename={handleRename}
        renameOpen={renameOpen}
        onRenameOpenChange={setRenameOpen}
      />

      {/* Editor */}
      <CollabEditor
        docId={detail.document.id}
        token={token}
        role={detail.role}
        currentUser={currentUser}
      />

      {shareOpen && (
        <ShareModal
          detail={detail}
          currentUser={currentUser}
          permissions={permissions}
          inviteQuery={inviteQuery}
          inviteRole={inviteRole}
          userResults={userResults}
          copied={copied}
          busy={busy}
          onClose={handleCloseShare}
          onInviteQueryChange={handleInviteQueryChange}
          onInviteRoleChange={setInviteRole}
          onInviteUser={inviteUser}
          onRemovePermission={removePermission}
          onCopyLink={handleShare}
        />
      )}
    </div>
  );
}
