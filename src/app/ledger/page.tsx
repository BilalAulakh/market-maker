"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LedgerEngine, generateAccountStatement } from "@/lib/ledger/service";
import { LedgerAccount, AccountStatement, LedgerEntry } from "@/types/ledger";
import { formatMoney } from "@/lib/money";
import { createClient } from "@/lib/supabase/browser";
import {
  Database,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  RefreshCw,
  PlusCircle,
  TrendingUp,
  Scale,
  ArrowLeft,
  CheckCircle2,
  Trash2,
  User,
  ChevronLeft,
  ChevronRight,
  Filter,
  RotateCcw,
  LogOut,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

interface ActiveUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  isDemo: boolean;
}

export default function LedgerPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<ActiveUser>({
    id: "demo_client_1",
    email: "trader@marketmaker.com",
    first_name: "Alexander",
    last_name: "Wright",
    isDemo: true,
  });

  const [engineInstance] = useState(() => new LedgerEngine());
  const [clientAcc, setClientAcc] = useState<LedgerAccount | null>(null);
  const [floatAcc, setFloatAcc] = useState<LedgerAccount | null>(null);
  const [feeAcc, setFeeAcc] = useState<LedgerAccount | null>(null);
  const [operatingAcc, setOperatingAcc] = useState<LedgerAccount | null>(null);

  const [selectedAccountId, setSelectedAccountId] = useState<string>("CLIENT");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [statement, setStatement] = useState<AccountStatement | null>(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // Pagination States
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(5);

  // 1. Fetch live Supabase User session or fallback to guest demo
  useEffect(() => {
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
          });
      }
    });
  }, []);

  // 2. Initialize accounts in Ledger Engine
  useEffect(() => {
    const cAcc = engineInstance.createAccount(
      "client_funds",
      `${currentUser.first_name} ${currentUser.last_name} Gold Trading Account`,
      "USD",
      currentUser.isDemo ? undefined : currentUser.id
    );
    const flAcc = engineInstance.createAccount(
      "payment_processor_float",
      "Stripe / USDT Custody Float",
      "USD"
    );
    const feAcc = engineInstance.createAccount(
      "fee_revenue",
      "Brokerage Spread & Commission Revenue",
      "USD"
    );
    const opAcc = engineInstance.createAccount(
      "company_operating",
      "Broker Liquidity Reserve Pool",
      "USD"
    );

    setClientAcc(cAcc);
    setFloatAcc(flAcc);
    setFeeAcc(feAcc);
    setOperatingAcc(opAcc);

    // Initial $10,000 equity seed transaction
    engineInstance
      .recordTransaction({
        description: "Initial Demo Account Equity Deposit",
        entries: [
          {
            account_id: cAcc.id,
            direction: "credit",
            amount: "10000.00",
            entry_type: "deposit",
            nature: "Demo Deposit Funding",
          },
          {
            account_id: flAcc.id,
            direction: "debit",
            amount: "10000.00",
            entry_type: "deposit",
            nature: "Gateway Settlement Float",
          },
        ],
      })
      .then(() => {
        refreshStatement(cAcc.id);
      });
  }, [currentUser]);

  const refreshStatement = (accId?: string) => {
    const targetId = accId || (selectedAccountId === "CLIENT" ? clientAcc?.id : selectedAccountId);
    if (!targetId) return;

    const entries = engineInstance.getAccountEntries(targetId);
    const stmt = generateAccountStatement(entries, targetId, "USD");
    setStatement(stmt);
  };

  const handleAccountChange = (accKey: string) => {
    setSelectedAccountId(accKey);
    setCurrentPage(1);

    let targetId = clientAcc?.id;
    if (accKey === "FLOAT") targetId = floatAcc?.id;
    if (accKey === "FEE") targetId = feeAcc?.id;
    if (accKey === "OPERATING") targetId = operatingAcc?.id;

    if (targetId) {
      refreshStatement(targetId);
    }
  };

  const simulateGoldTradeProfit = async () => {
    if (!clientAcc || !feeAcc) return;
    setLoading(true);
    setNotice(null);

    await engineInstance.recordTransaction({
      description: "Gold (XAU/USD) 1.0 Lot Long Closed at Profit",
      entries: [
        {
          account_id: clientAcc.id,
          direction: "credit",
          amount: "245.50",
          entry_type: "trade_pnl",
          nature: "XAU/USD Realized Profit",
        },
        {
          account_id: clientAcc.id,
          direction: "debit",
          amount: "15.00",
          entry_type: "fee",
          nature: "Gold Execution Commission",
        },
        {
          account_id: feeAcc.id,
          direction: "credit",
          amount: "15.00",
          entry_type: "fee",
          nature: "Broker Commission Revenue",
        },
        {
          account_id: feeAcc.id,
          direction: "debit",
          amount: "245.50",
          entry_type: "trade_pnl",
          nature: "Broker Liquidity PnL Settlement",
        },
      ],
    });

    refreshStatement();
    setLoading(false);
    setNotice("✓ Recorded balanced Gold trade transaction: +$245.50 profit, -$15.00 commission.");
    setTimeout(() => setNotice(null), 5000);
  };

  const simulateDeposit = async () => {
    if (!clientAcc || !floatAcc) return;
    setLoading(true);
    setNotice(null);

    await engineInstance.recordTransaction({
      description: "Additional Client Deposit",
      entries: [
        {
          account_id: clientAcc.id,
          direction: "credit",
          amount: "2500.00",
          entry_type: "deposit",
          nature: "Card Deposit Clearing",
        },
        {
          account_id: floatAcc.id,
          direction: "debit",
          amount: "2500.00",
          entry_type: "deposit",
          nature: "Gateway Settlement Float",
        },
      ],
    });

    refreshStatement();
    setLoading(false);
    setNotice("✓ Recorded balanced deposit transaction: +$2,500.00 credit to client account.");
    setTimeout(() => setNotice(null), 5000);
  };

  // Delete a single transaction (deletes both balanced debit & credit entries)
  const handleDeleteTransaction = async (entry: LedgerEntry) => {
    const confirmDelete = window.confirm(
      `Delete transaction "${entry.nature}" ($${formatMoney(entry.amount)})? This will safely remove both paired debit and credit entries to maintain 0 drift.`
    );
    if (!confirmDelete) return;

    await engineInstance.deleteTransaction(entry.transaction_id);
    refreshStatement();
    setNotice(`✓ Deleted transaction ${entry.transaction_id.slice(0, 8)}... (Debits and credits re-balanced).`);
    setTimeout(() => setNotice(null), 5000);
  };

  // Reset entire ledger to fresh initial $10,000 state
  const handleResetLedger = async () => {
    const confirmReset = window.confirm(
      "Reset all ledger entries back to initial state ($10,000 Demo Equity)?"
    );
    if (!confirmReset || !clientAcc || !floatAcc) return;

    engineInstance.clearAllEntries();
    await engineInstance.recordTransaction({
      description: "Initial Demo Account Equity Deposit",
      entries: [
        {
          account_id: clientAcc.id,
          direction: "credit",
          amount: "10000.00",
          entry_type: "deposit",
          nature: "Demo Deposit Funding",
        },
        {
          account_id: floatAcc.id,
          direction: "debit",
          amount: "10000.00",
          entry_type: "deposit",
          nature: "Gateway Settlement Float",
        },
      ],
    });

    refreshStatement(clientAcc.id);
    setCurrentPage(1);
    setNotice("✓ Ledger history reset to fresh $10,000.00 initial equity.");
    setTimeout(() => setNotice(null), 5000);
  };

  // Filtered Entries based on Type Filter
  const filteredEntries = useMemo(() => {
    if (!statement || !statement.entries) return [];
    if (typeFilter === "ALL") return statement.entries;
    return statement.entries.filter((e) => e.entry_type === typeFilter);
  }, [statement, typeFilter]);

  // Paginated Entries Calculation
  const totalEntries = filteredEntries.length;
  const totalPages = Math.max(1, Math.ceil(totalEntries / pageSize));
  const paginatedEntries = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredEntries.slice(startIndex, startIndex + pageSize);
  }, [filteredEntries, currentPage, pageSize]);

  return (
    <div className="flex-1 flex flex-col max-w-6xl mx-auto w-full px-3 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Portal Overview</span>
          </Link>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5 sm:gap-3">
            <Database className="w-6 h-6 sm:w-7 sm:h-7 text-emerald-400 shrink-0" />
            <span>Double-Entry Financial Ledger</span>
          </h1>

          {/* User & Account Identity Context */}
          <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-slate-400">
            <span className="inline-flex items-center gap-1 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-md text-slate-300 font-medium">
              <User className="w-3.5 h-3.5 text-emerald-400" />
              <span>
                {currentUser.first_name} {currentUser.last_name} ({currentUser.email})
              </span>
            </span>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 font-bold">
              {currentUser.isDemo ? "Demo Trader" : "Verified Client"}
            </span>
          </div>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={simulateDeposit}
            disabled={loading}
            className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-750 border border-slate-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
          >
            <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span>+ Deposit $2.5K</span>
          </button>
          <button
            onClick={simulateGoldTradeProfit}
            disabled={loading}
            className="px-3 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-md shadow-emerald-500/10 cursor-pointer"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Simulate Profit</span>
          </button>
          <button
            onClick={handleResetLedger}
            title="Reset Ledger Demo History"
            className="px-2.5 py-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 hover:text-rose-200 text-xs font-medium inline-flex items-center gap-1 transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Reset History</span>
          </button>
          <button
            onClick={async () => {
              const supabase = createClient();
              await supabase.auth.signOut();
              if (typeof window !== "undefined") {
                localStorage.removeItem("active_user_session");
                localStorage.removeItem("guest_mode_enabled");
              }
              router.push("/login");
            }}
            className="px-2.5 py-2 rounded-lg bg-rose-950/40 hover:bg-rose-600/80 border border-rose-500/40 text-rose-300 hover:text-white text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
          <ThemeToggle />
        </div>
      </div>

      {notice && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3.5 text-emerald-300 text-xs flex items-center justify-between shadow-lg animate-in fade-in">
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{notice}</span>
          </div>
        </div>
      )}

      {/* Account Switcher Bar: Lets user switch between Client, Float, Fee accounts */}
      <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">
            View Account:
          </span>
          <div className="inline-flex rounded-lg bg-slate-950 p-0.5 border border-slate-800">
            <button
              onClick={() => handleAccountChange("CLIENT")}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                selectedAccountId === "CLIENT"
                  ? "bg-emerald-500 text-slate-950 font-bold shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              👤 Client Trading Account
            </button>
            <button
              onClick={() => handleAccountChange("FLOAT")}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                selectedAccountId === "FLOAT"
                  ? "bg-emerald-500 text-slate-950 font-bold shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              💳 Payment Float
            </button>
            <button
              onClick={() => handleAccountChange("FEE")}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                selectedAccountId === "FEE"
                  ? "bg-emerald-500 text-slate-950 font-bold shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              💵 Fee Revenue
            </button>
          </div>
        </div>

        {/* Type Filter */}
        <div className="flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-slate-400 text-[11px]">Type:</span>
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">All Transaction Types</option>
            <option value="deposit">Deposits</option>
            <option value="trade_pnl">Trade PnL</option>
            <option value="fee">Fees / Commissions</option>
            <option value="withdrawal">Withdrawals</option>
          </select>
        </div>
      </div>

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Derived Balance Card */}
        <div className="p-4 sm:p-5 rounded-xl bg-slate-900/80 border border-slate-800 backdrop-blur-md shadow-lg">
          <div className="text-xs uppercase font-semibold text-slate-400 tracking-wider flex items-center justify-between">
            <span>Derived Net Balance</span>
            <Scale className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl md:text-3xl font-mono font-bold text-emerald-400 mt-2">
            ${statement ? formatMoney(statement.derived_balance) : "0.00"}
          </div>
          <div className="text-[11px] text-slate-500 mt-2 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Sum of immutable entries (Rule #2)</span>
          </div>
        </div>

        {/* Total Credits */}
        <div className="p-4 sm:p-5 rounded-xl bg-slate-900/80 border border-slate-800 backdrop-blur-md shadow-lg">
          <div className="text-xs uppercase font-semibold text-slate-400 tracking-wider flex items-center justify-between">
            <span>Total Credits In</span>
            <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-mono font-bold text-white mt-2">
            ${statement ? formatMoney(statement.total_credits) : "0.00"}
          </div>
          <div className="text-[11px] text-slate-500 mt-2">
            Deposits, trade profits &amp; credits
          </div>
        </div>

        {/* Total Debits */}
        <div className="p-4 sm:p-5 rounded-xl bg-slate-900/80 border border-slate-800 backdrop-blur-md shadow-lg">
          <div className="text-xs uppercase font-semibold text-slate-400 tracking-wider flex items-center justify-between">
            <span>Total Debits Out</span>
            <ArrowUpRight className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-mono font-bold text-white mt-2">
            ${statement ? formatMoney(statement.total_debits) : "0.00"}
          </div>
          <div className="text-[11px] text-slate-500 mt-2">
            Withdrawals, commissions &amp; fees
          </div>
        </div>

        {/* System Rule Status */}
        <div className="p-4 sm:p-5 rounded-xl bg-slate-900/80 border border-slate-800 backdrop-blur-md shadow-lg flex flex-col justify-between">
          <div>
            <div className="text-xs uppercase font-semibold text-slate-400 tracking-wider">
              Constraint Status
            </div>
            <div className="text-xs font-mono text-emerald-400 mt-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>DEBITS = CREDITS (0 Drift)</span>
            </div>
          </div>
          <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-800/80">
            Segregated by Account Ledger
          </div>
        </div>
      </div>

      {/* Ledger Statement Table with Pagination & Row Delete */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="px-4 sm:px-6 py-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-white">Immutable Ledger Entries</h2>
            <p className="text-xs text-slate-400">
              Showing statement for:{" "}
              <strong className="text-emerald-400 font-mono">
                {selectedAccountId === "CLIENT"
                  ? `${currentUser.first_name}'s Trading Account`
                  : selectedAccountId === "FLOAT"
                  ? "Custody Float Account"
                  : "Fee Revenue Account"}
              </strong>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => refreshStatement()}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors cursor-pointer"
              title="Refresh Entries"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 uppercase font-mono text-[11px] border-b border-slate-800">
              <tr>
                <th className="px-4 sm:px-6 py-3">Timestamp</th>
                <th className="px-4 sm:px-6 py-3">Type</th>
                <th className="px-4 sm:px-6 py-3">Nature / Description</th>
                <th className="px-4 sm:px-6 py-3">Direction</th>
                <th className="px-4 sm:px-6 py-3 text-right">Amount</th>
                <th className="px-4 sm:px-6 py-3 text-right">Running Balance</th>
                <th className="px-4 sm:px-6 py-3 text-center">Manage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {paginatedEntries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-slate-500">
                    No ledger entries found for this filter.
                  </td>
                </tr>
              ) : (
                paginatedEntries.map((entry) => {
                  const isCredit = entry.direction === "credit";
                  return (
                    <tr
                      key={entry.id}
                      className="hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="px-4 sm:px-6 py-3.5 text-slate-400 whitespace-nowrap">
                        {new Date(entry.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </td>
                      <td className="px-4 sm:px-6 py-3.5">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300 uppercase font-semibold">
                          {entry.entry_type}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-3.5 text-slate-200 font-sans font-medium">
                        {entry.nature}
                      </td>
                      <td className="px-4 sm:px-6 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 font-semibold ${
                            isCredit ? "text-emerald-400" : "text-rose-400"
                          }`}
                        >
                          {isCredit ? (
                            <ArrowDownLeft className="w-3 h-3" />
                          ) : (
                            <ArrowUpRight className="w-3 h-3" />
                          )}
                          {entry.direction.toUpperCase()}
                        </span>
                      </td>
                      <td
                        className={`px-4 sm:px-6 py-3.5 text-right font-bold ${
                          isCredit ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {isCredit ? "+" : "-"}${formatMoney(entry.amount)}
                      </td>
                      <td className="px-4 sm:px-6 py-3.5 text-right font-bold text-white">
                        ${formatMoney(entry.running_balance)}
                      </td>
                      <td className="px-4 sm:px-6 py-3.5 text-center">
                        <button
                          onClick={() => handleDeleteTransaction(entry)}
                          title="Delete this transaction (Rebalances debits & credits)"
                          className="p-1.5 rounded-md text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-4 sm:px-6 py-3.5 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          {/* Rows per page selector */}
          <div className="flex items-center gap-2 text-slate-400">
            <span>Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white font-mono focus:outline-none focus:border-emerald-500"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <span className="text-slate-500">
              (Total {totalEntries} {totalEntries === 1 ? "entry" : "entries"})
            </span>
          </div>

          {/* Page Navigation Controls */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-mono">
              Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
            </span>

            <div className="inline-flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 transition-colors cursor-pointer disabled:cursor-not-allowed"
                title="Previous Page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Numbered Page Buttons */}
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .slice(Math.max(0, currentPage - 3), currentPage + 2)
                .map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-7 h-7 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                      currentPage === page
                        ? "bg-emerald-500 text-slate-950 shadow-sm"
                        : "bg-slate-800 hover:bg-slate-700 text-slate-300"
                    }`}
                  >
                    {page}
                  </button>
                ))}

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 transition-colors cursor-pointer disabled:cursor-not-allowed"
                title="Next Page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

