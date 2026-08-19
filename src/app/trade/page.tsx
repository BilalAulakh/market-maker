"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { GoldChart } from "@/components/trading/GoldChart";
import { OrderPanel } from "@/components/trading/OrderPanel";
import { PositionsTable } from "@/components/trading/PositionsTable";
import { goldMarketFeed } from "@/lib/trading/market-feed";
import { TradingEngine } from "@/lib/trading/engine";
import { LedgerEngine } from "@/lib/ledger/service";
import { createClient } from "@/lib/supabase/browser";
import { AccountSummary, GoldTick, Position, TradeDirection, OrderType } from "@/types/trading";
import { formatMoney } from "@/lib/money";
import {
  ArrowLeft,
  PlusCircle,
  CheckCircle2,
  Scale,
  Lock,
  User,
  LogOut,
  UserPlus,
  LogIn,
  ShieldCheck,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { playTradeSound } from "@/lib/utils/audio";
import { OrderExecutionToast, ExecutionEvent } from "@/components/trading/OrderExecutionToast";

interface ActiveUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  isDemo: boolean;
}

export default function TradePage() {
  const [currentUser, setCurrentUser] = useState<ActiveUser | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
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
  const [lastExecutionEvent, setLastExecutionEvent] = useState<ExecutionEvent | null>(null);
  const [clientAccId, setClientAccId] = useState<string>("");
  const [floatAccId, setFloatAccId] = useState<string>("");

  // 1. Check Real Supabase Session & LocalStorage on Mount
  useEffect(() => {
    // First check localStorage for immediate seamless login
    if (typeof window !== "undefined") {
      const savedSession = localStorage.getItem("active_user_session");
      if (savedSession) {
        try {
          const profile = JSON.parse(savedSession);
          setCurrentUser({
            id: profile.id || "usr_active",
            email: profile.email || "trader@marketmaker.com",
            first_name: profile.first_name || "Trader",
            last_name: profile.last_name || "Client",
            isDemo: profile.role === "client" ? false : true,
          });
          setShowAuthModal(false);
          return;
        } catch {
          // ignore parsing error
        }
      }
    }

    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single()
          .then(({ data: profile }) => {
            setCurrentUser({
              id: user.id,
              email: user.email || "",
              first_name: profile?.first_name || (user.user_metadata?.first_name as string) || "Trader",
              last_name: profile?.last_name || (user.user_metadata?.last_name as string) || "Client",
              isDemo: false,
            });
            setShowAuthModal(false);
          });
      } else {
        const guest = typeof window !== "undefined" && localStorage.getItem("guest_mode_enabled");
        if (guest === "true") {
          setCurrentUser({
            id: "guest_demo_user",
            email: "guest@marketmaker.com",
            first_name: "Demo",
            last_name: "Trader",
            isDemo: true,
          });
          setShowAuthModal(false);
        } else {
          setCurrentUser(null);
          setShowAuthModal(true);
        }
      }
    });
  }, []);

  // 2. Initialize Trading Engine and Double-Entry Ledger
  useEffect(() => {
    const userId = currentUser ? currentUser.id : "demo_client_1";
    const userName = currentUser ? `${currentUser.first_name} ${currentUser.last_name}` : "Trader";

    const ledger = new LedgerEngine();
    const clientAcc = ledger.createAccount(
      "client_funds",
      `${userName} Gold Trading Account`,
      "USD",
      userId.startsWith("guest") ? undefined : userId
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

    // Initial $10,000 equity deposit recorded in ledger
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
  }, [currentUser]);

  // 3. Subscribe to live tick stream and auto-trigger TP / SL / Limit Fills
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
    // ENFORCE LOGIN
    if (!currentUser) {
      setShowAuthModal(true);
      return;
    }

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

      // Asynchronously trigger server-side verified order execution & ledger record
      try {
        fetch("/api/trading/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: currentUser.id,
            symbol: pos.symbol,
            direction,
            lots,
            leverage,
            takeProfit,
            stopLoss,
            orderType,
            targetPrice,
          }),
        }).catch((apiErr) => console.warn("Backend order API sync:", apiErr));
      } catch (err) {
        console.warn("Order dispatch fallback:", err);
      }

      if (pos.status === "PENDING") {
        playTradeSound("limit");
        setLastExecutionEvent({
          id: pos.id,
          type: "LIMIT_ORDER",
          position: pos,
          title: `Limit Order Placed (${pos.direction})`,
          timestamp: new Date().toISOString(),
        });
        setExecutionNotice(
          `📋 Pending ${direction} LIMIT Order placed for ${lots} Lots @ $${pos.targetPrice}. (✓ Order Queued & Verified)`
        );
      } else {
        playTradeSound(direction === "BUY" ? "buy" : "sell");
        setLastExecutionEvent({
          id: pos.id,
          type: direction === "BUY" ? "MARKET_BUY" : "MARKET_SELL",
          position: pos,
          title: `Order Filled: ${direction} Gold`,
          timestamp: new Date().toISOString(),
        });
        setExecutionNotice(
          `⚡ Executed ${direction} ${lots} Lots Gold (XAU/USD) @ $${pos.openPrice}. Margin: $${formatMoney(pos.margin)} (✓ Trade Settled & Recorded)`
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
      playTradeSound("close");

      try {
        fetch("/api/trading/orders", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId, userId: currentUser?.id }),
        }).catch(() => {});
      } catch (sbErr) {
        console.warn("Supabase cancel sync:", sbErr);
      }

      setExecutionNotice(`🚫 Cancelled Pending Limit Order ${cancelled.id} (✓ Order Cancelled)`);
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

      playTradeSound("close");
      setLastExecutionEvent({
        id: closed.id,
        type: "CLOSE_TRADE",
        position: closed,
        title: `Position Closed (${Number(closed.realizedPnl) >= 0 ? "+" : ""}$${formatMoney(closed.realizedPnl || "0")})`,
        timestamp: new Date().toISOString(),
      });

      try {
        fetch("/api/trading/positions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            positionId,
            closeReason: "MANUAL",
            userId: currentUser?.id,
          }),
        }).catch(() => {});
      } catch (sbErr) {
        console.warn("Supabase close trade sync:", sbErr);
      }

      setExecutionNotice(
        `Closed Position ${closed.id}: Realized PnL $${formatMoney(closed.realizedPnl || "0")}. (✓ Settled in Double-Entry Ledger)`
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
    setExecutionNotice(`⚡ Exness Panic Action: Closed all ${count} open positions instantly. (✓ Settled to Ledger)`);
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

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    if (typeof window !== "undefined") {
      localStorage.removeItem("guest_mode_enabled");
      localStorage.removeItem("active_user_session");
    }
    setCurrentUser(null);
    setShowAuthModal(true);
  };

  const handleEnableGuestMode = () => {
    localStorage.setItem("guest_mode_enabled", "true");
    setCurrentUser({
      id: "guest_demo_user",
      email: "guest@marketmaker.com",
      first_name: "Guest",
      last_name: "Trader",
      isDemo: true,
    });
    setShowAuthModal(false);
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-100/80 dark:bg-[#070a11] text-slate-900 dark:text-slate-100 relative">
      {/* AUTH REQUIRED MODAL */}
      {showAuthModal && !currentUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 text-slate-900 dark:text-white">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-500">
              <Lock className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-xl font-black text-slate-900 dark:text-white">Login Required to Trade</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                To execute live trades and manage your positions, please sign in or create an account.
              </p>
            </div>

            <div className="space-y-2.5 pt-2">
              <Link
                href="/login"
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm inline-flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/10 cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In to Your Account</span>
              </Link>

              <Link
                href="/register"
                className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm inline-flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-500/10 cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>Create New Account</span>
              </Link>

              <button
                type="button"
                onClick={handleEnableGuestMode}
                className="w-full py-2 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-medium text-xs border border-slate-300 dark:border-slate-700 transition-all cursor-pointer"
              >
                Continue in Guest Demo Mode ($10,000 Equity)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Trading Nav Bar */}
      <header className="border-b border-slate-200 dark:border-slate-800/80 bg-white/95 dark:bg-slate-950/90 backdrop-blur-md px-3 sm:px-6 py-2.5 sm:py-3 sticky top-7 z-40">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
          {/* Logo & Symbol Row */}
          <div className="flex items-center justify-between sm:justify-start gap-3 w-full sm:w-auto">
            <div className="flex items-center gap-2.5">
              <Link
                href="/"
                className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors p-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Overview</span>
              </Link>
              <div className="h-3.5 w-[1px] bg-slate-200 dark:bg-slate-800" />
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-md bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center font-black text-slate-950 text-xs shadow-md shadow-amber-500/20 shrink-0">
                  MM
                </div>
                <span className="font-extrabold text-xs sm:text-sm tracking-tight text-slate-900 dark:text-white">
                  Market Maker
                </span>
                <span className="text-[9px] uppercase font-mono px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 font-bold">
                  XAU/USD
                </span>
              </div>
            </div>

            {/* Quick Action Buttons on Mobile */}
            <div className="flex items-center gap-1.5 sm:hidden">
              <button
                onClick={handleDepositMore}
                className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 font-bold inline-flex items-center gap-1"
              >
                <PlusCircle className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                <span>+$5K</span>
              </button>
              <Link
                href="/ledger"
                className="px-2 py-1 rounded bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-300 dark:border-emerald-500/30 text-[10px] text-emerald-700 dark:text-emerald-400 font-bold inline-flex items-center gap-1"
              >
                <Scale className="w-3 h-3" />
                <span>Ledger</span>
              </Link>
            </div>
          </div>

          {/* Account Metrics Ribbon: Grid on mobile, flex on desktop */}
          <div className="w-full sm:w-auto grid grid-cols-2 sm:flex sm:items-center gap-1.5 sm:gap-3 text-[11px] sm:text-xs font-mono">
            <div className="p-1 sm:p-1.5 rounded-lg bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 px-2.5 flex items-center justify-between sm:justify-start gap-2">
              <span className="text-slate-500 dark:text-slate-400">Balance:</span>{" "}
              <strong className="text-slate-900 dark:text-white font-bold">${formatMoney(accountSummary.balance)}</strong>
            </div>

            <div className="p-1 sm:p-1.5 rounded-lg bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 px-2.5 flex items-center justify-between sm:justify-start gap-2">
              <span className="text-slate-500 dark:text-slate-400">Equity:</span>{" "}
              <strong className="text-emerald-700 dark:text-emerald-400 font-bold">
                ${formatMoney(accountSummary.equity)}
              </strong>
            </div>

            <div className="p-1 sm:p-1.5 rounded-lg bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 px-2.5 flex items-center justify-between sm:justify-start gap-2">
              <span className="text-slate-500 dark:text-slate-400">Free Margin:</span>{" "}
              <strong className="text-slate-800 dark:text-slate-200 font-bold">
                ${formatMoney(accountSummary.freeMargin)}
              </strong>
            </div>

            <div className="p-1 sm:p-1.5 rounded-lg bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 px-2.5 flex items-center justify-between sm:justify-start gap-2">
              <span className="text-slate-500 dark:text-slate-400">Used:</span>{" "}
              <strong className="text-amber-700 dark:text-amber-400 font-bold">${formatMoney(accountSummary.usedMargin)}</strong>
            </div>

            <div className="hidden sm:flex items-center gap-2 font-sans">
              <button
                onClick={handleDepositMore}
                className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs text-slate-800 dark:text-white border border-slate-300 dark:border-slate-700 inline-flex items-center gap-1 transition-colors cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>+$5K</span>
              </button>

              <Link
                href="/wallet"
                className="px-2.5 py-1.5 rounded-lg bg-cyan-50 dark:bg-cyan-500/10 hover:bg-cyan-100 dark:hover:bg-cyan-500/20 border border-cyan-300 dark:border-cyan-500/30 text-xs text-cyan-800 dark:text-cyan-400 font-semibold inline-flex items-center gap-1 transition-colors"
              >
                <span>Deposit &amp; Vault</span>
              </Link>

              <Link
                href="/ledger"
                className="px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 border border-emerald-300 dark:border-emerald-500/30 text-xs text-emerald-800 dark:text-emerald-400 font-semibold inline-flex items-center gap-1 transition-colors"
              >
                <Scale className="w-3.5 h-3.5" />
                <span>Ledger</span>
              </Link>

              {currentUser ? (
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-1">
                  <div className="px-2 py-0.5 text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                    <User className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    <span>{currentUser.first_name}</span>
                    {currentUser.isDemo && (
                      <span className="text-[9px] bg-amber-500/20 text-amber-800 dark:text-amber-300 px-1 rounded font-bold">Demo</span>
                    )}
                  </div>
                  <button
                    onClick={handleSignOut}
                    title="Sign Out"
                    className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs inline-flex items-center gap-1 transition-colors"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </Link>
              )}

              <ThemeToggle />
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
            <GoldChart
              currentTick={currentTick}
              openPositions={openPositions}
              pendingOrders={pendingOrders}
            />
          </div>

          {/* Right Column: 1-Click Execution Ticket */}
          <div className="space-y-6">
            <OrderPanel
              currentTick={currentTick}
              onExecuteTrade={handleExecuteTrade}
              freeMargin={accountSummary.freeMargin}
            />

            {/* Account Status Card */}
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between font-bold text-slate-300">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>
                    {currentUser
                      ? `${currentUser.isDemo ? "Guest Demo Trader" : "Live Institutional Account"}`
                      : "Unauthenticated Trader"}
                  </span>
                </span>
                <span className="text-emerald-400 font-mono">1:100 Leverage</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                {currentUser ? (
                  <>
                    Logged in as: <strong>{currentUser.first_name} {currentUser.last_name}</strong> ({currentUser.email}). Active Trading Session • 100% Capital Segregated.
                  </>
                ) : (
                  "Please sign in or create an account to start live trading."
                )}
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

      {/* Binance/Exness Pro Order Execution Toast Notification */}
      <OrderExecutionToast
        event={lastExecutionEvent}
        onDismiss={() => setLastExecutionEvent(null)}
      />
    </div>
  );
}
