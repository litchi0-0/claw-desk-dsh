// SPDX-License-Identifier: AGPL-3.0-only
'use strict';
(() => {
 const stage=document.getElementById('pet-motion-stage');let animation=null;
 if(!stage||!window.electronAPI.onPetFeedback)return;
 function reset(){if(animation){animation.cancel();animation=null}stage.style.scale='';stage.style.rotate=''}
 window.electronAPI.onPetFeedback(payload=>{
  const p=payload||{};
  if(p.kind==='reset'){reset();return}
  if(p.kind==='stretch'){
   reset();const distance=Math.min(200,Math.hypot(p.dx||0,p.dy||0));const k=distance/1000;
   stage.style.transformOrigin='50% 80%';stage.style.scale=Math.abs(p.dx||0)>=Math.abs(p.dy||0)?`${1+k} ${1-k/2}`:`${1-k/2} ${1+k}`;
   stage.style.rotate=`${Math.max(-10,Math.min(10,(p.dx||0)/20))}deg`;return;
  }
  reset();stage.style.transformOrigin='50% 85%';
  const strength=p.kind==='impact'?Math.max(.04,Math.min(.2,(p.strength||0)*.2)):.12;
  const side=p.axis==='x';const squash=side?`${1-strength} ${1+strength/2}`:`${1+strength} ${1-strength}`;
  animation=stage.animate([{scale:'1 1'},{scale:squash,offset:.2},{scale:`${1-strength/3} ${1+strength/3}`,offset:.55},{scale:'1 1'}],{duration:p.kind==='startle'?360:260,easing:'ease-out'});
 });
})();
