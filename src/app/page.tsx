import Link from "next/link";
import {
  Database,
  Lock,
  Code2,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  Zap,
} from "lucide-react";

export default function Home() {
  return (
    <div className="flex-1 flex flex-col">
      {/* Navigation Header */}
      <nav className="w-full border-b border-slate-800/80 bg-slate-950/50 backdrop-blur-md px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center font-black text-slate-950 text-sm shadow-lg shadow-amber-500/20">
              MM
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight text-white">Market Maker</span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 ml-2 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300">
                Gold &amp; FX Broker
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/trade"
              className="px-4 py-2 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all shadow-md shadow-amber-500/10 inline-flex items-center gap-1.5"
            >
              <Zap className="w-3.5 h-3.5 fill-slate-950" />
              <span>Gold Terminal</span>
            </Link>
            <Link
              href="/ledger"
              className="px-4 py-2 rounded-lg text-xs font-semibold text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/20 border border-emerald-500/30 transition-all inline-flex items-center gap-1.5"
            >
              <Database className="w-3.5 h-3.5" />
              <span>Ledger</span>
            </Link>
            <Link
              href="/login"
              className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-900 border border-transparent hover:border-slate-800 transition-all"
            >
              Sign In
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12 md:py-16 max-w-6xl mx-auto w-full">
        {/* Live Gold Ticker Hero Badge */}
        <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-slate-900/90 border border-amber-500/40 text-xs font-mono font-semibold text-white shadow-xl shadow-amber-500/5 mb-6">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-amber-300 font-bold uppercase tracking-wider">XAU/USD Gold Spot:</span>
          <span className="text-white font-bold">$4,349.78</span>
          <span className="text-rose-400 font-bold bg-rose-500/20 px-1.5 py-0.5 rounded text-[10px]">
            -0.03% (Market Live)
          </span>
        </div>

        {/* Main Title & Subtitle */}
        <h1 className="text-4xl md:text-6xl font-extrabold text-center tracking-tight text-white max-w-4xl leading-tight">
          Trade Gold (XAU/USD) with Market Maker Execution
        </h1>
        <p className="mt-4 text-base md:text-lg text-slate-400 text-center max-w-2xl leading-relaxed">
          Institutional Gold &amp; Forex trading portal featuring real-time interactive candlestick charts, 1-click Buy/Sell execution, and strict double-entry ledger security.
        </p>

        {/* Big Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4 mt-8">
          <Link
            href="/trade"
            className="px-8 py-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-base shadow-2xl shadow-amber-500/30 inline-flex items-center gap-3 transition-all hover:scale-105 cursor-pointer"
          >
            <TrendingUp className="w-5 h-5" />
            <span>Launch Gold Trading Terminal (XAU/USD)</span>
            <ArrowRight className="w-5 h-5" />
          </Link>
          <Link
            href="/ledger"
            className="px-6 py-4 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-white font-semibold text-sm inline-flex items-center gap-2 transition-all"
          >
            <Database className="w-4 h-4 text-emerald-400" />
            <span>View Double-Entry Ledger</span>
          </Link>
        </div>

        {/* Features Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-14 w-full">
          {/* Feature 1 */}
          <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all shadow-lg backdrop-blur-sm flex flex-col">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-4">
              <Zap className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-white tracking-wide">1-Click Gold Execution</h2>
            <p className="text-sm text-slate-400 mt-2 leading-relaxed flex-1">
              Real-time spot quotes with institutional spreads. Trade 0.01 to 10.0 lots with instant execution and live floating PnL.
            </p>
            <div className="mt-4 pt-4 border-t border-slate-800/80 flex items-center gap-2 text-xs font-mono text-amber-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Live Tick Stream Active</span>
            </div>
          </div>

          {/* Feature 2 */}
          <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all shadow-lg backdrop-blur-sm flex flex-col">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4">
              <Lock className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-white tracking-wide">Double-Entry Ledger Core</h2>
            <p className="text-sm text-slate-400 mt-2 leading-relaxed flex-1">
              Zero mutable balance columns. Every closed position settles debits and credits symmetrically at the database level.
            </p>
            <div className="mt-4 pt-4 border-t border-slate-800/80 flex items-center gap-2 text-xs font-mono text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Debits = Credits Enforced</span>
            </div>
          </div>

          {/* Feature 3 */}
          <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all shadow-lg backdrop-blur-sm flex flex-col">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-4">
              <Code2 className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-white tracking-wide">Exact Decimal Math</h2>
            <p className="text-sm text-slate-400 mt-2 leading-relaxed flex-1">
              End-to-end 28-digit precision string arithmetic. Zero JavaScript floating point errors or rounding drift on money.
            </p>
            <div className="mt-4 pt-4 border-t border-slate-800/80 flex items-center gap-2 text-xs font-mono text-blue-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Exact Decimal Engine</span>
            </div>
          </div>
        </div>

        {/* Demo Trader Active Banner */}
        <div className="mt-10 w-full p-5 rounded-2xl bg-gradient-to-r from-slate-900/90 via-slate-900 to-slate-950 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs uppercase font-bold text-emerald-400 tracking-wider">
                Instant Demo Mode Active
              </div>
              <div className="text-sm font-semibold text-white">
                Pre-funded with $10,000 Demo Capital • 1:100 Leverage
              </div>
            </div>
          </div>

          <Link
            href="/trade"
            className="px-5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs inline-flex items-center gap-1.5 transition-all"
          >
            <span>Start Trading Now</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </main>
    </div>
  );
}
