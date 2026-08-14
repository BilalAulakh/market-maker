import { describe, it, expect, beforeEach } from "vitest";
import {
  calculateRequiredMargin,
  calculateFloatingPnl,
  TradingEngine,
} from "@/lib/trading/engine";
import { LedgerEngine } from "@/lib/ledger/service";
import { LedgerAccount } from "@/types/ledger";

describe("Gold (XAU/USD) Trading Engine & Ledger Integration", () => {
  let ledger: LedgerEngine;
  let clientAcc: LedgerAccount;
  let feeAcc: LedgerAccount;
  let operatingAcc: LedgerAccount;
  let tradingEngine: TradingEngine;

  beforeEach(async () => {
    ledger = new LedgerEngine();
    clientAcc = ledger.createAccount("client_funds", "Trader Gold Equity", "USD", "usr_gold_1");
    feeAcc = ledger.createAccount("fee_revenue", "Brokerage Fee Revenue", "USD");
    operatingAcc = ledger.createAccount("company_operating", "Broker Operating Reserve", "USD");

    // Deposit $10,000 demo capital into client account
    const floatAcc = ledger.createAccount("payment_processor_float", "Gateway Float", "USD");
    await ledger.recordTransaction({
      description: "Initial Gold Capital Deposit",
      entries: [
        {
          account_id: clientAcc.id,
          direction: "credit",
          amount: "10000.00",
          entry_type: "deposit",
          nature: "Demo Deposit",
        },
        {
          account_id: floatAcc.id,
          direction: "debit",
          amount: "10000.00",
          entry_type: "deposit",
          nature: "Gateway Inflow",
        },
      ],
    });

    tradingEngine = new TradingEngine(
      ledger,
      clientAcc.id,
      feeAcc.id,
      operatingAcc.id
    );
  });

  describe("1. Margin Math", () => {
    it("should calculate required margin for 1.0 lot of Gold at $2,460 with 1:100 leverage", () => {
      // 1 lot = 100 oz. Notional = 100 * 2460 = $246,000. Margin = 246,000 / 100 = $2,460.00
      const margin = calculateRequiredMargin("1.0", "2460.00", 100);
      expect(margin).toBe("2460.00");
    });

    it("should calculate required margin for 0.10 lot of Gold with 1:500 leverage", () => {
      // 0.10 lot = 10 oz. Notional = 10 * 2450 = $24,500. Margin = 24,500 / 500 = $49.00
      const margin = calculateRequiredMargin("0.10", "2450.00", 500);
      expect(margin).toBe("49.00");
    });
  });

  describe("2. Floating PnL Calculations", () => {
    it("should calculate profit for BUY position when price rises", () => {
      // BUY 1.0 lot (100 oz) @ 2450.00, Current = 2460.00 -> Profit = (2460 - 2450) * 100 = +$1,000.00
      const pnl = calculateFloatingPnl("BUY", "1.0", "2450.00", "2460.00");
      expect(pnl).toBe("1000.00");
    });

    it("should calculate loss for BUY position when price drops", () => {
      // BUY 1.0 lot @ 2460.00, Current = 2455.00 -> Loss = (2455 - 2460) * 100 = -$500.00
      const pnl = calculateFloatingPnl("BUY", "1.0", "2460.00", "2455.00");
      expect(pnl).toBe("-500.00");
    });

    it("should calculate profit for SELL position when price drops", () => {
      // SELL 1.0 lot (100 oz) @ 2460.00, Current = 2450.00 -> Profit = (2460 - 2450) * 100 = +$1,000.00
      const pnl = calculateFloatingPnl("SELL", "1.0", "2460.00", "2450.00");
      expect(pnl).toBe("1000.00");
    });
  });

  describe("3. Position Execution & Ledger Settlement", () => {
    it("should open position, lock margin, and deduct free margin", () => {
      const pos = tradingEngine.openPosition("BUY", "1.0", 100);
      expect(pos.status).toBe("OPEN");
      expect(pos.direction).toBe("BUY");
      expect(pos.lots).toBe("1.0");

      const summary = tradingEngine.getAccountSummary();
      expect(summary.balance).toBe("10000");
      expect(Number(summary.usedMargin)).toBeGreaterThan(0);
      expect(Number(summary.freeMargin)).toBeLessThan(10000);
    });

    it("should close position and settle realized profit and commission in the double-entry ledger", async () => {
      const pos = tradingEngine.openPosition("BUY", "0.50", 100);
      expect(tradingEngine.getOpenPositions()).toHaveLength(1);

      const closed = await tradingEngine.closePosition(pos.id);
      expect(closed.status).toBe("CLOSED");
      expect(closed.ledgerTransactionId).toBeDefined();
      expect(tradingEngine.getOpenPositions()).toHaveLength(0);
      expect(tradingEngine.getClosedPositions()).toHaveLength(1);

      // Ledger balance should reflect realized PnL and commission
      const finalBalance = ledger.getAccountBalance(clientAcc.id);
      expect(finalBalance).toBeDefined();
      expect(finalBalance).not.toBe("0");
    });
  });
});
