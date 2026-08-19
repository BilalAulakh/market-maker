import { getServiceRoleClient } from "@/lib/supabase/service-role";
import { DealerExposureSummary } from "@/types/trading";
import { moneyAdd, moneyDivide, moneyMultiply, moneySubtract } from "@/lib/money";
import { MarketDataService } from "@/lib/trading/market-data";
import { calculateFloatingPnl } from "@/lib/trading/engine";
import { PositionService } from "@/lib/trading/position-service";

export class RiskService {
  /**
   * Computes institutional dealer desk exposure summary across all open positions.
   */
  public static async getDealerExposure(symbol: string = "XAU/USD"): Promise<DealerExposureSummary> {
    const serviceClient = getServiceRoleClient();

    const { data: openPositions } = await serviceClient
      .from("positions")
      .select("*")
      .eq("symbol", symbol)
      .eq("status", "OPEN");

    const priceSnapshot = MarketDataService.getPrice(symbol);

    let buyLots = "0.00";
    let sellLots = "0.00";
    let clientTotalPnl = "0.00";
    const userSet = new Set<string>();

    if (openPositions && openPositions.length > 0) {
      for (const pos of openPositions) {
        userSet.add(pos.user_id);
        const volumeStr = pos.volume.toString();
        const currentPrice = pos.side === "BUY" ? priceSnapshot.bid : priceSnapshot.ask;
        const pnl = calculateFloatingPnl(pos.side, volumeStr, pos.open_price.toString(), currentPrice);

        clientTotalPnl = moneyAdd(clientTotalPnl, pnl);

        if (pos.side === "BUY") {
          buyLots = moneyAdd(buyLots, volumeStr);
        } else {
          sellLots = moneyAdd(sellLots, volumeStr);
        }
      }
    }

    const netExposure = moneySubtract(buyLots, sellLots);
    const grossExposure = moneyAdd(buyLots, sellLots);
    // Market maker book PnL is the inverse of net client PnL (B-Book Internalization)
    const housePnl = moneyMultiply(clientTotalPnl, "-1.00", 2);

    return {
      symbol,
      totalBuyLots: buyLots,
      totalSellLots: sellLots,
      netExposureLots: netExposure,
      grossExposureLots: grossExposure,
      openPositionsCount: openPositions ? openPositions.length : 0,
      clientUnrealizedPnl: clientTotalPnl,
      housePnl,
      spread: priceSnapshot.spread,
      activeAccountsCount: userSet.size,
    };
  }

  /**
   * Scans all trading accounts for Margin Call (< 100%) and Stop-Out (< 50%) conditions.
   * Automatically executes safe liquidations of worst-performing positions if below stop-out level.
   */
  public static async executeStopOutCheck(): Promise<{
    checkedAccounts: number;
    liquidatedPositionsCount: number;
  }> {
    const serviceClient = getServiceRoleClient();

    const { data: accounts } = await serviceClient
      .from("trading_accounts")
      .select("*")
      .eq("status", "active");

    if (!accounts || accounts.length === 0) {
      return { checkedAccounts: 0, liquidatedPositionsCount: 0 };
    }

    let liquidatedCount = 0;

    for (const acc of accounts) {
      const { data: positions } = await serviceClient
        .from("positions")
        .select("*")
        .eq("account_id", acc.id)
        .eq("status", "OPEN");

      if (!positions || positions.length === 0) continue;

      // Calculate live equity & margin
      let totalFloatingPnl = "0.00";
      let totalUsedMargin = "0.00";

      const enrichedPositions = positions.map((p) => {
        const priceSnapshot = MarketDataService.getPrice(p.symbol);
        const curPrice = p.side === "BUY" ? priceSnapshot.bid : priceSnapshot.ask;
        const pnl = calculateFloatingPnl(p.side, p.volume.toString(), p.open_price.toString(), curPrice);
        totalFloatingPnl = moneyAdd(totalFloatingPnl, pnl);
        totalUsedMargin = moneyAdd(totalUsedMargin, p.margin.toString());
        return { ...p, livePnl: pnl };
      });

      const equity = moneyAdd(acc.balance, totalFloatingPnl);

      if (Number(totalUsedMargin) > 0) {
        const marginLevel = moneyMultiply(moneyDivide(equity, totalUsedMargin, 4), "100", 2);

        // Margin Call Warning (< 100%)
        if (Number(marginLevel) <= 100 && Number(marginLevel) > 50) {
          await serviceClient.from("notifications").insert({
            user_id: acc.user_id,
            title: "Margin Call Warning",
            message: `Your account margin level has dropped to ${marginLevel}%. Please deposit funds or close positions to prevent liquidation.`,
            type: "margin",
          });
        }

        // Stop-Out Level Liquidation (<= 50%)
        if (Number(marginLevel) <= 50) {
          // Sort positions by largest floating loss first
          enrichedPositions.sort((a, b) => Number(a.livePnl) - Number(b.livePnl));

          for (const posToClose of enrichedPositions) {
            await PositionService.closePosition(posToClose.id, "STOP_OUT");
            liquidatedCount++;

            await serviceClient.from("notifications").insert({
              user_id: acc.user_id,
              title: "Position Liquidated (Stop-Out)",
              message: `Position ${posToClose.symbol} (${posToClose.side} ${posToClose.volume} lots) was automatically liquidated due to account margin level reaching stop-out threshold (${marginLevel}%).`,
              type: "margin",
            });

            // Re-evaluate equity after closing worst position
            break; // Close one by one
          }
        }
      }
    }

    return {
      checkedAccounts: accounts.length,
      liquidatedPositionsCount: liquidatedCount,
    };
  }
}
