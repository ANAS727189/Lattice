"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { FileText, LogOut, MoreHorizontal, Plus, RefreshCcw, Search, Trash2 } from "lucide-react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createDocument, deleteDocument, getDocument, listDocuments, updateDocumentTitle } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { DocumentDetail, DocumentSummary } from "@/types/types";

const CollabEditor = dynamic(
  () => import("@/components/editor/collab-editor").then(mod => mod.CollabEditor),
  { ssr: false },
);

type DocumentWorkspaceProps = {
  token: string;
  onLogout: () => void;
};

export function DocumentWorkspace({ token, onLogout }: DocumentWorkspaceProps) {
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [activeDocument, setActiveDocument] = useState<DocumentDetail | null>(null);
  const [query, setQuery] = useState("");
  const [newTitle, setNewTitle] = useState("Untitled document");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const filteredDocuments = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return documents;
    }
    return documents.filter(document => document.title.toLowerCase().includes(needle));
  }, [documents, query]);

  useEffect(() => {
    refreshDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function refreshDocuments(selectFirst = true) {
    setError("");
    setLoading(true);
    try {
      const nextDocuments = await listDocuments(token);
      setDocuments(nextDocuments);
      if (selectFirst && nextDocuments.length > 0) {
        await openDocument(nextDocuments[0].id);
      } else if (nextDocuments.length === 0) {
        setActiveDocument(null);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load documents");
    } finally {
      setLoading(false);
    }
  }

  async function openDocument(id: string) {
    setError("");
    try {
      const detail = await getDocument(token, id);
      setActiveDocument(detail);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not open document");
    }
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = newTitle.trim();
    if (!title) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      const document = await createDocument(token, title);
      setDocuments(current => [document, ...current]);
      setNewTitle("Untitled document");
      await openDocument(document.id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create document");
    } finally {
      setBusy(false);
    }
  }

  async function renameActive() {
    if (!activeDocument) {
      return;
    }
    const title = window.prompt("Rename document", activeDocument.document.title);
    if (!title?.trim()) {
      return;
    }
    setBusy(true);
    try {
      const updated = await updateDocumentTitle(token, activeDocument.document.id, title.trim());
      setDocuments(current =>
        current.map(document => (document.id === updated.id ? updated : document)),
      );
      setActiveDocument(current => (current ? { ...current, document: updated } : current));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not rename document");
    } finally {
      setBusy(false);
    }
  }

  async function removeActive() {
    if (!activeDocument) {
      return;
    }
    if (!window.confirm(`Delete "${activeDocument.document.title}"?`)) {
      return;
    }
    setBusy(true);
    try {
      await deleteDocument(token, activeDocument.document.id);
      const nextDocuments = documents.filter(document => document.id !== activeDocument.document.id);
      setDocuments(nextDocuments);
      setActiveDocument(null);
      if (nextDocuments[0]) {
        await openDocument(nextDocuments[0].id);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not delete document");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex h-screen min-h-0 bg-zinc-50 text-zinc-950">
      <aside className="flex w-80 shrink-0 flex-col border-r border-zinc-200 bg-white">
        <div className="flex h-14 items-center justify-between border-b border-zinc-200 px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-zinc-950 text-white">
              <FileText className="h-4 w-4" />
            </div>
            <span className="text-sm font-semibold">Lattice Docs</span>
          </div>
          <Button size="icon" variant="ghost" title="Sign out" onClick={onLogout}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleCreate} className="border-b border-zinc-200 p-4">
          <div className="flex gap-2">
            <Input
              value={newTitle}
              onChange={event => setNewTitle(event.target.value)}
              placeholder="New document"
              disabled={busy}
            />
            <Button type="submit" size="icon" variant="primary" disabled={busy} title="Create">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </form>

        <div className="border-b border-zinc-200 p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <Input
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Search documents"
              className="pl-9"
            />
          </div>
        </div>

        {error && (
          <div className="mx-4 mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-auto p-2">
          {loading ? (
            <div className="px-3 py-4 text-sm text-zinc-500">Loading documents...</div>
          ) : filteredDocuments.length === 0 ? (
            <div className="px-3 py-4 text-sm text-zinc-500">No documents found.</div>
          ) : (
            filteredDocuments.map(document => (
              <button
                key={document.id}
                onClick={() => openDocument(document.id)}
                className={cn(
                  "mb-1 flex w-full items-center gap-3 rounded-md px-3 py-3 text-left transition-colors",
                  activeDocument?.document.id === document.id
                    ? "bg-zinc-100 text-zinc-950"
                    : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950",
                )}
              >
                <FileText className="h-4 w-4 shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{document.title}</span>
                  <span className="block text-xs text-zinc-400">
                    {new Date(document.updated_at).toLocaleDateString()}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        {activeDocument ? (
          <>
            <div className="flex h-12 items-center justify-end gap-2 border-b border-zinc-200 bg-white px-4">
              <Button size="sm" variant="ghost" onClick={() => refreshDocuments(false)}>
                <RefreshCcw className="h-4 w-4" />
                Refresh
              </Button>
              <Button size="sm" variant="ghost" onClick={renameActive} disabled={busy}>
                <MoreHorizontal className="h-4 w-4" />
                Rename
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={removeActive}
                disabled={busy || activeDocument.role !== "owner"}
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            </div>
            <CollabEditor
              key={activeDocument.document.id}
              docId={activeDocument.document.id}
              title={activeDocument.document.title}
              token={token}
              role={activeDocument.role}
            />
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-md border border-zinc-200 bg-white">
                <FileText className="h-5 w-5 text-zinc-500" />
              </div>
              <h2 className="text-sm font-semibold text-zinc-950">No document selected</h2>
              <p className="mt-1 text-sm text-zinc-500">Create or select a document to begin.</p>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
