export type SupportedNetwork = "TRC20" | "BEP20" | "POLYGON";

export interface CryptoDepositAddress {
  network: SupportedNetwork;
  token: "USDT";
  address: string;
  qrPayload: string;
  memo?: string;
  minimumDeposit: string;
}

export type DepositStatus = "pending" | "approved" | "rejected";
export type WithdrawalStatus = "pending" | "approved" | "rejected" | "processing" | "completed";

export interface DepositRecord {
  id: string;
  user_id: string;
  account_id?: string;
  network: SupportedNetwork;
  token: string;
  amount: string;
  currency: string;
  deposit_address: string;
  tx_hash?: string | null;
  status: DepositStatus;
  admin_notes?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface WithdrawalRequest {
  id: string;
  user_id: string;
  account_id?: string;
  network: SupportedNetwork;
  token: "USDT";
  destination_address: string;
  amount: string; // Decimal string
  fee: string; // Network fee in USDT
  net_amount: string;
  status: WithdrawalStatus;
  tx_hash?: string | null;
  admin_notes?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface DepositEvent {
  id: string;
  user_id: string;
  network: SupportedNetwork;
  token: "USDT";
  amount: string;
  tx_hash: string;
  from_address: string;
  to_address: string;
  created_at: string;
  status: "confirmed" | "pending" | "approved" | "rejected";
}

export interface CashierReviewAction {
  id: string;
  type: "deposit" | "withdrawal";
  status: "approved" | "rejected";
  adminNotes?: string;
  txHash?: string;
}
