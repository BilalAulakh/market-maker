import { NextRequest, NextResponse } from "next/server";
import { PositionService } from "@/lib/trading/position-service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await PositionService.closePosition(
      body.positionId,
      body.closeReason || "MANUAL",
      body.userId
    );
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        code: "SERVER_ERROR",
        whatHappened: "Failed to close position.",
        why: err.message || "Unknown error",
        howToResolve: "Please try closing the position again.",
        whereToGo: { label: "Positions", url: "/trade" },
      },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await PositionService.modifyTpSl(
      body.positionId,
      body.takeProfit,
      body.stopLoss,
      body.userId
    );
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
