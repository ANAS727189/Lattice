import { cn } from "@/lib/utils";

type StatusPillProps = {
  status: "connected" | "connecting" | "offline" | "error";
};

const labels = {
  connected: "Live",
  connecting: "Connecting",
  offline: "Offline",
  error: "Sync issue",
};

const styles = {
  connected: "border-emerald-200 bg-emerald-50 text-emerald-700",
  connecting: "border-amber-200 bg-amber-50 text-amber-700",
  offline: "border-zinc-200 bg-zinc-50 text-zinc-500",
  error: "border-red-200 bg-red-50 text-red-700",
};

export function StatusPill({ status }: StatusPillProps) {
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center gap-2 rounded-full border px-2.5 text-xs font-medium",
        styles[status],
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {labels[status]}
    </span>
  );
}
