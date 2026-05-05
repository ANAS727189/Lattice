"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { LogOut, Plus, FileText, Search, PenLine, Clock } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiError, createDocument, listDocuments } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import type { DocumentSummary } from "@/types";

export function DashboardView() {
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const logout = useAuthStore((state) => state.logout);

  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) return;
    async function loadDocs() {
      try {
        const nextDocuments = await listDocuments(token);
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

  return (
    <div className="min-h-screen" style={{ background: "var(--cream)" }}>
      <header
        className="sticky top-0 z-10 flex h-14 items-center justify-between px-6"
        style={{
          background: "var(--surface)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <img
              src="/favicon.ico"
              alt="Lattice logo"
              className="h-6 w-6"
            />
            <span
              className="text-base font-medium"
              style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}
            >
              Lattice
            </span>
          </div>
          <div className="hidden md:flex items-center relative">
            <Search
              className="absolute left-3 h-3.5 w-3.5"
              style={{ color: "var(--ink-faint)" }}
            />
            <input
              className="w-64 pl-9 pr-4 h-8 text-sm rounded-sm outline-none transition-all"
              style={{
                background: "var(--cream)",
                border: "1px solid var(--border)",
                color: "var(--ink)",
                fontFamily: "inherit",
              }}
              placeholder="Search documents…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={(e) => {
                e.target.style.borderColor = "var(--ink-faint)";
                e.target.style.background = "var(--surface)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "var(--border)";
                e.target.style.background = "var(--cream)";
              }}
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div
            className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold"
            style={{
              background: "var(--ink)",
              color: "var(--cream)",
              fontFamily: "var(--font-ui)",
            }}
          >
            A
          </div>
          <button
            title="Sign out"
            onClick={() => {
              logout();
              router.push("/");
            }}
            className="h-7 w-7 flex items-center justify-center rounded-sm transition-colors"
            style={{ color: "var(--ink-faint)" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = "var(--ink)";
              (e.currentTarget as HTMLButtonElement).style.background =
                "var(--cream-dark)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color =
                "var(--ink-faint)";
              (e.currentTarget as HTMLButtonElement).style.background =
                "transparent";
            }}
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        <section className="mb-12">
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
          <div className="flex items-center justify-between mb-5">
            <p
              className="text-xs font-medium uppercase tracking-widest"
              style={{ color: "var(--ink-faint)" }}
            >
              Recent
            </p>
            {documents.length > 0 && (
              <span className="text-xs" style={{ color: "var(--ink-faint)" }}>
                {documents.length} document{documents.length !== 1 ? "s" : ""}
              </span>
            )}
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
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-4 gap-y-7">
              {filteredDocs.map((doc) => (
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
                        "0 4px 16px rgba(26,23,20,0.10)";
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
          )}
        </section>
      </main>
    </div>
  );
}
