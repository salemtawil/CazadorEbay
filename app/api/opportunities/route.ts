import { NextResponse } from "next/server";
import { opportunityService } from "@/lib/server/opportunity-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const evaluations = await opportunityService.listEvaluations();
    const opportunities = await opportunityService.listOpportunities();

    return NextResponse.json({
      opportunities,
      evaluations,
      totalEvaluations: evaluations.length,
      visibleOpportunities: opportunities.length,
    });
  } catch (error) {
    console.error("[api/opportunities] Failed to load opportunities.", {
      error: error instanceof Error ? error.message : "unknown-error",
    });

    return NextResponse.json(
      {
        error: "Failed to load opportunities",
      },
      {
        status: 500,
      },
    );
  }
}
