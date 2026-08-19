import { CandleStick, GoldTick, TimeFrame, TradingSymbol } from "@/types/trading";

type TickListener = (tick: GoldTick) => void;
type CandleListener = (candle: CandleStick) => void;

interface AssetConfig {
  symbol: TradingSymbol;
  name: string;
  binanceSymbol: string | null;
  baseMid: number;
  spread: number;
  decimals: number;
  volatility: number;
}

export const ASSET_CONFIGS: Record<TradingSymbol, AssetConfig> = {
  "XAU/USD": {
    symbol: "XAU/USD",
    name: "Gold Spot",
    binanceSymbol: "PAXGUSDT",
    baseMid: 4367.80,
    spread: 0.35,
    decimals: 2,
    volatility: 0.8,
  },
  "BTC/USD": {
    symbol: "BTC/USD",
    name: "Bitcoin Spot",
    binanceSymbol: "BTCUSDT",
    baseMid: 96450.0,
    spread: 2.50,
    decimals: 2,
    volatility: 12.0,
  },
  "ETH/USD": {
    symbol: "ETH/USD",
    name: "Ethereum Spot",
    binanceSymbol: "ETHUSDT",
    baseMid: 2750.0,
    spread: 0.40,
    decimals: 2,
    volatility: 2.0,
  },
  "EUR/USD": {
    symbol: "EUR/USD",
    name: "Euro / US Dollar",
    binanceSymbol: "EURUSDT",
    baseMid: 1.0845,
    spread: 0.00015,
    decimals: 4,
    volatility: 0.0005,
  },
  "XAG/USD": {
    symbol: "XAG/USD",
    name: "Silver Spot",
    binanceSymbol: null,
    baseMid: 31.85,
    spread: 0.02,
    decimals: 2,
    volatility: 0.15,
  },
};

class GoldMarketFeed {
  private currentSymbol: TradingSymbol = "XAU/USD";
  private currentMid = 4367.80;
  private spread = 0.35;
  private high24h = 4430.50;
  private low24h = 4365.20;
  private open24h = 4375.00;
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

  public getSelectedSymbol(): TradingSymbol {
    return this.currentSymbol;
  }

  public switchSymbol(symbol: TradingSymbol) {
    if (!ASSET_CONFIGS[symbol]) return;
    this.currentSymbol = symbol;
    const config = ASSET_CONFIGS[symbol];

    this.currentMid = config.baseMid;
    this.spread = config.spread;
    this.high24h = Number((config.baseMid * 1.012).toFixed(config.decimals));
    this.low24h = Number((config.baseMid * 0.988).toFixed(config.decimals));
    this.open24h = Number((config.baseMid * 0.995).toFixed(config.decimals));

    this.initHistory();

    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }

