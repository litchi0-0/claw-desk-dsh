// SPDX-License-Identifier: AGPL-3.0-only
'use strict';
const path=require('path');const fs=require('fs');const {pathToFileURL}=require('url');
const catalog=require('./merzlin-media/catalog.json');
module.exports=function createExtraMedia(controls){
 const now=controls.now||Date.now;let lastSound=-Infinity,previous=null,nextPollAt=0;
 const prefPath=controls.dataDir?path.join(controls.dataDir,'clawd-extra-media-prefs.json'):null;
 function load(){try{return controls.loadPrefs?controls.loadPrefs():JSON.parse(fs.readFileSync(prefPath,'utf8'))}catch{return {}}}
 const loaded=load()||{},choices=['dsh','merzlin-click','duck-ya1','duck-ya2'];
 const prefs={clickSound:choices.includes(loaded.clickSound)?loaded.clickSound:'dsh',collisionSound:loaded.collisionSound===true,agentSounds:loaded.agentSounds===true};
 function save(){
  try{if(controls.savePrefs)controls.savePrefs({...prefs});else if(prefPath){
   fs.mkdirSync(path.dirname(prefPath),{recursive:true});const temp=prefPath+'.tmp';
   fs.writeFileSync(temp,JSON.stringify(prefs,null,2)+'\n',{mode:0o600});fs.renameSync(temp,prefPath);
  }}catch{console.warn('Clawd extra-media preferences could not be saved')}
 }
 const available=()=>controls.theme()?.extraMedia===true;
 function sound(id,interval=100){
  if(!controls.enabled()||controls.muted()||now()-lastSound<interval)return false;
  const asset=id==='dsh'?{file:'../dsh-click-duck.wav'}:catalog.sounds.find(a=>a.id===id);
  if(!asset)return false;
  lastSound=now();controls.send({url:pathToFileURL(path.join(__dirname,'merzlin-media',asset.file)).href,
   volume:Math.max(0,Math.min(1,Number(controls.volume())||0))*.5});return true;
 }
 function click(){if(controls.theme()?.petInteractions?.clickSound!==false)sound(available()?prefs.clickSound:'dsh')}
 function impact(){if(available()&&prefs.collisionSound)sound(prefs.clickSound,180)}
 function preview(id){if(available())sound(id)}
 function showImage(id){
  const asset=catalog.images.find(a=>a.id===id);
  if(!asset||!available()||!controls.enabled())return;
  controls.showImage({title:asset.label,url:pathToFileURL(path.join(__dirname,'merzlin-media',asset.file)).href});
 }
 function poll(snapshot){
  if(!available()||!prefs.agentSounds){previous=null;nextPollAt=0;return}
  if(now()<nextPollAt)return;nextPollAt=now()+500;
  snapshot=typeof snapshot==='function'?snapshot():snapshot;
  const current=new Map();let cue=null;
  for(const s of snapshot?.sessions||[]){
   if(!s.id||s.headless||s.hiddenFromHud||s.startupRecovered)continue;
   const state=s.state==='error'?'error':s.state==='attention'||(s.state==='idle'&&s.badge==='done')?'done':
    ['working','thinking','juggling','carrying','sweeping'].includes(s.state)?'start':'idle';
   current.set(s.id,state);
   if(previous&&state!=='idle'&&previous.get(s.id)!==state){
    if(state==='error'||cue!=='error'&&(state==='done'||!cue))cue=state;
   }
  }
  previous=current;
  if(available()&&prefs.agentSounds&&cue)sound('agent-'+cue);
 }
 function menu(){
  if(!available())return null;
  return {label:'扩展素材',submenu:[
   {label:'大肥鱼表情（静态）',submenu:catalog.images.map(a=>({label:a.label,click:()=>showImage(a.id)}))},
   {label:'音效试听',submenu:catalog.sounds.map(a=>({label:a.label,click:()=>preview(a.id)}))},
   {label:'点击声音',submenu:choices.map(id=>({type:'radio',label:id==='dsh'?'原版嘎嘎':catalog.sounds.find(a=>a.id===id).label,
    checked:prefs.clickSound===id,click:()=>{prefs.clickSound=id;save();sound(id)}}))},
   {label:'屏幕碰撞音效',type:'checkbox',checked:prefs.collisionSound,click:item=>{prefs.collisionSound=item.checked===true;save()}},
   {label:'任务提示音（开始／完成／出错）',type:'checkbox',checked:prefs.agentSounds,click:item=>{prefs.agentSounds=item.checked===true;previous=null;nextPollAt=0;save()}},
  ]};
 }
 return {click,impact,preview,showImage,poll,menu,ownsTaskSounds:()=>available()&&prefs.agentSounds};
};
