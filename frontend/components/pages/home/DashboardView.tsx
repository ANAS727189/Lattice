"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Plus, FileText, PenLine, Clock } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiError, createDocument, getCurrentUser, listDocuments } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import type { DocumentSummary, User } from "@/types";
import { Navbar } from "@/components/layout/Navbar";

export function DashboardView() {
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const logout = useAuthStore((state) => state.logout);

  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 15;

  useEffect(() => {
    if (!token) return;
    async function loadDocs() {
      try {
        const [me, nextDocuments] = await Promise.all([
          getCurrentUser(token),
          listDocuments(token),
        ]);
        setCurrentUser(me);
        setDocuments(nextDocuments);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          logout();
          router.push("/login");
          return;
        }
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadDocs();
  }, [logout, router, token]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    setBusy(true);
    try {
      const document = await createDocument(token, "Untitled");
      router.push(`/d/${document.id}`);
    } catch (caught) {
      console.error(caught);
    } finally {
      setBusy(false);
    }
  }

  const filteredDocs = useMemo(
    () =>
      documents.filter((doc) =>
        doc.title.toLowerCase().includes(query.toLowerCase())
      ),
    [documents, query]
  );

  const totalPages = Math.max(1, Math.ceil(filteredDocs.length / pageSize));
  const clampedPage = Math.min(page, totalPages);
  const startIndex = (clampedPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredDocs.length);
  const pagedDocs = filteredDocs.slice(startIndex, endIndex);

  useEffect(() => {
    setPage(1);
  }, [query, documents.length]);

  function handlePageChange(nextPage: number) {
    setPage(Math.max(1, Math.min(nextPage, totalPages)));
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--cream)" }}>
      <Navbar
        variant="dashboard"
        query={query}
        onQueryChange={setQuery}
        onLogout={() => {
          logout();
          router.push("/");
        }}
        profileName={currentUser?.display_name ?? ""}
        profileEmail={currentUser?.email ?? ""}
      />

      <main className="max-w-6xl mx-auto px-6 py-10">
        <section className="md:hidden mb-8">
          <p
            className="text-xs font-medium uppercase tracking-widest mb-3"
            style={{ color: "var(--ink-faint)" }}
          >
            Search
          </p>
          <input
            className="w-full px-4 h-10 text-sm rounded-sm outline-none transition-all"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              color: "var(--ink)",
            }}
            placeholder="Search documents…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "var(--ink-faint)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "var(--border)";
            }}
          />
        </section>

        <section className="mb-10">
          <p
            className="text-xs font-medium uppercase tracking-widest mb-5"
            style={{ color: "var(--ink-faint)" }}
          >
            New
          </p>
          <form onSubmit={handleCreate}>
            <button
              type="submit"
              disabled={busy}
              className="group flex flex-col items-center justify-center transition-all"
              style={{
                width: 130,
                height: 170,
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                background: "var(--surface)",
                cursor: busy ? "not-allowed" : "pointer",
                opacity: busy ? 0.6 : 1,
              }}
              onMouseEnter={(e) => {
                if (!busy) {
                  (e.currentTarget as HTMLButtonElement).style.borderColor =
                    "var(--ink)";
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "var(--cream)";
                }
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor =
                  "var(--border)";
                (e.currentTarget as HTMLButtonElement).style.background =
                  "var(--surface)";
              }}
            >
              <Plus
                className="h-5 w-5 mb-2 transition-transform group-hover:scale-110"
                style={{ color: "var(--ink-muted)" }}
              />
              <span
                className="text-xs font-medium"
                style={{ color: "var(--ink-muted)" }}
              >
                Blank document
              </span>
            </button>
          </form>
        </section>

        <section>
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p
                className="text-xs font-medium uppercase tracking-widest"
                style={{ color: "var(--ink-faint)" }}
              >
                Recent documents
              </p>

              <p className="text-sm mt-2" style={{ color: "var(--ink-muted)" }}>
                {loading
                  ? "Fetching your workspace…"
                  : filteredDocs.length === 0
                  ? "Create a document to start collaborating."
                  : "Pick up where you left off."}
              </p>
            </div>
             <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
                {filteredDocs.length === 0
                  ? "No documents yet"
                  : `Showing ${startIndex + 1}-${endIndex} of ${filteredDocs.length}`}
              </p>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="animate-pulse rounded-sm"
                  style={{
                    height: 170,
                    background: "var(--cream-dark)",
                    border: "1px solid var(--border)",
                  }}
                />
              ))}
            </div>
          ) : filteredDocs.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center py-20 rounded-sm"
              style={{
                border: "1px dashed var(--border-strong)",
                background: "transparent",
              }}
            >
              <PenLine
                className="mb-3 h-8 w-8"
                style={{ color: "var(--border-strong)" }}
              />
              <p
                className="text-sm font-medium mb-1"
                style={{ color: "var(--ink-muted)" }}
              >
                No documents yet
              </p>
              <p className="text-xs" style={{ color: "var(--ink-faint)" }}>
                Create your first document above
              </p>


              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  if (!token) return;
                  setBusy(true);
                  createDocument(token, "Untitled")
                    .then((document) => router.push(`/d/${document.id}`))
                    .catch((caught) => console.error(caught))
                    .finally(() => setBusy(false));
                }}
                className="mt-6 inline-flex items-center gap-2 h-10 px-4 text-sm font-medium rounded-sm transition-colors"
                style={{
                  background: busy ? "var(--ink-muted)" : "var(--ink)",
                  color: "var(--cream)",
                  border: "1px solid var(--ink)",
                  cursor: busy ? "not-allowed" : "pointer",
                  opacity: busy ? 0.85 : 1,
                }}
              >
                <Plus className="h-4 w-4" style={{ color: "var(--cream)" }} />
                Create a document
              </button>
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-4 gap-y-7">
                {pagedDocs.map((doc) => (
                  <Link
                    key={doc.id}
                    href={`/d/${doc.id}`}
                    className="group flex flex-col"
                  >
                    <div
                      className="relative mb-3 overflow-hidden rounded-sm transition-all"
                      style={{
                        height: 170,
                        background: "var(--surface)",
                        border: "1px solid var(--border)",
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLDivElement).style.borderColor =
                          "var(--ink)";
                        (e.currentTarget as HTMLDivElement).style.boxShadow =
                          "0 6px 18px rgba(26,23,20,0.12)";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLDivElement).style.borderColor =
                          "var(--border)";
                        (e.currentTarget as HTMLDivElement).style.boxShadow =
                          "none";
                      }}
                    >
                      <div className="absolute inset-0 p-4 pt-5">
                        <div
                          className="mb-2.5 rounded-sm"
                          style={{
                            height: 8,
                            width: "60%",
                            background: "var(--ink)",
                            opacity: 0.12,
                          }}
                        />
                        <div
                          className="mb-1.5 rounded-sm"
                          style={{
                            height: 5,
                            width: "90%",
                            background: "var(--cream-dark)",
                          }}
                        />
                        <div
                          className="mb-1.5 rounded-sm"
                          style={{
                            height: 5,
                            width: "80%",
                            background: "var(--cream-dark)",
                          }}
                        />
                        <div
                          className="mb-4 rounded-sm"
                          style={{
                            height: 5,
                            width: "70%",
                            background: "var(--cream-dark)",
                          }}
                        />
                        <div
                          className="mb-1.5 rounded-sm"
                          style={{
                            height: 5,
                            width: "95%",
                            background: "var(--cream-dark)",
                          }}
                        />
                        <div
                          className="mb-1.5 rounded-sm"
                          style={{
                            height: 5,
                            width: "75%",
                            background: "var(--cream-dark)",
                          }}
                        />
                        <div
                          className="rounded-sm"
                          style={{
                            height: 5,
                            width: "55%",
                            background: "var(--cream-dark)",
                          }}
                        />
                      </div>
                      <div
                        className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100"
                        style={{ background: "rgba(247,245,240,0.7)" }}
                      >
                        <FileText className="h-6 w-6" style={{ color: "var(--ink)" }} />
                      </div>
                    </div>
                    <div>
                      <h3
                        className="truncate text-sm font-medium mb-1 transition-colors"
                        style={{ color: "var(--ink)" }}
                      >
                        {doc.title}
                      </h3>
                      <div
                        className="flex items-center gap-1.5 text-xs"
                        style={{ color: "var(--ink-faint)" }}
                      >
                        <Clock className="h-3 w-3 shrink-0" />
                        <span>
                          {new Date(doc.updated_at).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {totalPages > 1 && (
                <div
                  className="mt-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                  style={{ borderTop: "1px solid var(--border)", paddingTop: 16 }}
                >
                  <p className="text-xs" style={{ color: "var(--ink-faint)" }}>
                    Page {clampedPage} of {totalPages}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handlePageChange(clampedPage - 1)}
                      disabled={clampedPage === 1}
                      className="h-9 px-4 text-xs font-medium rounded-sm transition-colors"
                      style={{
                        background:
                          clampedPage === 1 ? "var(--cream-dark)" : "var(--surface)",
                        color: "var(--ink)",
                        border: "1px solid var(--border)",
                        cursor: clampedPage === 1 ? "not-allowed" : "pointer",
                      }}
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePageChange(clampedPage + 1)}
                      disabled={clampedPage === totalPages}
                      className="h-9 px-4 text-xs font-medium rounded-sm transition-colors"
                      style={{
                        background:
                          clampedPage === totalPages
                            ? "var(--cream-dark)"
                            : "var(--ink)",
                        color:
                          clampedPage === totalPages ? "var(--ink-faint)" : "var(--cream)",
                        border:
                          clampedPage === totalPages
                            ? "1px solid var(--border)"
                            : "1px solid var(--ink)",
                        cursor:
                          clampedPage === totalPages ? "not-allowed" : "pointer",
                      }}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
