import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { profileManagementService } from "@/lib/server/profile-management-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ profileId: string }> },
) {
  try {
    const { profileId } = await params;
    const payload = await request.json();
    const profile = await profileManagementService.update(profileId, payload);
    return NextResponse.json({ profile });
  } catch (error) {
    console.error("[api/profiles/[profileId]] Failed to update profile.", {
      error: error instanceof Error ? error.message : "unknown-error",
    });

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to update profile",
      },
      {
        status: 400,
      },
    );
  }
}
