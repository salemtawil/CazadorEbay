"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  getAlertOpportunityId,
  getAlertSeverityLabel,
  getAlertState,
  getAlertStateLabel,
  getAlertTypeLabel,
} from "@/lib/alerts/presentation";
import type { InternalAlert } from "@/lib/modules/contracts";

async function postAction(path: string) {
  const response = await fetch(path, {
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
}

function getSeverityToneClass(severity: InternalAlert["severity"]): string {
  if (severity === "critical") {
    return "status-pill-danger";
  }

  if (severity === "warning") {
    return "status-pill-warning";
  }

  return "status-pill-muted";
}

function getStateToneClass(alert: InternalAlert): string {
  if (alert.dismissedAt) {
    return "status-pill-muted";
  }

  if (alert.readAt) {
    return "status-pill-info";
  }

  return "status-pill-warning";
}

export function AlertsList({
  alerts,
  emptyMessage = "No hay alertas para esta vista.",
}: {
  alerts: InternalAlert[];
  emptyMessage?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function runAction(path: string) {
    startTransition(async () => {
      await postAction(path);
      router.refresh();
    });
  }

  if (alerts.length === 0) {
    return (
      <div className="empty-state">
        <p className="m-0">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="list">
      {alerts.map((alert) => {
        const alertState = getAlertState(alert);

        return (
          <article key={alert.id} className="alert-card">
            <div className="alert-card-main">
              <div className="split-row">
                <div className="chips">
                  <span className={`status-pill ${getSeverityToneClass(alert.severity)}`}>
                    {getAlertSeverityLabel(alert.severity)}
                  </span>
                  <span className={`status-pill ${getStateToneClass(alert)}`}>{getAlertStateLabel(alertState)}</span>
                  <span className="chip">{getAlertTypeLabel(alert.alertType)}</span>
                </div>
                <p className="muted compact-text">{new Date(alert.createdAt).toLocaleString("es-VE")}</p>
              </div>

              <h3 className="alert-card-title">{alert.title}</h3>
              <p className="compact-text">{alert.message}</p>

              <div className="alert-card-meta">
                <span>Listing: {alert.listingTitle || "Sin titulo"}</span>
                <span>Perfil: {alert.profileName || "Sin perfil"}</span>
              </div>
            </div>

            <div className="actions-grid">
              <Link
                href={{
                  pathname: "/opportunities/[opportunityId]",
                  query: { opportunityId: getAlertOpportunityId(alert) },
                }}
                className="button-link button-link-secondary"
              >
                Ver oportunidad
              </Link>
              <button
                type="button"
                disabled={isPending || Boolean(alert.readAt)}
                onClick={() => runAction(`/api/alerts/${alert.id}/read`)}
              >
                {alert.readAt ? "Leida" : "Marcar leida"}
              </button>
              <button
                type="button"
                disabled={isPending || Boolean(alert.dismissedAt)}
                onClick={() => runAction(`/api/alerts/${alert.id}/dismiss`)}
              >
                {alert.dismissedAt ? "Descartada" : "Descartar"}
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
