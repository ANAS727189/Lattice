"use client";

import { useEffect, useState } from "react";
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
  renameOpen,
  onRenameOpenChange,
}: {
  detail: DocumentDetail;
  currentUser: User;
  busy: boolean;
  onShareOpen: () => void;
  onDelete: () => void;
  onRename: (title: string) => Promise<void> | void;
  renameOpen: boolean;
  onRenameOpenChange: (open: boolean) => void;
}) {
  const [draftTitle, setDraftTitle] = useState(detail.document.title);

  useEffect(() => {
    setDraftTitle(detail.document.title);
  }, [detail.document.title, renameOpen]);

  async function submitRename() {
    const nextTitle = draftTitle.trim();
    if (!nextTitle || nextTitle === detail.document.title) {
      onRenameOpenChange(false);
      setDraftTitle(detail.document.title);
      return;
    }
    await onRename(nextTitle);
    onRenameOpenChange(false);
  }

  return (
    <header
      className="relative flex h-13 shrink-0 items-center justify-between px-5"
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
        <div className="relative min-w-0">
          <button
            className="group flex items-center gap-2 min-w-0 rounded-sm transition-all"
            onClick={() => onRenameOpenChange(true)}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background =
                "var(--cream-dark)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background =
                "transparent";
            }}
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

          <div
            className={`absolute left-0 top-full z-20 mt-2 w-[20rem] rounded-sm border transition-all duration-200 ${
              renameOpen
                ? "pointer-events-auto translate-y-0 opacity-100"
                : "pointer-events-none -translate-y-1 opacity-0"
            }`}
            style={{
              background: "var(--surface)",
              borderColor: "var(--border)",
              boxShadow: "0 20px 50px rgba(26,23,20,0.16)",
            }}
          >
            <div className="px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
              <p className="text-xs uppercase tracking-wider" style={{ color: "var(--ink-faint)" }}>
                Rename document
              </p>
              <p className="mt-1 text-sm" style={{ color: "var(--ink-muted)" }}>
                Update the title without leaving the page.
              </p>
            </div>
            <div className="p-4 space-y-3">
              <input
                autoFocus={renameOpen}
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void submitRename();
                  }
                  if (e.key === "Escape") {
                    onRenameOpenChange(false);
                    setDraftTitle(detail.document.title);
                  }
                }}
                className="w-full h-9 px-3 text-sm rounded-sm outline-none transition-all"
                style={{
                  background: "var(--cream)",
                  border: "1px solid var(--border)",
                  color: "var(--ink)",
                  fontFamily: "inherit",
                }}
              />
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs" style={{ color: "var(--ink-faint)" }}>
                  Press Enter to save
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onRenameOpenChange(false);
                      setDraftTitle(detail.document.title);
                    }}
                    className="h-8 px-3 text-xs rounded-sm transition-colors"
                    style={{
                      color: "var(--ink-muted)",
                      background: "transparent",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void submitRename()}
                    className="h-8 px-3 text-xs font-medium rounded-sm transition-all"
                    style={{
                      background: "var(--ink)",
                      color: "var(--cream)",
                      opacity: busy ? 0.7 : 1,
                    }}
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
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
