"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ApiError, getCurrentUser, updateCurrentUser } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import type { User } from "@/types";

export default function ProfilePage() {
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!token) {
      router.push("/login");
      return;
    }

    async function loadUser() {
      try {
        const current = await getCurrentUser(token);
        setUser(current);
      } catch (caught) {
        if (caught instanceof ApiError && caught.status === 401) {
          router.push("/login");
          return;
        }
        setError(caught instanceof Error ? caught.message : "Failed to load profile");
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, [router, token]);

  useEffect(() => {
    if (user) {
      setDisplayName(user.display_name || "");
    }
  }, [user]);

  async function handleSave() {
    if (!token || !user) return;
    setError("");
    setNotice("");
    setSaving(true);
    try {
      const next = await updateCurrentUser(token, displayName);
      setUser(next);
      setEditing(false);
      setNotice("Profile updated.");
      window.setTimeout(() => setNotice(""), 2200);
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 401) {
        router.push("/login");
        return;
      }
      setError(caught instanceof Error ? caught.message : "Failed to update profile");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen" style={{ background: "var(--cream)" }}>
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p
              className="text-xs font-medium uppercase tracking-widest"
              style={{ color: "var(--ink-faint)" }}
            >
              Profile
            </p>
            <h1
              className="text-3xl sm:text-4xl font-medium mt-2"
              style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}
            >
              Account overview
            </h1>
          </div>
          <Link
            href="/"
            className="text-sm transition-colors"
            style={{ color: "var(--ink-muted)" }}
          >
            Back to documents
          </Link>
        </div>

        <div className="grid gap-6">
          {loading && (
            <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
              Loading profile...
            </p>
          )}

          {error && (
            <p className="text-sm" style={{ color: "var(--accent)" }}>
              {error}
            </p>
          )}
          {notice && (
            <div
              className="rounded-sm px-4 py-3 text-sm"
              style={{
                background: "var(--accent-light)",
                border: "1px solid var(--border)",
                color: "var(--ink)",
              }}
            >
              {notice}
            </div>
          )}

          {!loading && !error && user && (
            <div
              className="rounded-sm p-8"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
              }}
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div
                    className="h-12 w-12 rounded-full flex items-center justify-center text-lg font-semibold"
                    style={{ background: "var(--ink)", color: "var(--cream)" }}
                  >
                    {user.display_name?.[0]?.toUpperCase() ?? "?"}
                  </div>
                  <div>
                    <p className="text-lg font-semibold" style={{ color: "var(--ink)" }}>
                      {user.display_name || "Unnamed member"}
                    </p>
                    <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
                      {user.email}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!editing ? (
                    <button
                      type="button"
                      onClick={() => {
                        setNotice("");
                        setError("");
                        setEditing(true);
                      }}
                      className="h-9 px-4 text-xs font-medium rounded-sm transition-colors"
                      style={{
                        background: "var(--ink)",
                        color: "var(--cream)",
                        border: "1px solid var(--ink)",
                      }}
                    >
                      Edit profile
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={handleSave}
                        className="h-9 px-4 text-xs font-medium rounded-sm transition-colors"
                        style={{
                          background: saving ? "var(--ink-muted)" : "var(--ink)",
                          color: "var(--cream)",
                          border: "1px solid var(--ink)",
                          cursor: saving ? "not-allowed" : "pointer",
                          opacity: saving ? 0.8 : 1,
                        }}
                      >
                        {saving ? "Saving…" : "Save"}
                      </button>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => {
                          setEditing(false);
                          setError("");
                          setDisplayName(user.display_name || "");
                        }}
                        className="h-9 px-4 text-xs font-medium rounded-sm transition-colors"
                        style={{
                          background: "transparent",
                          color: "var(--ink-muted)",
                          border: "1px solid var(--border)",
                          cursor: saving ? "not-allowed" : "pointer",
                          opacity: saving ? 0.6 : 1,
                        }}
                      >
                        Cancel
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="mt-8 grid gap-6">
                <div
                  className="rounded-sm p-5"
                  style={{ background: "var(--cream)", border: "1px solid var(--border)" }}
                >
                  <p className="text-xs uppercase tracking-widest" style={{ color: "var(--ink-faint)" }}>
                    Profile
                  </p>

                  <div className="mt-4 grid gap-2">
                    <label
                      className="text-xs font-medium"
                      style={{ color: "var(--ink-muted)" }}
                      htmlFor="display-name"
                    >
                      Display name
                    </label>
                    <input
                      id="display-name"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      disabled={!editing || saving}
                      className="h-10 w-full rounded-sm px-3 text-sm outline-none transition-all"
                      style={{
                        background: editing ? "var(--surface)" : "var(--cream-dark)",
                        border: "1px solid var(--border)",
                        color: "var(--ink)",
                        cursor: !editing ? "default" : saving ? "not-allowed" : "text",
                      }}
                      onFocus={(e) => {
                        if (!editing) return;
                        e.currentTarget.style.borderColor = "var(--ink-faint)";
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = "var(--border)";
                      }}
                      placeholder="Your name"
                    />
                    <p className="text-xs" style={{ color: "var(--ink-faint)" }}>
                      This name appears in presence and collaboration cursors.
                    </p>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-6">
                  <div>
                    <p
                      className="text-xs uppercase tracking-widest"
                      style={{ color: "var(--ink-faint)" }}
                    >
                      User ID
                    </p>
                    <p className="mt-2 break-all text-sm" style={{ color: "var(--ink)" }}>
                      {user.id}
                    </p>
                  </div>
                  <div>
                    <p
                      className="text-xs uppercase tracking-widest"
                      style={{ color: "var(--ink-faint)" }}
                    >
                      Member since
                    </p>
                    <p className="text-sm mt-2" style={{ color: "var(--ink)" }}>
                      {user.created_at
                        ? new Date(user.created_at).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "-"}
                    </p>
                  </div>
                </div>

                <div
                  className="rounded-sm p-5"
                  style={{ background: "var(--cream)", border: "1px solid var(--border)" }}
                >
                  <p className="text-xs uppercase tracking-widest" style={{ color: "var(--ink-faint)" }}>
                    Security
                  </p>
                  <p className="text-sm mt-2" style={{ color: "var(--ink-muted)" }}>
                    Password resets and account recovery are managed through the sign-in flow.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
