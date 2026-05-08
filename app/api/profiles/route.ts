import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { profileManagementService } from "@/lib/server/profile-management-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const profile = await profileManagementService.create(payload);
    return NextResponse.json({ profile });
  } catch (error) {
    console.error("[api/profiles] Failed to create profile.", {
      error: error instanceof Error ? error.message : "unknown-error",
    });

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to create profile",
      },
      {
        status: 400,
      },
    );
  }
}
