export type HospitalProfile = {
  name: string; branch: string; country: string; city: string; address: string;
  phone: string; website: string; billingEmail: string; billingPhone: string;
};
export type HospitalSource = { url: string; title: string; retrievedAt: string; excerpt: string };
export type HospitalTrust = {
  officialChannel: string; publicKey: string; bankName: string;
  rotationSignature?: string;
  signedList: {hospitalId: string; issuedAt: string; signature: string; payees: {id: string; name: string; account: string}[]};
};
export type HospitalRecord = {
  id: string; profile: HospitalProfile; profileStatus: "draft" | "listed" | "verified" | "suspended";
  paymentStatus: "unverified" | "active" | "suspended" | "revoked";
  profileVersion: number; trustVersion: number; trust: HospitalTrust | null;
  createdAt: string; updatedAt: string;
};
export type HospitalReview = {
  id: string; hospitalId: string; kind: "profile" | "payment"; baseVersion: number;
  payload: HospitalProfile | HospitalTrust; sources: HospitalSource[];
  status: "pending" | "needs_information" | "approved" | "rejected";
  createdBy: string; createdAt: string; updatedAt: string;
  discoveryModel: string | null; ai: HospitalAIReview | null;
  decisionBy: string | null; decisionNotes: string | null; proof: VerificationProof | null;
};
export type HospitalAIReview = {
  model: string | null; checkedAt: string; summary: string;
  findings: {field: string; status: "supported" | "conflict" | "unknown"; detail: string; sourceUrls: string[]}[];
  unavailable?: boolean;
};
export type VerificationProof = {
  confirmationChannel: string; independentSource: string; notes: string;
  identityChecked: boolean; ownershipChecked: boolean; recovery: boolean;
};
export type HospitalVerification = {
  id: string; hospitalId: string; reviewId: string; hash: string; payload: string;
  tx: string | null; anchorError: string | null; createdAt: string;
};
export type PublicHospital = Omit<HospitalRecord,"trust">;
export type HospitalAudit = {seq: number; ts: string; actor: string; action: string; hospitalId: string | null; hash: string; result: unknown};
