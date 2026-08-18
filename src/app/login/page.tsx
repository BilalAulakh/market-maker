"use client";

import React, { useState } from "react";
import Link from "next/link";
import { signInAction } from "@/app/actions/auth";
import { ClientRefusal, UserRole } from "@/types/auth";
import { RefusalAlert } from "@/components/RefusalAlert";
import { useRouter } from "next/navigation";
import { Lock, Mail, ArrowRight, Loader2, Sparkles, UserCheck } from "lucide-react";

interface DemoAccount {
  label: string;
  role: UserRole;
  email: string;
  desc: string;
}

const DEMO_PRESETS: DemoAccount[] = [
  { label: "Retail Client (Gold Trader)", role: "client", email: "trader@marketmaker.demo", desc: "Trade XAU/USD, deposit, request withdrawals" },
  { label: "Compliance Officer", role: "compliance", email: "compliance@marketmaker.demo", desc: "Review KYC, audit holds & AML" },
  { label: "Operations Staff", role: "operations", email: "ops@marketmaker.demo", desc: "Manage client lifecycle & holds" },
  { label: "Finance / Ledger Admin", role: "finance", email: "finance@marketmaker.demo", desc: "Approve deposits, monitor ledger" },
  { label: "Dealing Desk (Chief Dealer)", role: "dealer", email: "dealer@marketmaker.demo", desc: "Market rates, spreads & execution" },
  { label: "System Administrator", role: "admin", email: "admin@marketmaker.demo", desc: "Full platform governance" },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("trader@marketmaker.demo");
  const [password, setPassword] = useState("DemoTrader123!");
  const [loading, setLoading] = useState(false);
  const [refusal, setRefusal] = useState<ClientRefusal | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setRefusal(null);
    setSuccessMsg(null);

    try {
      const res = await signInAction({ email, password });
      if (!res.success) {
        setRefusal(res);
      } else {
        setSuccessMsg(`Welcome back, ${res.data.profile.first_name}! Redirecting to Trading Terminal...`);
        setTimeout(() => {
          router.push("/trade");
        }, 600);
      }
    } catch {
      setRefusal({
        success: false,
        code: "UNEXPECTED_AUTH_ERROR",
        whatHappened: "An unexpected system error occurred while attempting login.",
        why: "Network connection or server timeout.",
        howToResolve: "Please refresh the page and try logging in again.",
        whereToGo: {
          label: "Reload Login",
          url: "/login",
        },
      });
    } finally {
      setLoading(false);
    }
  };

  const selectPreset = (preset: DemoAccount) => {
    setEmail(preset.email);
    setPassword("DemoTrader123!");
    setRefusal(null);
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 max-w-5xl mx-auto w-full">
      <div className="w-full max-w-md space-y-6">
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-3 h-3" />
            <span>Market Maker Demo Portal</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            Market Maker Sign In
          </h1>
          <p className="text-sm text-slate-400">
            Sign in to access Gold (XAU/USD) trading, ledger records, or dealing desk.
          </p>
        </div>

        {/* Refusal / Error Display (Rule 6 compliant) */}
        {refusal && <RefusalAlert refusal={refusal} />}

        {/* Success Alert */}
        {successMsg && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4 text-emerald-300 text-sm flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Login Form Card */}
        <div className="bg-slate-900/70 border border-slate-800 p-6 md:p-8 rounded-2xl shadow-xl backdrop-blur-md">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-slate-950/60 border border-slate-700/80 rounded-lg pl-10 pr-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-slate-950/60 border border-slate-700/80 rounded-lg pl-10 pr-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-sm transition-all shadow-lg shadow-emerald-500/10 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-800 text-center text-xs text-slate-400">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="text-emerald-400 hover:text-emerald-300 font-semibold transition-colors"
            >
              Create Client Account
            </Link>
          </div>
        </div>

        {/* Demo Role Switcher Presets */}
        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
            <span>Quick Demo Role Presets:</span>
            <span className="text-[10px] text-slate-400">Click to fill</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {DEMO_PRESETS.map((p) => (
              <button
                key={p.role}
                type="button"
                onClick={() => selectPreset(p)}
                className="text-left p-2 rounded-lg bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-slate-700 transition-all text-xs group"
              >
                <div className="font-semibold text-slate-200 group-hover:text-emerald-400 transition-colors">
                  {p.label}
                </div>
                <div className="text-[10px] text-slate-400 truncate">{p.desc}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
