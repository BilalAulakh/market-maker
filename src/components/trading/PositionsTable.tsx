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
    <div className="bg-slate-950/80 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md">
      {/* Table Tabs & Global Actions */}
      <div className="px-3.5 sm:px-5 py-2.5 sm:py-3 border-b border-slate-800 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Open Positions Tab */}
          <button
            onClick={() => setTab("open")}
            className={`px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer ${
              tab === "open"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Open Positions ({openPositions.length})</span>
          </button>

          {/* Pending Orders Tab */}
          <button
            onClick={() => setTab("pending")}
            className={`px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer ${
              tab === "pending"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <ListFilter className="w-3.5 h-3.5" />
            <span>Pending Orders ({pendingOrders.length})</span>
          </button>

          {/* Trade History Tab */}
          <button
            onClick={() => setTab("history")}
            className={`px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer ${
              tab === "history"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Trade History ({closedPositions.length})</span>
          </button>
        </div>

        {/* Exness-Style "Close All" Panic Button */}
        {tab === "open" && openPositions.length > 0 && onCloseAllPositions && (
          <button
            onClick={onCloseAllPositions}
            className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white border border-rose-500/40 text-[11px] font-bold transition-all inline-flex items-center gap-1 cursor-pointer"
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
            <thead className="bg-slate-900/60 text-slate-400 uppercase font-mono text-[11px] border-b border-slate-800">
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
            <tbody className="divide-y divide-slate-800/60 font-mono">
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
                      className="hover:bg-slate-900/40 transition-colors"
                    >
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <span>{pos.symbol}</span>
                          <span className="text-[9px] bg-slate-800 text-slate-400 px-1 rounded">100oz</span>
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
                      <td className="px-5 py-3.5 text-white font-bold">{pos.lots} Lots</td>
                      <td className="px-5 py-3.5 text-slate-300">
                        <div>${pos.openPrice}</div>
                        <div className="text-[10px] text-slate-500">&rarr; ${pos.currentPrice}</div>
                      </td>
                      <td className="px-5 py-3.5 text-slate-400 text-[11px]">
                        <div className="flex items-center gap-1 text-emerald-400">
                          <Target className="w-3 h-3" /> {pos.takeProfit ? `$${pos.takeProfit}` : "—"}
                        </div>
                        <div className="flex items-center gap-1 text-rose-400">
                          <ShieldAlert className="w-3 h-3" /> {pos.stopLoss ? `$${pos.stopLoss}` : "—"}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-amber-400">
                        <div>${formatMoney(pos.margin)}</div>
                        <div className="text-[10px] text-slate-500">1:{pos.leverage}</div>
                      </td>
                      <td
                        className={`px-5 py-3.5 text-right font-black ${
                          isProfit ? "text-emerald-400" : "text-rose-400"
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
        ) : tab === "pending" ? (
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/60 text-slate-400 uppercase font-mono text-[11px] border-b border-slate-800">
              <tr>
                <th className="px-5 py-3">Order ID</th>
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3">Volume</th>
                <th className="px-5 py-3">Limit Price</th>
                <th className="px-5 py-3">Current Price</th>
                <th className="px-5 py-3">TP / SL</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {pendingOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-slate-500">
                    No pending limit orders. Switch to &quot;Limit&quot; in the execution ticket above to place a pending order!
                  </td>
                </tr>
              ) : (
                pendingOrders.map((order) => {
                  const isBuy = order.direction === "BUY";
                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-slate-900/40 transition-colors"
                    >
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-white">{order.symbol}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{order.id}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`px-2 py-0.5 rounded font-bold text-[10px] uppercase inline-flex items-center gap-1 ${
                            isBuy
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                              : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                          }`}
                        >
                          {isBuy ? "BUY LIMIT" : "SELL LIMIT"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-white font-bold">{order.lots} Lots</td>
                      <td className="px-5 py-3.5 text-amber-400 font-bold">${order.targetPrice}</td>
                      <td className="px-5 py-3.5 text-slate-300">${order.currentPrice}</td>
                      <td className="px-5 py-3.5 text-slate-400 text-[11px]">
                        <div>TP: {order.takeProfit ? `$${order.takeProfit}` : "—"}</div>
                        <div>SL: {order.stopLoss ? `$${order.stopLoss}` : "—"}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 animate-pulse">
                          Waiting Fill
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        {onCancelPendingOrder && (
                          <button
                            onClick={() => onCancelPendingOrder(order.id)}
                            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-rose-900/40 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-500/40 text-xs font-bold transition-all inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Ban className="w-3 h-3" />
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
            <thead className="bg-slate-900/60 text-slate-400 uppercase font-mono text-[11px] border-b border-slate-800">
              <tr>
                <th className="px-5 py-3">Symbol / ID</th>
                <th className="px-5 py-3">Direction</th>
                <th className="px-5 py-3">Lots</th>
                <th className="px-5 py-3">Open / Close Price</th>
                <th className="px-5 py-3">Fee / Comm</th>
                <th className="px-5 py-3 text-right">Realized PnL</th>
                <th className="px-5 py-3">Status / Exit</th>
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
                          {isBuy ? (pos.orderType === "LIMIT" ? "BUY LIMIT" : "BUY") : (pos.orderType === "LIMIT" ? "SELL LIMIT" : "SELL")}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-white font-bold">{pos.lots}</td>
                      <td className="px-5 py-3.5 text-slate-300">
                        ${pos.openPrice} &rarr; ${pos.closePrice || "—"}
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
                          <span>
                            {pos.status === "CANCELLED"
                              ? "Order Cancelled"
                              : pos.closeReason === "TAKE_PROFIT"
                              ? "TP Hit 🎯"
                              : pos.closeReason === "STOP_LOSS"
                              ? "SL Hit 🛑"
                              : "Settled to Ledger"}
                          </span>
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
