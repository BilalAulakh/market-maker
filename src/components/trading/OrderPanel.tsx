"use client";

import React, { useState } from "react";
import { GoldTick, TradeDirection, OrderType } from "@/types/trading";
import { calculateRequiredMargin } from "@/lib/trading/engine";
import { formatMoney, moneyMultiply, moneySubtract, moneyAdd } from "@/lib/money";
import {
  Zap,
  ShieldCheck,
  ArrowDownCircle,
  ArrowUpCircle,
  Minus,
  Plus,
  Target,
  ShieldAlert,
} from "lucide-react";

interface OrderPanelProps {
  currentTick: GoldTick;
  onExecuteTrade: (
    direction: TradeDirection,
    lots: string,
    leverage: number,
    takeProfit?: string,
    stopLoss?: string,
    orderType?: OrderType,
    targetPrice?: string
  ) => void;
  freeMargin: string;
}

const LOT_PRESETS = ["0.01", "0.05", "0.10", "0.50", "1.00", "2.00", "5.00"];
const LEVERAGE_OPTIONS = [50, 100, 200, 500];

export function OrderPanel({
  currentTick,
  onExecuteTrade,
  freeMargin,
}: OrderPanelProps) {
  const [orderType, setOrderType] = useState<OrderType>("MARKET");
  const [lots, setLots] = useState("0.10");
  const [limitPrice, setLimitPrice] = useState(currentTick.mid);
  const [leverage, setLeverage] = useState(100);
  const [enableTpSl, setEnableTpSl] = useState(false);
  const [takeProfit, setTakeProfit] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [submittingDir, setSubmittingDir] = useState<TradeDirection | null>(null);

  // Calculate required margin & notional
  const effectivePrice = orderType === "LIMIT" && Number(limitPrice) > 0 ? limitPrice : currentTick.mid;
  const requiredMargin = calculateRequiredMargin(lots, effectivePrice, leverage);
  const notional = moneyMultiply(moneyMultiply(lots, "100"), effectivePrice, 2);
  const pipValue = moneyMultiply(lots, "10", 2); // $10 per pip on 1.0 standard lot

  const adjustLots = (delta: number) => {
    const current = Math.max(0.01, Number(lots) + delta);
    setLots(current.toFixed(2));
  };

  // Quick TP / SL preset helpers based on current price
  const applyQuickTp = (pips: number) => {
    const delta = (pips * 0.1).toFixed(2); // 10 pips = $1.00 in gold
    const target = moneyAdd(currentTick.ask, delta);
    setTakeProfit(target);
    setEnableTpSl(true);
  };

  const applyQuickSl = (pips: number) => {
    const delta = (pips * 0.1).toFixed(2);
    const target = moneySubtract(currentTick.bid, delta);
    setStopLoss(target);
    setEnableTpSl(true);
  };

  const handleTrade = (direction: TradeDirection) => {
    setSubmittingDir(direction);
    setTimeout(() => setSubmittingDir(null), 600);
    onExecuteTrade(
      direction,
      lots,
      leverage,
      enableTpSl && takeProfit ? takeProfit : undefined,
      enableTpSl && stopLoss ? stopLoss : undefined,
      orderType,
      orderType === "LIMIT" && limitPrice ? limitPrice : undefined
    );
  };

  return (
    <div className="bg-white/95 dark:bg-slate-950/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xl dark:shadow-2xl backdrop-blur-md flex flex-col space-y-3.5 text-slate-900 dark:text-slate-100">
      {/* Panel Header with Order Type Switcher */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800/80 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
            <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
          </div>
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-white">
            Exness Pro Execution
          </h3>
        </div>
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-0.5 rounded-lg border border-slate-200 dark:border-slate-800 text-[10px] font-bold">
          <button
            type="button"
            onClick={() => {
              setOrderType("MARKET");
            }}
            className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
              orderType === "MARKET"
                ? "bg-amber-500 text-slate-950 shadow-sm font-black"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Market
          </button>
          <button
            type="button"
            onClick={() => {
              setOrderType("LIMIT");
              if (!limitPrice || Number(limitPrice) === 0) setLimitPrice(currentTick.mid);
            }}
            className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
              orderType === "LIMIT"
                ? "bg-amber-500 text-slate-950 shadow-sm font-black"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Limit / Pending
          </button>
        </div>
      </div>

      {/* Limit Price Input (When Limit is Selected) */}
      {orderType === "LIMIT" && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-1.5 animate-in fade-in">
          <div className="flex items-center justify-between text-xs">
            <label className="font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1">
              <span>🎯 Limit Trigger Price (USD)</span>
            </label>
            <span className="text-[10px] font-mono text-slate-600 dark:text-slate-400">
              Mark: ${currentTick.mid}
            </span>
          </div>
          <input
            type="number"
            step="0.05"
            value={limitPrice}
            onChange={(e) => setLimitPrice(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-amber-500/50 rounded-lg px-3 py-1.5 font-mono text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
          />
          <div className="flex items-center gap-1.5 pt-0.5 text-[10px] font-mono">
            <button
              type="button"
              onClick={() => setLimitPrice((Number(currentTick.bid) - 2.0).toFixed(2))}
              className="flex-1 py-1 rounded bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30 font-bold cursor-pointer"
            >
              -$2.00 (Buy Dip)
            </button>
            <button
              type="button"
              onClick={() => setLimitPrice((Number(currentTick.ask) + 2.0).toFixed(2))}
              className="flex-1 py-1 rounded bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-500/30 font-bold cursor-pointer"
            >
              +$2.00 (Sell Peak)
            </button>
          </div>
        </div>
      )}

      {/* Lot Size Stepper */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <label className="font-semibold text-slate-700 dark:text-slate-300">Contract Volume (Lots)</label>
          <span className="text-amber-600 dark:text-amber-400 font-mono font-bold text-[11px]">
            {moneyMultiply(lots, "100")} oz Gold
          </span>
        </div>

        {/* Stepper Controls */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => adjustLots(-0.05)}
            className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white flex items-center justify-center transition-colors cursor-pointer text-xs"
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
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-center text-sm font-mono font-black text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 transition-colors"
          />
          <button
            type="button"
            onClick={() => adjustLots(0.05)}
            className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white flex items-center justify-center transition-colors cursor-pointer text-xs"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Quick Presets */}
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-1 pt-0.5">
          {LOT_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setLots(preset)}
              className={`py-1 sm:py-0.5 rounded text-[11px] font-mono transition-all cursor-pointer ${
                lots === preset
                  ? "bg-amber-500 text-slate-950 font-bold shadow-sm"
                  : "bg-slate-100 dark:bg-slate-900/80 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-400 border border-slate-300 dark:border-slate-800 font-semibold"
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
          <label className="font-semibold text-slate-700 dark:text-slate-300">Execution Leverage</label>
          <span className="text-slate-600 dark:text-slate-400 font-mono font-semibold">1:{leverage}</span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {LEVERAGE_OPTIONS.map((lev) => (
            <button
              key={lev}
              type="button"
              onClick={() => setLeverage(lev)}
              className={`py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                leverage === lev
                  ? "bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-500/50 font-bold"
                  : "bg-slate-100 dark:bg-slate-900/60 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-400 border border-slate-300 dark:border-slate-800 font-semibold"
              }`}
            >
              1:{lev}
            </button>
          ))}
        </div>
      </div>

      {/* Take Profit & Stop Loss Section (Exness / Binance Style) */}
      <div className="pt-1 border-t border-slate-200 dark:border-slate-800/80 space-y-2">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setEnableTpSl(!enableTpSl)}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
          >
            <span
              className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[9px] border ${
                enableTpSl
                  ? "bg-amber-500 border-amber-500 text-slate-950"
                  : "border-slate-400 dark:border-slate-600 bg-slate-100 dark:bg-slate-900"
              }`}
            >
              {enableTpSl ? "✓" : ""}
            </span>
            <span>Take Profit / Stop Loss (TP / SL)</span>
          </button>
          {enableTpSl && (
            <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 font-bold">Risk Manager Active</span>
          )}
        </div>

        {enableTpSl && (
          <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs animate-in fade-in">
            {/* Take Profit Input */}
            <div>
              <div className="flex items-center justify-between text-[11px] text-emerald-700 dark:text-emerald-400 mb-1 font-semibold">
                <span className="flex items-center gap-1">
                  <Target className="w-3 h-3" /> TP (Price)
                </span>
              </div>
              <input
                type="number"
                step="0.10"
                placeholder={`e.g. ${(Number(currentTick.ask) + 5).toFixed(2)}`}
                value={takeProfit}
                onChange={(e) => setTakeProfit(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg p-1.5 font-mono text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
              />
              <div className="flex items-center gap-1 mt-1">
                <button
                  type="button"
                  onClick={() => applyQuickTp(20)}
                  className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-[9px] font-mono text-emerald-700 dark:text-emerald-300 font-bold"
                >
                  +20 pips
                </button>
                <button
                  type="button"
                  onClick={() => applyQuickTp(50)}
                  className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-[9px] font-mono text-emerald-700 dark:text-emerald-300 font-bold"
                >
                  +50 pips
                </button>
              </div>
            </div>

            {/* Stop Loss Input */}
            <div>
              <div className="flex items-center justify-between text-[11px] text-rose-700 dark:text-rose-400 mb-1 font-semibold">
                <span className="flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3" /> SL (Price)
                </span>
              </div>
              <input
                type="number"
                step="0.10"
                placeholder={`e.g. ${(Number(currentTick.bid) - 5).toFixed(2)}`}
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg p-1.5 font-mono text-xs text-slate-900 dark:text-white focus:outline-none focus:border-rose-500"
              />
              <div className="flex items-center gap-1 mt-1">
                <button
                  type="button"
                  onClick={() => applyQuickSl(20)}
                  className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-[9px] font-mono text-rose-700 dark:text-rose-300 font-bold"
                >
                  -20 pips
                </button>
                <button
                  type="button"
                  onClick={() => applyQuickSl(50)}
                  className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-[9px] font-mono text-rose-700 dark:text-rose-300 font-bold"
                >
                  -50 pips
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Primary Action Buttons: Compact Sleek Buy & Sell */}
      <div className="grid grid-cols-2 gap-2.5 pt-0.5">
        {/* SELL Button */}
        <button
          type="button"
          onClick={() => handleTrade("SELL")}
          className={`group relative flex flex-col items-center justify-center py-2.5 px-3 rounded-xl bg-gradient-to-b from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 active:from-rose-700 active:to-rose-800 text-white shadow-md shadow-rose-950/20 border border-rose-400/30 transition-all hover:scale-[1.01] active:scale-[0.98] cursor-pointer ${
            submittingDir === "SELL" ? "ring-4 ring-rose-400/80 scale-95 brightness-125" : ""
          }`}
        >
          <div className="w-full flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-rose-100">
            <span className="inline-flex items-center gap-1">
              <ArrowDownCircle className="w-3.5 h-3.5" />
              <span>{submittingDir === "SELL" ? "FILLING..." : orderType === "LIMIT" ? "SELL LIMIT" : "SELL"}</span>
            </span>
            <span className="text-[9px] font-mono font-medium text-rose-200/80 bg-rose-900/40 px-1 py-0.2 rounded">
              {orderType === "LIMIT" ? "Limit" : "Bid"}
            </span>
          </div>
          <div className="text-lg font-black font-mono mt-0.5 text-white tracking-tight">
            ${orderType === "LIMIT" ? limitPrice || currentTick.bid : currentTick.bid}
          </div>
        </button>

        {/* BUY Button */}
        <button
          type="button"
          onClick={() => handleTrade("BUY")}
          className={`group relative flex flex-col items-center justify-center py-2.5 px-3 rounded-xl bg-gradient-to-b from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 active:from-emerald-700 active:to-emerald-800 text-white shadow-md shadow-emerald-950/20 border border-emerald-400/30 transition-all hover:scale-[1.01] active:scale-[0.98] cursor-pointer ${
            submittingDir === "BUY" ? "ring-4 ring-emerald-400/80 scale-95 brightness-125" : ""
          }`}
        >
          <div className="w-full flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-emerald-100">
            <span className="inline-flex items-center gap-1">
              <ArrowUpCircle className="w-3.5 h-3.5" />
              <span>{submittingDir === "BUY" ? "FILLING..." : orderType === "LIMIT" ? "BUY LIMIT" : "BUY"}</span>
            </span>
            <span className="text-[9px] font-mono font-medium text-emerald-200/80 bg-emerald-900/40 px-1 py-0.2 rounded">
              {orderType === "LIMIT" ? "Limit" : "Ask"}
            </span>
          </div>
          <div className="text-lg font-black font-mono mt-0.5 text-white tracking-tight">
            ${orderType === "LIMIT" ? limitPrice || currentTick.ask : currentTick.ask}
          </div>
        </button>
      </div>

      {/* Margin Requirement Summary Box */}
      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-2 text-xs font-mono">
        <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
          <span>Required Margin:</span>
          <strong className="text-amber-700 dark:text-amber-400 font-bold">${formatMoney(requiredMargin)}</strong>
        </div>
        <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
          <span>Contract Notional:</span>
          <span className="text-slate-800 dark:text-slate-200 font-semibold">${formatMoney(notional)}</span>
        </div>
        <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
          <span>Pip Value (0.10 USD):</span>
          <span className="text-emerald-700 dark:text-emerald-400 font-bold">${formatMoney(pipValue)} / pip</span>
        </div>
        <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 pt-1.5 border-t border-slate-200 dark:border-slate-800">
          <span>Available Free Margin:</span>
          <span className="text-slate-900 dark:text-white font-bold">${formatMoney(freeMargin)}</span>
        </div>
      </div>

      {/* Security Assurance */}
      <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
        <span>Exness Risk Protocol • Double-entry ledger protection.</span>
      </div>
    </div>
  );
}
