import {
  LedgerAccount,
  LedgerAccountType,
  LedgerEntry,
  LedgerTransaction,
  NewLedgerEntryDraft,
  RecordTransactionParams,
  AccountStatement,
  AccountStatementEntry,
} from "@/types/ledger";
import {
  moneyAdd,
  moneyIsEqual,
  moneyIsPositive,
  moneySubtract,
  moneySum,
  isValidDecimalString,
} from "@/lib/money";

/**
 * Validates that total debits equal total credits for a set of draft entries.
 * Non-Negotiable Rule 3: Every transaction balances.
 */
export function validateTransactionBalancing(entries: NewLedgerEntryDraft[]): {
  isBalanced: boolean;
  totalDebits: string;
  totalCredits: string;
} {
  if (!entries || entries.length === 0) {
    throw new Error("Cannot record empty transaction: at least two entries are required.");
  }

  const debits: string[] = [];
  const credits: string[] = [];

  for (const entry of entries) {
    if (!isValidDecimalString(entry.amount) || !moneyIsPositive(entry.amount)) {
      throw new Error(`Invalid entry amount "${entry.amount}". Must be a positive decimal string.`);
    }

    if (entry.direction === "debit") {
      debits.push(entry.amount);
    } else if (entry.direction === "credit") {
      credits.push(entry.amount);
    } else {
      throw new Error(`Invalid entry direction: "${entry.direction}". Must be "debit" or "credit".`);
    }
  }

  const totalDebits = moneySum(debits);
  const totalCredits = moneySum(credits);
  const isBalanced = moneyIsEqual(totalDebits, totalCredits);

  return { isBalanced, totalDebits, totalCredits };
}

/**
 * Validates fund segregation rules.
 * Non-Negotiable Rule 4: Client funds and company funds live in separate ledger accounts.
 * No code path may move value from client funds to company funds except through entries explicitly typed as fee or commission.
 */
export function validateFundSegregation(
  entries: NewLedgerEntryDraft[],
  accountTypeMap: Map<string, LedgerAccountType>
): { isValid: boolean; violationReason?: string } {
  let touchesClientFunds = false;
  let touchesCompanyOperating = false;

  for (const entry of entries) {
    const accType = accountTypeMap.get(entry.account_id);
    if (!accType) {
      return { isValid: false, violationReason: `Account ID ${entry.account_id} not found in account map.` };
    }

    if (accType === "client_funds") touchesClientFunds = true;
    if (accType === "company_operating") touchesCompanyOperating = true;
  }

  if (touchesClientFunds && touchesCompanyOperating) {
    // If both are present, every entry touching them must be typed as 'fee' or 'commission'
    const invalidEntries = entries.filter((e) => {
      const type = accountTypeMap.get(e.account_id);
      return (
        (type === "client_funds" || type === "company_operating") &&
        e.entry_type !== "fee" &&
        e.entry_type !== "commission"
      );
    });

    if (invalidEntries.length > 0) {
      return {
        isValid: false,
        violationReason:
          "Segregation violation: Transfer between client funds and company operating funds is prohibited outside fee or commission entry types.",
      };
    }
  }

  return { isValid: true };
}

/**
 * Derives the balance of an account by summing its entries.
 * Non-Negotiable Rule 2: Balances are derived by summing ledger entries. No stored mutable balance column anywhere.
 *
 * For client accounts & equity:
 * Net Balance = Sum(Credits) - Sum(Debits)
 */
export function deriveAccountBalance(entries: readonly LedgerEntry[]): string {
  if (!entries || entries.length === 0) return "0";

  const credits: string[] = [];
  const debits: string[] = [];

  for (const entry of entries) {
    if (entry.direction === "credit") {
      credits.push(entry.amount);
    } else {
      debits.push(entry.amount);
    }
  }

  const sumCredits = moneySum(credits);
  const sumDebits = moneySum(debits);

  return moneySubtract(sumCredits, sumDebits);
}

/**
 * Generates an audit statement with running balances for an account.
 */
