"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ProfileCard } from "@/components/profiles/profile-card";
import { ProfileEditor } from "@/components/profiles/profile-editor";
import { createProfileDraft, type ProfileDraft } from "@/lib/profiles/presentation";
import type { SearchProfile } from "@/lib/modules/contracts";

interface ProfileListItem {
  profile: SearchProfile;
  evaluations: number;
  visible: number;
}

function buildDraftFromProfile(profile: SearchProfile): ProfileDraft {
  return createProfileDraft(profile);
}

export function ProfilesWorkspace({
  items,
}: {
  items: ProfileListItem[];
}) {
  const router = useRouter();
  const [editingProfile, setEditingProfile] = useState<ProfileDraft | null>(null);

  function refreshView() {
    setEditingProfile(null);
    router.refresh();
  }

  return (
    <div className="profiles-workspace">
      <div className="profiles-toolbar">
        <div>
          <p className="eyebrow">Perfiles utiles</p>
          <h3 className="panel-title">Entiende, crea y ajusta perfiles sin caer en un panel tecnico</h3>
          <p className="muted compact-text">
            La vista simple queda por defecto. El modo avanzado sigue disponible para revisar thresholds y campos crudos.
          </p>
        </div>
        <div className="cta-row">
          <button type="button" onClick={() => setEditingProfile(createProfileDraft())}>
            Crear perfil
          </button>
        </div>
      </div>

      {editingProfile ? (
        <ProfileEditor
          profile={editingProfile}
          onCancel={() => setEditingProfile(null)}
          onSaved={refreshView}
        />
      ) : null}

      {items.length > 0 ? (
        <div className="profiles-list">
          {items.map((item) => (
            <ProfileCard key={item.profile.id} item={item} onEdit={(profile) => setEditingProfile(buildDraftFromProfile(profile))} onChanged={refreshView} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <p className="m-0">No hay perfiles cargados todavia. Crea uno nuevo con un preset o desde cero.</p>
        </div>
      )}
    </div>
  );
}
