import { describe, it, expect } from "vitest";
import { calculateRequiredMargin } from "@/lib/trading/engine";
import { MarketDataService } from "@/lib/trading/market-data";
import { moneyMultiply, moneySubtract, moneyIsGreaterThanOrEqual } from "@/lib/money";

describe("Server-Side Order Execution Engine", () => {
  it("should execute BUY orders at ASK price and SELL orders at BID price", () => {
    const goldPrices = MarketDataService.getPrice("XAU/USD");

    const buyExecutionPrice = MarketDataService.getExecutionPrice("XAU/USD", "BUY");
    const sellExecutionPrice = MarketDataService.getExecutionPrice("XAU/USD", "SELL");

    expect(buyExecutionPrice).toBe(goldPrices.ask);
    expect(sellExecutionPrice).toBe(goldPrices.bid);
    expect(Number(buyExecutionPrice)).toBeGreaterThan(Number(sellExecutionPrice));
  });

  it("should calculate required margin accurately based on leverage and notional size", () => {
    // 1 standard lot = 100 oz of Gold @ $2500/oz with 1:100 leverage
    // Notional = 1 * 100 * 2500 = $250,000
    // Margin = 250,000 / 100 = $2,500
    const margin = calculateRequiredMargin("1.00", "2500.00", 100);
    expect(margin).toBe("2500.00");

    // 0.10 lot (10 oz) @ $2500 with 1:200 leverage
    // Notional = 0.10 * 100 * 2500 = $25,000
    // Margin = 25,000 / 200 = $125.00
    const margin2 = calculateRequiredMargin("0.10", "2500.00", 200);
    expect(margin2).toBe("125.00");
  });

  it("should accurately calculate commission at $15 per standard lot", () => {
    const commission1Lot = moneyMultiply("15.00", "1.00", 2);
    expect(commission1Lot).toBe("15.00");

    const commission01Lot = moneyMultiply("15.00", "0.10", 2);
    expect(commission01Lot).toBe("1.50");

    const commissionMicroLot = moneyMultiply("15.00", "0.01", 2);
    expect(commissionMicroLot).toBe("0.15");
  });

  it("should reject trades when required margin exceeds free margin", () => {
    const freeMargin = "500.00";
    const requiredMargin = calculateRequiredMargin("1.00", "2600.00", 100); // $2,600 required

    const canAfford = moneyIsGreaterThanOrEqual(freeMargin, requiredMargin);
    expect(canAfford).toBe(false);
  });
});
