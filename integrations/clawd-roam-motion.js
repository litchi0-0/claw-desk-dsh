// SPDX-License-Identifier: AGPL-3.0-only
'use strict';
function integral(keys, elapsed) {
  let area=0;
  for(let i=1;i<keys.length;i++){
    const [start,v0]=keys[i-1],[end,v1]=keys[i];
    if(elapsed<=start)break;
    const dt=Math.min(elapsed,end)-start;
    area+=v0*dt+(v1-v0)*dt*dt/(2*(end-start));
  }
  return area;
}
function getProfile(theme){
  const p=theme?.roamMotion;
  if(!p || !theme.states?.roam?.includes(p.file)
      || !Number.isFinite(p.durationMs) || p.durationMs<=0 || p.durationMs>60000
      || !Number.isFinite(p.referenceHeight) || p.referenceHeight<=0
      || !Number.isFinite(p.cruisePxPerSecond) || p.cruisePxPerSecond<=0 || p.cruisePxPerSecond>500
      || !Array.isArray(p.keys) || p.keys.length<2 || p.keys.length>100)return null;
  let previous=-1;
  for(const key of p.keys){
    if(!Array.isArray(key)||key.length!==2||!key.every(Number.isFinite)
        ||key[0]<=previous||key[0]<0||key[0]>p.durationMs||key[1]<0||key[1]>1)return null;
    previous=key[0];
  }
  if(p.keys[0][0]!==0||p.keys.at(-1)[0]!==p.durationMs)return null;
  const asset=theme.manualAnimations?.find(a=>a.file===p.file);
  if(!asset||asset.duration!==p.durationMs)return null;
  const area=integral(p.keys,p.durationMs);
  return area>0?{...p,area}:null;
}
function progress(profile,elapsed){
  return Math.max(0,Math.min(1,integral(profile.keys,Math.max(0,Math.min(elapsed,profile.durationMs)))/profile.area));
}
function maxDistance(profile,height){
  return profile.cruisePxPerSecond*(height/profile.referenceHeight)*profile.area/1000;
}
module.exports={getProfile,progress,maxDistance};
