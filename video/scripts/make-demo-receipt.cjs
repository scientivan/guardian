// Synthetic proof-of-payment fixture for the demo, not a medical bill or real receipt.
const {PDFDocument,StandardFonts}=require('../../node_modules/pdf-lib');
const fs=require('node:fs');
(async()=>{
  const document=await PDFDocument.create();
  const font=await document.embedFont(StandardFonts.Helvetica);
  const page=document.addPage([600,800]);
  const lines=[
    'SYNTHETIC DEMO - NOT A REAL HOSPITAL RECEIPT',
    'Shenzhen International Hospital - fictional scenario',
    'Emergency guarantee receipt / Request R2',
    'Amount received CNY 50,000',
    'Payer group - Guardian synthetic case C1',
    'Sandbox only. No real money or hospital settlement.',
  ];
  lines.forEach((text,i)=>page.drawText(text,{x:40,y:740-i*45,size:i?15:17,font}));
  fs.mkdirSync('public/rec',{recursive:true});
  fs.writeFileSync('public/rec/synthetic-guarantee-receipt.pdf',await document.save());
})().catch(error=>{console.error(error);process.exit(1)});
