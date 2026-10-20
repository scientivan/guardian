/* eslint-disable @typescript-eslint/no-require-imports -- Standalone evidence runner loads an external Playwright installation. */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || "playwright");
const fs=require("node:fs");
const path=require("node:path");
const assert=require("node:assert/strict");
(async()=>{const browser=await chromium.launch({executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",headless:true});
const evidence=__dirname;fs.mkdirSync(evidence,{recursive:true});
try{const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on("pageerror",e=>errors.push(e.message));
await page.goto("http://localhost:3000/");assert(await page.getByText("No real transfers or hospital bank settlement.",{exact:false}).count()>0);await page.screenshot({path:path.join(evidence,"landing.png")});
await page.goto("http://localhost:3000/login");await page.getByRole("button",{name:"Use demo account",exact:true}).click();await page.waitForURL("**/projects",{timeout:45000});
const payments=await page.evaluate(async()=>{async function api(url,method="GET",body,member="M_OWNER"){const r=await fetch("/api"+url,{method,headers:{"content-type":"application/json","x-member-id":member},...(body?{body:JSON.stringify(body)}:{})});const data=await r.json();if(!r.ok)throw Error(JSON.stringify(data));return data;}
const q=await api("/payment-requests/R2/fx-quote","POST",{amount:500000});await api("/payment-requests/R2/approvals","POST",{amount:500000,quoteId:q.quoteId});const executed=await api("/payment-requests/R2/execute","POST",{});await api("/cases/C1/refunds/reconcile","POST",{documentId:"D3"});
const c=await api("/cases/C1","GET",undefined,"M_JKT");const rows=c.audit.rows;return {status:executed.status,ownChargeRows:rows.filter(r=>r.action==="charge"),otherMemberIdsInAudit:/M_KL|M_DXB|M_OWNER/.test(JSON.stringify(rows)),approvals:c.requests.flatMap(r=>r.approvals).map(a=>a.memberId),refundMembers:c.refunds.items.map(r=>r.memberId)};});
assert.equal(payments.status,"paid");assert.equal(payments.ownChargeRows.length,1);assert.equal(payments.otherMemberIdsInAudit,false);assert(payments.approvals.every(id=>id==="M_JKT"));assert.deepEqual(payments.refundMembers,["M_JKT"]);
const pages=[];for(const url of ["/case/C1/bill","/case/C1/pledges","/case/C1/log","/case/C1/closing","/case/C1/guide"]){await page.goto("http://localhost:3000"+url);await page.waitForTimeout(300);pages.push({url,heading:await page.locator("h1").allTextContents()});}
await page.goto("http://localhost:3000/case/C1/pledges");await page.waitForTimeout(500);const pledgeText=await page.locator("body").innerText();assert(pledgeText.includes("Every case member can view and download"));assert(!pledgeText.includes("paid straight to"));await page.screenshot({path:path.join(evidence,"pledges-receipt-warning.png"),fullPage:true});
await page.setViewportSize({width:390,height:844});await page.goto("http://localhost:3000/case/C1/bill");await page.waitForTimeout(500);const mobileOverflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);assert.equal(mobileOverflow,false);await page.screenshot({path:path.join(evidence,"bill-mobile.png"),fullPage:true});
assert.equal(errors.length,0);const result={payments,pages,mobileOverflow,pageErrors:errors};fs.writeFileSync(path.join(evidence,"browser-results.json"),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
