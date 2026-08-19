import { createClient } from "@/lib/supabase/browser";
import { Position, OrderRecord } from "@/types/trading";

export interface RealtimeTradeCallbacks {
  onOrderChange?: (order: OrderRecord) => void;
  onPositionChange?: (position: Position) => void;
  onNotification?: (notification: any) => void;
}

export function subscribeToUserTradingEvents(
  userId: string,
  callbacks: RealtimeTradeCallbacks
) {
  if (typeof window === "undefined" || !userId) return () => {};

  const supabase = createClient();

  // 1. Subscribe to user orders
  const ordersChannel = supabase
    .channel(`user-orders-${userId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "orders",
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        if (callbacks.onOrderChange && payload.new) {
          callbacks.onOrderChange(payload.new as OrderRecord);
        }
      }
    )
    .subscribe();

  // 2. Subscribe to user positions
  const positionsChannel = supabase
    .channel(`user-positions-${userId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "positions",
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        if (callbacks.onPositionChange && payload.new) {
          callbacks.onPositionChange(payload.new as Position);
        }
      }
    )
    .subscribe();

  // 3. Subscribe to notifications
  const notifChannel = supabase
    .channel(`user-notifs-${userId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        if (callbacks.onNotification && payload.new) {
          callbacks.onNotification(payload.new);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(ordersChannel);
    supabase.removeChannel(positionsChannel);
    supabase.removeChannel(notifChannel);
  };
}
