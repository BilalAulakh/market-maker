export type TradeDirection = "BUY" | "SELL";

export type PositionStatus = "OPEN" | "CLOSED" | "PENDING" | "CANCELLED";

export interface GoldTick {
  symbol: string;
  bid: string; // Decimal string
  ask: string; // Decimal string
  mid: string; // Decimal string
  spread: string; // Decimal string
  high24h: string;
  low24h: string;
  change24h: number; // percentage
  timestamp: number;
}

export interface CandleStick {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type TimeFrame = "1M" | "5M" | "15M" | "1H" | "1D";

export type OrderType = "MARKET" | "LIMIT" | "STOP";

export interface Position {
  id: string;
  symbol: "XAU/USD";
  direction: TradeDirection;
  orderType?: OrderType;
  lots: string; // Decimal string (1.0 = 100 oz)
  openPrice: string; // Decimal string
  targetPrice?: string; // For limit orders
  currentPrice: string; // Decimal string
  takeProfit?: string; // TP Target Price
  stopLoss?: string; // SL Target Price
  margin: string; // Decimal string
  leverage: number; // e.g. 100
  unrealizedPnl: string; // Decimal string
  commission: string; // Decimal string
  openedAt: string;
  closedAt?: string;
  closePrice?: string;
  realizedPnl?: string;
  closeReason?: "MANUAL" | "TAKE_PROFIT" | "STOP_LOSS" | "LIQUIDATION";
  status: PositionStatus;
  ledgerTransactionId?: string;
}

export interface AccountSummary {
  balance: string; // Pure ledger derived balance
  equity: string; // balance + sum(unrealizedPnl)
  usedMargin: string; // sum of open position margins
  freeMargin: string; // equity - usedMargin
  marginLevel: string; // (equity / usedMargin) * 100
}
