import { describe, it, expect, beforeEach } from "vitest";
import {
  LedgerEngine,
  validateTransactionBalancing,
  validateFundSegregation,
  deriveAccountBalance,
  generateAccountStatement,
} from "@/lib/ledger/service";
import { LedgerAccount, LedgerEntry, NewLedgerEntryDraft } from "@/types/ledger";
import { moneyAdd, moneySubtract } from "@/lib/money";

describe("Stage 3: The Double-Entry Ledger Engine", () => {
  let engine: LedgerEngine;
  let clientAcc: LedgerAccount;
  let processorFloatAcc: LedgerAccount;
  let companyOperatingAcc: LedgerAccount;
  let feeRevenueAcc: LedgerAccount;

  beforeEach(() => {
    engine = new LedgerEngine();
    clientAcc = engine.createAccount("client_funds", "Alexander Wright Trading Equity", "USD", "usr_001");
    processorFloatAcc = engine.createAccount("payment_processor_float", "Stripe Clearing Gateway", "USD");
    companyOperatingAcc = engine.createAccount("company_operating", "AuraFX Reserve Liquidity", "USD");
    feeRevenueAcc = engine.createAccount("fee_revenue", "Brokerage Commission Revenue", "USD");
  });

  describe("1. Transaction Balancing (Non-Negotiable Rule 3)", () => {
    it("should reject an unbalanced transaction where debits != credits", async () => {
      const unbalancedEntries: NewLedgerEntryDraft[] = [
        {
          account_id: clientAcc.id,
          direction: "credit",
          amount: "1000.00",
          entry_type: "deposit",
          nature: "Client Deposit Credit",
        },
        {
          account_id: processorFloatAcc.id,
          direction: "debit",
          amount: "950.00", // Missing 50.00
          entry_type: "deposit",
          nature: "Gateway Float Inflow",
        },
      ];

      // Service layer check
      const check = validateTransactionBalancing(unbalancedEntries);
      expect(check.isBalanced).toBe(false);
      expect(check.totalCredits).toBe("1000");
      expect(check.totalDebits).toBe("950");

      // Engine execution rejection
      await expect(
        engine.recordTransaction({
          description: "Unbalanced Deposit Test",
          entries: unbalancedEntries,
        })
      ).rejects.toThrow("Unbalanced transaction: Debits (950) do not equal Credits (1000)");
    });

    it("should accept a perfectly balanced transaction (Debits = Credits)", async () => {
      const balancedEntries: NewLedgerEntryDraft[] = [
        {
          account_id: clientAcc.id,
          direction: "credit",
          amount: "5000.00",
          entry_type: "deposit",
          nature: "Initial Gold Trading Deposit",
        },
        {
          account_id: processorFloatAcc.id,
          direction: "debit",
          amount: "5000.00",
          entry_type: "deposit",
          nature: "Gateway Float Inflow",
        },
      ];

      const res = await engine.recordTransaction({
        description: "Initial Client Funding",
        entries: balancedEntries,
      });

      expect(res.transaction).toBeDefined();
      expect(res.entries).toHaveLength(2);
      expect(engine.getAccountBalance(clientAcc.id)).toBe("5000");
    });
  });

  describe("2. Summation Balance Derivation across Long Sequence (Non-Negotiable Rule 2)", () => {
    it("should accurately derive balance by summation across 100 transactions with zero drift", async () => {
      let expectedBalance = "0";

      for (let i = 1; i <= 100; i++) {
        const amount = `${i}.50`;
        const isDeposit = i % 2 !== 0;

        if (isDeposit) {
          expectedBalance = moneyAdd(expectedBalance, amount);
          await engine.recordTransaction({
            description: `Deposit #${i}`,
            entries: [
              {
                account_id: clientAcc.id,
                direction: "credit",
                amount,
                entry_type: "deposit",
                nature: `Funding #${i}`,
              },
              {
                account_id: processorFloatAcc.id,
                direction: "debit",
                amount,
                entry_type: "deposit",
                nature: `Gateway Float #${i}`,
              },
            ],
          });
        } else {
          expectedBalance = moneySubtract(expectedBalance, amount);
          await engine.recordTransaction({
            description: `Withdrawal / Fee #${i}`,
            entries: [
              {
                account_id: clientAcc.id,
                direction: "debit",
                amount,
                entry_type: "withdrawal",
                nature: `Payout #${i}`,
              },
              {
                account_id: processorFloatAcc.id,
                direction: "credit",
                amount,
                entry_type: "withdrawal",
                nature: `Gateway Payout #${i}`,
              },
            ],
          });
        }
      }

      const derivedBalance = engine.getAccountBalance(clientAcc.id);
      expect(derivedBalance).toBe(expectedBalance);

      const allEntries = engine.getAccountEntries(clientAcc.id);
      expect(deriveAccountBalance(allEntries)).toBe(expectedBalance);
    });
  });

  describe("3. Client Funds & Company Funds Segregation (Non-Negotiable Rule 4)", () => {
    it("should reject value transfer from client funds to company operating funds outside fee or commission", async () => {
      const illegalTransfer: NewLedgerEntryDraft[] = [
        {
          account_id: clientAcc.id,
          direction: "debit",
          amount: "250.00",
          entry_type: "adjustment", // Not 'fee' or 'commission'!
          nature: "Illegal Direct Transfer to Company",
        },
        {
          account_id: companyOperatingAcc.id,
          direction: "credit",
          amount: "250.00",
          entry_type: "adjustment",
          nature: "Operating Inflow",
        },
      ];

      const typeMap = new Map([
        [clientAcc.id, clientAcc.account_type],
        [companyOperatingAcc.id, companyOperatingAcc.account_type],
      ]);

      const check = validateFundSegregation(illegalTransfer, typeMap);
      expect(check.isValid).toBe(false);

      await expect(
        engine.recordTransaction({
          description: "Illegal Fund Sweep",
          entries: illegalTransfer,
        })
      ).rejects.toThrow("Segregation violation: Transfer between client funds and company operating funds is prohibited outside fee or commission entry types.");
    });

    it("should allow valid fee or commission transfers between client funds and company/revenue accounts", async () => {
      const validFeeTransfer: NewLedgerEntryDraft[] = [
        {
          account_id: clientAcc.id,
          direction: "debit",
          amount: "15.00",
          entry_type: "fee", // Explicitly typed as fee
          nature: "Gold (XAU/USD) Execution Commission",
        },
        {
          account_id: feeRevenueAcc.id,
          direction: "credit",
          amount: "15.00",
          entry_type: "fee",
          nature: "Brokerage Commission Revenue",
        },
      ];

      const res = await engine.recordTransaction({
        description: "Trade Commission Charge",
        entries: validFeeTransfer,
      });

      expect(res.transaction).toBeDefined();
      expect(engine.getAccountBalance(feeRevenueAcc.id)).toBe("15");
      expect(engine.getAccountBalance(clientAcc.id)).toBe("-15");
    });
  });

  describe("4. Concurrent Transactions Handling", () => {
    it("should handle 50 concurrent transactions against the same account without race conditions or lost updates", async () => {
      const promises: Promise<unknown>[] = [];
      const numTx = 50;
      const perTxAmount = "10.00";

      for (let i = 0; i < numTx; i++) {
        promises.push(
          engine.recordTransaction({
            description: `Concurrent Deposit #${i + 1}`,
            entries: [
              {
                account_id: clientAcc.id,
                direction: "credit",
                amount: perTxAmount,
                entry_type: "deposit",
                nature: `Batch #${i + 1}`,
              },
              {
                account_id: processorFloatAcc.id,
                direction: "debit",
                amount: perTxAmount,
                entry_type: "deposit",
                nature: `Gateway Inflow #${i + 1}`,
              },
            ],
          })
        );
      }

      await Promise.all(promises);

      const finalDerivedBalance = engine.getAccountBalance(clientAcc.id);
      // 50 * 10.00 = 500.00
      expect(finalDerivedBalance).toBe("500");
    });
  });

  describe("5. Account Statement & Running Balances", () => {
    it("should compute accurate chronological running balances on statements", () => {
      const entries: LedgerEntry[] = [
        {
          id: "e1",
          transaction_id: "tx1",
          account_id: clientAcc.id,
          direction: "credit",
          amount: "1000.00",
          entry_type: "deposit",
          nature: "Initial Deposit",
          created_at: "2026-01-01T10:00:00Z",
        },
        {
          id: "e2",
          transaction_id: "tx2",
          account_id: clientAcc.id,
          direction: "debit",
          amount: "200.00",
          entry_type: "trade_pnl",
          nature: "Gold Trade Loss",
          created_at: "2026-01-01T11:00:00Z",
        },
        {
          id: "e3",
          transaction_id: "tx3",
          account_id: clientAcc.id,
          direction: "credit",
          amount: "450.50",
          entry_type: "trade_pnl",
          nature: "Gold Trade Profit",
          created_at: "2026-01-01T12:00:00Z",
        },
      ];

      const statement = generateAccountStatement(entries, clientAcc.id, "USD");
      expect(statement.derived_balance).toBe("1250.5");
      expect(statement.total_credits).toBe("1450.5");
      expect(statement.total_debits).toBe("200");
      expect(statement.entries[0]?.running_balance).toBe("1000");
      expect(statement.entries[1]?.running_balance).toBe("800");
      expect(statement.entries[2]?.running_balance).toBe("1250.5");
    });
  });
});
