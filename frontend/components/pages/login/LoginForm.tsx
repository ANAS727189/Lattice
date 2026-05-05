"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { login, register } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import type { AuthMode } from "@/types";
import { Field } from "@/components/pages/login/Field";

export function LoginForm() {
  const router = useRouter();
  const setToken = useAuthStore((state) => state.setToken);
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "register") {
        await register({ email, name, password });
      }
      const result = await login({ email, password });
      setToken(result.token);
      router.push("/");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Authentication failed"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col justify-center px-8 sm:px-16 lg:px-20">
      <button
        onClick={() => router.push("/")}
        className="flex lg:hidden items-center gap-3 mb-12"
      >
        <img
          src="/favicon.ico"
          alt="Lattice logo"
          className="h-7 w-7"
        />
        <span
          className="text-xl font-medium"
          style={{
            fontFamily: "var(--font-display)",
            color: "var(--ink)",
          }}
        >
          Lattice
        </span>
      </button>

      <div className="w-full max-w-sm mx-auto">
        <div className="mb-8">
          <h1
            className="text-3xl font-medium tracking-tight mb-2"
            style={{
              fontFamily: "var(--font-display)",
              color: "var(--ink)",
            }}
          >
            {mode === "login" ? "Welcome back." : "Start writing."}
          </h1>
          <p
            className="text-sm font-light"
            style={{ color: "var(--ink-muted)" }}
          >
            {mode === "login"
              ? "Sign in to your workspace."
              : "Create a free Lattice account."}
          </p>
        </div>

        <div
          className="flex mb-8 rounded-sm overflow-hidden"
          style={{ border: "1px solid var(--border)" }}
        >
          {(["login", "register"] as AuthMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className="flex-1 py-2.5 text-sm font-medium transition-all"
              style={{
                background: mode === m ? "var(--ink)" : "transparent",
                color: mode === m ? "var(--cream)" : "var(--ink-muted)",
                borderRight:
                  m === "login" ? "1px solid var(--border)" : undefined,
              }}
            >
              {m === "login" ? "Sign in" : "Sign up"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "register" && (
            <Field label="Display name">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ada Lovelace"
                required
              />
            </Field>
          )}

          <Field label="Email">
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ada@example.com"
              type="email"
              required
            />
          </Field>

          <Field label="Password">
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              type="password"
              required
            />
          </Field>

          {error && (
            <div
              className="rounded-sm px-4 py-3 text-sm"
              style={{
                background: "var(--accent-light)",
                border: "1px solid #E8C4B8",
                color: "var(--accent)",
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 flex items-center justify-center gap-2 text-sm font-medium transition-all rounded-sm group mt-2"
            style={{
              background: loading ? "var(--ink-muted)" : "var(--ink)",
              color: "var(--cream)",
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading
              ? "Working…"
              : mode === "login"
              ? "Sign in to workspace"
              : "Create account"}
            {!loading && (
              <ArrowRight className="h-4 w-4 opacity-60 group-hover:translate-x-0.5 transition-transform" />
            )}
          </button>
        </form>

        <p
          className="mt-8 text-xs text-center leading-relaxed"
          style={{ color: "var(--ink-faint)" }}
        >
          By continuing, you agree to our{" "}
          <a
            href="#"
            style={{ color: "var(--ink-muted)", textDecoration: "underline" }}
          >
            Terms
          </a>{" "}
          and{" "}
          <a
            href="#"
            style={{ color: "var(--ink-muted)", textDecoration: "underline" }}
          >
            Privacy Policy
          </a>
          .
        </p>
      </div>
    </div>
  );
}
