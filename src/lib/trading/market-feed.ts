import { CandleStick, GoldTick, TimeFrame } from "@/types/trading";
import { moneyAdd, moneySubtract } from "@/lib/money";

type TickListener = (tick: GoldTick) => void;
type CandleListener = (candle: CandleStick) => void;

class GoldMarketFeed {
  private currentMid = 4349.78;
  private spread = 0.35; // $0.35 spread (35 pips)
  private high24h = 4362.45;
  private low24h = 4338.10;
  private open24h = 4351.27;
  private tickListeners: Set<TickListener> = new Set();
  private candleListeners: Set<CandleListener> = new Set();
  private timer: NodeJS.Timeout | null = null;
  private candles: Map<TimeFrame, CandleStick[]> = new Map();

  constructor() {
    this.initHistory();
    this.startFeed();
  }

  private initHistory() {
    const timeframes: TimeFrame[] = ["1M", "5M", "15M", "1H", "1D"];
    const now = Date.now();

    for (const tf of timeframes) {
      const intervalMs = this.getIntervalMs(tf);
      const stepVolatility = tf === "1D" ? 6.0 : tf === "1H" ? 2.5 : tf === "15M" ? 1.2 : 0.6;
      
      let price = this.currentMid;
      const count = 75;

      // Generate in reverse from current price backwards
      const tempBars: CandleStick[] = [];
      for (let i = 0; i < count; i++) {
        const time = now - i * intervalMs;
        const delta = (Math.random() - 0.49) * stepVolatility;
        const close = price;
        const open = close - delta;
        const high = Math.max(open, close) + Math.random() * (stepVolatility * 0.4);
        const low = Math.min(open, close) - Math.random() * (stepVolatility * 0.4);
        const volume = Math.floor(Math.random() * 400) + 120;

        tempBars.unshift({
          timestamp: time,
          open: Number(open.toFixed(2)),
          high: Number(high.toFixed(2)),
          low: Number(low.toFixed(2)),
          close: Number(close.toFixed(2)),
          volume,
        });

        price = open;
      }

      this.candles.set(tf, tempBars);
    }
  }

  private getIntervalMs(tf: TimeFrame): number {
    switch (tf) {
      case "1M":
        return 60 * 1000;
      case "5M":
        return 5 * 60 * 1000;
      case "15M":
        return 15 * 60 * 1000;
      case "1H":
        return 60 * 60 * 1000;
      case "1D":
        return 24 * 60 * 60 * 1000;
    }
  }

  private startFeed() {
    if (typeof window === "undefined") return;
    if (this.timer) return;

    this.timer = setInterval(() => {
      this.generateTick();
    }, 600);
  }

  private generateTick() {
    // Realistic brownian motion with mean-reversion around 4349.78
    const drift = (4349.78 - this.currentMid) * 0.005;
    const volatility = (Math.random() - 0.5) * 0.45;
    this.currentMid = Number((this.currentMid + drift + volatility).toFixed(2));

    if (this.currentMid > this.high24h) this.high24h = this.currentMid;
    if (this.currentMid < this.low24h) this.low24h = this.currentMid;

    const halfSpread = (this.spread / 2).toFixed(2);
    const bid = moneySubtract(this.currentMid.toFixed(2), halfSpread);
    const ask = moneyAdd(this.currentMid.toFixed(2), halfSpread);
    const change24h = Number((((this.currentMid - this.open24h) / this.open24h) * 100).toFixed(2));

    const tick: GoldTick = {
      symbol: "XAU/USD",
      bid,
      ask,
      mid: this.currentMid.toFixed(2),
      spread: this.spread.toFixed(2),
      high24h: this.high24h.toFixed(2),
      low24h: this.low24h.toFixed(2),
      change24h,
      timestamp: Date.now(),
    };

    // Update 1M candle
    this.updateCurrentCandle(tick);

    // Notify listeners
    this.tickListeners.forEach((listener) => listener(tick));
  }

  private updateCurrentCandle(tick: GoldTick) {
    const bars1M = this.candles.get("1M");
    if (!bars1M || bars1M.length === 0) return;

    const lastCandle = bars1M[bars1M.length - 1];
    if (!lastCandle) return;

    const currentPrice = Number(tick.mid);
    const intervalMs = 60 * 1000;
    const now = tick.timestamp;

    if (now - lastCandle.timestamp < intervalMs) {
      lastCandle.close = currentPrice;
      lastCandle.high = Math.max(lastCandle.high, currentPrice);
      lastCandle.low = Math.min(lastCandle.low, currentPrice);
      lastCandle.volume += 1;
      this.candleListeners.forEach((l) => l(lastCandle));
    } else {
      const newCandle: CandleStick = {
        timestamp: now,
        open: currentPrice,
        high: currentPrice,
        low: currentPrice,
        close: currentPrice,
        volume: 1,
      };
      bars1M.push(newCandle);
      if (bars1M.length > 100) bars1M.shift();
      this.candleListeners.forEach((l) => l(newCandle));
    }
  }

  public getCurrentTick(): GoldTick {
    const halfSpread = (this.spread / 2).toFixed(2);
    const bid = moneySubtract(this.currentMid.toFixed(2), halfSpread);
    const ask = moneyAdd(this.currentMid.toFixed(2), halfSpread);
    const change24h = Number((((this.currentMid - this.open24h) / this.open24h) * 100).toFixed(2));

    return {
      symbol: "XAU/USD",
      bid,
      ask,
      mid: this.currentMid.toFixed(2),
      spread: this.spread.toFixed(2),
      high24h: this.high24h.toFixed(2),
      low24h: this.low24h.toFixed(2),
      change24h,
      timestamp: Date.now(),
    };
  }

  public getHistory(tf: TimeFrame): CandleStick[] {
    return [...(this.candles.get(tf) || [])];
  }

  public subscribeTicks(listener: TickListener): () => void {
    this.tickListeners.add(listener);
    if (typeof window !== "undefined" && !this.timer) {
      this.startFeed();
    }
    listener(this.getCurrentTick());
    return () => {
      this.tickListeners.delete(listener);
    };
  }

  public subscribeCandles(listener: CandleListener): () => void {
    this.candleListeners.add(listener);
    return () => {
      this.candleListeners.delete(listener);
    };
  }
}

export const goldMarketFeed = new GoldMarketFeed();
