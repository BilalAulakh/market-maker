export type SupportedNetwork = "TRC20" | "BEP20" | "POLYGON";

export interface CryptoDepositAddress {
  network: SupportedNetwork;
  token: "USDT";
  address: string;
  qrPayload: string;
  memo?: string;
  minimumDeposit: string;
}

export type WithdrawalStatus = "pending" | "processing" | "completed" | "rejected";

export interface WithdrawalRequest {
  id: string;
  user_id: string;
  network: SupportedNetwork;
  token: "USDT";
  destination_address: string;
  amount: string; // Decimal string
  fee: string; // Network fee in USDT
  net_amount: string;
  status: WithdrawalStatus;
  tx_hash?: string;
  created_at: string;
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
  status: "confirmed";
}
