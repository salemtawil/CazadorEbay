import { ProfilesWorkspace } from "@/components/profiles/profiles-workspace";
import { SectionCard } from "@/components/ui/section-card";
import { opportunityService } from "@/lib/server/opportunity-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function ProfilesPage() {
  const [profiles, evaluations] = await Promise.all([opportunityService.listProfiles(), opportunityService.listEvaluations()]);
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

  return (
    <SectionCard
      title="Perfiles"
      subtitle="Centro de trabajo para entender rapidamente que busca cada perfil y editarlo con una capa mas humana."
    >
      <ProfilesWorkspace items={items} />
    </SectionCard>
  );
}
