import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { request } from "node:https";
import { ApiError } from "./errors";

export function isPublicAddress(address: string): boolean {
  if(isIP(address)===4) {
    const [a,b,c]=address.split(".").map(Number);
    return !(a===0 || a===10 || a===127 || a>=224 || (a===169&&b===254) || (a===172&&b>=16&&b<=31) || (a===192&&(b===168||b===0||b===2)) || (a===100&&b>=64&&b<=127) || (a===198&&(b===18||b===19||(b===51&&c===100))) || (a===203&&b===0&&c===113));
  }
  // Allow only global unicast IPv6, excluding transition/documentation ranges.
  if(isIP(address)!==6)return false;
  const value=new URL(`https://[${address}]/`).hostname.slice(1,-1).toLowerCase();
  return /^[23]/.test(value) && !["2001:db8:","2001::","2001:0:","2001:2:","2001:10:","2001:20:","2002:","3fff:"].some(prefix=>value.startsWith(prefix));
}

/** Pin the DNS answer used by HTTPS. Every redirect is revalidated before a connection. */
export async function fetchPublicText(value: string, redirects = 0): Promise<{url:string; text:string; contentType:string}> {
  let url: URL;
  try {url=new URL(value);}catch{throw new ApiError("Enter a valid public HTTPS address.");}
  if(url.protocol!=="https:" || url.username || url.password || (url.port && url.port!=="443") || url.hostname.endsWith(".local") || url.hostname==="localhost")throw new ApiError("Only public HTTPS sources can be retrieved.");
  const addresses=await lookup(url.hostname,{all:true});
  if(!addresses.length || addresses.some(a=>!isPublicAddress(a.address)))throw new ApiError("Private and internal network sources are not allowed.");
  const pinned=addresses[0];
  const result=await new Promise<{status:number;location?:string;text:string;type:string}>((resolve,reject)=>{
    const req=request(url,{method:"GET",headers:{"User-Agent":"Guardian-Hospital-Review/1.0","Accept":"text/html,application/json,text/plain"},
      lookup:(_hostname,_options,callback)=>callback(null,[{address:pinned.address,family:pinned.family}])},res=>{
      const chunks:Buffer[]=[];let bytes=0;
      res.on("data",(chunk:Buffer)=>{bytes+=chunk.length;if(bytes>750_000){req.destroy(new Error("Source exceeds the size limit."));return;}chunks.push(chunk);});
      res.on("end",()=>resolve({status:res.statusCode??0,location:res.headers.location,text:Buffer.concat(chunks).toString("utf8"),type:String(res.headers["content-type"]??"")}));
      res.on("error",reject);
    });
    const timer=setTimeout(()=>req.destroy(new Error("Source retrieval timed out.")),10_000);
    req.on("error",reject);req.on("close",()=>clearTimeout(timer));req.end();
  });
  if(result.status>=300 && result.status<400 && result.location) {
    if(redirects>=2)throw new ApiError("The source redirected too many times.",409);
    return fetchPublicText(new URL(result.location,url).href,redirects+1);
  }
  if(result.status!==200)throw new ApiError("The source could not be retrieved. Try another official evidence page.",409);
  if(!/text\/(html|plain)|application\/json/i.test(result.type))throw new ApiError("Use a public text, HTML or JSON source.",409);
  return {url:url.href,text:result.text,contentType:result.type};
}

export function plainWebText(html: string) {
  return html.replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi," ").replace(/<[^>]+>/g," ").replace(/&nbsp;|&#160;/g," ").replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/\s+/g," ").trim().slice(0,10_000);
}
