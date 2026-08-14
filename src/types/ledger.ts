export type LedgerAccountType =
  | "client_funds"
  | "company_operating"
  | "fee_revenue"
  | "payment_processor_float";

export type EntryDirection = "debit" | "credit";

export type EntryType =
  | "deposit"
  | "withdrawal"
  | "trade_margin_lock"
  | "trade_margin_release"
  | "trade_pnl"
  | "fee"
  | "commission"
  | "adjustment";

export interface LedgerAccount {
  id: string;
  user_id?: string | null;
  account_type: LedgerAccountType;
  currency: string;
  name: string;
  created_at: string;
}

export interface LedgerTransaction {
  id: string;
  description: string;
  reference_type?: string | null;
  reference_id?: string | null;
  created_at: string;
}

export interface LedgerEntry {
  id: string;
  transaction_id: string;
  account_id: string;
  direction: EntryDirection;
  amount: string; // Decimal string end-to-end
  entry_type: EntryType;
  nature: string;
  created_at: string;
}

export interface NewLedgerEntryDraft {
  account_id: string;
  direction: EntryDirection;
  amount: string; // Decimal string
  entry_type: EntryType;
  nature: string;
}

export interface RecordTransactionParams {
  description: string;
  reference_type?: string;
  reference_id?: string;
  entries: NewLedgerEntryDraft[];
}

export interface AccountStatementEntry extends LedgerEntry {
  running_balance: string;
}

export interface AccountStatement {
  account_id: string;
  currency: string;
  derived_balance: string;
  total_debits: string;
  total_credits: string;
  entries: AccountStatementEntry[];
}
