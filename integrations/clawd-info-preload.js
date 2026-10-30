// SPDX-License-Identifier: AGPL-3.0-only
'use strict';
const {ipcRenderer}=require('electron');
ipcRenderer.on('clawd-info',(_event,info)=>{
 document.getElementById('title').textContent=String(info?.title||'').slice(0,100);
 document.getElementById('body').textContent=String(info?.body||'').slice(0,240);
 const picture=document.getElementById('picture');
 const local=typeof info?.image==='string'&&info.image.startsWith('file://');
 picture.style.display=local?'block':'none';
 if(local)picture.src=info.image;else picture.removeAttribute('src');
});
