import { ProfilesWorkspace } from "@/components/profiles/profiles-workspace";
import { SectionCard } from "@/components/ui/section-card";
import { createProfileDraft, normalizeProfileTerms } from "@/lib/profiles/presentation";
import { opportunityService } from "@/lib/server/opportunity-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function readSingleValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function ProfilesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [profiles, evaluations, rawSearchParams] = await Promise.all([
    opportunityService.listProfiles(),
    opportunityService.listEvaluations(),
    searchParams,
  ]);
  const totalsByProfile = new Map<string, { evaluations: number; visible: number }>();

  for (const evaluation of evaluations) {
    const previous = totalsByProfile.get(evaluation.profile.id) ?? { evaluations: 0, visible: 0 };
    previous.evaluations += 1;
    if (evaluation.visibility.isVisible) {
      previous.visible += 1;
    }
    totalsByProfile.set(evaluation.profile.id, previous);
  }

  const items = profiles.map((profile) => ({
    profile,
    evaluations: totalsByProfile.get(profile.id)?.evaluations ?? 0,
    visible: totalsByProfile.get(profile.id)?.visible ?? 0,
  }));
  const query = readSingleValue(rawSearchParams.q).trim();
  const exclude = readSingleValue(rawSearchParams.exclude).trim();
  const budget = readSingleValue(rawSearchParams.budget).trim();
  const risk = readSingleValue(rawSearchParams.risk).trim();
  const initialDraft =
    query || exclude || budget || risk
      ? createProfileDraft({
          name: query ? `Busqueda: ${query}` : "",
          keywords: normalizeProfileTerms(query),
          blockedTerms: normalizeProfileTerms(exclude),
          maxBudget: budget ? Number(budget) : undefined,
          riskTolerance: risk === "low" || risk === "medium" || risk === "high" ? risk : "medium",
        })
      : null;

  return (
    <SectionCard
      title="Mis busquedas"
      subtitle="Gestiona que estas cazando, como lo estas buscando y con que nivel de exigencia."
    >
      <ProfilesWorkspace items={items} initialDraft={initialDraft} />
    </SectionCard>
  );
}
