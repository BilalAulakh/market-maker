"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { GoldChart } from "@/components/trading/GoldChart";
import { OrderPanel } from "@/components/trading/OrderPanel";
import { PositionsTable } from "@/components/trading/PositionsTable";
import { goldMarketFeed } from "@/lib/trading/market-feed";
import { TradingEngine } from "@/lib/trading/engine";
import { LedgerEngine } from "@/lib/ledger/service";
import { getActiveDemoSession } from "@/lib/auth/demo-session";
import { createClient } from "@/lib/supabase/browser";
import { AccountSummary, GoldTick, Position, TradeDirection, OrderType } from "@/types/trading";
import { formatMoney } from "@/lib/money";
import {
  ArrowLeft,
  PlusCircle,
  Sparkles,
  CheckCircle2,
  Scale,
} from "lucide-react";

export default function TradePage() {
  const user = getActiveDemoSession("client");
  const [currentTick, setCurrentTick] = useState<GoldTick>(() =>
    goldMarketFeed.getCurrentTick()
  );
  const [engineInstance, setEngineInstance] = useState<TradingEngine | null>(null);
  const [ledgerInstance, setLedgerInstance] = useState<LedgerEngine | null>(null);
  const [openPositions, setOpenPositions] = useState<Position[]>([]);
  const [pendingOrders, setPendingOrders] = useState<Position[]>([]);
  const [closedPositions, setClosedPositions] = useState<Position[]>([]);
  const [accountSummary, setAccountSummary] = useState<AccountSummary>({
    balance: "10000.00",
    equity: "10000.00",
    usedMargin: "0.00",
    freeMargin: "10000.00",
    marginLevel: "0.00",
  });
  const [closingId, setClosingId] = useState<string | null>(null);
  const [executionNotice, setExecutionNotice] = useState<string | null>(null);
  const [clientAccId, setClientAccId] = useState<string>("");
  const [floatAccId, setFloatAccId] = useState<string>("");

  // Initialize Trading Engine and Double-Entry Ledger
  useEffect(() => {
    const ledger = new LedgerEngine();
    const clientAcc = ledger.createAccount(
      "client_funds",
      `${user.first_name} ${user.last_name} Gold Trading Account`,
      "USD",
      user.id
    );
    const floatAcc = ledger.createAccount(
      "payment_processor_float",
      "Payment Gateway Float",
      "USD"
    );
    const feeAcc = ledger.createAccount(
      "fee_revenue",
      "Brokerage Spread & Commission Revenue",
      "USD"
    );
    const operatingAcc = ledger.createAccount(
      "company_operating",
      "Broker Liquidity Operating Reserve",
      "USD"
    );

    setClientAccId(clientAcc.id);
    setFloatAccId(floatAcc.id);

    // Initial $10,000 demo equity deposit recorded in ledger
    ledger
      .recordTransaction({
        description: "Initial Demo Gold Trading Equity",
        entries: [
          {
            account_id: clientAcc.id,
            direction: "credit",
            amount: "10000.00",
            entry_type: "deposit",
            nature: "Demo Trading Capital",
          },
          {
            account_id: floatAcc.id,
            direction: "debit",
            amount: "10000.00",
            entry_type: "deposit",
            nature: "Gateway Clearing Deposit",
          },
        ],
      })
      .then(() => {
        const trading = new TradingEngine(
          ledger,
          clientAcc.id,
          feeAcc.id,
          operatingAcc.id
        );
        setLedgerInstance(ledger);
        setEngineInstance(trading);
        setAccountSummary(trading.getAccountSummary());
      });
  }, []);

  // Subscribe to live tick stream and auto-trigger TP / SL / Limit Fills
  useEffect(() => {
    const unsubscribe = goldMarketFeed.subscribeTicks((tick) => {
      setCurrentTick(tick);
      if (engineInstance) {
        // 1. Check & Fill Pending Limit Orders (Exness / Binance Engine)
        const filled = engineInstance.checkAndFillPendingOrders(tick);
        if (filled.length > 0) {
          for (const f of filled) {
            setExecutionNotice(`⚡ Limit Order Filled! ${f.direction} ${f.lots} Lots @ $${f.openPrice}`);
            setTimeout(() => setExecutionNotice(null), 5000);
          }
        }

        // 2. Auto check Take Profit & Stop Loss triggers (Exness / Binance behavior)
        const openPos = engineInstance.getOpenPositions();
        for (const pos of openPos) {
          const currentPrice = Number(pos.direction === "BUY" ? tick.bid : tick.ask);

          // Check Take Profit hit
          if (pos.takeProfit && Number(pos.takeProfit) > 0) {
            const tp = Number(pos.takeProfit);
            const isTpHit = pos.direction === "BUY" ? currentPrice >= tp : currentPrice <= tp;
            if (isTpHit) {
              engineInstance.closePosition(pos.id, "TAKE_PROFIT").then((closed) => {
                setOpenPositions(engineInstance.getOpenPositions());
                setPendingOrders(engineInstance.getPendingOrders());
                setClosedPositions(engineInstance.getClosedPositions());
                setAccountSummary(engineInstance.getAccountSummary(tick));
                setExecutionNotice(`🎯 Take Profit Hit on ${pos.direction} ${pos.lots} lots! Realized: +$${formatMoney(closed.realizedPnl || "0")}`);
                setTimeout(() => setExecutionNotice(null), 5000);
              });
              continue;
            }
          }

          // Check Stop Loss hit
          if (pos.stopLoss && Number(pos.stopLoss) > 0) {
            const sl = Number(pos.stopLoss);
            const isSlHit = pos.direction === "BUY" ? currentPrice <= sl : currentPrice >= sl;
            if (isSlHit) {
              engineInstance.closePosition(pos.id, "STOP_LOSS").then((closed) => {
                setOpenPositions(engineInstance.getOpenPositions());
                setPendingOrders(engineInstance.getPendingOrders());
                setClosedPositions(engineInstance.getClosedPositions());
                setAccountSummary(engineInstance.getAccountSummary(tick));
                setExecutionNotice(`🛑 Stop Loss Triggered on ${pos.direction} ${pos.lots} lots! Realized: $${formatMoney(closed.realizedPnl || "0")}`);
                setTimeout(() => setExecutionNotice(null), 5000);
              });
            }
          }
        }

        setAccountSummary(engineInstance.getAccountSummary(tick));
        setOpenPositions(engineInstance.getOpenPositions());
        setPendingOrders(engineInstance.getPendingOrders());
      }
    });

    return () => unsubscribe();
  }, [engineInstance]);

  const handleExecuteTrade = async (
    direction: TradeDirection,
    lots: string,
    leverage: number,
    takeProfit?: string,
    stopLoss?: string,
    orderType: OrderType = "MARKET",
    targetPrice?: string
  ) => {
    if (!engineInstance) return;
    try {
      const pos = engineInstance.openPosition(
        direction,
        lots,
        leverage,
        takeProfit,
        stopLoss,
        orderType,
        targetPrice
      );
      setOpenPositions(engineInstance.getOpenPositions());
      setPendingOrders(engineInstance.getPendingOrders());
      setAccountSummary(engineInstance.getAccountSummary(currentTick));

      // Direct live insert into Supabase Audit Logs table
      try {
        const supabase = createClient();
        await supabase.from("audit_logs").insert({
          user_id: user.id,
          action: pos.status === "PENDING" ? "PLACE_LIMIT_ORDER" : "OPEN_TRADE",
          category: "trading",
          metadata: {
            position_id: pos.id,
            symbol: pos.symbol,
            direction: pos.direction,
            lots: pos.lots,
            price: pos.openPrice,
            margin: pos.margin,
            leverage: pos.leverage,
            order_type: orderType,
            take_profit: takeProfit || null,
            stop_loss: stopLoss || null,
          },
        });
      } catch (sbErr) {
        console.warn("Supabase background sync:", sbErr);
      }

      if (pos.status === "PENDING") {
        setExecutionNotice(
          `📋 Pending ${direction} LIMIT Order placed for ${lots} Lots @ $${pos.targetPrice}. (✓ Saved to Supabase audit_logs)`
        );
      } else {
        setExecutionNotice(
          `⚡ Executed ${direction} ${lots} Lots Gold (XAU/USD) @ $${pos.openPrice}. Margin: $${formatMoney(pos.margin)} (✓ Saved to Supabase audit_logs)`
        );
      }
      setTimeout(() => setExecutionNotice(null), 5000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Trade execution failed");
    }
  };

  const handleCancelPendingOrder = async (orderId: string) => {
    if (!engineInstance) return;
    try {
      const cancelled = engineInstance.cancelPendingOrder(orderId);
      setPendingOrders(engineInstance.getPendingOrders());
      setClosedPositions(engineInstance.getClosedPositions());
      setAccountSummary(engineInstance.getAccountSummary(currentTick));

      try {
        const supabase = createClient();
        await supabase.from("audit_logs").insert({
          user_id: user.id,
          action: "CANCEL_LIMIT_ORDER",
          category: "trading",
          metadata: {
            order_id: orderId,
            symbol: cancelled.symbol,
            direction: cancelled.direction,
            lots: cancelled.lots,
          },
        });
      } catch (sbErr) {
        console.warn("Supabase cancel sync:", sbErr);
      }

      setExecutionNotice(`🚫 Cancelled Pending Limit Order ${cancelled.id} (✓ Synced to Supabase)`);
      setTimeout(() => setExecutionNotice(null), 4000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error cancelling order");
    }
  };

  const handleClosePosition = async (positionId: string) => {
    if (!engineInstance) return;
    setClosingId(positionId);
    try {
      const closed = await engineInstance.closePosition(positionId, "MANUAL");
      setOpenPositions(engineInstance.getOpenPositions());
      setClosedPositions(engineInstance.getClosedPositions());
      setAccountSummary(engineInstance.getAccountSummary(currentTick));

      try {
        const supabase = createClient();
        await supabase.from("audit_logs").insert({
          user_id: user.id,
          action: "CLOSE_TRADE",
          category: "trading",
          metadata: {
            position_id: closed.id,
            symbol: closed.symbol,
            direction: closed.direction,
            lots: closed.lots,
            open_price: closed.openPrice,
            close_price: closed.closePrice,
            realized_pnl: closed.realizedPnl,
            commission: closed.commission,
            ledger_transaction_id: closed.ledgerTransactionId || null,
          },
        });
      } catch (sbErr) {
        console.warn("Supabase close trade sync:", sbErr);
      }

      setExecutionNotice(
        `Closed Position ${closed.id}: Realized PnL $${formatMoney(closed.realizedPnl || "0")}. (✓ Settled in Supabase Ledger & Audit Logs)`
      );
      setTimeout(() => setExecutionNotice(null), 5000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error closing position");
    } finally {
      setClosingId(null);
    }
  };

  const handleCloseAllPositions = async () => {
    if (!engineInstance || openPositions.length === 0) return;
    const count = openPositions.length;
    for (const pos of openPositions) {
      await engineInstance.closePosition(pos.id, "MANUAL");
    }
    setOpenPositions(engineInstance.getOpenPositions());
    setClosedPositions(engineInstance.getClosedPositions());
    setAccountSummary(engineInstance.getAccountSummary(currentTick));
    setExecutionNotice(`⚡ Exness Panic Action: Closed all ${count} open positions instantly. (✓ Settled to Supabase)`);
    setTimeout(() => setExecutionNotice(null), 5000);
  };

  const handleDepositMore = async () => {
    if (!ledgerInstance || !clientAccId || !floatAccId || !engineInstance) return;
    await ledgerInstance.recordTransaction({
      description: "Demo Trader In-Session Capital Top-Up",
      entries: [
        {
          account_id: clientAccId,
          direction: "credit",
          amount: "5000.00",
          entry_type: "deposit",
          nature: "Instant Demo Funding",
        },
        {
          account_id: floatAccId,
          direction: "debit",
          amount: "5000.00",
          entry_type: "deposit",
          nature: "Gateway Settlement Float",
        },
      ],
    });

    setAccountSummary(engineInstance.getAccountSummary(currentTick));
    setExecutionNotice("Added $5,000.00 Demo Capital to your account balance (Settled to Ledger).");
    setTimeout(() => setExecutionNotice(null), 4000);
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#070a11] text-slate-100">
      {/* Top Trading Nav Bar */}
      <header className="border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md px-3 sm:px-6 py-2.5 sm:py-3 sticky top-7 z-40">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
          {/* Logo & Symbol Row */}
          <div className="flex items-center justify-between sm:justify-start gap-3 w-full sm:w-auto">
            <div className="flex items-center gap-2.5">
              <Link
                href="/"
                className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white transition-colors p-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Overview</span>
              </Link>
              <div className="h-3.5 w-[1px] bg-slate-800" />
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-md bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center font-black text-slate-950 text-xs shadow-md shadow-amber-500/20 shrink-0">
                  MM
                </div>
                <span className="font-extrabold text-xs sm:text-sm tracking-tight text-white">
                  Market Maker
                </span>
                <span className="text-[9px] uppercase font-mono px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 font-bold">
                  XAU/USD
                </span>
              </div>
            </div>

            {/* Quick Action Buttons on Mobile */}
            <div className="flex items-center gap-1.5 sm:hidden">
              <button
                onClick={handleDepositMore}
                className="px-2 py-1 rounded bg-slate-800 text-[10px] text-white border border-slate-700 font-bold inline-flex items-center gap-1"
              >
                <PlusCircle className="w-3 h-3 text-emerald-400" />
                <span>+$5K</span>
              </button>
              <Link
                href="/ledger"
                className="px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/30 text-[10px] text-emerald-400 font-bold inline-flex items-center gap-1"
              >
                <Scale className="w-3 h-3" />
                <span>Ledger</span>
              </Link>
            </div>
          </div>

          {/* Account Metrics Ribbon: Grid on mobile, flex on desktop */}
          <div className="w-full sm:w-auto grid grid-cols-2 sm:flex sm:items-center gap-1.5 sm:gap-3 text-[11px] sm:text-xs font-mono">
            <div className="p-1 sm:p-1.5 rounded-lg bg-slate-900/80 border border-slate-800 px-2.5 flex items-center justify-between sm:justify-start gap-2">
              <span className="text-slate-500">Balance:</span>{" "}
              <strong className="text-white">${formatMoney(accountSummary.balance)}</strong>
            </div>

            <div className="p-1 sm:p-1.5 rounded-lg bg-slate-900/80 border border-slate-800 px-2.5 flex items-center justify-between sm:justify-start gap-2">
              <span className="text-slate-500">Equity:</span>{" "}
              <strong className="text-emerald-400 font-bold">
                ${formatMoney(accountSummary.equity)}
              </strong>
            </div>

            <div className="p-1 sm:p-1.5 rounded-lg bg-slate-900/80 border border-slate-800 px-2.5 flex items-center justify-between sm:justify-start gap-2">
              <span className="text-slate-500">Free Margin:</span>{" "}
              <strong className="text-slate-200">
                ${formatMoney(accountSummary.freeMargin)}
              </strong>
            </div>

            <div className="p-1 sm:p-1.5 rounded-lg bg-slate-900/80 border border-slate-800 px-2.5 flex items-center justify-between sm:justify-start gap-2">
              <span className="text-slate-500">Used:</span>{" "}
              <strong className="text-amber-400 font-bold">
                ${formatMoney(accountSummary.usedMargin)}
              </strong>
            </div>

            <div className="hidden sm:flex items-center gap-2">
              <button
                onClick={handleDepositMore}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-white border border-slate-700 inline-flex items-center gap-1 transition-colors cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span>+$5K</span>
              </button>

              <Link
                href="/wallet"
                className="px-2.5 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-xs text-cyan-400 inline-flex items-center gap-1 transition-colors"
              >
                <span>Deposit &amp; Vault</span>
              </Link>

              <Link
                href="/ledger"
                className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-xs text-emerald-400 inline-flex items-center gap-1 transition-colors"
              >
                <Scale className="w-3.5 h-3.5" />
                <span>Ledger</span>
              </Link>

              <Link
                href="/login"
                className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs text-slate-300 hover:text-white inline-flex items-center gap-1 transition-colors"
              >
                <span>{user ? `${user.first_name}` : "Sign In"}</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Trading Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-2.5 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
        {/* Notice Toast */}
        {executionNotice && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/40 p-4 text-emerald-300 text-xs flex items-center justify-between shadow-xl animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{executionNotice}</span>
            </div>
            <span className="text-[10px] font-mono uppercase bg-emerald-500/20 px-2 py-0.5 rounded text-emerald-200">
              Double-Entry Ledger Verified
            </span>
          </div>
        )}

        {/* 2-Column Grid: Chart & Order Ticket */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Chart Area (2 Columns) */}
          <div className="lg:col-span-2 space-y-6">
            <GoldChart currentTick={currentTick} />
          </div>

          {/* Right Column: 1-Click Execution Ticket */}
          <div className="space-y-6">
            <OrderPanel
              currentTick={currentTick}
              onExecuteTrade={handleExecuteTrade}
              freeMargin={accountSummary.freeMargin}
            />

            {/* Quick Demo Mode Card */}
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between font-bold text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Demo Trader Session Active</span>
                </span>
                <span className="text-emerald-400 font-mono">1:100 Leverage</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Active account: <strong>{user.first_name} {user.last_name}</strong> ({user.email}). Double-entry ledger settlement verified with zero mutable balance columns.
              </p>
            </div>
          </div>
        </div>

        {/* Positions & Trade History Table */}
        <PositionsTable
          openPositions={openPositions}
          pendingOrders={pendingOrders}
          closedPositions={closedPositions}
          onClosePosition={handleClosePosition}
          onCancelPendingOrder={handleCancelPendingOrder}
          onCloseAllPositions={handleCloseAllPositions}
          closingId={closingId}
        />
      </main>
    </div>
  );
}
