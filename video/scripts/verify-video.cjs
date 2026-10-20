const fs=require('node:fs');const scenes=require('../src/timeline.5min.json');const media=require('../public/demo/manifest.json');
let end=0;const ids=new Set();
for(const s of scenes){if(s.from!==end)throw Error('Gap '+s.id);end+=s.frames;for(const l of s.lines){if(ids.has(l.id))throw Error('Duplicate cue');ids.add(l.id);if(!fs.existsSync('public/tts/'+l.id+'.wav'))throw Error('Missing voice '+l.id);if(l.from+l.frames>s.frames)throw Error('Voice spills '+l.id)}}
if(end!==8940||end/30>300)throw Error('Invalid duration');
for(const [id,m]of Object.entries(media))for(const key of ['image','video'])if(m[key]&&!fs.existsSync('public/'+m[key]))throw Error('Missing '+id+' '+key);
console.log(`${scenes.length} scenes, ${ids.size} cues, ${end} frames, ${end/30}s. All media present.`);
