"use client";

import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";

export function LandingView() {
  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{ background: "var(--cream)" }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(700px circle at 10% 10%, rgba(196,80,26,0.08), transparent 55%)",
        }}
      />

      <Navbar variant="landing" className="relative z-10" />

      <main className="relative z-10 max-w-6xl mx-auto px-8 pt-8 pb-28">

        {/* Hero */}
        <section className="grid lg:grid-cols-[1.1fr_0.9fr] gap-16 items-center">
          <div>
            <div
              className="flex items-center gap-3 mb-8"
              style={{ color: "var(--ink-faint)" }}
            >
              <span
                className="text-xs font-mono tracking-widest uppercase"
                style={{ fontFamily: "var(--font-system-mono)", letterSpacing: "0.14em" }}
              >
                01 / Collaborative writing
              </span>
            </div>

            <h1
              className="leading-[1.06] tracking-tight mb-6"
              style={{
                fontFamily: "var(--font-display)",
                color: "var(--ink)",
                fontWeight: 500,
                fontSize: "clamp(3.2rem, 6vw, 4.5rem)",
              }}
            >
              Editorial craft
              <br />
              <em style={{ fontStyle: "italic", color: "var(--accent)" }}>
                for living
              </em>{" "}
              documents.
            </h1>

            <p
              className="text-lg leading-relaxed mb-10 max-w-md"
              style={{ color: "var(--ink-muted)", fontWeight: 300 }}
            >
              A focused writing environment for teams. Real-time collaboration,
              clean typography, and documents that feel worth keeping.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/login"
                className="inline-flex h-11 items-center px-7 text-sm font-medium transition-all rounded-sm"
                style={{ background: "var(--ink)", color: "var(--cream)" }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.background = "var(--accent)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.background = "var(--ink)";
                }}
              >
                Start writing free
              </Link>
              <Link
                href="/login"
                className="inline-flex h-11 items-center px-7 text-sm font-medium transition-all rounded-sm"
                style={{
                  background: "transparent",
                  color: "var(--ink)",
                  border: "1px solid var(--border)",
                }}
              >
                See a demo
              </Link>
              <p className="text-xs" style={{ color: "var(--ink-faint)" }}>
              No credit card required
            </p>
            </div>

            {/* <p className="mt-4 text-xs" style={{ color: "var(--ink-faint)" }}>
              No credit card required
            </p> */}
          </div>

          {/* App preview */}
          <div className="relative">
            <div
              className="relative rounded-sm overflow-hidden"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                boxShadow: "0 2px 4px rgba(26,23,20,0.04), 0 20px 48px rgba(26,23,20,0.10)",
              }}
            >
              <img
                src="/app/landing-page.png"
                alt="Lattice workspace"
                className="w-full block"
              />
              <div
                className="absolute inset-x-0 bottom-0 px-5 py-4"
                style={{
                  background:
                    "linear-gradient(to top, rgba(247,245,240,0.98) 0%, rgba(247,245,240,0) 100%)",
                }}
              >
                <p className="text-xs" style={{ color: "var(--ink-muted)" }}>
                  Live cursors and presence, available instantly across the team.
                </p>
              </div>
            </div>

            {/* Floating label */}
            {/* <div
              className="absolute -bottom-4 -left-4 px-4 py-2 rounded-sm"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                boxShadow: "0 4px 12px rgba(26,23,20,0.08)",
              }}
            > */}
              {/* <span
                className="text-xs font-medium"
                style={{ color: "var(--ink-muted)", fontFamily: "var(--font-system-mono)" }}
              >
                Realtime sync
              </span> */}
              {/* <span
                className="ml-2 inline-block h-1.5 w-1.5 rounded-full align-middle"
                style={{ background: "#4CAF50" }}
              />
            </div> */}
          </div>
        </section>

        {/* Editorial feature list */}
        <section
          className="mt-24 pt-12"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
            {[
              {
                n: "01",
                title: "Real-time editing",
                body: "See every keystroke as it happens. Presence indicators show exactly who is writing where.",
              },
              {
                n: "02",
                title: "Print-ready layout",
                body: "A4 and standard page views with precise typography. What you see is what you print.",
              },
              {
                n: "03",
                title: "Granular sharing",
                body: "Owner, editor, viewer roles. Invite collaborators by email with a single search.",
              },
            ].map((f, i) => (
              <div
                key={f.n}
                className="py-8 pr-10"
                style={{
                  borderRight: i < 2 ? "1px solid var(--border)" : "none",
                  paddingLeft: i === 0 ? 0 : "2.5rem",
                }}
              >
                <span
                  className="block text-xs mb-4"
                  style={{
                    fontFamily: "var(--font-system-mono)",
                    color: "var(--accent)",
                    letterSpacing: "0.1em",
                  }}
                >
                  {f.n}
                </span>
                <h3
                  className="text-base font-medium mb-2"
                  style={{ color: "var(--ink)", fontFamily: "var(--font-display)" }}
                >
                  {f.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--ink-muted)", fontWeight: 300 }}>
                  {f.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* App screenshots + pull quote */}
        <section className="mt-20 grid lg:grid-cols-[1fr_1.1fr] gap-12 items-start">
          <div className="pt-2">
            <h2
              className="text-3xl sm:text-4xl font-medium mb-5 leading-tight"
              style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}
            >
              Built for editors, researchers, and product teams.
            </h2>
            <p className="text-base mb-8" style={{ color: "var(--ink-muted)", fontWeight: 300 }}>
              From first draft to final review, Lattice keeps the document clean,
              structured, and fast. Built-in pagination and export-ready typography
              help teams move quickly.
            </p>
            <ul className="space-y-2">
              {[
                "Presence and cursor awareness",
                "Role-based access controls",
                "Offline-first CRDT merges",
                "Lightweight media attachments",
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-3 text-sm py-2"
                  style={{
                    borderBottom: "1px solid var(--border)",
                    color: "var(--ink-muted)",
                    fontWeight: 300,
                  }}
                >
                  <span
                    className="h-1 w-1 rounded-full shrink-0"
                    style={{ background: "var(--accent)" }}
                  />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              {["/app/home-page.png", "/app/editor-screen.png"].map((src) => (
                <div
                  key={src}
                  className="overflow-hidden rounded-sm"
                  style={{ border: "1px solid var(--border)" }}
                >
                  <img src={src} alt="Lattice preview" className="w-full block" />
                </div>
              ))}
            </div>
            <div
              className="rounded-sm px-6 py-5"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
              }}
            >
              <p
                className="text-sm leading-relaxed mb-3"
                style={{
                  fontFamily: "var(--font-display)",
                  fontStyle: "italic",
                  color: "var(--ink-muted)",
                }}
              >
                "Lattice finally gives us a doc workflow that feels calm. Sharing,
                review, and syncing happen without distractions."
              </p>
              <p className="text-xs" style={{ color: "var(--ink-faint)" }}>
                Anas Khan, Creator
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section
          className="mt-24 rounded-sm px-10 py-12"
          style={{
            background: "var(--ink)",
            color: "var(--cream)",
          }}
        >
          <div className="grid md:grid-cols-[1.5fr_0.5fr] gap-10 items-center">
            <div>
              <p
                className="text-xs uppercase tracking-widest mb-4"
                style={{
                  color: "rgba(247,245,240,0.45)",
                  fontFamily: "var(--font-system-mono)",
                }}
              >
                Ready to start
              </p>
              <h3
                className="text-3xl sm:text-4xl font-medium mb-3 leading-tight"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Build your next document
                <br />
                <em style={{ color: "rgba(196,80,26,0.9)" }}>with shared clarity.</em>
              </h3>
              <p className="text-sm" style={{ color: "rgba(247,245,240,0.55)", fontWeight: 300 }}>
                Spin up a workspace in minutes and invite your team.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <Link
                href="/login"
                className="inline-flex h-11 items-center justify-center px-6 text-sm font-medium transition-all rounded-sm"
                style={{ background: "var(--cream)", color: "var(--ink)" }}
              >
                Create your workspace
              </Link>
              <Link
                href="/login"
                className="inline-flex h-11 items-center justify-center px-6 text-sm font-medium transition-all rounded-sm"
                style={{
                  background: "transparent",
                  color: "var(--cream)",
                  border: "1px solid rgba(247,245,240,0.25)",
                }}
              >
                Talk to the team
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}