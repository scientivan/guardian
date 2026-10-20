const path=require('node:path'),fs=require('node:fs');
const {bundle}=require('@remotion/bundler');
const {selectComposition,renderStill}=require('@remotion/renderer');
const timeline=require('../src/timeline.5min.json');
(async()=>{
 const serveUrl=await bundle({entryPoint:path.resolve('src/index.ts')});
 const common={serveUrl,browserExecutable:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',port:3100};
 const composition=await selectComposition({...common,id:'GuardianDemo'});
 fs.mkdirSync('out/preflight',{recursive:true});
 for(const [index,scene] of timeline.entries()){
  const line=scene.lines[Math.min(1,scene.lines.length-1)];
  await renderStill({...common,composition,frame:scene.from+line.from+20,output:`out/preflight/${String(index).padStart(2,'0')}-${scene.id}.jpg`,imageFormat:'jpeg',scale:.5});
  console.log('INSPECT',scene.id);
 }
})().catch(error=>{console.error(error);process.exit(1)});
