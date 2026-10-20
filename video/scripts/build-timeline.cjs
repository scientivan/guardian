const fs=require('node:fs');
const narration=require('../narration.5min.json');
const durations=require('../public/tts/durations.json');
const budgets={disclaimer:6,problem:17,intro:10,setup:16,plan:14,bill:27,clarify:21,recovery:16,pay:39,permissions:14,refund:19,security:19,injection:18,architecture:16,close:16,results:22,end:8};
let cursor=0;const scenes=[];
for(const [id,seconds] of Object.entries(budgets)){
 const lines=narration.filter(l=>l.scene===id);const speech=lines.reduce((n,l)=>n+durations[l.id],0);
 if(!Number.isFinite(speech))throw Error('Missing audio '+id);
 const available=seconds-.4-.18*(lines.length-1);const rate=Math.max(1,speech/available);
 if(rate>1.15)throw Error(`Narration too fast in ${id}: ${rate}`);
 let t=.2;const gap=lines.length>1?Math.max(.18,(seconds-.4-speech/rate)/(lines.length-1)):0;
 const timed=lines.map(l=>{const frames=Math.ceil(durations[l.id]/rate*30);const result={...l,from:Math.round(t*30),frames,rate};t+=durations[l.id]/rate+gap;return result});
 scenes.push({id,from:cursor,frames:seconds*30,lines:timed});cursor+=seconds*30;
 console.log(id,seconds,'speech',speech.toFixed(1),'rate',rate.toFixed(3));
}
fs.writeFileSync('src/timeline.5min.json',JSON.stringify(scenes,null,2));
