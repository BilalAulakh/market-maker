"use client";

import React, { useEffect, useState } from "react";
import { Position } from "@/types/trading";
import { formatMoney } from "@/lib/money";
import {
  TrendingUp,
  TrendingDown,
  Clock,
  X,
  ShieldCheck,
} from "lucide-react";

export interface ExecutionEvent {
  id: string;
  type: "MARKET_BUY" | "MARKET_SELL" | "LIMIT_ORDER" | "CLOSE_TRADE";
  position: Position;
  title: string;
  timestamp: string;
}

interface OrderExecutionToastProps {
  event: ExecutionEvent | null;
  onDismiss: () => void;
}

export function OrderExecutionToast({
  event,
  onDismiss,
}: OrderExecutionToastProps) {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!event) return;
    setProgress(100);

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev <= 2) {
          clearInterval(interval);
          onDismiss();
          return 0;
        }
        return prev - 2;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [event, onDismiss]);

  if (!event) return null;

  const isBuy = event.type === "MARKET_BUY" || (event.type === "LIMIT_ORDER" && event.position.direction === "BUY");
  const isLimit = event.type === "LIMIT_ORDER";
  const isClose = event.type === "CLOSE_TRADE";

  return (
    <div className="fixed top-18 right-4 sm:right-6 z-50 max-w-sm sm:max-w-md w-full animate-in slide-in-from-top-4 fade-in duration-200">
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl p-4 sm:p-5 shadow-2xl space-y-3.5 text-slate-900 dark:text-white">
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center font-black ${
                isBuy
                  ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                  : isLimit
                  ? "bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                  : "bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30"
              }`}
            >
              {isBuy ? (
                <TrendingUp className="w-4 h-4" />
              ) : isLimit ? (
                <Clock className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  {event.title}
                </span>
                <span className="text-[9px] font-mono font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 px-1.5 py-0.2 rounded border border-amber-500/30">
                  {event.position.symbol}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                ID: {event.position.id.slice(0, 18)}...
              </p>
            </div>
          </div>

          <button
            onClick={onDismiss}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Trade Details Grid */}
        <div className="grid grid-cols-3 gap-2 bg-slate-50 dark:bg-slate-900/80 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800/80 text-xs font-mono">
          <div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-sans">Direction &amp; Lots</span>
            <strong
              className={`font-black ${
                isBuy ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
              }`}
            >
              {event.position.direction} {event.position.lots}L
            </strong>
          </div>

          <div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-sans">
              {isLimit ? "Limit Price" : "Execution Price"}
            </span>
            <strong className="text-slate-900 dark:text-white">
              ${isLimit ? event.position.targetPrice || event.position.openPrice : event.position.openPrice}
            </strong>
          </div>

          <div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-sans">
              {isClose ? "Realized PnL" : "Allocated Margin"}
            </span>
            <strong
              className={
                isClose
                  ? Number(event.position.unrealizedPnl) >= 0
                    ? "text-emerald-600 dark:text-emerald-400 font-black"
                    : "text-rose-600 dark:text-rose-400 font-black"
                  : "text-amber-600 dark:text-amber-400 font-bold"
              }
            >
              {isClose
                ? `${Number(event.position.unrealizedPnl) >= 0 ? "+" : ""}$${formatMoney(event.position.unrealizedPnl)}`
                : `$${formatMoney(event.position.margin)}`}
            </strong>
          </div>
        </div>

        {/* Ledger Confirmation Ribbon */}
        <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 pt-0.5">
          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" /> Double-Entry Ledger Settled
          </span>
          <span className="font-mono">{new Date().toLocaleTimeString()}</span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-200 dark:bg-slate-800 h-1 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-100 ${
              isBuy ? "bg-emerald-500" : isLimit ? "bg-amber-500" : "bg-rose-500"
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
