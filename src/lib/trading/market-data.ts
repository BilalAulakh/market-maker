import { GoldTick, TradingSymbol } from "@/types/trading";
import { ASSET_CONFIGS, goldMarketFeed } from "@/lib/trading/market-feed";
import { moneyAdd, moneySubtract } from "@/lib/money";

export interface MarketPriceSnapshot {
  symbol: string;
  bid: string;
  ask: string;
  mid: string;
  spread: string;
  timestamp: number;
}

export class MarketDataService {
  /**
   * Returns current live snapshot for any symbol.
   * BUY trades execute at ASK; SELL trades execute at BID.
   */
  public static getPrice(symbol: string = "XAU/USD"): MarketPriceSnapshot {
    const supportedSymbol = (symbol in ASSET_CONFIGS ? symbol : "XAU/USD") as TradingSymbol;
    const tick: GoldTick = goldMarketFeed.getCurrentTick();

    // If current feed is matching the requested symbol, use live feed tick
    if (goldMarketFeed.getSelectedSymbol() === supportedSymbol) {
      return {
        symbol: supportedSymbol,
        bid: tick.bid,
        ask: tick.ask,
        mid: tick.mid,
        spread: tick.spread,
        timestamp: tick.timestamp,
      };
    }

    // Otherwise compute from static config base
    const cfg = ASSET_CONFIGS[supportedSymbol];
    const mid = cfg.baseMid.toFixed(cfg.decimals);
    const halfSpread = (cfg.spread / 2).toFixed(cfg.decimals);
    const bid = moneySubtract(mid, halfSpread);
    const ask = moneyAdd(mid, halfSpread);

    return {
      symbol: supportedSymbol,
      bid,
      ask,
      mid,
      spread: cfg.spread.toFixed(cfg.decimals),
      timestamp: Date.now(),
    };
  }

  /**
   * Returns execution price based on order side:
   * BUY -> ASK
   * SELL -> BID
   */
  public static getExecutionPrice(symbol: string, side: "BUY" | "SELL"): string {
    const price = this.getPrice(symbol);
    return side === "BUY" ? price.ask : price.bid;
  }

  /**
   * Returns closing price based on position side:
   * Closing a BUY position -> execute sell at BID
   * Closing a SELL position -> execute buy at ASK
   */
  public static getClosePrice(symbol: string, side: "BUY" | "SELL"): string {
    const price = this.getPrice(symbol);
    return side === "BUY" ? price.bid : price.ask;
  }
}
