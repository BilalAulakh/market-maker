export type TradeDirection = "BUY" | "SELL";

export type OrderSide = "BUY" | "SELL";

export type PositionStatus = "OPEN" | "CLOSED" | "PENDING" | "CANCELLED";

export type OrderStatus =
  | "PENDING"
  | "OPEN"
  | "FILLED"
  | "PARTIALLY_FILLED"
  | "CANCELLED"
  | "REJECTED"
  | "EXPIRED"
  | "CLOSED";

export type OrderType = "MARKET" | "LIMIT" | "STOP";

export type PositionCloseReason = "MANUAL" | "TAKE_PROFIT" | "STOP_LOSS" | "STOP_OUT" | "LIQUIDATION";

export type AccountStatus = "active" | "suspended" | "read_only";

export type TradingSymbol = "XAU/USD" | "BTC/USD" | "ETH/USD" | "EUR/USD" | "XAG/USD";

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

export interface InstrumentConfig {
  symbol: string;
  name: string;
  base_currency: string;
  quote_currency: string;
  contract_size: string;
  min_lot: string;
  max_lot: string;
  lot_step: string;
  commission_per_lot: string;
  spread_markup_pips: string;
  max_leverage: number;
  is_trading_enabled: boolean;
}

export interface TradingAccount {
  id: string;
  user_id: string;
  account_number: string;
  account_type: string;
  currency: string;
  leverage: number;
  balance: string;
  equity: string;
  margin: string;
  free_margin: string;
  margin_level: string;
  status: AccountStatus;
  created_at: string;
  updated_at: string;
}

export interface OrderRecord {
  id: string;
  account_id: string;
  user_id: string;
  symbol: string;
  side: TradeDirection;
  order_type: OrderType;
  volume: string;
  requested_price?: string | null;
  executed_price?: string | null;
  stop_loss?: string | null;
  take_profit?: string | null;
  status: OrderStatus;
  commission: string;
  swap: string;
  rejection_reason?: string | null;
  created_at: string;
  updated_at: string;
  executed_at?: string | null;
  cancelled_at?: string | null;
}

export interface Position {
  id: string;
  account_id?: string;
  user_id?: string;
  order_id?: string;
  symbol: string;
  direction: TradeDirection;
  orderType?: OrderType;
  lots: string; // Decimal string (1.0 = 100 oz for gold)
  openPrice: string; // Decimal string
  targetPrice?: string; // For limit orders
  currentPrice: string; // Decimal string
  takeProfit?: string; // TP Target Price
  stopLoss?: string; // SL Target Price
  margin: string; // Decimal string
  leverage: number; // e.g. 100
  unrealizedPnl: string; // Decimal string
  commission: string; // Decimal string
  swap?: string;
  openedAt: string;
  closedAt?: string;
  closePrice?: string;
  realizedPnl?: string;
  closeReason?: PositionCloseReason;
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

export interface RiskSettings {
  id?: string;
  account_id?: string | null;
  margin_call_level: string; // e.g. "100.00"
  stop_out_level: string; // e.g. "50.00"
  max_open_positions: number;
  max_account_exposure: string; // in lots
  max_daily_loss: string;
}

export interface DealerExposureSummary {
  symbol: string;
  totalBuyLots: string;
  totalSellLots: string;
  netExposureLots: string;
  grossExposureLots: string;
  openPositionsCount: number;
  clientUnrealizedPnl: string;
  housePnl: string;
  spread: string;
  activeAccountsCount: number;
}

export interface CreateOrderRequest {
  symbol?: string;
  direction: TradeDirection;
  orderType: OrderType;
  lots: string;
  targetPrice?: string;
  leverage?: number;
  takeProfit?: string;
  stopLoss?: string;
  accountId?: string;
}

export interface ClosePositionRequest {
  positionId: string;
  closeReason?: PositionCloseReason;
}
