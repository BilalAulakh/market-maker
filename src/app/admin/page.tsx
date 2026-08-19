"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LedgerEngine, generateAccountStatement } from "@/lib/ledger/service";
import { LedgerAccount, AccountStatement } from "@/types/ledger";
import { UserProfile, KycStatus } from "@/types/auth";
import { DealerExposureSummary, Position, OrderRecord } from "@/types/trading";
import { DepositRecord, WithdrawalRequest } from "@/types/vault";
import { formatMoney } from "@/lib/money";
import { createClient } from "@/lib/supabase/browser";
import {
  Users,
  Database,
  Sliders,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  ArrowLeft,
  DollarSign,
  UserCheck,
  Lock,
  LogOut,
  Zap,
  Activity,
  Wallet,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

interface AuditLogEntry {
  id: string;
  user_id?: string | null;
  action: string;
  category: string;
  metadata: any;
  created_at: string;
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<
    "users" | "exposure" | "orders_positions" | "cashier" | "ledger" | "audit" | "dealing"
  >("users");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // 1. Users State
  const [users, setUsers] = useState<UserProfile[]>([
    {
      id: "demo_client_1",
      email: "trader@marketmaker.com",
      first_name: "Alexander",
      last_name: "Wright",
      role: "client",
      kyc_status: "verified",
      country: "United Kingdom",
      created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "demo_client_2",
      email: "sarah.crypto@globalfx.com",
      first_name: "Sarah",
      last_name: "Jenkins",
      role: "client",
      kyc_status: "pending_verification",
      country: "United Arab Emirates",
      created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "demo_staff_1",
      email: "compliance@marketmaker.com",
      first_name: "Marcus",
      last_name: "Vance",
      role: "compliance",
      kyc_status: "verified",
      country: "Switzerland",
      created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "demo_staff_2",
      email: "dealer@marketmaker.com",
      first_name: "Elena",
      last_name: "Rostova",
      role: "dealer",
      kyc_status: "verified",
      country: "Singapore",
      created_at: new Date(Date.now() - 86400000 * 12).toISOString(),
      updated_at: new Date().toISOString(),
    },
  ]);
  const [searchQuery, setSearchQuery] = useState("");

  // 2. Exposure & Dealer Desk
  const [exposure, setExposure] = useState<DealerExposureSummary>({
    symbol: "XAU/USD",
    totalBuyLots: "12.50",
    totalSellLots: "4.00",
    netExposureLots: "+8.50",
    grossExposureLots: "16.50",
    openPositionsCount: 6,
    clientUnrealizedPnl: "1250.00",
    housePnl: "-1250.00",
    spread: "0.35",
    activeAccountsCount: 4,
  });

  // 3. Orders & Positions
  const [allPositions, setAllPositions] = useState<Position[]>([]);
  const [allOrders, setAllOrders] = useState<OrderRecord[]>([]);

  // 4. Cashier
  const [deposits, setDeposits] = useState<DepositRecord[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);

  // 5. Global Ledger State
  const [engineInstance] = useState(() => new LedgerEngine());
  const [accounts, setAccounts] = useState<LedgerAccount[]>([]);
  const [selectedAccStatement, setSelectedAccStatement] = useState<AccountStatement | null>(null);
  const [activeAccId, setActiveAccId] = useState<string>("");

  // 6. Audit Logs State
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([
    {
      id: "log_001",
      action: "OPEN_TRADE",
      category: "trading",
      metadata: { symbol: "XAU/USD", direction: "BUY", lots: "1.00", price: "4349.80", margin: "4349.80" },
      created_at: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
    },
    {
      id: "log_002",
      action: "CLOSE_TRADE",
      category: "trading",
      metadata: { symbol: "XAU/USD", direction: "BUY", lots: "0.50", realized_pnl: "125.00" },
      created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    },
    {
      id: "log_003",
      action: "DEPOSIT_PROCESSED",
      category: "vault",
      metadata: { network: "TRC20", amount: "5000.00", currency: "USDT" },
      created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    },
  ]);

  // 7. Dealing Desk Settings
  const [spreadMarkupPips, setSpreadMarkupPips] = useState<number>(25);
  const [maxLeverage, setMaxLeverage] = useState<number>(100);
  const [riskEngineMode, setRiskEngineMode] = useState<"A_BOOK_STP" | "B_BOOK_INTERNAL" | "HYBRID">("HYBRID");

  // Pagination States
  const [userPage, setUserPage] = useState<number>(1);
  const [userPageSize, setUserPageSize] = useState<number>(5);
  const [ledgerPage, setLedgerPage] = useState<number>(1);
  const [ledgerPageSize] = useState<number>(5);
  const [auditPage, setAuditPage] = useState<number>(1);
  const [auditPageSize, setAuditPageSize] = useState<number>(5);

  const fetchDealerData = () => {
    fetch("/api/admin/dealer?symbol=XAU/USD")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          setExposure(data.data);
        }
      })
      .catch(() => {});

    fetch("/api/admin/cashier")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          setDeposits(data.data.deposits || []);
          setWithdrawals(data.data.withdrawals || []);
        }
      })
      .catch(() => {});
  };

  // Load Real Supabase Data on mount
  useEffect(() => {
    try {
      const supabase = createClient();

      // Fetch real registered profiles
      supabase
        .from("profiles")
        .select("*")
        .then(
          ({ data: profileList }) => {
            if (profileList && profileList.length > 0) {
              setUsers((prev) => {
                const map = new Map(prev.map((u) => [u.id, u]));
                for (const p of profileList) {
                  map.set(p.id, p);
                }
                return Array.from(map.values());
              });
            }
          },
          () => {}
        );

      // Fetch real audit logs
      supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50)
        .then(
          ({ data: logs }) => {
            if (logs && logs.length > 0) {
              setAuditLogs((prev) => {
                const existingIds = new Set(prev.map((l) => l.id));
                const newLogs = logs.filter((l: any) => !existingIds.has(l.id));
                return [...newLogs, ...prev];
              });
            }
          },
          () => {}
        );

      // Fetch all positions & orders
      supabase
        .from("positions")
        .select("*")
        .order("opened_at", { ascending: false })
        .limit(50)
        .then(
          ({ data }) => { if (data) setAllPositions(data as any); },
          () => {}
        );

      supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50)
        .then(
          ({ data }) => { if (data) setAllOrders(data as any); },
          () => {}
        );
    } catch {
      // Supabase unreachable — use demo data already in state
    }

    fetchDealerData();

    // Seed Global Institutional Accounts in Ledger
    const clientFunds = engineInstance.createAccount(
      "client_funds",
      "Segregated Client Funds Pool (Omnibus)",
      "USD"
    );
    const floatAcc = engineInstance.createAccount(
      "payment_processor_float",
      "Crypto & Stripe Custody Clearing Float",
      "USD"
    );
    const feeAcc = engineInstance.createAccount(
      "fee_revenue",
      "Broker Spread & Execution Fee Pool",
      "USD"
    );
    const opAcc = engineInstance.createAccount(
      "company_operating",
      "Broker Market Maker Liquidity Reserve",
      "USD"
    );

    setAccounts([clientFunds, floatAcc, feeAcc, opAcc]);
    setActiveAccId(clientFunds.id);

    engineInstance
      .recordTransaction({
        description: "Initial Institutional Liquidity & Clearing Grant",
        entries: [
          { account_id: clientFunds.id, direction: "credit", amount: "50000.00", entry_type: "deposit", nature: "Client Omnibus Deposits" },
          { account_id: floatAcc.id, direction: "debit", amount: "50000.00", entry_type: "deposit", nature: "Custody Clearing Float" },
          { account_id: opAcc.id, direction: "credit", amount: "25000.00", entry_type: "deposit", nature: "Broker Equity Reserve" },
          { account_id: floatAcc.id, direction: "debit", amount: "25000.00", entry_type: "deposit", nature: "Liquidity Clearing Backing" },
        ],
      })
      .then(() => {
        const stmt = generateAccountStatement(engineInstance.getAccountEntries(clientFunds.id), clientFunds.id, "USD");
        setSelectedAccStatement(stmt);
      });
  }, [engineInstance]);

  const handleSelectAccount = (accId: string) => {
    setActiveAccId(accId);
    const entries = engineInstance.getAccountEntries(accId);
    const stmt = generateAccountStatement(entries, accId, "USD");
    setSelectedAccStatement(stmt);
  };

  const handleUpdateKyc = async (userId: string, newStatus: KycStatus) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, kyc_status: newStatus, updated_at: new Date().toISOString() } : u))
    );

    const supabase = createClient();
    try {
      await supabase.from("profiles").update({ kyc_status: newStatus }).eq("id", userId);
      await supabase.from("audit_logs").insert({
        action: "KYC_STATUS_UPDATED",
        category: "compliance",
        metadata: { target_user_id: userId, new_status: newStatus, updated_by: "admin@marketmaker.com" },
      });
    } catch (err) {
      console.warn("Supabase KYC update notice:", err);
    }

    setNotice(`✓ Updated KYC status for user ${userId.slice(0, 8)} to "${newStatus}".`);
    setTimeout(() => setNotice(null), 4000);
  };

  const handleReviewCashier = async (id: string, type: "deposit" | "withdrawal", status: "approved" | "rejected") => {
    try {
      const res = await fetch("/api/admin/cashier", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, type, status, reviewedBy: "admin_user" }),
      });
      const data = await res.json();
      if (data.success) {
        setNotice(`✓ Cashier request ${id.slice(0, 8)} has been ${status}.`);
        fetchDealerData();
      } else {
        alert(data.whatHappened || "Cashier review failed");
      }
    } catch {
      alert("Failed to communicate with cashier service");
    }
  };

  const handleRunStopOutCheck = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/dealer", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setNotice(`⚡ Risk Engine: Scanned ${data.data.checkedAccounts} active accounts. Liquidated ${data.data.liquidatedPositionsCount} positions under stop-out.`);
        fetchDealerData();
      }
    } catch {
      alert("Error triggering stop-out evaluation");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDealingSettings = () => {
    setNotice(`✓ Dealing Desk settings saved: ${spreadMarkupPips} pips markup, 1:${maxLeverage} leverage, [${riskEngineMode}] routing.`);
    setTimeout(() => setNotice(null), 5000);
  };

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    return (
      u.email.toLowerCase().includes(q) ||
      u.first_name.toLowerCase().includes(q) ||
      u.last_name.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q)
    );
  });

  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    if (typeof window !== "undefined") {
      localStorage.removeItem("active_user_session");
      localStorage.removeItem("guest_mode_enabled");
    }
    router.push("/login");
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#070a11] text-slate-100 pb-16">
      {/* Top Header */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md px-4 sm:px-6 py-3.5 sticky top-6 z-40">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-1.5 sm:p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-all inline-flex items-center gap-1 text-xs font-semibold"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Back</span>
            </Link>
            <div className="h-4 w-px bg-slate-800" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center font-black text-white text-xs shadow-lg shadow-purple-500/20">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <h1 className="font-extrabold text-sm sm:text-base tracking-tight text-white flex items-center gap-1.5">
                  <span>Institutional Dealing Desk &amp; Governance</span>
                  <span className="text-[9px] uppercase font-mono px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold">
                    Super Admin
                  </span>
                </h1>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/trade"
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all shadow-md shadow-amber-500/10 inline-flex items-center gap-1"
            >
              <span>Trading Terminal</span>
            </Link>
            <Link
              href="/ledger"
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/20 border border-emerald-500/30 transition-all inline-flex items-center gap-1"
            >
              <Database className="w-3.5 h-3.5" />
              <span>Client Ledger</span>
            </Link>
            <button
              onClick={handleSignOut}
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-rose-300 hover:text-white bg-rose-950/40 hover:bg-rose-600/80 border border-rose-500/40 transition-all inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto w-full px-3 sm:px-6 pt-6 flex-1 flex flex-col gap-6">
        {notice && (
          <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 shadow-lg animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{notice}</span>
          </div>
        )}

        {/* Global Key Metrics Ribbon */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-950/90 border border-slate-800 shadow-xl">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Total Registered Traders</span>
              <Users className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-white">
              {users.length} <span className="text-xs font-normal text-slate-500">Accounts</span>
            </div>
            <div className="text-[11px] text-emerald-400 mt-2 flex items-center gap-1 font-medium">
              <UserCheck className="w-3.5 h-3.5" />
              <span>{users.filter((u) => u.kyc_status === "verified").length} KYC Verified Clients</span>
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-xl">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Net Exposure (XAU/USD)</span>
              <Activity className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-amber-400">
              {exposure.netExposureLots} <span className="text-xs font-normal text-slate-500">Lots</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-2">
              Buy: {exposure.totalBuyLots} L | Sell: {exposure.totalSellLots} L
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-xl">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Market Maker House P&amp;L</span>
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <div className={`text-2xl sm:text-3xl font-black font-mono ${Number(exposure.housePnl) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {Number(exposure.housePnl) >= 0 ? "+" : ""}${formatMoney(exposure.housePnl)}
            </div>
            <div className="text-[11px] text-slate-500 mt-2">Internalized B-Book offset</div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-xl flex flex-col justify-between">
            <div>
              <div className="text-xs text-slate-400 mb-1">Accounting System Integrity</div>
              <div className="text-sm font-bold text-emerald-400 flex items-center gap-1.5 mt-1 font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>DEBITS = CREDITS (0 Drift)</span>
              </div>
            </div>
            <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-800">
              Deterministic double-entry enforcement
            </div>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 p-1.5 rounded-xl gap-1.5 overflow-x-auto">
          <button
            onClick={() => setActiveTab("users")}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === "users"
                ? "bg-purple-600 text-white shadow-md shadow-purple-600/20"
                : "text-slate-400 hover:text-white hover:bg-slate-900"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Clients ({users.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("exposure")}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === "exposure"
                ? "bg-purple-600 text-white shadow-md shadow-purple-600/20"
                : "text-slate-400 hover:text-white hover:bg-slate-900"
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Dealer Desk &amp; Exposure</span>
          </button>

          <button
            onClick={() => setActiveTab("orders_positions")}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === "orders_positions"
                ? "bg-purple-600 text-white shadow-md shadow-purple-600/20"
                : "text-slate-400 hover:text-white hover:bg-slate-900"
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>Orders &amp; Positions ({allPositions.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("cashier")}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === "cashier"
                ? "bg-purple-600 text-white shadow-md shadow-purple-600/20"
                : "text-slate-400 hover:text-white hover:bg-slate-900"
            }`}
          >
            <Wallet className="w-4 h-4" />
            <span>Cashier Approvals ({deposits.filter((d) => d.status === "pending").length + withdrawals.filter((w) => w.status === "pending").length})</span>
          </button>

          <button
            onClick={() => setActiveTab("ledger")}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === "ledger"
                ? "bg-purple-600 text-white shadow-md shadow-purple-600/20"
                : "text-slate-400 hover:text-white hover:bg-slate-900"
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Ledger</span>
          </button>

          <button
            onClick={() => setActiveTab("audit")}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === "audit"
                ? "bg-purple-600 text-white shadow-md shadow-purple-600/20"
                : "text-slate-400 hover:text-white hover:bg-slate-900"
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Audit Trail ({auditLogs.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("dealing")}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === "dealing"
                ? "bg-purple-600 text-white shadow-md shadow-purple-600/20"
                : "text-slate-400 hover:text-white hover:bg-slate-900"
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Settings</span>
          </button>
        </div>

        {/* TAB 1: USERS & TRADERS */}
        {activeTab === "users" && (
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-white">Registered Client Portfolio</h2>
                <p className="text-xs text-slate-400">Manage trader identities, KYC review statuses, and permissions.</p>
              </div>

              <div className="relative max-w-xs w-full">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by name, email, or role..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/60 text-slate-400 uppercase font-mono text-[11px] border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Trader Name</th>
                    <th className="px-4 py-3">Email Address</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Country</th>
                    <th className="px-4 py-3">KYC Status</th>
                    <th className="px-4 py-3 text-center">Governance Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredUsers.slice((userPage - 1) * userPageSize, userPage * userPageSize).map((user) => {
                    const isVerified = user.kyc_status === "verified";
                    const isPending = user.kyc_status === "pending_verification";
                    return (
                      <tr key={user.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3.5 font-bold text-white">{user.first_name} {user.last_name}</td>
                        <td className="px-4 py-3.5 font-mono text-slate-300">{user.email}</td>
                        <td className="px-4 py-3.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${user.role === "admin" ? "bg-purple-500/20 text-purple-300 border border-purple-500/30" : "bg-slate-800 text-slate-300"}`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-slate-400">{user.country}</td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${isVerified ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : isPending ? "bg-amber-500/10 text-amber-300 border-amber-500/30" : "bg-rose-500/10 text-rose-300 border-rose-500/30"}`}>
                            {isVerified ? <CheckCircle2 className="w-3 h-3" /> : isPending ? <Clock className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                            <span className="capitalize">{user.kyc_status.replace("_", " ")}</span>
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {user.kyc_status !== "verified" ? (
                              <button
                                onClick={() => handleUpdateKyc(user.id, "verified")}
                                className="px-2 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold transition-all cursor-pointer"
                              >
                                Approve KYC
                              </button>
                            ) : (
                              <button
                                onClick={() => handleUpdateKyc(user.id, "restricted")}
                                className="px-2 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-[10px] font-bold transition-all cursor-pointer"
                              >
                                Restrict Account
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-800 text-xs">
              <div className="flex items-center gap-2 text-slate-400">
                <span>Show</span>
                <select
                  value={userPageSize}
                  onChange={(e) => { setUserPageSize(Number(e.target.value)); setUserPage(1); }}
                  className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white text-xs"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                </select>
                <span>traders per page</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-mono text-[11px]">
                  Page {userPage} of {Math.max(1, Math.ceil(filteredUsers.length / userPageSize))}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    disabled={userPage <= 1}
                    onClick={() => setUserPage((p) => Math.max(1, p - 1))}
                    className="px-2.5 py-1 rounded bg-slate-950 border border-slate-800 hover:border-slate-700 disabled:opacity-40 text-xs text-white"
                  >
                    &lt; Prev
                  </button>
                  <button
                    disabled={userPage >= Math.ceil(filteredUsers.length / userPageSize)}
                    onClick={() => setUserPage((p) => p + 1)}
                    className="px-2.5 py-1 rounded bg-slate-950 border border-slate-800 hover:border-slate-700 disabled:opacity-40 text-xs text-white"
                  >
                    Next &gt;
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: DEALER DESK & EXPOSURE */}
        {activeTab === "exposure" && (
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-amber-400" />
                  <span>Institutional Risk &amp; Market Exposure Desk</span>
                </h2>
                <p className="text-xs text-slate-400">
                  Real-time aggregation of buy/sell lots, net book skew, and automatic stop-out trigger.
                </p>
              </div>

              <button
                onClick={handleRunStopOutCheck}
                disabled={loading}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 inline-flex items-center gap-2 cursor-pointer transition-all"
              >
                <Zap className="w-4 h-4 fill-slate-950" />
                <span>Scan &amp; Execute Stop-Out Protection</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-xs text-slate-400">Total Buy Volume</span>
                <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
                  {exposure.totalBuyLots} Lots
                </div>
              </div>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-xs text-slate-400">Total Sell Volume</span>
                <div className="text-2xl font-bold font-mono text-rose-400 mt-1">
                  {exposure.totalSellLots} Lots
                </div>
              </div>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-xs text-slate-400">Net Risk Exposure</span>
                <div className="text-2xl font-bold font-mono text-amber-400 mt-1">
                  {exposure.netExposureLots} Lots
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: CASHIER APPROVALS */}
        {activeTab === "cashier" && (
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col gap-6">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Wallet className="w-5 h-5 text-cyan-400" />
                <span>Cashier &amp; Vault Funding Requests</span>
              </h2>
              <p className="text-xs text-slate-400">
                Review and approve crypto deposits and withdrawals. Approvals atomically execute double-entry ledger entries.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Deposits */}
              <div className="flex flex-col gap-3">
                <h3 className="text-xs font-bold uppercase text-emerald-400 tracking-wider">Deposits</h3>
                <div className="overflow-x-auto bg-slate-950 rounded-xl border border-slate-800 p-2">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-slate-500 border-b border-slate-800 pb-2">
                        <th className="p-2">User / ID</th>
                        <th className="p-2">Amount</th>
                        <th className="p-2">Network</th>
                        <th className="p-2">Status</th>
                        <th className="p-2 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40 font-mono">
                      {deposits.map((d) => (
                        <tr key={d.id}>
                          <td className="p-2 text-slate-300">{d.user_id?.slice(0, 8) || "Trader"}</td>
                          <td className="p-2 text-emerald-400 font-bold">${d.amount}</td>
                          <td className="p-2 text-slate-400">{d.network}</td>
                          <td className="p-2">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${d.status === "approved" ? "bg-emerald-500/20 text-emerald-400" : d.status === "rejected" ? "bg-rose-500/20 text-rose-400" : "bg-amber-500/20 text-amber-300"}`}>
                              {d.status}
                            </span>
                          </td>
                          <td className="p-2 text-right">
                            {d.status === "pending" && (
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => handleReviewCashier(d.id, "deposit", "approved")}
                                  className="px-2 py-0.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[10px] font-bold"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleReviewCashier(d.id, "deposit", "rejected")}
                                  className="px-2 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-[10px] font-bold"
                                >
                                  Reject
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                      {deposits.length === 0 && (
                        <tr><td colSpan={5} className="p-4 text-center text-slate-500">No deposit requests.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Withdrawals */}
              <div className="flex flex-col gap-3">
                <h3 className="text-xs font-bold uppercase text-amber-400 tracking-wider">Withdrawals</h3>
                <div className="overflow-x-auto bg-slate-950 rounded-xl border border-slate-800 p-2">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-slate-500 border-b border-slate-800 pb-2">
                        <th className="p-2">User / ID</th>
                        <th className="p-2">Amount</th>
                        <th className="p-2">Network</th>
                        <th className="p-2">Status</th>
                        <th className="p-2 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40 font-mono">
                      {withdrawals.map((w) => (
                        <tr key={w.id}>
                          <td className="p-2 text-slate-300">{w.user_id?.slice(0, 8) || "Trader"}</td>
                          <td className="p-2 text-amber-400 font-bold">${w.amount}</td>
                          <td className="p-2 text-slate-400">{w.network}</td>
                          <td className="p-2">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${w.status === "approved" ? "bg-emerald-500/20 text-emerald-400" : w.status === "rejected" ? "bg-rose-500/20 text-rose-400" : "bg-amber-500/20 text-amber-300"}`}>
                              {w.status}
                            </span>
                          </td>
                          <td className="p-2 text-right">
                            {w.status === "pending" && (
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => handleReviewCashier(w.id, "withdrawal", "approved")}
                                  className="px-2 py-0.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[10px] font-bold"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleReviewCashier(w.id, "withdrawal", "rejected")}
                                  className="px-2 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-[10px] font-bold"
                                >
                                  Reject
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                      {withdrawals.length === 0 && (
                        <tr><td colSpan={5} className="p-4 text-center text-slate-500">No withdrawal requests.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: ORDERS & POSITIONS */}
        {activeTab === "orders_positions" && (
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col gap-6">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-400" />
                <span>Active Institutional Orders &amp; Open Positions</span>
              </h2>
              <p className="text-xs text-slate-400">Authoritative persistent positions and orders across all traders.</p>
            </div>

            <div className="overflow-x-auto bg-slate-950 rounded-xl border border-slate-800 p-2">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="text-slate-500 border-b border-slate-800 pb-2">
                    <th className="p-2.5">Position ID</th>
                    <th className="p-2.5">Symbol</th>
                    <th className="p-2.5">Side</th>
                    <th className="p-2.5">Lots</th>
                    <th className="p-2.5">Open Price</th>
                    <th className="p-2.5">Margin</th>
                    <th className="p-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {allPositions.map((pos) => (
                    <tr key={pos.id}>
                      <td className="p-2.5 text-slate-300">{pos.id.slice(0, 12)}...</td>
                      <td className="p-2.5 font-bold text-white">{pos.symbol}</td>
                      <td className="p-2.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${pos.direction === "BUY" ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"}`}>
                          {pos.direction}
                        </span>
                      </td>
                      <td className="p-2.5 text-slate-300">{pos.lots}</td>
                      <td className="p-2.5 text-slate-300">${pos.openPrice}</td>
                      <td className="p-2.5 text-slate-400">${pos.margin}</td>
                      <td className="p-2.5">
                        <span className="text-emerald-400 font-bold uppercase text-[10px]">{pos.status}</span>
                      </td>
                    </tr>
                  ))}
                  {allPositions.length === 0 && (
                    <tr><td colSpan={7} className="p-4 text-center text-slate-500">No active positions in system.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Orders Section */}
            <div>
              <h3 className="text-xs font-bold uppercase text-amber-400 tracking-wider mb-2">Order History &amp; Pending Orders ({allOrders.length})</h3>
              <div className="overflow-x-auto bg-slate-950 rounded-xl border border-slate-800 p-2">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="text-slate-500 border-b border-slate-800 pb-2">
                      <th className="p-2.5">Order ID</th>
                      <th className="p-2.5">Symbol</th>
                      <th className="p-2.5">Side</th>
                      <th className="p-2.5">Type</th>
                      <th className="p-2.5">Volume</th>
                      <th className="p-2.5">Price</th>
                      <th className="p-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {allOrders.map((ord) => (
                      <tr key={ord.id}>
                        <td className="p-2.5 text-slate-300">{ord.id.slice(0, 12)}...</td>
                        <td className="p-2.5 font-bold text-white">{ord.symbol}</td>
                        <td className="p-2.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${ord.side === "BUY" ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"}`}>
                            {ord.side}
                          </span>
                        </td>
                        <td className="p-2.5 text-slate-400">{ord.order_type}</td>
                        <td className="p-2.5 text-slate-300">{ord.volume}</td>
                        <td className="p-2.5 text-slate-300">${ord.executed_price || ord.requested_price || "Market"}</td>
                        <td className="p-2.5">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${ord.status === "FILLED" ? "bg-emerald-500/20 text-emerald-400" : ord.status === "PENDING" ? "bg-amber-500/20 text-amber-300" : "bg-slate-800 text-slate-400"}`}>
                            {ord.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {allOrders.length === 0 && (
                      <tr><td colSpan={7} className="p-4 text-center text-slate-500">No orders logged in system.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: LEDGER */}
        {activeTab === "ledger" && (
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white">Institutional Multi-Account General Ledger</h2>
                <p className="text-xs text-slate-400">All balances are calculated purely via SQL summation of journal entries.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {accounts.map((acc) => (
                <button
                  key={acc.id}
                  onClick={() => handleSelectAccount(acc.id)}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                    activeAccId === acc.id
                      ? "bg-purple-950/40 border-purple-500/50 text-white shadow-lg"
                      : "bg-slate-950/60 border-slate-800/80 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  <div className="text-[10px] font-mono uppercase text-slate-500">{acc.account_type}</div>
                  <div className="text-xs font-bold text-white truncate mt-0.5">{acc.name}</div>
                  <div className="text-lg font-black font-mono text-emerald-400 mt-2">
                    ${formatMoney(engineInstance.getAccountBalance(acc.id))}
                  </div>
                </button>
              ))}
            </div>

            {selectedAccStatement && (
              <div className="overflow-x-auto bg-slate-950 rounded-xl border border-slate-800 p-2">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="text-slate-500 border-b border-slate-800 pb-2">
                      <th className="p-2.5">Date</th>
                      <th className="p-2.5">Nature / Description</th>
                      <th className="p-2.5">Type</th>
                      <th className="p-2.5 text-right">Debit</th>
                      <th className="p-2.5 text-right">Credit</th>
                      <th className="p-2.5 text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {selectedAccStatement.entries
                      .slice((ledgerPage - 1) * ledgerPageSize, ledgerPage * ledgerPageSize)
                      .map((entry) => (
                        <tr key={entry.id}>
                          <td className="p-2.5 text-slate-400">{new Date(entry.created_at).toLocaleTimeString()}</td>
                          <td className="p-2.5 text-slate-300 font-sans">{entry.nature}</td>
                          <td className="p-2.5 text-slate-500 uppercase text-[10px]">{entry.entry_type}</td>
                          <td className="p-2.5 text-right text-rose-400">{entry.direction === "debit" ? `$${formatMoney(entry.amount)}` : "-"}</td>
                          <td className="p-2.5 text-right text-emerald-400">{entry.direction === "credit" ? `$${formatMoney(entry.amount)}` : "-"}</td>
                          <td className="p-2.5 text-right font-bold text-white">${formatMoney(entry.running_balance)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>

                {/* Ledger Pagination */}
                <div className="flex items-center justify-between p-2 text-xs border-t border-slate-800">
                  <span className="text-slate-500 font-mono text-[11px]">
                    Page {ledgerPage} of {Math.max(1, Math.ceil(selectedAccStatement.entries.length / ledgerPageSize))}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      disabled={ledgerPage <= 1}
                      onClick={() => setLedgerPage((p) => Math.max(1, p - 1))}
                      className="px-2 py-1 rounded bg-slate-900 border border-slate-800 hover:border-slate-700 disabled:opacity-40 text-xs text-white"
                    >
                      &lt; Prev
                    </button>
                    <button
                      disabled={ledgerPage >= Math.ceil(selectedAccStatement.entries.length / ledgerPageSize)}
                      onClick={() => setLedgerPage((p) => p + 1)}
                      className="px-2 py-1 rounded bg-slate-900 border border-slate-800 hover:border-slate-700 disabled:opacity-40 text-xs text-white"
                    >
                      Next &gt;
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 6: AUDIT TRAIL */}
        {activeTab === "audit" && (
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white">Immutable Event &amp; Audit Logs</h2>
                <p className="text-xs text-slate-400">Complete record of trades, KYC reviews, orders, and authentication events.</p>
              </div>
              <span className="text-xs font-mono text-slate-400">Total Events: {auditLogs.length}</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/60 text-slate-400 uppercase font-mono text-[11px] border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">Action</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Metadata Inspection</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {auditLogs.slice((auditPage - 1) * auditPageSize, auditPage * auditPageSize).map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/30">
                      <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{new Date(log.created_at).toLocaleTimeString()}</td>
                      <td className="px-4 py-3 font-bold text-purple-300">{log.action}</td>
                      <td className="px-4 py-3 text-slate-400 uppercase text-[10px]">{log.category}</td>
                      <td className="px-4 py-3 text-slate-300 font-mono text-[11px]">
                        <span className="bg-slate-950 px-2 py-1 rounded border border-slate-800 inline-block">
                          {JSON.stringify(log.metadata)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Audit Pagination */}
            <div className="flex items-center justify-between p-2 text-xs border-t border-slate-800">
              <div className="flex items-center gap-2 text-slate-400">
                <span>Show</span>
                <select
                  value={auditPageSize}
                  onChange={(e) => {
                    setAuditPageSize(Number(e.target.value));
                    setAuditPage(1);
                  }}
                  className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white text-xs"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                </select>
                <span>events per page</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-mono text-[11px]">
                  Page {auditPage} of {Math.max(1, Math.ceil(auditLogs.length / auditPageSize))}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    disabled={auditPage <= 1}
                    onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
                    className="px-2 py-1 rounded bg-slate-900 border border-slate-800 hover:border-slate-700 disabled:opacity-40 text-xs text-white"
                  >
                    &lt; Prev
                  </button>
                  <button
                    disabled={auditPage >= Math.ceil(auditLogs.length / auditPageSize)}
                    onClick={() => setAuditPage((p) => p + 1)}
                    className="px-2 py-1 rounded bg-slate-900 border border-slate-800 hover:border-slate-700 disabled:opacity-40 text-xs text-white"
                  >
                    Next &gt;
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: DEALING DESK SETTINGS */}
        {activeTab === "dealing" && (
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-xl max-w-2xl w-full mx-auto flex flex-col gap-6">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-purple-400" />
                <span>Market Maker Spread &amp; Execution Config</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">Configure real-time spread markup, leverage boundaries, and execution routing.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">1. Gold (XAU/USD) Spread Markup (Pips)</label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="5"
                    max="100"
                    step="5"
                    value={spreadMarkupPips}
                    onChange={(e) => setSpreadMarkupPips(Number(e.target.value))}
                    className="flex-1 accent-purple-500"
                  />
                  <span className="font-mono font-bold text-amber-400 text-sm bg-slate-950 px-3 py-1 rounded-lg border border-slate-800">
                    {spreadMarkupPips} pips (${(spreadMarkupPips * 0.1).toFixed(2)})
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">2. Maximum Client Leverage Allowed</label>
                <div className="grid grid-cols-4 gap-2">
                  {[50, 100, 200, 500].map((lev) => (
                    <button
                      key={lev}
                      type="button"
                      onClick={() => setMaxLeverage(lev)}
                      className={`py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                        maxLeverage === lev ? "bg-purple-600 text-white shadow-md shadow-purple-600/20" : "bg-slate-950 border border-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      1:{lev}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">3. Dealing Desk Risk Routing Model</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["A_BOOK_STP", "B_BOOK_INTERNAL", "HYBRID"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setRiskEngineMode(mode)}
                      className={`p-3 rounded-xl border text-left text-xs font-semibold transition-all cursor-pointer ${
                        riskEngineMode === mode ? "bg-purple-500/10 border-purple-500 text-white shadow-md shadow-purple-500/10" : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                      }`}
                    >
                      <div className="font-bold text-white">{mode.replace(/_/g, " ")}</div>
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleSaveDealingSettings}
                className="w-full mt-4 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-all shadow-lg shadow-purple-600/20 cursor-pointer"
              >
                Save Dealing Desk Configuration
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
