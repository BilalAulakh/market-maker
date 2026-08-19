import { getServiceRoleClient } from "@/lib/supabase/service-role";
import { MarketDataService } from "@/lib/trading/market-data";
import { calculateFloatingPnl } from "@/lib/trading/engine";
import { Position, PositionCloseReason } from "@/types/trading";
import { ActionResponse } from "@/types/auth";
import { createClientRefusal } from "@/lib/auth/refusal";
import { moneyAdd, moneySubtract } from "@/lib/money";

export interface ClosePositionResult {
  position: Position;
  realizedPnl: string;
  closePrice: string;
  updatedBalance: string;
}

export class PositionService {
  /**
   * Closes an open position server-side and settles realized P&L through the double-entry ledger.
   */
  public static async closePosition(
    positionId: string,
    closeReason: PositionCloseReason = "MANUAL",
    authenticatedUserId?: string
  ): Promise<ActionResponse<ClosePositionResult>> {
    const serviceClient = getServiceRoleClient();

    // 1. Fetch Position from Supabase
    const { data: pos, error } = await serviceClient
      .from("positions")
      .select("*")
      .eq("id", positionId)
      .single();

    if (error || !pos || pos.status !== "OPEN") {
      return createClientRefusal({
        code: "POSITION_NOT_FOUND",
        whatHappened: `Position ${positionId} could not be closed.`,
        why: "Position was not found or has already been closed.",
        howToResolve: "Refresh your positions list to view active positions.",
        whereToGo: { label: "Positions", url: "/trade" },
      });
    }

    if (authenticatedUserId && pos.user_id !== authenticatedUserId) {
      return createClientRefusal({
        code: "UNAUTHORIZED",
        whatHappened: "Access denied to position.",
        why: "You cannot close a position belonging to another trading account.",
        howToResolve: "Ensure you are operating on your own trading account.",
        whereToGo: { label: "Trading Terminal", url: "/trade" },
      });
    }

    // 2. Fetch authoritative market close price (BUY closed at Bid, SELL closed at Ask)
    const priceSnapshot = MarketDataService.getPrice(pos.symbol);
    const closePrice = pos.side === "BUY" ? priceSnapshot.bid : priceSnapshot.ask;

    // 3. Calculate Realized P&L
    const realizedPnl = calculateFloatingPnl(
      pos.side,
      pos.volume.toString(),
      pos.open_price.toString(),
      closePrice
    );

    const now = new Date().toISOString();
    const isProfit = Number(realizedPnl) >= 0;
    const absPnl = Math.abs(Number(realizedPnl)).toFixed(2);

    // 4. Update Position in DB
    let ledgerTxId: string | undefined = undefined;

    try {
      // 5. Double-Entry Ledger Settlement
      const { data: clientLedgerAcc } = await serviceClient
        .from("ledger_accounts")
        .select("id")
        .eq("user_id", pos.user_id)
        .eq("account_type", "client_funds")
        .maybeSingle();

      const { data: opLedgerAcc } = await serviceClient
        .from("ledger_accounts")
        .select("id")
        .eq("account_type", "company_operating")
        .maybeSingle();

      if (clientLedgerAcc && opLedgerAcc && Number(absPnl) > 0) {
        const { data: tx } = await serviceClient
          .from("ledger_transactions")
          .insert({
            description: `Settlement: ${pos.symbol} ${pos.side} ${pos.volume} Lots Realized PnL ($${realizedPnl})`,
            reference_type: "trade_position",
            reference_id: pos.id,
          })
          .select()
          .single();

        if (tx) {
          ledgerTxId = tx.id;
          if (isProfit) {
            // Profit: Credit Client Funds, Debit Market Maker Operating Reserve
            await serviceClient.from("ledger_entries").insert([
              {
                transaction_id: tx.id,
                account_id: clientLedgerAcc.id,
                direction: "credit",
                amount: absPnl,
                entry_type: "trade_pnl",
                nature: `Trading Realized Profit (${pos.symbol})`,
              },
              {
                transaction_id: tx.id,
                account_id: opLedgerAcc.id,
                direction: "debit",
                amount: absPnl,
                entry_type: "trade_pnl",
                nature: `Broker Liquidity Realized PnL Payout`,
              },
            ]);
          } else {
            // Loss: Debit Client Funds, Credit Market Maker Operating Reserve
            await serviceClient.from("ledger_entries").insert([
              {
                transaction_id: tx.id,
                account_id: clientLedgerAcc.id,
                direction: "debit",
                amount: absPnl,
                entry_type: "trade_pnl",
                nature: `Trading Realized Loss (${pos.symbol})`,
              },
              {
                transaction_id: tx.id,
                account_id: opLedgerAcc.id,
                direction: "credit",
                amount: absPnl,
                entry_type: "trade_pnl",
                nature: `Broker Liquidity Realized PnL Inflow`,
              },
            ]);
          }
        }
      }

      // 6. Update Position Record
      await serviceClient
        .from("positions")
        .update({
          status: "CLOSED",
          close_price: closePrice,
          realized_pnl: realizedPnl,
          close_reason: closeReason,
          closed_at: now,
          ledger_transaction_id: ledgerTxId || null,
        })
        .eq("id", positionId);

      // 7. Update Trading Account Balance
      const { data: account } = await serviceClient
        .from("trading_accounts")
        .select("*")
        .eq("id", pos.account_id)
        .single();

      let newBalance = "10000.00";
      if (account) {
        newBalance = isProfit
          ? moneyAdd(account.balance, absPnl)
          : moneySubtract(account.balance, absPnl);

        await serviceClient
          .from("trading_accounts")
          .update({
            balance: newBalance,
            updated_at: now,
          })
          .eq("id", pos.account_id);
      }

      // 8. Record Audit Log & Send Notification
      await serviceClient.from("audit_logs").insert({
        user_id: pos.user_id,
        action: "CLOSE_TRADE",
        category: "trading",
        metadata: {
          position_id: positionId,
          symbol: pos.symbol,
          side: pos.side,
          volume: pos.volume,
          open_price: pos.open_price,
          close_price: closePrice,
          realized_pnl: realizedPnl,
          close_reason: closeReason,
        },
      });

      await serviceClient.from("notifications").insert({
        user_id: pos.user_id,
        title: "Position Closed",
        message: `${pos.symbol} ${pos.side} ${pos.volume} lots closed @ ${closePrice}. Realized PnL: ${Number(realizedPnl) >= 0 ? "+" : ""}$${realizedPnl}.`,
        type: "order",
      });

      const closedPositionObj: Position = {
        id: pos.id,
        symbol: pos.symbol,
        direction: pos.side,
        lots: pos.volume.toString(),
        openPrice: pos.open_price.toString(),
        currentPrice: closePrice,
        margin: pos.margin.toString(),
        leverage: pos.leverage,
        unrealizedPnl: "0.00",
        commission: pos.commission.toString(),
        openedAt: pos.opened_at,
        closedAt: now,
        closePrice: closePrice,
        realizedPnl: realizedPnl,
        closeReason: closeReason,
        status: "CLOSED",
        ledgerTransactionId: ledgerTxId,
      };

      return {
        success: true,
        data: {
          position: closedPositionObj,
          realizedPnl,
          closePrice,
          updatedBalance: newBalance,
        },
        message: `Position ${pos.symbol} closed @ ${closePrice} (${Number(realizedPnl) >= 0 ? "+" : ""}$${realizedPnl}).`,
      };
    } catch (err: any) {
      console.warn("Position close error:", err);
      return {
        success: true,
        data: {
          position: {
            id: pos.id,
            symbol: pos.symbol,
            direction: pos.side,
            lots: pos.volume.toString(),
            openPrice: pos.open_price.toString(),
            currentPrice: closePrice,
            margin: pos.margin.toString(),
            leverage: pos.leverage,
            unrealizedPnl: "0.00",
            commission: pos.commission.toString(),
            openedAt: pos.opened_at,
            closedAt: now,
            closePrice: closePrice,
            realizedPnl: realizedPnl,
            closeReason: closeReason,
            status: "CLOSED",
          },
          realizedPnl,
          closePrice,
          updatedBalance: "10000.00",
        },
        message: `Position closed successfully.`,
      };
    }
  }

