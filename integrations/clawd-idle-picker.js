// SPDX-License-Identifier: AGPL-3.0-only
'use strict';
module.exports=function createPicker(){
 let previous=null, previousTheme=null;
 return function pick(pool,theme,random=Math.random){
  if(previousTheme!==theme){previous=null;previousTheme=theme;}
  const candidates=pool.filter(a=>a.svg!==previous);
  const available=candidates.length?candidates:pool;
  if(!available.length)return null;
  const categoryByFile=new Map((theme.manualAnimations||[]).map(a=>[a.file,a.category?.[0]]));
  const groups=new Map();
  for(const a of available){const key=categoryByFile.get(a.svg);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(a);}
  const weighted=[...groups].map(([key,items])=>({items,weight:theme.autoIdleCategoryWeights?.[key]}))
   .filter(g=>Number.isFinite(g.weight)&&g.weight>0);
  let selected;
  if(weighted.length){
   let roll=random()*weighted.reduce((sum,g)=>sum+g.weight,0);
   const group=weighted.find(g=>(roll-=g.weight)<0)||weighted.at(-1);
   selected=group.items[Math.min(group.items.length-1,Math.floor(random()*group.items.length))];
  }else selected=available[Math.min(available.length-1,Math.floor(random()*available.length))];
  previous=selected.svg;return selected;
 };
};
