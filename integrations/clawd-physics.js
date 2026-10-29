// SPDX-License-Identifier: AGPL-3.0-only
'use strict';
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
function cap(vx,vy,max=2400){const speed=Math.hypot(vx,vy);const ratio=speed>max?max/speed:1;return {vx:vx*ratio,vy:vy*ratio}}
function releaseVelocity(samples,now){
 const last=samples.at(-1);if(!last||now-last.t>150)return {vx:0,vy:0};
 const recent=samples.filter(p=>now-p.t<=150);
 if(recent.length<2)return {vx:0,vy:0};
 const first=recent[0],dt=last.t-first.t;
 if(dt<20)return {vx:0,vy:0};
 const v=cap((last.x-first.x)*1000/dt,(last.y-first.y)*1000/dt);
 return Math.hypot(v.vx,v.vy)<320?{vx:0,vy:0}:v;
}
function slingshotVelocity(origin,cursor){
 const dx=origin.x-cursor.x,dy=origin.y-cursor.y;
 return Math.hypot(dx,dy)<12?{vx:0,vy:0}:cap(dx*7,dy*7);
}
function collisionBounds(area,box,hit){
 const minX=area.x-(hit.left-box.x),minY=area.y-(hit.top-box.y);
 return {minX,minY,maxX:Math.max(minX,area.x+area.width-(hit.right-box.x)),maxY:Math.max(minY,area.y+area.height-(hit.bottom-box.y))};
}
function step(state,dtRaw,b,options={}){
 const dt=clamp(dtRaw,0,.032),gravity=options.gravity??1400,e=options.restitution??.68;
 let {x,y,vx,vy}=state;let bounced=false,axis=null,impact=0;
 vy+=gravity*dt;x+=vx*dt;y+=vy*dt;
 if(x<b.minX||x>b.maxX){impact=Math.max(impact,Math.abs(vx));vx=x<b.minX?Math.abs(vx)*e:-Math.abs(vx)*e;x=clamp(x,b.minX,b.maxX);bounced=true;axis='x'}
 if(y<b.minY){impact=Math.max(impact,Math.abs(vy));y=b.minY;vy=Math.abs(vy)*e;bounced=true;axis='y'}
 if(y>=b.maxY){
  impact=Math.max(impact,Math.abs(vy));y=b.maxY;
  if(vy>55){vy=-vy*e;bounced=true;axis='y'}else vy=0;
  vx*=Math.exp(-5*dt);
 }
 if(b.maxX<=b.minX){x=b.minX;vx=0}if(b.maxY<=b.minY){y=b.minY;vy=0}
 const atRest=y>=b.maxY&&Math.abs(vy)<1&&Math.abs(vx)<18;
 if(atRest){vx=0;vy=0}
 return {x,y,vx,vy,bounced,axis,impact,atRest};
}
module.exports={releaseVelocity,slingshotVelocity,collisionBounds,step};
