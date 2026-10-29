// SPDX-License-Identifier: AGPL-3.0-only
'use strict';
const physics=require('./clawd-physics');
module.exports=function createPhysics(controls){
 const now=controls.now||Date.now,schedule=controls.setTimeout||setTimeout,clear=controls.clearTimeout||clearTimeout;
 let active=false,gesture=null,timer=null,generation=0,hover=null,lastStartle=-Infinity;
 function cancel(restore=true){
  const wasActive=active;active=false;gesture=null;generation++;
  if(timer!==null){clear(timer);timer=null}
  controls.feedback({kind:'reset'});
  if(wasActive){if(restore)controls.restore();controls.afterFlight()}
 }
 function launch(v){
  if(!controls.enabled()||!controls.canFly()||Math.hypot(v.vx,v.vy)===0)return false;
  const box=controls.bounds();if(!box)return false;
  controls.beforeFlight();active=true;const token=++generation;const start=now();let last=start;
  let state={x:box.x,y:box.y,...v};controls.showAir();controls.feedback({kind:'launch'});
  function frame(){
   timer=null;if(!active||token!==generation)return;
   if(!controls.enabled()||!controls.canFly()||now()-start>15000){cancel();return}
   const elapsed=now();const limits=controls.limits({...box,x:state.x,y:state.y});
   if(!limits||!Object.values(limits).every(Number.isFinite)){cancel();return}
   state=physics.step(state,(elapsed-last)/1000,limits);last=elapsed;
   controls.apply({x:Math.round(state.x),y:Math.round(state.y),width:box.width,height:box.height});
   if(state.bounced&&state.impact>100)controls.feedback({kind:'impact',axis:state.axis,strength:Math.min(1,state.impact/1200)});
   if(state.atRest){cancel();return}
   timer=schedule(frame,16);
  }
  timer=schedule(frame,16);return true;
 }
 function press(slingshot=false){
  cancel();if(!controls.enabled())return;
  const p=controls.cursor();gesture={slingshot,origin:{...p},samples:[{...p,t:now()}]};
 }
 function track(){
  if(!gesture)return;
  const p=controls.cursor(),t=now();gesture.samples.push({...p,t});gesture.samples=gesture.samples.filter(s=>t-s.t<=200);
  if(gesture.slingshot)controls.feedback({kind:'stretch',dx:p.x-gesture.origin.x,dy:p.y-gesture.origin.y});
 }
 function release(samples){
  if(!gesture)return;track();const g=gesture;gesture=null;controls.feedback({kind:'reset'});
  const captured=Array.isArray(samples)&&samples.length>=2?samples:g.samples;
  const v=g.slingshot?physics.slingshotVelocity(g.origin,captured.at(-1)):physics.releaseVelocity(captured,now());launch(v);
 }
 function tap(){gesture=null;if(controls.enabled())controls.feedback({kind:'tap',sound:true})}
 function tickle(){if(controls.enabled()&&controls.canReact()){controls.reaction('tickle');controls.feedback({kind:'tap',sound:true})}}
 function startle(){if(controls.enabled()&&controls.canReact()){lastStartle=now();controls.reaction('startle');controls.feedback({kind:'startle'})}}
 function poll(){
  const p=controls.cursor(),t=now(),previous=hover;hover={...p,t};
  if(!controls.enabled()||!controls.canReact()||(controls.canStartle && !controls.canStartle())||active||gesture||!previous||t-lastStartle<5000)return;
  const rect=controls.hitRect();if(!rect)return;
  const inside=q=>q.x>=rect.left&&q.x<=rect.right&&q.y>=rect.top&&q.y<=rect.bottom;
  const dt=t-previous.t,distance=Math.hypot(p.x-previous.x,p.y-previous.y);
  if(dt>0&&dt<=250&&distance>40&&distance*1000/dt>=900&&!inside(previous)&&inside(p)){
   startle();
  }
 }
 return {press,track,release,tap,tickle,startle,poll,cancel,isActive:()=>active,isSlingshot:()=>!!gesture?.slingshot,
  gesture(kind,data){if(kind==='press')press(data?.slingshot===true);else if(kind==='release')release(data?.samples);else if(kind==='tap')tap();else if(kind==='tickle')tickle();else if(kind==='startle')startle();else if(kind==='cancel')cancel()},dispose:()=>cancel(false)};
};
