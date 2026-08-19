import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ShieldAlert } from "lucide-react";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#070a11",
};

export const metadata: Metadata = {
  title: "Market Maker • Institutional & Retail Gold Brokerage Portal",
  description:
    "Institutional & Retail Forex and Gold (XAU/USD) Market Maker brokerage demonstration platform with strict double-entry ledger architecture, server-only financial security, and simulated providers.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans min-h-screen bg-[#070a11] text-slate-100 flex flex-col`}
      >
        {/* Persistent, Non-Dismissible Demonstration Notice */}
        <header
          id="persistent-demo-notice"
          className="sticky top-0 z-50 w-full bg-amber-500/10 border-b border-amber-500/30 backdrop-blur-md px-3 py-1 text-amber-300 text-[10px] sm:text-xs font-medium tracking-wide flex items-center justify-between"
          role="banner"
          aria-label="Demonstration Notice"
        >
          <div className="max-w-7xl mx-auto w-full flex items-center justify-center gap-1.5 text-center leading-tight">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0 animate-pulse" />
            <span>
              <strong className="font-semibold text-amber-200 uppercase tracking-wider">
                Simulated Demo:
              </strong>{" "}
              No real funds involved. All trading &amp; services are simulated.
            </span>
          </div>
        </header>

        {/* Main Application Container */}
        <div className="flex-1 flex flex-col">{children}</div>
      </body>
    </html>
  );
}
