const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const cp=require('node:child_process');
const raw=fs.readFileSync('tests/fixtures/clawd-hit-1.4.0.js','utf8');
const source=cp.execFileSync('python3',['-c',`import sys,runpy; s=runpy.run_path('scripts/patch-clawd-click.py')['patch_hit'](sys.stdin.read()); print(runpy.run_path('scripts/patch-clawd-gestures.py')['patch_hit_gestures'](s))`],{input:raw,encoding:'utf8'});
function fixture(enabled=true){let time=1000,id=0,sync;const timers=new Map(),gestures=[],clicks=[];
 const target=()=>({events:{},style:{},classList:{add(){},remove(){}},offsetWidth:100,setPointerCapture(){},addEventListener(n,f){(this.events[n]??=[]).push(f)}});
 const area=target(),document=target(),window=target();document.getElementById=()=>area;
 window.hitPlatform={isMac:true};window.hitThemeConfig={petInteractions:{enabled},reactions:{clickLeft:{file:'wave.webp',duration:1000},clickRight:{file:'shy.webp',duration:1000}}};
 window.hitAPI=new Proxy({onStateSync:f=>{sync=f},physicsGesture:(...a)=>gestures.push(a),playClickReaction:(...a)=>clicks.push(a)},{get:(t,k)=>t[k]||(()=>{})});
 const set=(f,d)=>{timers.set(++id,{f,at:time+d});return id};class Clock extends Date{static now(){return time}}
 vm.runInNewContext(source,{window,document,Date:Clock,console,Math,setTimeout:set,clearTimeout:i=>timers.delete(i),requestAnimationFrame:f=>set(f,16),cancelAnimationFrame:i=>timers.delete(i)});sync({currentState:'idle'});
 function fire(target,n,extra={}){const e={button:0,buttons:1,clientX:20,clientY:20,pointerId:1,...extra};for(const f of target.events[n]||[])f(e)}
 function advance(ms){const end=time+ms;while(true){let next;for(const e of timers)if(e[1].at<=end&&(!next||e[1].at<next[1].at))next=e;if(!next)break;time=next[1].at;timers.delete(next[0]);next[1].f()}time=end}
 return {area,document,window,gestures,clicks,advance,down:extra=>fire(area,'pointerdown',extra),up:extra=>fire(document,'pointerup',extra),move:extra=>fire(document,'pointermove',{clientX:50,...extra}),cancel:()=>fire(area,'pointercancel'),blur:()=>fire(window,'blur')};
}
test('long hold triggers tickle without a subsequent normal click',()=>{const f=fixture();f.down();f.advance(750);f.up();f.advance(500);assert(f.gestures.some(a=>a[0]==='tickle'));assert.equal(f.clicks.length,0);assert(!f.gestures.some(a=>a[0]==='tap'))});
test('second press and drag selects slingshot while pointer cancellation never throws',()=>{const f=fixture();f.down();f.up();f.advance(100);f.down();f.move();f.advance(20);f.up();assert(f.gestures.some(a=>a[0]==='press'&&a[1].slingshot));assert(f.gestures.some(a=>a[0]==='release'));const g=fixture();g.down();g.move();g.cancel();assert(!g.gestures.some(a=>a[0]==='release'))});
test('ordinary click is preserved and other themes do not acquire long-press gestures',()=>{for(const enabled of [true,false]){const f=fixture(enabled);f.down();f.up();f.advance(450);assert.equal(f.clicks[0][0],'wave.webp')}const g=fixture(false);g.down();g.advance(800);g.up();g.advance(450);assert.equal(g.clicks[0][0],'wave.webp');assert.equal(g.gestures.length,0)});

test('window blur is cancellation, never a natural throw release',()=>{const f=fixture();f.down();f.move();f.blur();assert(f.gestures.some(a=>a[0]==='cancel'));assert(!f.gestures.some(a=>a[0]==='release'))});

test('Shift click is an explicit startle gesture and never leaks into normal click playback',()=>{const f=fixture();f.down({shiftKey:true});f.up({shiftKey:true});f.advance(500);assert(f.gestures.some(a=>a[0]==='startle'));assert.equal(f.clicks.length,0)});

test('zero-button move before pointerup completes the throw once without click leakage',()=>{
 const f=fixture();f.down();f.move();f.move({buttons:0});f.up();f.advance(500);
 assert.equal(f.gestures.filter(a=>a[0]==='release').length,1);
 assert.equal(f.gestures.filter(a=>a[0]==='cancel').length,0);assert.equal(f.clicks.length,0);
});
test('screen trajectory survives a moving input window with unchanged client coordinates',()=>{
 const f=fixture();f.down({screenX:300,screenY:200});f.advance(100);
 f.move({clientX:20,screenX:302,screenY:200});f.advance(16);
 f.move({clientX:20,screenX:330,screenY:200});f.advance(8);
 f.up({clientX:20,screenX:350,screenY:200});
 const release=f.gestures.find(a=>a[0]==='release');assert(release);
 assert.equal(release[1].samples.at(-1).x,350);assert.equal(release[1].samples[0].x,300);
});
