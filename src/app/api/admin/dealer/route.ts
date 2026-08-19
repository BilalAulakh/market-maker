import { NextRequest, NextResponse } from "next/server";
import { RiskService } from "@/lib/trading/risk-service";

export async function GET(req: NextRequest) {
  try {
    const symbol = req.nextUrl.searchParams.get("symbol") || "XAU/USD";
    const exposure = await RiskService.getDealerExposure(symbol);
    return NextResponse.json({ success: true, data: exposure });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST() {
  try {
    const result = await RiskService.executeStopOutCheck();
    return NextResponse.json({ success: true, data: result });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
