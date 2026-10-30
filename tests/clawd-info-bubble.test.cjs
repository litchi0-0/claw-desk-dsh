const {test}=require('node:test');const assert=require('node:assert/strict');
const {quotaInfo,workInfo,placeBubble}=require('../integrations/clawd-info-content');
const now=100000;
test('balance bubble identifies service, remaining, freshness and reset time without inventing data',()=>{
 const info=quotaInfo({label:'本机 · Codex',remaining:25,resetAt:now+600000,lastSeenAt:now-120000},now);
 assert.match(info.body,/25%/);assert.match(info.body,/10 分钟/);assert.match(info.body,/2 分钟前/);
 assert.match(quotaInfo({label:'Codex',remaining:5},now).body,/恢复时间未知/);
});
test('routine work stays silent even when tool details are available',()=>{
 const s={id:'x',state:'working',displayTitle:'测试项目',agentName:'Codex',updatedAt:now};
 for(const state of ['thinking','working','juggling','sweeping','carrying']) {
  assert.equal(workInfo({sessions:[{...s,state}]},{x:{lastToolName:'read_file'}},now),null);
 }
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
 const controls={BrowserWindow:Window,now:()=>clock,canShow:()=>allowed,snapshot:()=>({sessions:[{id:'busy',state:'working',agentName:'Codex',updatedAt:clock}]}),sessions:()=>({}),anchor:()=>({left:100,top:200,right:200,bottom:350}),workArea:()=>({x:0,y:0,width:1000,height:800})};
 const bubble=createBubble(controls);
 bubble.poll();assert.equal(options.length,0);
 bubble.showQuota({label:'Codex',remaining:25,resetAt:now+600000},1000);await Promise.resolve();
 assert(visible);assert.equal(options[0].focusable,false);assert.equal(options[0].webPreferences.nodeIntegration,false);
 assert.match(sent[0][1].body,/25%/);assert(bounds[0].y<200);
 allowed=false;clock+=250;bubble.poll();assert.equal(visible,false);
 allowed=true;clock+=250;bubble.poll();assert(visible);
 clock+=1000;bubble.poll();assert.equal(visible,false);
 bubble.showImage('可爱','file:///tmp/fish.png');assert(visible);assert.equal(sent.at(-1)[1].image,'file:///tmp/fish.png');assert.equal(bounds.at(-1).height,324);
 bubble.showQuota({label:'Codex',remaining:25},1000);assert.equal(bounds.at(-1).height,104);assert.equal(sent.at(-1)[1].image,undefined);
 clock+=1250;bubble.poll();assert.equal(visible,false);
 bubble.dispose();assert(destroyed);
});

test('special task notices remain visible while concurrent routine work is silent',()=>{
 for(const [state,label] of [['notification','确认'],['attention','完成'],['error','错误']]){
  const info=workInfo({sessions:[{id:'busy',state:'working',updatedAt:now+1},{id:'special',state,agentName:'Codex',updatedAt:now}]},{},now);
  assert(info);assert.match(info.body,new RegExp(label));
 }
 assert.equal(workInfo({sessions:[{id:'hidden',state:'error',headless:true}]},{},now),null);
 assert.equal(workInfo({sessions:[{id:'recovered',state:'notification',startupRecovered:true}]},{},now),null);
});
