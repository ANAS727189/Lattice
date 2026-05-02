import { FileText, RefreshCcw } from "lucide-react";
import Link from "next/link";

export function DocumentLoadingState() {
  return (
    <div
      className="flex min-h-screen items-center justify-center"
      style={{ background: "var(--cream)" }}
    >
      <div
        className="flex items-center gap-3 text-sm"
        style={{ color: "var(--ink-muted)" }}
      >
        <RefreshCcw className="h-4 w-4 animate-spin" />
        <span>Opening document…</span>
      </div>
    </div>
  );
}

export function DocumentErrorState({ error }: { error: string }) {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center p-6 text-center"
      style={{ background: "var(--cream)" }}
    >
      <div
        className="mb-4 flex h-12 w-12 items-center justify-center rounded-sm"
        style={{ background: "var(--accent-light)", border: "1px solid #E8C4B8" }}
      >
        <FileText className="h-6 w-6" style={{ color: "var(--accent)" }} />
      </div>
      <h1
        className="text-lg font-medium mb-2"
        style={{ color: "var(--ink)", fontFamily: "var(--font-display)" }}
      >
        Access denied or not found
      </h1>
      <p className="text-sm mb-6" style={{ color: "var(--ink-muted)" }}>
        {error}
      </p>
      <Link
        href="/"
        className="inline-flex h-9 items-center px-5 text-sm font-medium rounded-sm transition-colors"
        style={{ background: "var(--ink)", color: "var(--cream)" }}
      >
        Return to dashboard
      </Link>
    </div>
  );
}
