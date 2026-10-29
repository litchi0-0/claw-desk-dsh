const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {execFileSync}=require('node:child_process');
const original=fs.readFileSync('tests/fixtures/clawd-click-1.4.0.js','utf8');
const patched=execFileSync('python3',['-c',`import runpy,sys; print(runpy.run_path('scripts/patch-clawd-click.py')['patch_hit'](sys.stdin.read()))`],{input:original,encoding:'utf8'});
function harness(source=patched){
 const timers=new Map(), calls=[];let id=0;
 const ctx={currentState:'idle',dndEnabled:false,isReacting:false,miniMode:false,isDragReacting:false,
 area:{offsetWidth:100},_reactions:{clickLeft:{file:'wave.webp',duration:10042},clickRight:{file:'shy.webp',duration:10042},double:{files:['happy.webp'],duration:10042}},
 window:{hitAPI:{revealSessionHud(){},playClickReaction:(...a)=>calls.push(a),exitMiniMode(){}}},
 setTimeout:f=>{timers.set(++id,f);return id},clearTimeout:i=>timers.delete(i),Math};
 vm.createContext(ctx);vm.runInContext(source,ctx);
 return {ctx,calls,click:x=>ctx.handleClick(x),flush(){const t=[...timers.values()];timers.clear();t.forEach(f=>f())}};
}
test('single click chooses left/right body reaction after accumulation window',()=>{
 for(const [x,file] of [[20,'wave.webp'],[80,'shy.webp']]){const h=harness();h.click(x);assert.equal(h.calls.length,0);h.flush();assert.deepEqual(h.calls,[[file,10042]]);}
});
test('four rapid clicks trigger only the existing special reaction',()=>{
 const h=harness();for(let i=0;i<4;i++)h.click(20);h.flush();assert.equal(h.calls.length,1);assert.equal(h.calls[0][0],'happy.webp');
});
test('DND and active reaction still suppress single clicks',()=>{
 for(const prop of ['dndEnabled','isReacting']){const h=harness();h.click(20);h.ctx[prop]=true;h.flush();assert.equal(h.calls.length,0);}
});
test('original handler reproduces the missing single click',()=>{const h=harness(original);h.click(20);h.flush();assert.equal(h.calls.length,0)});
test('installed click routing uses full playback and replaces the previous selection',{skip:!fs.existsSync(require('node:os').homedir()+'/Applications/Clawd on Desk 动画版.app/Contents/Resources/app.asar')},()=>{
 const main=execFileSync('python3',['-c',`import runpy; from pathlib import Path; m=runpy.run_path('scripts/install-clawd-animation-menu.py'); a,h,s,_=m['read_archive'](Path.home()/'Applications/Clawd on Desk 动画版.app/Contents/Resources/app.asar'); print(m['read_file'](a,h,s,'src/main.js').decode())`],{encoding:'utf8',maxBuffer:2e6});
 const fn=main.slice(main.indexOf('function requestClickReaction('),main.indexOf('\nfunction sendToRenderer(',main.indexOf('function requestClickReaction(')));
 const calls=[], request={file:'wave.webp'};
 const ctx={getActiveTheme:()=>({}),collectRequiredAssetFiles:()=>['wave.webp'],manualAnimationPlayer:{play:(...a)=>calls.push(a),getRequest:()=>request}};
 vm.createContext(ctx);vm.runInContext(fn,ctx);
 assert.equal(ctx.requestClickReaction('wave.webp',10042),request);
 assert.deepEqual(calls,[['wave.webp',10042]]);
 assert.equal(ctx.requestClickReaction('unknown.webp',10042),null);
});
