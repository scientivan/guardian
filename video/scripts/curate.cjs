// Copies only synthetic visual assets. Browser sessions and raw captures stay ignored.
const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const source='public/rec',destination='public/demo',manifest={};
fs.mkdirSync(destination,{recursive:true});
for(const name of fs.readdirSync(source)){
  if(name.startsWith('error')||!name.endsWith('.png'))continue;
  fs.copyFileSync(path.join(source,name),path.join(destination,name));
  manifest[name.slice(0,-4)]={image:'demo/'+name};
}
for(const name of fs.readdirSync(source)){
  if(!name.endsWith('.mp4'))continue;
  fs.copyFileSync(path.join(source,name),path.join(destination,name));
  const info=JSON.parse(execFileSync('ffprobe',['-v','quiet','-show_format','-of','json',path.join(source,name)],{encoding:'utf8'}));
  const id=name.slice(0,-4);
  manifest[id]={...manifest[id],video:'demo/'+name,videoFrames:Math.floor(Number(info.format.duration)*30)};
}
fs.writeFileSync(path.join(destination,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(Object.keys(manifest).length+' curated demo assets');
