import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lattice",
  description: "Realtime collaborative document editor",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body
        suppressHydrationWarning
        className="min-h-full flex flex-col"
        style={{
          "--font-system-sans": "var(--font-ui), -apple-system, system-ui, sans-serif",
          "--font-display": "var(--font-editorial), Georgia, serif",
          "--font-system-mono": "var(--font-mono), ui-monospace, SFMono-Regular, Menlo, monospace",
          fontFamily: "var(--font-system-sans)",
        } as React.CSSProperties}
      >
        {children}
      </body>
    </html>
  );
}