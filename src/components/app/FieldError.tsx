"use client";

import { LocalizedText } from "@/components/i18n/LocaleProvider";

import { useCallback, useState } from "react";

// Inline field errors (shared by every form). An error shows once the field was left or the form
// was submitted, never while someone is still typing their first value.

export function FieldError({ id, message }: { id: string; message?: string | null }) {
  if (!message) return null;
  return <p id={id} role="alert" className="mt-1.5 flex items-start gap-1.5 text-sm font-medium text-danger-ink"><span aria-hidden="true" className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-danger text-[10px] font-bold text-white">!</span><LocalizedText>{message}</LocalizedText></p>;
}

/** Red border for an invalid field; append to the field's className. */
export const INVALID = "!border-danger focus:!border-danger";

export function useFieldErrors<K extends string>(errors: Partial<Record<K, string>>, prefix = "field") {
  const [touched, setTouched] = useState<Partial<Record<K, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const visible = useCallback((key: K) => (submitted || touched[key] ? errors[key] : undefined), [errors, submitted, touched]);
  /** Props for the input: aria wiring, red border flag and blur tracking. */
  const field = (key: K) => {
    const message = visible(key);
    return {
      "aria-invalid": message ? true : undefined,
      "aria-describedby": message ? `${prefix}-${key}-error` : undefined,
      onBlur: () => setTouched(t => ({ ...t, [key]: true })),
    } as const;
  };
  const error = (key: K) => <FieldError id={`${prefix}-${key}-error`} message={visible(key)} />;
  /** Call on submit: shows every error and returns true when the form is valid. */
  const submit = (keys?: K[]) => {
    const list = keys ?? (Object.keys(errors) as K[]);
    if (keys) setTouched(t => Object.fromEntries([...Object.entries(t), ...keys.map(k => [k, true])]) as Partial<Record<K, boolean>>);
    else setSubmitted(true);
    const bad = list.find(k => errors[k]);
    if (bad) document.getElementById(`${prefix}-${bad}`)?.focus();
    return !bad;
  };
  const reset = () => { setTouched({}); setSubmitted(false); };
  return { visible, field, error, submit, reset, invalid: (key: K) => Boolean(visible(key)) };
}
