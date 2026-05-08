"use client";

import { useId, useState } from "react";
import { normalizeProfileTerms } from "@/lib/profiles/presentation";

export function ProfileTermInput({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string[];
  onChange: (nextValue: string[]) => void;
}) {
  const [draftValue, setDraftValue] = useState("");
  const inputId = useId();

  function commitValue(rawValue: string) {
    const terms = normalizeProfileTerms([...(value ?? []), rawValue]);
    if (terms.join("|") !== value.join("|")) {
      onChange(terms);
    }
    setDraftValue("");
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === "," || event.key === "Tab") {
      if (!draftValue.trim()) {
        return;
      }

      event.preventDefault();
      commitValue(draftValue);
    }

    if (event.key === "Backspace" && !draftValue && value.length > 0) {
      event.preventDefault();
      onChange(value.slice(0, -1));
    }
  }

  function handlePaste(event: React.ClipboardEvent<HTMLInputElement>) {
    const pastedText = event.clipboardData.getData("text");
    const parsed = normalizeProfileTerms(pastedText);
    if (parsed.length <= 1) {
      return;
    }

    event.preventDefault();
    onChange(normalizeProfileTerms([...value, ...parsed]));
    setDraftValue("");
  }

  function removeTerm(term: string) {
    onChange(value.filter((item) => item !== term));
  }

  return (
    <label className="control-field control-field-wide">
      <span className="field-label">{label}</span>
      <div className="term-input-shell">
        <div className="chips">
          {value.map((term) => (
            <button
              type="button"
              key={term}
              className="term-chip"
              onClick={() => removeTerm(term)}
              aria-label={`Eliminar termino ${term}`}
            >
              <span>{term}</span>
              <span aria-hidden="true">×</span>
            </button>
          ))}
        </div>
        <input
          id={inputId}
          className="control-input term-input-field"
          type="text"
          value={draftValue}
          onChange={(event) => setDraftValue(event.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            if (draftValue.trim()) {
              commitValue(draftValue);
            }
          }}
          onPaste={handlePaste}
          placeholder={placeholder}
        />
      </div>
    </label>
  );
}
