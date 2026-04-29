import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isAuthorizedRequest } from "@/lib/server/endpoint-auth";
import { runPersistedIngestion } from "@/lib/server/ingestion-runner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!isAuthorizedRequest(request)) {
    return NextResponse.json(
      {
        error: "Unauthorized",
      },
      {
        status: 401,
      },
    );
  }

  try {
    const summary = await runPersistedIngestion();
    return NextResponse.json(summary);
  } catch (error) {
    console.error("[api/cron/ingest] Ingestion failed.", {
      error: error instanceof Error ? error.message : "unknown-error",
    });

    return NextResponse.json(
      {
        error: "Ingestion failed",
      },
      {
        status: 500,
      },
    );
  }
}
