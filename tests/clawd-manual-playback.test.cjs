const {test}=require('node:test');
const assert=require('node:assert/strict');
const create=require('../integrations/clawd-manual-playback');

function fixture(){
  let now=0,next=0,restored=0;
  const timers=new Map(),requests=[];
  const player=create({
    request:(file,options)=>{const r={file,options,visualGeneration:requests.length+1};requests.push(r);return r;},
    restore:()=>restored++,cancelRoam(){},
    setTimeout:(fn,delay)=>{timers.set(++next,{fn,time:now+delay});return next;},
    clearTimeout:id=>timers.delete(id),
  });
  return {player,requests,get restored(){return restored;},
    tick(ms){now+=ms;for(const [id,t] of [...timers])if(t.time<=now){timers.delete(id);t.fn();}}};
}

test('WebP playback lasts the full clip after image commit, beyond 3.5 seconds',()=>{
  const f=fixture();f.player.play('flute.webp',10067);
  f.tick(5000);assert.equal(f.restored,0); // load latency is not playback time
  f.requests[0].options.onLogicalSettlement({status:'committed'});
  f.tick(3500);assert.ok(f.player.isActive());assert.equal(f.restored,0);
  f.tick(6566);assert.ok(f.player.isActive());
  f.tick(1);assert.equal(f.player.isActive(),false);assert.equal(f.restored,1);
});

test('live state requests can reuse the manual request without replacing its visual',()=>{
  const f=fixture();f.player.play('cat.webp',10067);
  assert.equal(f.player.getRequest(),f.requests[0]);
  f.requests[0].options.onLogicalSettlement({status:'committed'});
  f.tick(10067);assert.equal(f.player.getRequest(),null);assert.equal(f.restored,1);
});

test('replacing, stopping and failed loads cannot leave a stale restore timer',()=>{
  const f=fixture();f.player.play('cat.webp',10067);const old=f.requests[0];
  f.player.play('flute.webp',10067);
  old.options.onLogicalSettlement({status:'committed'});
  f.tick(10067);assert.equal(f.restored,0);
  f.requests[1].options.onLogicalSettlement({status:'committed'});
  f.player.stop();f.tick(10067);assert.equal(f.restored,1);
  f.player.play('bad.webp',10067);f.requests[2].options.onLogicalSettlement({status:'failed'});
  assert.equal(f.player.isActive(),false);assert.equal(f.restored,2);
});
