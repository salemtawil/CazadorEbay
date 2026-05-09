"use client";

import { useEffect, useState } from "react";
import { OpportunityCard } from "@/components/opportunity-card";
import type { EvaluationResult } from "@/lib/modules/contracts";
import { readSavedOpportunityIds, SAVED_OPPORTUNITIES_EVENT } from "@/lib/saved-opportunities";

export function SavedOpportunitiesView({
  opportunities,
}: {
  opportunities: EvaluationResult[];
}) {
  const [savedIds, setSavedIds] = useState<string[]>([]);

  useEffect(() => {
    function syncSaved() {
      setSavedIds(readSavedOpportunityIds());
    }

    syncSaved();
    window.addEventListener(SAVED_OPPORTUNITIES_EVENT, syncSaved);
    window.addEventListener("storage", syncSaved);

    return () => {
      window.removeEventListener(SAVED_OPPORTUNITIES_EVENT, syncSaved);
      window.removeEventListener("storage", syncSaved);
    };
  }, []);

  const savedOpportunities = opportunities.filter((opportunity) => savedIds.includes(opportunity.id));

  if (savedOpportunities.length === 0) {
    return (
      <div className="empty-state empty-state-large">
        <p className="m-0">Todavia no guardaste ofertas. Cuando una te interese, pulsa Guardar y aparecera aqui.</p>
      </div>
    );
  }

  return (
    <div className="list">
      {savedOpportunities.map((opportunity) => (
        <OpportunityCard key={opportunity.id} opportunity={opportunity} />
      ))}
    </div>
  );
}
