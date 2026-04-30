export interface SystemStatusSnapshot {
  databaseConfigured: boolean;
  listingRawCount: number;
  listingNormalizedCount: number;
  listingEvaluationCount: number;
  alertCount: number;
  activeProfileCount: number;
  useFixtureData: boolean;
  ebayEnabled: boolean;
  cronSecretConfigured: boolean;
  latestEvaluationAt?: string;
  latestAlertAt?: string;
}

export interface SystemStatusMessage {
  level: "info" | "warning";
  title: string;
  body: string;
}

export function buildSystemStatusMessages(snapshot: SystemStatusSnapshot): SystemStatusMessage[] {
  const messages: SystemStatusMessage[] = [];
  const hasNoPersistedData =
    snapshot.listingRawCount === 0 &&
    snapshot.listingNormalizedCount === 0 &&
    snapshot.listingEvaluationCount === 0 &&
    snapshot.alertCount === 0;

  if (!snapshot.databaseConfigured) {
    messages.push({
      level: "warning",
      title: "Base de datos no configurada",
      body: "No se pueden consultar conteos reales porque DATABASE_URL no esta disponible en este runtime.",
    });
    return messages;
  }

  if (snapshot.useFixtureData) {
    messages.push({
      level: "info",
      title: "Fixtures activos en la app",
      body: "USE_FIXTURE_DATA=true: las vistas operativas pueden leer fixtures mientras esta pagina muestra conteos reales de la DB.",
    });
  }

  if (snapshot.activeProfileCount === 0) {
    messages.push({
      level: "warning",
      title: "No hay perfiles activos",
      body: "La ingesta no va a producir evaluaciones nuevas hasta que al menos un SearchProfile este en estado activo.",
    });
  }

  if (hasNoPersistedData) {
    messages.push({
      level: "info",
      title: "Sin datos persistidos",
      body: "Todavia no hay ListingRaw, ListingNormalized, ListingEvaluation ni Alert en la base de datos.",
    });
  }

  if (snapshot.activeProfileCount > 0 && snapshot.listingEvaluationCount === 0) {
    messages.push({
      level: "warning",
      title: "Perfiles activos sin evaluaciones",
      body: "Hay perfiles activos pero 0 evaluaciones persistidas. Revisa la ingesta, el cron o filtros demasiado restrictivos.",
    });
  } else if (snapshot.listingEvaluationCount === 0) {
    messages.push({
      level: "info",
      title: "Sin evaluaciones",
      body: "El pipeline todavia no ha generado ListingEvaluation persistidas para inspeccionar oportunidades.",
    });
  }

  if (snapshot.listingEvaluationCount > 0 && snapshot.alertCount === 0) {
    messages.push({
      level: "info",
      title: "Evaluaciones sin alertas",
      body: "Hay evaluaciones persistidas pero 0 alertas internas. El sistema esta evaluando, pero aun no se dispararon condiciones de alerta.",
    });
  }

  return messages;
}