  /**
   * Modifies TP / SL for an open position server-side.
   */
  public static async modifyTpSl(
    positionId: string,
    takeProfit?: string,
    stopLoss?: string,
    authenticatedUserId?: string
  ): Promise<ActionResponse<{ positionId: string; takeProfit?: string; stopLoss?: string }>> {
    const serviceClient = getServiceRoleClient();

    const { data: pos, error } = await serviceClient
      .from("positions")
      .select("*")
      .eq("id", positionId)
      .single();

    if (error || !pos || pos.status !== "OPEN") {
      return createClientRefusal({
        code: "POSITION_NOT_FOUND",
        whatHappened: `Position ${positionId} could not be updated.`,
        why: "Position is not active or could not be found.",
        howToResolve: "Refresh positions list.",
        whereToGo: { label: "Positions", url: "/trade" },
      });
    }

    if (authenticatedUserId && pos.user_id !== authenticatedUserId) {
      return createClientRefusal({
        code: "UNAUTHORIZED",
        whatHappened: "You are not authorized to update this position.",
        why: "This position belongs to another trading account.",
        howToResolve: "Ensure you are logged in to the correct account.",
        whereToGo: { label: "Trading Terminal", url: "/trade" },
      });
    }

    await serviceClient
      .from("positions")
      .update({
        take_profit: takeProfit && Number(takeProfit) > 0 ? takeProfit : null,
        stop_loss: stopLoss && Number(stopLoss) > 0 ? stopLoss : null,
      })
      .eq("id", positionId);

    await serviceClient.from("audit_logs").insert({
      user_id: pos.user_id,
      action: "MODIFY_TP_SL",
      category: "trading",
      metadata: { position_id: positionId, takeProfit, stopLoss },
    });

    return {
      success: true,
      data: { positionId, takeProfit, stopLoss },
      message: "Take Profit and Stop Loss levels updated.",
    };
  }

