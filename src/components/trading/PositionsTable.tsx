"use client";

import React, { useState } from "react";
import { Position } from "@/types/trading";
import { formatMoney } from "@/lib/money";
import {
  TrendingUp,
  TrendingDown,
  XCircle,
  Clock,
  CheckCircle2,
  History,
} from "lucide-react";

interface PositionsTableProps {
  openPositions: Position[];
  closedPositions: Position[];
  onClosePosition: (positionId: string) => void;
  closingId: string | null;
}

export function PositionsTable({
  openPositions,
  closedPositions,
  onClosePosition,
  closingId,
}: PositionsTableProps) {
  const [tab, setTab] = useState<"open" | "history">("open");

  return (
    <div className="bg-slate-950/80 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md">
      {/* Table Tabs */}
      <div className="px-3.5 sm:px-5 py-2.5 sm:py-3 border-b border-slate-800 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={() => setTab("open")}
            className={`px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer ${
              tab === "open"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Open ({openPositions.length})</span>
          </button>
          <button
            onClick={() => setTab("history")}
            className={`px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer ${
              tab === "history"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Closed ({closedPositions.length})</span>
          </button>
        </div>

        <div className="text-[10px] sm:text-[11px] font-mono text-slate-500 hidden sm:block">
          Auto-updates with live tick stream
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        {tab === "open" ? (
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/60 text-slate-400 uppercase font-mono text-[11px] border-b border-slate-800">
              <tr>
                <th className="px-5 py-3">Symbol / ID</th>
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3">Lots</th>
                <th className="px-5 py-3">Open Price</th>
                <th className="px-5 py-3">Current Price</th>
                <th className="px-5 py-3">Margin</th>
                <th className="px-5 py-3 text-right">Floating PnL</th>
                <th className="px-5 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {openPositions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-slate-500">
                    No open positions. Use the 1-Click execution panel above to place a BUY or SELL Gold trade!
                  </td>
                </tr>
              ) : (
                openPositions.map((pos) => {
                  const isBuy = pos.direction === "BUY";
                  const pnlNum = Number(pos.unrealizedPnl);
                  const isProfit = pnlNum >= 0;

                  return (
                    <tr
                      key={pos.id}
                      className="hover:bg-slate-900/40 transition-colors"
                    >
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <span>{pos.symbol}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">{pos.id}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`px-2 py-0.5 rounded font-bold text-[10px] uppercase inline-flex items-center gap-1 ${
                            isBuy
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                          }`}
                        >
                          {isBuy ? (
                            <TrendingUp className="w-3 h-3" />
                          ) : (
                            <TrendingDown className="w-3 h-3" />
                          )}
                          {pos.direction}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-white font-bold">{pos.lots}</td>
                      <td className="px-5 py-3.5 text-slate-300">${pos.openPrice}</td>
                      <td className="px-5 py-3.5 text-slate-200">${pos.currentPrice}</td>
                      <td className="px-5 py-3.5 text-amber-400">${formatMoney(pos.margin)}</td>
                      <td
                        className={`px-5 py-3.5 text-right font-black text-sm ${
                          isProfit ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {isProfit ? "+" : ""}${formatMoney(pos.unrealizedPnl)}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <button
                          onClick={() => onClosePosition(pos.id)}
                          disabled={closingId === pos.id}
                          className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white border border-rose-500/40 text-xs font-bold transition-all inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>{closingId === pos.id ? "Closing..." : "Close"}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/60 text-slate-400 uppercase font-mono text-[11px] border-b border-slate-800">
              <tr>
                <th className="px-5 py-3">Symbol / ID</th>
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3">Lots</th>
                <th className="px-5 py-3">Open / Close Price</th>
                <th className="px-5 py-3">Commission</th>
                <th className="px-5 py-3 text-right">Realized PnL</th>
                <th className="px-5 py-3">Ledger Settlement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {closedPositions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-slate-500">
                    No closed trades recorded in this session.
                  </td>
                </tr>
              ) : (
                closedPositions.map((pos) => {
                  const isBuy = pos.direction === "BUY";
                  const pnlNum = Number(pos.realizedPnl || "0");
                  const isProfit = pnlNum >= 0;

                  return (
                    <tr
                      key={pos.id}
                      className="hover:bg-slate-900/40 transition-colors"
                    >
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-white">{pos.symbol}</div>
                        <div className="text-[10px] text-slate-500">{pos.id}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`px-2 py-0.5 rounded font-bold text-[10px] uppercase ${
                            isBuy
                              ? "bg-emerald-500/20 text-emerald-400"
                              : "bg-rose-500/20 text-rose-400"
                          }`}
                        >
                          {pos.direction}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-white font-bold">{pos.lots}</td>
                      <td className="px-5 py-3.5 text-slate-300">
                        ${pos.openPrice} &rarr; ${pos.closePrice}
                      </td>
                      <td className="px-5 py-3.5 text-slate-400">-${pos.commission}</td>
                      <td
                        className={`px-5 py-3.5 text-right font-black text-sm ${
                          isProfit ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {isProfit ? "+" : ""}${formatMoney(pos.realizedPnl || "0")}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span>Settled to Ledger</span>
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
