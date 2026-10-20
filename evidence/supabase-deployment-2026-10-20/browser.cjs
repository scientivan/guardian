/* eslint-disable @typescript-eslint/no-require-imports -- Standalone runner uses an external Playwright installation. */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||"playwright");
const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict");
(async()=>{
  const browser=await chromium.launch({executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",headless:true});
  try {
    const page=await browser.newPage({viewport:{width:1440,height:1000}});
    const errors=[];page.on("pageerror",e=>errors.push(e.message));
    const base="https://guardian.scientivan.dev";
    await page.goto(base);await page.screenshot({path:path.join(__dirname,"landing.png")});
    await page.goto(base+"/login");await page.getByRole("button",{name:"Use demo account",exact:true}).click();
    await page.waitForURL("**/projects",{timeout:180000});
    const results=await page.evaluate(async()=>{
      async function api(url,method="GET",body,member="M_OWNER") {
        const response=await fetch("/api"+url,{method,headers:{"Content-Type":"application/json","x-member-id":member},...(body?{body:JSON.stringify(body)}:{})});
        const result=await response.json();if(!response.ok)throw Error(`${url} ${response.status} ${JSON.stringify(result)}`);return result;
      }
      const workspace=await api("/cases");if(!workspace.cases.length)throw Error("No cloud workspace");
      const quote=await api("/payment-requests/R2/fx-quote","POST",{amount:500000});
      await api("/payment-requests/R2/approvals","POST",{amount:500000,quoteId:quote.quoteId});
      const payment=await api("/payment-requests/R2/execute","POST",{});
      const bytes=new Uint8Array(5*1024*1024).fill(65);bytes.set(new TextEncoder().encode("%PDF-1.4\n"));
      async function upload(target,fields={}) {
        const ticket=await api(target+"/upload-ticket","POST",{name:"synthetic-verification.pdf",mime:"application/pdf",size:bytes.length});
        const put=await fetch(ticket.signedUrl,{method:"PUT",headers:{"Content-Type":"application/pdf","x-upsert":"false"},body:bytes});
        if(!put.ok)throw Error(`Direct upload failed ${put.status}`);
        return api(target,"POST",{receipt:ticket.receipt,...fields});
      }
      const invoice=await upload("/payment-requests/R1/invoices");
      const downloaded=await fetch(`/api/payment-requests/R1/invoices/${invoice.id}`);
      if(!downloaded.ok)throw Error(`Invoice download ${downloaded.status}`);
      const returned=new Uint8Array(await downloaded.arrayBuffer());
      const same=returned.length===bytes.length&&returned.every((v,i)=>v===bytes[i]);
      const document=await upload("/cases/C1/documents",{type:"interim"});
      const file=await fetch(`/api/documents/${document.documentId}/file`);
      const fileBytes=new Uint8Array(await file.arrayBuffer());
      const denied=await fetch(`/api/documents/${document.documentId}/file`,{headers:{"x-member-id":"M_JKT"}});
      const payer=await api("/cases/C1","GET",undefined,"M_JKT");
      return {workspaceCases:workspace.cases.length,paymentStatus:payment.status,invoiceBytes:returned.length,invoiceMatches:same,originalBytes:fileBytes.length,originalDownload:file.status,payerOriginalStatus:denied.status,payerOtherIdsInAudit:/M_KL|M_DXB|M_OWNER/.test(JSON.stringify(payer.audit.rows)),documentStatus:document.status};
    });
    assert.equal(results.paymentStatus,"paid");assert.equal(results.invoiceMatches,true);assert.equal(results.originalDownload,200);assert.equal(results.payerOriginalStatus,403);assert.equal(results.payerOtherIdsInAudit,false);
    await page.goto(base+"/case/C1/pledges");await page.getByRole("heading",{name:"Pledges",exact:true}).waitFor({timeout:180000});
    await page.screenshot({path:path.join(__dirname,"pledges.png"),fullPage:true});
    assert.deepEqual(errors,[]);
    fs.writeFileSync(path.join(__dirname,"browser-results.json"),JSON.stringify({...results,pageErrors:errors},null,2));
    console.log(JSON.stringify(results));
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
