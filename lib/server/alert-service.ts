import { prisma } from "@/lib/db/prisma";
import type { InternalAlert } from "@/lib/modules/contracts";

function mapSeverity(value: "INFO" | "WARNING" | "CRITICAL"): InternalAlert["severity"] {
  if (value === "CRITICAL") {
    return "critical";
  }

  if (value === "WARNING") {
    return "warning";
  }

  return "info";
}

function mapAlertRowToDomain(
  row: Awaited<ReturnType<typeof prisma.alert.findMany>>[number] & {
    listingRaw: { title: string };
    searchProfile: { name: string };
  },
): InternalAlert {
  const metadata = row.metadataJson && typeof row.metadataJson === "object" ? (row.metadataJson as Record<string, unknown>) : {};

  return {
    id: row.id,
    listingRawId: row.listingRawId,
    searchProfileId: row.searchProfileId,
    listingEvaluationId: row.listingEvaluationId ?? undefined,
    alertType: row.alertType,
    severity: mapSeverity(row.severity),
    title: row.title,
    message: row.message,
    metadata,
    createdAt: row.createdAt.toISOString(),
    readAt: row.readAt?.toISOString(),
    dismissedAt: row.dismissedAt?.toISOString(),
    listingTitle: row.listingRaw.title,
    profileName: row.searchProfile.name,
  };
}

export class AlertService {
  async listAlerts(options: { includeDismissed?: boolean; take?: number } = {}): Promise<InternalAlert[]> {
    const { includeDismissed = false, take = 100 } = options;
    const rows = await prisma.alert.findMany({
      include: {
        listingRaw: {
          select: {
            title: true,
          },
        },
        searchProfile: {
          select: {
            name: true,
          },
        },
      },
      where: includeDismissed ? undefined : { dismissedAt: null },
      orderBy: {
        createdAt: "desc",
      },
      take,
    });

    return rows.map(mapAlertRowToDomain);
  }

  async listRelatedAlerts(listingRawId: string, searchProfileId: string): Promise<InternalAlert[]> {
    const rows = await prisma.alert.findMany({
      include: {
        listingRaw: {
          select: {
            title: true,
          },
        },
        searchProfile: {
          select: {
            name: true,
          },
        },
      },
      where: {
        listingRawId,
        searchProfileId,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 20,
    });

    return rows.map(mapAlertRowToDomain);
  }

  async markRead(alertId: string): Promise<boolean> {
    const result = await prisma.alert.updateMany({
      where: {
        id: alertId,
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });

    return result.count > 0;
  }

  async dismiss(alertId: string): Promise<boolean> {
    const result = await prisma.alert.updateMany({
      where: {
        id: alertId,
        dismissedAt: null,
      },
      data: {
        dismissedAt: new Date(),
      },
    });

    return result.count > 0;
  }
}

export const alertService = new AlertService();
