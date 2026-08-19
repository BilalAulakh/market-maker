import { NextRequest, NextResponse } from "next/server";
import { WalletService } from "@/lib/vault/wallet-service";
import { getServiceRoleClient } from "@/lib/supabase/service-role";

export async function GET() {
  try {
    const serviceClient = getServiceRoleClient();

    const [depositsRes, withdrawalsRes] = await Promise.all([
      serviceClient.from("deposits").select("*").order("created_at", { ascending: false }).limit(50),
      serviceClient.from("withdrawals").select("*").order("created_at", { ascending: false }).limit(50),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        deposits: depositsRes.data || [],
        withdrawals: withdrawalsRes.data || [],
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await WalletService.processCashierReview(body, body.reviewedBy);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
