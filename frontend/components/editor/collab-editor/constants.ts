export type PageLayout = "standard" | "a4";

export type PageStats = {
  current: number;
  total: number;
};

export const PAGE_METRICS: Record<PageLayout, { height: number; label: string }> = {
  a4: { height: 1123, label: "A4" },
  standard: { height: 920, label: "Standard" },
};
