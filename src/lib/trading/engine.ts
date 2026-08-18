import {
  AccountSummary,
  GoldTick,
  Position,
  TradeDirection,
  OrderType,
} from "@/types/trading";
import {
  moneyAdd,
  moneyDivide,
  moneyIsGreaterThanOrEqual,
  moneyMultiply,
  moneySubtract,
  moneySum,
} from "@/lib/money";
import { LedgerEngine } from "@/lib/ledger/service";
import { goldMarketFeed } from "@/lib/trading/market-feed";

// Gold specifications: 1 Standard Lot = 100 Troy Ounces
const GOLD_CONTRACT_SIZE = "100";
const COMMISSION_PER_LOT = "15.00"; // $15 per standard lot ($0.15/oz)

export function calculateRequiredMargin(
  lots: string,
  price: string,
  leverage: number
): string {
  // Notional = lots * 100 * price
  const notional = moneyMultiply(moneyMultiply(lots, GOLD_CONTRACT_SIZE), price);
  // Margin = Notional / Leverage
  return moneyDivide(notional, leverage.toString(), 2);
}

export function calculateFloatingPnl(
  direction: TradeDirection,
  lots: string,
  openPrice: string,
  currentPrice: string
): string {
  const oz = moneyMultiply(lots, GOLD_CONTRACT_SIZE);
  if (direction === "BUY") {
    const priceDiff = moneySubtract(currentPrice, openPrice);
    return moneyMultiply(priceDiff, oz, 2);
  } else {
    const priceDiff = moneySubtract(openPrice, currentPrice);
    return moneyMultiply(priceDiff, oz, 2);
  }
}

export class TradingEngine {
  private positions: Map<string, Position> = new Map();
  private closedPositions: Position[] = [];
  private ledgerEngine: LedgerEngine;
  private clientAccountId: string;
  private feeRevenueAccountId: string;

  constructor(
    ledgerEngine: LedgerEngine,
    clientAccountId: string,
    feeRevenueAccountId: string,
    _brokerOperatingAccountId?: string
  ) {
    this.ledgerEngine = ledgerEngine;
    this.clientAccountId = clientAccountId;
    this.feeRevenueAccountId = feeRevenueAccountId;
  }

  public getOpenPositions(): Position[] {
    return Array.from(this.positions.values())
      .filter((p) => p.status === "OPEN")
      .sort((a, b) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime());
  }

  public getPendingOrders(): Position[] {
    return Array.from(this.positions.values())
      .filter((p) => p.status === "PENDING")
      .sort((a, b) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime());
  }

  public getClosedPositions(): Position[] {
    return [...this.closedPositions].sort(
      (a, b) => new Date(b.closedAt || "").getTime() - new Date(a.closedAt || "").getTime()
    );
  }

  public openPosition(
    direction: TradeDirection,
    lots: string,
    leverage: number = 100,
    takeProfit?: string,
    stopLoss?: string,
    orderType: OrderType = "MARKET",
    targetPrice?: string
  ): Position {
    const tick = goldMarketFeed.getCurrentTick();
    const isLimit = orderType === "LIMIT" && targetPrice && Number(targetPrice) > 0;
    const executionPrice = isLimit ? targetPrice! : direction === "BUY" ? tick.ask : tick.bid;
    const margin = calculateRequiredMargin(lots, executionPrice, leverage);
    const commission = moneyMultiply(COMMISSION_PER_LOT, lots, 2);

    const summary = this.getAccountSummary(tick);
    if (!moneyIsGreaterThanOrEqual(summary.freeMargin, margin)) {
      throw new Error(
        `Insufficient Free Margin: Required $${margin}, but Free Margin is only $${summary.freeMargin}.`
      );
    }

    const id = `pos_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`;
    const position: Position = {
      id,
      symbol: "XAU/USD",
      direction,
      orderType,
      lots,
      openPrice: executionPrice,
      targetPrice: isLimit ? targetPrice : undefined,
      currentPrice: direction === "BUY" ? tick.ask : tick.bid,
      takeProfit: takeProfit && Number(takeProfit) > 0 ? takeProfit : undefined,
      stopLoss: stopLoss && Number(stopLoss) > 0 ? stopLoss : undefined,
      margin,
      leverage,
      unrealizedPnl: "0.00",
      commission,
      openedAt: new Date().toISOString(),
      status: isLimit ? "PENDING" : "OPEN",
    };

    this.positions.set(id, position);

    // Sync trade execution to Supabase audit log
    if (typeof window !== "undefined") {
      import("@/lib/supabase/browser")
        .then(({ createClient }) => {
          const supabase = createClient();
          supabase
            .from("audit_logs")
            .insert({
              action: isLimit ? "PLACE_LIMIT_ORDER" : "OPEN_TRADE",
              category: "trading",
              metadata: {
                position_id: id,
                symbol: "XAU/USD",
                direction,
                lots,
                price: executionPrice,
                margin,
                orderType,
                targetPrice,
                takeProfit,
                stopLoss,
              },
            })
            .then(() => {});
        })
        .catch(() => {});
    }

    return position;
  }

