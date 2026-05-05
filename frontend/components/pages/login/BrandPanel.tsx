"use client";

import { useRouter } from "next/navigation";

export function BrandPanel() {
  const router = useRouter();

  return (
    <div
      className="hidden lg:flex lg:w-[45%] flex-col justify-between p-14 relative overflow-hidden"
      style={{ background: "var(--ink)" }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(ellipse at 20% 80%, rgba(196,80,26,0.18) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(196,80,26,0.08) 0%, transparent 50%)",
        }}
      />

      <button
        onClick={() => router.push("/")}
        className="relative z-10 flex items-center gap-3 w-fit"
      >
        <img
          src="/favicon.ico"
          alt="Lattice logo"
          className="h-7 w-7"
        />
        <span
          className="text-xl font-medium tracking-tight"
          style={{
            fontFamily: "var(--font-display)",
            color: "var(--cream)",
          }}
        >
          Lattice
        </span>
      </button>

      <div className="relative z-10 max-w-sm">
        <div
          className="text-3xl leading-snug font-light mb-8"
          style={{
            fontFamily: "var(--font-display)",
            color: "var(--cream)",
            fontStyle: "italic",
          }}
        >
          "Writing is thinking. To write well is to think clearly."
        </div>
        <p
          className="text-sm font-light"
          style={{ color: "rgba(247,245,240,0.4)" }}
        >
          — David McCullough
        </p>
      </div>

      <div
        className="relative z-10 flex items-center gap-6 text-xs"
        style={{ color: "rgba(247,245,240,0.3)" }}
      >
        <span>© 2026 Lattice</span>
        <a
          href="#"
          className="transition-colors hover:text-white"
          style={{ color: "inherit" }}
        >
          Privacy
        </a>
        <a
          href="#"
          className="transition-colors hover:text-white"
          style={{ color: "inherit" }}
        >
          Terms
        </a>
      </div>
    </div>
  );
}
