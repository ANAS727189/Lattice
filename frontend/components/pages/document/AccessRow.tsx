import type React from "react";

export function AccessRow({
  name,
  email,
  role,
  action,
}: {
  name: string;
  email: string;
  role: string;
  action?: React.ReactNode;
}) {
  return (
    <div
      className="flex items-center justify-between gap-3 rounded-sm px-3 py-2.5 sm:px-4"
      style={{
        border: "1px solid var(--border)",
        background: "var(--surface)",
      }}
    >
      <div className="min-w-0 flex-1">
        <p
          className="truncate text-sm font-medium"
          style={{ color: "var(--ink)" }}
        >
          {name}
        </p>
        <p className="truncate text-xs" style={{ color: "var(--ink-faint)" }}>
          {email}
        </p>
      </div>
      <div className="ml-3 flex items-center gap-2 shrink-0">
        <span
          className="text-xs capitalize px-2 py-0.5 rounded-sm"
          style={{
            background: "var(--cream-dark)",
            color: "var(--ink-muted)",
            border: "1px solid var(--border)",
          }}
        >
          {role}
        </span>
        {action}
      </div>
    </div>
  );
}