  public cancelPendingOrder(orderId: string): Position {
    const position = this.positions.get(orderId);
    if (!position || position.status !== "PENDING") {
      throw new Error(`Pending order ${orderId} not found or already filled.`);
    }
    position.status = "CANCELLED";
    position.closedAt = new Date().toISOString();
    this.positions.delete(orderId);
    this.closedPositions.unshift(position);

    if (typeof window !== "undefined") {
      import("@/lib/supabase/browser")
        .then(({ createClient }) => {
          const supabase = createClient();
          supabase
            .from("audit_logs")
            .insert({
              action: "CANCEL_LIMIT_ORDER",
              category: "trading",
              metadata: {
                order_id: orderId,
                symbol: position.symbol,
                direction: position.direction,
                lots: position.lots,
              },
            })
            .then(() => {});
        })
        .catch(() => {});
    }
    return position;
  }

  public checkAndFillPendingOrders(tick: GoldTick): Position[] {
    const filled: Position[] = [];
    for (const pos of this.positions.values()) {
      if (pos.status === "PENDING" && pos.targetPrice) {
        const target = Number(pos.targetPrice);
        const ask = Number(tick.ask);
        const bid = Number(tick.bid);

        let shouldFill = false;
        if (pos.direction === "BUY" && ask <= target) {
          shouldFill = true;
        } else if (pos.direction === "SELL" && bid >= target) {
          shouldFill = true;
        }

        if (shouldFill) {
          pos.status = "OPEN";
          pos.openPrice = pos.targetPrice;
          pos.currentPrice = pos.direction === "BUY" ? tick.bid : tick.ask;
          filled.push(pos);
        }
      }
    }
    return filled;
  }

  public modifyPositionTpSl(
    positionId: string,
    takeProfit?: string,
    stopLoss?: string
  ): Position {
    const position = this.positions.get(positionId);
    if (!position || position.status !== "OPEN") {
      throw new Error(`Position ${positionId} not found or closed.`);
    }
    position.takeProfit = takeProfit && Number(takeProfit) > 0 ? takeProfit : undefined;
    position.stopLoss = stopLoss && Number(stopLoss) > 0 ? stopLoss : undefined;
    return position;
  }

