"use client";

import { useAuthStore } from "@/store/auth";
import { DashboardView } from "@/components/pages/home/DashboardView";
import { LandingView } from "@/components/pages/home/LandingView";

export function HomeShell() {
  const token = useAuthStore((state) => state.token);

  if (!token) {
    return <LandingView />;
  }

  return <DashboardView />;
}
