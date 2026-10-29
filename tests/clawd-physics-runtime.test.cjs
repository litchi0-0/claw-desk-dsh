const {test}=require('node:test');const assert=require('node:assert/strict');
const create=require('../integrations/clawd-physics-runtime');
function fixture(){let time=1000,id=0,cursor={x:300,y:200},box={x:250,y:150,width:200,height:200},work=false;const timers=new Map(),fx=[],visuals=[],reactions=[];let restores=0;
 const ctx={now:()=>time,setTimeout(fn,d){timers.set(++id,{fn,at:time+d});return id},clearTimeout(i){timers.delete(i)},
 enabled:()=>true,canFly:()=>!work,canReact:()=>!work,cursor:()=>cursor,bounds:()=>box,hitRect:()=>({left:250,top:150,right:450,bottom:350}),
 limits:()=>({minX:0,minY:0,maxX:1000,maxY:600}),apply:b=>{box=b},feedback:p=>fx.push(p),showAir:()=>visuals.push('air'),restore:()=>restores++,beforeFlight(){},afterFlight(){},reaction:n=>reactions.push(n)};
 const runtime=create(ctx);
 function advance(ms){const end=time+ms;while(true){let next;for(const e of timers)if(e[1].at<=end&&(!next||e[1].at<next[1].at))next=e;if(!next)break;time=next[1].at;timers.delete(next[0]);next[1].fn()}time=end}
 return {runtime,fx,visuals,reactions,advance,move(x,y,ms=40){time+=ms;cursor={x,y};runtime.track()},work(){work=true},get box(){return box},get restores(){return restores}};
}
test('normal fast drag enters flight, bounces and settles; slow put-down stays where placed',()=>{
 const f=fixture();f.runtime.press(false);f.move(400,180);f.move(520,150);f.runtime.release();assert(f.runtime.isActive());f.advance(15000);assert(!f.runtime.isActive());assert(f.restores>0);assert(f.fx.some(x=>x.kind==='impact'));
 const g=fixture();g.runtime.press(false);g.move(302,200,100);g.runtime.release();assert(!g.runtime.isActive());
});
test('slingshot holds the anchored window during pull and launches backwards',()=>{
 const f=fixture();f.runtime.press(true);f.move(450,250);assert(f.runtime.isSlingshot());assert.equal(f.box.x,250);assert(f.fx.some(x=>x.kind==='stretch'));
 f.runtime.release();f.advance(80);assert(f.box.x<250);
});
test('catch and eligibility gates interrupt flight and stale frame callbacks cannot resume it',()=>{
 for(const action of ['catch','work']){const f=fixture();f.runtime.press(false);f.move(500,150);f.runtime.release();f.advance(100);if(action==='catch')f.runtime.press(false);else f.work();f.advance(50);const x=f.box.x;f.advance(2000);assert.equal(f.box.x,x);assert(!f.runtime.isActive());}
});
test('explicit cancellation never throws; tickle is an actual gesture reaction',()=>{
 const f=fixture();f.runtime.press(false);f.move(500,150);f.runtime.cancel();f.advance(1000);assert(!f.runtime.isActive());f.runtime.tickle();assert.deepEqual(f.reactions,['tickle']);
});
test('fast outside-to-inside cursor entry startles once, ordinary hover does not',()=>{
 const f=fixture();f.move(0,0,100);f.runtime.poll();f.move(300,200,50);f.runtime.poll();assert.deepEqual(f.reactions,['startle']);f.runtime.poll();assert.equal(f.reactions.length,1);
 const g=fixture();g.move(230,200,100);g.runtime.poll();g.move(260,200,200);g.runtime.poll();assert.equal(g.reactions.length,0);
});

test('release uses captured screen samples even when main-process cursor sampling missed the flick',()=>{
 const f=fixture();f.runtime.press(false);f.advance(60);
 f.runtime.gesture('release',{samples:[{x:300,y:200,t:1000},{x:350,y:180,t:1040},{x:400,y:160,t:1060}]});
 assert(f.runtime.isActive());f.advance(32);assert(f.box.x>250);
});

test('a long slingshot pull keeps the original anchor after the sample ring expires',()=>{
 const f=fixture();f.runtime.press(true);f.move(450,200,300);f.move(450,200,100);
 f.runtime.gesture('release',{samples:[{x:450,y:200,t:1300},{x:450,y:200,t:1400}]});
 assert(f.runtime.isActive());f.advance(32);assert(f.box.x<250);
});
