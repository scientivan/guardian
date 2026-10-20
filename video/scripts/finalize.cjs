// Normalize the frame-aligned narration and produce a web-friendly submission MP4.
// node scripts/finalize.cjs out/Guardian-5min.mp4 out/Guardian-final.mp4 [out/Guardian-tail.mp4]
const fs=require('node:fs');
const {spawnSync}=require('node:child_process');
const [video,output,tail]=process.argv.slice(2);
if(!video||!output)throw Error('Pass input and output MP4 paths');
const voice='out/final-narration.wav';
const analysis=spawnSync('ffmpeg',['-hide_banner','-nostats','-i',voice,'-af','loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json','-f','null','-'],{encoding:'utf8'});
if(analysis.status!==0)throw Error(analysis.stderr);
const measured=JSON.parse(analysis.stderr.match(/\{\s*"input_i"[\s\S]*?\}/)[0]);
fs.writeFileSync('out/audio-analysis.json',JSON.stringify(measured,null,2)+'\n');
const normalize=`loudnorm=I=-16:TP=-1.5:LRA=11:measured_I=${measured.input_i}:measured_TP=${measured.input_tp}:measured_LRA=${measured.input_lra}:measured_thresh=${measured.input_thresh}:offset=${measured.target_offset}:linear=false`;
const args=['-hide_banner','-loglevel','error','-y','-i',video];
if(tail)args.push('-i',tail);
args.push('-i',voice);
if(tail){
 args.push('-filter_complex',`[0:v]trim=end_frame=8040,setpts=PTS-STARTPTS[head];[1:v]setpts=PTS-STARTPTS[tail];[head][tail]concat=n=2:v=1:a=0[v];[2:a]${normalize}[a]`,'-map','[v]','-map','[a]','-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p','-r','30');
}else{
 args.push('-map','0:v:0','-map','1:a:0','-c:v','copy','-af',normalize);
}
args.push('-c:a','aac','-ar','48000','-b:a','192k','-movflags','+faststart','-t','298',output);
const result=spawnSync('ffmpeg',args,{encoding:'utf8'});
if(result.status!==0)throw Error(result.stderr);
console.log('Finalized '+output+' with frame-aligned normalized narration');