export function generateAccountStatement(
  entries: LedgerEntry[],
  accountId: string,
  currency: string = "USD"
): AccountStatement {
  // Sort entries chronologically
  const sorted = [...entries].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  let running = "0";
  let totalDebits = "0";
  let totalCredits = "0";

  const statementEntries: AccountStatementEntry[] = sorted.map((entry) => {
    if (entry.direction === "credit") {
      running = moneyAdd(running, entry.amount);
      totalCredits = moneyAdd(totalCredits, entry.amount);
    } else {
      running = moneySubtract(running, entry.amount);
      totalDebits = moneyAdd(totalDebits, entry.amount);
    }

    return {
      ...entry,
      running_balance: running,
    };
  });

  return {
    account_id: accountId,
    currency,
    derived_balance: running,
    total_debits: totalDebits,
    total_credits: totalCredits,
    entries: statementEntries,
  };
}

/**
 * In-Memory Ledger Engine implementation for fast deterministic verification and testing.
 */
export class LedgerEngine {
  private accounts = new Map<string, LedgerAccount>();
  private transactions = new Map<string, LedgerTransaction>();
  private entries: LedgerEntry[] = [];
  private lock = Promise.resolve();

  public createAccount(
    accountType: LedgerAccountType,
    name: string,
    currency: string = "USD",
    userId?: string
  ): LedgerAccount {
    const id = `acc_${Math.random().toString(36).substring(2, 11)}_${Date.now()}`;
    const account: LedgerAccount = {
      id,
      user_id: userId ?? null,
      account_type: accountType,
      currency,
      name,
      created_at: new Date().toISOString(),
    };
    this.accounts.set(id, account);
    return account;
  }

  public getAccount(id: string): LedgerAccount | undefined {
    return this.accounts.get(id);
  }

  public getAccountEntries(accountId: string): LedgerEntry[] {
    return this.entries.filter((e) => e.account_id === accountId);
  }

  public getAccountBalance(accountId: string): string {
    const entries = this.getAccountEntries(accountId);
    return deriveAccountBalance(entries);
  }

  /**
   * Thread-safe / Mutex-guarded atomic transaction execution.
   */
  public async recordTransaction(params: RecordTransactionParams): Promise<{
    transaction: LedgerTransaction;
    entries: LedgerEntry[];
  }> {
    // Acquire lock for concurrency protection
    const currentLock = this.lock;
    let releaseLock: () => void;
    this.lock = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });

    await currentLock;

    try {
      // 1. Check transaction balancing (Rule #3)
      const balanceCheck = validateTransactionBalancing(params.entries);
      if (!balanceCheck.isBalanced) {
        throw new Error(
          `Unbalanced transaction: Debits (${balanceCheck.totalDebits}) do not equal Credits (${balanceCheck.totalCredits}).`
        );
      }

      // 2. Build account type map
      const accountTypeMap = new Map<string, LedgerAccountType>();
      for (const draft of params.entries) {
        const acc = this.accounts.get(draft.account_id);
        if (!acc) {
          throw new Error(`Ledger account not found: "${draft.account_id}"`);
        }
        accountTypeMap.set(draft.account_id, acc.account_type);
      }

      // 3. Check fund segregation (Rule #4)
      const segregationCheck = validateFundSegregation(params.entries, accountTypeMap);
      if (!segregationCheck.isValid) {
        throw new Error(segregationCheck.violationReason || "Fund segregation violation.");
      }

      // 4. Create and persist transaction and entries
      const txId = `tx_${Math.random().toString(36).substring(2, 11)}_${Date.now()}`;
      const now = new Date().toISOString();

      const transaction: LedgerTransaction = {
        id: txId,
        description: params.description,
        reference_type: params.reference_type ?? null,
        reference_id: params.reference_id ?? null,
        created_at: now,
      };

      const newEntries: LedgerEntry[] = params.entries.map((draft) => ({
        id: `ent_${Math.random().toString(36).substring(2, 11)}_${Date.now()}`,
        transaction_id: txId,
        account_id: draft.account_id,
        direction: draft.direction,
        amount: draft.amount,
        entry_type: draft.entry_type,
        nature: draft.nature,
        created_at: now,
      }));

      this.transactions.set(txId, transaction);
      this.entries.push(...newEntries);

      return { transaction, entries: newEntries };
    } finally {
      releaseLock!();
    }
  }
}
