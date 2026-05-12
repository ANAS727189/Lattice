"use client";

import { useAuthStore } from "@/store/auth";
import { DashboardView } from "@/components/pages/home/DashboardView";
import { LandingView } from "@/components/pages/home/LandingView";

export function HomeShell() {
  const token = useAuthStore((state) => state.token);
  const hasHydrated = useAuthStore((state) => state._hasHydrated);

  // Prevent render until store is hydrated from localStorage
  if (!hasHydrated) {
    return null;
  }

  if (!token) {
    return <LandingView />;
  }

  return <DashboardView />;
}
