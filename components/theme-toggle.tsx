"use client";

import { useEffect, useState } from "react";
import {
  applyThemeToDocument,
  readThemeMode,
  resolveTheme,
  SYSTEM_THEME_QUERY,
  type ResolvedTheme,
  type ThemeMode,
  writeThemeMode,
} from "@/lib/theme";

const OPTIONS: Array<{ value: ThemeMode; label: string }> = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

function getSystemResolvedTheme(): ResolvedTheme {
  if (typeof window === "undefined") {
    return "light";
  }

  return resolveTheme("system", window.matchMedia(SYSTEM_THEME_QUERY).matches);
}

export function ThemeToggle() {
  const [mode, setMode] = useState<ThemeMode>("system");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("light");

  useEffect(() => {
    const syncTheme = () => {
      const nextMode = readThemeMode();
      const nextResolvedTheme = applyThemeToDocument(nextMode);
      setMode(nextMode);
      setResolvedTheme(nextResolvedTheme);
    };

    syncTheme();

    const mediaQuery = window.matchMedia(SYSTEM_THEME_QUERY);
    const handleMediaChange = () => {
      if (readThemeMode() === "system") {
        setResolvedTheme(applyThemeToDocument("system"));
      }
    };
    const handleStorage = () => syncTheme();

    mediaQuery.addEventListener("change", handleMediaChange);
    window.addEventListener("storage", handleStorage);

    return () => {
      mediaQuery.removeEventListener("change", handleMediaChange);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  function handleThemeChange(nextMode: ThemeMode) {
    writeThemeMode(nextMode);
    setMode(nextMode);
    setResolvedTheme(nextMode === "system" ? getSystemResolvedTheme() : nextMode);
    applyThemeToDocument(nextMode);
  }

  return (
    <div className="theme-toggle" aria-label="Selector de tema">
      <span className="theme-toggle-label">Tema</span>
      <div className="theme-toggle-group" role="group" aria-label="Cambiar tema">
        {OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`theme-toggle-button${mode === option.value ? " is-active" : ""}`}
            aria-pressed={mode === option.value}
            onClick={() => handleThemeChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
      <span className="theme-toggle-status">
        {mode === "system" ? `Sistema · ${resolvedTheme}` : resolvedTheme}
      </span>
    </div>
  );
}
