const warnedMessages = new Set<string>();

export function warnOnce(message: string, details?: Record<string, unknown>) {
  if (warnedMessages.has(message)) {
    return;
  }

  warnedMessages.add(message);

  if (details) {
    console.warn(message, details);
    return;
  }

  console.warn(message);
}

function readBooleanEnv(name: string, defaultValue = false): boolean {
  const rawValue = process.env[name];

  if (rawValue === undefined) {
    return defaultValue;
  }

  if (rawValue === "true") {
    return true;
  }

  if (rawValue === "false") {
    return false;
  }

  warnOnce(`[runtime-config] Invalid boolean env var, using fallback.`, {
    name,
    value: rawValue,
    fallback: defaultValue,
  });

  return defaultValue;
}

export function isProductionRuntime(): boolean {
  return process.env.NODE_ENV === "production";
}

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

export function shouldUseFixtureData(): boolean {
  const enabled = readBooleanEnv("USE_FIXTURE_DATA", false);

  if (enabled && isProductionRuntime()) {
    warnOnce("[runtime-config] USE_FIXTURE_DATA=true is ignored in production.");
    return false;
  }

  return enabled;
}

export function isEbayEnabled(): boolean {
  return readBooleanEnv("EBAY_ENABLED", false);
}

export function isCronSecretConfigured(): boolean {
  return Boolean(process.env.CRON_SECRET?.trim());
}

export function shouldAllowFixtureFallback(): boolean {
  return !isProductionRuntime();
}

export function warnMissingDatabaseUrl(context: string) {
  if (!isDatabaseConfigured()) {
    warnOnce(`[${context}] DATABASE_URL is missing; Prisma-backed runtime calls will fail.`);
  }
}
