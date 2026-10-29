// SPDX-License-Identifier: AGPL-3.0-only
'use strict';
const clean=(s,max=100)=>String(s||'').replace(/[\x00-\x1f\x7f]/g,' ').replace(/\s+/g,' ').trim().slice(0,max);
function quotaInfo(row,now=Date.now()){
 const reset=Number.isFinite(row.resetAt)&&row.resetAt>now?`约 ${Math.ceil((row.resetAt-now)/60000)} 分钟后恢复`:'恢复时间未知';
 const freshness=Number.isFinite(row.lastSeenAt)?`上次确认 ${Math.max(0,Math.floor((now-row.lastSeenAt)/60000))} 分钟前`:'确认时间未知';
 return {title:`${clean(row.label,60)} · 5小时额度`,body:`剩余 ${Number(row.remaining.toFixed(1))}% · ${reset}\n${freshness}`};
}
// Routine work is deliberately quiet; only special task notices get a bubble.
const stateLabels={notification:'等待你的确认',attention:'任务已完成',error:'任务遇到错误'};
function workInfo(snapshot,raw={},now=Date.now()){
 const sessions=(snapshot?.sessions||[]).filter(s=>!s.headless&&!s.hiddenFromHud&&!s.startupRecovered);
 const active=sessions.filter(s=>stateLabels[s.state]).sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0));
 let s=active[0],body;
 if(s){body=stateLabels[s.state];}
 else {
  s=sessions.filter(s=>s.lastEvent?.at>0&&now-s.lastEvent.at>=0&&now-s.lastEvent.at<10000&&['done','interrupted'].includes(s.badge))
    .sort((a,b)=>b.lastEvent.at-a.lastEvent.at)[0];
  if(!s)return null;body=s.badge==='done'?'任务已完成':'任务已中断，请查看会话';
 }
 return {title:clean(`${s.agentName||s.agentId||'AI'}${s.displayTitle?` · ${s.displayTitle}`:''}`,70),body:clean(body)};
}
function placeBubble(anchor,area){
 const width=Math.min(300,area.width),height=Math.min(104,area.height);
 const x=Math.round(Math.max(area.x,Math.min(area.x+area.width-width,(anchor.left+anchor.right-width)/2)));
 const above=anchor.top-height-12;
 const y=Math.round(Math.max(area.y,Math.min(area.y+area.height-height,above>=area.y?above:anchor.bottom+12)));
 return {x,y,width,height};
}
module.exports={quotaInfo,workInfo,placeBubble};
