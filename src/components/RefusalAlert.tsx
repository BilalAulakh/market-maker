import React from "react";
import { AlertTriangle, ArrowRight, HelpCircle, CheckCircle2 } from "lucide-react";
import { ClientRefusal } from "@/types/auth";
import Link from "next/link";

interface RefusalAlertProps {
  refusal: ClientRefusal;
  onDismiss?: () => void;
}

export function RefusalAlert({ refusal }: RefusalAlertProps) {
  return (
    <div className="rounded-xl border border-rose-300 dark:border-rose-500/40 bg-rose-50/95 dark:bg-rose-950/40 p-4 text-slate-800 dark:text-slate-200 shadow-md backdrop-blur-md transition-all animate-in fade-in slide-in-from-top-2">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-rose-200/80 dark:bg-rose-500/10 border border-rose-300 dark:border-rose-500/20 text-rose-700 dark:text-rose-400 shrink-0 mt-0.5">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div className="space-y-2 flex-1">
          {/* Header & Code */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h4 className="text-sm font-bold text-rose-950 dark:text-rose-200 tracking-wide">
              {refusal.whatHappened}
            </h4>
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-rose-200 dark:bg-rose-900/60 border border-rose-300 dark:border-rose-700/50 text-rose-900 dark:text-rose-300 font-bold">
              {refusal.code}
            </span>
          </div>

          {/* Reason (Why) */}
          <div className="text-xs text-slate-700 dark:text-slate-300 flex items-start gap-1.5 leading-relaxed bg-white/60 dark:bg-slate-950/30 p-2 rounded-lg border border-rose-200/60 dark:border-transparent">
            <HelpCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <span>
              <strong className="text-rose-950 dark:text-slate-100">Reason:</strong> {refusal.why}
            </span>
          </div>

          {/* Resolution (How to resolve) */}
          <div className="text-xs text-emerald-950 dark:text-emerald-300 flex items-start gap-1.5 leading-relaxed bg-emerald-100/70 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-500/30 p-2.5 rounded-lg">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
            <span>
              <strong className="text-emerald-900 dark:text-emerald-200">How to resolve:</strong> {refusal.howToResolve}
            </span>
          </div>

          {/* Where to go */}
          {refusal.whereToGo && (
            <div className="pt-1">
              <Link
                href={refusal.whereToGo.url}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 transition-colors group"
              >
                <span>{refusal.whereToGo.label}</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