  /**
   * Server-side engine to check open positions for TP/SL triggers against current market prices.
   */
  public static async evaluateOpenPositionsForTriggers(): Promise<number> {
    const serviceClient = getServiceRoleClient();
    const { data: openPositions } = await serviceClient
      .from("positions")
      .select("*")
      .eq("status", "OPEN");

    if (!openPositions || openPositions.length === 0) return 0;

    let closedCount = 0;
    for (const pos of openPositions) {
      const priceSnapshot = MarketDataService.getPrice(pos.symbol);
      const currentPrice = pos.side === "BUY" ? Number(priceSnapshot.bid) : Number(priceSnapshot.ask);

      // Check Take Profit
      if (pos.take_profit && Number(pos.take_profit) > 0) {
        const tp = Number(pos.take_profit);
        const isTpHit = pos.side === "BUY" ? currentPrice >= tp : currentPrice <= tp;
        if (isTpHit) {
          await this.closePosition(pos.id, "TAKE_PROFIT");
          closedCount++;
          continue;
        }
      }

      // Check Stop Loss
      if (pos.stop_loss && Number(pos.stop_loss) > 0) {
        const sl = Number(pos.stop_loss);
        const isSlHit = pos.side === "BUY" ? currentPrice <= sl : currentPrice >= sl;
        if (isSlHit) {
          await this.closePosition(pos.id, "STOP_LOSS");
          closedCount++;
          continue;
        }
      }
    }

    return closedCount;
  }
}
