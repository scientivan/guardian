// Payee names are compared after normalization so invisible characters and
// look-alike letters cannot make a fake account match an official one (A3).

const INVISIBLE = /[​-‏‪-‮⁠-⁤﻿­]|[\u{E0000}-\u{E007F}]/gu;

// Small confusable map for Cyrillic/Greek letters that look like Latin ones.
const CONFUSABLES: Record<string, string> = {
  а: "a", е: "e", о: "o", р: "p", с: "c", х: "x", у: "y", і: "i", ј: "j", ѕ: "s",
  А: "A", В: "B", Е: "E", К: "K", М: "M", Н: "H", О: "O", Р: "P", С: "C", Т: "T", Х: "X",
  α: "a", ο: "o", ρ: "p", ν: "v", Α: "A", Β: "B", Ε: "E", Ο: "O", Ρ: "P", Τ: "T",
};

export function hasInvisible(s: string): boolean {
  return new RegExp(INVISIBLE.source, "u").test(s);
}

export function hasConfusable(s: string): boolean {
  return [...s].some((ch) => ch in CONFUSABLES);
}

/** Canonical form used for exact matching against the official registry. */
export function normalizeName(s: string): string {
  return s
    .normalize("NFKC")
    .replace(INVISIBLE, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

/** Account numbers keep digits and letters only. */
export function normalizeAccount(s: string): string {
  return s.normalize("NFKC").replace(INVISIBLE, "").replace(/[^0-9A-Za-z]/g, "").toUpperCase();
}
