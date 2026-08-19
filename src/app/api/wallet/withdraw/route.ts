import { NextRequest, NextResponse } from "next/server";
import { WalletService } from "@/lib/vault/wallet-service";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    const body = await req.json();
    const userId = user?.id || body.userId;

    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthenticated" }, { status: 401 });
    }

    const result = await WalletService.createWithdrawalRequest(
      userId,
      body.network,
      body.destinationAddress,
      body.amount
    );

    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
