"use client";

import { cn } from "@/lib/utils";

type StatusPillProps = {
  status: "connected" | "connecting" | "offline" | "error";
};

const labels: Record<StatusPillProps["status"], string> = {
  connected: "Live",
  connecting: "Syncing",
  offline: "Offline",
  error: "Sync error",
};

const styles: Record<StatusPillProps["status"], { pill: string; dot: string }> = {
  connected: {
    pill: "border-[#B8D8C8] bg-[#EDF6F1] text-[#2A6645]",
    dot: "bg-[#3A9162] shadow-[0_0_0_3px_#B8D8C8]",
  },
  connecting: {
    pill: "border-[#D9C8A0] bg-[#F8F3E6] text-[#7A5E1A]",
    dot: "bg-[#B8860B] animate-pulse",
  },
  offline: {
    pill: "border-[#DDD9D0] bg-[#F4F2EE] text-[#8C8680]",
    dot: "bg-[#C4BFB5]",
  },
  error: {
    pill: "border-[#E8C4B8] bg-[#FAF0EC] text-[#8C3A1A]",
    dot: "bg-[#C4501A]",
  },
};

export function StatusPill({ status }: StatusPillProps) {
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center gap-2 rounded-full border px-3 text-xs font-medium tracking-wide",
        styles[status].pill,
      )}
      style={{ fontFamily: "var(--font-ui, var(--font-system-sans))" }}
    >
      <span
        className={cn("h-1.5 w-1.5 rounded-full shrink-0", styles[status].dot)}
      />
      {labels[status]}
    </span>
  );
}