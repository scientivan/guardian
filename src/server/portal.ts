import { createPrivateKey, createPublicKey, sign } from "node:crypto";

// Mock of the hospital's own billing portal (the "official channel"). It stands
// in for a real hospital publishing its payee accounts on its domain. The private
// key lives only here, on the "hospital side"; the guardian knows only the public key.
// DEMO ONLY: the seed is public, so anyone could forge this hospital's signature.

const PKCS8_ED25519_PREFIX = Buffer.from("302e020100300506032b657004220420", "hex");

function keyFromSeed(seedHex: string) {
  return createPrivateKey({ key: Buffer.concat([PKCS8_ED25519_PREFIX, Buffer.from(seedHex, "hex")]), format: "der", type: "pkcs8" });
}

const DEMO_SEEDS: Record<string, string> = {
  H1: "677561726469616e2d64656d6f2d686f73706974616c2d6b65792d30303031aa",
};

export interface PortalPayee {
  id: string;
  account: string;
  name: string;
}

export interface SignedPayeeList {
  hospitalId: string;
  issuedAt: string;
  payees: PortalPayee[];
  /** base64 Ed25519 signature over canonicalPayload(). */
  signature: string;
}

export function canonicalPayload(l: Omit<SignedPayeeList, "signature">): Buffer {
  const payees = [...l.payees].sort((a, b) => a.id.localeCompare(b.id)).map((p) => [p.id, p.account, p.name]);
  return Buffer.from(JSON.stringify(["guardian.payee-list.v1", l.hospitalId, l.issuedAt, payees]));
}

export function portalPublicKey(hospitalId: string): string {
  return createPublicKey(keyFromSeed(DEMO_SEEDS[hospitalId])).export({ format: "der", type: "spki" }).toString("base64");
}

/** What GET <official_channel>/payees would return. */
export function fetchSignedPayeeList(hospitalId: string, payees: PortalPayee[], issuedAt = new Date().toISOString()): SignedPayeeList {
  const seed = DEMO_SEEDS[hospitalId];
  if (!seed) throw new Error(`no portal for hospital ${hospitalId}`);
  const body = { hospitalId, issuedAt, payees };
  return { ...body, signature: sign(null, canonicalPayload(body), keyFromSeed(seed)).toString("base64") };
}
