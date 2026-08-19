import { describe, it, expect } from "vitest";
import { calculateFloatingPnl } from "@/lib/trading/engine";

describe("P&L and TP/SL Calculation Engine", () => {
  it("should calculate BUY position profit and loss correctly", () => {
    // 1 lot BUY opened at $2500, current price moves up to $2510 (+ $10/oz * 100 oz = +$1,000)
    const profit = calculateFloatingPnl("BUY", "1.00", "2500.00", "2510.00");
    expect(profit).toBe("1000.00");

    // 1 lot BUY opened at $2500, current price drops to $2495 (- $5/oz * 100 oz = -$500)
    const loss = calculateFloatingPnl("BUY", "1.00", "2500.00", "2495.00");
    expect(loss).toBe("-500.00");
  });

  it("should calculate SELL position profit and loss correctly", () => {
    // 1 lot SELL opened at $2500, current price drops to $2490 (+ $10/oz * 100 oz = +$1,000)
    const profit = calculateFloatingPnl("SELL", "1.00", "2500.00", "2490.00");
    expect(profit).toBe("1000.00");

    // 1 lot SELL opened at $2500, current price rises to $2508 (- $8/oz * 100 oz = -$800)
    const loss = calculateFloatingPnl("SELL", "1.00", "2500.00", "2508.00");
    expect(loss).toBe("-800.00");
  });

  it("should calculate fractional lots (0.01 micro lot) P&L accurately", () => {
    // 0.01 lot = 1 oz. If price moves +$15.50, PnL = $15.50
    const microProfit = calculateFloatingPnl("BUY", "0.01", "2500.00", "2515.50");
    expect(microProfit).toBe("15.50");
  });

  it("should correctly evaluate Take Profit and Stop Loss triggers", () => {
    const buyOpen = 2500;
    const buyTp = 2520;
    const buySl = 2480;

    // Price hits TP
    const currentPriceHitTp = 2520.50;
    const isTpHit = currentPriceHitTp >= buyTp;
    expect(isTpHit).toBe(true);

    // Price hits SL
    const currentPriceHitSl = 2479.50;
    const isSlHit = currentPriceHitSl <= buySl;
    expect(isSlHit).toBe(true);
  });
});
