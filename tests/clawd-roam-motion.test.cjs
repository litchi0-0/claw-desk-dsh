const {test}=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');const vm=require('node:vm');const cp=require('node:child_process');
const motion=require('../integrations/clawd-roam-motion');
const theme=require('../themes/dsh-whale-chan/theme.json');
const profile=()=>motion.getProfile(theme);
const source=cp.execFileSync('python3',['scripts/patch-clawd-roam.py','tests/fixtures/clawd-roam-1.4.0.js'],{encoding:'utf8'});
function fixture(useProfile=true,area={x:0,y:0,width:1600,height:1000}){
 let time=0,id=0,state='idle',box={x:200,y:200,width:200,height:270},busy=false,paused=false;
 const timers=new Map(),positions=[],requests=[],states=[];
 const ctx={win:{isDestroyed:()=>false},getPetWindowBounds:()=>box,
 getNearestWorkArea:()=>area,
 getCurrentState:()=>state,hasActiveSessions:()=>busy,isMovementPaused:()=>paused,
 getMotionProfile:()=>useProfile?profile():null,
 applyState(s,file,options){state=s;requests.push({s,file,options})},
 setState(s){state=s;states.push(s)},resolveDisplayState:()=>busy?'working':'idle',
 applyPetWindowBounds(b){box=b;positions.push({time,...b})},
 pendingPermissions:[],setRoamHeading(){},getMiniMode:()=>false};
 class Clock extends Date{static now(){return time}}
 const math=Object.create(Math);math.random=()=>.25;
 const sandbox={module:{exports:{}},Math:math,Date:Clock,require:n=>{assert.equal(n,'./clawd-roam-motion');return motion},
 setTimeout(fn,delay){timers.set(++id,{fn,at:time+delay});return id},clearTimeout(n){timers.delete(n)}};
 vm.runInNewContext(source,sandbox);const runtime=sandbox.module.exports(ctx);
 function advance(ms){const end=time+ms;while(true){let next;for(const e of timers)if(e[1].at<=end&&(!next||e[1].at<next[1].at))next=e;if(!next)break;time=next[1].at;timers.delete(next[0]);next[1].fn()}time=end}
 runtime.setEnabled(true);runtime.setConstrainAxis(true);runtime.tick();advance(8000);
 return {runtime,requests,positions,states,advance,commit(i=0,status='committed'){requests[i].options?.onLogicalSettlement({status})},
 busy(){busy=true;state='working'},pause(){paused=true},get box(){return box}};
}
test('profile holds preparation, ramps up, cruises uniformly and holds the standing tail',()=>{
 const p=profile();assert(p);
 assert.equal(motion.progress(p,500),0);assert(motion.progress(p,900)>0);
 const d1=motion.progress(p,3500)-motion.progress(p,2500),d2=motion.progress(p,5500)-motion.progress(p,4500);
 assert(Math.abs(d1-d2)<1e-12);
 assert.equal(motion.progress(p,8000),1);assert.equal(motion.progress(p,10042),1);
 let last=0;for(let t=0;t<=10042;t+=10){const next=motion.progress(p,t);assert(next>=last&&next<=1);last=next}
});
test('invalid motion profiles fall back rather than corrupt movement',()=>{
 assert.equal(motion.getProfile({}),null);
 assert.equal(motion.getProfile({...theme,roamMotion:{...theme.roamMotion,durationMs:NaN}}),null);
 assert.equal(motion.getProfile({...theme,roamMotion:{...theme.roamMotion,file:'missing.webp'}}),null);
});
test('real roam loop waits for committed animation, then follows source timing through full tail',()=>{
 const f=fixture();assert.equal(f.requests[0].file,'walk.webp');assert.equal(f.requests[0].options.restartAnimation,true);
 f.advance(1200);assert.equal(f.positions.length,0);f.commit();f.advance(500);assert.equal(f.box.x,200);
 f.advance(2000);const a=f.box.x;f.advance(1000);const d1=f.box.x-a;const b=f.box.x;f.advance(1000);assert(Math.abs((f.box.x-b)-d1)<=1);
 f.advance(3500);const end=f.box.x;assert(end>200);assert(f.runtime.isRoamAnimating());
 f.advance(1900);assert.equal(f.box.x,end);assert(f.runtime.isRoamAnimating());
 f.advance(200);assert.equal(f.runtime.isRoamAnimating(),false);assert.equal(f.states.at(-1),'idle');
});
test('drag/work/manual playback and late visual acks cannot move a cancelled walk',()=>{
 for(const gate of ['busy','pause']){const f=fixture();f.advance(300);f[gate]();f.advance(50);f.commit();f.advance(3000);assert.equal(f.positions.length,0);assert(!f.runtime.isRoamAnimating())}
 const f=fixture();f.runtime.cancelRoam();f.commit();f.advance(3000);assert.equal(f.positions.length,0);
});
test('failed or missing image acknowledgement never starts sliding',()=>{
 const f=fixture();f.commit(0,'failed');f.advance(1000);assert.equal(f.positions.length,0);assert(!f.runtime.isRoamAnimating());
 const g=fixture();g.advance(10200);assert.equal(g.positions.length,0);assert(!g.runtime.isRoamAnimating());
});
test('unconfigured themes keep legacy distance-based movement',()=>{
 const f=fixture(false);assert(f.positions.length>0);f.advance(600);assert(f.box.x>200);
 assert.equal(f.requests[0].options,undefined);
});

test('ordinary long targets are capped to stride distance and never resize the anchored window',()=>{
 const f=fixture(true,{x:0,y:0,width:4000,height:1000});f.commit();f.advance(10100);
 const distance=Math.hypot(f.box.x-200,f.box.y-200);
 assert(distance<=motion.maxDistance(profile(),270)+1);
 assert(f.positions.every(p=>p.width===200&&p.height===270&&p.y===200));
});
test('late acknowledgement from an old walk cannot start the next walk',()=>{
 const f=fixture();f.runtime.cancelRoam();f.runtime.tick();f.advance(4000);
 assert.equal(f.requests.length,2);f.commit(0);f.advance(1000);assert.equal(f.positions.length,0);
 f.commit(1);f.advance(1400);assert(f.box.x>200);
});