    if (typeof window !== "undefined") {
      this.initLiveFeed();
    }
  }

  private initHistory() {
    const timeframes: TimeFrame[] = ["1M", "5M", "15M", "30M", "1H", "4H", "1D"];
    const now = Date.now();
    const config = ASSET_CONFIGS[this.currentSymbol];

    for (const tf of timeframes) {
      const intervalMs = this.getIntervalMs(tf);
      const stepVolatility = config.volatility * (tf === "1D" ? 4.0 : tf === "4H" ? 3.0 : tf === "1H" ? 2.0 : tf === "30M" ? 1.5 : tf === "15M" ? 1.2 : 0.6);
      
      let price = this.currentMid;
      const count = 500; // Deep 500-candle historical depth

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
          open: Number(open.toFixed(config.decimals)),
          high: Number(high.toFixed(config.decimals)),
          low: Number(low.toFixed(config.decimals)),
          close: Number(close.toFixed(config.decimals)),
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
      case "30M": return "30m";
      case "1H": return "1h";
      case "4H": return "4h";
      case "1D": return "1d";
    }
  }

  private getIntervalMs(tf: TimeFrame): number {
    switch (tf) {
      case "1M": return 60 * 1000;
      case "5M": return 5 * 60 * 1000;
      case "15M": return 15 * 60 * 1000;
      case "30M": return 30 * 60 * 1000;
      case "1H": return 60 * 60 * 1000;
      case "4H": return 4 * 60 * 60 * 1000;
      case "1D": return 24 * 60 * 60 * 1000;
    }
  }

  /**
   * Fetches real live historical klines from Binance
   */
  public async fetchTimeframeHistory(tf: TimeFrame): Promise<CandleStick[]> {
    if (typeof window === "undefined") return this.getHistory(tf);
    const config = ASSET_CONFIGS[this.currentSymbol];
    if (!config.binanceSymbol) return this.getHistory(tf);

    try {
      const interval = this.mapTimeframeToBinance(tf);
      const res = await fetch(
        `https://api.binance.com/api/v3/klines?symbol=${config.binanceSymbol}&interval=${interval}&limit=500`
      );
      if (!res.ok) throw new Error(`Binance API error: ${res.statusText}`);
      
      const rawData = await res.json();
      if (Array.isArray(rawData) && rawData.length > 0) {
        const parsedBars: CandleStick[] = rawData.map((item: any) => ({
          timestamp: Number(item[0]),
          open: Number(parseFloat(item[1]).toFixed(config.decimals)),
          high: Number(parseFloat(item[2]).toFixed(config.decimals)),
          low: Number(parseFloat(item[3]).toFixed(config.decimals)),
          close: Number(parseFloat(item[4]).toFixed(config.decimals)),
          volume: Number(parseFloat(item[5]).toFixed(2)),
        }));

        this.candles.set(tf, parsedBars);
        
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
    const config = ASSET_CONFIGS[this.currentSymbol];

    if (config.binanceSymbol) {
      fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${config.binanceSymbol}`)
        .then((res) => res.json())
        .then((data) => {
          if (data && data.lastPrice) {
            this.currentMid = Number(parseFloat(data.lastPrice).toFixed(config.decimals));
            this.high24h = Number(parseFloat(data.highPrice).toFixed(config.decimals));
            this.low24h = Number(parseFloat(data.lowPrice).toFixed(config.decimals));
            this.open24h = Number(parseFloat(data.openPrice).toFixed(config.decimals));
            this.spread = config.spread;
            this.broadcastTick();
          }
        })
        .catch((err) => console.warn("Live ticker initial fetch:", err));

      this.fetchTimeframeHistory("1M").then(() => {
        this.broadcastTick();
      });

      this.connectWebSocket();
    }

    this.startFallbackSimulation();
  }

  private connectWebSocket() {
    if (typeof window === "undefined") return;
    const config = ASSET_CONFIGS[this.currentSymbol];
    if (!config.binanceSymbol) return;

    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      const binLower = config.binanceSymbol.toLowerCase();
      // Combined streams: Trade ticks (every executed trade), 24h ticker, and 1m klines
      const wsUrl = `wss://stream.binance.com:9443/stream?streams=${binLower}@trade/${binLower}@ticker/${binLower}@kline_1m`;
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

          if (stream.includes("@trade")) {
            const price = parseFloat(data.p);
            if (!isNaN(price)) {
              this.currentMid = Number(price.toFixed(config.decimals));
              if (this.currentMid > this.high24h) this.high24h = this.currentMid;
              if (this.currentMid < this.low24h) this.low24h = this.currentMid;
              this.broadcastTick();
              this.updateLatestCandle(this.currentMid);
            }
          } else if (stream.includes("@ticker")) {
            const price = parseFloat(data.c);
            const high = parseFloat(data.h);
            const low = parseFloat(data.l);
            const open = parseFloat(data.o);
            const bestBid = parseFloat(data.b);
            const bestAsk = parseFloat(data.a);

            if (!isNaN(price)) {
              this.currentMid = Number(price.toFixed(config.decimals));
              this.high24h = Number(high.toFixed(config.decimals));
              this.low24h = Number(low.toFixed(config.decimals));
              this.open24h = Number(open.toFixed(config.decimals));
              
              if (!isNaN(bestBid) && !isNaN(bestAsk) && bestAsk > bestBid) {
                const spreadVal = Number((bestAsk - bestBid).toFixed(config.decimals));
                this.spread = spreadVal > 0 ? spreadVal : config.spread;
              }

              this.broadcastTick();
            }
          } else if (stream.includes("@kline")) {
            const k = data.k;
            if (k) {
              const liveCandle: CandleStick = {
                timestamp: k.t,
                open: Number(parseFloat(k.o).toFixed(config.decimals)),
                high: Number(parseFloat(k.h).toFixed(config.decimals)),
                low: Number(parseFloat(k.l).toFixed(config.decimals)),
                close: Number(parseFloat(k.c).toFixed(config.decimals)),
                volume: Number(parseFloat(k.v).toFixed(2)),
              };

              this.updateCandleWithLive(liveCandle);
            }
          }
        } catch (e) {
          console.error("WS Parse error:", e);
        }
      };

      this.ws.onerror = (e) => {
        console.warn("WebSocket error, falling back to high-freq simulation:", e);
        this.isWsConnected = false;
      };

      this.ws.onclose = () => {
        this.isWsConnected = false;
        if (!this.reconnectTimeout) {
          this.reconnectTimeout = setTimeout(() => {
            this.reconnectTimeout = null;
            this.connectWebSocket();
          }, 4000);
        }
      };
    } catch (err) {
      console.warn("WebSocket initiation exception:", err);
      this.isWsConnected = false;
    }
  }

  private startFallbackSimulation() {
    if (this.timer) clearInterval(this.timer);

    this.timer = setInterval(() => {
      if (this.isWsConnected) return;

      const config = ASSET_CONFIGS[this.currentSymbol];
      const delta = (Math.random() - 0.495) * (config.volatility * 0.35);
      this.currentMid = Number((this.currentMid + delta).toFixed(config.decimals));

      if (this.currentMid > this.high24h) this.high24h = this.currentMid;
      if (this.currentMid < this.low24h) this.low24h = this.currentMid;

      this.broadcastTick();
      this.updateLatestCandle(this.currentMid);
    }, 600);
  }

  private updateCandleWithLive(candle: CandleStick) {
    const list = this.candles.get("1M") || [];
    if (list.length === 0) {
      list.push(candle);
    } else {
      const last = list[list.length - 1];
      if (last && candle.timestamp >= last.timestamp + 60000) {
        list.push(candle);
        if (list.length > 120) list.shift();
      } else if (last) {
        last.high = Math.max(last.high, candle.high);
        last.low = Math.min(last.low, candle.low);
        last.close = candle.close;
        last.volume += candle.volume;
      }
    }
    this.candles.set("1M", list);

    for (const listener of this.candleListeners) {
      listener(candle);
    }
  }

  private updateLatestCandle(price: number) {
    const list = this.candles.get("1M") || [];
    if (list.length > 0) {
      const last = list[list.length - 1];
      const now = Date.now();

      if (last && now - last.timestamp >= 60000) {
        const newCandle: CandleStick = {
          timestamp: now - (now % 60000),
          open: price,
          high: price,
          low: price,
          close: price,
          volume: 1,
        };
        list.push(newCandle);
        if (list.length > 120) list.shift();
      } else if (last) {
        last.high = Math.max(last.high, price);
        last.low = Math.min(last.low, price);
        last.close = price;
        last.volume += 1;
      }
      this.candles.set("1M", list);

      const lastCandle = list[list.length - 1];
      if (lastCandle) {
        for (const listener of this.candleListeners) {
          listener(lastCandle);
        }
      }
    }
  }

  private broadcastTick() {
    const tick = this.getCurrentTick();
    for (const listener of this.tickListeners) {
      listener(tick);
    }
  }

  public getCurrentTick(): GoldTick {
    const config = ASSET_CONFIGS[this.currentSymbol];
    const halfSpread = this.spread / 2;
    const bidNum = Math.max(0.0001, this.currentMid - halfSpread);
    const askNum = this.currentMid + halfSpread;
    const change24h = this.open24h > 0 ? Number((((this.currentMid - this.open24h) / this.open24h) * 100).toFixed(2)) : 0;

    return {
      symbol: this.currentSymbol,
      bid: bidNum.toFixed(config.decimals),
      ask: askNum.toFixed(config.decimals),
      mid: this.currentMid.toFixed(config.decimals),
      spread: this.spread.toFixed(config.decimals),
      high24h: this.high24h.toFixed(config.decimals),
      low24h: this.low24h.toFixed(config.decimals),
      change24h,
      timestamp: Date.now(),
    };
  }

  public getHistory(tf: TimeFrame): CandleStick[] {
    return this.candles.get(tf) || [];
  }

  public subscribeTicks(listener: TickListener): () => void {
    this.tickListeners.add(listener);
    listener(this.getCurrentTick());
    return () => this.tickListeners.delete(listener);
  }

  public subscribeCandles(listener: CandleListener): () => void {
    this.candleListeners.add(listener);
    return () => this.candleListeners.delete(listener);
  }
}

export const goldMarketFeed = new GoldMarketFeed();
