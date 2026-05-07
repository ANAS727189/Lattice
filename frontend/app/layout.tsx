import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Mono, Playfair_Display } from "next/font/google";
import "./globals.css";

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-ibm-plex-sans",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-ibm-plex-mono",
});

const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-playfair",
});

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
    <html
      lang="en"
      className={`${ibmPlexSans.variable} ${ibmPlexMono.variable} ${playfairDisplay.variable} h-full antialiased`}
    >
      <body
        suppressHydrationWarning
        className="min-h-full flex flex-col"
        style={{
          "--font-system-sans": "var(--font-ibm-plex-sans), -apple-system, sans-serif",
          "--font-display": "var(--font-playfair), Georgia, serif",
          "--font-system-mono": "var(--font-ibm-plex-mono), 'Courier New', monospace",
          fontFamily: "var(--font-system-sans)",
        } as React.CSSProperties}
      >
        {children}
      </body>
    </html>
  );
}