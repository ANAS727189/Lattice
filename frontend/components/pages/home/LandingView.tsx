"use client";

import Link from "next/link";

export function LandingView() {
  return (
    <div className="min-h-screen" style={{ background: "var(--cream)" }}>
      <header
        className="flex h-16 items-center justify-between px-8"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-3">
          <img
            src="/favicon.ico"
            alt="Lattice logo"
            className="h-7 w-7"
          />
          <span
            className="text-lg font-medium tracking-tight"
            style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}
          >
            Lattice
          </span>
        </div>
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

      <main className="max-w-5xl mx-auto px-8 pt-28 pb-32">
        <div className="max-w-3xl">
          <div
            className="inline-flex items-center gap-2 text-xs font-medium tracking-widest uppercase mb-8"
            style={{ color: "var(--ink-faint)" }}
          >
            <span className="w-6 h-px" style={{ background: "var(--accent)" }} />
            Collaborative writing
          </div>
          <h1
            className="text-6xl sm:text-7xl leading-[1.08] tracking-tight mb-8"
            style={{
              fontFamily: "var(--font-display)",
              color: "var(--ink)",
              fontWeight: 500,
            }}
          >
            Where ideas
            <br />
            <em style={{ color: "var(--accent)", fontStyle: "italic" }}>
              come together.
            </em>
          </h1>
          <p
            className="text-lg leading-relaxed mb-12 max-w-xl"
            style={{ color: "var(--ink-muted)", fontWeight: 300 }}
          >
            Lattice is a focused writing environment built for teams. Real-time
            collaboration, clean typography, and documents that feel worth keeping.
          </p>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="inline-flex h-11 items-center px-7 text-sm font-medium transition-all rounded-sm"
              style={{ background: "var(--ink)", color: "var(--cream)" }}
            >
              Begin writing — free
            </Link>
            <span className="text-sm" style={{ color: "var(--ink-faint)" }}>
              No credit card required
            </span>
          </div>
        </div>

        <div
          className="mt-24 pt-12 grid grid-cols-1 sm:grid-cols-3 gap-8"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          {[
            {
              title: "Real-time editing",
              body: "See every keystroke as it happens. Presence indicators show exactly who's writing where.",
            },
            {
              title: "Print-ready layout",
              body: "A4 and standard page views with precise typography. What you see is what you print.",
            },
            {
              title: "Granular sharing",
              body: "Owner, editor, viewer roles. Invite collaborators by email with a single search.",
            },
          ].map((feature) => (
            <div key={feature.title}>
              <h3
                className="text-sm font-semibold mb-2"
                style={{ color: "var(--ink)" }}
              >
                {feature.title}
              </h3>
              <p
                className="text-sm leading-relaxed"
                style={{ color: "var(--ink-muted)", fontWeight: 300 }}
              >
                {feature.body}
              </p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
