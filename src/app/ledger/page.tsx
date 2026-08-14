"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { LedgerEngine, generateAccountStatement } from "@/lib/ledger/service";
import { LedgerAccount, AccountStatement } from "@/types/ledger";
import { formatMoney } from "@/lib/money";
import { getActiveDemoSession } from "@/lib/auth/demo-session";
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
} from "lucide-react";

export default function LedgerPage() {
  const user = getActiveDemoSession("client");
  const [statement, setStatement] = useState<AccountStatement | null>(null);
  const [engineInstance] = useState(() => new LedgerEngine());
  const [clientAcc, setClientAcc] = useState<LedgerAccount | null>(null);
  const [floatAcc, setFloatAcc] = useState<LedgerAccount | null>(null);
  const [feeAcc, setFeeAcc] = useState<LedgerAccount | null>(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // Initialize accounts and seed with initial transactions
  useEffect(() => {
    const cAcc = engineInstance.createAccount(
      "client_funds",
      `${user.first_name} ${user.last_name} Gold Trading Account`,
      "USD",
      user.id
    );
    const flAcc = engineInstance.createAccount(
      "payment_processor_float",
      "Stripe Clearing Float",
      "USD"
    );
    const feAcc = engineInstance.createAccount(
      "fee_revenue",
      "Brokerage Spread & Commission Revenue",
      "USD"
    );

    setClientAcc(cAcc);
    setFloatAcc(flAcc);
    setFeeAcc(feAcc);

    // Initial deposit
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
  }, []);

  const refreshStatement = (accId: string) => {
    const entries = engineInstance.getAccountEntries(accId);
    const stmt = generateAccountStatement(entries, accId, "USD");
    setStatement(stmt);
  };

  const simulateGoldTradeProfit = async () => {
    if (!clientAcc || !feeAcc) return;
    setLoading(true);
    setNotice(null);

    // Balanced trade transaction: +$245.50 PnL credit to client, -$15 commission fee
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
          nature: "Broker Market Maker Liquidity PnL Settle",
        },
      ],
    });

    refreshStatement(clientAcc.id);
    setLoading(false);
    setNotice("Recorded balanced Gold (XAU/USD) transaction: +$245.50 profit, -$15.00 commission.");
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

    refreshStatement(clientAcc.id);
    setLoading(false);
    setNotice("Recorded balanced deposit transaction: +$2,500.00 credit.");
  };

  return (
    <div className="flex-1 flex flex-col max-w-6xl mx-auto w-full px-4 py-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Portal Overview</span>
          </Link>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <Database className="w-7 h-7 text-emerald-400" />
            <span>Double-Entry Financial Ledger</span>
          </h1>
          <p className="text-xs md:text-sm text-slate-400 mt-1">
            Active Trader: <strong className="text-white">{user.first_name} {user.last_name}</strong> • Account: <span className="font-mono text-emerald-400">{clientAcc?.id ?? "Loading..."}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={simulateDeposit}
            disabled={loading}
            className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span>+ Deposit $2,500</span>
          </button>
          <button
            onClick={simulateGoldTradeProfit}
            disabled={loading}
            className="px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-lg shadow-emerald-500/10 cursor-pointer"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Simulate Gold Trade Profit</span>
          </button>
        </div>
      </div>

      {notice && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Derived Balance Card */}
        <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 backdrop-blur-md shadow-lg">
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
        <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 backdrop-blur-md shadow-lg">
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
        <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 backdrop-blur-md shadow-lg">
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
        <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 backdrop-blur-md shadow-lg flex flex-col justify-between">
          <div>
            <div className="text-xs uppercase font-semibold text-slate-400 tracking-wider">
              Constraint Trigger
            </div>
            <div className="text-xs font-mono text-emerald-400 mt-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>DEBITS = CREDITS (0 Drift)</span>
            </div>
          </div>
          <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-800/80">
            Enforced by deferred database check
          </div>
        </div>
      </div>

      {/* Ledger Statement Table */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white">Immutable Ledger Entries</h2>
            <p className="text-xs text-slate-400">
              Complete chronological audit trail for account {clientAcc?.id ?? ""}
            </p>
          </div>
          <button
            onClick={() => clientAcc && refreshStatement(clientAcc.id)}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
            title="Refresh Entries"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 uppercase font-mono text-[11px] border-b border-slate-800">
              <tr>
                <th className="px-6 py-3">Timestamp</th>
                <th className="px-6 py-3">Type</th>
                <th className="px-6 py-3">Nature / Description</th>
                <th className="px-6 py-3">Direction</th>
                <th className="px-6 py-3 text-right">Amount</th>
                <th className="px-6 py-3 text-right">Running Derived Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {!statement || statement.entries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    No ledger entries recorded yet.
                  </td>
                </tr>
              ) : (
                statement.entries.map((entry) => {
                  const isCredit = entry.direction === "credit";
                  return (
                    <tr
                      key={entry.id}
                      className="hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="px-6 py-3.5 text-slate-400 whitespace-nowrap">
                        {new Date(entry.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </td>
                      <td className="px-6 py-3.5">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300 uppercase">
                          {entry.entry_type}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-slate-200 font-sans font-medium">
                        {entry.nature}
                      </td>
                      <td className="px-6 py-3.5">
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
                        className={`px-6 py-3.5 text-right font-bold ${
                          isCredit ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {isCredit ? "+" : "-"}${formatMoney(entry.amount)}
                      </td>
                      <td className="px-6 py-3.5 text-right font-bold text-white">
                        ${formatMoney(entry.running_balance)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
