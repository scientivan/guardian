import {ensurePrivateBucket,putPrivateFile,readPrivateFile} from "../src/server/storage";
import {createHash,randomUUID} from "node:crypto";
async function main() {
  await ensurePrivateBucket();
  const bytes=Buffer.from("Guardian private storage verification");
  const key=await putPrivateFile("verification",bytes,"application/pdf",randomUUID());
  if(!key)throw new Error("Supabase Storage must be enabled.");
  const result=await readPrivateFile(key,createHash("sha256").update(bytes).digest("hex"));
  console.log(JSON.stringify({privateBucket:true,uploadDownloadMatch:result.equals(bytes)}));
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
