import { NextResponse } from "next/server";
import { alertService } from "@/lib/server/alert-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const alerts = await alertService.listAlerts();
    return NextResponse.json({ alerts });
  } catch (error) {
    console.error("[api/alerts] Failed to list alerts.", {
      error: error instanceof Error ? error.message : "unknown-error",
    });

    return NextResponse.json(
      {
        error: "Failed to list alerts",
      },
      {
        status: 500,
      },
    );
  }
}
