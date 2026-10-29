// SPDX-License-Identifier: AGPL-3.0-only
'use strict';
const {ipcRenderer}=require('electron');
ipcRenderer.on('clawd-info',(_event,info)=>{
 document.getElementById('title').textContent=String(info?.title||'').slice(0,100);
 document.getElementById('body').textContent=String(info?.body||'').slice(0,240);
});
