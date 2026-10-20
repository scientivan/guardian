import type { CASE, DOCUMENTS, EXPLANATION, ITEMS, REQUESTS, REFUNDS, AUDIT } from "./demo";
import type { AgentId } from "@/components/landing/agents";
import type { AgentStatus } from "@/components/office/model";

export type AccountMode = "google" | "demo";
export type CareCase = {
  case: typeof CASE;
  country: string;
  documents: typeof DOCUMENTS;
  explanation: typeof EXPLANATION | null;
  items: typeof ITEMS;
  requests: typeof REQUESTS;
  refunds: typeof REFUNDS | null;
  audit: typeof AUDIT;
  agents: Record<AgentId, AgentStatus>;
  secondCheckStatus?: string;
};
export type Workspace = { mode: AccountMode; cases: CareCase[] };
export type NewCareCase = { patientName: string; hospitalName: string; country: string; currency: string; ownerName: string; hospitalDirectoryId?: string };
