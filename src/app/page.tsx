"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Database,
  Lock,
  Code2,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  Zap,
  Sparkles,
  Menu,
  X,
  Wallet,
  LogIn,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex-1 flex flex-col">
      {/* Navigation Header */}
      <nav className="w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md px-4 sm:px-6 py-3.5 sticky top-6 z-40">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center font-black text-slate-950 text-xs sm:text-sm shadow-lg shadow-amber-500/20 shrink-0">
              MM
            </div>
            <div>
              <span className="font-extrabold text-base sm:text-lg tracking-tight text-white">Market Maker</span>
              <span className="hidden xs:inline-block text-[10px] uppercase font-mono px-1.5 py-0.5 ml-2 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 font-bold">
                Gold &amp; FX
              </span>
            </div>
          </div>

          {/* Desktop Nav Actions */}
          <div className="hidden md:flex items-center gap-2.5 lg:gap-3">
            <Link
              href="/trade"
              className="px-3.5 lg:px-4 py-2 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all shadow-md shadow-amber-500/10 inline-flex items-center gap-1.5"
            >
              <Zap className="w-3.5 h-3.5 fill-slate-950" />
              <span>Gold Terminal</span>
            </Link>
            <Link
              href="/wallet"
              className="px-3.5 lg:px-4 py-2 rounded-lg text-xs font-semibold text-cyan-400 hover:text-cyan-300 hover:bg-cyan-950/20 border border-cyan-500/30 transition-all inline-flex items-center gap-1.5"
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>Deposit / Vault</span>
            </Link>
            <Link
              href="/ledger"
              className="px-3.5 lg:px-4 py-2 rounded-lg text-xs font-semibold text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/20 border border-emerald-500/30 transition-all inline-flex items-center gap-1.5"
            >
              <Database className="w-3.5 h-3.5" />
              <span>Ledger</span>
            </Link>
            <Link
              href="/admin"
              className="px-3.5 lg:px-4 py-2 rounded-lg text-xs font-semibold text-purple-300 hover:text-white hover:bg-purple-950/30 border border-purple-500/30 transition-all inline-flex items-center gap-1"
            >
              <Lock className="w-3.5 h-3.5 text-purple-400" />
              <span>Admin</span>
            </Link>
            <Link
              href="/login"
              className="px-3.5 lg:px-4 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-900 border border-transparent hover:border-slate-800 transition-all inline-flex items-center gap-1"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </Link>
            <ThemeToggle />
          </div>

          {/* Mobile Actions: Fast Trade Button + Menu Toggle */}
          <div className="flex md:hidden items-center gap-2">
            <Link
              href="/trade"
              className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-amber-500 text-slate-950 inline-flex items-center gap-1"
            >
              <Zap className="w-3 h-3 fill-slate-950" />
              <span>Trade</span>
            </Link>
            <ThemeToggle />
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white cursor-pointer"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-3 pt-3 border-t border-slate-800 flex flex-col gap-2 animate-in fade-in slide-in-from-top-2">
            <Link
              href="/trade"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full py-2.5 px-3 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>Gold Trading Terminal (XAU/USD)</span>
              </span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/wallet"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full py-2.5 px-3 rounded-lg bg-slate-900 text-cyan-400 border border-slate-800 text-xs font-semibold flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-cyan-400" />
                <span>Deposit &amp; Vault</span>
              </span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/ledger"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full py-2.5 px-3 rounded-lg bg-slate-900 text-emerald-400 border border-slate-800 text-xs font-semibold flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-400" />
                <span>Double-Entry Ledger Audit</span>
              </span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full py-2.5 px-3 rounded-lg bg-slate-900 text-purple-300 border border-purple-800/60 text-xs font-semibold flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-purple-400" />
                <span>Institutional Admin Portal</span>
              </span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full py-2.5 px-3 rounded-lg bg-slate-900 text-slate-200 border border-slate-800 text-xs font-semibold flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                <LogIn className="w-4 h-4 text-slate-400" />
                <span>Trader Sign In</span>
              </span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-8 sm:py-12 md:py-16 max-w-6xl mx-auto w-full">
        {/* Live Gold Ticker Hero Badge */}
        <div className="inline-flex flex-wrap items-center justify-center gap-2 px-3.5 sm:px-4 py-2 rounded-full bg-slate-900/90 border border-amber-500/40 text-[11px] sm:text-xs font-mono font-semibold text-white shadow-xl shadow-amber-500/5 mb-6 text-center">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
          <span className="text-amber-300 font-bold uppercase tracking-wider">XAU/USD Gold:</span>
          <span className="text-white font-bold">$4,349.78</span>
          <span className="text-rose-400 font-bold bg-rose-500/20 px-1.5 py-0.5 rounded text-[10px]">
            -0.03% (Live)
          </span>
        </div>

        {/* Main Title & Subtitle */}
        <h1 className="text-2xl sm:text-3xl md:text-5xl font-extrabold text-center tracking-tight text-white max-w-3xl leading-tight sm:leading-snug">
          Trade Gold (XAU/USD) with Market Maker Execution
        </h1>
        <p className="mt-3 sm:mt-4 text-xs sm:text-sm md:text-base text-slate-400 text-center max-w-xl leading-relaxed px-2">
          Institutional Gold &amp; Forex trading portal featuring real-time interactive candlestick charts, 1-click Buy/Sell execution, and strict double-entry ledger security.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-6 sm:mt-8 w-full sm:w-auto px-4">
          <Link
            href="/trade"
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-extrabold text-xs sm:text-sm shadow-lg shadow-amber-500/20 inline-flex items-center justify-center gap-2 transition-all hover:scale-[1.02] cursor-pointer"
          >
            <TrendingUp className="w-4 h-4" />
            <span>Launch Gold Trading Terminal</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/ledger"
            className="w-full sm:w-auto px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white font-semibold text-xs sm:text-sm inline-flex items-center justify-center gap-2 transition-all"
          >
            <Database className="w-4 h-4 text-emerald-400" />
            <span>View Double-Entry Ledger</span>
          </Link>
        </div>

        {/* Features Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mt-10 sm:mt-14 w-full">
          {/* Feature 1 */}
          <div className="p-5 sm:p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all shadow-lg backdrop-blur-sm flex flex-col">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-4">
              <Zap className="w-5 h-5" />
            </div>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">1-Click Gold Execution</h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-2 leading-relaxed flex-1">
              Real-time spot quotes with institutional spreads. Trade 0.01 to 10.0 lots with instant execution and live floating PnL.
            </p>
            <div className="mt-4 pt-4 border-t border-slate-800/80 flex items-center gap-2 text-xs font-mono text-amber-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Live Tick Stream Active</span>
            </div>
          </div>

          {/* Feature 2 */}
          <div className="p-5 sm:p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all shadow-lg backdrop-blur-sm flex flex-col">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4">
              <Lock className="w-5 h-5" />
            </div>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">Double-Entry Ledger Core</h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-2 leading-relaxed flex-1">
              Zero mutable balance columns. Every closed position settles debits and credits symmetrically at the database level.
            </p>
            <div className="mt-4 pt-4 border-t border-slate-800/80 flex items-center gap-2 text-xs font-mono text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Debits = Credits Enforced</span>
            </div>
          </div>

          {/* Feature 3 */}
          <div className="p-5 sm:p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all shadow-lg backdrop-blur-sm flex flex-col">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-4">
              <Code2 className="w-5 h-5" />
            </div>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">Exact Decimal Math</h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-2 leading-relaxed flex-1">
              End-to-end 28-digit precision string arithmetic. Zero JavaScript floating point errors or rounding drift on money.
            </p>
            <div className="mt-4 pt-4 border-t border-slate-800/80 flex items-center gap-2 text-xs font-mono text-blue-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Exact Decimal Engine</span>
            </div>
          </div>
        </div>

        {/* Demo Trader Active Banner */}
        <div className="mt-8 sm:mt-10 w-full p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-900/90 via-slate-900 to-slate-950 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs uppercase font-bold text-emerald-400 tracking-wider">
                Instant Demo Mode Active
              </div>
              <div className="text-xs sm:text-sm font-semibold text-white">
                Pre-funded with $10,000 Demo Capital • 1:100 Leverage
              </div>
            </div>
          </div>

          <Link
            href="/trade"
            className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs inline-flex items-center justify-center gap-1.5 transition-all"
          >
            <span>Start Trading Now</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </main>
    </div>
  );
}

