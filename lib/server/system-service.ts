import { prisma } from "@/lib/db/prisma";
import {
  buildSystemStatusMessages,
  type SystemStatusMessage,
  type SystemStatusSnapshot,
} from "@/lib/modules/system-status";
import {
  isCronSecretConfigured,
  isDatabaseConfigured,
  isEbayEnabled,
  shouldUseFixtureData,
} from "@/lib/server/runtime-config";

export interface SystemStatusReport extends SystemStatusSnapshot {
  hasData: boolean;
  messages: SystemStatusMessage[];
}

function buildBaseSnapshot(): SystemStatusSnapshot {
  return {
    databaseConfigured: isDatabaseConfigured(),
    listingRawCount: 0,
    listingNormalizedCount: 0,
    listingEvaluationCount: 0,
    alertCount: 0,
    activeProfileCount: 0,
    useFixtureData: shouldUseFixtureData(),
    ebayEnabled: isEbayEnabled(),
    cronSecretConfigured: isCronSecretConfigured(),
  };
}

export class SystemService {
  async getStatus(): Promise<SystemStatusReport> {
    const snapshot = buildBaseSnapshot();

    if (!snapshot.databaseConfigured) {
      return {
        ...snapshot,
        hasData: false,
        messages: buildSystemStatusMessages(snapshot),
      };
    }

    const [listingRawCount, listingNormalizedCount, listingEvaluationCount, alertCount, activeProfileCount, latestEvaluation, latestAlert] =
      await Promise.all([
        prisma.listingRaw.count(),
        prisma.listingNormalized.count(),
        prisma.listingEvaluation.count(),
        prisma.alert.count(),
        prisma.searchProfile.count({
          where: {
            status: "ACTIVE",
          },
        }),
        prisma.listingEvaluation.findFirst({
          orderBy: {
            updatedAt: "desc",
          },
          select: {
            updatedAt: true,
          },
        }),
        prisma.alert.findFirst({
          orderBy: {
            createdAt: "desc",
          },
          select: {
            createdAt: true,
          },
        }),
      ]);

    const nextSnapshot: SystemStatusSnapshot = {
      ...snapshot,
      listingRawCount,
      listingNormalizedCount,
      listingEvaluationCount,
      alertCount,
      activeProfileCount,
      latestEvaluationAt: latestEvaluation?.updatedAt.toISOString(),
      latestAlertAt: latestAlert?.createdAt.toISOString(),
    };

    return {
      ...nextSnapshot,
      hasData: listingRawCount > 0 || listingNormalizedCount > 0 || listingEvaluationCount > 0 || alertCount > 0,
      messages: buildSystemStatusMessages(nextSnapshot),
    };
  }
}

export const systemService = new SystemService();
