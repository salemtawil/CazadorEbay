import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { alertService } from "@/lib/server/alert-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ alertId: string }> },
) {
  try {
    const { alertId } = await params;
    const updated = await alertService.dismiss(alertId);

    return NextResponse.json({ updated });
  } catch (error) {
    console.error("[api/alerts/dismiss] Failed to dismiss alert.", {
      error: error instanceof Error ? error.message : "unknown-error",
    });

    return NextResponse.json(
      {
        error: "Failed to dismiss alert",
      },
      {
        status: 500,
      },
    );
  }
}
