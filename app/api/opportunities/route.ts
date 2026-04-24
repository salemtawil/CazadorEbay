import { NextResponse } from "next/server";
import { opportunityService } from "@/lib/server/opportunity-service";

export async function GET() {
  const evaluations = await opportunityService.listEvaluations();
  const opportunities = await opportunityService.listOpportunities();
  return NextResponse.json({
    opportunities,
    evaluations,
    totalEvaluations: evaluations.length,
    visibleOpportunities: opportunities.length,
  });
}
