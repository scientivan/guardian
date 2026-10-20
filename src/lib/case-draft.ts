// The "Start a care case" form, saved in this browser per signed-in account until the case is
// created. Uploaded files are not kept: browsers cannot store a chosen file for later.

export type CaseDraft = {
  step: number;
  ownerName: string;
  patientName: string;
  country: string;
  hospitalName: string;
  currency: string;
  directory: { id: string; name: string } | null;
  fileName: string | null;
  savedAt: string;
};

const key = (account: string) => `guardian.case-draft.${account}`;

export function readDraft(account: string): CaseDraft | null {
  try {
    const raw = localStorage.getItem(key(account));
    if (!raw) return null;
    const d = JSON.parse(raw) as CaseDraft;
    return typeof d.step === "number" ? { ...d, step: Math.max(0, Math.min(4, d.step)) } : null;
  } catch { return null; }
}

/** `pristine`: nothing changed from the defaults, so there is no draft to keep. */
export function writeDraft(account: string, draft: CaseDraft, pristine = false) {
  try { if (pristine) localStorage.removeItem(key(account)); else localStorage.setItem(key(account), JSON.stringify(draft)); } catch { /* private mode */ }
}

export function clearDraft(account: string) {
  try { localStorage.removeItem(key(account)); } catch { /* private mode */ }
}
