import type { DashboardMetrics, EvaluationResult, SearchProfile } from "@/lib/modules/contracts";
import { evaluateCatalog, getDashboardMetrics, getVisibleEvaluations } from "@/lib/modules/evaluation";
import {
  FixtureOpportunityRepository,
  type OpportunityRepository,
} from "@/lib/server/fixture-repository";
import { PrismaOpportunityRepository } from "@/lib/server/prisma-repository";

function shouldUseFixtures(): boolean {
  return process.env.USE_FIXTURE_DATA === "true";
}

function createRepository(): OpportunityRepository {
  return shouldUseFixtures() ? new FixtureOpportunityRepository() : new PrismaOpportunityRepository();
}

export class OpportunityService {
  constructor(private readonly repository: OpportunityRepository = createRepository()) {}

  async listEvaluations(): Promise<EvaluationResult[]> {
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
