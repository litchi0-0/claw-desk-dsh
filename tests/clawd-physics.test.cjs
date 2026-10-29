const {test}=require('node:test');const assert=require('node:assert/strict');
const {releaseVelocity,slingshotVelocity,step,collisionBounds}=require('../integrations/clawd-physics');
const bounds={minX:-100,minY:-50,maxX:800,maxY:600};
test('throw uses fresh pointer motion and a pause before release removes residual velocity',()=>{
 const samples=[{t:0,x:0,y:0},{t:50,x:50,y:0},{t:100,x:150,y:-50}];
 const v=releaseVelocity(samples,100);assert(v.vx>500&&v.vy<0);assert(Math.hypot(v.vx,v.vy)<=2400);
 assert.deepEqual(releaseVelocity(samples,300),{vx:0,vy:0});
});
test('slingshot launches opposite the pull and clamps excessive launch speed',()=>{
 const v=slingshotVelocity({x:0,y:0},{x:100,y:40});assert(v.vx<0&&v.vy<0);
 assert(Math.hypot(...Object.values(slingshotVelocity({x:0,y:0},{x:100000,y:0})))<=2400);
});
test('all four work-area edges reflect velocity and remain within negative-origin bounds',()=>{
 for(const s of [{x:-99,y:100,vx:-1000,vy:0},{x:799,y:100,vx:1000,vy:0},{x:100,y:-49,vx:0,vy:-1000},{x:100,y:599,vx:0,vy:1000}]){
  const next=step(s,.016,bounds);assert(next.bounced);assert(next.x>=-100&&next.x<=800&&next.y>=-50&&next.y<=600);
  if(s.vx)assert(Math.sign(s.vx)!==Math.sign(next.vx));else assert(Math.sign(s.vy)!==Math.sign(next.vy));
 }
});
test('floor friction and inelastic bounces settle; large pauses do not tunnel',()=>{
 let s={x:300,y:100,vx:900,vy:-700};let stopped=false;
 for(let i=0;i<1500;i++){s=step(s,.016,bounds);if(s.atRest){stopped=true;break}}
 assert(stopped);assert.equal(s.y,bounds.maxY);
 const n=step({x:0,y:0,vx:1000,vy:0},10,bounds);assert(n.x<100);
});
test('collision uses visible body instead of transparent window padding',()=>{
 assert.deepEqual(collisionBounds({x:-1600,y:0,width:1600,height:900},{x:-1000,y:100,width:480,height:270},{left:-850,top:160,right:-650,bottom:350}),{minX:-1750,minY:-60,maxX:-350,maxY:650});
});
