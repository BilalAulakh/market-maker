import { NextRequest, NextResponse } from "next/server";
import { OrderService } from "@/lib/trading/order-service";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getServiceRoleClient } from "@/lib/supabase/service-role";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    const serviceClient = getServiceRoleClient();
    const userId = user?.id || req.nextUrl.searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthenticated" }, { status: 401 });
    }

    // Get Trading Account
    const { data: accounts } = await serviceClient
      .from("trading_accounts")
      .select("*")
      .eq("user_id", userId);

    const account = accounts && accounts.length > 0 ? accounts[0] : null;

    // Get Orders
    const { data: orders } = await serviceClient
      .from("orders")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    // Get Positions
    const { data: positions } = await serviceClient
      .from("positions")
      .select("*")
      .eq("user_id", userId)
      .order("opened_at", { ascending: false })
      .limit(50);

    return NextResponse.json({
      success: true,
      data: {
        account,
        orders: orders || [],
        positions: positions || [],
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await OrderService.executeOrder(body, body.userId);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        code: "SERVER_ERROR",
        whatHappened: "Trade execution encountered an internal error.",
        why: err.message || "Unknown error",
        howToResolve: "Please try placing your order again.",
        whereToGo: { label: "Trading Terminal", url: "/trade" },
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await OrderService.cancelOrder(body.orderId, body.userId);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
