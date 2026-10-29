const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const cp=require('node:child_process');
const path=require('node:path');
const source=cp.execFileSync('python3',[
  path.join(__dirname,'../scripts/patch-clawd-work-idle.py'),
  path.join(__dirname,'fixtures/clawd-tick-1.4.0.js'),
],{encoding:'utf8'});

function fixture(workMode=true,moving=true){
  let time=0,seq=0,id=0;
  const timers=new Map(),clips=[],states=[],visuals=[];
  const box={x:0,y:0,width:100,height:100};
  const ctx={
    theme:{idleTrigger:workMode?'work':'mouse',_id:'test',
      timings:{mouseIdleTimeout:20000,mouseSleepTimeout:60000},
      states:{idle:['base.webp']},idleAnimations:[{file:'cat.webp',duration:1000}],
      eyeTracking:{eyeRatioX:.5,eyeRatioY:.5,maxOffset:3},sleepSequence:{mode:'direct'}},
    win:{isDestroyed:()=>false,isVisible:()=>true,setIgnoreMouseEvents(){},getBounds:()=>box},
    currentState:'idle',currentSvg:'base.webp',hasActiveWork:false,
    getPetWindowBounds:()=>box,getHitRectScreen:()=>({left:0,top:0,right:100,bottom:100}),
    getObjRect:()=>({x:0,y:0,w:100,h:100}),
    setState:state=>{ctx.currentState=state;states.push(state);},
    isVisualGenerationCurrent:n=>n===seq,
    sendToRenderer(channel,state,file,options){
      if(channel!=='state-change')return;
      visuals.push({file,time});
      const request={visualGeneration:++seq};
      if(file==='cat.webp')clips.push(time);
      if(options?.onLogicalSettlement)options.onLogicalSettlement({status:'committed',visualGeneration:seq});
      return request;
    },
    random:()=>0,now:()=>time,
  };
  class Clock extends Date {static now(){return time;}}
  const sandbox={module:{exports:{}},Date:Clock,Math,console,
    require:name=>{assert.equal(name,'electron');return {screen:{getCursorScreenPoint:()=>({x:moving?time:0,y:0})}};},
    setTimeout:(fn,delay)=>{timers.set(++id,{fn,at:time+delay});return id;},
    clearTimeout:n=>timers.delete(n),
  };
  vm.runInNewContext(source,sandbox);
  const runtime=sandbox.module.exports(ctx);runtime.startMainTick();
  function advance(ms){
    const end=time+ms;
    while(true){
      let next=null;
      for(const [n,t] of timers)if(t.at<=end&&(!next||t.at<next[1].at))next=[n,t];
      if(!next)break;
      time=next[1].at;timers.delete(next[0]);next[1].fn();
    }
    time=end;
  }
  return {ctx,clips,states,visuals,advance};
}

test('no-work clock triggers and repeats despite continuous mouse movement',()=>{
  const f=fixture();f.advance(20500);assert.equal(f.clips.length,1);
  f.advance(500);assert.equal(f.visuals.at(-1).file,'cat.webp');
  f.advance(500);assert.equal(f.clips.length,1);assert.equal(f.visuals.at(-1).file,'base.webp');
  f.advance(20500);assert.equal(f.clips.length,2);
  f.advance(30000);assert.equal(f.states.includes('sleeping'),false);
});

test('actual work resets the clock, independent of the visible idle sprite',()=>{
  const f=fixture();f.ctx.hasActiveWork=true;f.advance(30000);assert.equal(f.clips.length,0);
  f.ctx.hasActiveWork=false;f.advance(19000);assert.equal(f.clips.length,0);
  f.advance(1500);assert.equal(f.clips.length,1);
  f.ctx.hasActiveWork=true;f.ctx.currentState='working';f.advance(30000);
  f.ctx.hasActiveWork=false;f.ctx.currentState='idle';f.advance(19000);assert.equal(f.clips.length,1);
  f.advance(1500);assert.equal(f.clips.length,2);
});

test('manual playback pauses automatic selection without treating the mouse as work',()=>{
  const f=fixture();f.ctx.manualAnimationActive=true;f.advance(30000);assert.equal(f.clips.length,0);
  f.ctx.manualAnimationActive=false;f.advance(500);assert.equal(f.clips.length,1);
});

test('themes without work mode retain the original mouse-idle behavior',()=>{
  const f=fixture(false,true);f.advance(70000);assert.equal(f.clips.length,0);
  const still=fixture(false,false);still.advance(20500);assert.equal(still.clips.length,1);
  still.advance(40000);assert.equal(still.states.includes('sleeping'),true);
});

test('a manual clip started during the idle animation delay is not overwritten',()=>{
  const f=fixture();f.advance(20000);f.ctx.manualAnimationActive=true;
  f.advance(1000);assert.equal(f.clips.length,0);
  f.ctx.manualAnimationActive=false;f.advance(600);assert.equal(f.clips.length,1);
});

test('a drag temporarily pauses selection but does not restart the no-work clock',()=>{
  const f=fixture();f.advance(10000);f.ctx.dragLocked=true;f.ctx.idlePaused=true;
  f.advance(15000);assert.equal(f.clips.length,0);
  f.ctx.dragLocked=false;f.ctx.idlePaused=false;f.advance(600);
  assert.equal(f.clips.length,1);
});
test('work idle delegates selection to the category picker while mouse themes retain legacy selection',()=>{
 const f=fixture();let selections=0;
 f.ctx.chooseIdleAnimation=pool=>{selections++;assert.equal(pool[0].svg,'cat.webp');return pool[0]};
 f.advance(21000);assert.equal(selections,1);assert.equal(f.clips.length,1);
 const legacy=fixture(false,false);legacy.ctx.chooseIdleAnimation=()=>{throw Error('must not change another theme')};
 legacy.advance(21000);assert.equal(legacy.clips.length,1);
});
