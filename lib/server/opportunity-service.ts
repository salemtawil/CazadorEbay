import type { DashboardMetrics, EvaluationResult, SearchProfile } from "@/lib/modules/contracts";
import { evaluateCatalog, getDashboardMetrics, getVisibleEvaluations } from "@/lib/modules/evaluation";
import {
  FixtureOpportunityRepository,
  type OpportunityRepository,
} from "@/lib/server/fixture-repository";
import { PrismaOpportunityRepository } from "@/lib/server/prisma-repository";
import { shouldUseFixtureData, warnMissingDatabaseUrl } from "@/lib/server/runtime-config";

function createRepository(): OpportunityRepository {
  if (shouldUseFixtureData()) {
    return new FixtureOpportunityRepository();
  }

  warnMissingDatabaseUrl("opportunity-service");
  return new PrismaOpportunityRepository();
}

export class OpportunityService {
  constructor(private readonly repository: OpportunityRepository = createRepository()) {}

  async listEvaluations(): Promise<EvaluationResult[]> {
    const persistedEvaluations = await this.repository.loadPersistedEvaluations();
    if (persistedEvaluations) {
      return persistedEvaluations;
    }

    const catalog = await this.repository.loadCatalog();
    return evaluateCatalog(catalog);
  }

  async listProfiles(): Promise<SearchProfile[]> {
    const catalog = await this.repository.loadCatalog();
    return catalog.profiles;
  }

  async listOpportunities(): Promise<EvaluationResult[]> {
    const evaluations = await this.listEvaluations();
    return getVisibleEvaluations(evaluations);
  }

  async getMetrics(): Promise<DashboardMetrics> {
    const evaluations = await this.listEvaluations();
    return getDashboardMetrics(evaluations);
  }

  async getOpportunity(opportunityId: string): Promise<EvaluationResult | undefined> {
    const evaluations = await this.listEvaluations();
    return evaluations.find((opportunity) => opportunity.id === opportunityId);
  }
}

export const opportunityService = new OpportunityService();
