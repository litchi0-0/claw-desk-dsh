const {test}=require('node:test');const assert=require('node:assert/strict');
const {quotaInfo,workInfo,placeBubble}=require('../integrations/clawd-info-content');
const now=100000;
test('balance bubble identifies service, remaining, freshness and reset time without inventing data',()=>{
 const info=quotaInfo({label:'本机 · Codex',remaining:25,resetAt:now+600000,lastSeenAt:now-120000},now);
 assert.match(info.body,/25%/);assert.match(info.body,/10 分钟/);assert.match(info.body,/2 分钟前/);
 assert.match(quotaInfo({label:'Codex',remaining:5},now).body,/恢复时间未知/);
});
test('work bubble uses real active session and tool name; ignores headless and recovered sessions',()=>{
 const s={id:'x',state:'working',displayTitle:'测试项目',agentName:'Codex',updatedAt:now};
 assert.match(workInfo({sessions:[s]},{x:{lastToolName:'read_file'}},now).body,/读取文件/);
 assert.equal(workInfo({sessions:[{...s,headless:true}]},{},now),null);
 assert.equal(workInfo({sessions:[{...s,startupRecovered:true}]},{},now),null);
 assert.equal(workInfo({sessions:[{...s,state:'idle'}]},{},now),null);
});
test('recent completion text disappears after ten seconds',()=>{
 const s={id:'x',state:'idle',agentName:'Codex',badge:'done',lastEvent:{at:now-5000,rawEvent:'Stop'}};
 assert.match(workInfo({sessions:[s]},{},now).body,/完成/);
 assert.equal(workInfo({sessions:[s]},{},now+6000),null);
});
test('bubble clamps inside negative-origin monitor and moves below a pet near the top',()=>{
 const area={x:-1600,y:0,width:1600,height:900};
 const b=placeBubble({left:-1590,top:5,right:-1490,bottom:150},area);
 assert(b.x>=area.x);assert(b.y>=150);assert(b.x+b.width<=0);
});
test('floating bubble stays noninteractive, follows the pet and hides for blocked UI',async()=>{
 const createBubble=require('../integrations/clawd-info-bubble');let visible=false,clock=now,allowed=true,destroyed=false;
 const sent=[],bounds=[],options=[];let instance;
 class Window {
  constructor(opts){options.push(opts);instance=this;this.webContents={on(){},setWindowOpenHandler(){},send:(...a)=>sent.push(a)}}
  isDestroyed(){return destroyed}isVisible(){return visible}hide(){visible=false}showInactive(){visible=true}
  setBounds(b){bounds.push(b)}setIgnoreMouseEvents(v){assert.equal(v,true)}setAlwaysOnTop(){}setVisibleOnAllWorkspaces(){}once(){}
  loadFile(){return Promise.resolve()}destroy(){destroyed=true}
 }
 const controls={BrowserWindow:Window,now:()=>clock,canShow:()=>allowed,snapshot:()=>({sessions:[]}),sessions:()=>({}),anchor:()=>({left:100,top:200,right:200,bottom:350}),workArea:()=>({x:0,y:0,width:1000,height:800})};
 const bubble=createBubble(controls);
 bubble.showQuota({label:'Codex',remaining:25,resetAt:now+600000},1000);await Promise.resolve();
 assert(visible);assert.equal(options[0].focusable,false);assert.equal(options[0].webPreferences.nodeIntegration,false);
 assert.match(sent[0][1].body,/25%/);assert(bounds[0].y<200);
 allowed=false;clock+=250;bubble.poll();assert.equal(visible,false);
 allowed=true;clock+=250;bubble.poll();assert(visible);
 clock+=1000;bubble.poll();assert.equal(visible,false);
 bubble.dispose();assert(destroyed);
});
