import { Check, Copy, Search, UserMinus, X } from "lucide-react";
import type { DocumentDetail, DocumentPermission, PublicUser, User } from "@/types";
import { AccessRow } from "@/components/pages/document/AccessRow";

export function ShareModal({
  detail,
  currentUser,
  permissions,
  inviteQuery,
  inviteRole,
  userResults,
  copied,
  busy,
  onClose,
  onInviteQueryChange,
  onInviteRoleChange,
  onInviteUser,
  onRemovePermission,
  onCopyLink,
}: {
  detail: DocumentDetail;
  currentUser: User;
  permissions: DocumentPermission[];
  inviteQuery: string;
  inviteRole: "viewer" | "editor";
  userResults: PublicUser[];
  copied: boolean;
  busy: boolean;
  onClose: () => void;
  onInviteQueryChange: (value: string) => void;
  onInviteRoleChange: (role: "viewer" | "editor") => void;
  onInviteUser: (user: PublicUser) => void;
  onRemovePermission: (userId: string) => void;
  onCopyLink: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto px-3 py-6 sm:px-4 sm:pt-16"
      style={{ background: "rgba(26,23,20,0.4)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="max-h-[calc(100dvh-3rem)] w-full max-w-md overflow-y-auto rounded-sm"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          boxShadow: "0 20px 60px rgba(26,23,20,0.18)",
        }}
      >
        <div
          className="flex items-start justify-between px-5 py-4"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div>
            <h2
              className="text-base font-medium"
              style={{
                color: "var(--ink)",
                fontFamily: "var(--font-display)",
              }}
            >
              Share document
            </h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--ink-faint)" }}>
              {detail.document.title}
            </p>
          </div>
          <button
            className="h-7 w-7 flex items-center justify-center rounded-sm transition-colors"
            style={{ color: "var(--ink-faint)" }}
            onClick={onClose}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background =
                "var(--cream-dark)";
              (e.currentTarget as HTMLButtonElement).style.color = "var(--ink)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background =
                "transparent";
              (e.currentTarget as HTMLButtonElement).style.color =
                "var(--ink-faint)";
            }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {detail.role === "owner" ? (
            <div className="space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1 min-w-0">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5"
                    style={{ color: "var(--ink-faint)" }}
                  />
                  <input
                    value={inviteQuery}
                    onChange={(e) => onInviteQueryChange(e.target.value)}
                    placeholder="Search by name or email"
                    className="w-full h-9 pl-9 pr-3 text-sm rounded-sm outline-none"
                    style={{
                      background: "var(--cream)",
                      border: "1px solid var(--border)",
                      color: "var(--ink)",
                      fontFamily: "inherit",
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "var(--ink)";
                      e.target.style.background = "var(--surface)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "var(--border)";
                      e.target.style.background = "var(--cream)";
                    }}
                  />
                </div>
                <select
                  value={inviteRole}
                  onChange={(e) =>
                    onInviteRoleChange(e.target.value as "viewer" | "editor")
                  }
                  className="h-9 w-full rounded-sm px-3 text-xs outline-none sm:w-auto"
                  style={{
                    background: "var(--cream)",
                    border: "1px solid var(--border)",
                    color: "var(--ink)",
                    fontFamily: "inherit",
                  }}
                >
                  <option value="editor">Editor</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>

              {userResults.length > 0 && (
                <div
                  className="rounded-sm overflow-hidden"
                  style={{ border: "1px solid var(--border)" }}
                >
                  {userResults.map((user, i) => (
                    <button
                      key={user.id}
                      className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors"
                      disabled={busy}
                      onClick={() => onInviteUser(user)}
                      style={{
                        borderTop: i > 0 ? "1px solid var(--border)" : undefined,
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.background =
                          "var(--cream)";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.background =
                          "transparent";
                      }}
                    >
                      <span className="min-w-0">
                        <span
                          className="block truncate text-sm font-medium"
                          style={{ color: "var(--ink)" }}
                        >
                          {user.display_name}
                        </span>
                        <span
                          className="block truncate text-xs"
                          style={{ color: "var(--ink-faint)" }}
                        >
                          {user.email}
                        </span>
                      </span>
                      <span
                        className="shrink-0 text-xs font-medium"
                        style={{ color: "var(--ink-muted)" }}
                      >
                        Add as {inviteRole}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <p
                  className="text-xs uppercase tracking-wider font-medium"
                  style={{ color: "var(--ink-faint)" }}
                >
                  People with access
                </p>
                <AccessRow
                  name={currentUser.display_name}
                  email={currentUser.email}
                  role="Owner"
                />
                {permissions.map((permission) => (
                  <AccessRow
                    key={permission.user_id}
                    name={permission.display_name}
                    email={permission.email}
                    role={permission.role}
                    action={
                      <button
                        className="h-7 w-7 flex items-center justify-center rounded-sm transition-colors"
                        style={{ color: "var(--ink-faint)" }}
                        aria-label={`Remove ${permission.display_name}`}
                        disabled={busy}
                        onClick={() => onRemovePermission(permission.user_id)}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLButtonElement).style.color =
                            "var(--accent)";
                          (e.currentTarget as HTMLButtonElement).style.background =
                            "var(--accent-light)";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLButtonElement).style.color =
                            "var(--ink-faint)";
                          (e.currentTarget as HTMLButtonElement).style.background =
                            "transparent";
                        }}
                      >
                        <UserMinus className="h-3.5 w-3.5" />
                      </button>
                    }
                  />
                ))}
              </div>
            </div>
          ) : (
            <p
              className="text-sm px-4 py-3 rounded-sm"
              style={{
                background: "var(--cream)",
                color: "var(--ink-muted)",
                border: "1px solid var(--border)",
              }}
            >
              Only the document owner can invite people or change access.
            </p>
          )}

          <div
            className="flex items-center gap-3 rounded-sm px-3 py-3 sm:px-4"
            style={{
              background: "var(--cream)",
              border: "1px solid var(--border)",
            }}
          >
            <span
              className="flex-1 truncate text-xs"
              style={{ color: "var(--ink-muted)" }}
            >
              {typeof window !== "undefined" ? window.location.href : ""}
            </span>
            <button
              onClick={onCopyLink}
              className="inline-flex items-center gap-1.5 h-7 px-3 text-xs font-medium rounded-sm shrink-0 transition-all"
              style={{
                background: "var(--ink)",
                color: "var(--cream)",
              }}
            >
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              {copied ? "Copied" : "Copy link"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
