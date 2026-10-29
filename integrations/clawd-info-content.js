// SPDX-License-Identifier: AGPL-3.0-only
'use strict';
const clean=(s,max=100)=>String(s||'').replace(/[\x00-\x1f\x7f]/g,' ').replace(/\s+/g,' ').trim().slice(0,max);
function quotaInfo(row,now=Date.now()){
 const reset=Number.isFinite(row.resetAt)&&row.resetAt>now?`约 ${Math.ceil((row.resetAt-now)/60000)} 分钟后恢复`:'恢复时间未知';
 const freshness=Number.isFinite(row.lastSeenAt)?`上次确认 ${Math.max(0,Math.floor((now-row.lastSeenAt)/60000))} 分钟前`:'确认时间未知';
 return {title:`${clean(row.label,60)} · 5小时额度`,body:`剩余 ${Number(row.remaining.toFixed(1))}% · ${reset}\n${freshness}`};
}
const stateLabels={thinking:'正在思考',working:'正在工作',juggling:'正在处理多个任务',sweeping:'正在整理结果',carrying:'正在忙碌',notification:'等待你的确认',attention:'任务已完成',error:'任务遇到错误'};
function toolLabel(tool){
 const t=clean(tool,50);if(!t)return null;
 if(/read|open_file/i.test(t))return '正在读取文件';
 if(/write|edit|patch|replace/i.test(t))return '正在修改文件';
 if(/search|grep|find|glob/i.test(t))return '正在搜索内容';
 if(/exec|shell|bash|terminal|command/i.test(t))return '正在执行命令';
 return `正在使用 ${t}`;
}
function workInfo(snapshot,raw={},now=Date.now()){
 const sessions=(snapshot?.sessions||[]).filter(s=>!s.headless&&!s.hiddenFromHud&&!s.startupRecovered);
 const active=sessions.filter(s=>stateLabels[s.state]).sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0));
 let s=active[0],body;
 if(s){body=stateLabels[s.state];if(['working','juggling','carrying'].includes(s.state))body=toolLabel(raw[s.id]?.lastToolName)||body;}
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
