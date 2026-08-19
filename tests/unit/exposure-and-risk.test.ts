import { describe, it, expect } from "vitest";
import { moneyAdd, moneySubtract, moneyMultiply, moneyDivide } from "@/lib/money";

describe("Dealer Desk Exposure & Risk Management Engine", () => {
  it("should calculate net and gross exposure across buy and sell lots", () => {
    const totalBuyLots = "125.00";
    const totalSellLots = "80.00";

    const netExposure = moneySubtract(totalBuyLots, totalSellLots);
    const grossExposure = moneyAdd(totalBuyLots, totalSellLots);

    expect(netExposure).toBe("45");
    expect(grossExposure).toBe("205");
  });

  it("should calculate Market Maker book P&L as the inverse of client aggregate P&L", () => {
    const clientUnrealizedPnl = "15000.00"; // Clients in profit
    const housePnl = moneyMultiply(clientUnrealizedPnl, "-1.00", 2);

    expect(housePnl).toBe("-15000.00"); // Market maker has unrealized liability
  });

  it("should correctly evaluate Margin Level and Stop-Out threshold", () => {
    const balance = "10000.00";
    const floatingLoss = "-6000.00";
    const equity = moneyAdd(balance, floatingLoss); // $4,000 equity
    const usedMargin = "5000.00";

    // Margin Level = (Equity / Used Margin) * 100 = (4000 / 5000) * 100 = 80%
    const marginLevelRatio = moneyDivide(equity, usedMargin, 4);
    const marginLevelPercent = moneyMultiply(marginLevelRatio, "100", 2);

    expect(marginLevelPercent).toBe("80.00");

    // Margin Call trigger (< 100%)
    const isMarginCall = Number(marginLevelPercent) <= 100;
    expect(isMarginCall).toBe(true);

    // Stop-Out trigger (<= 50%)
    const isStopOut = Number(marginLevelPercent) <= 50;
    expect(isStopOut).toBe(false);

    // If loss expands to -$7,600 (Equity = $2,400)
    const severeLossEquity = "2400.00";
    const severeLevel = moneyMultiply(moneyDivide(severeLossEquity, usedMargin, 4), "100", 2);
    expect(severeLevel).toBe("48.00");
    expect(Number(severeLevel) <= 50).toBe(true);
  });
});
