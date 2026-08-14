"use client";

import React, { useState } from "react";
import { GoldTick, TradeDirection } from "@/types/trading";
import { calculateRequiredMargin } from "@/lib/trading/engine";
import { formatMoney, moneyMultiply } from "@/lib/money";
import {
  Zap,
  ShieldCheck,
  ArrowDownCircle,
  ArrowUpCircle,
  Minus,
  Plus,
} from "lucide-react";

interface OrderPanelProps {
  currentTick: GoldTick;
  onExecuteTrade: (direction: TradeDirection, lots: string, leverage: number) => void;
  freeMargin: string;
}

const LOT_PRESETS = ["0.01", "0.05", "0.10", "0.50", "1.00", "2.00", "5.00"];
const LEVERAGE_OPTIONS = [50, 100, 200, 500];

export function OrderPanel({
  currentTick,
  onExecuteTrade,
  freeMargin,
}: OrderPanelProps) {
  const [lots, setLots] = useState("0.10");
  const [leverage, setLeverage] = useState(100);

  // Calculate required margin & notional
  const requiredMargin = calculateRequiredMargin(lots, currentTick.mid, leverage);
  const notional = moneyMultiply(moneyMultiply(lots, "100"), currentTick.mid, 2);
  const pipValue = moneyMultiply(lots, "10", 2); // $10 per pip on 1.0 standard lot

  const adjustLots = (delta: number) => {
    const current = Math.max(0.01, Number(lots) + delta);
    setLots(current.toFixed(2));
  };

  const handleTrade = (direction: TradeDirection) => {
    onExecuteTrade(direction, lots, leverage);
  };

  return (
    <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 shadow-2xl backdrop-blur-md flex flex-col space-y-3.5">
      {/* Panel Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
            <Zap className="w-3 h-3 text-amber-400 fill-amber-400" />
          </div>
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-white">
            1-Click Order Ticket
          </h3>
        </div>
        <span className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
          Instant Market Fill
        </span>
      </div>

      {/* Lot Size Stepper */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <label className="font-semibold text-slate-300">Contract Volume (Lots)</label>
          <span className="text-amber-400 font-mono font-bold text-[11px]">
            {moneyMultiply(lots, "100")} oz Gold
          </span>
        </div>

        {/* Stepper Controls */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => adjustLots(-0.05)}
            className="w-8 h-8 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white flex items-center justify-center transition-colors cursor-pointer text-xs"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <input
            type="number"
            step="0.01"
            min="0.01"
            max="50"
            value={lots}
            onChange={(e) => setLots(e.target.value || "0.01")}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-center text-sm font-mono font-black text-white focus:outline-none focus:border-amber-500 transition-colors"
          />
          <button
            type="button"
            onClick={() => adjustLots(0.05)}
            className="w-8 h-8 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white flex items-center justify-center transition-colors cursor-pointer text-xs"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Quick Presets */}
        <div className="grid grid-cols-7 gap-1 pt-0.5">
          {LOT_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setLots(preset)}
              className={`py-0.5 rounded text-[11px] font-mono transition-all cursor-pointer ${
                lots === preset
                  ? "bg-amber-500 text-slate-950 font-bold shadow-sm"
                  : "bg-slate-900/80 hover:bg-slate-800 text-slate-400 border border-slate-800"
              }`}
            >
              {preset}
            </button>
          ))}
        </div>
      </div>

      {/* Leverage Selector */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <label className="font-semibold text-slate-300">Execution Leverage</label>
          <span className="text-slate-400 font-mono">1:{leverage}</span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {LEVERAGE_OPTIONS.map((lev) => (
            <button
              key={lev}
              type="button"
              onClick={() => setLeverage(lev)}
              className={`py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                leverage === lev
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 font-bold"
                  : "bg-slate-900/60 hover:bg-slate-800 text-slate-400 border border-slate-800"
              }`}
            >
              1:{lev}
            </button>
          ))}
        </div>
      </div>

      {/* Primary Action Buttons: Compact Sleek Buy & Sell */}
      <div className="grid grid-cols-2 gap-2.5 pt-0.5">
        {/* SELL Button */}
        <button
          type="button"
          onClick={() => handleTrade("SELL")}
          className="group relative flex flex-col items-center justify-center py-2.5 px-3 rounded-xl bg-gradient-to-b from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 active:from-rose-700 active:to-rose-800 text-white shadow-md shadow-rose-950/40 border border-rose-400/30 transition-all hover:scale-[1.01] active:scale-[0.98] cursor-pointer"
        >
          <div className="w-full flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-rose-100">
            <span className="inline-flex items-center gap-1">
              <ArrowDownCircle className="w-3.5 h-3.5" />
              <span>SELL</span>
            </span>
            <span className="text-[9px] font-mono font-medium text-rose-200/80 bg-rose-900/40 px-1 py-0.2 rounded">Bid</span>
          </div>
          <div className="text-lg font-black font-mono mt-0.5 text-white tracking-tight">
            ${currentTick.bid}
          </div>
        </button>

        {/* BUY Button */}
        <button
          type="button"
          onClick={() => handleTrade("BUY")}
          className="group relative flex flex-col items-center justify-center py-2.5 px-3 rounded-xl bg-gradient-to-b from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 active:from-emerald-700 active:to-emerald-800 text-white shadow-md shadow-emerald-950/40 border border-emerald-400/30 transition-all hover:scale-[1.01] active:scale-[0.98] cursor-pointer"
        >
          <div className="w-full flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-emerald-100">
            <span className="inline-flex items-center gap-1">
              <ArrowUpCircle className="w-3.5 h-3.5" />
              <span>BUY</span>
            </span>
            <span className="text-[9px] font-mono font-medium text-emerald-200/80 bg-emerald-900/40 px-1 py-0.2 rounded">Ask</span>
          </div>
          <div className="text-lg font-black font-mono mt-0.5 text-white tracking-tight">
            ${currentTick.ask}
          </div>
        </button>
      </div>

      {/* Margin Requirement Summary Box */}
      <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2 text-xs font-mono">
        <div className="flex items-center justify-between text-slate-400">
          <span>Required Margin:</span>
          <strong className="text-amber-400 font-bold">${formatMoney(requiredMargin)}</strong>
        </div>
        <div className="flex items-center justify-between text-slate-400">
          <span>Contract Notional:</span>
          <span className="text-slate-200">${formatMoney(notional)}</span>
        </div>
        <div className="flex items-center justify-between text-slate-400">
          <span>Pip Value (0.10 USD):</span>
          <span className="text-emerald-400">${formatMoney(pipValue)} / pip</span>
        </div>
        <div className="flex items-center justify-between text-slate-400 pt-1.5 border-t border-slate-800">
          <span>Available Free Margin:</span>
          <span className="text-white font-bold">${formatMoney(freeMargin)}</span>
        </div>
      </div>

      {/* Security Assurance */}
      <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        <span>Double-entry ledger settled • Real-time margin protection.</span>
      </div>
    </div>
  );
}
