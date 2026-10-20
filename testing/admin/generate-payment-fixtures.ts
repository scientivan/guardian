import { generateKeyPairSync, sign, verify } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { canonicalPayload, type SignedPayeeList } from "../../src/server/portal";
import { keyRotationPayload } from "../../src/server/hospital-directory";
import type { HospitalTrust } from "../../src/lib/hospitals";

// File-only fixtures. Never opens a workspace, enrolls an institution or stores a private key.
const hospitalId=process.argv[2];
if(!hospitalId || !/^HD_[A-Za-z0-9_-]{1,100}$/.test(hospitalId)) {
  throw new Error("Usage: npx tsx testing/admin/generate-payment-fixtures.ts HD_<identifier shown in the admin form>");
}
const folder=join(dirname(fileURLToPath(import.meta.url)),"generated",hospitalId);
mkdirSync(folder,{recursive:true});
const first=generateKeyPairSync("ed25519");
const next=generateKeyPairSync("ed25519");
const publicKey=(pair:typeof first)=>pair.publicKey.export({format:"der",type:"spki"}).toString("base64");
const issuedAt=new Date().toISOString();
const json=(name:string,value:unknown)=>writeFileSync(join(folder,name),JSON.stringify(value,null,2)+"\n");

function payment(account:string,pair=first,issued=issuedAt):HospitalTrust {
  const list={hospitalId,issuedAt:issued,payees:[{id:"main",name:"Shenzhen International Hospital",account}]};
  const signedList:SignedPayeeList={...list,signature:sign(null,canonicalPayload(list),pair.privateKey).toString("base64")};
  if(!verify(null,canonicalPayload(signedList),pair.publicKey,Buffer.from(signedList.signature,"base64")))throw new Error("Fixture signature validation failed.");
  return {officialChannel:"https://hospital.example/billing",publicKey:publicKey(pair),bankName:"Guardian Testing Bank",signedList};
}

const initial=payment("6222 0000 1111 2222");
const replacement=payment("6222 0000 3333 4444");
const rotated=payment("6222 0000 3333 4444",next);
rotated.rotationSignature=sign(null,keyRotationPayload(hospitalId,rotated),first.privateKey).toString("base64");
if(!verify(null,keyRotationPayload(hospitalId,rotated),first.publicKey,Buffer.from(rotated.rotationSignature,"base64")))throw new Error("Fixture rotation validation failed.");
const tampered=structuredClone(initial.signedList);tampered.payees[0].account="6222 9999 8888 7777";
const stale=payment("6222 0000 1111 2222",first,new Date(Date.now()-8*86400_000).toISOString());

writeFileSync(join(folder,"01-public-key.txt"),initial.publicKey+"\n");
json("01-signed-account-list.json",initial.signedList);
json("01-payment-proposal.json",initial);
json("02-replacement-account-list.json",replacement.signedList);
json("02-replacement-payment-proposal.json",replacement);
writeFileSync(join(folder,"03-rotated-public-key.txt"),rotated.publicKey+"\n");
writeFileSync(join(folder,"03-rotation-signature.txt"),rotated.rotationSignature+"\n");
json("03-rotated-account-list.json",rotated.signedList);
json("03-rotated-payment-proposal.json",rotated);
json("04-tampered-account-list.json",tampered);
json("05-stale-account-list.json",stale.signedList);
json("README.json",{hospitalId,generatedAt:issuedAt,synthetic:true,privateKeysSaved:false,
  usage:"Use each complete payment-proposal JSON as the source for the corresponding fields in the admin form. Only signedList belongs in Signed account list JSON.",
  sequence:["01 initial activation","02 account change using the same key","03 new key with a rotation statement signed by the initial key"],
  negativeCases:{"04":"Account was edited after signing. Signature validation must reject it.","05":"Correct signature, issued eight days ago. Activation must reject the stale list."},
  note:"Regenerating this folder creates new key pairs. Keep all files from one run together. These fixtures do not establish real hospital ownership."});
console.log(`Generated signed testing files in ${folder}. Private keys were not saved.`);
