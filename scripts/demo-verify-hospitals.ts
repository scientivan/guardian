// DEMO ONLY: marks every listed hospital in the shared directory as verified and gives it an active,
// signed payment account, so Pledges can be tried end to end with a Google account.
//
//   npm run hospitals:demo-verify            listed hospitals → verified profile + active payments
//   npm run hospitals:demo-verify -- --dry-run
//
// It goes through the same review and decision code as the Verification Desk, as a stand-in
// operator, with a synthetic registry source, a fresh Ed25519 key and synthetic "DEMO" accounts.
// Nothing here is a real hospital confirmation. Refuses to run with NODE_ENV=production unless
// --force is given. The private keys are thrown away; a later key change needs the normal recovery.

import { generateKeyPairSync, sign } from "node:crypto";
import { loadEnvConfig } from "@next/env";
import type { Session } from "next-auth";
import type { HospitalTrust } from "../src/lib/hospitals";
import { openHospitalDirectory } from "../src/server/hospital-directory";
import { canonicalPayload } from "../src/server/portal";

loadEnvConfig(process.cwd());
const dryRun = process.argv.includes("--dry-run");
if (process.env.NODE_ENV === "production" && !process.argv.includes("--force")) {
  console.error("Refusing to fake hospital verification with NODE_ENV=production. Pass --force only on a demo server.");
  process.exit(1);
}

const OPERATOR = "demo-seed-operator@guardian.local";
// Admin rights for this process only; the server's own allowlist is not changed.
process.env.GUARDIAN_ADMIN_EMAILS = [process.env.GUARDIAN_ADMIN_EMAILS, OPERATOR].filter(Boolean).join(",");
const operator: Session = { user: { id: "demo-seed-operator", name: "Demo seed operator", email: OPERATOR, mode: "google" }, expires: "2099-01-01" };

const registry = (id: string) => `https://demo-registry.guardian.example/hospitals/${encodeURIComponent(id)}`;
const source = (id: string) => ({ url: registry(id), title: "DEMO synthetic registry record (not a real confirmation)", retrievedAt: new Date().toISOString(), excerpt: "Synthetic evidence created by scripts/demo-verify-hospitals.ts for testing payments in the demo." });
const proof = (channel: string, id: string) => ({ confirmationChannel: channel, independentSource: registry(id), notes: "DEMO SEED: synthetic verification for testing. No real institutional confirmation took place.", identityChecked: true, ownershipChecked: true, recovery: false });

const directory = openHospitalDirectory();
try {
  let done = 0;
  for (const h of directory.hospitals()) {
    if (!["listed", "verified"].includes(h.profileStatus) || h.paymentStatus === "active") { console.log(`skip  ${h.profile.name} (${h.profileStatus}, payments ${h.paymentStatus})`); continue; }
    if (dryRun) { console.log(`would verify ${h.profile.name}`); continue; }
    // Close any pending review first; approving needs the current version.
    for (const r of directory.reviews().filter(r => r.hospitalId === h.id && r.status === "pending")) directory.decide(operator, r.id, { decision: "reject", notes: "Superseded by the demo verification seed." });
    if (h.profileStatus !== "verified") {
      const review = directory.propose(operator, { hospitalId: h.id, kind: "profile", payload: h.profile, sources: [source(h.id)] });
      directory.decide(operator, review.id, { decision: "approve", notes: "DEMO SEED: profile marked verified for testing.", proof: proof(h.profile.phone, h.id) });
    }
    const keys = generateKeyPairSync("ed25519");
    const list = { hospitalId: h.id, issuedAt: new Date().toISOString(), payees: [{ id: "main", name: h.profile.name, account: `DEMO ${String(Math.abs(hash(h.id))).padStart(10, "0").slice(0, 10)}` }] };
    const trust: HospitalTrust = {
      officialChannel: `https://${new URL(h.profile.website).hostname}/billing`,
      publicKey: keys.publicKey.export({ format: "der", type: "spki" }).toString("base64"),
      bankName: "Demo Bank (synthetic)",
      signedList: { ...list, signature: sign(null, canonicalPayload(list), keys.privateKey).toString("base64") },
    };
    const payment = directory.propose(operator, { hospitalId: h.id, kind: "payment", payload: trust, sources: [source(h.id)] });
    directory.decide(operator, payment.id, { decision: "approve", notes: "DEMO SEED: synthetic payment account activated for testing.", proof: proof(h.profile.phone, h.id) });
    console.log(`ok    ${h.profile.name}: profile verified, payments active (account ${list.payees[0].account})`);
    done++;
  }
  console.log(dryRun ? "Dry run: nothing changed." : `${done} hospital(s) verified for the demo. Open a case linked to one, then Pledges → Verify hospital account.`);
} finally { directory.close(); }

function hash(s: string) { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0; return h; }
