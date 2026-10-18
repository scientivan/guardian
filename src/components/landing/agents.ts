// The seven agents shown in the landing-page office. Each maps to one part of
// docs/ARCHITECTURE.md §3, in pipeline order. Texts cycle through three states.

import type { Look } from "./Minifig";

export type AgentId = "clerk" | "reader" | "calculator" | "second" | "planner" | "gate" | "auditor";

export type Agent = {
  id: AgentId;
  name: string;
  /** What the part is in the architecture, for the "How it works" chips. */
  role: string;
  /** Shirt and chip colour. */
  color: string;
  /** Icon colour on top of `color`. */
  onColor: string;
  skin: string;
  /** Hair colour, or the hijab colour when `hijab` is set. */
  hair: string;
  hijab?: boolean;
  /** Short status for the name tag (fits ~21 characters). */
  activity: [string, string, string];
  /** Sentence for the live card. */
  detail: [string, string, string];
};

export const AGENTS: Agent[] = [
  {
    id: "clerk",
    name: "Privacy Clerk",
    role: "PII scrubber (code)",
    color: "#202121",
    onColor: "#ffffff",
    skin: "#e8b98f",
    hair: "#2b2a28",
    activity: ["hiding names", "name → [PASIEN_1]", "passport → [ID_1]"],
    detail: [
      "Hiding names and ID numbers in bill D2",
      "The patient’s name becomes [PASIEN_1]",
      "The passport number becomes [ID_1]",
    ],
  },
  {
    id: "reader",
    name: "Reader",
    role: "Quarantined reader (LLM, no tools)",
    color: "#abc1cf",
    onColor: "#202121",
    skin: "#c68e62",
    hair: "#1f1c1a",
    activity: ["reading bill D2", "no tools, no internet", "totals match ✓"],
    detail: [
      "Reading interim bill D2: 40 items",
      "Works behind glass: no tools, no internet",
      "The lines add up to the stated total ✓",
    ],
  },
  {
    id: "calculator",
    name: "Calculator",
    role: "Comparator (code)",
    color: "#91999c",
    onColor: "#ffffff",
    skin: "#f1c9a5",
    hair: "#4a3426",
    activity: ["estimate vs bill", "stay +2 days: ¥2,400", "pillow case: ask"],
    detail: [
      "Comparing the estimate with bill D2",
      "The stay is 2 days longer: +CNY 2,400",
      "Pillow cases billed separately: ask the hospital",
    ],
  },
  {
    id: "second",
    name: "Second Opinion",
    role: "Second model (other provider)",
    color: "#9a6212",
    onColor: "#ffffff",
    skin: "#a8754f",
    hair: "#1e1e1e",
    activity: ["checking item #30", "models agree ✓", "disagree → ask"],
    detail: [
      "Called over to double-check item #30",
      "Both models agree on item #30 ✓",
      "The models disagree, so it becomes a question",
    ],
  },
  {
    id: "planner",
    name: "Planner",
    role: "Planner (LLM, fixed actions)",
    color: "#3f7d5c",
    onColor: "#ffffff",
    skin: "#d9a77c",
    hair: "#b98f7a",
    hijab: true,
    activity: ["writing explanation", "which bill? how much?", "question for hospital"],
    detail: [
      "Writing a plain-language explanation",
      "Asking Rina: which bill, and how much?",
      "Drafting a question for hospital billing",
    ],
  },
  {
    id: "gate",
    name: "Payment Gate",
    role: "Payment gateway (code)",
    color: "#4875a1",
    onColor: "#ffffff",
    skin: "#8d5b3c",
    hair: "#151515",
    activity: ["checking •••• 2222", "official account ✓", "blocked fake account"],
    detail: [
      "Checking the payee •••• 2222",
      "Official hospital account ✓ payment allowed",
      "Blocked a fake “new account” message",
    ],
  },
  {
    id: "auditor",
    name: "Auditor",
    role: "Hash-chained audit log (code)",
    color: "#6e5e52",
    onColor: "#ffffff",
    skin: "#e9c29e",
    hair: "#9a9a9a",
    activity: ["recording step #42", "chain intact ✓", "anchored on FISCO"],
    detail: [
      "Recording step #42 in the log",
      "Chain checked: every step intact ✓",
      "Fingerprint anchored on FISCO BCOS",
    ],
  },
];

export const AGENT_BY_ID = Object.fromEntries(AGENTS.map((a) => [a.id, a])) as Record<AgentId, Agent>;

/** The family from the demo seed, drawn as the same toy figures. Rina owns the case; the others are helpers abroad. */
export const FAMILY: (Look & { name: string })[] = [
  { name: "Rina", skin: "#d9a77c", hair: "#7d6a74", hijab: true, shirt: "#6e5e52" },
  { name: "Adi", skin: "#c68e62", hair: "#1f1c1a", shirt: "#6e5e52" },
  { name: "Sari", skin: "#e8b98f", hair: "#3b2a22", shirt: "#6e5e52" },
  { name: "Fajar", skin: "#a8754f", hair: "#151515", shirt: "#6e5e52" },
];
