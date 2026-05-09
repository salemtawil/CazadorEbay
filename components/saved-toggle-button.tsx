"use client";

import { useEffect, useState } from "react";
import {
  isOpportunitySaved,
  SAVED_OPPORTUNITIES_EVENT,
  toggleSavedOpportunity,
} from "@/lib/saved-opportunities";

export function SavedToggleButton({
  opportunityId,
  className = "",
}: {
  opportunityId: string;
  className?: string;
}) {
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    setIsSaved(isOpportunitySaved(opportunityId));

    function handleSavedChange() {
      setIsSaved(isOpportunitySaved(opportunityId));
    }

    window.addEventListener(SAVED_OPPORTUNITIES_EVENT, handleSavedChange);
    window.addEventListener("storage", handleSavedChange);

    return () => {
      window.removeEventListener(SAVED_OPPORTUNITIES_EVENT, handleSavedChange);
      window.removeEventListener("storage", handleSavedChange);
    };
  }, [opportunityId]);

  return (
    <button
      type="button"
      className={className}
      onClick={() => setIsSaved(toggleSavedOpportunity(opportunityId))}
      aria-pressed={isSaved}
    >
      {isSaved ? "Guardada" : "Guardar"}
    </button>
  );
}
