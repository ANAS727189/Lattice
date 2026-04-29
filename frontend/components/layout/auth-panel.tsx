"use client";

import { FormEvent, useState } from "react";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { login, register } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import type { AuthMode } from "@/types/types";

export function AuthPanel() {
  const setToken = useAuthStore(state => state.setToken);
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("ada@example.com");
  const [name, setName] = useState("Ada Lovelace");
  const [password, setPassword] = useState("correct-horse-battery-staple");
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
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen bg-zinc-50 text-zinc-950">
      <section className="flex flex-1 items-center justify-center px-6 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-zinc-950 text-white">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">Lattice Docs</h1>
              <p className="text-sm text-zinc-500">Collaborative editing workspace</p>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="rounded-md border border-zinc-200 bg-white p-5 shadow-sm"
          >
            <div className="mb-5 grid grid-cols-2 rounded-md bg-zinc-100 p-1">
              <button
                type="button"
                onClick={() => setMode("login")}
                className={`h-8 rounded text-sm font-medium ${
                  mode === "login" ? "bg-white text-zinc-950 shadow-sm" : "text-zinc-500"
                }`}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => setMode("register")}
                className={`h-8 rounded text-sm font-medium ${
                  mode === "register" ? "bg-white text-zinc-950 shadow-sm" : "text-zinc-500"
                }`}
              >
                Register
              </button>
            </div>

            <div className="space-y-3">
              {mode === "register" && (
                <Input
                  value={name}
                  onChange={event => setName(event.target.value)}
                  placeholder="Display name"
                />
              )}
              <Input
                value={email}
                onChange={event => setEmail(event.target.value)}
                placeholder="Email"
                type="email"
              />
              <Input
                value={password}
                onChange={event => setPassword(event.target.value)}
                placeholder="Password"
                type="password"
              />
            </div>

            {error && (
              <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}

            <Button
              type="submit"
              variant="primary"
              className="mt-5 w-full"
              disabled={loading}
            >
              {loading ? "Working..." : mode === "login" ? "Open workspace" : "Create account"}
            </Button>
          </form>
        </div>
      </section>
    </main>
  );
}
