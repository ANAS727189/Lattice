import Link from "next/link";
import { Share2, Trash2 } from "lucide-react";
import type { DocumentDetail, User } from "@/types";

export function DocumentHeader({
  detail,
  currentUser,
  busy,
  onShareOpen,
  onDelete,
  onRename,
}: {
  detail: DocumentDetail;
  currentUser: User;
  busy: boolean;
  onShareOpen: () => void;
  onDelete: () => void;
  onRename: () => void;
}) {
  return (
    <header
      className="flex h-13 shrink-0 items-center justify-between px-5"
      style={{
        background: "var(--surface)",
        borderBottom: "1px solid var(--border)",
        minHeight: "52px",
      }}
    >
      <div className="flex items-center gap-4 min-w-0">
        <Link
          href="/"
          className="shrink-0 transition-opacity hover:opacity-60 flex items-center gap-2"
          style={{ color: "var(--ink)" }}
        >
          <img
            src="/favicon.ico"
            alt="Lattice logo"
            className="h-6 w-6"
          />
          <span
            className="text-base font-medium"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Lattice
          </span>
        </Link>
        <span style={{ color: "var(--border)", userSelect: "none" }}>/</span>
        <button
          className="flex items-center gap-2 group min-w-0"
          onClick={onRename}
        >
          <h1
            className="truncate text-sm font-medium transition-colors"
            style={{ color: "var(--ink)", maxWidth: 260 }}
          >
            {detail.document.title}
          </h1>
          <span
            className="text-xs shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ color: "var(--ink-faint)" }}
          >
            Rename
          </span>
        </button>
        <span
          className="hidden sm:inline-flex items-center px-2 py-0.5 text-xs rounded-sm"
          style={{
            background: "var(--cream-dark)",
            color: "var(--ink-faint)",
            border: "1px solid var(--border)",
          }}
        >
          {detail.role.charAt(0).toUpperCase() + detail.role.slice(1)}
        </span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onShareOpen}
          className="inline-flex items-center gap-1.5 h-8 px-4 text-xs font-medium rounded-sm transition-all"
          style={{
            background: "var(--ink)",
            color: "var(--cream)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background =
              "var(--ink-muted)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background =
              "var(--ink)";
          }}
        >
          <Share2 className="h-3.5 w-3.5" />
          Share
        </button>

        {detail.role === "owner" && (
          <button
            onClick={onDelete}
            disabled={busy}
            title="Delete document"
            className="h-8 w-8 flex items-center justify-center rounded-sm transition-colors"
            style={{ color: "var(--ink-faint)" }}
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
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}

        <div
          className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold ml-1"
          style={{
            background: detail.role === "owner" ? "var(--ink)" : "#2A6645",
            color: "var(--cream)",
          }}
        >
          {currentUser.display_name?.[0]?.toUpperCase() ?? "?"}
        </div>
      </div>
    </header>
  );
}
