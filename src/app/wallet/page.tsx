"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Copy,
  Check,
  ShieldCheck,
  Zap,
  AlertCircle,
  Clock,
  ArrowLeft,
  CheckCircle2,
  Lock,
  Layers,
  Sparkles,
} from "lucide-react";
import { getActiveDemoSession } from "@/lib/auth/demo-session";
import { LedgerEngine } from "@/lib/ledger/service";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  SupportedNetwork,
  WithdrawalRequest,
  DepositEvent,
} from "@/types/vault";
import {
  NETWORK_CONFIGS,
  getDepositAddress,
  processDeposit,
  processWithdrawal,
  isValidCryptoAddress,
} from "@/lib/vault/service";
import { formatMoney } from "@/lib/money";

export default function WalletPage() {
  const user = getActiveDemoSession("client");

  // State
  const [activeTab, setActiveTab] = useState<"deposit" | "withdraw">("deposit");
  const [network, setNetwork] = useState<SupportedNetwork>("TRC20");
  const [copied, setCopied] = useState(false);
  const depositAmount = "100.00";
  const [withdrawAddress, setWithdrawAddress] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("50.00");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Ledger Instance
  const [engineInstance] = useState(() => new LedgerEngine());
  const [clientAccId, setClientAccId] = useState<string>("");
  const [floatAccId, setFloatAccId] = useState<string>("");
  const [feeAccId, setFeeAccId] = useState<string>("");
  const [balance, setBalance] = useState<string>("5000.00");

  // History logs
  const [deposits, setDeposits] = useState<DepositEvent[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);

  // Initialize accounts on mount
  useEffect(() => {
    const cAcc = engineInstance.createAccount(
      "client_funds",
      `${user.first_name}'s Trading Account`,
      "USD",
      user.id
    );
    const flAcc = engineInstance.createAccount(
      "payment_processor_float",
      "Crypto Custody Float",
      "USD"
    );
    const feAcc = engineInstance.createAccount(
      "fee_revenue",
      "Network Fee Pool",
      "USD"
    );

    setClientAccId(cAcc.id);
    setFloatAccId(flAcc.id);
    setFeeAccId(feAcc.id);

    // Seed initial equity
    engineInstance.recordTransaction({
      description: "Initial Account Balance",
      reference_type: "initial_deposit",
      entries: [
        {
          account_id: flAcc.id,
          direction: "debit",
          amount: "5000.00",
          entry_type: "deposit",
          nature: "Initial custodial balance",
        },
        {
          account_id: cAcc.id,
          direction: "credit",
          amount: "5000.00",
          entry_type: "deposit",
          nature: "Initial equity grant",
        },
      ],
    });

    setBalance(engineInstance.getAccountBalance(cAcc.id));
  }, [engineInstance, user]);

  const depositDetails = getDepositAddress(user.id, network);
  const netConfig = NETWORK_CONFIGS[network];

  // Handle Copy Address
  const handleCopy = () => {
    navigator.clipboard.writeText(depositDetails.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Handle Simulate Deposit
  const handleSimulateDeposit = async (customAmount?: string) => {
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const amountToProcess = customAmount || depositAmount;
      const result = await processDeposit(
        engineInstance,
        clientAccId,
        floatAccId,
        user.id,
        amountToProcess,
        network
      );

      // Also persist to Supabase via backend API
      try {
        await fetch("/api/wallet/deposit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user.id,
            network,
            amount: amountToProcess,
            txHash: `tx_${Date.now()}`,
          }),
        });
      } catch (apiErr) {
        console.warn("Backend deposit API sync:", apiErr);
      }

      setBalance(result.newBalance);
      setDeposits((prev) => [result.depositEvent, ...prev]);
      setSuccessMessage(
        `Success: Received +$${formatMoney(amountToProcess)} USDT on ${network}! Balance updated in Ledger.`
      );
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to process deposit");
    } finally {
      setLoading(false);
    }
  };

  // Handle Submit Withdrawal
  const handleWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      if (!isValidCryptoAddress(withdrawAddress, network)) {
        throw new Error(
          `Invalid ${network} address format. Please provide a valid ${network} wallet address.`
        );
      }

      const result = await processWithdrawal(
        engineInstance,
        clientAccId,
        floatAccId,
        feeAccId,
        user.id,
        withdrawAddress,
        withdrawAmount,
        network
      );

      // Also persist to Supabase via backend API
      try {
        await fetch("/api/wallet/withdraw", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user.id,
            network,
            destinationAddress: withdrawAddress,
            amount: withdrawAmount,
          }),
        });
      } catch (apiErr) {
        console.warn("Backend withdrawal API sync:", apiErr);
      }

      setBalance(result.newBalance);
      setWithdrawals((prev) => [result.withdrawalRequest, ...prev]);
      setSuccessMessage(
        `Withdrawal Disbursed: $${formatMoney(result.withdrawalRequest.net_amount)} USDT sent to ${withdrawAddress.substring(0, 8)}... (Fee: $${result.withdrawalRequest.fee})`
      );
      setWithdrawAddress("");
    } catch (err: any) {
      setErrorMessage(err.message || "Withdrawal failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#070a11] text-slate-100 pb-16">
      {/* Top Navigation */}
      <header className="w-full border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md px-3 sm:px-6 py-3 sticky top-6 z-40">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/"
              className="p-1.5 sm:p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-all inline-flex items-center gap-1 text-xs font-semibold"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Back</span>
            </Link>
            <div className="h-4 w-px bg-slate-800" />
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center font-black text-slate-950 text-xs shadow-lg shadow-emerald-500/20 shrink-0">
                <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-950" />
              </div>
              <div>
                <h1 className="font-extrabold text-sm sm:text-base tracking-tight text-white flex items-center gap-1.5">
                  <span>Crypto Custody</span>
                  <span className="text-[9px] uppercase font-mono px-1.5 py-0.2 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold hidden xs:inline">
                    Segregated
                  </span>
                </h1>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/trade"
              className="px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all shadow-md shadow-amber-500/10 inline-flex items-center gap-1"
            >
              <Zap className="w-3.5 h-3.5 fill-slate-950" />
              <span className="hidden xs:inline">Trade Terminal</span>
              <span className="xs:hidden">Trade</span>
            </Link>
            <Link
              href="/ledger"
              className="px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs font-semibold text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/20 border border-emerald-500/30 transition-all inline-flex items-center gap-1"
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Ledger</span>
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 pt-8 flex-1 flex flex-col gap-6">
        {/* Balance Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-950/90 border border-slate-800 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl" />
            <div className="flex items-center justify-between text-xs font-semibold text-slate-400 mb-2">
              <span>Available Trading Balance</span>
              <span className="flex items-center gap-1 text-emerald-400">
                <ShieldCheck className="w-3.5 h-3.5" /> Verified
              </span>
            </div>
            <div className="text-3xl font-extrabold font-mono text-white tracking-tight">
              ${formatMoney(balance)}{" "}
              <span className="text-xs font-normal text-slate-400">USD</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Derived in real-time from Double-Entry Ledger
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="text-xs font-semibold text-slate-400 mb-2">Deposit Currency</div>
            <div className="text-2xl font-bold font-mono text-white flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs flex items-center justify-center font-extrabold">
                ₮
              </span>
              <span>USDT (Tether)</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              1 USDT = 1.00 USD (Zero FX Conversion Loss)
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="text-xs font-semibold text-slate-400 mb-2">Custody Model</div>
            <div className="text-sm font-bold text-white flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-amber-400" />
              <span>Segregated Client Vault</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
              Funds are isolated from operating accounts. Safe from exchange freeze risk.
            </p>
          </div>
        </div>

        {/* Success/Error Alerts */}
        {successMessage && (
          <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-sm flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}
        {errorMessage && (
          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-sm flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Tab Selector & Forms Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Action Box (Deposit / Withdraw) */}
          <div className="lg:col-span-7 bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
            {/* Tabs Header */}
            <div className="flex border-b border-slate-800 bg-slate-950/50 p-2 gap-2">
              <button
                onClick={() => setActiveTab("deposit")}
                className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  activeTab === "deposit"
                    ? "bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20"
                    : "text-slate-400 hover:text-white hover:bg-slate-900"
                }`}
              >
                <ArrowDownLeft className="w-4 h-4" />
                <span>Deposit USDT</span>
              </button>
              <button
                onClick={() => setActiveTab("withdraw")}
                className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  activeTab === "withdraw"
                    ? "bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20"
                    : "text-slate-400 hover:text-white hover:bg-slate-900"
                }`}
              >
                <ArrowUpRight className="w-4 h-4" />
                <span>Withdraw Funds</span>
              </button>
            </div>

            {/* Tab 1: DEPOSIT */}
            {activeTab === "deposit" && (
              <div className="p-6 flex flex-col gap-6">
                {/* Network Selector */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-2">
                    1. Select Deposit Network
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {(["TRC20", "BEP20", "POLYGON"] as SupportedNetwork[]).map((net) => (
                      <button
                        key={net}
                        type="button"
                        onClick={() => setNetwork(net)}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          network === net
                            ? "bg-emerald-500/10 border-emerald-500 text-white shadow-md shadow-emerald-500/10"
                            : "bg-slate-950/50 border-slate-800/80 text-slate-400 hover:border-slate-700"
                        }`}
                      >
                        <div className="text-xs font-bold text-white">{NETWORK_CONFIGS[net].name}</div>
                        <div className="text-[10px] text-slate-400 mt-1 font-mono">
                          Fee: ~${NETWORK_CONFIGS[net].networkFee}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* QR Code & Address Display */}
                <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row items-center gap-6">
                  {/* QR Code */}
                  <div className="p-3 bg-white rounded-xl shadow-lg shrink-0">
                    <QRCodeSVG
                      value={depositDetails.address}
                      size={140}
                      level="H"
                      includeMargin={false}
                    />
                  </div>

                  {/* Address & Copy Details */}
                  <div className="flex-1 w-full flex flex-col gap-3">
                    <div>
                      <div className="text-[10px] uppercase font-mono text-slate-400 font-semibold mb-1">
                        Your Personal {netConfig.name} Deposit Address
                      </div>
                      <div className="font-mono text-xs sm:text-sm text-emerald-300 bg-slate-900 border border-slate-800 rounded-lg p-2.5 break-all select-all">
                        {depositDetails.address}
                      </div>
                    </div>

                    <button
                      onClick={handleCopy}
                      className="w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all inline-flex items-center justify-center gap-2"
                    >
                      {copied ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-400" />
                          <span className="text-emerald-300">Address Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>Copy Address</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Testnet & Demo Simulation Action */}
                <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 flex flex-col gap-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>Free Testnet Deposit Simulator (For Demo / Client Testing)</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Instantly simulate an on-chain USDT deposit without spending real money. Credits your
                    verified double-entry ledger in real-time.
                  </p>

                  <div className="flex items-center gap-2">
                    <button
                      disabled={loading}
                      onClick={() => handleSimulateDeposit("100.00")}
                      className="flex-1 py-2 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all disabled:opacity-50"
                    >
                      + $100 USDT
                    </button>
                    <button
                      disabled={loading}
                      onClick={() => handleSimulateDeposit("500.00")}
                      className="flex-1 py-2 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all disabled:opacity-50"
                    >
                      + $500 USDT
                    </button>
                    <button
                      disabled={loading}
                      onClick={() => handleSimulateDeposit("1000.00")}
                      className="flex-1 py-2 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all disabled:opacity-50"
                    >
                      + $1,000 USDT
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: WITHDRAW */}
            {activeTab === "withdraw" && (
              <form onSubmit={handleWithdrawal} className="p-6 flex flex-col gap-5">
                {/* Network */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-2">
                    1. Payout Network
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {(["TRC20", "BEP20", "POLYGON"] as SupportedNetwork[]).map((net) => (
                      <button
                        key={net}
                        type="button"
                        onClick={() => setNetwork(net)}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          network === net
                            ? "bg-amber-500/10 border-amber-500 text-white shadow-md shadow-amber-500/10"
                            : "bg-slate-950/50 border-slate-800/80 text-slate-400 hover:border-slate-700"
                        }`}
                      >
                        <div className="text-xs font-bold text-white">{NETWORK_CONFIGS[net].name}</div>
                        <div className="text-[10px] text-slate-400 mt-1 font-mono">
                          Fee: ${NETWORK_CONFIGS[net].networkFee} USDT
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Destination Address */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                    2. Destination USDT ({network}) Address
                  </label>
                  <input
                    type="text"
                    required
                    value={withdrawAddress}
                    onChange={(e) => setWithdrawAddress(e.target.value)}
                    placeholder={
                      network === "TRC20"
                        ? "Enter TRC20 address starting with T..."
                        : "Enter EVM address starting with 0x..."
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Amount */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-semibold text-slate-300">
                      3. Withdrawal Amount (USD)
                    </label>
                    <span className="text-[11px] text-slate-400 font-mono">
                      Available: ${formatMoney(balance)}
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      min="10"
                      step="0.01"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                    />
                    <button
                      type="button"
                      onClick={() => setWithdrawAmount(balance)}
                      className="absolute right-2 top-2 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-amber-400 rounded-md"
                    >
                      MAX
                    </button>
                  </div>
                </div>

                {/* Summary calculation */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 flex flex-col gap-2 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Requested Amount:</span>
                    <span className="font-mono text-white">${formatMoney(withdrawAmount || "0")}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Network &amp; Gas Fee:</span>
                    <span className="font-mono text-rose-400">
                      -${formatMoney(netConfig.networkFee)} USDT
                    </span>
                  </div>
                  <div className="h-px bg-slate-800 my-1" />
                  <div className="flex justify-between text-slate-200 font-bold">
                    <span>You Receive (Net Payout):</span>
                    <span className="font-mono text-emerald-400 text-sm">
                      $
                      {formatMoney(
                        Math.max(
                          0,
                          Number(withdrawAmount || 0) - Number(netConfig.networkFee)
                        ).toFixed(2)
                      )}{" "}
                      USDT
                    </span>
                  </div>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <span>Processing Payout...</span>
                  ) : (
                    <>
                      <ArrowUpRight className="w-4 h-4" />
                      <span>Submit Instant Withdrawal Request</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

          {/* Right Column: Security Specs & Live Ledger Status */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            {/* Security Explanation Box */}
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col gap-4">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>How This Protects Your Funds</span>
              </h2>

              <ul className="space-y-3 text-xs text-slate-300">
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-400 font-mono text-[10px] flex items-center justify-center shrink-0 mt-0.5 font-bold">
                    1
                  </span>
                  <div>
                    <strong className="text-white">Deterministic HD Address:</strong> Every user gets
                    a cryptographically derived USDT address. Deposits route directly into company
                    custody without intermediary hold.
                  </div>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-400 font-mono text-[10px] flex items-center justify-center shrink-0 mt-0.5 font-bold">
                    2
                  </span>
                  <div>
                    <strong className="text-white">Double-Entry Accounting:</strong> No simple
                    database counter is incremented. Both a Payment Float debit and Client Equity credit
                    are posted immutably.
                  </div>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-400 font-mono text-[10px] flex items-center justify-center shrink-0 mt-0.5 font-bold">
                    3
                  </span>
                  <div>
                    <strong className="text-white">Zero Third-Party Freeze:</strong> Because you hold
                    the 12-word recovery phrase, no exchange or processor can freeze client deposits.
                  </div>
                </li>
              </ul>
            </div>

            {/* Quick Network Status Card */}
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col gap-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Supported Blockchain Specs
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                  <span className="text-slate-400">TRON Network (TRC20)</span>
                  <span className="text-emerald-400 font-mono font-semibold">19 Confirmations (~1m)</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                  <span className="text-slate-400">BNB Smart Chain (BEP20)</span>
                  <span className="text-emerald-400 font-mono font-semibold">15 Confirmations (~15s)</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-400">Polygon POS</span>
                  <span className="text-emerald-400 font-mono font-semibold">32 Confirmations (~1.5m)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Transaction History Log Table */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              <span>Recent Vault Activity &amp; Audit Trail</span>
            </h3>
            <span className="text-xs font-mono text-slate-400">
              Total Recorded: {deposits.length + withdrawals.length + 1}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                  <th className="pb-3">Type</th>
                  <th className="pb-3">Network</th>
                  <th className="pb-3">Amount</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Reference / Hash</th>
                  <th className="pb-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {deposits.map((dep) => (
                  <tr key={dep.id} className="hover:bg-slate-800/30">
                    <td className="py-3 text-emerald-400 font-bold flex items-center gap-1.5">
                      <ArrowDownLeft className="w-3.5 h-3.5" /> Deposit
                    </td>
                    <td className="py-3 text-slate-300">{dep.network}</td>
                    <td className="py-3 text-emerald-400 font-bold">
                      +${formatMoney(dep.amount)} USDT
                    </td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                        Confirmed
                      </span>
                    </td>
                    <td className="py-3 text-slate-400 truncate max-w-[150px]">
                      {dep.tx_hash}
                    </td>
                    <td className="py-3 text-slate-500 text-[11px]">
                      {new Date(dep.created_at).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}

                {withdrawals.map((wdr) => (
                  <tr key={wdr.id} className="hover:bg-slate-800/30">
                    <td className="py-3 text-amber-400 font-bold flex items-center gap-1.5">
                      <ArrowUpRight className="w-3.5 h-3.5" /> Withdrawal
                    </td>
                    <td className="py-3 text-slate-300">{wdr.network}</td>
                    <td className="py-3 text-amber-400 font-bold">
                      -${formatMoney(wdr.amount)} USDT
                    </td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-[10px] font-bold border border-amber-500/30">
                        Completed
                      </span>
                    </td>
                    <td className="py-3 text-slate-400 truncate max-w-[150px]">
                      {wdr.tx_hash}
                    </td>
                    <td className="py-3 text-slate-500 text-[11px]">
                      {new Date(wdr.created_at).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}

                {/* Initial Equity Row */}
                <tr className="hover:bg-slate-800/30">
                  <td className="py-3 text-slate-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" /> Initial Equity
                  </td>
                  <td className="py-3 text-slate-400">USD</td>
                  <td className="py-3 text-slate-300 font-bold">+$5,000.00 USD</td>
                  <td className="py-3">
                    <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-bold">
                      System Grant
                    </span>
                  </td>
                  <td className="py-3 text-slate-500">genesis_deposit_01</td>
                  <td className="py-3 text-slate-500 text-[11px]">Account Creation</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
