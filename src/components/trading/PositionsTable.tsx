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
  Trash2,
  Target,
  ShieldAlert,
  ListFilter,
  Ban,
} from "lucide-react";

interface PositionsTableProps {
  openPositions: Position[];
  pendingOrders?: Position[];
  closedPositions: Position[];
  onClosePosition: (positionId: string) => void;
  onCancelPendingOrder?: (orderId: string) => void;
  onCloseAllPositions?: () => void;
  closingId: string | null;
}

export function PositionsTable({
  openPositions,
  pendingOrders = [],
  closedPositions,
  onClosePosition,
  onCancelPendingOrder,
  onCloseAllPositions,
  closingId,
}: PositionsTableProps) {
  const [tab, setTab] = useState<"open" | "pending" | "history">("open");

  return (
    <div className="bg-white/95 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xl dark:shadow-2xl backdrop-blur-md text-slate-900 dark:text-slate-100">
      {/* Table Tabs & Global Actions */}
      <div className="px-3 sm:px-5 py-2 sm:py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 overflow-x-auto">
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Open Positions Tab */}
          <button
            onClick={() => setTab("open")}
            className={`px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              tab === "open"
                ? "bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-500/40"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Open ({openPositions.length})</span>
          </button>

          {/* Pending Orders Tab */}
          <button
            onClick={() => setTab("pending")}
            className={`px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              tab === "pending"
                ? "bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/40"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <ListFilter className="w-3.5 h-3.5" />
            <span>Pending ({pendingOrders.length})</span>
          </button>

          {/* Trade History Tab */}
          <button
            onClick={() => setTab("history")}
            className={`px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              tab === "history"
                ? "bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-500/40"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>History ({closedPositions.length})</span>
          </button>
        </div>

        {/* Exness-Style "Close All" Panic Button */}
        {tab === "open" && openPositions.length > 0 && onCloseAllPositions && (
          <button
            onClick={onCloseAllPositions}
            className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500 text-rose-700 dark:text-rose-300 hover:text-white border border-rose-500/40 text-[11px] font-bold transition-all inline-flex items-center gap-1 cursor-pointer shrink-0"
          >
            <Trash2 className="w-3 h-3" />
            <span>Close All ({openPositions.length})</span>
          </button>
        )}
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        {tab === "open" ? (
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 uppercase font-mono text-[11px] border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-5 py-3">Symbol / ID</th>
                <th className="px-5 py-3">Direction</th>
                <th className="px-5 py-3">Volume</th>
                <th className="px-5 py-3">Entry &rarr; Mark</th>
                <th className="px-5 py-3">TP / SL</th>
                <th className="px-5 py-3">Margin (Lev)</th>
                <th className="px-5 py-3 text-right">Floating PnL (ROI)</th>
                <th className="px-5 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-mono">
              {openPositions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-slate-500">
                    No active positions. Execute a BUY or SELL order from the terminal above!
                  </td>
                </tr>
              ) : (
                openPositions.map((pos) => {
                  const isBuy = pos.direction === "BUY";
                  const pnlNum = Number(pos.unrealizedPnl);
                  const isProfit = pnlNum >= 0;
                  const marginNum = Number(pos.margin) || 1;
                  const roiPercent = ((pnlNum / marginNum) * 100).toFixed(1);

                  return (
                    <tr
                      key={pos.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors"
                    >
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span>{pos.symbol}</span>
                          <span className="text-[9px] bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-400 px-1 rounded">100oz</span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">{pos.id}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`px-2 py-0.5 rounded font-bold text-[10px] uppercase inline-flex items-center gap-1 ${
                            isBuy
                              ? "bg-emerald-500/20 text-emerald-800 dark:text-emerald-400 border border-emerald-500/30"
                              : "bg-rose-500/20 text-rose-800 dark:text-rose-400 border border-rose-500/30"
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
                      <td className="px-5 py-3.5 text-slate-900 dark:text-white font-bold">{pos.lots} Lots</td>
                      <td className="px-5 py-3.5 text-slate-800 dark:text-slate-300">
                        <div>${pos.openPrice}</div>
                        <div className="text-[10px] text-slate-500">&rarr; ${pos.currentPrice}</div>
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 text-[11px]">
                        <div className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold">
                          <Target className="w-3 h-3" /> {pos.takeProfit ? `$${pos.takeProfit}` : "—"}
                        </div>
                        <div className="flex items-center gap-1 text-rose-700 dark:text-rose-400 font-semibold">
                          <ShieldAlert className="w-3 h-3" /> {pos.stopLoss ? `$${pos.stopLoss}` : "—"}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-amber-700 dark:text-amber-400 font-bold">
                        <div>${formatMoney(pos.margin)}</div>
                        <div className="text-[10px] text-slate-500 font-normal">1:{pos.leverage}</div>
                      </td>
                      <td
                        className={`px-5 py-3.5 text-right font-black ${
                          isProfit ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"
                        }`}
                      >
                        <div className="text-sm">
                          {isProfit ? "+" : ""}${formatMoney(pos.unrealizedPnl)}
                        </div>
                        <div className="text-[10px] font-mono opacity-80">
                          ({isProfit ? "+" : ""}{roiPercent}%)
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <button
                          onClick={() => onClosePosition(pos.id)}
                          disabled={closingId === pos.id}
                          className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500 text-rose-700 dark:text-rose-300 hover:text-white border border-rose-500/40 text-xs font-bold transition-all inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
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
        ) : tab === "pending" ? (
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 uppercase font-mono text-[11px] border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-5 py-3">Order ID / Time</th>
                <th className="px-5 py-3">Symbol</th>
                <th className="px-5 py-3">Direction</th>
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3">Volume</th>
                <th className="px-5 py-3">Target Price</th>
                <th className="px-5 py-3">Current Mark</th>
                <th className="px-5 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-mono">
              {pendingOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-slate-500">
                    No pending limit orders waiting in the order book.
                  </td>
                </tr>
              ) : (
                pendingOrders.map((ord) => {
                  const isBuy = ord.direction === "BUY";
                  return (
                    <tr
                      key={ord.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors"
                    >
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-slate-900 dark:text-white">{ord.id}</div>
                        <div className="text-[10px] text-slate-500">
                          {ord.openedAt ? new Date(ord.openedAt).toLocaleTimeString() : "Pending"}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 font-bold text-slate-900 dark:text-white">{ord.symbol}</td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`px-2 py-0.5 rounded font-bold text-[10px] uppercase inline-flex items-center gap-1 ${
                            isBuy
                              ? "bg-emerald-500/20 text-emerald-800 dark:text-emerald-400 border border-emerald-500/30"
                              : "bg-rose-500/20 text-rose-800 dark:text-rose-400 border border-rose-500/30"
                          }`}
                        >
                          {ord.direction}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                          LIMIT
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-900 dark:text-white font-bold">{ord.lots} Lots</td>
                      <td className="px-5 py-3.5 text-amber-700 dark:text-amber-400 font-bold">${ord.targetPrice || ord.openPrice}</td>
                      <td className="px-5 py-3.5 text-slate-700 dark:text-slate-300">${ord.currentPrice}</td>
                      <td className="px-5 py-3.5 text-center">
                        {onCancelPendingOrder && (
                          <button
                            onClick={() => onCancelPendingOrder(ord.id)}
                            className="px-2.5 py-1 rounded bg-slate-200 dark:bg-slate-800 hover:bg-rose-500 hover:text-white text-slate-700 dark:text-slate-300 text-xs font-semibold transition-all inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Ban className="w-3.5 h-3.5" />
                            <span>Cancel</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 uppercase font-mono text-[11px] border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-5 py-3">Order ID</th>
                <th className="px-5 py-3">Symbol</th>
                <th className="px-5 py-3">Direction</th>
                <th className="px-5 py-3">Volume</th>
                <th className="px-5 py-3">Entry &rarr; Close Price</th>
                <th className="px-5 py-3">Duration / Time</th>
                <th className="px-5 py-3 text-right">Realized PnL</th>
                <th className="px-5 py-3 text-center">Ledger State</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-mono">
              {closedPositions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-slate-500">
                    No closed trades in history yet.
                  </td>
                </tr>
              ) : (
                closedPositions.map((pos) => {
                  const isBuy = pos.direction === "BUY";
                  const pnlNum = Number(pos.unrealizedPnl);
                  const isProfit = pnlNum >= 0;

                  return (
                    <tr
                      key={pos.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors"
                    >
                      <td className="px-5 py-3.5 font-bold text-slate-800 dark:text-slate-300">{pos.id}</td>
                      <td className="px-5 py-3.5 text-slate-900 dark:text-white font-bold">{pos.symbol}</td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`px-2 py-0.5 rounded font-bold text-[10px] uppercase inline-flex items-center gap-1 ${
                            isBuy
                              ? "bg-emerald-500/20 text-emerald-800 dark:text-emerald-400 border border-emerald-500/30"
                              : "bg-rose-500/20 text-rose-800 dark:text-rose-400 border border-rose-500/30"
                          }`}
                        >
                          {pos.direction}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-800 dark:text-slate-300">{pos.lots} Lots</td>
                      <td className="px-5 py-3.5 text-slate-800 dark:text-slate-300">
                        ${pos.openPrice} &rarr; ${pos.currentPrice}
                      </td>
                      <td className="px-5 py-3.5 text-slate-500">
                        {pos.openedAt ? new Date(pos.openedAt).toLocaleTimeString() : "-"}
                      </td>
                      <td
                        className={`px-5 py-3.5 text-right font-black ${
                          isProfit ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"
                        }`}
                      >
                        {isProfit ? "+" : ""}${formatMoney(pos.realizedPnl || pos.unrealizedPnl)}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Settled</span>
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
