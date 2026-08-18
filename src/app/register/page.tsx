"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signUpAction, signInAction } from "@/app/actions/auth";
import { ClientRefusal } from "@/types/auth";
import { RefusalAlert } from "@/components/RefusalAlert";
import { Lock, Mail, User, ArrowRight, Loader2, Sparkles, Zap, CheckCircle2 } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("Alexander");
  const [lastName, setLastName] = useState("Wright");
  const [email, setEmail] = useState("trader@marketmaker.demo");
  const [password, setPassword] = useState("DemoTrader123!");
  const [country, setCountry] = useState("United Kingdom");
  const [loading, setLoading] = useState(false);
  const [refusal, setRefusal] = useState<ClientRefusal | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setRefusal(null);
    setSuccessMsg(null);

    try {
      const res = await signUpAction({
        email,
        password,
        firstName,
        lastName,
        country,
      });

      if (!res.success) {
        setRefusal(res);
      } else {
        setSuccessMsg("Account created successfully! Signing in...");
        // Auto sign in to establish session
        await signInAction({ email, password });
        setTimeout(() => {
          router.push("/trade");
        }, 800);
      }
    } catch {
      // Direct demo fallback
      router.push("/trade");
    } finally {
      setLoading(false);
    }
  };

  const handleInstantDemo = () => {
    router.push("/trade");
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 max-w-5xl mx-auto w-full">
      <div className="w-full max-w-md space-y-6">
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-3 h-3" />
            <span>Instant Registration &amp; Onboarding</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            Open Gold Trading Account
          </h1>
          <p className="text-sm text-slate-400">
            Create an account to start trading Gold (XAU/USD) with double-entry ledger protection.
          </p>
        </div>

        {/* 1-Click Instant Demo Button */}
        <button
          type="button"
          onClick={handleInstantDemo}
          className="w-full p-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-sm shadow-xl shadow-amber-500/20 inline-flex items-center justify-center gap-2 transition-all hover:scale-[1.02] cursor-pointer"
        >
          <Zap className="w-4 h-4 fill-slate-950" />
          <span>Instant 1-Click Demo ($10,000 Equity)</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 text-xs text-slate-500 uppercase font-mono">
          <div className="h-[1px] flex-1 bg-slate-800" />
          <span>Or Create New Account</span>
          <div className="h-[1px] flex-1 bg-slate-800" />
        </div>

        {/* Refusal / Error Display */}
        {refusal && <RefusalAlert refusal={refusal} />}

        {/* Success Alert */}
        {successMsg && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4 text-emerald-300 text-sm flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Registration Form Card */}
        <div className="bg-slate-900/70 border border-slate-800 p-6 md:p-8 rounded-2xl shadow-xl backdrop-blur-md">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  First Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Alexander"
                    className="w-full bg-slate-950/60 border border-slate-700/80 rounded-lg pl-10 pr-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Last Name
                </label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Wright"
                  className="w-full bg-slate-950/60 border border-slate-700/80 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                />
              </div>
            </div>

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
                  placeholder="trader@marketmaker.demo"
                  className="w-full bg-slate-950/60 border border-slate-700/80 rounded-lg pl-10 pr-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Country of Residence
              </label>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full bg-slate-950/60 border border-slate-700/80 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
              >
                <option value="United Kingdom">United Kingdom</option>
                <option value="United Arab Emirates">United Arab Emirates</option>
                <option value="Pakistan">Pakistan</option>
                <option value="Saudi Arabia">Saudi Arabia</option>
                <option value="Singapore">Singapore</option>
                <option value="Germany">Germany</option>
                <option value="Canada">Canada</option>
              </select>
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
                  className="w-full bg-slate-950/60 border border-slate-700/80 rounded-lg pl-10 pr-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-sm transition-all shadow-lg shadow-amber-500/10 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <span>Create Account &amp; Start Trading</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-800 text-center text-xs text-slate-400">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-amber-400 hover:text-amber-300 font-semibold transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
