// SPDX-License-Identifier: AGPL-3.0-only
'use strict';
const path=require('path');
const {quotaInfo,workInfo,placeBubble}=require('./clawd-info-content');
module.exports=function createInfoBubble(controls){
 const BrowserWindow=controls.BrowserWindow||require('electron').BrowserWindow;
 let win=null,ready=false,disposed=false,notice=null,nextPollAt=0,lastPayload='',boundsKey='';
 function hide(){if(win&&!win.isDestroyed()&&win.isVisible())win.hide();}
 function ensure(){
  if(win&&!win.isDestroyed())return;
  ready=false;lastPayload='';boundsKey='';
  win=new BrowserWindow({width:300,height:104,show:false,frame:false,transparent:true,
   resizable:false,movable:false,focusable:false,skipTaskbar:true,alwaysOnTop:true,hasShadow:false,
   title:'鲸鱼娘信息',webPreferences:{preload:path.join(__dirname,'clawd-info-preload.js'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
  win.setIgnoreMouseEvents(true);win.setAlwaysOnTop(true,'floating');
  win.setVisibleOnAllWorkspaces(true,{visibleOnFullScreen:false});
  win.webContents.on('will-navigate',event=>event.preventDefault());
  win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  win.once('closed',()=>{win=null;ready=false;});
  win.loadFile(path.join(__dirname,'clawd-info-bubble.html')).then(()=>{
   if(disposed||!win||win.isDestroyed())return;
   ready=true;nextPollAt=0;poll();
  }).catch(error=>{hide();console.warn('Clawd info bubble load failed:',error.message);});
 }
 function poll(){
  if(disposed)return;
  const now=controls.now?controls.now():Date.now();
  if(now<nextPollAt)return;nextPollAt=now+250;
  if(notice&&notice.until<=now)notice=null;
  if(!controls.canShow()){hide();return;}
  const info=notice?quotaInfo(notice.row,now):workInfo(controls.snapshot(),controls.sessions(),now);
  if(!info){hide();return;}
  ensure();if(!ready)return;
  const bounds=placeBubble(controls.anchor(),controls.workArea());
  const key=JSON.stringify(bounds);if(key!==boundsKey){win.setBounds(bounds);boundsKey=key;}
  const payload=JSON.stringify(info);
  if(payload!==lastPayload){win.webContents.send('clawd-info',info);lastPayload=payload;}
  if(!win.isVisible())win.showInactive();
 }
 return {poll,showQuota(row,duration=10042){notice={row:{...row},until:(controls.now?controls.now():Date.now())+Math.min(60000,Math.max(1000,duration))};nextPollAt=0;poll();},
  dispose(){disposed=true;notice=null;if(win&&!win.isDestroyed())win.destroy();win=null;},
 };
};
