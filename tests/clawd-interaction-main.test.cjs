const {test}=require('node:test');const assert=require('node:assert/strict');const vm=require('node:vm');const fs=require('node:fs');
function setup(){let controls;const channels=new Map(),gestures=[],messages=[];const hitContents={};
 const ctx={isQuitting:false,doNotDisturb:false,soundMuted:false,soundVolume:1,menuOpen:false,win:{isDestroyed:()=>false,isVisible:()=>true},hitWin:{isDestroyed:()=>false,webContents:hitContents},
 getActiveTheme:()=>({petInteractions:{enabled:true,clickSound:true}}),_mini:{getMiniMode:()=>false,getMiniTransitioning:()=>false},
 _perm:{hasVisiblePermissionBubbles:()=>false},anySessionInProgress:()=>false,manualAnimationPlayer:{isActive:()=>false},_state:{getCurrentState:()=> 'idle'},
 screen:{getCursorScreenPoint:()=>({x:0,y:0})},sendRawToRenderer:(...a)=>messages.push(a),path:require('node:path'),__dirname:'/tmp',
 isTrustedMainFrameEvent:(e,w)=>e.sender===w&&e.trusted===true,ipcMain:{on:(k,f)=>channels.set(k,f)},app:{on(){}},
 require:n=>n==='./clawd-physics-runtime'?(c=>{controls=c;return {gesture:(...a)=>gestures.push(a),dispose(){}}}):require(n)};
 vm.runInNewContext(fs.readFileSync('integrations/clawd-interaction-main.js','utf8'),ctx);
 return {ctx,get controls(){return controls},channels,gestures,messages,hitContents};
}
test('gesture channel accepts only the trusted hit main frame and supported actions',()=>{
 const f=setup(),handler=f.channels.get('clawd-pet-gesture');handler({sender:{},trusted:true},'press',{});assert.equal(f.gestures.length,0);
 handler({sender:f.hitContents,trusted:true},'unknown',{});assert.equal(f.gestures.length,0);
 handler({sender:f.hitContents,trusted:true},'press',{slingshot:true,extra:'ignored'});assert.equal(f.gestures[0][1].slingshot,true);assert.equal(Object.keys(f.gestures[0][1]).length,1);
});
test('click sound reuses the app volume and obeys mute, DND and shutdown gates',()=>{
 const f=setup();f.controls.feedback({kind:'tap',sound:true});const sound=f.messages.find(a=>a[0]==='play-sound');assert.equal(sound[1].volume,.35);assert.match(sound[1].url,/clawd-click.wav$/);
 f.ctx.soundMuted=true;f.controls.feedback({kind:'tap',sound:true});assert.equal(f.messages.filter(a=>a[0]==='play-sound').length,1);
 f.ctx.doNotDisturb=true;assert.equal(f.controls.enabled(),false);f.ctx.doNotDisturb=false;f.ctx.isQuitting=true;assert.equal(f.controls.enabled(),false);
});

test('explicit throwing stays available while AI works, with menu and permission gates retained',()=>{
 const f=setup();f.ctx.petWindowRuntime={isDragLocked:()=>false};f.ctx.anySessionInProgress=()=>true;
 assert.equal(f.controls.canFly(),true);assert.equal(f.controls.canReact(),false);
 f.ctx.menuOpen=true;assert.equal(f.controls.canFly(),false);f.ctx.menuOpen=false;
 f.ctx._perm.hasVisiblePermissionBubbles=()=>true;assert.equal(f.controls.canFly(),false);
});

test('release IPC keeps ordered finite screen samples and drops malformed or stale data',()=>{
 const f=setup(),handler=f.channels.get('clawd-pet-gesture'),event={sender:f.hitContents,trusted:true},t=Date.now();
 handler(event,'release',{samples:[{x:10,y:20,t:t-50},{x:30,y:20,t:t-10},{x:NaN,y:0,t},{x:0,y:0,t:t-1000}]});
 const samples=f.gestures.at(-1)[1].samples;assert.equal(samples.length,2);assert.equal(samples[1].x,30);
 handler(event,'release',{samples:[{x:10,y:20,t:t-10},{x:30,y:20,t:t-50}]});
 assert.equal(f.gestures.at(-1)[1].samples.length,0);
});
