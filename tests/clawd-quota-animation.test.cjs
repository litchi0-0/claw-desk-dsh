const {test}=require('node:test');
const assert=require('node:assert/strict');
const {selectTier,rows,buildMenu}=require('../integrations/clawd-quota-animation');
const theme=require('../themes/dsh-whale-chan/theme.json');
const now=Date.now();
const snapshot=(used=5,extra={})=>({accountQuota:[{sourceKey:'local',host:null,codexQuota:{group:{codexFiveHour:{usedPercent:used,windowMinutes:300,resetAt:now+3600000,lastSeenAt:now,...extra}}}}]});
test('six remaining balance bands include exact boundaries and critical 5%',()=>{
 for(const [pct,file] of [[100,'qian-dai-man-yi'],[95,'qian-dai-man-yi'],[94.9,'jin-dai-ding-dang'],[80,'jin-dai-ding-dang'],[70,'qian-dai-ru-chang'],[50,'shu-jin-zhou-mei'],[25,'dai-kong-ru-xi'],[24.9,'fen-wen-bu-sheng'],[5,'fen-wen-bu-sheng'],[0,'fen-wen-bu-sheng']])assert.equal(selectTier(pct),file+'.webp');
 for(const value of [NaN,null,-1,101])assert.equal(selectTier(value),null);
});
test('used percentage converts to remaining and real window overrides field name',()=>{
 assert.equal(rows(snapshot(20),now)[0].remaining,80);
 assert.equal(rows(snapshot(20,{windowMinutes:60}),now).length,0);
 assert.equal(rows(snapshot(20,{windowMinutes:undefined}),now).length,1);
 assert.equal(rows(snapshot('20'),now).length,0);
});
test('expired data is never treated as a fresh full balance',()=>{
 assert.equal(rows(snapshot(90,{resetAt:now-1}),now)[0].expired,true);
 const menu=buildMenu(theme,{snapshot:()=>snapshot(90,{expired:true})});
 assert.equal(menu.submenu[0].submenu[1].enabled,false);
});
test('menu playback refreshes data and uses complete theme duration',()=>{
 let data=snapshot(5);const played=[];
 const menu=buildMenu(theme,{snapshot:()=>data,play:(...args)=>played.push(args)});
 data=snapshot(40);menu.submenu[0].submenu[1].click();
 assert.deepEqual(played,[['shu-jin-zhou-mei.webp',10042]]);
 data=snapshot(5,{resetAt:now-1});menu.submenu[0].submenu[1].click();assert.equal(played.length,1);
});
test('missing quota has an honest unavailable menu, unsupported themes have none',()=>{
 assert.match(buildMenu(theme,{snapshot:()=>({})}).submenu[0].label,/暂无/);
 assert.equal(buildMenu({},{}),null);
});
const {createWatcher}=require('../integrations/clawd-quota-animation');
function watcher(){let clock=now,data=snapshot(0),blocked=false;const played=[];
 const poll=createWatcher({now:()=>clock,theme:()=>theme,snapshot:()=>data,blocked:()=>blocked,play:(f,d)=>played.push([f,d])});
 return {played,step(remaining,extra={}){clock+=1000;data=snapshot(100-remaining,extra);poll()},block(v){blocked=v}};
}
test('automatic downward crossings trigger exactly the six threshold assets once',()=>{
 const h=watcher();h.step(100);
 for(const r of [95,80,70,50,25,5]){h.step(r);h.step(r)}
 assert.deepEqual(h.played.map(a=>a[0]),['qian-dai-man-yi.webp','jin-dai-ding-dang.webp','qian-dai-ru-chang.webp','shu-jin-zhou-mei.webp','dai-kong-ru-xi.webp','fen-wen-bu-sheng.webp']);
 assert(h.played.every(a=>a[1]===10042));
});
test('first observation is baseline; large drops play only the most urgent crossing',()=>{
 const h=watcher();h.step(40);assert.equal(h.played.length,0);h.step(4);assert.equal(h.played.length,1);assert.equal(h.played[0][0],'fen-wen-bu-sheng.webp');
});
test('blocked interactions queue one event and recovery cancels obsolete events',()=>{
 const h=watcher();h.step(100);h.block(true);h.step(94);h.step(79);assert.equal(h.played.length,0);
 h.block(false);h.step(79);assert.equal(h.played[0][0],'jin-dai-ding-dang.webp');
 h.block(true);h.step(69);h.step(100);h.block(false);h.step(100);assert.equal(h.played.length,1);
 h.step(95);assert.equal(h.played.length,2);
});
test('expired buckets discard queued crossings and establish a new baseline after reset',()=>{
 const h=watcher();h.step(100);h.block(true);h.step(94);h.step(94,{expired:true});h.block(false);h.step(94);assert.equal(h.played.length,0);
});
test('automatic threshold notice carries real remaining quota and reset timestamp',()=>{
 let clock=now,data=snapshot(0);const notices=[];
 const poll=createWatcher({now:()=>clock,theme:()=>theme,snapshot:()=>data,blocked:()=>false,play(){},notify:(...a)=>notices.push(a)});
 poll();clock+=1000;data=snapshot(75);poll();
 assert.equal(notices.length,1);assert.equal(notices[0][0].remaining,25);assert.equal(notices[0][0].resetAt,now+3600000);assert.equal(notices[0][1],10042);
});
