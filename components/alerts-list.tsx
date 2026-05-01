"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { InternalAlert } from "@/lib/modules/contracts";

async function postAction(path: string) {
  const response = await fetch(path, {
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
}

export function AlertsList({ alerts }: { alerts: InternalAlert[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function runAction(path: string) {
    startTransition(async () => {
      await postAction(path);
      router.refresh();
    });
  }

  if (alerts.length === 0) {
    return <p className="muted m-0">No hay alertas internas activas.</p>;
  }

  return (
    <div className="list">
      {alerts.map((alert) => (
        <article key={alert.id} className="row row-start">
          <div className="grow">
            <p className="muted m-0">
              {alert.alertType} · {alert.severity} · {alert.readAt ? "leida" : "no leida"}
            </p>
            <h3 style={{ margin: "8px 0 6px" }}>{alert.title}</h3>
            <p style={{ margin: "0 0 8px" }}>{alert.message}</p>
            <p className="muted m-0">
              Listing: {alert.listingTitle} · Perfil: {alert.profileName} · {new Date(alert.createdAt).toLocaleString("es-VE")}
            </p>
          </div>
          <div className="actions-grid">
            <button
              type="button"
              disabled={isPending || Boolean(alert.readAt)}
              onClick={() => runAction(`/api/alerts/${alert.id}/read`)}
            >
              Marcar leida
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => runAction(`/api/alerts/${alert.id}/dismiss`)}
            >
              Dismiss
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
