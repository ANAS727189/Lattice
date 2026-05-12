"use client";

import Link from "next/link";
import { LogOut, Search } from "lucide-react";

const logo = (
  <div className="flex items-center gap-3">
    <img src="/favicon.ico" alt="Lattice logo" className="h-7 w-7" />
    <span
      className="text-lg font-medium tracking-tight"
      style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}
    >
      Lattice
    </span>
  </div>
);

type LandingNavbarProps = {
  variant: "landing";
  className?: string;
};

type DashboardNavbarProps = {
  variant: "dashboard";
  className?: string;
  query: string;
  onQueryChange: (value: string) => void;
  onLogout: () => void;
  profileName: string;
  profileEmail: string;
};

type NavbarProps = LandingNavbarProps | DashboardNavbarProps;

export function Navbar(props: NavbarProps) {
  if (props.variant === "landing") {
    return (
      <header
        className={`flex h-16 items-center justify-between px-8 ${props.className ?? ""}`.trim()}
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        {logo}
        <div className="flex items-center gap-6">
          <Link
            href="/login"
            className="text-sm transition-colors"
            style={{ color: "var(--ink-muted)" }}
          >
            Sign in
          </Link>
          <Link
            href="/login"
            className="inline-flex h-9 items-center px-5 text-sm font-medium transition-all rounded-sm"
            style={{
              background: "var(--ink)",
              color: "var(--cream)",
            }}
          >
            Start writing
          </Link>
        </div>
      </header>
    );
  }

  return (
    <header
      className={`sticky top-0 z-10 flex h-14 items-center justify-between px-6 ${props.className ?? ""}`.trim()}
      style={{
        background: "var(--surface)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div className="flex items-center gap-6">
        {logo}
        <div className="hidden md:flex items-center relative">
          <Search
            className="absolute left-3 h-3.5 w-3.5"
            style={{ color: "var(--ink-faint)" }}
          />
          <input
            className="w-64 pl-9 pr-4 h-8 text-sm rounded-sm outline-none transition-all"
            style={{
              background: "var(--cream)",
              border: "1px solid var(--border)",
              color: "var(--ink)",
              fontFamily: "inherit",
            }}
            placeholder="Search documents…"
            value={props.query}
            onChange={(e) => props.onQueryChange(e.target.value)}
            onFocus={(e) => {
              e.target.style.borderColor = "var(--ink-faint)";
              e.target.style.background = "var(--surface)";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "var(--border)";
              e.target.style.background = "var(--cream)";
            }}
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Link
          href="/profile"
          title="Profile"
          className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold transition-opacity"
          style={{
            background: "var(--ink)",
            color: "var(--cream)",
            fontFamily: "var(--font-ui)",
          }}
        >
          {getProfileInitial(props.profileName, props.profileEmail)}
        </Link>
        <button
          title="Sign out"
          onClick={props.onLogout}
          className="h-7 w-7 flex items-center justify-center rounded-sm transition-colors"
          style={{ color: "var(--ink-faint)" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = "var(--ink)";
            (e.currentTarget as HTMLButtonElement).style.background =
              "var(--cream-dark)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color =
              "var(--ink-faint)";
            (e.currentTarget as HTMLButtonElement).style.background =
              "transparent";
          }}
        >
          <LogOut className="h-3.5 w-3.5" />
        </button>
      </div>
    </header>
  );
}

function getProfileInitial(name: string, email: string) {
  const source = name.trim() || email.trim();
  if (!source) {
    return "?";
  }
  return source[0].toUpperCase();
}
