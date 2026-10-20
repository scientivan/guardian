import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

export const STORAGE_BUCKET=process.env.GUARDIAN_STORAGE_BUCKET??"guardian-private";
export function cloudStorageEnabled() {return process.env.GUARDIAN_STORAGE_DRIVER==="supabase";}
function client() {
  let url=process.env.SUPABASE_PROJECT_URL;
  if(!url && process.env.SUPABASE_URL?.startsWith("https://"))url=process.env.SUPABASE_URL;
  if(!url && process.env.SUPABASE_URL?.startsWith("postgres")) {
    const db=new URL(process.env.SUPABASE_URL);
    const ref=db.hostname.startsWith("db.")?db.hostname.split(".")[1]:decodeURIComponent(db.username).split(".")[1];
    if(ref && /^[a-z0-9]{20}$/.test(ref))url=`https://${ref}.supabase.co`;
  }
  const key=process.env.SUPABASE_SECRET_KEY??process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url?.startsWith("https://")||!key)throw new Error("Supabase Storage needs SUPABASE_PROJECT_URL and a server-only secret/service key.");
  return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
}
export async function ensurePrivateBucket() {
  const storage=client().storage;
  const {data,error}=await storage.getBucket(STORAGE_BUCKET);
  if(error) {
    const created=await storage.createBucket(STORAGE_BUCKET,{public:false,fileSizeLimit:10*1024*1024,allowedMimeTypes:["application/pdf","image/png","image/jpeg"]});
    if(created.error)throw new Error("The private Supabase Storage bucket could not be created.");
  }else if(data.public)throw new Error("Guardian requires a private Storage bucket.");
}
export function fileScope(ownerId:string,caseId:string) {return `${createHash("sha256").update(ownerId).digest("hex")}/${caseId}`;}
export async function privateDownloadUrl(key:string,filename:string) {
  const {data,error}=await client().storage.from(STORAGE_BUCKET).createSignedUrl(key,60,{download:filename});
  if(error||!data)throw new Error("The private download could not be prepared.");
  return data.signedUrl;
}
export async function putPrivateFile(scope:string,bytes:Uint8Array,mime:string,stableId:string=randomUUID()):Promise<string|null> {
  if(!cloudStorageEnabled())return null;
  if(!/^[\w/-]+$/.test(scope)||!/^[\w-]+$/.test(stableId))throw new Error("Invalid private file scope.");
  const hash=createHash("sha256").update(bytes).digest("hex");
  const key=`${scope}/${stableId}-${hash}`;
  const {error}=await client().storage.from(STORAGE_BUCKET).upload(key,bytes,{contentType:mime,upsert:false});
  if(error) {
    // An interrupted migration can retry the same immutable object, but cannot replace it.
    const existing=await readPrivateFile(key,hash);
    if(existing.length!==bytes.length)throw new Error("The private object could not be safely stored.");
  }
  return key;
}
export async function readPrivateFile(key:string,sha256:string):Promise<Buffer> {
  if(!/^[\w/-]+$/.test(key))throw new Error("Invalid private object key.");
  const {data,error}=await client().storage.from(STORAGE_BUCKET).download(key);
  if(error||!data)throw new Error("The private file is temporarily unavailable.");
  const bytes=Buffer.from(await data.arrayBuffer());
  if(createHash("sha256").update(bytes).digest("hex")!==sha256)throw new Error("The private file failed its integrity check.");
  return bytes;
}

function signingKey() {
  const key=process.env.NEXTAUTH_SECRET;
  if(!key)throw new Error("The server session secret is required for uploads.");
  return key;
}
export async function uploadTicket(scope:string,subject:string,path:string,input:{name:string;mime:string;size:number}) {
  const key=`${scope}/staging-${randomUUID()}`;
  const {data,error}=await client().storage.from(STORAGE_BUCKET).createSignedUploadUrl(key,{upsert:false});
  if(error||!data)throw new Error("A private upload could not be prepared.");
  const payload=Buffer.from(JSON.stringify({...input,key,subject,path,expires:Date.now()+15*60_000})).toString("base64url");
  const mac=createHmac("sha256",signingKey()).update(payload).digest("base64url");
  return {signedUrl:data.signedUrl,receipt:`${payload}.${mac}`};
}
export async function uploadedFile(receipt:string,subject:string,path:string):Promise<File> {
  const [payload,signature]=receipt.split(".");
  const expected=createHmac("sha256",signingKey()).update(payload??"").digest();
  const actual=Buffer.from(signature??"","base64url");
  if(expected.length!==actual.length||!timingSafeEqual(expected,actual))throw new Error("Invalid upload receipt.");
  const value=JSON.parse(Buffer.from(payload,"base64url").toString()) as {key:string;subject:string;path:string;expires:number;name:string;mime:string;size:number};
  if(value.subject!==subject||value.path!==path||value.expires<Date.now())throw new Error("The upload receipt has expired or belongs to a different request.");
  const {data,error}=await client().storage.from(STORAGE_BUCKET).download(value.key);
  if(error||!data)throw new Error("The uploaded file is unavailable.");
  if(data.size!==value.size||data.size>10*1024*1024)throw new Error("The uploaded file size does not match.");
  return new File([await data.arrayBuffer()],value.name,{type:value.mime});
}
