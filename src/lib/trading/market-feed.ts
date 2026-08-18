import { CandleStick, GoldTick, TimeFrame } from "@/types/trading";
import { moneyAdd, moneySubtract } from "@/lib/money";

type TickListener = (tick: GoldTick) => void;
type CandleListener = (candle: CandleStick) => void;

class GoldMarketFeed {
  private currentMid = 4395.80;
  private spread = 0.35; // $0.35 spread
  private high24h = 4412.50;
  private low24h = 4365.50;
  private open24h = 4377.40;
  private tickListeners: Set<TickListener> = new Set();
  private candleListeners: Set<CandleListener> = new Set();
  private timer: NodeJS.Timeout | null = null;
  private candles: Map<TimeFrame, CandleStick[]> = new Map();
  private ws: WebSocket | null = null;
  private isWsConnected = false;
  private reconnectTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.initHistory();
    if (typeof window !== "undefined") {
      this.initLiveFeed();
    }
  }

  private initHistory() {
    const timeframes: TimeFrame[] = ["1M", "5M", "15M", "1H", "1D"];
    const now = Date.now();

    for (const tf of timeframes) {
      const intervalMs = this.getIntervalMs(tf);
      const stepVolatility = tf === "1D" ? 6.0 : tf === "1H" ? 2.5 : tf === "15M" ? 1.2 : 0.6;
      
      let price = this.currentMid;
      const count = 75;

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

  private mapTimeframeToBinance(tf: TimeFrame): string {
    switch (tf) {
      case "1M": return "1m";
      case "5M": return "5m";
      case "15M": return "15m";
      case "1H": return "1h";
      case "1D": return "1d";
    }
  }

  private getIntervalMs(tf: TimeFrame): number {
    switch (tf) {
      case "1M": return 60 * 1000;
      case "5M": return 5 * 60 * 1000;
      case "15M": return 15 * 60 * 1000;
      case "1H": return 60 * 60 * 1000;
      case "1D": return 24 * 60 * 60 * 1000;
    }
  }

  /**
   * Fetches real live historical klines from Binance PAXG/USDT (Spot Gold)
   */
  public async fetchTimeframeHistory(tf: TimeFrame): Promise<CandleStick[]> {
    if (typeof window === "undefined") return this.getHistory(tf);

    try {
      const interval = this.mapTimeframeToBinance(tf);
      const res = await fetch(
        `https://api.binance.com/api/v3/klines?symbol=PAXGUSDT&interval=${interval}&limit=100`
      );
      if (!res.ok) throw new Error(`Binance API error: ${res.statusText}`);
      
      const rawData = await res.json();
      if (Array.isArray(rawData) && rawData.length > 0) {
        const parsedBars: CandleStick[] = rawData.map((item: any) => ({
          timestamp: Number(item[0]),
          open: Number(parseFloat(item[1]).toFixed(2)),
          high: Number(parseFloat(item[2]).toFixed(2)),
          low: Number(parseFloat(item[3]).toFixed(2)),
          close: Number(parseFloat(item[4]).toFixed(2)),
          volume: Number(parseFloat(item[5]).toFixed(2)),
        }));

        this.candles.set(tf, parsedBars);
        
        // Update current mid with latest bar close if applicable
        const lastBar = parsedBars[parsedBars.length - 1];
        if (lastBar && tf === "1M") {
          this.currentMid = lastBar.close;
        }

        return parsedBars;
      }
    } catch (err) {
      console.warn("Failed to fetch live Binance klines, falling back to cache:", err);
    }

    return this.getHistory(tf);
  }

  /**
   * Initializes Live WebSocket + REST feeds
   */
  public initLiveFeed() {
    if (typeof window === "undefined") return;

    // Fetch initial 24hr ticker data
    fetch("https://api.binance.com/api/v3/ticker/24hr?symbol=PAXGUSDT")
      .then((res) => res.json())
      .then((data) => {
        if (data && data.lastPrice) {
          this.currentMid = Number(parseFloat(data.lastPrice).toFixed(2));
          this.high24h = Number(parseFloat(data.highPrice).toFixed(2));
          this.low24h = Number(parseFloat(data.lowPrice).toFixed(2));
          this.open24h = Number(parseFloat(data.openPrice).toFixed(2));
          this.spread = 0.35;
          this.broadcastTick();
        }
      })
      .catch((err) => console.warn("Live ticker initial fetch:", err));

    // Pre-fetch 1M candle history
    this.fetchTimeframeHistory("1M").then(() => {
      this.broadcastTick();
    });

    this.connectWebSocket();
    this.startFallbackSimulation();
  }

  private connectWebSocket() {
    if (typeof window === "undefined") return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      // Connect to combined stream for ticker and 1m kline
      const wsUrl = "wss://stream.binance.com:9443/stream?streams=paxgusdt@ticker/paxgusdt@kline_1m";
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isWsConnected = true;
        if (this.reconnectTimeout) {
          clearTimeout(this.reconnectTimeout);
          this.reconnectTimeout = null;
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          const stream = payload.stream;
          const data = payload.data;

          if (stream === "paxgusdt@ticker") {
            const price = parseFloat(data.c);
            const high = parseFloat(data.h);
            const low = parseFloat(data.l);
            const open = parseFloat(data.o);
            const bestBid = parseFloat(data.b);
            const bestAsk = parseFloat(data.a);

            if (!isNaN(price)) {
              this.currentMid = Number(price.toFixed(2));
              this.high24h = Number(high.toFixed(2));
              this.low24h = Number(low.toFixed(2));
              this.open24h = Number(open.toFixed(2));
              
              if (!isNaN(bestBid) && !isNaN(bestAsk) && bestAsk > bestBid) {
                const spreadVal = Number((bestAsk - bestBid).toFixed(2));
                this.spread = spreadVal > 0 && spreadVal < 5 ? spreadVal : 0.35;
              }

              this.broadcastTick();
            }
          } else if (stream === "paxgusdt@kline_1m") {
            const k = data.k;
            if (k) {
              const liveCandle: CandleStick = {
                timestamp: k.t,
                open: Number(parseFloat(k.o).toFixed(2)),
                high: Number(parseFloat(k.h).toFixed(2)),
                low: Number(parseFloat(k.l).toFixed(2)),
                close: Number(parseFloat(k.c).toFixed(2)),
                volume: Number(parseFloat(k.v).toFixed(2)),
              };

              this.updateCandleWithLive(liveCandle);
            }
          }
        } catch (e) {
          console.error("WS Parse error:", e);
        }
      };

      this.ws.onerror = () => {
        this.isWsConnected = false;
      };

      this.ws.onclose = () => {
        this.isWsConnected = false;
        // Schedule auto-reconnect
        if (!this.reconnectTimeout) {
          this.reconnectTimeout = setTimeout(() => {
            this.reconnectTimeout = null;
            this.connectWebSocket();
          }, 3000);
        }
      };
    } catch (err) {
      console.warn("WebSocket connect failed:", err);
      this.isWsConnected = false;
    }
  }

  private startFallbackSimulation() {
    if (this.timer) return;

    this.timer = setInterval(() => {
      // If WebSocket is not connected or idle, provide smooth micro-ticks around currentMid
      if (!this.isWsConnected) {
        const drift = (4395.80 - this.currentMid) * 0.005;
        const volatility = (Math.random() - 0.5) * 0.35;
        this.currentMid = Number((this.currentMid + drift + volatility).toFixed(2));

        if (this.currentMid > this.high24h) this.high24h = this.currentMid;
        if (this.currentMid < this.low24h) this.low24h = this.currentMid;

        this.broadcastTick();
      }
    }, 600);
  }

  private updateCandleWithLive(candle: CandleStick) {
    const bars1M = this.candles.get("1M");
    if (!bars1M) return;

    if (bars1M.length === 0) {
      bars1M.push(candle);
    } else {
      const lastIndex = bars1M.length - 1;
      const lastCandle = bars1M[lastIndex];

      if (lastCandle && lastCandle.timestamp === candle.timestamp) {
        bars1M[lastIndex] = candle;
      } else if (lastCandle && candle.timestamp > lastCandle.timestamp) {
        bars1M.push(candle);
        if (bars1M.length > 120) bars1M.shift();
      }
    }

    this.candleListeners.forEach((listener) => listener(candle));
  }

  private broadcastTick() {
    const tick = this.getCurrentTick();
    
    // Update local candle in simulation mode
    if (!this.isWsConnected) {
      this.updateCurrentCandle(tick);
    }

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
      if (bars1M.length > 120) bars1M.shift();
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
      change24h: isNaN(change24h) ? 0.35 : change24h,
      timestamp: Date.now(),
    };
  }

  public getHistory(tf: TimeFrame): CandleStick[] {
    return [...(this.candles.get(tf) || [])];
  }

  public subscribeTicks(listener: TickListener): () => void {
    this.tickListeners.add(listener);
    if (typeof window !== "undefined") {
      this.connectWebSocket();
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
