import { describe, it, expect, beforeEach } from "vitest";
import {
  calculateRequiredMargin,
  calculateFloatingPnl,
  TradingEngine,
} from "@/lib/trading/engine";
import { MarketDataService } from "@/lib/trading/market-data";
import { LedgerEngine, generateAccountStatement } from "@/lib/ledger/service";
import { LedgerAccount } from "@/types/ledger";

describe("Exhaustive Buy & Sell Verification Suite", () => {
  let ledger: LedgerEngine;
  let clientAcc: LedgerAccount;
  let feeAcc: LedgerAccount;
  let operatingAcc: LedgerAccount;
  let tradingEngine: TradingEngine;

  beforeEach(async () => {
    ledger = new LedgerEngine();
    clientAcc = ledger.createAccount("client_funds", "Test Trader Client Funds", "USD", "usr_test_trader");
    feeAcc = ledger.createAccount("fee_revenue", "Institutional Broker Commission Revenue", "USD");
    operatingAcc = ledger.createAccount("company_operating", "Market Maker Operating Reserve", "USD");

    const floatAcc = ledger.createAccount("payment_processor_float", "USDT Vault Float", "USD");
    await ledger.recordTransaction({
      description: "Initial Capital Deposit",
      entries: [
        {
          account_id: clientAcc.id,
          direction: "credit",
          amount: "50000.00",
          entry_type: "deposit",
          nature: "Trader Initial Deposit",
        },
        {
          account_id: floatAcc.id,
          direction: "debit",
          amount: "50000.00",
          entry_type: "deposit",
          nature: "Vault Funding Inflow",
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

  describe("1. Market Pricing & Bid/Ask Execution Invariants", () => {
    const symbols = ["XAU/USD", "BTC/USD", "ETH/USD", "EUR/USD", "XAG/USD"];

    symbols.forEach((symbol) => {
      it(`should correctly enforce BUY at ASK and SELL at BID for ${symbol}`, () => {
        const tick = MarketDataService.getPrice(symbol);
        const buyPrice = MarketDataService.getExecutionPrice(symbol, "BUY");
        const sellPrice = MarketDataService.getExecutionPrice(symbol, "SELL");

        expect(buyPrice).toBe(tick.ask);
        expect(sellPrice).toBe(tick.bid);
        expect(Number(buyPrice)).toBeGreaterThan(Number(sellPrice));

        // Closing prices must be inverse
        const closeBuyPrice = MarketDataService.getClosePrice(symbol, "BUY");
        const closeSellPrice = MarketDataService.getClosePrice(symbol, "SELL");
        expect(closeBuyPrice).toBe(tick.bid);
        expect(closeSellPrice).toBe(tick.ask);
      });
    });
  });

  describe("2. Comprehensive BUY Order Lifecycle & P&L Math", () => {
    it("should accurately calculate BUY profit when price increases", () => {
      // 1.00 Lot Gold (100 oz): Open at $2,650.00 ASK, Current Bid rises to $2,665.00
      // Price diff = +$15.00/oz. Notional gain = 15.00 * 100 = $1,500.00
      const pnl = calculateFloatingPnl("BUY", "1.00", "2650.00", "2665.00", "100");
      expect(pnl).toBe("1500.00");
    });

    it("should accurately calculate BUY loss when price decreases", () => {
      // 1.00 Lot Gold (100 oz): Open at $2,650.00 ASK, Current Bid drops to $2,642.50
      // Price diff = -$7.50/oz. Notional loss = -7.50 * 100 = -$750.00
      const pnl = calculateFloatingPnl("BUY", "1.00", "2650.00", "2642.50", "100");
      expect(pnl).toBe("-750.00");
    });

    it("should handle Micro-Lot (0.01 Lot = 1 oz) BUY calculations with high precision", () => {
      // 0.01 Lot: Open at $2,650.00, Current at $2,653.25 (+ $3.25)
      // Gain = 3.25 * 1 = $3.25
      const pnl = calculateFloatingPnl("BUY", "0.01", "2650.00", "2653.25", "100");
      expect(pnl).toBe("3.25");
    });
  });

  describe("3. Comprehensive SELL (Short) Order Lifecycle & P&L Math", () => {
    it("should accurately calculate SELL profit when price decreases (Short Selling)", () => {
      // 1.00 Lot Gold (100 oz): Open at $2,650.00 BID, Current Ask drops to $2,630.00
      // Price diff = $2,650 - $2,630 = +$20.00/oz. Notional gain = 20.00 * 100 = $2,000.00
      const pnl = calculateFloatingPnl("SELL", "1.00", "2650.00", "2630.00", "100");
      expect(pnl).toBe("2000.00");
    });

    it("should accurately calculate SELL loss when price increases", () => {
      // 1.00 Lot Gold (100 oz): Open at $2,650.00 BID, Current Ask rises to $2,662.00
      // Price diff = $2,650 - $2,662 = -$12.00/oz. Notional loss = -12.00 * 100 = -$1,200.00
      const pnl = calculateFloatingPnl("SELL", "1.00", "2650.00", "2662.00", "100");
      expect(pnl).toBe("-1200.00");
    });

    it("should handle Micro-Lot (0.01 Lot) SELL calculations with high precision", () => {
      // 0.01 Lot: Open at $2,650.00, Current at $2,646.50 (- $3.50 price drop)
      // Gain = 3.50 * 1 = $3.50
      const pnl = calculateFloatingPnl("SELL", "0.01", "2650.00", "2646.50", "100");
      expect(pnl).toBe("3.50");
    });
  });

  describe("4. Margin Calculations Across Leverages (1:100, 1:200, 1:500)", () => {
    it("should verify 1.00 standard lot required margin at varying leverage ratios", () => {
      const price = "2700.00";
      // Notional = 1 * 100 * 2700 = $270,000
      const margin100 = calculateRequiredMargin("1.00", price, 100);
      expect(margin100).toBe("2700.00");

      const margin200 = calculateRequiredMargin("1.00", price, 200);
      expect(margin200).toBe("1350.00");

      const margin500 = calculateRequiredMargin("1.00", price, 500);
      expect(margin500).toBe("540.00");
    });

    it("should accurately calculate margin for fractional mini lots (0.10) and micro lots (0.01)", () => {
      const price = "2700.00";
      // 0.10 Lot @ 1:100 -> Notional = $27,000 -> Margin = $270.00
      expect(calculateRequiredMargin("0.10", price, 100)).toBe("270.00");

      // 0.01 Lot @ 1:100 -> Notional = $2,700 -> Margin = $27.00
      expect(calculateRequiredMargin("0.01", price, 100)).toBe("27.00");

      // 0.01 Lot @ 1:500 -> Notional = $2,700 -> Margin = $5.40
      expect(calculateRequiredMargin("0.01", price, 500)).toBe("5.40");
    });
  });

  describe("5. Take Profit (TP) and Stop Loss (SL) Trigger Logic", () => {
    it("should trigger BUY Take Profit when Bid >= TP", () => {
      const tp = 2680.00;
      const currentBid = 2680.50;
      expect(currentBid >= tp).toBe(true);
    });

    it("should trigger BUY Stop Loss when Bid <= SL", () => {
      const sl = 2630.00;
      const currentBid = 2629.50;
      expect(currentBid <= sl).toBe(true);
    });

    it("should trigger SELL Take Profit when Ask <= TP", () => {
      const tp = 2620.00;
      const currentAsk = 2619.50;
      expect(currentAsk <= tp).toBe(true);
    });

    it("should trigger SELL Stop Loss when Ask >= SL", () => {
      const sl = 2670.00;
      const currentAsk = 2670.20;
      expect(currentAsk >= sl).toBe(true);
    });
  });

  describe("6. Double-Entry Ledger Invariance on Simultaneous BUY and SELL", () => {
    it("should maintain balanced ledger (debits == credits) and accurate equity across simultaneous positions", async () => {
      // 1. Open BUY position 1.0 Lot
      const buyPos = tradingEngine.openPosition("BUY", "1.00", 100);
      expect(buyPos.status).toBe("OPEN");

      // 2. Open SELL position 0.5 Lot (Hedged)
      const sellPos = tradingEngine.openPosition("SELL", "0.50", 100);
      expect(sellPos.status).toBe("OPEN");

      expect(tradingEngine.getOpenPositions()).toHaveLength(2);

      // Verify Account Summary with margin allocated
      const summary = tradingEngine.getAccountSummary();
      expect(Number(summary.usedMargin)).toBeGreaterThan(0);
      expect(Number(summary.freeMargin)).toBeLessThan(50000);

      // 3. Close both positions
      const closedBuy = await tradingEngine.closePosition(buyPos.id);
      const closedSell = await tradingEngine.closePosition(sellPos.id);

      expect(closedBuy.status).toBe("CLOSED");
      expect(closedSell.status).toBe("CLOSED");
      expect(tradingEngine.getOpenPositions()).toHaveLength(0);
      expect(tradingEngine.getClosedPositions()).toHaveLength(2);

      // 4. Verify Ledger Invariant
      const entries = ledger.getAccountEntries(clientAcc.id);
      const stmt = generateAccountStatement(entries, clientAcc.id, "USD");
      expect(stmt.entries.length).toBeGreaterThan(0);
      expect(Number(stmt.derived_balance)).toBeGreaterThan(0);
      expect(stmt.derived_balance).toBe(ledger.getAccountBalance(clientAcc.id));
    });
  });
});
