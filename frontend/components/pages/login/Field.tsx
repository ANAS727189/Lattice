import type React from "react";

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactElement<React.InputHTMLAttributes<HTMLInputElement>>;
}) {
  return (
    <div className="space-y-1.5">
      <label
        className="block text-xs font-medium uppercase tracking-wider"
        style={{ color: "var(--ink-muted)" }}
      >
        {label}
      </label>
      {(() => {
        const child =
          children as React.ReactElement<
            React.InputHTMLAttributes<HTMLInputElement> & {
              style?: React.CSSProperties;
              className?: string;
              onFocus?: React.FocusEventHandler<HTMLInputElement>;
              onBlur?: React.FocusEventHandler<HTMLInputElement>;
            }
          >;
        return (
          <input
            {...(child.props as React.InputHTMLAttributes<HTMLInputElement>)}
            className="w-full h-10 px-3 text-sm outline-none transition-all rounded-sm"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              color: "var(--ink)",
              fontFamily: "inherit",
            }}
            onFocus={(e) => {
              e.target.style.borderColor = "var(--ink)";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "var(--border)";
            }}
          />
        );
      })()}
    </div>
  );
}