  public async closePosition(
    positionId: string,
    closeReason: "MANUAL" | "TAKE_PROFIT" | "STOP_LOSS" | "LIQUIDATION" = "MANUAL"
  ): Promise<Position> {
    const position = this.positions.get(positionId);
    if (!position || position.status !== "OPEN") {
      throw new Error(`Position ${positionId} not found or already closed.`);
    }

    const tick = goldMarketFeed.getCurrentTick();
    const closePrice = position.direction === "BUY" ? tick.bid : tick.ask;
    const finalPnl = calculateFloatingPnl(
      position.direction,
      position.lots,
      position.openPrice,
      closePrice
    );

    const now = new Date().toISOString();
    position.status = "CLOSED";
    position.closePrice = closePrice;
    position.realizedPnl = finalPnl;
    position.closeReason = closeReason;
    position.closedAt = now;

    // Double-entry ledger settlement for PnL and Commission (Stage 3 Integration)
    // 1. PnL Entry:
    // If Profit: Credit Client Equity, Debit Broker Operating/Liquidity
    // If Loss: Debit Client Equity, Credit Broker Operating/Liquidity
    const isProfit = Number(finalPnl) >= 0;
    const absPnl = Math.abs(Number(finalPnl)).toFixed(2);

    const entries = [];

    if (Number(absPnl) > 0) {
      if (isProfit) {
        entries.push(
          {
            account_id: this.clientAccountId,
            direction: "credit" as const,
            amount: absPnl,
            entry_type: "trade_pnl" as const,
            nature: `XAU/USD ${position.direction} ${position.lots} Lot Realized Profit`,
          },
          {
            account_id: this.feeRevenueAccountId,
            direction: "debit" as const,
            amount: absPnl,
            entry_type: "trade_pnl" as const,
            nature: `Market Maker Liquidity Settle PnL`,
          }
        );
      } else {
        entries.push(
          {
            account_id: this.clientAccountId,
            direction: "debit" as const,
            amount: absPnl,
            entry_type: "trade_pnl" as const,
            nature: `XAU/USD ${position.direction} ${position.lots} Lot Realized Loss`,
          },
          {
            account_id: this.feeRevenueAccountId,
            direction: "credit" as const,
            amount: absPnl,
            entry_type: "trade_pnl" as const,
            nature: `Market Maker Liquidity Settle PnL`,
          }
        );
      }
    }

    // 2. Commission Entry: Debit Client Funds, Credit Fee Revenue
    if (Number(position.commission) > 0) {
      entries.push(
        {
          account_id: this.clientAccountId,
          direction: "debit" as const,
          amount: position.commission,
          entry_type: "fee" as const,
          nature: `Gold (XAU/USD) Execution Commission (${position.lots} Lots)`,
        },
        {
          account_id: this.feeRevenueAccountId,
          direction: "credit" as const,
          amount: position.commission,
          entry_type: "fee" as const,
          nature: `Brokerage Commission Inflow`,
        }
      );
    }

    if (entries.length > 0) {
      const tx = await this.ledgerEngine.recordTransaction({
        description: `Close Gold Position ${position.id} (${position.direction} ${position.lots} lots @ ${closePrice})`,
        reference_type: "trade_position",
        reference_id: position.id,
        entries,
      });
      position.ledgerTransactionId = tx.transaction.id;
    }

    this.positions.delete(positionId);
    this.closedPositions.unshift(position);
    return position;
  }

  public updatePositionsPnL(tick: GoldTick): void {
    for (const pos of this.positions.values()) {
      const currentPrice = pos.direction === "BUY" ? tick.bid : tick.ask;
      pos.currentPrice = currentPrice;
      pos.unrealizedPnl = calculateFloatingPnl(
        pos.direction,
        pos.lots,
        pos.openPrice,
        currentPrice
      );
    }
  }

  public getAccountSummary(currentTick?: GoldTick): AccountSummary {
    const tick = currentTick || goldMarketFeed.getCurrentTick();
    this.updatePositionsPnL(tick);

    const balance = this.ledgerEngine.getAccountBalance(this.clientAccountId);
    const pnls = Array.from(this.positions.values()).map((p) => p.unrealizedPnl);
    const totalUnrealized = moneySum(pnls);
    const equity = moneyAdd(balance, totalUnrealized);

    const margins = Array.from(this.positions.values()).map((p) => p.margin);
    const usedMargin = moneySum(margins);
    const freeMargin = moneySubtract(equity, usedMargin);

    let marginLevel = "0.00";
    if (Number(usedMargin) > 0) {
      marginLevel = moneyMultiply(moneyDivide(equity, usedMargin, 4), "100", 2);
    }

    return {
      balance,
      equity,
      usedMargin,
      freeMargin,
      marginLevel,
    };
  }
}
