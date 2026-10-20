"use client";

import { LocalizedText } from "@/components/i18n/LocaleProvider";

import { useState } from "react";
import { SECONDARY } from "./ui";

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className={SECONDARY}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          window.setTimeout(() => setDone(false), 2000);
        } catch {
          setDone(false);
        }
      }}
    >
      <LocalizedText>{done ? "Copied" : label}</LocalizedText>
    </button>
  );
}
