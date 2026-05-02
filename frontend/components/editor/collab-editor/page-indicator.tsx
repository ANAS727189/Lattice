import type { PageLayout, PageStats } from "@/components/editor/collab-editor/constants";
import { PAGE_METRICS } from "@/components/editor/collab-editor/constants";

export function PageIndicator({
  pageLayout,
  pageStats,
}: {
  pageLayout: PageLayout;
  pageStats: PageStats;
}) {
  return (
    <div
      className="pointer-events-none sticky top-5 z-10 ml-auto mr-4 hidden w-24 lg:block"
      style={{ float: "right" }}
    >
      <div
        className="rounded-sm px-3 py-2.5 text-xs"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          color: "var(--ink-muted)",
        }}
      >
        <div className="font-medium" style={{ color: "var(--ink)" }}>
          Page {pageStats.current}
        </div>
        <div className="mt-0.5">of {pageStats.total}</div>
        <div
          className="mt-2 pt-2 text-[10px] uppercase tracking-widest"
          style={{
            borderTop: "1px solid var(--border)",
            color: "var(--ink-faint)",
          }}
        >
          {PAGE_METRICS[pageLayout].label}
        </div>
      </div>
    </div>
  );
}
