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
            "radial-gradient(700px circle at 10% 10%, rgba(196,80,26,0.12), transparent 55%), radial-gradient(600px circle at 85% 15%, rgba(26,23,20,0.06), transparent 50%), linear-gradient(180deg, rgba(247,245,240,0.9), rgba(247,245,240,0.75))",
        }}
      />

      <Navbar variant="landing" className="relative z-10" />

      <main className="relative z-10 max-w-6xl mx-auto px-8 pt-10 pb-28">
        <section className="grid lg:grid-cols-[1.1fr_0.9fr] gap-16 items-center">
          <div>
            <div
              className="inline-flex items-center gap-2 text-xs font-medium tracking-widest uppercase mb-7"
              style={{ color: "var(--ink-faint)" }}
            >
              <span className="w-6 h-px" style={{ background: "var(--accent)" }} />
              Collaborative writing
            </div>
            <h1
              className="text-6xl sm:text-7xl leading-[1.08] tracking-tight mb-6"
              style={{
                fontFamily: "var(--font-display)",
                color: "var(--ink)",
                fontWeight: 500,
              }}
            >
              Editorial craft
              <br />
              for living documents.
            </h1>
            <p
              className="text-lg leading-relaxed mb-10 max-w-xl"
              style={{ color: "var(--ink-muted)", fontWeight: 300 }}
            >
              Lattice is a focused writing environment built for teams. Real-time
              collaboration, clean typography, and documents that feel worth keeping.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Link
                href="/login"
                className="inline-flex h-11 items-center px-7 text-sm font-medium transition-all rounded-sm"
                style={{ background: "var(--ink)", color: "var(--cream)" }}
              >
                Begin writing - free
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
                Tour the workspace
              </Link>
              <span className="text-sm" style={{ color: "var(--ink-faint)" }}>
                No credit card required
              </span>
            </div>
            {/* <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-6">
              {[
                { label: "Realtime latency", value: "< 80 ms" },
                { label: "Active collaborators", value: "120+" },
                { label: "Documents created", value: "8k+" },
                { label: "Team workspaces", value: "40+" },
              ].map((stat) => (
                <div key={stat.label}>
                  <p
                    className="text-lg font-semibold"
                    style={{ color: "var(--ink)" }}
                  >
                    {stat.value}
                  </p>
                  <p className="text-xs" style={{ color: "var(--ink-faint)" }}>
                    {stat.label}
                  </p>
                </div>
              ))}
            </div> */}
          </div>

          <div
            className="relative rounded-lg overflow-hidden"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              boxShadow: "0 18px 40px rgba(26,23,20,0.12)",
            }}
          >
            <img
              src="/app/landing-page.png"
              alt="Lattice workspace preview"
              className="w-full h-full object-cover"
            />
            <div
              className="absolute inset-x-0 bottom-0 px-6 py-5"
              style={{
                background: "linear-gradient(180deg, rgba(247,245,240,0), rgba(247,245,240,0.95))",
              }}
            >
              <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
                Live cursors, smart pagination, and document presence are available
                instantly across the team.
              </p>
            </div>
          </div>
        </section>

        <section
          className="mt-24 pt-12 grid grid-cols-1 md:grid-cols-3 gap-8"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          {[
            {
              title: "Real-time editing",
              body: "See every keystroke as it happens. Presence indicators show exactly who is writing where.",
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
            <div
              key={feature.title}
              className="rounded-sm p-6"
              style={{
                border: "1px solid var(--border)",
                background: "var(--surface)",
              }}
            >
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
        </section>

        <section
          className="mt-20 grid lg:grid-cols-[1fr_1.1fr] gap-12 items-center"
        >
          <div>
            <h2
              className="text-3xl sm:text-4xl font-medium mb-5"
              style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}
            >
              Designed for editors, researchers, and product teams.
            </h2>
            <p className="text-base" style={{ color: "var(--ink-muted)" }}>
              From first draft to final review, Lattice keeps the document clean,
              structured, and fast. Built-in pagination, export-ready typography,
              and reliable version flows help teams move quickly.
            </p>
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                "Presence and cursor awareness",
                "Role-based access controls",
                "Offline-first CRDT merges",
                "Lightweight media attachments",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-start gap-3 rounded-sm px-4 py-3"
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <span
                    className="mt-1 h-1.5 w-1.5 rounded-full"
                    style={{ background: "var(--accent)" }}
                  />
                  <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
                    {item}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {["/app/home-page.png", "/app/editor-screen.png"].map((src) => (
              <div
                key={src}
                className="overflow-hidden rounded-sm"
                style={{ border: "1px solid var(--border)" }}
              >
                <img src={src} alt="Lattice preview" className="w-full" />
              </div>
            ))}
            <div
              className="col-span-2 rounded-sm p-6"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
              }}
            >
              <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
                "Lattice finally gives us a doc workflow that feels calm. Sharing,
                review, and syncing happen without distractions."
              </p>
              <p
                className="mt-3 text-xs"
                style={{ color: "var(--ink-faint)" }}
              >
                Anas Khan, Creator of this app
              </p>
            </div>
          </div>
        </section>

        <section
          className="mt-24 rounded-lg px-10 py-12"
          style={{
            background: "var(--ink)",
            color: "var(--cream)",
          }}
        >
          <div className="grid md:grid-cols-[1.4fr_0.6fr] gap-8 items-center">
            <div>
              <p className="text-xs uppercase tracking-widest mb-4" style={{ color: "rgba(247,245,240,0.6)" }}>
                Ready to start
              </p>
              <h3
                className="text-3xl sm:text-4xl font-medium mb-4"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Build your next document with shared clarity.
              </h3>
              <p className="text-sm" style={{ color: "rgba(247,245,240,0.7)" }}>
                Spin up a workspace in minutes and invite your team. Lattice keeps
                everything organized from draft to publish.
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
                  border: "1px solid rgba(247,245,240,0.4)",
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
