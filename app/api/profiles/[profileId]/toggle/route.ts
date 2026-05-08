import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { profileManagementService } from "@/lib/server/profile-management-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ profileId: string }> },
) {
  try {
    const { profileId } = await params;
    const profile = await profileManagementService.toggle(profileId);
    return NextResponse.json({ profile });
  } catch (error) {
    console.error("[api/profiles/[profileId]/toggle] Failed to toggle profile.", {
      error: error instanceof Error ? error.message : "unknown-error",
    });

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to toggle profile",
      },
      {
        status: 400,
      },
    );
  }
}
