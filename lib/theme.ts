export const THEME_STORAGE_KEY = "cazador-theme";
export const SYSTEM_THEME_QUERY = "(prefers-color-scheme: dark)";

export type ThemeMode = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

const VALID_THEME_MODES: ThemeMode[] = ["light", "dark", "system"];

export function isThemeMode(value: string | null | undefined): value is ThemeMode {
  return VALID_THEME_MODES.includes(value as ThemeMode);
}

export function resolveTheme(mode: ThemeMode, prefersDark: boolean): ResolvedTheme {
  if (mode === "system") {
    return prefersDark ? "dark" : "light";
  }

  return mode;
}

export function readThemeMode(): ThemeMode {
  if (typeof window === "undefined") {
    return "system";
  }

  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isThemeMode(value) ? value : "system";
  } catch {
    return "system";
  }
}

export function writeThemeMode(mode: ThemeMode) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch {
    // Ignore storage failures and keep the current document theme.
  }
}

export function applyThemeToDocument(mode: ThemeMode): ResolvedTheme {
  if (typeof document === "undefined") {
    return "light";
  }

  const prefersDark =
    typeof window !== "undefined" && window.matchMedia(SYSTEM_THEME_QUERY).matches;
  const resolvedTheme = resolveTheme(mode, prefersDark);
  const root = document.documentElement;

  root.dataset.themeMode = mode;
  root.dataset.theme = resolvedTheme;
  root.style.colorScheme = resolvedTheme;

  return resolvedTheme;
}

export function getThemeInitScript(): string {
  return `(() => {
    const storageKey = ${JSON.stringify(THEME_STORAGE_KEY)};
    const mediaQuery = ${JSON.stringify(SYSTEM_THEME_QUERY)};
    const validModes = { light: true, dark: true, system: true };

    const readMode = () => {
      try {
        const value = window.localStorage.getItem(storageKey);
        return validModes[value] ? value : "system";
      } catch {
        return "system";
      }
    };

    const resolveTheme = (mode) => {
      if (mode === "system") {
        return window.matchMedia(mediaQuery).matches ? "dark" : "light";
      }

      return mode;
    };

    const mode = readMode();
    const resolvedTheme = resolveTheme(mode);
    const root = document.documentElement;

    root.dataset.themeMode = mode;
    root.dataset.theme = resolvedTheme;
    root.style.colorScheme = resolvedTheme;
  })();`;
}
